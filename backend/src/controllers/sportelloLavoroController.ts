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

    let query = {};
    
    if (req.user.role !== 'admin') {
      query = { user: req.user._id };
    }

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

    if (req.user.role !== 'admin' && !sportelloLavoro.user.equals(req.user._id)) {
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
      
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' }); 
      }

      try {
        const files = req.files as MulterFiles | undefined;
        const signedContractFile = files?.signedContractFile?.[0];
        const legalDocumentFile = files?.legalDocumentFile?.[0];

        const isAutoApproved = ['admin', 'super_admin'].includes(req.user.role);
        const needsApproval = ['responsabile_territoriale'].includes(req.user.role);

        const newSportelloLavoro = new SportelloLavoro({
          agentName,
          businessName, 
          vatNumber,
          address,
          city,
          postalCode,
          province,
          agreedCommission: parseFloat(agreedCommission),
          email: email || '',
          pec: pec || '',
          signedContractFile: signedContractFile ? {
            filename: signedContractFile.filename,
            originalName: signedContractFile.originalname,
            path: signedContractFile.path,
            mimetype: signedContractFile.mimetype,
            size: signedContractFile.size
          } : undefined,
          legalDocumentFile: legalDocumentFile ? {
            filename: legalDocumentFile.filename,
            originalName: legalDocumentFile.originalname,
            path: legalDocumentFile.path,
            mimetype: legalDocumentFile.mimetype,
            size: legalDocumentFile.size
          } : undefined,


          // Approval logic
          isActive: isAutoApproved,
          isApproved: isAutoApproved,
          pendingApproval: needsApproval,
          approvedBy: isAutoApproved ? req.user._id : undefined,
          approvedAt: isAutoApproved ? new Date() : undefined,
          user: new mongoose.Types.ObjectId(req.user._id)
        });

        await newSportelloLavoro.save();

        // Send notification if needs approval
        if (needsApproval) {
          await NotificationService.notifyAdminsOfPendingApproval({
            title: 'New Sportello Lavoro Pending Approval',
            message: `${req.user.firstName || req.user.username} created a new Sportello Lavoro "${businessName}" that needs approval.`,
            type: 'sportello_pending',
            entityId: (newSportelloLavoro._id as mongoose.Types.ObjectId).toString(), // Fix: Cast to ObjectId and convert to string
            entityName: businessName,
            createdBy: req.user._id.toString(),
            createdByName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName}` : req.user.username
          });
        }

        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate(
          { user: req.user._id },
          { $inc: { sportelloLavoro: 1 } },
          { new: true, upsert: true }
        );

        return res.status(201).json({
          ...newSportelloLavoro.toObject(),
          message: needsApproval ? 'Sportello Lavoro created and submitted for approval' : 'Sportello Lavoro created successfully'
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

      const sportelloLavoro = await SportelloLavoro.findById(id);
      
      if (!sportelloLavoro) {
        return res.status(404).json({ error: "Sportello Lavoro not found" });
      }
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    
      if (req.user.role !== 'admin' && !sportelloLavoro.user.equals(req.user._id)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const errors: string[] = [];
      if (businessName === '') errors.push("Ragione Sociale cannot be empty");
      if (vatNumber === '') errors.push("Partita IVA cannot be empty");
      if (address === '') errors.push("Indirizzo cannot be empty");
      if (city === '') errors.push("Città cannot be empty");
      if (postalCode === '') errors.push("CAP cannot be empty");
      if (province === '') errors.push("Provincia cannot be empty");

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

 
    if (req.user.role !== 'admin' && !sportelloLavoro.user.equals(req.user._id)) {
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

      const files = req.files as MulterFiles | undefined;
      const file = files?.file?.[0];

      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      try {
        console.log("File uploaded successfully:", file.path);
       
        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        console.log("Excel data parsed. Row count:", data.length);
        console.log("Sample row:", data.length > 0 ? JSON.stringify(data[0]) : "No data");

        if (!data || data.length === 0) {
          fs.unlinkSync(file.path);
          return res.status(400).json({ error: "Excel file has no data" });
        }
        if (!req.user) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const sportelloLavoro: any[] = [];
        const errors: string[] = [];

        for (const [index, row] of (data as any[]).entries()) {
          try {
            console.log(`Processing row ${index + 1}:`, JSON.stringify(row));
            
            const sportelloLavoroData = {
              businessName: row['Ragione Sociale'] || '',
              vatNumber: row['Partita IVA'] || '',
              address: row['Indirizzo'] || '',
              city: row['Città'] || row['Citta\''] || '',
              postalCode: row['CAP'] || '',
              province: row['Provincia'] || '',
              agreedCommission: parseFloat(String(row['Competenze concordate al %'] || '0')) || 0,
              email: row['Email'] || '',
              pec: row['PEC'] || '',
              user: req.user._id
            };

            if (!sportelloLavoroData.businessName) {
              throw new Error("Ragione Sociale is required");
            }
            if (!sportelloLavoroData.vatNumber) {
              throw new Error("Partita IVA is required");
            }
            if (!sportelloLavoroData.address) {
              throw new Error("Indirizzo is required");
            }
            if (!sportelloLavoroData.city) {
              throw new Error("Città is required");
            }
            if (!sportelloLavoroData.postalCode) {
              throw new Error("CAP is required");
            }
            if (!sportelloLavoroData.province) {
              throw new Error("Provincia is required");
            }
            if (!sportelloLavoroData.agreedCommission || sportelloLavoroData.agreedCommission <= 0) {
              throw new Error("Competenze concordate is required and must be greater than 0");
            }

            console.log(`Saving sportello lavoro: ${sportelloLavoroData.businessName}`);
            
            const sportelloLavoroRecord = new SportelloLavoro(sportelloLavoroData);
            await sportelloLavoroRecord.save();
            sportelloLavoro.push(sportelloLavoroRecord);
            console.log(`Sportello Lavoro saved successfully: ${sportelloLavoroRecord._id}`);
          } catch (rowError: any) {
            console.error(`Error processing row ${index + 2}:`, rowError);
            errors.push(`Row ${index + 2}: ${rowError.message}`);
          }
        }

        fs.unlinkSync(file.path);
        console.log("Uploaded file cleaned up");

        if (sportelloLavoro.length > 0) {
          const DashboardStats = require("../models/Dashboard").default;
          await DashboardStats.findOneAndUpdate(
            { user: req.user._id },
            { $inc: { sportelloLavoro: sportelloLavoro.length } },
            { new: true, upsert: true }
          );
          console.log("Dashboard stats updated");
        }


        console.log(`Import complete: ${sportelloLavoro.length} sportello lavoro created, ${errors.length} errors`);
        return res.status(201).json({
          message: `${sportelloLavoro.length} sportello lavoro imported successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
          sportelloLavoro,
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