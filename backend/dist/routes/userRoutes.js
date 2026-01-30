"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/userRoutes.ts
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// All routes require authentication
router.use(authMiddleware_1.authMiddleware);
// Get all users - Admin and above
router.get("/", roleMiddleware_1.adminRoleMiddleware, userController_1.getUsers);
// Get minimal list of responsabili territoriali (active) - Admin and above
router.get("/responsabili/minimal", roleMiddleware_1.adminRoleMiddleware, userController_1.getResponsabiliMinimal);
// NEW: Get pending approval users - Admin and above only
router.get("/pending", roleMiddleware_1.adminRoleMiddleware, userController_1.getPendingUsers);
// NEW: Approve a pending user - Admin and above only
router.post("/:id/approve", roleMiddleware_1.adminRoleMiddleware, userController_1.approveUser);
// NEW: Reject a pending user - Admin and above only
router.post("/:id/reject", roleMiddleware_1.adminRoleMiddleware, userController_1.rejectUser);
// Get managed users - All authenticated users
router.get("/managed", userController_1.getManagedUsers);
// Search users
router.get("/search", userController_1.searchUsers);
// Get single user - Admin and above
router.get("/:id", roleMiddleware_1.adminRoleMiddleware, userController_1.getUserById);
// UPDATED: Create new user - Now allows responsabile_territoriale and above
router.post("/", roleMiddleware_1.responsabileTerritorialeMiddleware, userController_1.createUser);
// Update user - Admin and above
router.put("/:id", roleMiddleware_1.adminRoleMiddleware, userController_1.updateUser);
// Change password
router.put("/:id/password", userController_1.changePassword);
// Delete user - Super Admin only
router.delete("/:id", roleMiddleware_1.superAdminRoleMiddleware, userController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map
