import mongoose, { Document, Schema } from "mongoose";

export interface IProject extends Document {
  title: string;
  description: string;
  company: mongoose.Types.ObjectId;
  status: 'requested' | 'inProgress' | 'completed';
  startDate: Date | null;
  endDate: Date | null;
  budget: number;
  hours: number;
  templateCode?: string;
  user: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
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
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    status: {
      type: String,
      enum: ["requested", "inProgress", "completed"],
      default: "requested",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    budget: {
      type: Number,
      default: 0,
    },
    hours: {
      type: Number,
      default: 0,
    },
    templateCode: {
      type: String,
      trim: true,
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
ProjectSchema.index({ user: 1 });
ProjectSchema.index({ company: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ templateCode: 1 });

const Project = mongoose.model<IProject>("Project", ProjectSchema);
export default Project;