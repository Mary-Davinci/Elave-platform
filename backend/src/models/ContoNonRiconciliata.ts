import mongoose, { Schema, Document } from "mongoose";

export interface IContoNonRiconciliata extends Document {
  account: "proselitismo" | "servizi";
  amount: number;
  description: string;
  user: mongoose.Types.ObjectId;
  company?: mongoose.Types.ObjectId;
  source: "manuale" | "xlsx";
  importKey?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContoNonRiconciliataSchema = new Schema<IContoNonRiconciliata>(
  {
    account: {
      type: String,
      enum: ["proselitismo", "servizi"],
      required: true,
      default: "proselitismo",
    },
    amount: { type: Number, required: true },
    description: { type: String, required: true, default: "" },
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

export default mongoose.model<IContoNonRiconciliata>(
  "ContoNonRiconciliata",
  ContoNonRiconciliataSchema
);
