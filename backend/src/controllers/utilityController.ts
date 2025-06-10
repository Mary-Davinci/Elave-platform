// src/controllers/utilityController.ts
import { Request, Response } from "express";
import Utility from "../models/Utilities";
import { CustomRequestHandler } from "../types/express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/utilities');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
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
    // Allow specific file types
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

// Middleware for single file upload
export const uploadMiddleware = upload.single('file');

// Helper function to determine file type based on extension or MIME type
const getFileType = (file: Express.Multer.File, providedType?: string): string => {
  // If type is explicitly provided and valid, use it
  const validTypes = ['form', 'faq', 'manual', 'document', 'spreadsheet', 'other'];
  if (providedType && validTypes.includes(providedType)) {
    return providedType;
  }

  // Otherwise, determine based on file extension or MIME type
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  // Map file types to categories
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

  return 'other'; // Default fallback
};

// Get all utilities
export const getUtilities: CustomRequestHandler = async (req, res) => {
  try {
    // Everyone can view utilities
    const utilities = await Utility.find().sort({ name: 1 });
    return res.json(utilities);
  } catch (error) {
    console.error("Get utilities error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Upload a new utility file (admin only)
export const uploadUtility: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { name, type, isPublic, category } = req.body;

    // Use original filename if name not provided
    const utilityName = name || req.file.originalname;

    // Generate file URL (adjust based on your server setup)
    const fileUrl = `/uploads/utilities/${req.file.filename}`;

    // Determine the correct type using helper function
    const utilityType = getFileType(req.file, type);

    // Create the new utility
    const newUtility = new Utility({
      name: utilityName,
      fileUrl: fileUrl,
      type: utilityType,
      isPublic: isPublic !== 'false', // default to true unless explicitly false.
      category: category || 'uncategorized', // optional fallback

    });

    await newUtility.save();

    return res.status(201).json(newUtility);
  } catch (error) {
    console.error("Upload utility error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Add a new utility (admin only) - for manual entry
export const addUtility: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { name, fileUrl, type, isPublic } = req.body;

    // Validate required fields
    if (!name || !fileUrl || !type) {
      return res.status(400).json({ error: "Name, file URL, and type are required" });
    }

    // Validate type is in allowed enum values
    const validTypes = ['form', 'faq', 'manual', 'document', 'spreadsheet', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Create the new utility
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

// Delete a utility (admin only)
export const deleteUtility: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    
    const utility = await Utility.findById(id);
    
    if (!utility) {
      return res.status(404).json({ error: "Utility not found" });
    }

    // Delete the file from filesystem if it exists
    if (utility.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../', utility.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await Utility.findByIdAndDelete(id);

    return res.json({ message: "Utility deleted successfully" });
  } catch (error) {
    console.error("Delete utility error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Initialize default utilities (admin only)
export const initializeUtilities: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if utilities already exist
    const existingUtilities = await Utility.countDocuments();
    
    if (existingUtilities > 0) {
      return res.status(200).json({ message: "Utilities already initialized" });
    }

    // Create sample utilities
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

// Download a utility
export const downloadUtility: CustomRequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    const utility = await Utility.findById(id);
    
    if (!utility) {
      return res.status(404).json({ error: "Utility not found" });
    }

    // For public utilities, anyone can download
    if (utility.isPublic) {
      return res.json({ fileUrl: utility.fileUrl });
    }
    
    // For non-public utilities, check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    return res.json({ fileUrl: utility.fileUrl });
  } catch (error) {
    console.error("Download utility error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};