"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const segnalatoreController_1 = require("../controllers/segnalatoreController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
router.get('/test', (req, res) => {
    res.json({
        message: 'Segnalatori router is working!',
        timestamp: new Date().toISOString()
    });
});
router.post('/upload', authMiddleware_1.authMiddleware, roleMiddleware_1.sportelloLavoroRoleMiddleware, segnalatoreController_1.uploadSegnalatoriFromExcel);
router.get('/', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, segnalatoreController_1.getSegnalatori);
router.get('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.segnalaториRoleMiddleware, segnalatoreController_1.getSegnalatoreById);
router.post('/', authMiddleware_1.authMiddleware, roleMiddleware_1.sportelloLavoroRoleMiddleware, segnalatoreController_1.createSegnalatore);
router.put('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.sportelloLavoroRoleMiddleware, segnalatoreController_1.updateSegnalatore);
router.delete('/:id', authMiddleware_1.authMiddleware, roleMiddleware_1.sportelloLavoroRoleMiddleware, segnalatoreController_1.deleteSegnalatore);
exports.default = router;
//# sourceMappingURL=segnalatoreRoutes.js.map