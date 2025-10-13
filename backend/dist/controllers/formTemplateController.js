"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFormTemplate = exports.downloadFormTemplateByCategory = exports.downloadFormTemplate = exports.uploadFormTemplate = exports.getFormTemplatesByCategory = exports.getFormTemplates = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// If your file is actually named FormTemplet.ts keep that import;
// otherwise prefer "../models/FormTemplate"
const FormTemplet_1 = __importDefault(require("../models/FormTemplet"));
/* -------------------- Helpers -------------------- */
const ALLOWED_CATEGORIES = ["agenti", "segnalatore", "sportello", "sportello-lavoro"];
function normalizeCategory(cat) {
    if (!cat)
        return null;
    const lc = cat.toLowerCase();
    if (lc === "sportello-lavoro")
        return "sportello"; // canonicalize
    if (ALLOWED_CATEGORIES.includes(lc)) {
        return (lc === "sportello-lavoro" ? "sportello" : lc);
    }
    return null;
}
function categoryQueryForRead(cat) {
    if (cat === "sportello" || cat === "sportello-lavoro") {
        return { category: { $in: ["sportello", "sportello-lavoro"] } };
    }
    return { category: cat };
}
function allowedTypesForCategory(cat) {
    if (cat === "segnalatore")
        return ["contract", "id"];
    return ["contract", "legal"]; // agenti / sportello
}
/* -------------------- Multer for templates -------------------- */
const templateStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path_1.default.join(__dirname, "../uploads/templates");
        if (!fs_1.default.existsSync(uploadDir))
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const inputCat = (req.body?.category || "").toString();
        const catNorm = normalizeCategory(inputCat) || "agenti";
        const { type } = req.body;
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname);
        const categoryPrefix = catNorm ? `${catNorm}_` : "";
        cb(null, `${categoryPrefix}${type || "template"}_template_${timestamp}${ext}`);
    }
});
const templateUpload = (0, multer_1.default)({
    storage: templateStorage,
    fileFilter: (_req, file, cb) => {
        const validExtensions = /\.pdf$|\.doc$|\.docx$/i;
        const ok = validExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
        if (ok)
            return cb(null, true);
        return cb(new Error("Only PDF, DOC, DOCX files are allowed for templates!"));
    }
}).single("template");
/* -------------------- Controllers -------------------- */
const getFormTemplates = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "User not authenticated" });
        const templates = await FormTemplet_1.default.find().sort({ createdAt: -1 });
        return res.json(templates);
    }
    catch (err) {
        console.error("Get form templates error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getFormTemplates = getFormTemplates;
const getFormTemplatesByCategory = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "User not authenticated" });
        const rawCategory = (req.params.category || "").toString();
        if (!ALLOWED_CATEGORIES.includes(rawCategory)) {
            return res.status(400).json({ error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}` });
        }
        const catNorm = normalizeCategory(rawCategory);
        const query = categoryQueryForRead(catNorm);
        const templates = await FormTemplet_1.default.find(query).sort({ createdAt: -1 });
        return res.json(templates);
    }
    catch (err) {
        console.error("Get form templates by category error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getFormTemplatesByCategory = getFormTemplatesByCategory;
const uploadFormTemplate = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "User not authenticated" });
        const authenticatedReq = req;
        if (!["admin", "super_admin"].includes(authenticatedReq.user.role)) {
            return res.status(403).json({ error: "Only admins can upload form templates" });
        }
        templateUpload(req, res, async (err) => {
            if (err) {
                console.error("Template upload error:", err);
                return res.status(400).json({ error: err.message });
            }
            const { type } = req.body;
            const rawCategory = (req.body?.category || "").toString();
            const catValid = ALLOWED_CATEGORIES.includes(rawCategory) ? normalizeCategory(rawCategory) : null;
            if (!catValid) {
                return res.status(400).json({ error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}` });
            }
            const categoryToStore = normalizeCategory(rawCategory) || "agenti";
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
                const deleteQuery = categoryToStore === "sportello"
                    ? { type, category: { $in: ["sportello", "sportello-lavoro"] } }
                    : { type, category: categoryToStore };
                // 1) Remove files for ALL existing matches
                const oldDocs = await FormTemplet_1.default.find(deleteQuery);
                for (const d of oldDocs) {
                    if (d.filePath && fs_1.default.existsSync(d.filePath)) {
                        try {
                            fs_1.default.unlinkSync(d.filePath);
                        }
                        catch { }
                    }
                }
                // 2) Delete ALL matching docs to avoid unique conflicts
                await FormTemplet_1.default.deleteMany(deleteQuery);
                const templateName = categoryToStore === "segnalatore"
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
                const newTemplate = new FormTemplet_1.default({
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
            }
            catch (saveError) {
                console.error("Save template error:", saveError);
                if (file && fs_1.default.existsSync(file.path)) {
                    try {
                        fs_1.default.unlinkSync(file.path);
                    }
                    catch { }
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
    }
    catch (err) {
        console.error("Upload template error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.uploadFormTemplate = uploadFormTemplate;
const downloadFormTemplate = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "User not authenticated" });
        const { type } = req.params;
        if (!type || !["contract", "legal", "id"].includes(type)) {
            return res.status(400).json({ error: "Invalid template type" });
        }
        const template = await FormTemplet_1.default.findOne({
            type,
            $or: [{ category: { $exists: false } }, { category: "agenti" }]
        });
        if (!template)
            return res.status(404).json({ error: "Template not found" });
        if (!fs_1.default.existsSync(template.filePath))
            return res.status(404).json({ error: "Template file not found on server" });
        res.setHeader("Content-Disposition", `attachment; filename="${template.originalName}"`);
        res.setHeader("Content-Type", template.mimetype);
        fs_1.default.createReadStream(template.filePath).pipe(res);
    }
    catch (err) {
        console.error("Download template error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.downloadFormTemplate = downloadFormTemplate;
const downloadFormTemplateByCategory = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "User not authenticated" });
        const rawCategory = (req.params.category || "").toString();
        const type = (req.params.type || "").toString();
        if (!ALLOWED_CATEGORIES.includes(rawCategory)) {
            return res.status(400).json({ error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}` });
        }
        const catNorm = normalizeCategory(rawCategory);
        const validTypes = allowedTypesForCategory(catNorm);
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({
                error: `Invalid template type for ${catNorm}. Must be one of: ${validTypes.join(", ")}`
            });
        }
        const query = catNorm === "sportello"
            ? { type, category: { $in: ["sportello", "sportello-lavoro"] } }
            : { type, category: catNorm };
        const template = await FormTemplet_1.default.findOne(query);
        if (!template)
            return res.status(404).json({ error: "Template not found" });
        if (!fs_1.default.existsSync(template.filePath))
            return res.status(404).json({ error: "Template file not found on server" });
        res.setHeader("Content-Disposition", `attachment; filename="${template.originalName}"`);
        res.setHeader("Content-Type", template.mimetype);
        fs_1.default.createReadStream(template.filePath).pipe(res);
    }
    catch (err) {
        console.error("Download template by category error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.downloadFormTemplateByCategory = downloadFormTemplateByCategory;
const deleteFormTemplate = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "User not authenticated" });
        const authenticatedReq = req;
        if (!["admin", "super_admin"].includes(authenticatedReq.user.role)) {
            return res.status(403).json({ error: "Only admins can delete form templates" });
        }
        const { type } = req.params;
        if (!type)
            return res.status(400).json({ error: "type is required" });
        const template = await FormTemplet_1.default.findOne({ type });
        if (!template)
            return res.status(404).json({ error: "Template not found" });
        if (fs_1.default.existsSync(template.filePath))
            fs_1.default.unlinkSync(template.filePath);
        await FormTemplet_1.default.deleteOne({ _id: template._id });
        return res.json({ message: "Template deleted successfully" });
    }
    catch (err) {
        console.error("Delete template error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteFormTemplate = deleteFormTemplate;
//# sourceMappingURL=formTemplateController.js.map