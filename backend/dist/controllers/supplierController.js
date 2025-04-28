"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = exports.getSupplierById = exports.getSuppliers = void 0;
const Supplier_1 = __importDefault(require("../models/Supplier"));
const mongoose_1 = __importDefault(require("mongoose"));
// Get all suppliers for the authenticated user
const getSuppliers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Base query
        let query = {};
        // Regular users can only see their own suppliers
        if (req.user.role !== 'admin') {
            query.user = req.user._id;
        }
        const suppliers = await Supplier_1.default.find(query).sort({ ragioneSociale: 1 });
        return res.json(suppliers);
    }
    catch (error) {
        console.error("Get suppliers error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getSuppliers = getSuppliers;
// Get a single supplier by ID
const getSupplierById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const supplier = await Supplier_1.default.findById(id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }
        // Regular users can only access their own suppliers
        if (req.user.role !== 'admin' && !supplier.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        return res.json(supplier);
    }
    catch (error) {
        console.error("Get supplier error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getSupplierById = getSupplierById;
// Create a new supplier
const createSupplier = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { ragioneSociale, indirizzo, citta, cap, provincia, partitaIva, codiceFiscale, referente, cellulare, telefono, email, pec } = req.body;
        // Validate required fields
        const errors = [];
        if (!ragioneSociale)
            errors.push("Ragione sociale is required");
        if (!indirizzo)
            errors.push("Indirizzo is required");
        if (!citta)
            errors.push("Città is required");
        if (!cap)
            errors.push("CAP is required");
        if (!provincia)
            errors.push("Provincia is required");
        if (!partitaIva)
            errors.push("Partita IVA is required");
        if (!referente)
            errors.push("Referente is required");
        if (!cellulare)
            errors.push("Cellulare is required");
        if (!email)
            errors.push("Email is required");
        // If there are validation errors, return them
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        // Create the new supplier
        const newSupplier = new Supplier_1.default({
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
            user: new mongoose_1.default.Types.ObjectId(req.user._id) // Associate supplier with the current user
        });
        await newSupplier.save();
        // Update dashboard stats
        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { suppliers: 1 } }, { new: true, upsert: true });
        return res.status(201).json(newSupplier);
    }
    catch (error) {
        console.error("Create supplier error:", error);
        // Handle duplicate Partita IVA error
        if (error.code === 11000 && error.keyPattern && error.keyPattern.partitaIva) {
            return res.status(400).json({ error: "Partita IVA already exists" });
        }
        return res.status(500).json({ error: "Server error" });
    }
};
exports.createSupplier = createSupplier;
// Update a supplier
const updateSupplier = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const { ragioneSociale, indirizzo, citta, cap, provincia, partitaIva, codiceFiscale, referente, cellulare, telefono, email, pec } = req.body;
        const supplier = await Supplier_1.default.findById(id);
        if (!supplier) {
            return res.status(404).json({ error: "Supplier not found" });
        }
        // Regular users can only update their own suppliers
        if (req.user.role !== 'admin' && !supplier.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Update fields
        if (ragioneSociale)
            supplier.ragioneSociale = ragioneSociale;
        if (indirizzo)
            supplier.indirizzo = indirizzo;
        if (citta)
            supplier.citta = citta;
        if (cap)
            supplier.cap = cap;
        if (provincia)
            supplier.provincia = provincia;
        if (partitaIva)
            supplier.partitaIva = partitaIva;
        if (codiceFiscale !== undefined)
            supplier.codiceFiscale = codiceFiscale;
        if (referente)
            supplier.referente = referente;
        if (cellulare)
            supplier.cellulare = cellulare;
        if (telefono !== undefined)
            supplier.telefono = telefono;
        if (email)
            supplier.email = email;
        if (pec !== undefined)
            supplier.pec = pec;
        await supplier.save();
        return res.json(supplier);
    }
    catch (error) {
        console.error("Update supplier error:", error);
        // Handle duplicate Partita IVA error
        if (error.code === 11000 && error.keyPattern && error.keyPattern.partitaIva) {
            return res.status(400).json({ error: "Partita IVA already exists" });
        }
        return res.status(500).json({ error: "Server error" });
    }
};
exports.updateSupplier = updateSupplier;
// Delete a supplier
const deleteSupplier = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const supplier = await Supplier_1.default.findById(id);
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
        await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { suppliers: -1 } }, { new: true });
        return res.json({ message: "Supplier deleted successfully" });
    }
    catch (error) {
        console.error("Delete supplier error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteSupplier = deleteSupplier;
//# sourceMappingURL=supplierController.js.map