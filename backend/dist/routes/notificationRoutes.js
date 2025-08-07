"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/notificationRoutes.ts - Complete notification routes
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authMiddleware);
// Apply admin role middleware (only admin and super_admin can access notifications)
router.use(roleMiddleware_1.adminRoleMiddleware);
// Get all notifications for current user
router.get('/', notificationController_1.getNotifications);
// Get unread notification count
router.get('/count', notificationController_1.getUnreadCount);
// Mark specific notification as read
router.post('/:id/read', notificationController_1.markNotificationAsRead);
// Mark all notifications as read for current user
router.post('/mark-all-read', notificationController_1.markAllNotificationsAsRead);
// Delete specific notification
router.delete('/:id', notificationController_1.deleteNotification);
exports.default = router;
//# sourceMappingURL=notificationRoutes.js.map