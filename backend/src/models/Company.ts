
import mongoose, { Document, Schema } from "mongoose";

export interface ICompany extends Document {
  businessName: string;  
  companyName: string;   
  vatNumber: string;     
  fiscalCode?: string;   
  matricola?: string;   
  inpsCode?: string;    
  address: {
    street?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
  };
  contactInfo: {
    phoneNumber?: string;
    mobile?: string;
    email?: string;
    pec?: string;      
    referent?: string;  
    laborConsultant?: string; // NEW
    procurer?: string;        // NEW
  };
  contractDetails: {
    contractType?: string;    
    ccnlType?: string;        
    bilateralEntity?: string; 
    hasFondoSani?: boolean;   
    useEbapPayment?: boolean; 
    elavAdhesion?: boolean;        // NEW
    saluteAmicaAdhesion?: string; // NEW
  };
  industry?: string;
  employees?: number;
  signaler?: string;     
  actuator?: string;    
  isActive: boolean;
  
  isApproved: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  pendingApproval: boolean;

  
  territorialManager?: string;     // NEW
  
  user: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
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
      laborConsultant: { type: String, trim: true }, 
      procurer: { type: String, trim: true },      
    },
    contractDetails: {
      contractType: { type: String, trim: true },
      ccnlType: { type: String, trim: true },
      bilateralEntity: { type: String, trim: true },
      hasFondoSani: { type: Boolean, default: false },
      useEbapPayment: { type: Boolean, default: false },
      elavAdhesion: { type: Boolean, default: false },        // NEW
      saluteAmicaAdhesion: { 
    type: String, 
    enum: ["€5.00 Basic", "€12.00 Standard", "€16.00 Premium"], 
    default: "" 
  },
      territorialManager: { type: String, trim: true },
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
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

CompanySchema.index({ user: 1 });
CompanySchema.index({ businessName: 1 });
CompanySchema.index({ vatNumber: 1 }, { unique: true });
CompanySchema.index({ province: 1 });
CompanySchema.index({ isActive: 1 });
CompanySchema.index({ isApproved: 1 });
CompanySchema.index({ pendingApproval: 1 });

const Company = mongoose.model<ICompany>("Company", CompanySchema);
export default Company;