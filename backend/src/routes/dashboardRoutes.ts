// src/routes/dashboardRoutes.ts
import express from "express";
import { getDashboardStats, initializeUserDashboard } from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";
// Fix the case sensitivity in the import path
import { getProfileData } from "../controllers/profilecontroller"; // Changed from "profileController" to "profileController"

const router = express.Router();

// Dashboard routes with auth middleware - directly using controller functions
router.get("/stats", authMiddleware, getDashboardStats);
router.post("/initialize", authMiddleware, initializeUserDashboard);

// Add profile route - fixing the type issue
router.get("/profile", authMiddleware, (req, res) => {
  getProfileData(req, res);
});

export default router;