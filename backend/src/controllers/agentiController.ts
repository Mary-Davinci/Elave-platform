// src/controllers/agentiController.ts
import { Request, Response } from "express";
import Agente from "../models/Agenti"; // uses the SportelloLavoro model
import { CustomRequestHandler } from "../types/express";
import mongoose from "mongoose";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { IUser } from "../models/User";
import User from "../models/User";
import { NotificationService } from "../models/notificationService";
import {
  deleteObjectFromObjectStorage,
  downloadObjectFromObjectStorage,
  isObjectStorageEnabled,
  uploadBufferToObjectStorage,
} from "../services/objectStorage";

interface MulterFiles {
  [fieldname: string]: Express.Multer.File[];
}
interface AuthenticatedRequest extends Request {
  user: IUser;
}

const isPrivileged = (role: string) => role === 'admin' || role === 'super_admin';

const sanitizeFileName = (value: string) =>
  String(value || "file")
    .trim()
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_");

const buildAgenteDocumentStorageKey = (
  file: Express.Multer.File,
  kind: "signed-contract" | "legal-document"
) => {
  const now = new Date();
  const dateSegment = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `agenti/${kind}/${dateSegment}/${Date.now()}-${sanitizeFileName(file.originalname)}`;
};

const isLocalFsPath = (value: string) =>
  Boolean(value) && (path.isAbsolute(value) || value.includes("\\uploads\\") || value.includes("/uploads/"));

const removeLocalFileIfExists = (filePath?: string) => {
  if (!filePath) return;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const buildAgenteFileMeta = async (
  file: Express.Multer.File | undefined,
  kind: "signed-contract" | "legal-document"
) => {
  if (!file) return undefined;

  if (isObjectStorageEnabled()) {
    const storageKey = buildAgenteDocumentStorageKey(file, kind);
    const fileBuffer = fs.readFileSync(file.path);
    await uploadBufferToObjectStorage(storageKey, fileBuffer, file.mimetype || "application/octet-stream");

    // no local retention when object storage is enabled
    removeLocalFileIfExists(file.path);

    return {
      filename: file.filename || file.originalname,
      originalName: file.originalname,
      path: storageKey,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  return {
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    mimetype: file.mimetype,
    size: file.size,
  };
};

const cleanupPreviousAgenteDocument = async (docPath?: string) => {
  if (!docPath) return;

  if (isLocalFsPath(docPath)) {
    removeLocalFileIfExists(docPath);
    return;
  }

  if (isObjectStorageEnabled()) {
    try {
      await deleteObjectFromObjectStorage(docPath);
    } catch (err) {
      console.warn("Unable to delete previous agente document from object storage:", docPath, err);
    }
  }
};

const getAgenteDocumentByType = (agente: any, type: "contract" | "legal") => {
  return type === "contract" ? agente?.signedContractFile : agente?.legalDocumentFile;
};

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/agenti');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const toId = (v: any) => new mongoose.Types.ObjectId(String(v));

/** Build scope for non-admins based on managedBy hierarchy */
async function getScopeUserIds(currentUserId: mongoose.Types.ObjectId, role: string) {
  if (isPrivileged(role)) return null; // GLOBAL for admins/super_admins

  const scope = new Set<string>([currentUserId.toString()]);

  // direct reports
  const direct = await User.find({ managedBy: currentUserId }, { _id: 1 }).lean();
  const directIds = direct.map(u => u._id as mongoose.Types.ObjectId);
  directIds.forEach(id => scope.add(id.toString()));

  // responsabile: include reports of reports
  if (role === 'responsabile_territoriale' && directIds.length) {
    const second = await User.find({ managedBy: { $in: directIds } }, { _id: 1 }).lean();
    second.forEach(u => scope.add(String(u._id)));
  }

  return Array.from(scope).map(toId);
}

const upload = multer({
  storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb) => {
    if (file.fieldname === 'file') {
      const validExtensions = /\.xlsx$|\.xls$/i;
      const hasValidExtension = validExtensions.test(path.extname(file.originalname).toLowerCase());
      if (hasValidExtension) return cb(null, true);
      return cb(new Error('Only Excel files (.xlsx, .xls) are allowed for bulk upload!'));
    }

    if (file.fieldname === 'signedContractFile' || file.fieldname === 'legalDocumentFile') {
      const validExtensions = /\.pdf$|\.doc$|\.docx$|\.jpg$|\.jpeg$|\.png$/i;
      const hasValidExtension = validExtensions.test(path.extname(file.originalname).toLowerCase());
      if (hasValidExtension) return cb(null, true);
      return cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed for documents!'));
    }

    cb(new Error('Invalid file field'));
  }
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'signedContractFile', maxCount: 1 },
  { name: 'legalDocumentFile', maxCount: 1 }
]);

export const getAgenti: CustomRequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    if (!user) return res.status(401).json({ error: "User not authenticated" });

    const scopeIds = await getScopeUserIds(toId(user._id), user.role);
    const filter = !scopeIds ? {} : { user: { $in: scopeIds } };

    const agenti = await Agente.find(filter).sort({ createdAt: -1 });
    return res.json(agenti);
  } catch (err: any) {
    console.error("Get agenti error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getAgenteById: CustomRequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    if (!user) return res.status(401).json({ error: "User not authenticated" });

    const { id } = req.params;
    const agente = await Agente.findById(id);
    if (!agente) return res.status(404).json({ error: "Agente not found" });

    if (!isPrivileged(user.role)) {
      const scopeIds = await getScopeUserIds(toId(user._id), user.role);
      const inScope = scopeIds?.some(sid => agente.user.equals(sid));
      if (!inScope) return res.status(403).json({ error: "Access denied" });
    }

    return res.json(agente);
  } catch (err: any) {
    console.error("Get agente error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const downloadAgenteDocument: CustomRequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    if (!user) return res.status(401).json({ error: "User not authenticated" });

    const { id } = req.params;
    const type = String(req.query.type || "").toLowerCase();
    if (type !== "contract" && type !== "legal") {
      return res.status(400).json({ error: "Tipo file non valido. Usa type=contract oppure type=legal" });
    }

    const agente = await Agente.findById(id);
    if (!agente) return res.status(404).json({ error: "Agente not found" });

    if (!isPrivileged(user.role)) {
      const scopeIds = await getScopeUserIds(toId(user._id), user.role);
      const inScope = scopeIds?.some(sid => agente.user.equals(sid));
      if (!inScope) return res.status(403).json({ error: "Access denied" });
    }

    const fileMeta = getAgenteDocumentByType(agente, type as "contract" | "legal");
    if (!fileMeta?.path) {
      return res.status(404).json({ error: "Documento non disponibile" });
    }

    const fileName = fileMeta.originalName || fileMeta.filename || `${type}.bin`;

    if (isLocalFsPath(fileMeta.path)) {
      if (!fs.existsSync(fileMeta.path)) {
        return res.status(404).json({ error: "Documento non trovato nel filesystem" });
      }
      return res.download(fileMeta.path, fileName);
    }

    if (!isObjectStorageEnabled()) {
      return res.status(400).json({ error: "Object storage non configurato" });
    }

    const objectData = await downloadObjectFromObjectStorage(String(fileMeta.path));
    res.setHeader("Content-Type", fileMeta.mimetype || objectData.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    if (objectData.contentLength) {
      res.setHeader("Content-Length", String(objectData.contentLength));
    }
    return res.send(objectData.buffer);
  } catch (err: any) {
    console.error("Download agente document error:", err);
    return res.status(500).json({ error: "Server error while downloading document" });
  }
};

export const createAgente: CustomRequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    if (!user) return res.status(401).json({ error: "User not authenticated" });

    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: (err as Error).message });

      const {
        businessName,
        vatNumber,
        address,
        city,
        postalCode,
        province,
        agreedCommission,
        email,
        pec
      } = req.body;

      const errors: string[] = [];
      if (!businessName) errors.push("Ragione Sociale is required");
      if (!vatNumber) errors.push("Partita IVA is required");
      if (!address) errors.push("Indirizzo is required");
      if (!city) errors.push("Città is required");
      if (!postalCode) errors.push("CAP is required");
      if (!province) errors.push("Provincia is required");
      if (!agreedCommission || isNaN(parseFloat(agreedCommission))) {
        errors.push("Competenze concordate is required and must be a valid number");
      }
      if (errors.length > 0) return res.status(400).json({ errors });

      try {
        const files = req.files as MulterFiles | undefined;
        const signedContractFile = files?.signedContractFile?.[0];
        const legalDocumentFile = files?.legalDocumentFile?.[0];
        const signedContractMeta = await buildAgenteFileMeta(signedContractFile, "signed-contract");
        const legalDocumentMeta = await buildAgenteFileMeta(legalDocumentFile, "legal-document");

        const newAgente = new Agente({
          businessName,
          vatNumber,
          address,
          city,
          postalCode,
          province,
          agreedCommission: parseFloat(agreedCommission),
          email: email || '',
          pec: pec || '',
          isActive: false,
          isApproved: false,
          pendingApproval: true,
          signedContractFile: signedContractMeta,
          legalDocumentFile: legalDocumentMeta,
          user: new mongoose.Types.ObjectId(user._id)
        });

        await newAgente.save();

        await NotificationService.notifyAdminsOfPendingApproval({
          title: "New Responsabile Territoriale Pending Approval",
          message: `${user.firstName || user.username} created a new Responsabile Territoriale "${businessName}" that needs approval.`,
          type: "agente_pending",
          entityId: (newAgente._id as mongoose.Types.ObjectId).toString(),
          entityName: businessName,
          createdBy: user._id.toString(),
          createdByName: user.firstName ? `${user.firstName} ${user.lastName}` : user.username,
        });

        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate(
          { user: user._id },
          { $inc: { agenti: 1 } },
          { new: true, upsert: true }
        );

        return res.status(201).json(newAgente);
      } catch (saveError: any) {
        console.error("Create agente error:", saveError);
        if (saveError.code === 11000 && saveError.keyPattern?.vatNumber) {
          return res.status(400).json({ error: "VAT number already exists" });
        }
        return res.status(500).json({ error: "Server error" });
      }
    });
  } catch (err: any) {
    console.error("Create agente error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateAgente: CustomRequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    if (!user) return res.status(401).json({ error: "User not authenticated" });

    const { id } = req.params;

    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: (err as Error).message });

      const {
        businessName,
        vatNumber,
        address,
        city,
        postalCode,
        province,
        agreedCommission,
        email,
        pec
      } = req.body;

      const agente = await Agente.findById(id);
      if (!agente) return res.status(404).json({ error: "Agente not found" });

      if (!isPrivileged(user.role) && !agente.user.equals(user._id)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const errors: string[] = [];
      if (businessName === '') errors.push("Ragione Sociale cannot be empty");
      if (vatNumber === '') errors.push("Partita IVA cannot be empty");
      if (address === '') errors.push("Indirizzo cannot be empty");
      if (city === '') errors.push("Città cannot be empty");
      if (postalCode === '') errors.push("CAP cannot be empty");
      if (province === '') errors.push("Provincia cannot be empty");
      if (errors.length > 0) return res.status(400).json({ errors });

      try {
        const files = req.files as MulterFiles | undefined;
        const signedContractFile = files?.signedContractFile?.[0];
        const legalDocumentFile = files?.legalDocumentFile?.[0];

        if (businessName !== undefined) agente.businessName = businessName;
        if (vatNumber !== undefined) agente.vatNumber = vatNumber;
        if (address !== undefined) agente.address = address;
        if (city !== undefined) agente.city = city;
        if (postalCode !== undefined) agente.postalCode = postalCode;
        if (province !== undefined) agente.province = province;
        if (agreedCommission !== undefined) agente.agreedCommission = parseFloat(agreedCommission);
        if (email !== undefined) agente.email = email;
        if (pec !== undefined) agente.pec = pec;

        if (signedContractFile) {
          await cleanupPreviousAgenteDocument(agente.signedContractFile?.path);
          agente.signedContractFile = await buildAgenteFileMeta(signedContractFile, "signed-contract");
        }

        if (legalDocumentFile) {
          await cleanupPreviousAgenteDocument(agente.legalDocumentFile?.path);
          agente.legalDocumentFile = await buildAgenteFileMeta(legalDocumentFile, "legal-document");
        }

        await agente.save();
        return res.json(agente);
      } catch (updateError: any) {
        console.error("Update agente error:", updateError);
        if (updateError.code === 11000 && updateError.keyPattern?.vatNumber) {
          return res.status(400).json({ error: "VAT number already exists" });
        }
        return res.status(500).json({ error: "Server error" });
      }
    });
  } catch (err: any) {
    console.error("Update agente error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteAgente: CustomRequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    if (!user) return res.status(401).json({ error: "User not authenticated" });

    const { id } = req.params;

    const agente = await Agente.findById(id);
    if (!agente) return res.status(404).json({ error: "Agente not found" });

    if (!isPrivileged(user.role) && !agente.user.equals(user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    await cleanupPreviousAgenteDocument(agente.signedContractFile?.path);
    await cleanupPreviousAgenteDocument(agente.legalDocumentFile?.path);

    await agente.deleteOne();

    const DashboardStats = require("../models/Dashboard").default;
    await DashboardStats.findOneAndUpdate(
      { user: user._id },
      { $inc: { agenti: -1 } },
      { new: true }
    );

    return res.json({ message: "Agente deleted successfully" });
  } catch (err: any) {
    console.error("Delete agente error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getAgentiMinimal: CustomRequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    if (!user) return res.status(401).json({ error: "User not authenticated" });

    const scopeIds = await getScopeUserIds(toId(user._id), user.role);
    const userScopeFilter = !scopeIds ? {} : { _id: { $in: scopeIds } };
    const responsabiliUsers = await User.find(
      { role: "responsabile_territoriale", isActive: { $ne: false }, ...userScopeFilter },
      { _id: 1 }
    ).lean();
    const responsabileIds = responsabiliUsers.map(u => u._id);

    if (responsabileIds.length === 0) {
      return res.json([]);
    }

    const query = { user: { $in: responsabileIds } };

    const rows = await Agente.find(query)
      .select('_id businessName isApproved isActive user')
      .lean();

    return res.json(rows);
  } catch (err) {
    console.error('getAgentiMinimal error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const uploadAgentiFromExcel: CustomRequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    if (!user) return res.status(401).json({ error: "User not authenticated" });

    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: (err as Error).message });

      const files = req.files as MulterFiles | undefined;
      const file = files?.file?.[0];
      if (!file) return res.status(400).json({ error: "No file provided" });

      try {
        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet) as any[];

        if (!data || data.length === 0) {
          fs.unlinkSync(file.path);
          return res.status(400).json({ error: "Excel file has no data" });
        }

        const agenti: any[] = [];
        const errors: string[] = [];

        for (const [index, row] of data.entries()) {
          try {
            const agenteData = {
              businessName: row['Ragione Sociale'] || '',
              vatNumber: row['Partita IVA'] || '',
              address: row['Indirizzo'] || '',
              city: row['Città'] || row["Citta'"] || '',
              postalCode: row['CAP'] || '',
              province: row['Provincia'] || '',
              agreedCommission: parseFloat(String(row['Competenze concordate al %'] || '0')) || 0,
              email: row['Email'] || '',
              pec: row['PEC'] || '',
              user: user._id
            };

            if (!agenteData.businessName) throw new Error("Ragione Sociale is required");
            if (!agenteData.vatNumber) throw new Error("Partita IVA is required");
            if (!agenteData.address) throw new Error("Indirizzo is required");
            if (!agenteData.city) throw new Error("Città is required");
            if (!agenteData.postalCode) throw new Error("CAP is required");
            if (!agenteData.province) throw new Error("Provincia is required");
            if (!agenteData.agreedCommission || agenteData.agreedCommission <= 0) {
              throw new Error("Competenze concordate is required and must be greater than 0");
            }

            const agente = new Agente(agenteData);
            await agente.save();
            agenti.push(agente);
          } catch (rowError: any) {
            errors.push(`Row ${index + 2}: ${rowError.message}`);
          }
        }

        fs.unlinkSync(file.path);

        if (agenti.length > 0) {
          const DashboardStats = require("../models/Dashboard").default;
          await DashboardStats.findOneAndUpdate(
            { user: user._id },
            { $inc: { agenti: agenti.length } },
            { new: true, upsert: true }
          );
        }

        return res.status(201).json({
          message: `${agenti.length} agenti imported successfully${errors.length ? ` with ${errors.length} errors` : ''}`,
          agenti,
          errors: errors.length ? errors : undefined
        });
      } catch (processError: any) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        console.error("Excel processing error:", processError);
        return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
      }
    });
  } catch (err: any) {
    console.error("Upload agenti error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};
