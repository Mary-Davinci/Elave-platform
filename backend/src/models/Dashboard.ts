import mongoose, { Document, Schema } from "mongoose";

export interface IDashboardStats extends Document {
  user: mongoose.Types.ObjectId;
  companies: number;
  actuators: number;
  employees: number;
  suppliers: number;
  unreadMessages: number;
  projectsRequested: number;
  projectsInProgress: number;
  projectsCompleted: number;
  updatedAt: Date;
}

const DashboardStatsSchema = new Schema<IDashboardStats>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companies: {
      type: Number,
      default: 0,
    },
    actuators: {
      type: Number,
      default: 0,
    },
    employees: {
      type: Number,
      default: 0,
    },
    suppliers: {
      type: Number,
      default: 0,
    },
    unreadMessages: {
      type: Number,
      default: 0,
    },
    projectsRequested: {
      type: Number,
      default: 0,
    },
    projectsInProgress: {
      type: Number,
      default: 0,
    },
    projectsCompleted: {
      type: Number,
      default: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Index for quick lookup
DashboardStatsSchema.index({ user: 1 });

const DashboardStats = mongoose.model<IDashboardStats>("DashboardStats", DashboardStatsSchema);
export default DashboardStats;