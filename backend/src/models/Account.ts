import mongoose, { Document, Schema } from "mongoose";

export interface IAccount extends Document {
  name: string;
  type: "proselitismo" | "servizi";
  balance: number;
  user: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["proselitismo", "servizi"],
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
AccountSchema.index({ user: 1 });
AccountSchema.index({ type: 1 });

const Account = mongoose.model<IAccount>("Account", AccountSchema);
export default Account;