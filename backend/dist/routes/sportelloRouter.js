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
router.get('/test', (req, res) => {
    res.json({
        message: 'Sportello Lavoro router is working!',
        timestamp: new Date().toISOString()
    });
});
router.post('/upload', authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, sportelloLavoroController_1.uploadSportelloLavoroFromExcel);
router.get('/', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, sportelloLavoroController_1.getSportelloLavoro);
router.get('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, sportelloLavoroController_1.getSportelloLavoroById);
router.post('/', authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, sportelloLavoroController_1.createSportelloLavoro);
router.put('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, sportelloLavoroController_1.updateSportelloLavoro);
router.delete('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.responsabileTerritorialeMiddleware, sportelloLavoroController_1.deleteSportelloLavoro);
exports.default = router;
//# sourceMappingURL=sportelloRouter.js.map