import express from 'express';
import {
  getMessages,
  getMessageById,
  sendMessage,
  saveDraft,
  moveToTrash,
  deleteMessage,
  markReadStatus,
  searchMessages,
  getMessageStats,
  downloadAttachment,
  upload
} from '../controllers/messageController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Logging middleware for debugging
const routeLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('===== Message Route Called =====');
  console.log(`Path: ${req.path}`);
  console.log(`Method: ${req.method}`);
  console.log(`Full URL: ${req.originalUrl}`);
  console.log('Query params:', req.query);
  console.log('Request body:', req.body);
  console.log('===============================');
  next();
};

// Apply logging middleware to all routes
router.use(routeLogger);

// Apply auth middleware to all message routes
router.use(authMiddleware);

// GET routes with explicit path logging
router.get('/', (req, res, next) => {
  console.log('Messages route hit with status:', req.query.status);
  next();
}, getMessages);

router.get('/stats', (req, res, next) => {
  console.log('Message stats route hit');
  next();
}, getMessageStats);

router.get('/search', searchMessages);
router.get('/:id', getMessageById);
router.get('/:messageId/attachments/:attachmentId', downloadAttachment);

// POST routes
router.post('/', upload.array('attachments', 5), sendMessage);
router.post('/drafts', upload.array('attachments', 5), saveDraft);

// PUT routes
router.put('/drafts/:id', upload.array('attachments', 5), saveDraft);
router.put('/:id/read', markReadStatus);
router.put('/:id/trash', moveToTrash);

// DELETE routes
router.delete('/:id', deleteMessage);

// Error handling middleware
router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Message Route Error:', err);
  res.status(500).json({ 
    message: 'An error occurred in message routes', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error' 
  });
});

export default router;