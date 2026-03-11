import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminRoleMiddleware } from "../middleware/roleMiddleware";
import {
  getContoServiziSummary,
  getContoServiziTransactions,
  getContoServiziNonRiconciliate,
  getContoServiziBreakdown,
  getContoServiziImports,
  deleteContoServiziImport,
  previewContoServiziFromExcel,
  uploadContoServiziFromExcel,
  createServiziInvoiceRequest,
  uploadServiziInvoiceAttachment,
  getServiziInvoiceAttachmentUrl,
} from "../controllers/contoServiziController";

const router = Router();

router.get("/transactions", authMiddleware, getContoServiziTransactions);
router.get("/summary", authMiddleware, getContoServiziSummary);
router.get("/breakdown", authMiddleware, getContoServiziBreakdown);
router.get("/non-riconciliate", authMiddleware, getContoServiziNonRiconciliate);
router.get("/imports", authMiddleware, getContoServiziImports);
router.delete("/imports/:fileHash", authMiddleware, adminRoleMiddleware, deleteContoServiziImport);
router.post("/preview", authMiddleware, adminRoleMiddleware, previewContoServiziFromExcel);
router.post("/upload", authMiddleware, adminRoleMiddleware, uploadContoServiziFromExcel);
router.post("/invoice-request", authMiddleware, uploadServiziInvoiceAttachment, createServiziInvoiceRequest);
router.get("/invoice-request/:id/attachment-url", authMiddleware, getServiziInvoiceAttachmentUrl);

export default router;
