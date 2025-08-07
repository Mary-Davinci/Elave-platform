"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sportelloLavoroController_1 = require("../controllers/sportelloLavoroController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// Test route
router.get('/test', (req, res) => {
    res.json({
        message: 'Sportello Lavoro router is working!',
        timestamp: new Date().toISOString()
    });
});
// Upload route MUST come before /:id route to avoid conflicts
router.post('/upload', authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, sportelloLavoroController_1.uploadSportelloLavoroFromExcel);
// All users can view sportello lavoro (with data filtering)
router.get('/', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, sportelloLavoroController_1.getSportelloLavoro);
router.get('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, sportelloLavoroController_1.getSportelloLavoroById);
// Only Responsabile Territoriale and above can create/modify sportello lavoro
router.post('/', authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, sportelloLavoroController_1.createSportelloLavoro);
router.put('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, sportelloLavoroController_1.updateSportelloLavoro);
router.delete('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, sportelloLavoroController_1.deleteSportelloLavoro);
exports.default = router;
//# sourceMappingURL=sportelloRouter.js.map