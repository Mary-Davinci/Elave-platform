"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/userRoutes.ts
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const editpassword_1 = require("../controllers/editpassword");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Apply auth middleware to all user routes
router.use(authMiddleware_1.authMiddleware);
// User management routes
router.get("/", userController_1.getManagedUsers);
router.get("/admin", authMiddleware_1.adminMiddleware, userController_1.getUsers);
// User CRUD operations
router.post("/", authMiddleware_1.adminMiddleware, userController_1.createUser);
router.get("/:id", userController_1.getUserById);
router.put("/:id", userController_1.updateUser);
router.delete("/:id", authMiddleware_1.adminMiddleware, userController_1.deleteUser);
router.post('/change-password', editpassword_1.changePassword);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map