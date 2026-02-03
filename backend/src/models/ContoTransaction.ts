import mongoose, { Schema, Document } from "mongoose";

export type AccountType = "proselitismo" | "servizi";
export type TransactionType = "entrata" | "uscita";
export type TransactionStatus = "completata" | "in_attesa" | "annullata";
export type TransactionSource = "manuale" | "xlsx";

export interface IContoTransaction extends Document {
  account: AccountType;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  category: string;
  user: mongoose.Types.ObjectId;
  company?: mongoose.Types.ObjectId;
  source: TransactionSource;
  importKey?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContoTransactionSchema = new Schema<IContoTransaction>(
  {
    account: {
      type: String,
      enum: ["proselitismo", "servizi"],
      required: true,
      default: "proselitismo",
    },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ["entrata", "uscita"],
      required: true,
      default: "entrata",
    },
    status: {
      type: String,
      enum: ["completata", "in_attesa", "annullata"],
      default: "completata",
    },
    description: { type: String, required: true, default: "" },
    category: { type: String, required: true, default: "Competenza" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: Schema.Types.ObjectId, ref: "Company" },
    source: {
      type: String,
      enum: ["manuale", "xlsx"],
      default: "manuale",
    },
    importKey: { type: String, trim: true, index: true },
    date: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export default mongoose.model<IContoTransaction>("ContoTransaction", ContoTransactionSchema);
