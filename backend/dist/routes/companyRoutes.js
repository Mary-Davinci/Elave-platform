"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const companyController_1 = require("../controllers/companyController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// Company routes - all users can manage companies
router.get("/", authMiddleware_1.authMiddleware, companyController_1.getCompanies);
router.get("/:id", authMiddleware_1.authMiddleware, companyController_1.getCompanyById);
router.post("/", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, companyController_1.createCompany);
router.put("/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, companyController_1.updateCompany);
router.delete("/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, companyController_1.deleteCompany);
router.post("/upload", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, companyController_1.uploadCompaniesFromExcel);
exports.default = router;
//# sourceMappingURL=companyRoutes.js.map