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
// src/models/Company.ts
const mongoose_1 = __importStar(require("mongoose"));
const CompanySchema = new mongoose_1.Schema({
    businessName: {
        type: String,
        required: true,
        trim: true,
    },
    companyName: {
        type: String,
        required: true,
        trim: true,
    },
    vatNumber: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    fiscalCode: {
        type: String,
        trim: true,
    },
    matricola: {
        type: String,
        trim: true,
    },
    inpsCode: {
        type: String,
        trim: true,
    },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        province: { type: String, trim: true },
        country: { type: String, trim: true, default: "Italy" },
    },
    contactInfo: {
        phoneNumber: { type: String, trim: true },
        mobile: { type: String, trim: true },
        email: { type: String, trim: true },
        pec: { type: String, trim: true },
        referent: { type: String, trim: true },
    },
    contractDetails: {
        contractType: { type: String, trim: true },
        ccnlType: { type: String, trim: true },
        bilateralEntity: { type: String, trim: true },
        hasFondoSani: { type: Boolean, default: false },
        useEbapPayment: { type: Boolean, default: false },
    },
    industry: {
        type: String,
        trim: true,
        default: "",
    },
    employees: {
        type: Number,
        default: 0,
    },
    signaler: {
        type: String,
        trim: true,
    },
    actuator: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: false,
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
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});
CompanySchema.index({ user: 1 });
CompanySchema.index({ businessName: 1 });
CompanySchema.index({ vatNumber: 1 }, { unique: true });
CompanySchema.index({ province: 1 });
CompanySchema.index({ isActive: 1 });
CompanySchema.index({ isApproved: 1 });
CompanySchema.index({ pendingApproval: 1 });
const Company = mongoose_1.default.model("Company", CompanySchema);
exports.default = Company;
//# sourceMappingURL=Company.js.map