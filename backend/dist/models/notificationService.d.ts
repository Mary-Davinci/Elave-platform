import mongoose from 'mongoose';
declare const Notification: mongoose.Model<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    type: "company_pending" | "sportello_pending" | "agente_pending" | "segnalatore_pending";
    message: string;
    title: string;
    entityId: string;
    entityName: string;
    createdBy: mongoose.Types.ObjectId;
    createdByName: string;
    recipients: mongoose.Types.ObjectId[];
    readBy: mongoose.Types.DocumentArray<{
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.Types.ObjectId, any, {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }> & {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }>;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    type: "company_pending" | "sportello_pending" | "agente_pending" | "segnalatore_pending";
    message: string;
    title: string;
    entityId: string;
    entityName: string;
    createdBy: mongoose.Types.ObjectId;
    createdByName: string;
    recipients: mongoose.Types.ObjectId[];
    readBy: mongoose.Types.DocumentArray<{
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.Types.ObjectId, any, {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }> & {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }>;
}, {}> & {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    type: "company_pending" | "sportello_pending" | "agente_pending" | "segnalatore_pending";
    message: string;
    title: string;
    entityId: string;
    entityName: string;
    createdBy: mongoose.Types.ObjectId;
    createdByName: string;
    recipients: mongoose.Types.ObjectId[];
    readBy: mongoose.Types.DocumentArray<{
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.Types.ObjectId, any, {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }> & {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }>;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    type: "company_pending" | "sportello_pending" | "agente_pending" | "segnalatore_pending";
    message: string;
    title: string;
    entityId: string;
    entityName: string;
    createdBy: mongoose.Types.ObjectId;
    createdByName: string;
    recipients: mongoose.Types.ObjectId[];
    readBy: mongoose.Types.DocumentArray<{
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.Types.ObjectId, any, {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }> & {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }>;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    type: "company_pending" | "sportello_pending" | "agente_pending" | "segnalatore_pending";
    message: string;
    title: string;
    entityId: string;
    entityName: string;
    createdBy: mongoose.Types.ObjectId;
    createdByName: string;
    recipients: mongoose.Types.ObjectId[];
    readBy: mongoose.Types.DocumentArray<{
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.Types.ObjectId, any, {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }> & {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }>;
}>, {}> & mongoose.FlatRecord<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    type: "company_pending" | "sportello_pending" | "agente_pending" | "segnalatore_pending";
    message: string;
    title: string;
    entityId: string;
    entityName: string;
    createdBy: mongoose.Types.ObjectId;
    createdByName: string;
    recipients: mongoose.Types.ObjectId[];
    readBy: mongoose.Types.DocumentArray<{
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.Types.ObjectId, any, {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }> & {
        readAt: NativeDate;
        user?: mongoose.Types.ObjectId | null | undefined;
    }>;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export interface NotificationData {
    title: string;
    message: string;
    type: 'company_pending' | 'sportello_pending' | 'agente_pending' | 'segnalatore_pending';
    entityId: string;
    entityName: string;
    createdBy: string;
    createdByName: string;
}
export declare class NotificationService {
    /**
     * Notify all admins of a pending approval
     */
    static notifyAdminsOfPendingApproval(data: NotificationData): Promise<void>;
    /**
     * Get unread notifications for a specific user
     */
    static getNotificationsForUser(userId: string): Promise<any[]>;
    /**
     * Mark a notification as read by a specific user
     */
    static markAsRead(notificationId: string, userId: string): Promise<void>;
    /**
     * Mark all notifications as read for a specific user
     */
    static markAllAsReadForUser(userId: string): Promise<void>;
    /**
     * Delete a notification (only if user is in recipients)
     */
    static deleteNotification(notificationId: string, userId: string): Promise<void>;
    /**
     * Clean up old notifications (older than 30 days)
     */
    static cleanupOldNotifications(): Promise<void>;
    /**
     * Get notification statistics
     */
    static getNotificationStats(): Promise<any>;
}
export default Notification;
