// src/routes/userRoutes.ts
import express from "express";
import { 
  getUsers, 
  getManagedUsers, 
  createUser, 
  getUserById, 
  updateUser, 
  deleteUser, 
  changePassword 
} from "../controllers/userController";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Apply auth middleware to all user routes
router.use(authMiddleware);

// User management routes
router.get("/", getManagedUsers);
router.get("/admin", adminMiddleware, getUsers);

// User CRUD operations
router.post("/", adminMiddleware, createUser);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", adminMiddleware, deleteUser);
router.post("/:id/change-password", changePassword);


export default router;