"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSegnalatoriFromExcel = exports.deleteSegnalatore = exports.updateSegnalatore = exports.createSegnalatore = exports.getSegnalatoreById = exports.getSegnalatori = void 0;
const Segnalatore_1 = __importDefault(require("../models/Segnalatore"));
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const xlsx_1 = __importDefault(require("xlsx"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../uploads/segnalatori');
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
        if (file.fieldname === 'file') {
            const validExtensions = /\.xlsx$|\.xls$/i;
            const hasValidExtension = validExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
            if (hasValidExtension) {
                return cb(null, true);
            }
            else {
                return cb(new Error('Only Excel files (.xlsx, .xls) are allowed for bulk upload!'));
            }
        }
        if (file.fieldname === 'contractFile' || file.fieldname === 'idDocumentFile') {
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
    { name: 'contractFile', maxCount: 1 },
    { name: 'idDocumentFile', maxCount: 1 }
]);
const getSegnalatori = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        let query = {};
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            query = { user: req.user._id };
        }
        const segnalatori = await Segnalatore_1.default.find(query).sort({ createdAt: -1 });
        return res.json(segnalatori);
    }
    catch (err) {
        console.error("Get segnalatori error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getSegnalatori = getSegnalatori;
const getSegnalatoreById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const segnalatore = await Segnalatore_1.default.findById(id);
        if (!segnalatore) {
            return res.status(404).json({ error: "Segnalatore not found" });
        }
        if (!['admin', 'super_admin'].includes(req.user.role) && !segnalatore.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        return res.json(segnalatore);
    }
    catch (err) {
        console.error("Get segnalatore error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getSegnalatoreById = getSegnalatoreById;
const createSegnalatore = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        upload(req, res, async (err) => {
            if (err) {
                console.error("File upload error:", err);
                return res.status(400).json({ error: err.message });
            }
            const { firstName, lastName, email, phone, address, city, postalCode, province, taxCode, agreementPercentage, specialization, notes } = req.body;
            const errors = [];
            if (!firstName)
                errors.push("Nome is required");
            if (!lastName)
                errors.push("Cognome is required");
            if (!email)
                errors.push("Email is required");
            if (!address)
                errors.push("Indirizzo is required");
            if (!city)
                errors.push("Città is required");
            if (!postalCode)
                errors.push("CAP is required");
            if (!province)
                errors.push("Provincia is required");
            if (!taxCode)
                errors.push("Codice Fiscale is required");
            if (!agreementPercentage || isNaN(parseFloat(agreementPercentage))) {
                errors.push("Percentuale accordo is required and must be a valid number");
            }
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            try {
                const files = req.files;
                const contractFile = files?.contractFile?.[0];
                const idDocumentFile = files?.idDocumentFile?.[0];
                const newSegnalatore = new Segnalatore_1.default({
                    firstName,
                    lastName,
                    email,
                    phone: phone || '',
                    address,
                    city,
                    postalCode,
                    province,
                    taxCode,
                    agreementPercentage: parseFloat(agreementPercentage),
                    specialization: specialization || '',
                    notes: notes || '',
                    contractFile: contractFile ? {
                        filename: contractFile.filename,
                        originalName: contractFile.originalname,
                        path: contractFile.path,
                        mimetype: contractFile.mimetype,
                        size: contractFile.size
                    } : undefined,
                    idDocumentFile: idDocumentFile ? {
                        filename: idDocumentFile.filename,
                        originalName: idDocumentFile.originalname,
                        path: idDocumentFile.path,
                        mimetype: idDocumentFile.mimetype,
                        size: idDocumentFile.size
                    } : undefined,
                    user: new mongoose_1.default.Types.ObjectId(req.user._id)
                });
                await newSegnalatore.save();
                const DashboardStats = require("../models/Dashboard").default;
                await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { segnalatori: 1 } }, { new: true, upsert: true });
                return res.status(201).json(newSegnalatore);
            }
            catch (saveError) {
                console.error("Create segnalatore error:", saveError);
                if (saveError.code === 11000) {
                    if (saveError.keyPattern && saveError.keyPattern.email) {
                        return res.status(400).json({ error: "Email already exists" });
                    }
                    if (saveError.keyPattern && saveError.keyPattern.taxCode) {
                        return res.status(400).json({ error: "Tax code already exists" });
                    }
                }
                return res.status(500).json({ error: "Server error" });
            }
        });
    }
    catch (err) {
        console.error("Create segnalatore error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.createSegnalatore = createSegnalatore;
const updateSegnalatore = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        upload(req, res, async (err) => {
            if (err) {
                console.error("File upload error:", err);
                return res.status(400).json({ error: err.message });
            }
            const { firstName, lastName, email, phone, address, city, postalCode, province, taxCode, agreementPercentage, specialization, notes, isActive } = req.body;
            const segnalatore = await Segnalatore_1.default.findById(id);
            if (!segnalatore) {
                return res.status(404).json({ error: "Segnalatore not found" });
            }
            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            if (!['admin', 'super_admin'].includes(req.user.role) && !segnalatore.user.equals(req.user._id)) {
                return res.status(403).json({ error: "Access denied" });
            }
            const errors = [];
            if (firstName === '')
                errors.push("Nome cannot be empty");
            if (lastName === '')
                errors.push("Cognome cannot be empty");
            if (email === '')
                errors.push("Email cannot be empty");
            if (address === '')
                errors.push("Indirizzo cannot be empty");
            if (city === '')
                errors.push("Città cannot be empty");
            if (postalCode === '')
                errors.push("CAP cannot be empty");
            if (province === '')
                errors.push("Provincia cannot be empty");
            if (taxCode === '')
                errors.push("Codice Fiscale cannot be empty");
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }
            try {
                const files = req.files;
                const contractFile = files?.contractFile?.[0];
                const idDocumentFile = files?.idDocumentFile?.[0];
                if (firstName !== undefined)
                    segnalatore.firstName = firstName;
                if (lastName !== undefined)
                    segnalatore.lastName = lastName;
                if (email !== undefined)
                    segnalatore.email = email;
                if (phone !== undefined)
                    segnalatore.phone = phone;
                if (address !== undefined)
                    segnalatore.address = address;
                if (city !== undefined)
                    segnalatore.city = city;
                if (postalCode !== undefined)
                    segnalatore.postalCode = postalCode;
                if (province !== undefined)
                    segnalatore.province = province;
                if (taxCode !== undefined)
                    segnalatore.taxCode = taxCode;
                if (agreementPercentage !== undefined)
                    segnalatore.agreementPercentage = parseFloat(agreementPercentage);
                if (specialization !== undefined)
                    segnalatore.specialization = specialization;
                if (notes !== undefined)
                    segnalatore.notes = notes;
                if (isActive !== undefined)
                    segnalatore.isActive = Boolean(isActive);
                if (contractFile) {
                    segnalatore.contractFile = {
                        filename: contractFile.filename,
                        originalName: contractFile.originalname,
                        path: contractFile.path,
                        mimetype: contractFile.mimetype,
                        size: contractFile.size
                    };
                }
                if (idDocumentFile) {
                    segnalatore.idDocumentFile = {
                        filename: idDocumentFile.filename,
                        originalName: idDocumentFile.originalname,
                        path: idDocumentFile.path,
                        mimetype: idDocumentFile.mimetype,
                        size: idDocumentFile.size
                    };
                }
                await segnalatore.save();
                return res.json(segnalatore);
            }
            catch (updateError) {
                console.error("Update segnalatore error:", updateError);
                if (updateError.code === 11000) {
                    if (updateError.keyPattern && updateError.keyPattern.email) {
                        return res.status(400).json({ error: "Email already exists" });
                    }
                    if (updateError.keyPattern && updateError.keyPattern.taxCode) {
                        return res.status(400).json({ error: "Tax code already exists" });
                    }
                }
                return res.status(500).json({ error: "Server error" });
            }
        });
    }
    catch (err) {
        console.error("Update segnalatore error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.updateSegnalatore = updateSegnalatore;
const deleteSegnalatore = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const segnalatore = await Segnalatore_1.default.findById(id);
        if (!segnalatore) {
            return res.status(404).json({ error: "Segnalatore not found" });
        }
        if (!['admin', 'super_admin'].includes(req.user.role) && !segnalatore.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        if (segnalatore.contractFile?.path && fs_1.default.existsSync(segnalatore.contractFile.path)) {
            fs_1.default.unlinkSync(segnalatore.contractFile.path);
        }
        if (segnalatore.idDocumentFile?.path && fs_1.default.existsSync(segnalatore.idDocumentFile.path)) {
            fs_1.default.unlinkSync(segnalatore.idDocumentFile.path);
        }
        await segnalatore.deleteOne();
        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { segnalatori: -1 } }, { new: true });
        return res.json({ message: "Segnalatore deleted successfully" });
    }
    catch (err) {
        console.error("Delete segnalatore error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteSegnalatore = deleteSegnalatore;
const uploadSegnalatoriFromExcel = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
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
                const workbook = xlsx_1.default.readFile(file.path);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = xlsx_1.default.utils.sheet_to_json(worksheet);
                console.log("Excel data parsed. Row count:", data.length);
                console.log("Sample row:", data.length > 0 ? JSON.stringify(data[0]) : "No data");
                if (!data || data.length === 0) {
                    fs_1.default.unlinkSync(file.path);
                    return res.status(400).json({ error: "Excel file has no data" });
                }
                if (!req.user) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                const segnalatori = [];
                const errors = [];
                for (const [index, row] of data.entries()) {
                    try {
                        console.log(`Processing row ${index + 1}:`, JSON.stringify(row));
                        const segnalatoreData = {
                            firstName: row['Nome'] || '',
                            lastName: row['Cognome'] || '',
                            email: row['Email'] || '',
                            phone: row['Telefono'] || '',
                            address: row['Indirizzo'] || '',
                            city: row['Città'] || row['Citta\''] || '',
                            postalCode: row['CAP'] || '',
                            province: row['Provincia'] || '',
                            taxCode: row['Codice Fiscale'] || '',
                            agreementPercentage: parseFloat(String(row['Percentuale Accordo'] || '0')) || 0,
                            specialization: row['Specializzazione'] || '',
                            notes: row['Note'] || '',
                            user: req.user._id
                        };
                        if (!segnalatoreData.firstName) {
                            throw new Error("Nome is required");
                        }
                        if (!segnalatoreData.lastName) {
                            throw new Error("Cognome is required");
                        }
                        if (!segnalatoreData.email) {
                            throw new Error("Email is required");
                        }
                        if (!segnalatoreData.address) {
                            throw new Error("Indirizzo is required");
                        }
                        if (!segnalatoreData.city) {
                            throw new Error("Città is required");
                        }
                        if (!segnalatoreData.postalCode) {
                            throw new Error("CAP is required");
                        }
                        if (!segnalatoreData.province) {
                            throw new Error("Provincia is required");
                        }
                        if (!segnalatoreData.taxCode) {
                            throw new Error("Codice Fiscale is required");
                        }
                        if (!segnalatoreData.agreementPercentage || segnalatoreData.agreementPercentage <= 0) {
                            throw new Error("Percentuale Accordo is required and must be greater than 0");
                        }
                        console.log(`Saving segnalatore: ${segnalatoreData.firstName} ${segnalatoreData.lastName}`);
                        const segnalatoreRecord = new Segnalatore_1.default(segnalatoreData);
                        await segnalatoreRecord.save();
                        segnalatori.push(segnalatoreRecord);
                        console.log(`Segnalatore saved successfully: ${segnalatoreRecord._id}`);
                    }
                    catch (rowError) {
                        console.error(`Error processing row ${index + 2}:`, rowError);
                        errors.push(`Row ${index + 2}: ${rowError.message}`);
                    }
                }
                fs_1.default.unlinkSync(file.path);
                console.log("Uploaded file cleaned up");
                if (segnalatori.length > 0) {
                    const DashboardStats = require("../models/Dashboard").default;
                    await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { segnalatori: segnalatori.length } }, { new: true, upsert: true });
                    console.log("Dashboard stats updated");
                }
                console.log(`Import complete: ${segnalatori.length} segnalatori created, ${errors.length} errors`);
                return res.status(201).json({
                    message: `${segnalatori.length} segnalatori imported successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
                    segnalatori,
                    errors: errors.length > 0 ? errors : undefined
                });
            }
            catch (processError) {
                if (file && fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
                console.error("Excel processing error:", processError);
                return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
            }
        });
    }
    catch (err) {
        console.error("Upload segnalatori error:", err);
        return res.status(500).json({ error: "Server error: " + err.message });
    }
};
exports.uploadSegnalatoriFromExcel = uploadSegnalatoriFromExcel;
//# sourceMappingURL=segnalatoreController.js.map
