// src/models/Utilities.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUtility extends Document {
  name: string;
  fileUrl: string;
  type: 'form' | 'faq' | 'manual' | 'document' | 'spreadsheet' | 'other';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UtilitySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['form', 'faq', 'manual', 'document', 'spreadsheet', 'other'],
    default: 'other'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    required: true,
    enum: ['utilita', 'checklist', 'Materiale' , 'Uncategorized' , 'saluta'],
  }
}, {
  timestamps: true
});

export default mongoose.model<IUtility>('Utility', UtilitySchema);