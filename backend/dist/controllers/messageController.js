"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadAttachment = exports.getMessageStats = exports.searchMessages = exports.markReadStatus = exports.deleteMessage = exports.moveToTrash = exports.saveDraft = exports.sendMessage = exports.getMessageById = exports.getMessages = exports.upload = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const util_1 = require("util");
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, "../uploads/attachments");
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});
// Configure email transport
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASSWORD || 'password'
    }
});
// Get all messages for the authenticated user based on status
const getMessages = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { status = 'inbox' } = req.query;
        const validStatuses = ['inbox', 'sent', 'draft', 'trash'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status parameter" });
        }
        let query = {};
        // Different queries based on status
        if (status === 'inbox' || status === 'trash') {
            query = {
                recipients: req.user._id,
                status: status
            };
        }
        else if (status === 'sent') {
            query = {
                sender: req.user._id,
                status: 'sent'
            };
        }
        else if (status === 'draft') {
            query = {
                sender: req.user._id,
                status: 'draft'
            };
        }
        const messages = await Message_1.default.find(query)
            .populate('sender', 'username email firstName lastName')
            .populate('recipients', 'username email firstName lastName')
            .sort({ createdAt: -1 });
        return res.json(messages);
    }
    catch (error) {
        console.error("Get messages error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getMessages = getMessages;
const getMessageById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid message ID" });
        }
        const message = await Message_1.default.findById(id)
            .populate('sender', 'username email firstName lastName')
            .populate('recipients', 'username email firstName lastName');
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }
        const isRecipient = message.recipients.some(recipient => recipient._id.toString() === req.user._id.toString());
        const isSender = message.sender._id.toString() === req.user._id.toString();
        if (!isRecipient && !isSender) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Mark as read if it's an incoming message and recipient is viewing it
        if (isRecipient && !message.read && message.status === 'inbox') {
            message.read = true;
            await message.save();
        }
        return res.json(message);
    }
    catch (error) {
        console.error("Get message error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getMessageById = getMessageById;
// Send a new message
const sendMessage = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { recipients, subject, body, sendEmail = true } = req.body;
        // Validate required fields
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: "At least one recipient is required" });
        }
        if (!subject) {
            return res.status(400).json({ error: "Subject is required" });
        }
        if (!body) {
            return res.status(400).json({ error: "Message body is required" });
        }
        let recipientUsers = [];
        try {
            recipientUsers = await User_1.default.find({
                _id: { $in: recipients }
            }).select('_id email firstName lastName');
        }
        catch (err) {
            return res.status(400).json({ error: "Invalid recipient IDs" });
        }
        if (recipientUsers.length === 0) {
            return res.status(400).json({ error: "No valid recipients found" });
        }
        // Process attachments if present
        const attachments = [];
        const multerReq = req;
        if (multerReq.files && Array.isArray(multerReq.files)) {
            multerReq.files.forEach((file) => {
                attachments.push({
                    filename: file.originalname,
                    path: file.path,
                    contentType: file.mimetype,
                    size: file.size
                });
            });
        }
        // Create new message
        const newMessage = new Message_1.default({
            sender: req.user._id,
            recipients: recipientUsers.map(user => user._id),
            subject,
            body,
            attachments,
            read: false,
            status: 'sent'
        });
        await newMessage.save();
        //  save a copy in each recipient's inbox
        for (const recipient of recipientUsers) {
            const inboxCopy = new Message_1.default({
                sender: req.user._id,
                recipients: [recipient._id],
                subject,
                body,
                attachments,
                read: false,
                status: 'inbox'
            });
            await inboxCopy.save();
            // Send email notification if enabled
            if (sendEmail) {
                try {
                    await transporter.sendMail({
                        from: `"${req.user.firstName} ${req.user.lastName}" <${process.env.SMTP_USER}>`,
                        to: recipient.email,
                        subject: subject,
                        text: body,
                        html: `<div>${body}</div>`,
                        attachments: attachments.map(attachment => ({
                            filename: attachment.filename,
                            path: attachment.path
                        }))
                    });
                }
                catch (emailError) {
                    console.error("Email sending error:", emailError);
                }
            }
        }
        // Return the sent message
        const populatedMessage = await Message_1.default.findById(newMessage._id)
            .populate('sender', 'username email firstName lastName')
            .populate('recipients', 'username email firstName lastName');
        return res.status(201).json(populatedMessage);
    }
    catch (error) {
        console.error("Send message error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.sendMessage = sendMessage;
const saveDraft = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { recipients, subject, body } = req.body;
        const { id } = req.params;
        const attachments = [];
        const multerReq = req;
        if (multerReq.files && Array.isArray(multerReq.files)) {
            multerReq.files.forEach((file) => {
                attachments.push({
                    filename: file.originalname,
                    path: file.path,
                    contentType: file.mimetype,
                    size: file.size
                });
            });
        }
        let draft;
        if (id && mongoose_1.default.Types.ObjectId.isValid(id)) {
            draft = await Message_1.default.findOne({
                _id: id,
                sender: req.user._id,
                status: 'draft'
            });
            if (!draft) {
                return res.status(404).json({ error: "Draft not found" });
            }
            if (recipients && Array.isArray(recipients)) {
                draft.recipients = recipients;
            }
            if (subject !== undefined) {
                draft.subject = subject;
            }
            if (body !== undefined) {
                draft.body = body;
            }
            if (attachments.length > 0) {
                while (draft.attachments.length > 0) {
                    draft.attachments.pop();
                }
                for (const attachment of attachments) {
                    draft.attachments.push(attachment);
                }
            }
            await draft.save();
        }
        else {
            draft = new Message_1.default({
                sender: req.user._id,
                recipients: recipients || [],
                subject: subject || '',
                body: body || '',
                attachments,
                read: true,
                status: 'draft'
            });
            await draft.save();
        }
        // Return the draft
        const populatedDraft = await Message_1.default.findById(draft._id)
            .populate('sender', 'username email firstName lastName')
            .populate('recipients', 'username email firstName lastName');
        return res.status(200).json(populatedDraft);
    }
    catch (error) {
        console.error("Save draft error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.saveDraft = saveDraft;
// Move message to trash
const moveToTrash = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid message ID" });
        }
        const message = await Message_1.default.findById(id);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }
        // Check if user has access to this message
        const isRecipient = message.recipients.some(recipient => recipient.toString() === req.user._id.toString());
        const isSender = message.sender.toString() === req.user._id.toString();
        if (!isRecipient && !isSender) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Move to trash
        message.status = 'trash';
        await message.save();
        return res.json({ message: "Message moved to trash" });
    }
    catch (error) {
        console.error("Move to trash error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.moveToTrash = moveToTrash;
// Delete message permanently
const deleteMessage = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        // Validate MongoDB ID
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid message ID" });
        }
        const message = await Message_1.default.findById(id);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }
        // Check if user has access to this message
        const isRecipient = message.recipients.some(recipient => recipient.toString() === req.user._id.toString());
        const isSender = message.sender.toString() === req.user._id.toString();
        if (!isRecipient && !isSender) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Delete message and attachments
        const unlinkAsync = (0, util_1.promisify)(fs_1.default.unlink);
        // Delete attachment files
        for (const attachment of message.attachments) {
            try {
                await unlinkAsync(attachment.path);
            }
            catch (err) {
                console.error(`Failed to delete attachment: ${attachment.path}`, err);
                // Continue even if file deletion fails
            }
        }
        await message.deleteOne();
        return res.json({ message: "Message deleted successfully" });
    }
    catch (error) {
        console.error("Delete message error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteMessage = deleteMessage;
// Mark message as read/unread
const markReadStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const { read } = req.body;
        if (read === undefined) {
            return res.status(400).json({ error: "Read status is required" });
        }
        // Validate MongoDB ID
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid message ID" });
        }
        const message = await Message_1.default.findById(id);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }
        // Check if user is a recipient
        const isRecipient = message.recipients.some(recipient => recipient.toString() === req.user._id.toString());
        if (!isRecipient) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Update read status
        message.read = read;
        await message.save();
        return res.json({ message: `Message marked as ${read ? 'read' : 'unread'}` });
    }
    catch (error) {
        console.error("Mark read status error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.markReadStatus = markReadStatus;
// Search messages
const searchMessages = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { query, status = 'all' } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: "Search query is required" });
        }
        // Prepare base query conditions
        let conditions = {
            $or: [
                { subject: { $regex: query, $options: 'i' } },
                { body: { $regex: query, $options: 'i' } }
            ]
        };
        // Filter by status if not 'all'
        if (status !== 'all') {
            conditions.status = status;
        }
        // User must be either sender or recipient
        conditions.$or.push({ sender: req.user._id }, { recipients: req.user._id });
        const messages = await Message_1.default.find(conditions)
            .populate('sender', 'username email firstName lastName')
            .populate('recipients', 'username email firstName lastName')
            .sort({ createdAt: -1 });
        return res.json(messages);
    }
    catch (error) {
        console.error("Search messages error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.searchMessages = searchMessages;
// Get message count statistics
const getMessageStats = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const unreadCount = await Message_1.default.countDocuments({
            recipients: req.user._id,
            status: 'inbox',
            read: false
        });
        const inboxCount = await Message_1.default.countDocuments({
            recipients: req.user._id,
            status: 'inbox'
        });
        const sentCount = await Message_1.default.countDocuments({
            sender: req.user._id,
            status: 'sent'
        });
        const draftCount = await Message_1.default.countDocuments({
            sender: req.user._id,
            status: 'draft'
        });
        const trashCount = await Message_1.default.countDocuments({
            $or: [
                { sender: req.user._id },
                { recipients: req.user._id }
            ],
            status: 'trash'
        });
        return res.json({
            unread: unreadCount,
            inbox: inboxCount,
            sent: sentCount,
            draft: draftCount,
            trash: trashCount
        });
    }
    catch (error) {
        console.error("Get message stats error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getMessageStats = getMessageStats;
const downloadAttachment = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { messageId, attachmentId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: "Invalid message ID" });
        }
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }
        const isRecipient = message.recipients.some(recipient => recipient.toString() === req.user._id.toString());
        const isSender = message.sender.toString() === req.user._id.toString();
        if (!isRecipient && !isSender) {
            return res.status(403).json({ error: "Access denied" });
        }
        const attachment = message.attachments.id(attachmentId);
        if (!attachment) {
            return res.status(404).json({ error: "Attachment not found" });
        }
        if (!fs_1.default.existsSync(attachment.path)) {
            return res.status(404).json({ error: "Attachment file not found" });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
        res.setHeader('Content-Type', attachment.contentType);
        const fileStream = fs_1.default.createReadStream(attachment.path);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error("Download attachment error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.downloadAttachment = downloadAttachment;
//# sourceMappingURL=messageController.js.map