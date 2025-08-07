// src/routes/notificationRoutes.ts - Complete notification routes
import express from 'express';
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteNotification 
} from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminRoleMiddleware } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(authMiddleware);

router.use(adminRoleMiddleware);

router.get('/', getNotifications);

router.get('/count', getUnreadCount);

router.post('/:id/read', markNotificationAsRead);

router.post('/mark-all-read', markAllNotificationsAsRead);


router.delete('/:id', deleteNotification);

export default router;