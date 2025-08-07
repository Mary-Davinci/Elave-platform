import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  nome: string;
  cognome: string;
  dataNascita: string;
  cittaNascita: string;
  provinciaNascita: string;
  genere: 'M' | 'F' | 'A';
  codiceFiscale: string;
  indirizzo: string;
  numeroCivico: string;
  citta: string;
  provincia: string;
  cap: string;
  cellulare?: string;
  telefono?: string;
  email?: string;
  stato: 'attivo' | 'inattivo';
  createdAt?: Date;
  updatedAt?: Date;
}

const EmployeeSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
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
      validator: function(v: string) {
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
      validator: function(v: string) {
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
      validator: function(v: string) {
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
      validator: function(v: string) {
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
      validator: function(v: string) {
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
      validator: function(v: string) {
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
EmployeeSchema.virtual('fullName').get(function() {
  return `${this.nome} ${this.cognome}`;
});

// Ensure virtual fields are serialized
EmployeeSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model<IEmployee>('Employee', EmployeeSchema);