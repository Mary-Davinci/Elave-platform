"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/supplierRoutes.ts
const express_1 = __importDefault(require("express"));
const supplierController_1 = require("../controllers/supplierController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// Supplier routes - all users can manage suppliers
router.get("/", authMiddleware_1.authMiddleware, supplierController_1.getSuppliers);
router.get("/:id", authMiddleware_1.authMiddleware, supplierController_1.getSupplierById);
router.post("/", authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, supplierController_1.createSupplier);
router.put("/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, supplierController_1.updateSupplier);
router.delete("/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, supplierController_1.deleteSupplier);
exports.default = router;
//# sourceMappingURL=supplierRoutes.js.map