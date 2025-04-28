"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProject = exports.updateProject = exports.createProject = exports.getProjectById = exports.getProjects = void 0;
const Project_1 = __importDefault(require("../models/Project"));
// Get all projects for the authenticated user
const getProjects = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Filter by status if provided
        const { status } = req.query;
        // Base query
        let query = {};
        // Regular users can only see their own projects
        if (req.user.role !== 'admin') {
            query.user = req.user._id;
        }
        // Add status filter if provided
        if (status) {
            query.status = status;
        }
        const projects = await Project_1.default.find(query)
            .sort({ createdAt: -1 })
            .populate('company', 'name');
        return res.json(projects);
    }
    catch (error) {
        console.error("Get projects error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getProjects = getProjects;
// Get a single project by ID
const getProjectById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const project = await Project_1.default.findById(id)
            .populate('company', 'name');
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }
        // Regular users can only access their own projects
        if (req.user.role !== 'admin' && !project.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        return res.json(project);
    }
    catch (error) {
        console.error("Get project error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getProjectById = getProjectById;
// Create a new project
const createProject = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { title, description, company, status, startDate, endDate, budget } = req.body;
        // Validate required fields
        if (!title || !company) {
            return res.status(400).json({ error: "Project title and company are required" });
        }
        // Create the new project
        const newProject = new Project_1.default({
            title,
            description: description || '',
            company,
            status: status || 'requested',
            startDate: startDate || null,
            endDate: endDate || null,
            budget: budget || 0,
            user: req.user._id // Associate project with the current user
        });
        await newProject.save();
        // Update dashboard stats based on project status
        const DashboardStats = require("../models/Dashboard").default;
        const statusField = getStatusField(status || 'requested');
        if (statusField) {
            await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { [statusField]: 1 } }, { new: true, upsert: true });
        }
        return res.status(201).json(newProject);
    }
    catch (error) {
        console.error("Create project error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.createProject = createProject;
// Update a project
const updateProject = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const { title, description, company, status, startDate, endDate, budget } = req.body;
        const project = await Project_1.default.findById(id);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }
        // Regular users can only update their own projects
        if (req.user.role !== 'admin' && !project.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Store old status for dashboard update
        const oldStatus = project.status;
        // Update fields
        if (title)
            project.title = title;
        if (description !== undefined)
            project.description = description;
        if (company)
            project.company = company;
        if (status)
            project.status = status;
        if (startDate !== undefined)
            project.startDate = startDate;
        if (endDate !== undefined)
            project.endDate = endDate;
        if (budget !== undefined)
            project.budget = budget;
        await project.save();
        // If status changed, update dashboard stats
        if (status && status !== oldStatus) {
            const DashboardStats = require("../models/Dashboard").default;
            const oldStatusField = getStatusField(oldStatus);
            const newStatusField = getStatusField(status);
            if (oldStatusField && newStatusField) {
                await DashboardStats.findOneAndUpdate({ user: req.user._id }, {
                    $inc: {
                        [oldStatusField]: -1,
                        [newStatusField]: 1
                    }
                }, { new: true });
            }
        }
        return res.json(project);
    }
    catch (error) {
        console.error("Update project error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.updateProject = updateProject;
// Delete a project
const deleteProject = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const project = await Project_1.default.findById(id);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }
        // Regular users can only delete their own projects
        if (req.user.role !== 'admin' && !project.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Store status before deletion for dashboard update
        const status = project.status;
        await project.deleteOne();
        // Update dashboard stats
        const DashboardStats = require("../models/Dashboard").default;
        const statusField = getStatusField(status);
        if (statusField) {
            await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { [statusField]: -1 } }, { new: true });
        }
        return res.json({ message: "Project deleted successfully" });
    }
    catch (error) {
        console.error("Delete project error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteProject = deleteProject;
// Add this to src/controllers/projectController.ts:
/**
 * Get a single project by ID.
 * @param req - Express request object containing user and params with project ID.
 * @param res - Express response object used to send the response.
 * @returns A JSON response with the project details or an error message.
 */
// Helper function to map status to dashboard field
function getStatusField(status) {
    switch (status) {
        case 'requested':
            return 'projectsRequested';
        case 'inProgress':
            return 'projectsInProgress';
        case 'completed':
            return 'projectsCompleted';
        default:
            return null;
    }
}
//# sourceMappingURL=projectController.js.map