"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const utilityController_1 = require("../controllers/utilityController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public route for getting utilities (viewable by everyone)
router.get("/", authMiddleware_1.authMiddleware, utilityController_1.getUtilities);
// Allow downloading but not modifying for regular users
router.get("/:id/download", authMiddleware_1.authMiddleware, utilityController_1.downloadUtility);
// Protected routes with middleware - only admin can add/modify utilities
router.post("/", authMiddleware_1.authMiddleware, authMiddleware_1.adminMiddleware, utilityController_1.addUtility);
router.post("/initialize", authMiddleware_1.authMiddleware, authMiddleware_1.adminMiddleware, utilityController_1.initializeUtilities);
exports.default = router;
//# sourceMappingURL=utilityRoutes.js.map