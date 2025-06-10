"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/agenti.ts
const express_1 = __importDefault(require("express"));
const agentiController_1 = require("../controllers/agentiController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authMiddleware);
// GET /api/agenti - Get all agents
router.get('/', agentiController_1.getAgenti);
// GET /api/agenti/:id - Get single agent by ID
router.get('/:id', agentiController_1.getAgenteById);
// POST /api/agenti - Create new agent
router.post('/', agentiController_1.createAgente);
// PUT /api/agenti/:id - Update agent
router.put('/:id', agentiController_1.updateAgente);
// DELETE /api/agenti/:id - Delete agent
router.delete('/:id', agentiController_1.deleteAgente);
// POST /api/agenti/upload - Upload agents from Excel file
router.post('/upload', agentiController_1.uploadAgentiFromExcel);
exports.default = router;
//# sourceMappingURL=agentiRouters.js.map