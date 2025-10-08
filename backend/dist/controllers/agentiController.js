"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAgentiFromExcel = exports.getAgentiMinimal = exports.deleteAgente = exports.updateAgente = exports.createAgente = exports.getAgenteById = exports.getAgenti = void 0;
const Agenti_1 = __importDefault(require("../models/Agenti")); // uses the SportelloLavoro model
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const xlsx_1 = __importDefault(require("xlsx"));
const User_1 = __importDefault(require("../models/User"));
const isPrivileged = (role) => role === 'admin' || role === 'super_admin';
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
const toId = (v) => new mongoose_1.default.Types.ObjectId(String(v));
/** Build scope for non-admins based on managedBy hierarchy */
async function getScopeUserIds(currentUserId, role) {
    if (isPrivileged(role))
        return null; // GLOBAL for admins/super_admins
    const scope = new Set([currentUserId.toString()]);
    // direct reports
    const direct = await User_1.default.find({ managedBy: currentUserId }, { _id: 1 }).lean();
    const directIds = direct.map(u => u._id);
    directIds.forEach(id => scope.add(id.toString()));
    // responsabile: include reports of reports
    if (role === 'responsabile_territoriale' && directIds.length) {
        const second = await User_1.default.find({ managedBy: { $in: directIds } }, { _id: 1 }).lean();
        second.forEach(u => scope.add(String(u._id)));
    }
    return Array.from(scope).map(toId);
}
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'file') {
            const validExtensions = /\.xlsx$|\.xls$/i;
            const hasValidExtension = validExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
            if (hasValidExtension)
                return cb(null, true);
            return cb(new Error('Only Excel files (.xlsx, .xls) are allowed for bulk upload!'));
        }
        if (file.fieldname === 'signedContractFile' || file.fieldname === 'legalDocumentFile') {
            const validExtensions = /\.pdf$|\.doc$|\.docx$|\.jpg$|\.jpeg$|\.png$/i;
            const hasValidExtension = validExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
            if (hasValidExtension)
                return cb(null, true);
            return cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed for documents!'));
        }
        cb(new Error('Invalid file field'));
    }
}).fields([
    { name: 'file', maxCount: 1 },
    { name: 'signedContractFile', maxCount: 1 },
    { name: 'legalDocumentFile', maxCount: 1 }
]);
const getAgenti = async (req, res) => {
    try {
        const authReq = req;
        const user = authReq.user;
        if (!user)
            return res.status(401).json({ error: "User not authenticated" });
        const scopeIds = await getScopeUserIds(toId(user._id), user.role);
        const filter = !scopeIds ? {} : { user: { $in: scopeIds } };
        const agenti = await Agenti_1.default.find(filter).sort({ createdAt: -1 });
        return res.json(agenti);
    }
    catch (err) {
        console.error("Get agenti error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getAgenti = getAgenti;
const getAgenteById = async (req, res) => {
    try {
        const authReq = req;
        const user = authReq.user;
        if (!user)
            return res.status(401).json({ error: "User not authenticated" });
        const { id } = req.params;
        const agente = await Agenti_1.default.findById(id);
        if (!agente)
            return res.status(404).json({ error: "Agente not found" });
        if (!isPrivileged(user.role)) {
            const scopeIds = await getScopeUserIds(toId(user._id), user.role);
            const inScope = scopeIds?.some(sid => agente.user.equals(sid));
            if (!inScope)
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
const createAgente = async (req, res) => {
    try {
        const authReq = req;
        const user = authReq.user;
        if (!user)
            return res.status(401).json({ error: "User not authenticated" });
        upload(req, res, async (err) => {
            if (err)
                return res.status(400).json({ error: err.message });
            const { businessName, vatNumber, address, city, postalCode, province, agreedCommission, email, pec } = req.body;
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
            if (errors.length > 0)
                return res.status(400).json({ errors });
            try {
                const files = req.files;
                const signedContractFile = files?.signedContractFile?.[0];
                const legalDocumentFile = files?.legalDocumentFile?.[0];
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
                    user: new mongoose_1.default.Types.ObjectId(user._id)
                });
                await newAgente.save();
                const DashboardStats = require("../models/Dashboard").default;
                await DashboardStats.findOneAndUpdate({ user: user._id }, { $inc: { agenti: 1 } }, { new: true, upsert: true });
                return res.status(201).json(newAgente);
            }
            catch (saveError) {
                console.error("Create agente error:", saveError);
                if (saveError.code === 11000 && saveError.keyPattern?.vatNumber) {
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
const updateAgente = async (req, res) => {
    try {
        const authReq = req;
        const user = authReq.user;
        if (!user)
            return res.status(401).json({ error: "User not authenticated" });
        const { id } = req.params;
        upload(req, res, async (err) => {
            if (err)
                return res.status(400).json({ error: err.message });
            const { businessName, vatNumber, address, city, postalCode, province, agreedCommission, email, pec } = req.body;
            const agente = await Agenti_1.default.findById(id);
            if (!agente)
                return res.status(404).json({ error: "Agente not found" });
            if (!isPrivileged(user.role) && !agente.user.equals(user._id)) {
                return res.status(403).json({ error: "Access denied" });
            }
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
            if (errors.length > 0)
                return res.status(400).json({ errors });
            try {
                const files = req.files;
                const signedContractFile = files?.signedContractFile?.[0];
                const legalDocumentFile = files?.legalDocumentFile?.[0];
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
                if (updateError.code === 11000 && updateError.keyPattern?.vatNumber) {
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
const deleteAgente = async (req, res) => {
    try {
        const authReq = req;
        const user = authReq.user;
        if (!user)
            return res.status(401).json({ error: "User not authenticated" });
        const { id } = req.params;
        const agente = await Agenti_1.default.findById(id);
        if (!agente)
            return res.status(404).json({ error: "Agente not found" });
        if (!isPrivileged(user.role) && !agente.user.equals(user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        if (agente.signedContractFile?.path && fs_1.default.existsSync(agente.signedContractFile.path)) {
            fs_1.default.unlinkSync(agente.signedContractFile.path);
        }
        if (agente.legalDocumentFile?.path && fs_1.default.existsSync(agente.legalDocumentFile.path)) {
            fs_1.default.unlinkSync(agente.legalDocumentFile.path);
        }
        await agente.deleteOne();
        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate({ user: user._id }, { $inc: { agenti: -1 } }, { new: true });
        return res.json({ message: "Agente deleted successfully" });
    }
    catch (err) {
        console.error("Delete agente error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteAgente = deleteAgente;
const getAgentiMinimal = async (req, res) => {
    try {
        const authReq = req;
        const user = authReq.user;
        if (!user)
            return res.status(401).json({ error: "User not authenticated" });
        const scopeIds = await getScopeUserIds(toId(user._id), user.role);
        const query = !scopeIds ? {} : { user: { $in: scopeIds } };
        const rows = await Agenti_1.default.find(query)
            .select('_id businessName isApproved isActive user')
            .lean();
        return res.json(rows);
    }
    catch (err) {
        console.error('getAgentiMinimal error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};
exports.getAgentiMinimal = getAgentiMinimal;
const uploadAgentiFromExcel = async (req, res) => {
    try {
        const authReq = req;
        const user = authReq.user;
        if (!user)
            return res.status(401).json({ error: "User not authenticated" });
        upload(req, res, async (err) => {
            if (err)
                return res.status(400).json({ error: err.message });
            const files = req.files;
            const file = files?.file?.[0];
            if (!file)
                return res.status(400).json({ error: "No file provided" });
            try {
                const workbook = xlsx_1.default.readFile(file.path);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = xlsx_1.default.utils.sheet_to_json(worksheet);
                if (!data || data.length === 0) {
                    fs_1.default.unlinkSync(file.path);
                    return res.status(400).json({ error: "Excel file has no data" });
                }
                const agenti = [];
                const errors = [];
                for (const [index, row] of data.entries()) {
                    try {
                        const agenteData = {
                            businessName: row['Ragione Sociale'] || '',
                            vatNumber: row['Partita IVA'] || '',
                            address: row['Indirizzo'] || '',
                            city: row['Città'] || row["Citta'"] || '',
                            postalCode: row['CAP'] || '',
                            province: row['Provincia'] || '',
                            agreedCommission: parseFloat(String(row['Competenze concordate al %'] || '0')) || 0,
                            email: row['Email'] || '',
                            pec: row['PEC'] || '',
                            user: user._id
                        };
                        if (!agenteData.businessName)
                            throw new Error("Ragione Sociale is required");
                        if (!agenteData.vatNumber)
                            throw new Error("Partita IVA is required");
                        if (!agenteData.address)
                            throw new Error("Indirizzo is required");
                        if (!agenteData.city)
                            throw new Error("Città is required");
                        if (!agenteData.postalCode)
                            throw new Error("CAP is required");
                        if (!agenteData.province)
                            throw new Error("Provincia is required");
                        if (!agenteData.agreedCommission || agenteData.agreedCommission <= 0) {
                            throw new Error("Competenze concordate is required and must be greater than 0");
                        }
                        const agente = new Agenti_1.default(agenteData);
                        await agente.save();
                        agenti.push(agente);
                    }
                    catch (rowError) {
                        errors.push(`Row ${index + 2}: ${rowError.message}`);
                    }
                }
                fs_1.default.unlinkSync(file.path);
                if (agenti.length > 0) {
                    const DashboardStats = require("../models/Dashboard").default;
                    await DashboardStats.findOneAndUpdate({ user: user._id }, { $inc: { agenti: agenti.length } }, { new: true, upsert: true });
                }
                return res.status(201).json({
                    message: `${agenti.length} agenti imported successfully${errors.length ? ` with ${errors.length} errors` : ''}`,
                    agenti,
                    errors: errors.length ? errors : undefined
                });
            }
            catch (processError) {
                if (file && fs_1.default.existsSync(file.path))
                    fs_1.default.unlinkSync(file.path);
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