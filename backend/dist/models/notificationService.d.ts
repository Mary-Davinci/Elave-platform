import mongoose from 'mongoose';
declare const Notification: mongoose.Model<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    type: "company_pending" | "sportello_pending" | "agente_pending" | "segnalatore_pending";
    message: string;
    title: string;
    recipients: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    entityId: string;
    entityName: string;
    createdByName: string;
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
    recipients: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    entityId: string;
    entityName: string;
    createdByName: string;
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
    recipients: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    entityId: string;
    entityName: string;
    createdByName: string;
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
    recipients: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    entityId: string;
    entityName: string;
    createdByName: string;
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
    recipients: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    entityId: string;
    entityName: string;
    createdByName: string;
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
    recipients: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    entityId: string;
    entityName: string;
    createdByName: string;
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
    static notifyAdminsOfPendingApproval(data: NotificationData): Promise<void>;
    static getNotificationsForUser(userId: string): Promise<any[]>;
    static markAsRead(notificationId: string, userId: string): Promise<void>;
    static markAllAsReadForUser(userId: string): Promise<void>;
    static deleteNotification(notificationId: string, userId: string): Promise<void>;
    static cleanupOldNotifications(): Promise<void>;
    static getNotificationStats(): Promise<any>;
}
export default Notification;
