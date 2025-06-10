"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const utilityController_1 = require("../controllers/utilityController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const utilityController_2 = require("../controllers/utilityController");
const router = express_1.default.Router();
// Public/authenticated routes (order matters - more specific routes first)
router.get("/", authMiddleware_1.authMiddleware, utilityController_1.getUtilities); // GET all utilities
router.get("/:id/download", authMiddleware_1.authMiddleware, utilityController_1.downloadUtility); // Download utility
// Admin-only routes (protected)
router.post("/upload", authMiddleware_1.authMiddleware, authMiddleware_1.adminMiddleware, utilityController_2.uploadMiddleware, utilityController_2.uploadUtility); // Upload file
router.post("/", authMiddleware_1.authMiddleware, authMiddleware_1.adminMiddleware, utilityController_1.addUtility); // Add utility manually
router.post("/initialize", authMiddleware_1.authMiddleware, authMiddleware_1.adminMiddleware, utilityController_1.initializeUtilities); // Initialize default utilities
router.delete("/:id", authMiddleware_1.authMiddleware, authMiddleware_1.adminMiddleware, utilityController_2.deleteUtility); // Delete utility
exports.default = router;
//# sourceMappingURL=utilityRoutes.js.map