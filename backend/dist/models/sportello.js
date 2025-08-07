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
// src/models/SportelloLavoro.ts
const mongoose_1 = __importStar(require("mongoose"));
// File schema for uploaded documents
const FileInfoSchema = new mongoose_1.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true }
}, { _id: false });
// SportelloLavoro schema
const SportelloLavoroSchema = new mongoose_1.Schema({
    businessName: {
        type: String,
        required: [true, 'Ragione sociale is required'],
        trim: true
    },
    vatNumber: {
        type: String,
        required: [true, 'Partita IVA is required'],
        unique: true,
        trim: true,
        index: true
    },
    address: {
        type: String,
        required: [true, 'Indirizzo is required'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'Città is required'],
        trim: true
    },
    postalCode: {
        type: String,
        required: [true, 'CAP is required'],
        trim: true
    },
    province: {
        type: String,
        required: [true, 'Provincia is required'],
        trim: true
    },
    agreedCommission: {
        type: Number,
        required: [true, 'Competenze concordate is required'],
        min: [0, 'Commission must be greater than 0']
    },
    isApproved: {
        type: Boolean,
        default: false,
    },
    approvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    approvedAt: {
        type: Date,
    },
    pendingApproval: {
        type: Boolean,
        default: true,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: 'Please enter a valid email'
        }
    },
    pec: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: 'Please enter a valid PEC email'
        }
    },
    signedContractFile: FileInfoSchema,
    legalDocumentFile: FileInfoSchema,
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Create compound index for user + vatNumber for faster queries
SportelloLavoroSchema.index({ user: 1, vatNumber: 1 });
// Add text index for search functionality
SportelloLavoroSchema.index({
    businessName: 'text',
    vatNumber: 'text',
    city: 'text',
    email: 'text'
});
// Pre-save middleware to ensure VAT number format
SportelloLavoroSchema.pre('save', function (next) {
    if (this.vatNumber) {
        // Remove spaces and convert to uppercase for consistency
        this.vatNumber = this.vatNumber.replace(/\s/g, '').toUpperCase();
    }
    next();
});
// Static methods
SportelloLavoroSchema.statics.findByUser = function (userId) {
    return this.find({ user: userId }).sort({ createdAt: -1 });
};
SportelloLavoroSchema.statics.findByVatNumber = function (vatNumber, userId) {
    const query = { vatNumber: vatNumber.replace(/\s/g, '').toUpperCase() };
    if (userId) {
        query.user = userId;
    }
    return this.findOne(query);
};
// Instance methods
SportelloLavoroSchema.methods.getFullAddress = function () {
    return `${this.address}, ${this.city} ${this.postalCode} (${this.province})`;
};
// Error handling for duplicate VAT number
SportelloLavoroSchema.post('save', function (error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        if (error.keyPattern && error.keyPattern.vatNumber) {
            next(new Error('VAT number already exists'));
        }
        else {
            next(error);
        }
    }
    else {
        next(error);
    }
});
const SportelloLavoro = mongoose_1.default.model('SportelloLavoro', SportelloLavoroSchema);
exports.default = SportelloLavoro;
//# sourceMappingURL=sportello.js.map