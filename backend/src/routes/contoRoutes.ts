import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminRoleMiddleware } from "../middleware/roleMiddleware";
import { createCompetenzaTransactions, getContoSummary, getContoTransactions, previewContoFromExcel, uploadContoFromExcel, getContoImports } from "../controllers/contoController";

const router = Router();

router.get("/transactions", authMiddleware, getContoTransactions);
router.get("/summary", authMiddleware, getContoSummary);
router.get("/imports", authMiddleware, getContoImports);
router.post("/preview", authMiddleware, adminRoleMiddleware, previewContoFromExcel);
router.post("/upload", authMiddleware, adminRoleMiddleware, uploadContoFromExcel);
router.post("/transactions", authMiddleware, adminRoleMiddleware, createCompetenzaTransactions);

export default router;
