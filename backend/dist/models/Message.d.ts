import mongoose, { Document, Types } from "mongoose";
export interface IAttachment {
    filename: string;
    path: string;
    contentType: string;
    size: number;
}
export interface IMessage extends Document {
    sender: mongoose.Types.ObjectId;
    recipients: mongoose.Types.ObjectId[];
    subject: string;
    body: string;
    attachments: Types.DocumentArray<IAttachment & Document>;
    read: boolean;
    status: 'inbox' | 'sent' | 'draft' | 'trash';
    createdAt: Date;
    updatedAt: Date;
}
declare const Message: mongoose.Model<IMessage, {}, {}, {}, mongoose.Document<unknown, {}, IMessage, {}> & IMessage & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Message;
