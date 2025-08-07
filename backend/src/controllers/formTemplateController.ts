import { Request, Response } from "express";
import { CustomRequestHandler } from "../types/express";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import FormTemplate from "../models/FormTemplet";
import { IUser } from "../models/User";

interface AuthenticatedRequest extends Request {
  user: IUser;
}

const templateStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../uploads/templates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const { type, category } = req.body;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const categoryPrefix = category ? `${category}_` : '';
    cb(null, `${categoryPrefix}${type}_template_${timestamp}${ext}`);
  }
});

const templateUpload = multer({
  storage: templateStorage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const validExtensions = /\.pdf$|\.doc$|\.docx$/i;
    const hasValidExtension = validExtensions.test(path.extname(file.originalname).toLowerCase());
    
    if (hasValidExtension) {
      return cb(null, true);
    } else {
      return cb(new Error('Only PDF, DOC, DOCX files are allowed for templates!'));
    }
  }
}).single('template');

export const getFormTemplates: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const templates = await FormTemplate.find().sort({ createdAt: -1 });
    return res.json(templates);
  } catch (err: any) {
    console.error("Get form templates error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getFormTemplatesByCategory: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { category } = req.params;

    if (!category || !['agenti', 'segnalatore'].includes(category)) {
      return res.status(400).json({ error: "Invalid category. Must be 'agenti' or 'segnalatore'" });
    }

    const templates = await FormTemplate.find({ category }).sort({ createdAt: -1 });
    return res.json(templates);
  } catch (err: any) {
    console.error("Get form templates by category error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const uploadFormTemplate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const authenticatedReq = req as AuthenticatedRequest;

    if (!['admin', 'super_admin'].includes(authenticatedReq.user.role)) {
      return res.status(403).json({ error: "Only admins can upload form templates" });
    }

    templateUpload(req, res, async (err) => {
      if (err) {
        console.error("Template upload error:", err);
        return res.status(400).json({ error: err.message });
      }

      const { type, category } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      let validTypes: string[] = [];
      if (category === 'agenti') {
        validTypes = ['contract', 'legal'];
      } else if (category === 'segnalatore') {
        validTypes = ['contract', 'id'];
      } else {
        validTypes = ['contract', 'legal'];
      }

      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ 
          error: `Invalid template type. Must be one of: ${validTypes.join(', ')}` 
        });
      }

      try {
        const query = category ? { type, category } : { type };
        const existingTemplate = await FormTemplate.findOne(query);
        
        if (existingTemplate) {
          if (fs.existsSync(existingTemplate.filePath)) {
            fs.unlinkSync(existingTemplate.filePath);
          }
          await FormTemplate.deleteOne(query);
        }
        let templateName = '';
        if (category === 'segnalatore') {
          templateName = type === 'contract' ? 'Modulo Contratto Segnalatore' : 'Modulo Documento Identità';
        } else {
          templateName = type === 'contract' ? 'Modulo Contratto Agenti' : 'Modulo Documento Legale';
        }
        const newTemplate = new FormTemplate({
          name: templateName,
          type,
          category: category || 'agenti',
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy: authenticatedReq.user._id
        });

        await newTemplate.save();

        return res.status(201).json({
          message: "Template uploaded successfully",
          template: newTemplate
        });
      } catch (saveError: any) {
        console.error("Save template error:", saveError);
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(500).json({ error: "Error saving template" });
      }
    });
  } catch (err: any) {
    console.error("Upload template error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const downloadFormTemplate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { type } = req.params;

    if (!type || !['contract', 'legal'].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }

    const template = await FormTemplate.findOne({ 
      type, 
      $or: [{ category: { $exists: false } }, { category: 'agenti' }] 
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (!fs.existsSync(template.filePath)) {
      return res.status(404).json({ error: "Template file not found on server" });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${template.originalName}"`);
    res.setHeader('Content-Type', template.mimetype);

    const fileStream = fs.createReadStream(template.filePath);
    fileStream.pipe(res);
  } catch (err: any) {
    console.error("Download template error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const downloadFormTemplateByCategory: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { category, type } = req.params;

    if (!category || !['agenti', 'segnalatore'].includes(category)) {
      return res.status(400).json({ error: "Invalid category. Must be 'agenti' or 'segnalatore'" });
    }

    let validTypes: string[] = [];
    if (category === 'agenti') {
      validTypes = ['contract', 'legal'];
    } else if (category === 'segnalatore') {
      validTypes = ['contract', 'id'];
    }

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid template type for ${category}. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    const template = await FormTemplate.findOne({ type, category });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (!fs.existsSync(template.filePath)) {
      return res.status(404).json({ error: "Template file not found on server" });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${template.originalName}"`);
    res.setHeader('Content-Type', template.mimetype);

    const fileStream = fs.createReadStream(template.filePath);
    fileStream.pipe(res);
  } catch (err: any) {
    console.error("Download template by category error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteFormTemplate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const authenticatedReq = req as AuthenticatedRequest;

    if (!['admin', 'super_admin'].includes(authenticatedReq.user.role)) {
      return res.status(403).json({ error: "Only admins can delete form templates" });
    }

    const { type } = req.params;

    const template = await FormTemplate.findOne({ type });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (fs.existsSync(template.filePath)) {
      fs.unlinkSync(template.filePath);
    }

    await FormTemplate.deleteOne({ type });

    return res.json({ message: "Template deleted successfully" });
  } catch (err: any) {
    console.error("Delete template error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};