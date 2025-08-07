import mongoose, { Document, Schema } from 'mongoose';

interface FileInfo {
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
}


export interface ISegnalatoreDocument extends Document {
  firstName: string;          
  lastName: string;            
  email: string;               
  phone?: string;             
  address: string;            
  city: string;                
  postalCode: string;          
  province: string;            
  taxCode: string;             
  agreementPercentage: number; 
  specialization?: string;     
  notes?: string;              
  contractFile?: FileInfo;    
  idDocumentFile?: FileInfo;   
  user: mongoose.Types.ObjectId; 
  isActive: boolean;          
  createdAt: Date;
  updatedAt: Date;
}


const FileInfoSchema = new Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true }
}, { _id: false });


const SegnalatoreSchema = new Schema({
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
      validator: function(v: string) {
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


SegnalatoreSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});


SegnalatoreSchema.index({ user: 1, email: 1 });
SegnalatoreSchema.index({ user: 1, taxCode: 1 });


SegnalatoreSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  email: 'text',
  city: 'text',
  taxCode: 'text'
});


SegnalatoreSchema.pre('save', function(next) {
  if (this.taxCode) {
    this.taxCode = this.taxCode.replace(/\s/g, '').toUpperCase();
  }
  next();
});

SegnalatoreSchema.statics.findByUser = function(userId: string) {
  return this.find({ user: userId }).sort({ createdAt: -1 });
};

SegnalatoreSchema.statics.findByTaxCode = function(taxCode: string, userId?: string) {
  const query: any = { taxCode: taxCode.replace(/\s/g, '').toUpperCase() };
  if (userId) {
    query.user = userId;
  }
  return this.findOne(query);
};

SegnalatoreSchema.methods.getFullAddress = function() {
  return `${this.address}, ${this.city} ${this.postalCode} (${this.province})`;
};

const Segnalatore = mongoose.model<ISegnalatoreDocument>('Segnalatore', SegnalatoreSchema);

export default Segnalatore;