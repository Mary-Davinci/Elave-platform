import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminRoleMiddleware } from "../middleware/roleMiddleware";
import {
  getContoServiziSummary,
  getContoServiziTransactions,
  getContoServiziNonRiconciliate,
  getContoServiziBreakdown,
  getContoServiziImports,
  previewContoServiziFromExcel,
  uploadContoServiziFromExcel,
  createServiziInvoiceRequest,
} from "../controllers/contoServiziController";

const router = Router();

router.get("/transactions", authMiddleware, getContoServiziTransactions);
router.get("/summary", authMiddleware, getContoServiziSummary);
router.get("/breakdown", authMiddleware, getContoServiziBreakdown);
router.get("/non-riconciliate", authMiddleware, getContoServiziNonRiconciliate);
router.get("/imports", authMiddleware, getContoServiziImports);
router.post("/preview", authMiddleware, adminRoleMiddleware, previewContoServiziFromExcel);
router.post("/upload", authMiddleware, adminRoleMiddleware, uploadContoServiziFromExcel);
router.post("/invoice-request", authMiddleware, createServiziInvoiceRequest);

export default router;
