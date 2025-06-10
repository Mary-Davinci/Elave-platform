import express from "express";
import { getUtilities, addUtility, initializeUtilities, downloadUtility } from "../controllers/utilityController";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware";
import { viewUtilitiesOnlyMiddleware } from "../middleware/roleMiddleware";
import { uploadMiddleware, uploadUtility, deleteUtility } from "../controllers/utilityController";

const router = express.Router();

// Public/authenticated routes (order matters - more specific routes first)
router.get("/", authMiddleware, getUtilities); // GET all utilities
router.get("/:id/download", authMiddleware, downloadUtility); // Download utility

// Admin-only routes (protected)
router.post("/upload", authMiddleware, adminMiddleware, uploadMiddleware, uploadUtility); // Upload file
router.post("/", authMiddleware, adminMiddleware, addUtility); // Add utility manually
router.post("/initialize", authMiddleware, adminMiddleware, initializeUtilities); // Initialize default utilities
router.delete("/:id", authMiddleware, adminMiddleware, deleteUtility); // Delete utility

export default router;