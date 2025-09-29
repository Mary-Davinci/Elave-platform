"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/agenti.ts
const express_1 = __importDefault(require("express"));
const agentiController_1 = require("../controllers/agentiController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
router.get("/list-minimal", authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, agentiController_1.getAgentiMinimal);
// Existing routes
router.get("/", authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, agentiController_1.getAgenti);
router.get("/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, agentiController_1.getAgenteById);
router.post("/", authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, agentiController_1.createAgente);
router.put("/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, agentiController_1.updateAgente);
router.delete("/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, agentiController_1.deleteAgente);
router.post("/upload", authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, agentiController_1.uploadAgentiFromExcel);
exports.default = router;
//# sourceMappingURL=agentiRouters.js.map