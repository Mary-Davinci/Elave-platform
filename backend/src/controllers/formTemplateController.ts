import { Request, Response } from "express";
import { CustomRequestHandler } from "../types/express";
import multer from "multer";
import path from "path";
import fs from "fs";
// If your file is actually named FormTemplet.ts keep that import;
// otherwise prefer "../models/FormTemplate"
import FormTemplate from "../models/FormTemplet";
import { IUser } from "../models/User";

interface AuthenticatedRequest extends Request {
  user: IUser;
}

/* -------------------- Helpers -------------------- */

const ALLOWED_CATEGORIES = ["agenti", "segnalatore", "sportello", "sportello-lavoro"] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

function normalizeCategory(cat?: string): Category | null {
  if (!cat) return null;
  const lc = cat.toLowerCase();
  if (lc === "sportello-lavoro") return "sportello"; // canonicalize
  if (ALLOWED_CATEGORIES.includes(lc as Category)) {
    return (lc === "sportello-lavoro" ? "sportello" : (lc as Category));
  }
  return null;
}

function categoryQueryForRead(cat: Category) {
  if (cat === "sportello" || cat === "sportello-lavoro") {
    return { category: { $in: ["sportello", "sportello-lavoro"] } };
  }
  return { category: cat };
}

function allowedTypesForCategory(cat: Category): string[] {
  if (cat === "segnalatore") return ["contract", "id"];
  return ["contract", "legal"]; // agenti / sportello
}

/* -------------------- Multer for templates -------------------- */

const templateStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/templates");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const inputCat = (req.body?.category || "").toString();
    const catNorm = normalizeCategory(inputCat) || "agenti";
    const { type } = req.body as { type?: string };
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const categoryPrefix = catNorm ? `${catNorm}_` : "";
    cb(null, `${categoryPrefix}${type || "template"}_template_${timestamp}${ext}`);
  }
});

const templateUpload = multer({
  storage: templateStorage,
  fileFilter: (_req: Request, file: Express.Multer.File, cb) => {
    const validExtensions = /\.pdf$|\.doc$|\.docx$/i;
    const ok = validExtensions.test(path.extname(file.originalname).toLowerCase());
    if (ok) return cb(null, true);
    return cb(new Error("Only PDF, DOC, DOCX files are allowed for templates!"));
  }
}).single("template");

/* -------------------- Controllers -------------------- */

export const getFormTemplates: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not authenticated" });
    const templates = await FormTemplate.find().sort({ createdAt: -1 });
    return res.json(templates);
  } catch (err: any) {
    console.error("Get form templates error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getFormTemplatesByCategory: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not authenticated" });

    const rawCategory = (req.params.category || "").toString();
    if (!ALLOWED_CATEGORIES.includes(rawCategory as Category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}` });
    }

    const catNorm = normalizeCategory(rawCategory) as Category;
    const query = categoryQueryForRead(catNorm);

    const templates = await FormTemplate.find(query).sort({ createdAt: -1 });
    return res.json(templates);
  } catch (err: any) {
    console.error("Get form templates by category error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const uploadFormTemplate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not authenticated" });

    const authenticatedReq = req as AuthenticatedRequest;
    if (!["admin", "super_admin"].includes(authenticatedReq.user.role)) {
      return res.status(403).json({ error: "Only admins can upload form templates" });
    }

    templateUpload(req, res, async (err) => {
      if (err) {
        console.error("Template upload error:", err);
        return res.status(400).json({ error: err.message });
      }

      const { type } = req.body as { type?: string; category?: string };
      const rawCategory = (req.body?.category || "").toString();

      const catValid =
        ALLOWED_CATEGORIES.includes(rawCategory as Category) ? normalizeCategory(rawCategory) : null;

      if (!catValid) {
        return res.status(400).json({ error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}` });
      }

      const categoryToStore: Category = normalizeCategory(rawCategory) || "agenti";
      const validTypes = allowedTypesForCategory(categoryToStore);
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({
          error: `Invalid template type for ${categoryToStore}. Must be one of: ${validTypes.join(", ")}`
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      try {
        // Build a delete query that collapses sportello + sportello-lavoro
        const deleteQuery =
          categoryToStore === "sportello"
            ? { type, category: { $in: ["sportello", "sportello-lavoro"] } }
            : { type, category: categoryToStore };

        // 1) Remove files for ALL existing matches
        const oldDocs = await FormTemplate.find(deleteQuery);
        for (const d of oldDocs) {
          if (d.filePath && fs.existsSync(d.filePath)) {
            try { fs.unlinkSync(d.filePath); } catch {}
          }
        }

        // 2) Delete ALL matching docs to avoid unique conflicts
        await FormTemplate.deleteMany(deleteQuery);

        const templateName =
          categoryToStore === "segnalatore"
            ? (type === "contract" ? "Modulo Contratto Segnalatore" : "Modulo Documento Identità")
            : (type === "contract" ? "Modulo Contratto" : "Modulo Documento Legale");

        // Debug helps a lot when diagnosing uploads
        console.log("UPLOAD DEBUG", {
          body: req.body,
          file: file.originalname,
          storedCategory: categoryToStore,
          type
        });

        // 3) Insert the new doc
        const newTemplate = new FormTemplate({
          name: templateName,
          type,
          category: categoryToStore,
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy: authenticatedReq.user._id
        });

        await newTemplate.save();

        return res.status(oldDocs.length ? 200 : 201).json({
          message: oldDocs.length ? "Template replaced successfully" : "Template uploaded successfully",
          template: newTemplate
        });
      } catch (saveError: any) {
        console.error("Save template error:", saveError);
        if (file && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch {}
        }
        if (saveError?.code === 11000) {
          return res.status(400).json({ error: "A template with this type and category already exists." });
        }
        if (saveError?.name === "ValidationError") {
          return res.status(400).json({ error: saveError.message });
        }
        return res.status(500).json({ error: "Error saving template: " + (saveError?.message || "unknown") });
      }
    });
  } catch (err: any) {
    console.error("Upload template error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const downloadFormTemplate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not authenticated" });

    const { type } = req.params;
    if (!type || !["contract", "legal", "id"].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }

    const template = await FormTemplate.findOne({
      type,
      $or: [{ category: { $exists: false } }, { category: "agenti" }]
    });

    if (!template) return res.status(404).json({ error: "Template not found" });
    if (!fs.existsSync(template.filePath)) return res.status(404).json({ error: "Template file not found on server" });

    res.setHeader("Content-Disposition", `attachment; filename="${template.originalName}"`);
    res.setHeader("Content-Type", template.mimetype);
    fs.createReadStream(template.filePath).pipe(res);
  } catch (err: any) {
    console.error("Download template error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const downloadFormTemplateByCategory: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not authenticated" });

    const rawCategory = (req.params.category || "").toString();
    const type = (req.params.type || "").toString();

    if (!ALLOWED_CATEGORIES.includes(rawCategory as Category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}` });
    }

    const catNorm = normalizeCategory(rawCategory) as Category;
    const validTypes = allowedTypesForCategory(catNorm);
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid template type for ${catNorm}. Must be one of: ${validTypes.join(", ")}`
      });
    }

    const query =
      catNorm === "sportello"
        ? { type, category: { $in: ["sportello", "sportello-lavoro"] } }
        : { type, category: catNorm };

    const template = await FormTemplate.findOne(query);
    if (!template) return res.status(404).json({ error: "Template not found" });
    if (!fs.existsSync(template.filePath)) return res.status(404).json({ error: "Template file not found on server" });

    res.setHeader("Content-Disposition", `attachment; filename="${template.originalName}"`);
    res.setHeader("Content-Type", template.mimetype);
    fs.createReadStream(template.filePath).pipe(res);
  } catch (err: any) {
    console.error("Download template by category error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteFormTemplate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not authenticated" });

    const authenticatedReq = req as AuthenticatedRequest;
    if (!["admin", "super_admin"].includes(authenticatedReq.user.role)) {
      return res.status(403).json({ error: "Only admins can delete form templates" });
    }

    const { type } = req.params;
    if (!type) return res.status(400).json({ error: "type is required" });

    const template = await FormTemplate.findOne({ type });
    if (!template) return res.status(404).json({ error: "Template not found" });

    if (fs.existsSync(template.filePath)) fs.unlinkSync(template.filePath);
    await FormTemplate.deleteOne({ _id: template._id });

    return res.json({ message: "Template deleted successfully" });
  } catch (err: any) {
    console.error("Delete template error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
