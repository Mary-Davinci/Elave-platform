
import express from "express";
import { getDashboardStats } from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

import { getProfileData } from "../controllers/profileController"; 

const router = express.Router();


router.get("/stats", authMiddleware, getDashboardStats);
;


router.get("/profile", authMiddleware, (req, res) => {
  getProfileData(req, res);
});

export default router;