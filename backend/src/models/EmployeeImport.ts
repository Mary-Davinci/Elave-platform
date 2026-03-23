import mongoose, { Document, Schema } from "mongoose";

export interface IEmployeeImport extends Document {
  companyId: mongoose.Types.ObjectId;
  fileHash: string;
  originalName?: string;
  uploadedBy?: mongoose.Types.ObjectId;
  createdCount: number;
  errorCount: number;
  importErrors: string[];
  createdEmployeeIds: mongoose.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const EmployeeImportSchema: Schema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    fileHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    originalName: {
      type: String,
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdCount: {
      type: Number,
      required: true,
      default: 0,
    },
    errorCount: {
      type: Number,
      required: true,
      default: 0,
    },
    importErrors: {
      type: [String],
      default: [],
    },
    createdEmployeeIds: {
      type: [Schema.Types.ObjectId],
      ref: "Employee",
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "employeeImports",
  }
);

EmployeeImportSchema.index({ companyId: 1, fileHash: 1 }, { unique: true });

export default mongoose.model<IEmployeeImport>("EmployeeImport", EmployeeImportSchema);
