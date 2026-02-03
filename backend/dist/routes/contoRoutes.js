"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const contoController_1 = require("../controllers/contoController");
const router = (0, express_1.Router)();
router.get("/transactions", authMiddleware_1.authMiddleware, contoController_1.getContoTransactions);
router.get("/summary", authMiddleware_1.authMiddleware, contoController_1.getContoSummary);
router.post("/preview", authMiddleware_1.authMiddleware, roleMiddleware_1.adminRoleMiddleware, contoController_1.previewContoFromExcel);
router.post("/upload", authMiddleware_1.authMiddleware, roleMiddleware_1.adminRoleMiddleware, contoController_1.uploadContoFromExcel);
router.post("/transactions", authMiddleware_1.authMiddleware, roleMiddleware_1.adminRoleMiddleware, contoController_1.createCompetenzaTransactions);
exports.default = router;
//# sourceMappingURL=contoRoutes.js.map
