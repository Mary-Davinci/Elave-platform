import express from "express";
import { getCompanies, createCompany, updateCompany, deleteCompany, getCompanyById, uploadCompaniesFromExcel } from "../controllers/companyController";
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

router.post("/", authMiddleware, sportelloLavoroRoleMiddleware, createCompany);
router.put("/:id", authMiddleware, sportelloLavoroRoleMiddleware, updateCompany);
router.delete("/:id", authMiddleware, sportelloLavoroRoleMiddleware, deleteCompany);
router.post("/upload", authMiddleware, sportelloLavoroRoleMiddleware, uploadCompaniesFromExcel);

export default router;
