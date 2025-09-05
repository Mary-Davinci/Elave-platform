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
const FileInfoSchema = new mongoose_1.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true }
}, { _id: false });
const ProcacciatoreSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        required: [true, 'Nome is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Cognome is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
        validate: {
            validator: function (v) {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: 'Please enter a valid email'
        }
    },
    phone: {
        type: String,
        trim: true
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
    taxCode: {
        type: String,
        required: [true, 'Codice Fiscale is required'],
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    agreementPercentage: {
        type: Number,
        required: [true, 'Percentuale accordo is required'],
        min: [0, 'Percentage must be greater than 0'],
        max: [100, 'Percentage cannot exceed 100']
    },
    specialization: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },
    contractFile: FileInfoSchema,
    idDocumentFile: FileInfoSchema,
    isActive: {
        type: Boolean,
        default: true
    },
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
ProcacciatoreSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});
ProcacciatoreSchema.index({ user: 1, email: 1 });
ProcacciatoreSchema.index({ user: 1, taxCode: 1 });
ProcacciatoreSchema.index({
    firstName: 'text',
    lastName: 'text',
    email: 'text',
    city: 'text',
    taxCode: 'text'
});
ProcacciatoreSchema.pre('save', function (next) {
    if (this.taxCode) {
        this.taxCode = this.taxCode.replace(/\s/g, '').toUpperCase();
    }
    next();
});
ProcacciatoreSchema.statics.findByUser = function (userId) {
    return this.find({ user: userId }).sort({ createdAt: -1 });
};
ProcacciatoreSchema.statics.findByTaxCode = function (taxCode, userId) {
    const query = { taxCode: taxCode.replace(/\s/g, '').toUpperCase() };
    if (userId) {
        query.user = userId;
    }
    return this.findOne(query);
};
ProcacciatoreSchema.methods.getFullAddress = function () {
    return `${this.address}, ${this.city} ${this.postalCode} (${this.province})`;
};
const Procacciatore = mongoose_1.default.model('Procacciatore', ProcacciatoreSchema);
exports.default = Procacciatore;
//# sourceMappingURL=Procacciatore.js.map