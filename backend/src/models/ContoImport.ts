import mongoose, { Schema, Document } from "mongoose";

export interface IContoImport extends Document {
  fileHash: string;
  account?: "proselitismo" | "servizi";
  originalName: string;
  uploadedBy: mongoose.Types.ObjectId;
  rowCount: number;
  importKeys?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ContoImportSchema = new Schema<IContoImport>(
  {
    fileHash: { type: String, required: true, unique: true, index: true },
    account: { type: String, enum: ["proselitismo", "servizi"], default: "proselitismo", index: true },
    originalName: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rowCount: { type: Number, default: 0 },
    importKeys: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IContoImport>("ContoImport", ContoImportSchema);
