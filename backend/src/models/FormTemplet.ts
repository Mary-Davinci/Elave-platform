// models/FormTemplate.ts  (make sure the filename matches your import)
import mongoose, { Document, Schema } from "mongoose";

export type TemplateType = 'contract' | 'legal' | 'id';
export type TemplateCategory = 'agenti' | 'segnalatore' | 'sportello' | 'sportello-lavoro';

export interface IFormTemplate extends Document {
  name: string;
  type: TemplateType;
  category: TemplateCategory;
  fileName: string;
  originalName: string;
  filePath: string;
  mimetype: string;
  size: number;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FormTemplateSchema = new Schema<IFormTemplate>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['contract', 'legal', 'id'] },
    category: {
      type: String,
      required: true,
      enum: ['agenti', 'segnalatore', 'sportello', 'sportello-lavoro'],
      default: 'agenti',
      index: true,
    },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

FormTemplateSchema.index({ type: 1, category: 1 }, { unique: true });
FormTemplateSchema.index({ uploadedBy: 1 });
FormTemplateSchema.index({ createdAt: -1 });

export default mongoose.model<IFormTemplate>('FormTemplate', FormTemplateSchema);
