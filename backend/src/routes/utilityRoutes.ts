import express from "express";
import { getUtilities, addUtility, initializeUtilities, downloadUtility } from "../controllers/utilityController";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware";
import { viewUtilitiesOnlyMiddleware } from "../middleware/roleMiddleware";

const router = express.Router();

// Public route for getting utilities (viewable by everyone)
router.get("/", authMiddleware, getUtilities);

// Allow downloading but not modifying for regular users
router.get("/:id/download", authMiddleware, downloadUtility);

// Protected routes with middleware - only admin can add/modify utilities
router.post("/", authMiddleware, adminMiddleware, addUtility);
router.post("/initialize", authMiddleware, adminMiddleware, initializeUtilities);

export default router;