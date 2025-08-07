
import express from "express";
import { getDashboardStats, initializeUserDashboard } from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

import { getProfileData } from "../controllers/profileController"; 

const router = express.Router();


router.get("/stats", authMiddleware, getDashboardStats);
router.post("/initialize", authMiddleware, initializeUserDashboard);


router.get("/profile", authMiddleware, (req, res) => {
  getProfileData(req, res);
});

export default router;