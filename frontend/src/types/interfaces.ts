// src/types/interfaces.ts
export interface Account {
  _id: string;
  name: string;
  type: 'proselitismo' | 'servizi';
  balance: number;
  user: string;
  createdAt: string;
  updatedAt: string;
}
export interface AgenteFormData {
  businessName: string;     // Ragione sociale
  vatNumber: string;        // Partita IVA
  address: string;          // Indirizzo
  city: string;             // Città
  postalCode: string;       // CAP
  province: string;         // Provincia
  agreedCommission: number; // Competenze concordate al %
  email?: string;           // Email
  pec?: string;             // PEC
  signedContractFile?: File;
  legalDocumentFile?: File;
}



// Add this to your src/types/interfaces.ts file

export interface Agente {
  isActive: any;
  _id: string;
  businessName: string;     // Ragione sociale
  vatNumber: string;        // Partita IVA
  address: string;          // Indirizzo
  city: string;             // Città
  postalCode: string;       // CAP
  province: string;         // Provincia
  agreedCommission: number; // Competenze concordate al %
  email?: string;           // Email
  pec?: string;             // PEC
  signedContractFileUrl?: string;  // URL del contratto firmato
  legalDocumentFileUrl?: string;   // URL del documento legale
  user: string;             // User ID associato all'agente
  createdAt: string;
  updatedAt: string;
}


export interface Company {
  _id: string;
  name: string;  // Original name field for backward compatibility
  businessName: string;  // Ragione sociale
  companyName: string;   // Nome azienda
  vatNumber: string;     // Partita IVA
  fiscalCode: string;   // Codice Fiscale
  matricola: string;    // Registration number
  inpsCode: string;     // Codice INPS
  address: {
    street: string;
    city: string;
    postalCode: string;
    province: string;
    country: string;
  };
  contactInfo: {
    phoneNumber: string;
    mobile: string;
    email: string;
    pec: string;       // Certified email (PEC)
    referent: string;  // Contact person
  };
  contractDetails: {
    contractType: string;    // Type of contract
    ccnlType: string;        // CCNL applied
    bilateralEntity: string; // Reference bilateral entity
    hasFondoSani: boolean;   // Adhesion to Fondosani
    useEbapPayment: boolean; // EBAP payment method
  };
  industry: string;
  employees: number;
  signaler: string;     // Who reported/registered the company
  actuator: string;     // Implementing entity
  isActive: boolean;
  user: string;          // User ID reference
  createdAt: string;
  updatedAt: string;
}

// Merged CompanyFormData combining both previous definitions
export interface CompanyFormData {
  name?: string;  // Optional original name field
  businessName: string;
  companyName?: string;
  vatNumber: string;
  fiscalCode?: string;
  matricola?: string;
  inpsCode?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
  };
  contactInfo?: {
    phoneNumber?: string;
    mobile?: string;
    email?: string;
    pec?: string;
    referent?: string;
  };
  contractDetails?: {
    contractType?: string;
    ccnlType?: string;
    bilateralEntity?: string;
    hasFondoSani?: boolean;
    useEbapPayment?: boolean;
  };
  industry?: string;
  employees: number;
  signaler?: string;
  actuator?: string;
  isActive: boolean;
}

export interface Project {
  _id: string;
  title: string;
  status: 'requested' | 'inProgress' | 'completed';
  user: string;
  company?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Utility {
  _id: string;
  name: string;
  fileUrl: string;
  type: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  accounts: {
    proselitismo: {
      balance: number
    },
    servizi: {
      balance: number
    }
  },
  statistics: {
    companies: number,
    actuators: number,
    employees: number,
    suppliers: number,
    unreadMessages: number
  },
  projects: {
    requested: number,
    inProgress: number,
    completed: number
  }
}


export type EmployeeStatus = 'attivo' | 'inattivo';


export interface Employee {
  _id: string;
  nome: string;
  cognome: string;
  genere: string;
  dataNascita: string;
  cittaNascita: string;
  provinciaNascita: string;
  codiceFiscale: string;
  indirizzo: string;
  numeroCivico: string;
  citta: string;
  provincia: string;
  cap: string;
  cellulare?: string;
  telefono?: string;
  email?: string;
  stato: EmployeeStatus;
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
}

// Employee form data interface
export interface EmployeeFormData {
  nome: string;
  cognome: string;
  genere: string;
  dataNascita: string;
  cittaNascita: string;
  provinciaNascita: string;
  codiceFiscale: string;
  indirizzo: string;
  numeroCivico: string;
  citta: string;
  provincia: string;
  cap: string;
  cellulare?: string;
  telefono?: string;
  email?: string;
  attivo: boolean;
}

// Create new project form data
export interface ProjectFormData {
  title: string;
  description?: string;
  companyId?: string;
  status: 'requested' | 'inProgress' | 'completed';
}
export interface SportelloLavoroFormData {
  businessName: string;
  vatNumber: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  agreedCommission: number;
  email: string;
  pec: string;
}
export interface SegnalatoreFormData {
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
}
export interface ProcacciatoreFormData {
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
}

export interface FormTemplate {
  _id: string;
  name: string;
  type: 'contract' | 'legal';
  fileName: string;
  originalName: string;
  filePath: string;
  mimetype: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}
