// src/controllers/projectController.ts
import { Request, Response } from "express";
import Project from "../models/Project";
import { CustomRequestHandler } from "../types/express";

// Get all projects for the authenticated user
export const getProjects: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Filter by status if provided
    const { status } = req.query;
    
    // Base query
    let query: any = {};
    
    // Regular users can only see their own projects
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .populate('company', 'name');

    return res.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get a single project by ID
export const getProjectById: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    
    const project = await Project.findById(id)
      .populate('company', 'name');
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Regular users can only access their own projects
    if (req.user.role !== 'admin' && !project.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(project);
  } catch (error) {
    console.error("Get project error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Create a new project
export const createProject: CustomRequestHandler = async (req, res) => {
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
    const newProject = new Project({
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
      await DashboardStats.findOneAndUpdate(
        { user: req.user._id },
        { $inc: { [statusField]: 1 } },
        { new: true, upsert: true }
      );
    }

    return res.status(201).json(newProject);
  } catch (error) {
    console.error("Create project error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Update a project
export const updateProject: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const { title, description, company, status, startDate, endDate, budget } = req.body;

    const project = await Project.findById(id);
    
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
    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (company) project.company = company;
    if (status) project.status = status;
    if (startDate !== undefined) project.startDate = startDate;
    if (endDate !== undefined) project.endDate = endDate;
    if (budget !== undefined) project.budget = budget;

    await project.save();

    // If status changed, update dashboard stats
    if (status && status !== oldStatus) {
      const DashboardStats = require("../models/Dashboard").default;
      const oldStatusField = getStatusField(oldStatus);
      const newStatusField = getStatusField(status);
      
      if (oldStatusField && newStatusField) {
        await DashboardStats.findOneAndUpdate(
          { user: req.user._id },
          { 
            $inc: { 
              [oldStatusField]: -1,
              [newStatusField]: 1
            } 
          },
          { new: true }
        );
      }
    }

    return res.json(project);
  } catch (error) {
    console.error("Update project error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Delete a project
export const deleteProject: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    const project = await Project.findById(id);
    
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
      await DashboardStats.findOneAndUpdate(
        { user: req.user._id },
        { $inc: { [statusField]: -1 } },
        { new: true }
      );
    }

    return res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
// Add this to src/controllers/projectController.ts:

/**
 * Get a single project by ID.
 * @param req - Express request object containing user and params with project ID.
 * @param res - Express response object used to send the response.
 * @returns A JSON response with the project details or an error message.
 */

// Helper function to map status to dashboard field
function getStatusField(status: string): string | null {
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