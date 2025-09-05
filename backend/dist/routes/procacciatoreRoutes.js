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
router.post('/upload', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, procacciatoreController_1.uploadProcacciatoriFromExcel);
router.get('/', authMiddleware_1.authMiddleware, procacciatoreController_1.getProcacciatori);
router.get('/:id', authMiddleware_1.authMiddleware, procacciatoreController_1.getProcacciatoreById);
router.post('/', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, procacciatoreController_1.createProcacciatore);
router.put('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, procacciatoreController_1.updateProcacciatore);
router.delete('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, procacciatoreController_1.deleteProcacciatore);
exports.default = router;
//# sourceMappingURL=procacciatoreRoutes.js.map