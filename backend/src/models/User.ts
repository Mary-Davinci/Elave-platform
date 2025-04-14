// src/models/User.ts
import mongoose, { Document, Schema } from "mongoose";

// Define the User interface with the correct types
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "user" | "attuatore" | "admin";
  firstName?: string;
  lastName?: string;
  organization?: string;
  managedBy?: mongoose.Types.ObjectId; // Reference to the user who manages this user
  manages?: mongoose.Types.ObjectId[]; // Array of user IDs this user manages
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: {
    type: String,
    enum: ["user", "attuatore", "admin"],
    default: "user"
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  organization: {
    type: String,
    trim: true
  },
  managedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  manages: [{
    type: Schema.Types.ObjectId,
    ref: "User"
  }]
}, { 
  timestamps: true 
});

// Add an index for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ managedBy: 1 });

const User = mongoose.model<IUser>("User", UserSchema);
export default User;