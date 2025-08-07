// src/routes/supplierRoutes.ts
import express from "express";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierById } from "../controllers/supplierController";
import { authMiddleware } from "../middleware/authMiddleware";
import { segnalaториRoleMiddleware,  } from "../middleware/roleMiddleware";

const router = express.Router();

// Supplier routes - all users can manage suppliers
router.get("/", authMiddleware, getSuppliers);
router.get("/:id", authMiddleware, getSupplierById);
router.post("/", authMiddleware, segnalaториRoleMiddleware, createSupplier);
router.put("/:id", authMiddleware, segnalaториRoleMiddleware, updateSupplier);
router.delete("/:id", authMiddleware, segnalaториRoleMiddleware , deleteSupplier);

export default router;