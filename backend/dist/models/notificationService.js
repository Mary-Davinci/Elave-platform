"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
// src/models/notificationService.ts - Complete backend notification service
const mongoose_1 = __importDefault(require("mongoose"));
// Define the notification schema
const notificationSchema = new mongoose_1.default.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['company_pending', 'sportello_pending', 'agente_pending', 'segnalatore_pending'],
        required: true
    },
    entityId: {
        type: String,
        required: true
    },
    entityName: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdByName: {
        type: String,
        required: true
    },
    recipients: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User'
        }],
    readBy: [{
            user: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'User'
            },
            readAt: {
                type: Date,
                default: Date.now
            }
        }]
}, {
    timestamps: true
});
// Create index for better performance
notificationSchema.index({ recipients: 1, createdAt: -1 });
notificationSchema.index({ 'readBy.user': 1 });
const Notification = mongoose_1.default.model('Notification', notificationSchema);
class NotificationService {
    /**
     * Notify all admins of a pending approval
     */
    static async notifyAdminsOfPendingApproval(data) {
        try {
            // Import User model dynamically to avoid circular dependencies
            const User = require('./User').default;
            // Find all admin and super_admin users
            const adminUsers = await User.find({
                role: { $in: ['admin', 'super_admin'] },
                isActive: true
            }).select('_id');
            if (adminUsers.length === 0) {
                console.warn('No admin users found to notify');
                return;
            }
            // Create notification
            const notification = new Notification({
                title: data.title,
                message: data.message,
                type: data.type,
                entityId: data.entityId,
                entityName: data.entityName,
                createdBy: new mongoose_1.default.Types.ObjectId(data.createdBy),
                createdByName: data.createdByName,
                recipients: adminUsers.map((user) => user._id),
                readBy: [] // Initially unread by all
            });
            await notification.save();
            console.log(`Notification created for ${adminUsers.length} admin(s): ${data.title}`);
        }
        catch (error) {
            console.error('Error creating notification:', error);
            // Don't throw error to avoid breaking the main workflow
        }
    }
    /**
     * Get unread notifications for a specific user
     */
    static async getNotificationsForUser(userId) {
        try {
            const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
            const notifications = await Notification.find({
                recipients: userObjectId,
                'readBy.user': { $ne: userObjectId } // Not read by this user
            })
                .populate('createdBy', 'username firstName lastName')
                .sort({ createdAt: -1 })
                .limit(50) // Limit to last 50 notifications
                .lean();
            return notifications;
        }
        catch (error) {
            console.error('Error fetching notifications for user:', error);
            return [];
        }
    }
    /**
     * Mark a notification as read by a specific user
     */
    static async markAsRead(notificationId, userId) {
        try {
            const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
            const result = await Notification.updateOne({
                _id: new mongoose_1.default.Types.ObjectId(notificationId),
                recipients: userObjectId,
                'readBy.user': { $ne: userObjectId } // Only if not already read
            }, {
                $push: {
                    readBy: {
                        user: userObjectId,
                        readAt: new Date()
                    }
                }
            });
            if (result.modifiedCount === 0) {
                throw new Error('Notification not found or already read');
            }
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }
    /**
     * Mark all notifications as read for a specific user
     */
    static async markAllAsReadForUser(userId) {
        try {
            const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
            await Notification.updateMany({
                recipients: userObjectId,
                'readBy.user': { $ne: userObjectId } // Only unread notifications
            }, {
                $push: {
                    readBy: {
                        user: userObjectId,
                        readAt: new Date()
                    }
                }
            });
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }
    /**
     * Delete a notification (only if user is in recipients)
     */
    static async deleteNotification(notificationId, userId) {
        try {
            const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
            const result = await Notification.deleteOne({
                _id: new mongoose_1.default.Types.ObjectId(notificationId),
                recipients: userObjectId
            });
            if (result.deletedCount === 0) {
                throw new Error('Notification not found or access denied');
            }
        }
        catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }
    /**
     * Clean up old notifications (older than 30 days)
     */
    static async cleanupOldNotifications() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const result = await Notification.deleteMany({
                createdAt: { $lt: thirtyDaysAgo }
            });
            console.log(`Cleaned up ${result.deletedCount} old notifications`);
        }
        catch (error) {
            console.error('Error cleaning up old notifications:', error);
        }
    }
    /**
     * Get notification statistics
     */
    static async getNotificationStats() {
        try {
            const stats = await Notification.aggregate([
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        latest: { $max: '$createdAt' }
                    }
                }
            ]);
            const totalCount = await Notification.countDocuments();
            return {
                total: totalCount,
                byType: stats,
                generatedAt: new Date()
            };
        }
        catch (error) {
            console.error('Error getting notification stats:', error);
            return null;
        }
    }
}
exports.NotificationService = NotificationService;
exports.default = Notification;
//# sourceMappingURL=notificationService.js.map