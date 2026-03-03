import express from "express";
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyById,
  uploadCompaniesFromExcel,
  companyDocumentsUploadMiddleware,
  exportCompaniesXlsx,
  getNextNumeroAnagrafica,
  getCompanyDocumentPreviewUrl,
} from "../controllers/companyController";
import { authMiddleware } from "../middleware/authMiddleware";
import * as roleMiddleware from "../middleware/roleMiddleware";

const router = express.Router();
const sportelloLavoroRoleMiddleware = (roleMiddleware as any).sportelloLavoroRoleMiddleware;
const segnalatoriRoleMiddleware =
  (Object.entries(roleMiddleware as any).find(([key]) =>
    key.toLowerCase().includes("segnala") && key.toLowerCase().includes("rolemiddleware")
  )?.[1] as any) || ((_: any, __: any, next: any) => next());

router.get("/__ping", authMiddleware, (_req, res) => {
  res.status(200).json({ ok: true, route: "companies" });
});

router.get(
  "/numero-anagrafica/next",
  authMiddleware,
  sportelloLavoroRoleMiddleware,
  getNextNumeroAnagrafica
);

router.get("/", authMiddleware, segnalatoriRoleMiddleware, getCompanies);
router.get("/export", authMiddleware, segnalatoriRoleMiddleware, exportCompaniesXlsx);
router.get(
  "/:id/documents/:documentKey/url",
  authMiddleware,
  segnalatoriRoleMiddleware,
  getCompanyDocumentPreviewUrl
);
router.get("/:id", authMiddleware, segnalatoriRoleMiddleware, getCompanyById);

router.post(
  "/",
  authMiddleware,
  sportelloLavoroRoleMiddleware,
  companyDocumentsUploadMiddleware,
  createCompany
);
router.put(
  "/:id",
  authMiddleware,
  sportelloLavoroRoleMiddleware,
  companyDocumentsUploadMiddleware,
  updateCompany
);
router.delete("/:id", authMiddleware, sportelloLavoroRoleMiddleware, deleteCompany);
router.post("/upload", authMiddleware, sportelloLavoroRoleMiddleware, uploadCompaniesFromExcel);

export default router;
