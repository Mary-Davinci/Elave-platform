"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User"
    },
    manages: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "User"
        }],
    assignedCompanies: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Company"
        }],
    isApproved: {
        type: Boolean,
        default: false
    },
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
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
UserSchema.pre('save', function (next) {
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
        }
        else {
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
UserSchema.virtual('fullName').get(function () {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});
UserSchema.methods.canAccess = function (resourceUserId) {
    if (["admin", "super_admin"].includes(this.role)) {
        return true;
    }
    if (this.role === "responsabile_territoriale" && this.permissions?.canViewAll) {
        return true;
    }
    return this._id.toString() === resourceUserId ||
        this.manages?.some((id) => id.toString() === resourceUserId);
};
const User = mongoose_1.default.model("User", UserSchema);
exports.default = User;
//# sourceMappingURL=User.js.map