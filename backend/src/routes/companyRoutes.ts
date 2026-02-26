import express from "express";
import { getCompanies, createCompany, updateCompany, deleteCompany, getCompanyById, uploadCompaniesFromExcel, companyDocumentsUploadMiddleware } from "../controllers/companyController";
import { getNextNumeroAnagrafica } from "../controllers/companyController";
import { authMiddleware } from "../middleware/authMiddleware";
import { segnalaториRoleMiddleware, sportelloLavoroRoleMiddleware } from "../middleware/roleMiddleware";

const router = express.Router();

router.get("/__ping", authMiddleware, (_req, res) => {
  res.status(200).json({ ok: true, route: "companies" });
});

router.get("/numero-anagrafica/next", authMiddleware, sportelloLavoroRoleMiddleware, getNextNumeroAnagrafica);


router.get("/", authMiddleware, segnalaториRoleMiddleware, getCompanies);
router.get("/:id", authMiddleware, segnalaториRoleMiddleware, getCompanyById);

router.post("/", authMiddleware, sportelloLavoroRoleMiddleware, companyDocumentsUploadMiddleware, createCompany);
router.put("/:id", authMiddleware, sportelloLavoroRoleMiddleware, companyDocumentsUploadMiddleware, updateCompany);
router.delete("/:id", authMiddleware, sportelloLavoroRoleMiddleware, deleteCompany);
router.post("/upload", authMiddleware, sportelloLavoroRoleMiddleware, uploadCompaniesFromExcel);

export default router;
