import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminRoleMiddleware } from "../middleware/roleMiddleware";
import { createCompetenzaTransactions, getContoSummary, getContoTransactions } from "../controllers/contoController";

const router = Router();

router.get("/transactions", authMiddleware, getContoTransactions);
router.get("/summary", authMiddleware, getContoSummary);
router.post("/transactions", authMiddleware, adminRoleMiddleware, createCompetenzaTransactions);

export default router;
