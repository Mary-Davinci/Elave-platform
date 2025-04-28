"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const messageController_1 = require("../controllers/messageController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Logging middleware for debugging
const routeLogger = (req, res, next) => {
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
router.use(authMiddleware_1.authMiddleware);
// GET routes with explicit path logging
router.get('/', (req, res, next) => {
    console.log('Messages route hit with status:', req.query.status);
    next();
}, messageController_1.getMessages);
router.get('/stats', (req, res, next) => {
    console.log('Message stats route hit');
    next();
}, messageController_1.getMessageStats);
router.get('/search', messageController_1.searchMessages);
router.get('/:id', messageController_1.getMessageById);
router.get('/:messageId/attachments/:attachmentId', messageController_1.downloadAttachment);
// POST routes
router.post('/', messageController_1.upload.array('attachments', 5), messageController_1.sendMessage);
router.post('/drafts', messageController_1.upload.array('attachments', 5), messageController_1.saveDraft);
// PUT routes
router.put('/drafts/:id', messageController_1.upload.array('attachments', 5), messageController_1.saveDraft);
router.put('/:id/read', messageController_1.markReadStatus);
router.put('/:id/trash', messageController_1.moveToTrash);
// DELETE routes
router.delete('/:id', messageController_1.deleteMessage);
// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Message Route Error:', err);
    res.status(500).json({
        message: 'An error occurred in message routes',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});
exports.default = router;
//# sourceMappingURL=messageRoutes.js.map