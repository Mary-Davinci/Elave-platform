
import mongoose, { Document, Schema } from 'mongoose';

interface FileInfo {
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
}

// Agente interface
export interface IAgenteDocument extends Document {
  businessName: string;        
  vatNumber: string;         
  address: string;           
  city: string;              
  postalCode: string;      
  province: string;          
  agreedCommission: number;   
  email?: string;           
  pec?: string;               
  signedContractFile?: FileInfo;     
  legalDocumentFile?: FileInfo;      
  user: mongoose.Types.ObjectId;    
  createdAt: Date;
  updatedAt: Date;
  isApproved: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  pendingApproval: boolean;
  isActive: boolean;
}

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
   isApproved: {
    type: Boolean,
    default: false,
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
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
  toObject: { virtuals: true },
  collection: 'agenti',   
});


AgenteSchema.index({ user: 1, vatNumber: 1 });

AgenteSchema.index({ 
  businessName: 'text', 
  vatNumber: 'text', 
  city: 'text',
  email: 'text'
});


AgenteSchema.pre('save', function(next) {
  if (this.vatNumber) {
    this.vatNumber = this.vatNumber.replace(/\s/g, '').toUpperCase();
  }
  next();
});
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


AgenteSchema.methods.getFullAddress = function() {
  return `${this.address}, ${this.city} ${this.postalCode} (${this.province})`;
};

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