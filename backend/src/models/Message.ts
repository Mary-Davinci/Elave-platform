import mongoose, { Document, Schema, Types } from "mongoose";

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

const AttachmentSchema = new Schema<IAttachment>({
  filename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  }
});

const MessageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    recipients: [{
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }],
    subject: {
      type: String,
      required: true,
      trim: true
    },
    body: {
      type: String,
      required: true
    },
    attachments: [AttachmentSchema],
    read: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['inbox', 'sent', 'draft', 'trash'],
      default: 'inbox'
    }
  },
  {
    timestamps: true
  }
);

MessageSchema.index({ sender: 1 });
MessageSchema.index({ recipients: 1 });
MessageSchema.index({ status: 1 });
MessageSchema.index({ read: 1 });

const Message = mongoose.model<IMessage>("Message", MessageSchema);
export default Message;