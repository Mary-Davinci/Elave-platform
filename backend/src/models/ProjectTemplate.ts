// src/models/ProjectTemplate.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IProjectTemplate extends Document {
  code: string;
  title: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  hours: number;
  category?: string;
  subcategory?: string;
  type?: string;
  isPublic: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTemplateSchema = new Schema<IProjectTemplate>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    minPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    maxPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    hours: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    subcategory: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      default: "",
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    createdBy: {
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
ProjectTemplateSchema.index({ code: 1 });
ProjectTemplateSchema.index({ category: 1 });
ProjectTemplateSchema.index({ subcategory: 1 });
ProjectTemplateSchema.index({ type: 1 });
ProjectTemplateSchema.index({ isPublic: 1 });

const ProjectTemplate = mongoose.model<IProjectTemplate>("ProjectTemplate", ProjectTemplateSchema);
export default ProjectTemplate;