"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const approvalController_1 = require("../controllers/approvalController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// All routes require authentication and admin role
router.use(authMiddleware_1.authMiddleware);
router.use(roleMiddleware_1.adminRoleMiddleware);
// Get all pending items
router.get('/pending', approvalController_1.getPendingItems);
// Approve items
router.post('/approve/company/:id', approvalController_1.approveCompany);
router.post('/approve/sportello/:id', approvalController_1.approveSportelloLavoro);
router.post('/approve/agente/:id', approvalController_1.approveAgente);
router.post('/approve/user/:id', approvalController_1.approveUser);
// Reject items
router.post('/reject/:type/:id', approvalController_1.rejectItem);
exports.default = router;
//# sourceMappingURL=approvalRoutes.js.map