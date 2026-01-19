import { Request, Response } from "express";
import Procacciatore from "../models/Procacciatore";
import { CustomRequestHandler } from "../types/express";
import mongoose from "mongoose";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { IUser } from "../models/User";

const isPrivileged = (role: string) => role === 'admin' || role === 'super_admin';

interface MulterFiles {
  [fieldname: string]: Express.Multer.File[];
}

interface AuthenticatedRequest extends Request {
  user: IUser;
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../uploads/procacciatori');
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

    if (file.fieldname === 'file') {
      const validExtensions = /\.xlsx$|\.xls$/i;
      const hasValidExtension = validExtensions.test(path.extname(file.originalname).toLowerCase());
      
      if (hasValidExtension) {
        return cb(null, true);
      } else {
        return cb(new Error('Only Excel files (.xlsx, .xls) are allowed for bulk upload!'));
      }
    }
    
    if (file.fieldname === 'contractFile' || file.fieldname === 'idDocumentFile') {
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
  { name: 'contractFile', maxCount: 1 },
  { name: 'idDocumentFile', maxCount: 1 }
]);

export const getProcacciatori: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    let query = {};
    
    if (!isPrivileged(req.user.role)) {
      query = { user: req.user._id };
    }

    const procacciatori = await Procacciatore.find(query).sort({ createdAt: -1 });

    return res.json(procacciatori);
  } catch (err: any) {
    console.error("Get procacciatori error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getProcacciatoreById: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    
    const procacciatore = await Procacciatore.findById(id);
    
    if (!procacciatore) {
      return res.status(404).json({ error: "Procacciatore not found" });
    }

    if (!isPrivileged(req.user.role) && !procacciatore.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(procacciatore);
  } catch (err: any) {
    console.error("Get procacciatore error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


export const createProcacciatore: CustomRequestHandler = async (req, res) => {
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
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        province,
        taxCode,
        agreementPercentage,
        specialization,
        notes
      } = req.body;


      const errors: string[] = [];
      if (!firstName) errors.push("Nome is required");
      if (!lastName) errors.push("Cognome is required");
      if (!email) errors.push("Email is required");
      if (!address) errors.push("Indirizzo is required");
      if (!city) errors.push("Città is required");
      if (!postalCode) errors.push("CAP is required");
      if (!province) errors.push("Provincia is required");
      if (!taxCode) errors.push("Codice Fiscale is required");
      if (!agreementPercentage || isNaN(parseFloat(agreementPercentage))) {
        errors.push("Percentuale accordo is required and must be a valid number");
      }
      

      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' }); 
      }

      try {

        const files = req.files as MulterFiles | undefined;
        const contractFile = files?.contractFile?.[0];
        const idDocumentFile = files?.idDocumentFile?.[0];


        const newProcacciatore = new Procacciatore({
          firstName,
          lastName,
          email,
          phone: phone || '',
          address,
          city,
          postalCode,
          province,
          taxCode,
          agreementPercentage: parseFloat(agreementPercentage),
          specialization: specialization || '',
          notes: notes || '',
          contractFile: contractFile ? {
            filename: contractFile.filename,
            originalName: contractFile.originalname,
            path: contractFile.path,
            mimetype: contractFile.mimetype,
            size: contractFile.size
          } : undefined,
          idDocumentFile: idDocumentFile ? {
            filename: idDocumentFile.filename,
            originalName: idDocumentFile.originalname,
            path: idDocumentFile.path,
            mimetype: idDocumentFile.mimetype,
            size: idDocumentFile.size
          } : undefined,
          user: new mongoose.Types.ObjectId(req.user._id)
        });

        await newProcacciatore.save();


        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate(
          { user: req.user._id },
          { $inc: { procacciatori: 1 } },
          { new: true, upsert: true }
        );

        return res.status(201).json(newProcacciatore);
      } catch (saveError: any) {
        console.error("Create procacciatore error:", saveError);
        
        if (saveError.code === 11000) {
          if (saveError.keyPattern && saveError.keyPattern.email) {
            return res.status(400).json({ error: "Email already exists" });
          }
          if (saveError.keyPattern && saveError.keyPattern.taxCode) {
            return res.status(400).json({ error: "Tax code already exists" });
          }
        }
        
        return res.status(500).json({ error: "Server error" });
      }
    });
  } catch (err: any) {
    console.error("Create procacciatore error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


export const updateProcacciatore: CustomRequestHandler = async (req, res) => {
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
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        province,
        taxCode,
        agreementPercentage,
        specialization,
        notes,
        isActive
      } = req.body;

      const procacciatore = await Procacciatore.findById(id);
      
      if (!procacciatore) {
        return res.status(404).json({ error: "Procacciatore not found" });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      if (!isPrivileged(req.user.role) && !procacciatore.user.equals(req.user._id)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const errors: string[] = [];
      if (firstName === '') errors.push("Nome cannot be empty");
      if (lastName === '') errors.push("Cognome cannot be empty");
      if (email === '') errors.push("Email cannot be empty");
      if (address === '') errors.push("Indirizzo cannot be empty");
      if (city === '') errors.push("Città cannot be empty");
      if (postalCode === '') errors.push("CAP cannot be empty");
      if (province === '') errors.push("Provincia cannot be empty");
      if (taxCode === '') errors.push("Codice Fiscale cannot be empty");

      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      try {
        const files = req.files as MulterFiles | undefined;
        const contractFile = files?.contractFile?.[0];
        const idDocumentFile = files?.idDocumentFile?.[0];

  
        if (firstName !== undefined) procacciatore.firstName = firstName;
        if (lastName !== undefined) procacciatore.lastName = lastName;
        if (email !== undefined) procacciatore.email = email;
        if (phone !== undefined) procacciatore.phone = phone;
        if (address !== undefined) procacciatore.address = address;
        if (city !== undefined) procacciatore.city = city;
        if (postalCode !== undefined) procacciatore.postalCode = postalCode;
        if (province !== undefined) procacciatore.province = province;
        if (taxCode !== undefined) procacciatore.taxCode = taxCode;
        if (agreementPercentage !== undefined) procacciatore.agreementPercentage = parseFloat(agreementPercentage);
        if (specialization !== undefined) procacciatore.specialization = specialization;
        if (notes !== undefined) procacciatore.notes = notes;
        if (isActive !== undefined) procacciatore.isActive = Boolean(isActive);

        if (contractFile) {
          procacciatore.contractFile = {
            filename: contractFile.filename,
            originalName: contractFile.originalname,
            path: contractFile.path,
            mimetype: contractFile.mimetype,
            size: contractFile.size
          };
        }

        if (idDocumentFile) {
          procacciatore.idDocumentFile = {
            filename: idDocumentFile.filename,
            originalName: idDocumentFile.originalname,
            path: idDocumentFile.path,
            mimetype: idDocumentFile.mimetype,
            size: idDocumentFile.size
          };
        }

        await procacciatore.save();

        return res.json(procacciatore);
      } catch (updateError: any) {
        console.error("Update procacciatore error:", updateError);
        
    
        if (updateError.code === 11000) {
          if (updateError.keyPattern && updateError.keyPattern.email) {
            return res.status(400).json({ error: "Email already exists" });
          }
          if (updateError.keyPattern && updateError.keyPattern.taxCode) {
            return res.status(400).json({ error: "Tax code already exists" });
          }
        }
        
        return res.status(500).json({ error: "Server error" });
      }
    });
  } catch (err: any) {
    console.error("Update procacciatore error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Delete a procacciatore
export const deleteProcacciatore: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    const procacciatore = await Procacciatore.findById(id);
    
    if (!procacciatore) {
      return res.status(404).json({ error: "Procacciatore not found" });
    }

    // Regular users can only delete their own procacciatori
    if (!isPrivileged(req.user.role) && !procacciatore.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete associated files
    if (procacciatore.contractFile?.path && fs.existsSync(procacciatore.contractFile.path)) {
      fs.unlinkSync(procacciatore.contractFile.path);
    }
    if (procacciatore.idDocumentFile?.path && fs.existsSync(procacciatore.idDocumentFile.path)) {
      fs.unlinkSync(procacciatore.idDocumentFile.path);
    }

    await procacciatore.deleteOne();

    // Update dashboard stats
    const DashboardStats = require("../models/Dashboard").default;
    await DashboardStats.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { procacciatori: -1 } },
      { new: true }
    );

    return res.json({ message: "Procacciatore deleted successfully" });
  } catch (err: any) {
    console.error("Delete procacciatore error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Upload procacciatori from Excel file
export const uploadProcacciatoriFromExcel: CustomRequestHandler = async (req, res) => {
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
        const procacciatori: any[] = [];
        const errors: string[] = [];

        for (const [index, row] of (data as any[]).entries()) {
          try {
            console.log(`Processing row ${index + 1}:`, JSON.stringify(row));
            
          
            const procacciatoreData = {
              firstName: row['Nome'] || '',
              lastName: row['Cognome'] || '',
              email: row['Email'] || '',
              phone: row['Telefono'] || '',
              address: row['Indirizzo'] || '',
              city: row['Città'] || row['Citta\''] || '',
              postalCode: row['CAP'] || '',
              province: row['Provincia'] || '',
              taxCode: row['Codice Fiscale'] || '',
              agreementPercentage: parseFloat(String(row['Percentuale Accordo'] || '0')) || 0,
              specialization: row['Specializzazione'] || '',
              notes: row['Note'] || '',
              user: req.user._id
            };

            if (!procacciatoreData.firstName) {
              throw new Error("Nome is required");
            }
            if (!procacciatoreData.lastName) {
              throw new Error("Cognome is required");
            }
            if (!procacciatoreData.email) {
              throw new Error("Email is required");
            }
            if (!procacciatoreData.address) {
              throw new Error("Indirizzo is required");
            }
            if (!procacciatoreData.city) {
              throw new Error("Città is required");
            }
            if (!procacciatoreData.postalCode) {
              throw new Error("CAP is required");
            }
            if (!procacciatoreData.province) {
              throw new Error("Provincia is required");
            }
            if (!procacciatoreData.taxCode) {
              throw new Error("Codice Fiscale is required");
            }
            if (!procacciatoreData.agreementPercentage || procacciatoreData.agreementPercentage <= 0) {
              throw new Error("Percentuale Accordo is required and must be greater than 0");
            }

            console.log(`Saving procacciatore: ${procacciatoreData.firstName} ${procacciatoreData.lastName}`);
            
   
            const procacciatoreRecord = new Procacciatore(procacciatoreData);
            await procacciatoreRecord.save();
            procacciatori.push(procacciatoreRecord);
            console.log(`Procacciatore saved successfully: ${procacciatoreRecord._id}`);
          } catch (rowError: any) {
            console.error(`Error processing row ${index + 2}:`, rowError);
            errors.push(`Row ${index + 2}: ${rowError.message}`);
          }
        }


        fs.unlinkSync(file.path);
        console.log("Uploaded file cleaned up");

        // Update dashboard stats if any procacciatori was created
        if (procacciatori.length > 0) {
          const DashboardStats = require("../models/Dashboard").default;
          await DashboardStats.findOneAndUpdate(
            { user: req.user._id },
            { $inc: { procacciatori: procacciatori.length } },
            { new: true, upsert: true }
          );
          console.log("Dashboard stats updated");
        }

        
        console.log(`Import complete: ${procacciatori.length} procacciatori created, ${errors.length} errors`);
        return res.status(201).json({
          message: `${procacciatori.length} procacciatori imported successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
          procacciatori,
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
    console.error("Upload procacciatori error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};
