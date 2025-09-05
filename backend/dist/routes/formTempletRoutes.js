"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const formTemplateController_1 = require("../controllers/formTemplateController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.authMiddleware);
router.get("/", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.getFormTemplates);
router.get("/:category", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.getFormTemplatesByCategory);
router.post("/", roleMiddleware_1.adminRoleMiddleware, formTemplateController_1.uploadFormTemplate);
router.get("/download/:type", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.downloadFormTemplate);
router.get("/download/:category/:type", roleMiddleware_1.segnalaториRoleMiddleware, formTemplateController_1.downloadFormTemplateByCategory);
router.delete("/:type", roleMiddleware_1.adminRoleMiddleware, formTemplateController_1.deleteFormTemplate);
exports.default = router;
//# sourceMappingURL=formTempletRoutes.js.map