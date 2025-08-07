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
// src/models/Employee.ts
const mongoose_1 = __importStar(require("mongoose"));
const EmployeeSchema = new mongoose_1.Schema({
    companyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    nome: {
        type: String,
        required: [true, 'Nome is required'],
        trim: true,
        maxlength: [50, 'Nome cannot exceed 50 characters']
    },
    cognome: {
        type: String,
        required: [true, 'Cognome is required'],
        trim: true,
        maxlength: [50, 'Cognome cannot exceed 50 characters']
    },
    dataNascita: {
        type: String,
        required: [true, 'Data di nascita is required'],
        validate: {
            validator: function (v) {
                // Validate date format (YYYY-MM-DD)
                return /^\d{4}-\d{2}-\d{2}$/.test(v);
            },
            message: 'Data di nascita must be in YYYY-MM-DD format'
        }
    },
    cittaNascita: {
        type: String,
        required: [true, 'Città di nascita is required'],
        trim: true,
        maxlength: [100, 'Città di nascita cannot exceed 100 characters']
    },
    provinciaNascita: {
        type: String,
        required: [true, 'Provincia di nascita is required'],
        trim: true,
        maxlength: [2, 'Provincia di nascita cannot exceed 2 characters'],
        uppercase: true
    },
    genere: {
        type: String,
        required: [true, 'Genere is required'],
        enum: {
            values: ['M', 'F', 'A'],
            message: 'Genere must be M, F, or A'
        }
    },
    codiceFiscale: {
        type: String,
        required: [true, 'Codice fiscale is required'],
        trim: true,
        uppercase: true,
        unique: true,
        minlength: [16, 'Codice fiscale must be exactly 16 characters'],
        maxlength: [16, 'Codice fiscale must be exactly 16 characters'],
        validate: {
            validator: function (v) {
                // Basic Italian fiscal code validation
                return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(v);
            },
            message: 'Invalid codice fiscale format'
        }
    },
    indirizzo: {
        type: String,
        required: [true, 'Indirizzo is required'],
        trim: true,
        maxlength: [200, 'Indirizzo cannot exceed 200 characters']
    },
    numeroCivico: {
        type: String,
        required: [true, 'Numero civico is required'],
        trim: true,
        maxlength: [10, 'Numero civico cannot exceed 10 characters']
    },
    citta: {
        type: String,
        required: [true, 'Città is required'],
        trim: true,
        maxlength: [100, 'Città cannot exceed 100 characters']
    },
    provincia: {
        type: String,
        required: [true, 'Provincia is required'],
        trim: true,
        maxlength: [2, 'Provincia cannot exceed 2 characters'],
        uppercase: true
    },
    cap: {
        type: String,
        required: [true, 'CAP is required'],
        trim: true,
        validate: {
            validator: function (v) {
                // Italian postal code validation
                return /^[0-9]{5}$/.test(v);
            },
            message: 'CAP must be exactly 5 digits'
        }
    },
    cellulare: {
        type: String,
        trim: true,
        maxlength: [20, 'Cellulare cannot exceed 20 characters'],
        validate: {
            validator: function (v) {
                // Optional field, but if provided, should be valid
                return !v || /^[\+]?[0-9\s\-\(\)]{8,20}$/.test(v);
            },
            message: 'Invalid cellulare format'
        }
    },
    telefono: {
        type: String,
        trim: true,
        maxlength: [20, 'Telefono cannot exceed 20 characters'],
        validate: {
            validator: function (v) {
                // Optional field, but if provided, should be valid
                return !v || /^[\+]?[0-9\s\-\(\)]{8,20}$/.test(v);
            },
            message: 'Invalid telefono format'
        }
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [100, 'Email cannot exceed 100 characters'],
        validate: {
            validator: function (v) {
                // Optional field, but if provided, should be valid
                return !v || /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: 'Invalid email format'
        }
    },
    stato: {
        type: String,
        required: true,
        enum: {
            values: ['attivo', 'inattivo'],
            message: 'Stato must be either attivo or inattivo'
        },
        default: 'attivo'
    }
}, {
    timestamps: true,
    collection: 'employees'
});
// Indexes for better performance
EmployeeSchema.index({ companyId: 1, codiceFiscale: 1 });
EmployeeSchema.index({ companyId: 1, stato: 1 });
EmployeeSchema.index({ nome: 1, cognome: 1 });
// Virtual for full name
EmployeeSchema.virtual('fullName').get(function () {
    return `${this.nome} ${this.cognome}`;
});
// Ensure virtual fields are serialized
EmployeeSchema.set('toJSON', {
    virtuals: true
});
exports.default = mongoose_1.default.model('Employee', EmployeeSchema);
//# sourceMappingURL=Employee.js.map