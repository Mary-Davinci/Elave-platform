import express from "express";
import { getUtilities, addUtility, initializeUtilities, downloadUtility } from "../controllers/utilityController";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware";
import { viewUtilitiesOnlyMiddleware } from "../middleware/roleMiddleware";
import { uploadMiddleware, uploadUtility, deleteUtility } from "../controllers/utilityController";

const router = express.Router();


router.get("/", authMiddleware, getUtilities); 
router.get("/:id/download", authMiddleware, downloadUtility);

// Admin-only routes (protected)
router.post("/upload", authMiddleware, adminMiddleware, uploadMiddleware, uploadUtility);
router.post("/", authMiddleware, adminMiddleware, addUtility); 
router.post("/initialize", authMiddleware, adminMiddleware, initializeUtilities); 
router.delete("/:id", authMiddleware, adminMiddleware, deleteUtility);

export default router;