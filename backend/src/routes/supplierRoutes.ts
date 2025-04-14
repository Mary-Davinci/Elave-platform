// src/routes/supplierRoutes.ts
import express from "express";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierById } from "../controllers/supplierController";
import { authMiddleware } from "../middleware/authMiddleware";
import { userRoleMiddleware } from "../middleware/roleMiddleware";

const router = express.Router();

// Supplier routes - all users can manage suppliers
router.get("/", authMiddleware, getSuppliers);
router.get("/:id", authMiddleware, getSupplierById);
router.post("/", authMiddleware, userRoleMiddleware, createSupplier);
router.put("/:id", authMiddleware, userRoleMiddleware, updateSupplier);
router.delete("/:id", authMiddleware, userRoleMiddleware, deleteSupplier);

export default router;