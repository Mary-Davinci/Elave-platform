import express from "express";
import { getCompanies, createCompany, updateCompany, deleteCompany, getCompanyById , uploadCompaniesFromExcel } from "../controllers/companyController";
import { authMiddleware } from "../middleware/authMiddleware";
import { userRoleMiddleware } from "../middleware/roleMiddleware";

const router = express.Router();

// Company routes - all users can manage companies
router.get("/", authMiddleware, getCompanies);
router.get("/:id", authMiddleware, getCompanyById);
router.post("/", authMiddleware, userRoleMiddleware, createCompany);
router.put("/:id", authMiddleware, userRoleMiddleware, updateCompany);
router.delete("/:id", authMiddleware, userRoleMiddleware, deleteCompany);
router.post("/upload", authMiddleware, userRoleMiddleware, uploadCompaniesFromExcel);

export default router;


