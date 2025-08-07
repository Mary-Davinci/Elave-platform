"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const procacciatoreController_1 = require("../controllers/procacciatoreController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// Test route
router.get('/test', (req, res) => {
    res.json({
        message: 'Procacciatori router is working!',
        timestamp: new Date().toISOString()
    });
});
// Upload route MUST come before /:id route to avoid conflicts
router.post('/upload', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, procacciatoreController_1.uploadProcacciatoriFromExcel);
// Get all procacciatori
router.get('/', authMiddleware_1.authMiddleware, procacciatoreController_1.getProcacciatori);
// Get single procacciatore by ID
router.get('/:id', authMiddleware_1.authMiddleware, procacciatoreController_1.getProcacciatoreById);
// Create new procacciatore
router.post('/', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, procacciatoreController_1.createProcacciatore);
// Update existing procacciatore by ID
router.put('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, procacciatoreController_1.updateProcacciatore);
// Delete procacciatore by ID
router.delete('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, procacciatoreController_1.deleteProcacciatore);
exports.default = router;
//# sourceMappingURL=procacciatoreRoutes.js.map