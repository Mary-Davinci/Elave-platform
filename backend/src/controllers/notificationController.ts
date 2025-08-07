import { NotificationService } from "../models/notificationService";
import { CustomRequestHandler } from "../types/express";

export const getNotifications: CustomRequestHandler = async (req, res) => {
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

    const notifications = await NotificationService.getNotificationsForUser(req.user._id.toString());
    
    return res.json({
      notifications,
      unreadCount: notifications.length
    });
  } catch (err: any) {
    console.error("Get notifications error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Mark notification as read
export const markNotificationAsRead: CustomRequestHandler = async (req, res) => {
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
      await NotificationService.markAsRead(id, req.user._id.toString());
      return res.json({ message: "Notification marked as read" });
    } catch (notificationError: any) {
      console.error("Notification service error:", notificationError);
      return res.status(404).json({ error: "Notification not found or already read" });
    }
  } catch (err: any) {
    console.error("Mark notification as read error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Mark all notifications as read for current user
export const markAllNotificationsAsRead: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Only admin and super_admin can mark notifications as read
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    await NotificationService.markAllAsReadForUser(req.user._id.toString());
    
    return res.json({ message: "All notifications marked as read" });
  } catch (err: any) {
    console.error("Mark all notifications as read error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get unread notification count
export const getUnreadCount: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.json({ count: 0 });
    }

    const notifications = await NotificationService.getNotificationsForUser(req.user._id.toString());
    
    return res.json({ count: notifications.length });
  } catch (err: any) {
    console.error("Get unread count error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Delete a notification
export const deleteNotification: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { id } = req.params;
    
    try {
      await NotificationService.deleteNotification(id, req.user._id.toString());
      return res.json({ message: "Notification deleted successfully" });
    } catch (notificationError: any) {
      console.error("Notification service error:", notificationError);
      return res.status(404).json({ error: "Notification not found" });
    }
  } catch (err: any) {
    console.error("Delete notification error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};