import mongoose, { Document, Schema } from "mongoose";

export interface IServiziInvoiceRequest extends Document {
  account: "servizi";
  requester: mongoose.Types.ObjectId;
  requesterRole: string;
  selectedServices: string[];
  amount: number;
  attachmentName?: string;
  status: "pending" | "approved" | "rejected";
  approvalNote?: string;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  contoTransaction?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ServiziInvoiceRequestSchema = new Schema<IServiziInvoiceRequest>(
  {
    account: { type: String, enum: ["servizi"], default: "servizi", required: true },
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requesterRole: { type: String, required: true },
    selectedServices: { type: [String], required: true, default: [] },
    amount: { type: Number, required: true, min: 0 },
    attachmentName: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approvalNote: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedAt: { type: Date },
    contoTransaction: { type: Schema.Types.ObjectId, ref: "ContoTransaction" },
  },
  { timestamps: true }
);

ServiziInvoiceRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IServiziInvoiceRequest>(
  "ServiziInvoiceRequest",
  ServiziInvoiceRequestSchema
);

