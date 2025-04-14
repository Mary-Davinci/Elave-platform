// src/controllers/utilityController.ts
import { Request, Response } from "express";
import Utility from "../models/Utilities";
import { CustomRequestHandler } from "../types/express";

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

// Add a new utility (admin only)
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
        type: "other",
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