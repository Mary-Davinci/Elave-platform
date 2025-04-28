"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/dashboardRoutes.ts
const express_1 = __importDefault(require("express"));
const dashboardController_1 = require("../controllers/dashboardController");
const authMiddleware_1 = require("../middleware/authMiddleware");
// Fix the case sensitivity in the import path
const profileController_1 = require("../controllers/profileController"); // Changed from "profileController" to "profileController"
const router = express_1.default.Router();
// Dashboard routes with auth middleware - directly using controller functions
router.get("/stats", authMiddleware_1.authMiddleware, dashboardController_1.getDashboardStats);
router.post("/initialize", authMiddleware_1.authMiddleware, dashboardController_1.initializeUserDashboard);
// Add profile route - fixing the type issue
router.get("/profile", authMiddleware_1.authMiddleware, (req, res) => {
    (0, profileController_1.getProfileData)(req, res);
});
exports.default = router;
//# sourceMappingURL=dashboardRoutes.js.map