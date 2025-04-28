"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadUtility = exports.initializeUtilities = exports.addUtility = exports.getUtilities = void 0;
const Utilities_1 = __importDefault(require("../models/Utilities"));
// Get all utilities
const getUtilities = async (req, res) => {
    try {
        // Everyone can view utilities
        const utilities = await Utilities_1.default.find().sort({ name: 1 });
        return res.json(utilities);
    }
    catch (error) {
        console.error("Get utilities error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getUtilities = getUtilities;
// Add a new utility (admin only)
const addUtility = async (req, res) => {
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
        const newUtility = new Utilities_1.default({
            name,
            fileUrl,
            type,
            isPublic: isPublic !== undefined ? isPublic : true
        });
        await newUtility.save();
        return res.status(201).json(newUtility);
    }
    catch (error) {
        console.error("Add utility error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.addUtility = addUtility;
// Initialize default utilities (admin only)
const initializeUtilities = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        // Check if utilities already exist
        const existingUtilities = await Utilities_1.default.countDocuments();
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
        await Utilities_1.default.insertMany(defaultUtilities);
        return res.status(201).json({ message: "Utilities initialized successfully" });
    }
    catch (error) {
        console.error("Initialize utilities error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.initializeUtilities = initializeUtilities;
// Download a utility
const downloadUtility = async (req, res) => {
    try {
        const { id } = req.params;
        const utility = await Utilities_1.default.findById(id);
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
    }
    catch (error) {
        console.error("Download utility error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.downloadUtility = downloadUtility;
//# sourceMappingURL=utilityController.js.map