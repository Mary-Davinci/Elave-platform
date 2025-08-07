// src/models/FormTemplate.ts (or FormTemplet.ts)
import mongoose, { Document, Schema } from "mongoose";

export interface IFormTemplate extends Document {
  name: string;
  type: 'contract' | 'legal' | 'id';
  category: 'agenti' | 'segnalatore'; // NEW: Category field
  fileName: string;
  originalName: string;
  filePath: string;
  mimetype: string;
  size: number;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FormTemplateSchema = new Schema<IFormTemplate>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['contract', 'legal', 'id']
  },
  category: {
    type: String,
    required: true,
    enum: ['agenti', 'segnalatore'],
    default: 'agenti' // Default for backward compatibility
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});


FormTemplateSchema.index({ type: 1, category: 1 }, { unique: true });

FormTemplateSchema.index({ category: 1 });
FormTemplateSchema.index({ uploadedBy: 1 });
FormTemplateSchema.index({ createdAt: -1 });

const FormTemplate = mongoose.model<IFormTemplate>("FormTemplate", FormTemplateSchema);
export default FormTemplate;