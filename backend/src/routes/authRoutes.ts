import express from "express";
import { register, login } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";
import { getCurrentUser } from "../controllers/authController";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authMiddleware, getCurrentUser);
export default router;