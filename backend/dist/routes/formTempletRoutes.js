"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/formTemplateRoutes.ts
const express_1 = __importDefault(require("express"));
const formTemplateController_1 = require("../controllers/formTemplateController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authMiddleware);
// Get all form templates (accessible to all authenticated users)
router.get("/", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.getFormTemplates);
// NEW: Get form templates by category (accessible to all authenticated users)
router.get("/:category", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.getFormTemplatesByCategory);
// Upload form template (admin only)
router.post("/", roleMiddleware_1.adminRoleMiddleware, formTemplateController_1.uploadFormTemplate);
// Download form template - original route for backward compatibility (accessible to all authenticated users)
router.get("/download/:type", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.downloadFormTemplate);
// NEW: Download form template by category and type (accessible to all authenticated users)
router.get("/download/:category/:type", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.downloadFormTemplateByCategory);
// Delete form template (admin only)
router.delete("/:type", roleMiddleware_1.adminRoleMiddleware, formTemplateController_1.deleteFormTemplate);
exports.default = router;
//# sourceMappingURL=formTempletRoutes.js.map