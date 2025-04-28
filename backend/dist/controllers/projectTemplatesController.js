"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectsFromTemplates = exports.deleteProjectTemplate = exports.updateProjectTemplate = exports.createProjectTemplate = exports.getProjectTemplateById = exports.getProjectTemplates = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Project_1 = __importDefault(require("../models/Project"));
// Create the ProjectTemplate model schema
const projectTemplateSchema = new mongoose_1.default.Schema({
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
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});
// Add indexes for faster queries
projectTemplateSchema.index({ code: 1 });
projectTemplateSchema.index({ category: 1 });
projectTemplateSchema.index({ subcategory: 1 });
projectTemplateSchema.index({ type: 1 });
projectTemplateSchema.index({ isPublic: 1 });
// Create the ProjectTemplate model
const ProjectTemplate = mongoose_1.default.model("ProjectTemplate", projectTemplateSchema);
/**
 * Get all project templates
 * Admin sees all templates, regular users see only public templates
 */
const getProjectTemplates = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Base query
        let query = {};
        // Regular users can only see public templates or ones specific to them
        if (req.user.role !== 'admin') {
            query.$or = [{ isPublic: true }, { createdBy: req.user._id }];
        }
        const templates = await ProjectTemplate.find(query).sort({ code: 1 });
        return res.json(templates);
    }
    catch (error) {
        console.error("Get project templates error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getProjectTemplates = getProjectTemplates;
/**
 * Get a single project template by ID
 */
const getProjectTemplateById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const template = await ProjectTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ error: "Project template not found" });
        }
        // Regular users can only access public templates or ones they created
        if (req.user.role !== 'admin' &&
            !template.isPublic &&
            !template.createdBy.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        return res.json(template);
    }
    catch (error) {
        console.error("Get project template error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getProjectTemplateById = getProjectTemplateById;
/**
 * Create a new project template (admin only)
 */
const createProjectTemplate = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admins can create project templates
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only administrators can create project templates" });
        }
        const { code, title, description, minPrice, maxPrice, hours, category, subcategory, type, isPublic } = req.body;
        // Validate required fields
        if (!code || !title || !minPrice || !maxPrice) {
            return res.status(400).json({ error: "Code, title, min price, and max price are required" });
        }
        // Create the new project template
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
    }
    catch (error) {
        console.error("Create project template error:", error);
        // Handle duplicate code error
        if (error.code === 11000 && error.keyPattern && error.keyPattern.code) {
            return res.status(400).json({ error: "Template code already exists" });
        }
        return res.status(500).json({ error: "Server error" });
    }
};
exports.createProjectTemplate = createProjectTemplate;
/**
 * Update a project template (admin only)
 */
const updateProjectTemplate = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admins can update project templates
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only administrators can update project templates" });
        }
        const { id } = req.params;
        const { code, title, description, minPrice, maxPrice, hours, category, subcategory, type, isPublic } = req.body;
        const template = await ProjectTemplate.findById(id);
        if (!template) {
            return res.status(404).json({ error: "Project template not found" });
        }
        // Update fields
        if (code)
            template.code = code;
        if (title)
            template.title = title;
        if (description !== undefined)
            template.description = description;
        if (minPrice !== undefined)
            template.minPrice = minPrice;
        if (maxPrice !== undefined)
            template.maxPrice = maxPrice;
        if (hours !== undefined)
            template.hours = hours;
        if (category !== undefined)
            template.category = category;
        if (subcategory !== undefined)
            template.subcategory = subcategory;
        if (type !== undefined)
            template.type = type;
        if (isPublic !== undefined)
            template.isPublic = isPublic;
        await template.save();
        return res.json(template);
    }
    catch (error) {
        console.error("Update project template error:", error);
        // Handle duplicate code error
        if (error.code === 11000 && error.keyPattern && error.keyPattern.code) {
            return res.status(400).json({ error: "Template code already exists" });
        }
        return res.status(500).json({ error: "Server error" });
    }
};
exports.updateProjectTemplate = updateProjectTemplate;
/**
 * Delete a project template (admin only)
 */
const deleteProjectTemplate = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admins can delete project templates
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
    }
    catch (error) {
        console.error("Delete project template error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteProjectTemplate = deleteProjectTemplate;
/**
 * Create projects from selected templates
 * This allows users to create multiple projects at once based on templates
 */
const createProjectsFromTemplates = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { templates, company } = req.body;
        // Validate input
        if (!templates || !Array.isArray(templates) || templates.length === 0) {
            return res.status(400).json({ error: "At least one template selection is required" });
        }
        if (!company) {
            return res.status(400).json({ error: "Company ID is required" });
        }
        // Start a transaction
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const projects = [];
            // Process each selected template
            for (const selection of templates) {
                const { projectId, quantity } = selection;
                if (!projectId || !quantity || quantity <= 0) {
                    continue;
                }
                // Find the template
                const template = await ProjectTemplate.findById(projectId);
                if (!template) {
                    continue;
                }
                // Check if user can access this template
                if (req.user.role !== 'admin' &&
                    !template.isPublic &&
                    !template.createdBy.equals(req.user._id)) {
                    continue;
                }
                // Create projects for the quantity requested
                for (let i = 0; i < quantity; i++) {
                    const newProject = new Project_1.default({
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
            // Update dashboard stats for the new projects
            const DashboardStats = require("../models/Dashboard").default;
            if (projects.length > 0) {
                await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { projectsRequested: projects.length } }, { new: true, upsert: true, session });
            }
            // Commit the transaction
            await session.commitTransaction();
            session.endSession();
            return res.status(201).json(projects);
        }
        catch (error) {
            // Abort the transaction on error
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
    catch (error) {
        console.error("Create projects from templates error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.createProjectsFromTemplates = createProjectsFromTemplates;
//# sourceMappingURL=projectTemplatesController.js.map