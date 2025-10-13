"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/form-templates.ts
const express_1 = __importDefault(require("express"));
const formTemplateController_1 = require("../controllers/formTemplateController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.authMiddleware);
/* Download FIRST to avoid capture by '/:category' */
router.get("/download/:type", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.downloadFormTemplate);
router.get("/download/:category/:type", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.downloadFormTemplateByCategory);
/* Listing */
router.get("/", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.getFormTemplates);
router.get("/category/:category", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.getFormTemplatesByCategory);
/* Back-compat: allow old '/:category' like '/sportello-lavoro' */
router.get("/:category", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.getFormTemplatesByCategory);
/* Mutations */
router.post("/", roleMiddleware_1.adminRoleMiddleware, formTemplateController_1.uploadFormTemplate);
router.delete("/:type", roleMiddleware_1.adminRoleMiddleware, formTemplateController_1.deleteFormTemplate);
exports.default = router;
//# sourceMappingURL=formTempletRoutes.js.map