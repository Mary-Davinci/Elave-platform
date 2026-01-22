import { Request, Response } from "express";
import SportelloLavoro from "../models/sportello";
import { CustomRequestHandler } from "../types/express";
import mongoose from "mongoose";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { IUser } from "../models/User";
import { NotificationService } from "../models/notificationService";

const isPrivileged = (role: string) => role === 'admin' || role === 'super_admin';

interface MulterFiles {
  [fieldname: string]: Express.Multer.File[];
}

interface AuthenticatedRequest extends Request {
  user: IUser;
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../uploads/sportello-lavoro');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log("File upload attempt:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase()
    });

    // For Excel uploads
    if (file.fieldname === 'file') {
      const validExtensions = /\.xlsx$|\.xls$/i;
      const hasValidExtension = validExtensions.test(path.extname(file.originalname).toLowerCase());
      
      const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/excel',
        'application/x-excel',
        'application/x-msexcel'
      ];
      
      const hasValidMimeType = validMimeTypes.includes(file.mimetype);
      
      if (hasValidExtension) {
        return cb(null, true);
      } else {
        return cb(new Error('Only Excel files (.xlsx, .xls) are allowed for bulk upload!'));
      }
    }
    
    if (file.fieldname === 'signedContractFile' || file.fieldname === 'legalDocumentFile') {
      const validExtensions = /\.pdf$|\.doc$|\.docx$|\.jpg$|\.jpeg$|\.png$/i;
      const hasValidExtension = validExtensions.test(path.extname(file.originalname).toLowerCase());
      
      if (hasValidExtension) {
        return cb(null, true);
      } else {
        return cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed for documents!'));
      }
    }
    
    cb(new Error('Invalid file field'));
  }
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'signedContractFile', maxCount: 1 },
  { name: 'legalDocumentFile', maxCount: 1 }
]);

export const getSportelloLavoro: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const role = req.user.role;
    const isPrivilegedUser = isPrivileged(role);
    let query = {};

    if (!isPrivilegedUser) {
      query = { user: req.user._id };
    }

    console.log("SportelloLavoro list scope:", {
      userId: req.user._id?.toString?.() ?? req.user._id,
      role,
      isPrivilegedUser,
      query
    });

    const sportelloLavoro = await SportelloLavoro.find(query).sort({ createdAt: -1 });

    return res.json(sportelloLavoro);
  } catch (err: any) {
    console.error("Get sportello lavoro error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getSportelloLavoroById: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    
    const sportelloLavoro = await SportelloLavoro.findById(id);
    
    if (!sportelloLavoro) {
      return res.status(404).json({ error: "Sportello Lavoro not found" });
    }

    if (!isPrivileged(req.user.role) && !sportelloLavoro.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(sportelloLavoro);
  } catch (err: any) {
    console.error("Get sportello lavoro error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createSportelloLavoro: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    upload(req, res, async (err) => {
      if (err) {
        console.error("File upload error:", err);
        return res.status(400).json({ error: err.message });
      }

      // ✅ Narrow user for this callback scope
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const {
        agentName,
        businessName,
        vatNumber,
        address,
        city,
        postalCode,
        province,
        agreedCommission,
        email,
        pec
      } = req.body as {
        agentName?: string;
        businessName?: string;
        vatNumber?: string;
        address?: string;
        city?: string;
        postalCode?: string;
        province?: string;
        agreedCommission?: string;
        email?: string;
        pec?: string;
      };

      const resolvedBusinessName =
        (businessName && businessName.trim()) ||
        (user.organization && user.organization.trim()) ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        user.username ||
        (user.email ? user.email.split("@")[0] : "") ||
        "";

      const commissionNum = Number(agreedCommission);

      const errors: string[] = [];
      if (!resolvedBusinessName) errors.push("Ragione Sociale is required");
      if (!vatNumber) errors.push("Partita IVA is required");
      if (!address) errors.push("Indirizzo is required");
      if (!city) errors.push("Città is required");
      if (!postalCode) errors.push("CAP is required");
      if (!province) errors.push("Provincia is required");
      if (!Number.isFinite(commissionNum)) {
        errors.push("Competenze concordate is required and must be a valid number");
      }
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      try {
        const files = req.files as MulterFiles | undefined;
        const signedContractFile = files?.signedContractFile?.[0];
        const legalDocumentFile = files?.legalDocumentFile?.[0];

        const isAutoApproved = ["admin", "super_admin"].includes(user.role);
        const needsApproval = ["responsabile_territoriale"].includes(user.role);

        const newSportelloLavoro = new SportelloLavoro({
          agentName,
          businessName: resolvedBusinessName,
          vatNumber,
          address,
          city,
          postalCode,
          province,
          agreedCommission: commissionNum,
          email: email || "",
          pec: pec || "",
          signedContractFile: signedContractFile
            ? {
                filename: signedContractFile.filename,
                originalName: signedContractFile.originalname,
                path: signedContractFile.path,
                mimetype: signedContractFile.mimetype,
                size: signedContractFile.size
              }
            : undefined,
          legalDocumentFile: legalDocumentFile
            ? {
                filename: legalDocumentFile.filename,
                originalName: legalDocumentFile.originalname,
                path: legalDocumentFile.path,
                mimetype: legalDocumentFile.mimetype,
                size: legalDocumentFile.size
              }
            : undefined,
          isActive: isAutoApproved,
          isApproved: isAutoApproved,
          pendingApproval: needsApproval,
          approvedBy: isAutoApproved ? user._id : undefined,
          approvedAt: isAutoApproved ? new Date() : undefined,
          user: new mongoose.Types.ObjectId(user._id)
        });

        await newSportelloLavoro.save();

        if (needsApproval) {
          await NotificationService.notifyAdminsOfPendingApproval({
            title: "New Sportello Lavoro Pending Approval",
            message: `${user.firstName || user.username} created a new Sportello Lavoro "${resolvedBusinessName}" that needs approval.`,
            type: "sportello_pending",
            entityId: (newSportelloLavoro._id as mongoose.Types.ObjectId).toString(),
            entityName: resolvedBusinessName,
            createdBy: user._id.toString(),
            createdByName: user.firstName ? `${user.firstName} ${user.lastName}` : user.username
          });
        }

        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate(
          { user: user._id },
          { $inc: { sportelloLavoro: 1 } },
          { new: true, upsert: true }
        );

        return res.status(201).json({
          ...newSportelloLavoro.toObject(),
          message: needsApproval
            ? "Sportello Lavoro created and submitted for approval"
            : "Sportello Lavoro created successfully"
        });
      } catch (saveError: any) {
        console.error("Create sportello lavoro error:", saveError);
        if (saveError.code === 11000 && saveError.keyPattern && saveError.keyPattern.vatNumber) {
          return res.status(400).json({ error: "VAT number already exists" });
        }
        return res.status(500).json({ error: "Server error" });
      }
    });
  } catch (err: any) {
    console.error("Create sportello lavoro error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


export const updateSportelloLavoro: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const { id } = req.params;

    upload(req, res, async (err) => {
      if (err) {
        console.error("File upload error:", err);
        return res.status(400).json({ error: err.message });
      }

      // ✅ Narrow user for this callback scope
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

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
      } = req.body as any;

      const sportelloLavoro = await SportelloLavoro.findById(id);
      if (!sportelloLavoro) {
        return res.status(404).json({ error: "Sportello Lavoro not found" });
      }

      if (!isPrivileged(user.role) && !sportelloLavoro.user.equals(user._id)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const errors: string[] = [];
      if (businessName === "") errors.push("Ragione Sociale cannot be empty");
      if (vatNumber === "") errors.push("Partita IVA cannot be empty");
      if (address === "") errors.push("Indirizzo cannot be empty");
      if (city === "") errors.push("Città cannot be empty");
      if (postalCode === "") errors.push("CAP cannot be empty");
      if (province === "") errors.push("Provincia cannot be empty");
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      try {
        const files = req.files as MulterFiles | undefined;
        const signedContractFile = files?.signedContractFile?.[0];
        const legalDocumentFile = files?.legalDocumentFile?.[0];

        if (businessName !== undefined) sportelloLavoro.businessName = businessName;
        if (vatNumber !== undefined) sportelloLavoro.vatNumber = vatNumber;
        if (address !== undefined) sportelloLavoro.address = address;
        if (city !== undefined) sportelloLavoro.city = city;
        if (postalCode !== undefined) sportelloLavoro.postalCode = postalCode;
        if (province !== undefined) sportelloLavoro.province = province;
        if (agreedCommission !== undefined) sportelloLavoro.agreedCommission = parseFloat(agreedCommission);
        if (email !== undefined) sportelloLavoro.email = email;
        if (pec !== undefined) sportelloLavoro.pec = pec;

        if (signedContractFile) {
          sportelloLavoro.signedContractFile = {
            filename: signedContractFile.filename,
            originalName: signedContractFile.originalname,
            path: signedContractFile.path,
            mimetype: signedContractFile.mimetype,
            size: signedContractFile.size
          };
        }
        if (legalDocumentFile) {
          sportelloLavoro.legalDocumentFile = {
            filename: legalDocumentFile.filename,
            originalName: legalDocumentFile.originalname,
            path: legalDocumentFile.path,
            mimetype: legalDocumentFile.mimetype,
            size: legalDocumentFile.size
          };
        }

        await sportelloLavoro.save();
        return res.json(sportelloLavoro);
      } catch (updateError: any) {
        console.error("Update sportello lavoro error:", updateError);
        if (updateError.code === 11000 && updateError.keyPattern && updateError.keyPattern.vatNumber) {
          return res.status(400).json({ error: "VAT number already exists" });
        }
        return res.status(500).json({ error: "Server error" });
      }
    });
  } catch (err: any) {
    console.error("Update sportello lavoro error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};



export const deleteSportelloLavoro: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    const sportelloLavoro = await SportelloLavoro.findById(id);
    
    if (!sportelloLavoro) {
      return res.status(404).json({ error: "Sportello Lavoro not found" });
    }

 
    if (!isPrivileged(req.user.role) && !sportelloLavoro.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (sportelloLavoro.signedContractFile?.path && fs.existsSync(sportelloLavoro.signedContractFile.path)) {
      fs.unlinkSync(sportelloLavoro.signedContractFile.path);
    }
    if (sportelloLavoro.legalDocumentFile?.path && fs.existsSync(sportelloLavoro.legalDocumentFile.path)) {
      fs.unlinkSync(sportelloLavoro.legalDocumentFile.path);
    }

    await sportelloLavoro.deleteOne();

    const DashboardStats = require("../models/Dashboard").default;
    await DashboardStats.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { sportelloLavoro: -1 } },
      { new: true }
    );

    return res.json({ message: "Sportello Lavoro deleted successfully" });
  } catch (err: any) {
    console.error("Delete sportello lavoro error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const uploadSportelloLavoroFromExcel: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    upload(req, res, async (err) => {
      if (err) {
        console.error("File upload error:", err);
        return res.status(400).json({ error: err.message });
      }

      // ✅ Narrow user for this callback scope
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const files = req.files as MulterFiles | undefined;
      const file = files?.file?.[0];

      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      try {
        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (!data || data.length === 0) {
          fs.unlinkSync(file.path);
          return res.status(400).json({ error: "Excel file has no data" });
        }

        const created: any[] = [];
        const errors: string[] = [];

        for (const [index, row] of (data as any[]).entries()) {
          try {
            const sportelloLavoroData = {
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

            if (!sportelloLavoroData.businessName) throw new Error("Ragione Sociale is required");
            if (!sportelloLavoroData.vatNumber) throw new Error("Partita IVA is required");
            if (!sportelloLavoroData.address) throw new Error("Indirizzo is required");
            if (!sportelloLavoroData.city) throw new Error("Città is required");
            if (!sportelloLavoroData.postalCode) throw new Error("CAP is required");
            if (!sportelloLavoroData.province) throw new Error("Provincia is required");
            if (!sportelloLavoroData.agreedCommission || sportelloLavoroData.agreedCommission <= 0) {
              throw new Error("Competenze concordate is required and must be greater than 0");
            }

            const rec = new SportelloLavoro(sportelloLavoroData);
            await rec.save();
            created.push(rec);
          } catch (rowError: any) {
            errors.push(`Row ${index + 2}: ${rowError.message}`);
          }
        }

        fs.unlinkSync(file.path);

        if (created.length > 0) {
          const DashboardStats = require("../models/Dashboard").default;
          await DashboardStats.findOneAndUpdate(
            { user: user._id },
            { $inc: { sportelloLavoro: created.length } },
            { new: true, upsert: true }
          );
        }

        return res.status(201).json({
          message: `${created.length} sportello lavoro imported successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
          sportelloLavoro: created,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (processError: any) {
        if (file && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        console.error("Excel processing error:", processError);
        return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
      }
    });
  } catch (err: any) {
    console.error("Upload sportello lavoro error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};
