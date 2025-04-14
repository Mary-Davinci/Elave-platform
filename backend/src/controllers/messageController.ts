// src/controllers/messageController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import Message, { IAttachment } from "../models/Message";
import User from "../models/User";
import { CustomRequestHandler } from "../types/express";
import path from "path";
import fs from "fs";
import multer from "multer";
import nodemailer from "nodemailer";
import { promisify } from "util";

// Define the Request with files property for TypeScript
interface MulterRequest extends Request {
  files: Express.Multer.File[];
}

// Configure file storage for attachments
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    const uploadDir = path.join(__dirname, "../uploads/attachments");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASSWORD || 'password'
  }
});

// Get all messages for the authenticated user based on status
export const getMessages: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { status = 'inbox' } = req.query;
    const validStatuses = ['inbox', 'sent', 'draft', 'trash'];
    
    if (!validStatuses.includes(status as string)) {
      return res.status(400).json({ error: "Invalid status parameter" });
    }

    let query: any = {};
    
    // Different queries based on status
    if (status === 'inbox' || status === 'trash') {
      query = { 
        recipients: req.user._id,
        status: status
      };
    } else if (status === 'sent') {
      query = { 
        sender: req.user._id,
        status: 'sent'
      };
    } else if (status === 'draft') {
      query = { 
        sender: req.user._id,
        status: 'draft'
      };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username email firstName lastName')
      .populate('recipients', 'username email firstName lastName')
      .sort({ createdAt: -1 });

    return res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get a single message by ID
export const getMessageById: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const message = await Message.findById(id)
      .populate('sender', 'username email firstName lastName')
      .populate('recipients', 'username email firstName lastName');

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user has access to this message
    const isRecipient = message.recipients.some(recipient => 
      recipient._id.toString() === req.user!._id.toString()
    );
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
  } catch (error) {
    console.error("Get message error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Send a new message
export const sendMessage: CustomRequestHandler = async (req, res) => {
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

    // Get recipient users
    let recipientUsers = [];
    try {
      recipientUsers = await User.find({ 
        _id: { $in: recipients } 
      }).select('_id email firstName lastName');
    } catch (err) {
      return res.status(400).json({ error: "Invalid recipient IDs" });
    }

    if (recipientUsers.length === 0) {
      return res.status(400).json({ error: "No valid recipients found" });
    }

    // Process attachments if present
    const attachments: IAttachment[] = [];
    const multerReq = req as unknown as MulterRequest;
    
    if (multerReq.files && Array.isArray(multerReq.files)) {
      multerReq.files.forEach((file: Express.Multer.File) => {
        attachments.push({
          filename: file.originalname,
          path: file.path,
          contentType: file.mimetype,
          size: file.size
        });
      });
    }

    // Create new message
    const newMessage = new Message({
      sender: req.user._id,
      recipients: recipientUsers.map(user => user._id),
      subject,
      body,
      attachments,
      read: false,
      status: 'sent'
    });

    await newMessage.save();

    // Also save a copy in each recipient's inbox
    for (const recipient of recipientUsers) {
      const inboxCopy = new Message({
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
        } catch (emailError) {
          console.error("Email sending error:", emailError);
          // Continue with the process even if email fails
        }
      }
    }

    // Return the sent message
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'username email firstName lastName')
      .populate('recipients', 'username email firstName lastName');

    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Save message as draft
// Save message as draft
export const saveDraft: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { recipients, subject, body } = req.body;
    const { id } = req.params; // Optional draft ID if updating existing draft

    // Process attachments if present
    const attachments: IAttachment[] = [];
    const multerReq = req as unknown as MulterRequest;
    
    if (multerReq.files && Array.isArray(multerReq.files)) {
      multerReq.files.forEach((file: Express.Multer.File) => {
        attachments.push({
          filename: file.originalname,
          path: file.path,
          contentType: file.mimetype,
          size: file.size
        });
      });
    }

    let draft;

    // Update existing draft or create new one
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      draft = await Message.findOne({ 
        _id: id, 
        sender: req.user._id,
        status: 'draft'
      });

      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }

      // Update draft fields
      if (recipients && Array.isArray(recipients)) {
        draft.recipients = recipients;
      }
      
      if (subject !== undefined) {
        draft.subject = subject;
      }
      
      if (body !== undefined) {
        draft.body = body;
      }
      
      // Fix: Handle attachments properly for Mongoose DocumentArray
      if (attachments.length > 0) {
        // Clear existing attachments
        while (draft.attachments.length > 0) {
          draft.attachments.pop();
        }
        
        // Add new attachments
        for (const attachment of attachments) {
          draft.attachments.push(attachment);
        }
      }

      await draft.save();
    } else {
      // Create new draft
      draft = new Message({
        sender: req.user._id,
        recipients: recipients || [],
        subject: subject || '',
        body: body || '',
        attachments, // This works for new documents because Mongoose handles initial assignment
        read: true, // Drafts are always read
        status: 'draft'
      });

      await draft.save();
    }

    // Return the draft
    const populatedDraft = await Message.findById(draft._id)
      .populate('sender', 'username email firstName lastName')
      .populate('recipients', 'username email firstName lastName');

    return res.status(200).json(populatedDraft);
  } catch (error) {
    console.error("Save draft error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Move message to trash
export const moveToTrash: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user has access to this message
    const isRecipient = message.recipients.some(recipient => 
      recipient.toString() === req.user!._id.toString()
    );
    const isSender = message.sender.toString() === req.user!._id.toString();

    if (!isRecipient && !isSender) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Move to trash
    message.status = 'trash';
    await message.save();

    return res.json({ message: "Message moved to trash" });
  } catch (error) {
    console.error("Move to trash error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Delete message permanently
export const deleteMessage: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user has access to this message
    const isRecipient = message.recipients.some(recipient => 
      recipient.toString() === req.user!._id.toString()
    );
    const isSender = message.sender.toString() === req.user!._id.toString();

    if (!isRecipient && !isSender) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete message and attachments
    const unlinkAsync = promisify(fs.unlink);
    
    // Delete attachment files
    for (const attachment of message.attachments) {
      try {
        await unlinkAsync(attachment.path);
      } catch (err) {
        console.error(`Failed to delete attachment: ${attachment.path}`, err);
        // Continue even if file deletion fails
      }
    }

    await message.deleteOne();

    return res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Delete message error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Mark message as read/unread
export const markReadStatus: CustomRequestHandler = async (req, res) => {
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is a recipient
    const isRecipient = message.recipients.some(recipient => 
      recipient.toString() === req.user!._id.toString()
    );

    if (!isRecipient) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update read status
    message.read = read;
    await message.save();

    return res.json({ message: `Message marked as ${read ? 'read' : 'unread'}` });
  } catch (error) {
    console.error("Mark read status error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Search messages
export const searchMessages: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { query, status = 'all' } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Prepare base query conditions
    let conditions: any = {
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
    conditions.$or.push(
      { sender: req.user._id },
      { recipients: req.user._id }
    );

    const messages = await Message.find(conditions)
      .populate('sender', 'username email firstName lastName')
      .populate('recipients', 'username email firstName lastName')
      .sort({ createdAt: -1 });

    return res.json(messages);
  } catch (error) {
    console.error("Search messages error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get message count statistics
export const getMessageStats: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Count unread inbox messages
    const unreadCount = await Message.countDocuments({
      recipients: req.user._id,
      status: 'inbox',
      read: false
    });

    // Count total inbox messages
    const inboxCount = await Message.countDocuments({
      recipients: req.user._id,
      status: 'inbox'
    });

    // Count sent messages
    const sentCount = await Message.countDocuments({
      sender: req.user._id,
      status: 'sent'
    });

    // Count draft messages
    const draftCount = await Message.countDocuments({
      sender: req.user._id,
      status: 'draft'
    });

    // Count trash messages
    const trashCount = await Message.countDocuments({
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
  } catch (error) {
    console.error("Get message stats error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Download attachment
export const downloadAttachment: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { messageId, attachmentId } = req.params;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user has access to this message
    const isRecipient = message.recipients.some(recipient => 
      recipient.toString() === req.user!._id.toString()
    );
    const isSender = message.sender.toString() === req.user!._id.toString();

    if (!isRecipient && !isSender) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Find the attachment
    const attachment = message.attachments.id(attachmentId);

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Check if file exists
    if (!fs.existsSync(attachment.path)) {
      return res.status(404).json({ error: "Attachment file not found" });
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.setHeader('Content-Type', attachment.contentType);

    // Stream the file
    
    const fileStream = fs.createReadStream(attachment.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Download attachment error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};