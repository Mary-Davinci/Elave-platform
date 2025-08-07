// src/routes/userRoutes.ts
import express from "express";
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  changePassword,
  searchUsers,
  getManagedUsers,
  getPendingUsers,
  approveUser,
  rejectUser
} from "../controllers/userController";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminRoleMiddleware, superAdminRoleMiddleware, responsabileTerritorialeMiddleware } from "../middleware/roleMiddleware";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all users - Admin and above
router.get("/", adminRoleMiddleware, getUsers);

// NEW: Get pending approval users - Admin and above only
router.get("/pending", adminRoleMiddleware, getPendingUsers);

// NEW: Approve a pending user - Admin and above only
router.post("/:id/approve", adminRoleMiddleware, approveUser);

// NEW: Reject a pending user - Admin and above only
router.post("/:id/reject", adminRoleMiddleware, rejectUser);

// Get managed users - All authenticated users
router.get("/managed", getManagedUsers);

// Search users
router.get("/search", searchUsers);

// Get single user - Admin and above
router.get("/:id", adminRoleMiddleware, getUserById);

// UPDATED: Create new user - Now allows responsabile_territoriale and above
router.post("/", responsabileTerritorialeMiddleware, createUser);

// Update user - Admin and above
router.put("/:id", adminRoleMiddleware, updateUser);

// Change password
router.put("/:id/password", changePassword);

// Delete user - Super Admin only
router.delete("/:id", superAdminRoleMiddleware, deleteUser);

export default router;