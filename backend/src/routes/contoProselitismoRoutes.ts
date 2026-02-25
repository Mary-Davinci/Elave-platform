import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminRoleMiddleware } from "../middleware/roleMiddleware";
import {
  getContoProselitismoSummary,
  getContoProselitismoTransactions,
  getContoProselitismoNonRiconciliate,
  getContoProselitismoBreakdown,
  getContoProselitismoImports,
  previewContoProselitismoFromExcel,
  uploadContoProselitismoFromExcel,
  exportContoProselitismoXlsx,
  exportContoProselitismoMonthlyCompanyXlsx,
} from "../controllers/contoProselitismoController";

const router = Router();

router.get("/transactions", authMiddleware, getContoProselitismoTransactions);
router.get("/summary", authMiddleware, getContoProselitismoSummary);
router.get("/breakdown", authMiddleware, getContoProselitismoBreakdown);
router.get("/non-riconciliate", authMiddleware, getContoProselitismoNonRiconciliate);
router.get("/imports", authMiddleware, getContoProselitismoImports);
router.get("/export", authMiddleware, exportContoProselitismoXlsx);
router.get("/export-monthly", authMiddleware, exportContoProselitismoMonthlyCompanyXlsx);
router.post("/preview", authMiddleware, adminRoleMiddleware, previewContoProselitismoFromExcel);
router.post("/upload", authMiddleware, adminRoleMiddleware, uploadContoProselitismoFromExcel);

export default router;
