import { Request, Response } from "express";
import mongoose from "mongoose";
import { CustomRequestHandler } from "../types/express";
import Project from "../models/Project";


interface IProjectTemplate {
  _id: mongoose.Types.ObjectId;
  code: string;
  title: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  hours: number;
  category: string;
  subcategory: string;
  type: string;
  isPublic: boolean;
  createdBy: mongoose.Types.ObjectId;
}


const projectTemplateSchema = new mongoose.Schema<IProjectTemplate>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    minPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    maxPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    hours: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    subcategory: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      default: "",
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

projectTemplateSchema.index({ code: 1 });
projectTemplateSchema.index({ category: 1 });
projectTemplateSchema.index({ subcategory: 1 });
projectTemplateSchema.index({ type: 1 });
projectTemplateSchema.index({ isPublic: 1 });


const ProjectTemplate = mongoose.model<IProjectTemplate>("ProjectTemplate", projectTemplateSchema);


export const getProjectTemplates: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    let query: any = {};
    
    // Regular users can only see public templates or ones specific to them
    if (req.user.role !== 'admin') {
      query.$or = [{ isPublic: true }, { createdBy: req.user._id }];
    }

    const templates = await ProjectTemplate.find(query).sort({ code: 1 });

    return res.json(templates);
  } catch (error: any) {
    console.error("Get project templates error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getProjectTemplateById: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    
    const template = await ProjectTemplate.findById(id);
    
    if (!template) {
      return res.status(404).json({ error: "Project template not found" });
    }

    if (req.user.role !== 'admin' && 
        !template.isPublic && 
        !template.createdBy.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(template);
  } catch (error: any) {
    console.error("Get project template error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createProjectTemplate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Only administrators can create project templates" });
    }

    const { 
      code, 
      title, 
      description, 
      minPrice, 
      maxPrice, 
      hours,
      category,
      subcategory,
      type,
      isPublic
    } = req.body;

    if (!code || !title || !minPrice || !maxPrice) {
      return res.status(400).json({ error: "Code, title, min price, and max price are required" });
    }

    const newTemplate = new ProjectTemplate({
      code,
      title,
      description: description || '',
      minPrice,
      maxPrice,
      hours: hours || 0,
      category: category || '',
      subcategory: subcategory || '',
      type: type || '',
      isPublic: isPublic !== undefined ? isPublic : true,
      createdBy: req.user._id
    });

    await newTemplate.save();

    return res.status(201).json(newTemplate);
  } catch (error: any) {
    console.error("Create project template error:", error);
    
    
    if (error.code === 11000 && error.keyPattern && error.keyPattern.code) {
      return res.status(400).json({ error: "Template code already exists" });
    }
    
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateProjectTemplate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Only administrators can update project templates" });
    }

    const { id } = req.params;
    const { 
      code, 
      title, 
      description, 
      minPrice, 
      maxPrice, 
      hours,
      category,
      subcategory,
      type,
      isPublic
    } = req.body;

    const template = await ProjectTemplate.findById(id);
    
    if (!template) {
      return res.status(404).json({ error: "Project template not found" });
    }

    // Update fields
    if (code) template.code = code;
    if (title) template.title = title;
    if (description !== undefined) template.description = description;
    if (minPrice !== undefined) template.minPrice = minPrice;
    if (maxPrice !== undefined) template.maxPrice = maxPrice;
    if (hours !== undefined) template.hours = hours;
    if (category !== undefined) template.category = category;
    if (subcategory !== undefined) template.subcategory = subcategory;
    if (type !== undefined) template.type = type;
    if (isPublic !== undefined) template.isPublic = isPublic;

    await template.save();

    return res.json(template);
  } catch (error: any) {
    console.error("Update project template error:", error);
    
    if (error.code === 11000 && error.keyPattern && error.keyPattern.code) {
      return res.status(400).json({ error: "Template code already exists" });
    }
    
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteProjectTemplate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Only administrators can delete project templates" });
    }

    const { id } = req.params;

    const template = await ProjectTemplate.findById(id);
    
    if (!template) {
      return res.status(404).json({ error: "Project template not found" });
    }
    
    await template.deleteOne();

    return res.json({ message: "Project template deleted successfully" });
  } catch (error: any) {
    console.error("Delete project template error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};


export const createProjectsFromTemplates: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { templates, company } = req.body;

    
    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({ error: "At least one template selection is required" });
    }

    if (!company) {
      return res.status(400).json({ error: "Company ID is required" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const projects = [];

      for (const selection of templates) {
        const { projectId, quantity } = selection;
        
        if (!projectId || !quantity || quantity <= 0) {
          continue;
        }

        const template = await ProjectTemplate.findById(projectId);
        
        if (!template) {
          continue;
        }

        if (req.user.role !== 'admin' && 
            !template.isPublic && 
            !template.createdBy.equals(req.user._id)) {
          continue;
        }

        for (let i = 0; i < quantity; i++) {
          const newProject = new Project({
            title: template.title,
            description: template.description,
            company,
            status: 'requested',
            budget: template.minPrice,
            hours: template.hours,
            templateCode: template.code,
            user: req.user._id
          });

          await newProject.save({ session });
          projects.push(newProject);
        }
      }

      const DashboardStats = require("../models/Dashboard").default;
      if (projects.length > 0) {
        await DashboardStats.findOneAndUpdate(
          { user: req.user._id },
          { $inc: { projectsRequested: projects.length } },
          { new: true, upsert: true, session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json(projects);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: any) {
    console.error("Create projects from templates error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};