// src/routes/dashboardRoutes.ts
import express from "express";
import { getDashboardStats, initializeUserDashboard } from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Dashboard routes with auth middleware - directly using controller functions
router.get("/stats", authMiddleware, getDashboardStats);
router.post("/initialize", authMiddleware, initializeUserDashboard);

export default router;