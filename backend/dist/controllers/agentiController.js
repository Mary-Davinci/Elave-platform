"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAgentiFromExcel = exports.deleteAgente = exports.updateAgente = exports.createAgente = exports.getAgenteById = exports.getAgenti = void 0;
const Agenti_1 = __importDefault(require("../models/Agenti"));
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const xlsx_1 = __importDefault(require("xlsx"));
// Set up multer for file uploads with support for contract and legal documents
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../uploads/agenti');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        console.log("File upload attempt:", {
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype,
            extension: path_1.default.extname(file.originalname).toLowerCase()
        });
        // For Excel uploads
        if (file.fieldname === 'file') {
            const validExtensions = /\.xlsx$|\.xls$/i;
            const hasValidExtension = validExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
            const validMimeTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'application/excel',
                'application/x-excel',
                'application/x-msexcel'
            ];
            const hasValidMimeType = validMimeTypes.includes(file.mimetype);
            if (hasValidExtension) {
                return cb(null, true);
            }
            else {
                return cb(new Error('Only Excel files (.xlsx, .xls) are allowed for bulk upload!'));
            }
        }
        // For document uploads (contracts and legal documents)
        if (file.fieldname === 'signedContractFile' || file.fieldname === 'legalDocumentFile') {
            const validExtensions = /\.pdf$|\.doc$|\.docx$|\.jpg$|\.jpeg$|\.png$/i;
            const hasValidExtension = validExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
            if (hasValidExtension) {
                return cb(null, true);
            }
            else {
                return cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed for documents!'));
            }
        }
        cb(new Error('Invalid file field'));
    }
}).fields([
    { name: 'file', maxCount: 1 },
    { name: 'signedContractFile', maxCount: 1 },
    { name: 'legalDocumentFile', maxCount: 1 }
]);
// Get all agents for the authenticated user
const getAgenti = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        let query = {};
        // Regular users can only see their own agents
        if (req.user.role !== 'admin') {
            query = { user: req.user._id };
        }
        const agenti = await Agenti_1.default.find(query).sort({ createdAt: -1 });
        return res.json(agenti);
    }
    catch (err) {
        console.error("Get agenti error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getAgenti = getAgenti;
// Get a single agent by ID
const getAgenteById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const agente = await Agenti_1.default.findById(id);
        if (!agente) {
            return res.status(404).json({ error: "Agente not found" });
        }
        // Regular users can only access their own agents
        if (req.user.role !== 'admin' && !agente.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        return res.json(agente);
    }
    catch (err) {
        console.error("Get agente error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getAgenteById = getAgenteById;
// Create a new agent
const createAgente = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Handle file uploads
        upload(req, res, async (err) => {
            if (err) {
                console.error("File upload error:", err);
                return res.status(400).json({ error: err.message });
            }
            const { businessName, vatNumber, address, city, postalCode, province, agreedCommission, email, pec } = req.body;
            // Validate required fields
            const errors = [];
            if (!businessName)
                errors.push("Ragione Sociale is required");
            if (!vatNumber)
                errors.push("Partita IVA is required");
            if (!address)
                errors.push("Indirizzo is required");
            if (!city)
                errors.push("Città is required");
            if (!postalCode)
                errors.push("CAP is required");
            if (!province)
                errors.push("Provincia is required");
            if (!agreedCommission || isNaN(parseFloat(agreedCommission))) {
                errors.push("Competenze concordate is required and must be a valid number");
            }
            // If there are validation errors, return them
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }
            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            try {
                // Handle file uploads with proper typing
                const files = req.files;
                const signedContractFile = files?.signedContractFile?.[0];
                const legalDocumentFile = files?.legalDocumentFile?.[0];
                // Create the new agent
                const newAgente = new Agenti_1.default({
                    businessName,
                    vatNumber,
                    address,
                    city,
                    postalCode,
                    province,
                    agreedCommission: parseFloat(agreedCommission),
                    email: email || '',
                    pec: pec || '',
                    signedContractFile: signedContractFile ? {
                        filename: signedContractFile.filename,
                        originalName: signedContractFile.originalname,
                        path: signedContractFile.path,
                        mimetype: signedContractFile.mimetype,
                        size: signedContractFile.size
                    } : undefined,
                    legalDocumentFile: legalDocumentFile ? {
                        filename: legalDocumentFile.filename,
                        originalName: legalDocumentFile.originalname,
                        path: legalDocumentFile.path,
                        mimetype: legalDocumentFile.mimetype,
                        size: legalDocumentFile.size
                    } : undefined,
                    user: new mongoose_1.default.Types.ObjectId(req.user._id)
                });
                await newAgente.save();
                // Update dashboard stats
                const DashboardStats = require("../models/Dashboard").default;
                await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { agenti: 1 } }, { new: true, upsert: true });
                return res.status(201).json(newAgente);
            }
            catch (saveError) {
                console.error("Create agente error:", saveError);
                // Handle duplicate VAT number error
                if (saveError.code === 11000 && saveError.keyPattern && saveError.keyPattern.vatNumber) {
                    return res.status(400).json({ error: "VAT number already exists" });
                }
                return res.status(500).json({ error: "Server error" });
            }
        });
    }
    catch (err) {
        console.error("Create agente error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.createAgente = createAgente;
// Update an agent
const updateAgente = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        // Handle file uploads
        upload(req, res, async (err) => {
            if (err) {
                console.error("File upload error:", err);
                return res.status(400).json({ error: err.message });
            }
            const { businessName, vatNumber, address, city, postalCode, province, agreedCommission, email, pec } = req.body;
            const agente = await Agenti_1.default.findById(id);
            if (!agente) {
                return res.status(404).json({ error: "Agente not found" });
            }
            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            // Regular users can only update their own agents
            if (req.user.role !== 'admin' && !agente.user.equals(req.user._id)) {
                return res.status(403).json({ error: "Access denied" });
            }
            // Validation for required fields
            const errors = [];
            if (businessName === '')
                errors.push("Ragione Sociale cannot be empty");
            if (vatNumber === '')
                errors.push("Partita IVA cannot be empty");
            if (address === '')
                errors.push("Indirizzo cannot be empty");
            if (city === '')
                errors.push("Città cannot be empty");
            if (postalCode === '')
                errors.push("CAP cannot be empty");
            if (province === '')
                errors.push("Provincia cannot be empty");
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }
            try {
                // Handle file uploads with proper typing
                const files = req.files;
                const signedContractFile = files?.signedContractFile?.[0];
                const legalDocumentFile = files?.legalDocumentFile?.[0];
                // Update fields
                if (businessName !== undefined)
                    agente.businessName = businessName;
                if (vatNumber !== undefined)
                    agente.vatNumber = vatNumber;
                if (address !== undefined)
                    agente.address = address;
                if (city !== undefined)
                    agente.city = city;
                if (postalCode !== undefined)
                    agente.postalCode = postalCode;
                if (province !== undefined)
                    agente.province = province;
                if (agreedCommission !== undefined)
                    agente.agreedCommission = parseFloat(agreedCommission);
                if (email !== undefined)
                    agente.email = email;
                if (pec !== undefined)
                    agente.pec = pec;
                // Update files if provided
                if (signedContractFile) {
                    agente.signedContractFile = {
                        filename: signedContractFile.filename,
                        originalName: signedContractFile.originalname,
                        path: signedContractFile.path,
                        mimetype: signedContractFile.mimetype,
                        size: signedContractFile.size
                    };
                }
                if (legalDocumentFile) {
                    agente.legalDocumentFile = {
                        filename: legalDocumentFile.filename,
                        originalName: legalDocumentFile.originalname,
                        path: legalDocumentFile.path,
                        mimetype: legalDocumentFile.mimetype,
                        size: legalDocumentFile.size
                    };
                }
                await agente.save();
                return res.json(agente);
            }
            catch (updateError) {
                console.error("Update agente error:", updateError);
                // Handle duplicate VAT number error
                if (updateError.code === 11000 && updateError.keyPattern && updateError.keyPattern.vatNumber) {
                    return res.status(400).json({ error: "VAT number already exists" });
                }
                return res.status(500).json({ error: "Server error" });
            }
        });
    }
    catch (err) {
        console.error("Update agente error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.updateAgente = updateAgente;
// Delete an agent
const deleteAgente = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const agente = await Agenti_1.default.findById(id);
        if (!agente) {
            return res.status(404).json({ error: "Agente not found" });
        }
        // Regular users can only delete their own agents
        if (req.user.role !== 'admin' && !agente.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Delete associated files
        if (agente.signedContractFile?.path && fs_1.default.existsSync(agente.signedContractFile.path)) {
            fs_1.default.unlinkSync(agente.signedContractFile.path);
        }
        if (agente.legalDocumentFile?.path && fs_1.default.existsSync(agente.legalDocumentFile.path)) {
            fs_1.default.unlinkSync(agente.legalDocumentFile.path);
        }
        await agente.deleteOne();
        // Update dashboard stats
        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { agenti: -1 } }, { new: true });
        return res.json({ message: "Agente deleted successfully" });
    }
    catch (err) {
        console.error("Delete agente error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteAgente = deleteAgente;
// Upload agents from Excel file
const uploadAgentiFromExcel = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Handle file upload using multer
        upload(req, res, async (err) => {
            if (err) {
                console.error("File upload error:", err);
                return res.status(400).json({ error: err.message });
            }
            const files = req.files;
            const file = files?.file?.[0];
            if (!file) {
                return res.status(400).json({ error: "No file provided" });
            }
            try {
                console.log("File uploaded successfully:", file.path);
                // Read Excel file
                const workbook = xlsx_1.default.readFile(file.path);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = xlsx_1.default.utils.sheet_to_json(worksheet);
                console.log("Excel data parsed. Row count:", data.length);
                console.log("Sample row:", data.length > 0 ? JSON.stringify(data[0]) : "No data");
                if (!data || data.length === 0) {
                    // Clean up the uploaded file
                    fs_1.default.unlinkSync(file.path);
                    return res.status(400).json({ error: "Excel file has no data" });
                }
                if (!req.user) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                // Process agents
                const agenti = [];
                const errors = [];
                for (const [index, row] of data.entries()) {
                    try {
                        console.log(`Processing row ${index + 1}:`, JSON.stringify(row));
                        // Map Excel columns to agent fields
                        const agenteData = {
                            businessName: row['Ragione Sociale'] || '',
                            vatNumber: row['Partita IVA'] || '',
                            address: row['Indirizzo'] || '',
                            city: row['Città'] || row['Citta\''] || '',
                            postalCode: row['CAP'] || '',
                            province: row['Provincia'] || '',
                            agreedCommission: parseFloat(String(row['Competenze concordate al %'] || '0')) || 0,
                            email: row['Email'] || '',
                            pec: row['PEC'] || '',
                            user: req.user._id
                        };
                        // Validate required fields
                        if (!agenteData.businessName) {
                            throw new Error("Ragione Sociale is required");
                        }
                        if (!agenteData.vatNumber) {
                            throw new Error("Partita IVA is required");
                        }
                        if (!agenteData.address) {
                            throw new Error("Indirizzo is required");
                        }
                        if (!agenteData.city) {
                            throw new Error("Città is required");
                        }
                        if (!agenteData.postalCode) {
                            throw new Error("CAP is required");
                        }
                        if (!agenteData.province) {
                            throw new Error("Provincia is required");
                        }
                        if (!agenteData.agreedCommission || agenteData.agreedCommission <= 0) {
                            throw new Error("Competenze concordate is required and must be greater than 0");
                        }
                        console.log(`Saving agente: ${agenteData.businessName}`);
                        // Create and save agent
                        const agente = new Agenti_1.default(agenteData);
                        await agente.save();
                        agenti.push(agente);
                        console.log(`Agente saved successfully: ${agente._id}`);
                    }
                    catch (rowError) {
                        console.error(`Error processing row ${index + 2}:`, rowError);
                        errors.push(`Row ${index + 2}: ${rowError.message}`);
                    }
                }
                // Clean up the uploaded file
                fs_1.default.unlinkSync(file.path);
                console.log("Uploaded file cleaned up");
                // Update dashboard stats if any agent was created
                if (agenti.length > 0) {
                    const DashboardStats = require("../models/Dashboard").default;
                    await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { agenti: agenti.length } }, { new: true, upsert: true });
                    console.log("Dashboard stats updated");
                }
                // Return response
                console.log(`Import complete: ${agenti.length} agenti created, ${errors.length} errors`);
                return res.status(201).json({
                    message: `${agenti.length} agenti imported successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
                    agenti,
                    errors: errors.length > 0 ? errors : undefined
                });
            }
            catch (processError) {
                // Clean up the uploaded file
                if (file && fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
                console.error("Excel processing error:", processError);
                return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
            }
        });
    }
    catch (err) {
        console.error("Upload agenti error:", err);
        return res.status(500).json({ error: "Server error: " + err.message });
    }
};
exports.uploadAgentiFromExcel = uploadAgentiFromExcel;
//# sourceMappingURL=agentiController.js.map