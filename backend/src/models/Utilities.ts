import mongoose, { Document, Schema } from "mongoose";

export interface IUtility extends Document {
  name: string;
  fileUrl: string;
  type: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UtilitySchema = new Schema<IUtility>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "regulation",
        "catalog",
        "faq",
        "form",
        "circular",
        "notice",
        "report",
        "other"
      ],
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
UtilitySchema.index({ type: 1 });
UtilitySchema.index({ isPublic: 1 });

const Utility = mongoose.model<IUtility>("Utility", UtilitySchema);
export default Utility;