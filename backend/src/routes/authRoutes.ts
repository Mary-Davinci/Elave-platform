import express from "express";
import { register, login } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";
import { getCurrentUser } from "../controllers/authController";

const router = express.Router();

// Since the controller functions are now properly typed as RequestHandler,
// we can use them directly without any wrapper functions
router.post("/register", register);
router.post("/login", login);

router.get("/me", authMiddleware, getCurrentUser);
export default router;