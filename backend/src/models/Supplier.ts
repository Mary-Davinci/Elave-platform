// src/models/Supplier.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ISupplier extends Document {
  ragioneSociale: string;
  indirizzo: string;
  citta: string;
  cap: string;
  provincia: string;
  partitaIva: string;
  codiceFiscale?: string;
  referente: string;
  cellulare: string;
  telefono?: string;
  email: string;
  pec?: string;
  user: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    ragioneSociale: {
      type: String,
      required: true,
      trim: true,
    },
    indirizzo: {
      type: String,
      required: true,
      trim: true,
    },
    citta: {
      type: String,
      required: true,
      trim: true,
    },
    cap: {
      type: String,
      required: true,
      trim: true,
    },
    provincia: {
      type: String,
      required: true,
      trim: true,
    },
    partitaIva: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    codiceFiscale: {
      type: String,
      trim: true,
    },
    referente: {
      type: String,
      required: true,
      trim: true,
    },
    cellulare: {
      type: String,
      required: true,
      trim: true,
    },
    telefono: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    pec: {
      type: String,
      trim: true,
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

// Add indexes for faster queries
SupplierSchema.index({ user: 1 });
SupplierSchema.index({ ragioneSociale: 1 });
SupplierSchema.index({ partitaIva: 1 }, { unique: true });
SupplierSchema.index({ provincia: 1 });

const Supplier = mongoose.model<ISupplier>("Supplier", SupplierSchema);
export default Supplier;