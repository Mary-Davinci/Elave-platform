"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.getUnreadCount = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getNotifications = void 0;
// src/controllers/notificationController.ts - Complete notification controller
const notificationService_1 = require("../models/notificationService");
// Get notifications for current user
const getNotifications = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admin and super_admin can receive notifications
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.json({
                notifications: [],
                unreadCount: 0
            });
        }
        const notifications = await notificationService_1.NotificationService.getNotificationsForUser(req.user._id.toString());
        return res.json({
            notifications,
            unreadCount: notifications.length
        });
    }
    catch (err) {
        console.error("Get notifications error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getNotifications = getNotifications;
// Mark notification as read
const markNotificationAsRead = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admin and super_admin can mark notifications as read
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied" });
        }
        const { id } = req.params;
        try {
            await notificationService_1.NotificationService.markAsRead(id, req.user._id.toString());
            return res.json({ message: "Notification marked as read" });
        }
        catch (notificationError) {
            console.error("Notification service error:", notificationError);
            return res.status(404).json({ error: "Notification not found or already read" });
        }
    }
    catch (err) {
        console.error("Mark notification as read error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
// Mark all notifications as read for current user
const markAllNotificationsAsRead = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admin and super_admin can mark notifications as read
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied" });
        }
        await notificationService_1.NotificationService.markAllAsReadForUser(req.user._id.toString());
        return res.json({ message: "All notifications marked as read" });
    }
    catch (err) {
        console.error("Mark all notifications as read error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
// Get unread notification count
const getUnreadCount = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admin and super_admin can receive notifications
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.json({ count: 0 });
        }
        const notifications = await notificationService_1.NotificationService.getNotificationsForUser(req.user._id.toString());
        return res.json({ count: notifications.length });
    }
    catch (err) {
        console.error("Get unread count error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getUnreadCount = getUnreadCount;
// Delete a notification
const deleteNotification = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admin and super_admin can delete notifications
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied" });
        }
        const { id } = req.params;
        try {
            await notificationService_1.NotificationService.deleteNotification(id, req.user._id.toString());
            return res.json({ message: "Notification deleted successfully" });
        }
        catch (notificationError) {
            console.error("Notification service error:", notificationError);
            return res.status(404).json({ error: "Notification not found" });
        }
    }
    catch (err) {
        console.error("Delete notification error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteNotification = deleteNotification;
//# sourceMappingURL=notificationController.js.map