// src/controllers/supplierController.ts
import { Request, Response } from "express";
import Supplier from "../models/Supplier";
import { CustomRequestHandler } from "../types/express";
import mongoose from "mongoose";

// Get all suppliers for the authenticated user
export const getSuppliers: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Base query
    let query: any = {};
    
    // Regular users can only see their own suppliers
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }

    const suppliers = await Supplier.find(query).sort({ ragioneSociale: 1 });

    return res.json(suppliers);
  } catch (error: any) {
    console.error("Get suppliers error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get a single supplier by ID
export const getSupplierById: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    
    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Regular users can only access their own suppliers
    if (req.user.role !== 'admin' && !supplier.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(supplier);
  } catch (error: any) {
    console.error("Get supplier error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Create a new supplier
export const createSupplier: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { 
      ragioneSociale, 
      indirizzo,
      citta,
      cap,
      provincia,
      partitaIva,
      codiceFiscale,
      referente,
      cellulare,
      telefono,
      email,
      pec
    } = req.body;

    // Validate required fields
    const errors: string[] = [];
    if (!ragioneSociale) errors.push("Ragione sociale is required");
    if (!indirizzo) errors.push("Indirizzo is required");
    if (!citta) errors.push("Città is required");
    if (!cap) errors.push("CAP is required");
    if (!provincia) errors.push("Provincia is required");
    if (!partitaIva) errors.push("Partita IVA is required");
    if (!referente) errors.push("Referente is required");
    if (!cellulare) errors.push("Cellulare is required");
    if (!email) errors.push("Email is required");
    
    // If there are validation errors, return them
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Create the new supplier
    const newSupplier = new Supplier({
      ragioneSociale, 
      indirizzo,
      citta,
      cap,
      provincia,
      partitaIva,
      codiceFiscale,
      referente,
      cellulare,
      telefono,
      email,
      pec,
      user: new mongoose.Types.ObjectId(req.user._id) // Associate supplier with the current user
    });

    await newSupplier.save();

    // Update dashboard stats
    const DashboardStats = require("../models/Dashboard").default;
    await DashboardStats.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { suppliers: 1 } },
      { new: true, upsert: true }
    );

    return res.status(201).json(newSupplier);
  } catch (error: any) {
    console.error("Create supplier error:", error);
    
    // Handle duplicate Partita IVA error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.partitaIva) {
      return res.status(400).json({ error: "Partita IVA already exists" });
    }
    
    return res.status(500).json({ error: "Server error" });
  }
};

// Update a supplier
export const updateSupplier: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const { 
      ragioneSociale, 
      indirizzo,
      citta,
      cap,
      provincia,
      partitaIva,
      codiceFiscale,
      referente,
      cellulare,
      telefono,
      email,
      pec
    } = req.body;

    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Regular users can only update their own suppliers
    if (req.user.role !== 'admin' && !supplier.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update fields
    if (ragioneSociale) supplier.ragioneSociale = ragioneSociale;
    if (indirizzo) supplier.indirizzo = indirizzo;
    if (citta) supplier.citta = citta;
    if (cap) supplier.cap = cap;
    if (provincia) supplier.provincia = provincia;
    if (partitaIva) supplier.partitaIva = partitaIva;
    if (codiceFiscale !== undefined) supplier.codiceFiscale = codiceFiscale;
    if (referente) supplier.referente = referente;
    if (cellulare) supplier.cellulare = cellulare;
    if (telefono !== undefined) supplier.telefono = telefono;
    if (email) supplier.email = email;
    if (pec !== undefined) supplier.pec = pec;

    await supplier.save();

    return res.json(supplier);
  } catch (error: any) {
    console.error("Update supplier error:", error);
    
    // Handle duplicate Partita IVA error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.partitaIva) {
      return res.status(400).json({ error: "Partita IVA already exists" });
    }
    
    return res.status(500).json({ error: "Server error" });
  }
};

// Delete a supplier
export const deleteSupplier: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Regular users can only delete their own suppliers
    if (req.user.role !== 'admin' && !supplier.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    await supplier.deleteOne();

    // Update dashboard stats
    const DashboardStats = require("../models/Dashboard").default;
    await DashboardStats.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { suppliers: -1 } },
      { new: true }
    );

    return res.json({ message: "Supplier deleted successfully" });
  } catch (error: any) {
    console.error("Delete supplier error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};