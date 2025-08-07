import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "super_admin" | "admin" | "responsabile_territoriale" | "sportello_lavoro" | "segnalatori";
  firstName?: string;
  lastName?: string;
  organization?: string;
  
  managedBy?: mongoose.Types.ObjectId; 
  manages?: mongoose.Types.ObjectId[]; 
  assignedCompanies?: mongoose.Types.ObjectId[]; 
  
  isApproved?: boolean; 
  approvedBy?: mongoose.Types.ObjectId; 
  approvedAt?: Date; 
  pendingApproval?: boolean;
  
  profitSharePercentage?: number;
  isActive?: boolean; 
  
  permissions?: {
    canViewAll?: boolean; 
    canCreateSportello?: boolean; 
    canCreateCompanies?: boolean; 
    canCreateEmployees?: boolean; 
    canCreateSegnalatori?: boolean;
    canRequestRefunds?: boolean;
  };
  
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
    enum: ["super_admin", "admin", "responsabile_territoriale", "sportello_lavoro", "segnalatori"],
    default: "segnalatori"
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
  }],
  assignedCompanies: [{
    type: Schema.Types.ObjectId,
    ref: "Company"
  }],
  
  
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  approvedAt: {
    type: Date
  },
  pendingApproval: {
    type: Boolean,
    default: false
  },
  
  profitSharePercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 20 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    canViewAll: {
      type: Boolean,
      default: false
    },
    canCreateSportello: {
      type: Boolean,
      default: false
    },
    canCreateCompanies: {
      type: Boolean,
      default: false
    },
    canCreateEmployees: {
      type: Boolean,
      default: false
    },
    canCreateSegnalatori: {
      type: Boolean,
      default: false
    },
    canRequestRefunds: {
      type: Boolean,
      default: false
    }
  }
}, { 
  timestamps: true 
});

UserSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    const role = this.role;
    
    this.permissions = {
      canViewAll: ["responsabile_territoriale", "admin", "super_admin"].includes(role),
      canCreateSportello: ["responsabile_territoriale", "admin", "super_admin"].includes(role),
      canCreateCompanies: ["sportello_lavoro", "responsabile_territoriale", "admin", "super_admin"].includes(role),
      canCreateEmployees: ["sportello_lavoro", "responsabile_territoriale", "admin", "super_admin"].includes(role),
      canCreateSegnalatori: ["sportello_lavoro", "responsabile_territoriale", "admin", "super_admin"].includes(role),
      canRequestRefunds: ["sportello_lavoro", "responsabile_territoriale", "admin", "super_admin"].includes(role)
    };
    
    if (!this.profitSharePercentage) {
      switch (role) {
        case "segnalatori": 
          this.profitSharePercentage = 20;
          break;
        case "sportello_lavoro": 
          this.profitSharePercentage = 40;
          break;
        case "responsabile_territoriale": 
          this.profitSharePercentage = 80;
          break;
        case "admin":
        case "super_admin": 
          this.profitSharePercentage = 0;
          break;
        default: 
          this.profitSharePercentage = 20;
      }
    }
  }
  
  if (this.isNew) {
    if (["admin", "super_admin"].includes(this.role)) {
      this.isApproved = true;
      this.pendingApproval = false;
    } else {
      // All other users need approval if created by responsabile_territoriale
    
    }
  }
  
  next();
});

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ managedBy: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ isApproved: 1 });
UserSchema.index({ pendingApproval: 1 });
UserSchema.index({ "assignedCompanies": 1 });


UserSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

UserSchema.methods.canAccess = function(resourceUserId: string): boolean {
  if (["admin", "super_admin"].includes(this.role)) {
    return true; 
  }
  
  if (this.role === "responsabile_territoriale" && this.permissions?.canViewAll) {
    return true; 
  }
  
  
  return this._id.toString() === resourceUserId || 
         this.manages?.some((id: any) => id.toString() === resourceUserId);
};

const User = mongoose.model<IUser>("User", UserSchema);
export default User;