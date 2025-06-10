// src/models/Agente.ts
import mongoose, { Document, Schema } from 'mongoose';

// File interface for uploaded documents
interface FileInfo {
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
}

// Agente interface
export interface IAgenteDocument extends Document {
  businessName: string;        // Ragione sociale
  vatNumber: string;          // Partita IVA
  address: string;            // Indirizzo
  city: string;               // Città
  postalCode: string;         // CAP
  province: string;           // Provincia
  agreedCommission: number;   // Competenze concordate al %
  email?: string;             // Email
  pec?: string;               // PEC
  signedContractFile?: FileInfo;     // Contratto firmato
  legalDocumentFile?: FileInfo;      // Documento legale rappresentante
  user: mongoose.Types.ObjectId;    // User reference
  createdAt: Date;
  updatedAt: Date;
}

// File schema for uploaded documents
const FileInfoSchema = new Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true }
}, { _id: false });

// Agente schema
const AgenteSchema = new Schema({
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
  email: { 
    type: String, 
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
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
      validator: function(v: string) {
        return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid PEC email'
    }
  },
  signedContractFile: FileInfoSchema,
  legalDocumentFile: FileInfoSchema,
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
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
AgenteSchema.index({ user: 1, vatNumber: 1 });

// Add text index for search functionality
AgenteSchema.index({ 
  businessName: 'text', 
  vatNumber: 'text', 
  city: 'text',
  email: 'text'
});

// Pre-save middleware to ensure VAT number format
AgenteSchema.pre('save', function(next) {
  if (this.vatNumber) {
    // Remove spaces and convert to uppercase for consistency
    this.vatNumber = this.vatNumber.replace(/\s/g, '').toUpperCase();
  }
  next();
});

// Static methods
AgenteSchema.statics.findByUser = function(userId: string) {
  return this.find({ user: userId }).sort({ createdAt: -1 });
};

AgenteSchema.statics.findByVatNumber = function(vatNumber: string, userId?: string) {
  const query: any = { vatNumber: vatNumber.replace(/\s/g, '').toUpperCase() };
  if (userId) {
    query.user = userId;
  }
  return this.findOne(query);
};

// Instance methods
AgenteSchema.methods.getFullAddress = function() {
  return `${this.address}, ${this.city} ${this.postalCode} (${this.province})`;
};

// Error handling for duplicate VAT number
AgenteSchema.post('save', function(error: any, doc: any, next: any) {
  if (error.name === 'MongoError' && error.code === 11000) {
    if (error.keyPattern && error.keyPattern.vatNumber) {
      next(new Error('VAT number already exists'));
    } else {
      next(error);
    }
  } else {
    next(error);
  }
});

const Agente = mongoose.model<IAgenteDocument>('Agente', AgenteSchema);

export default Agente;