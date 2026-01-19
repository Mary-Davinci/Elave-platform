import { Request, Response } from "express";
import Utility from "../models/Utilities";
import { CustomRequestHandler } from "../types/express";
import multer from "multer";
import path from "path";
import fs from "fs";

const isPrivileged = (role: string) => role === "admin" || role === "super_admin";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/utilities');
    

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
  
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    
    const allowedTypes = /pdf|doc|docx|xls|xlsx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.mimetype === 'application/vnd.ms-excel' ||
                    file.mimetype === 'application/msword' ||
                    file.mimetype === 'application/zip' ||
                    file.mimetype === 'application/x-rar-compressed';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only specific file types are allowed!'));
    }
  }
});


export const uploadMiddleware = upload.single('file');

const getFileType = (file: Express.Multer.File, providedType?: string): string => {
 
  const validTypes = ['form', 'faq', 'manual', 'document', 'spreadsheet', 'other'];
  if (providedType && validTypes.includes(providedType)) {
    return providedType;
  }

 
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  
  if (extension === '.pdf' || mimeType === 'application/pdf') {
    return 'document';
  }
  if (['.doc', '.docx'].includes(extension) || 
      ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimeType)) {
    return 'document';
  }
  if (['.xls', '.xlsx'].includes(extension) || 
      ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mimeType)) {
    return 'spreadsheet';
  }
  if (extension === '.txt' || mimeType === 'text/plain') {
    return 'document';
  }
  if (['.zip', '.rar'].includes(extension) || 
      ['application/zip', 'application/x-rar-compressed'].includes(mimeType)) {
    return 'other';
  }

  return 'other'; 
};


export const getUtilities: CustomRequestHandler = async (req, res) => {
  try {
    
    const utilities = await Utility.find().sort({ name: 1 });
    return res.json(utilities);
  } catch (error) {
    console.error("Get utilities error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};


export const uploadUtility: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || !isPrivileged(req.user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }


    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { name, type, isPublic, category } = req.body;

    const utilityName = name || req.file.originalname;

    const fileUrl = `/uploads/utilities/${req.file.filename}`;

    const utilityType = getFileType(req.file, type);

    const newUtility = new Utility({
      name: utilityName,
      fileUrl: fileUrl,
      type: utilityType,
      isPublic: isPublic !== 'false',
      category: category || 'uncategorized', 

    });

    await newUtility.save();

    return res.status(201).json(newUtility);
  } catch (error) {
    console.error("Upload utility error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const addUtility: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || !isPrivileged(req.user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { name, fileUrl, type, isPublic } = req.body;

    if (!name || !fileUrl || !type) {
      return res.status(400).json({ error: "Name, file URL, and type are required" });
    }

    const validTypes = ['form', 'faq', 'manual', 'document', 'spreadsheet', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    const newUtility = new Utility({
      name,
      fileUrl,
      type,
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await newUtility.save();

    return res.status(201).json(newUtility);
  } catch (error) {
    console.error("Add utility error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteUtility: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || !isPrivileged(req.user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    
    const utility = await Utility.findById(id);
    
    if (!utility) {
      return res.status(404).json({ error: "Utility not found" });
    }

    if (utility.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../', utility.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Utility.findByIdAndDelete(id);

    return res.json({ message: "Utility deleted successfully" });
  } catch (error) {
    console.error("Delete utility error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const initializeUtilities: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || !isPrivileged(req.user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }


    const existingUtilities = await Utility.countDocuments();
    
    if (existingUtilities > 0) {
      return res.status(200).json({ message: "Utilities already initialized" });
    }
    const defaultUtilities = [
      {
        name: "User Manual",
        fileUrl: "/files/user-manual.pdf",
        type: "manual",
        isPublic: true
      },
      {
        name: "Company Registration Form",
        fileUrl: "/files/company-registration.pdf",
        type: "form",
        isPublic: true
      },
      {
        name: "Frequently Asked Questions",
        fileUrl: "/files/faq.pdf",
        type: "faq",
        isPublic: true
      }
    ];

    await Utility.insertMany(defaultUtilities);

    return res.status(201).json({ message: "Utilities initialized successfully" });
  } catch (error) {
    console.error("Initialize utilities error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};


export const downloadUtility: CustomRequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    const utility = await Utility.findById(id);
    
    if (!utility) {
      return res.status(404).json({ error: "Utility not found" });
    }

   
    if (utility.isPublic) {
      return res.json({ fileUrl: utility.fileUrl });
    }
    
 
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    return res.json({ fileUrl: utility.fileUrl });
  } catch (error) {
    console.error("Download utility error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
