"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSportelloLavoroFromExcel = exports.deleteSportelloLavoro = exports.updateSportelloLavoro = exports.createSportelloLavoro = exports.getSportelloLavoroById = exports.getSportelloLavoro = void 0;
const sportello_1 = __importDefault(require("../models/sportello"));
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const xlsx_1 = __importDefault(require("xlsx"));
const notificationService_1 = require("../models/notificationService");
const User_1 = __importDefault(require("../models/User"));
const isPrivileged = (role) => role === 'admin' || role === 'super_admin';
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../uploads/sportello-lavoro');
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
const getSportelloLavoro = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        let query = {};
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            query = { user: req.user._id };
        }
        const sportelloLavoro = await sportello_1.default.find(query)
            .populate('user', 'username firstName lastName organization role isActive')
            .sort({ createdAt: -1 });
        return res.json(sportelloLavoro);
    }
    catch (err) {
        console.error("Get sportello lavoro error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getSportelloLavoro = getSportelloLavoro;
const getSportelloLavoroById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const sportelloLavoro = await sportello_1.default.findById(id)
            .populate('user', 'username firstName lastName organization role isActive');
        if (!sportelloLavoro) {
            return res.status(404).json({ error: "Sportello Lavoro not found" });
        }
        if (!['admin', 'super_admin'].includes(req.user.role) && !sportelloLavoro.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        return res.json(sportelloLavoro);
    }
    catch (err) {
        console.error("Get sportello lavoro error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getSportelloLavoroById = getSportelloLavoroById;
const createSportelloLavoro = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        upload(req, res, async (err) => {
            if (err) {
                console.error("File upload error:", err);
                return res.status(400).json({ error: err.message });
            }
            const { agentName, agentId, businessName, vatNumber, address, city, postalCode, province, agreedCommission, email, pec } = req.body;
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
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            try {
                let resolvedUserId = req.user._id;
                if (isPrivileged(req.user.role) && agentId) {
                    const responsabile = await User_1.default.findOne({
                        _id: agentId,
                        role: "responsabile_territoriale",
                        isActive: { $ne: false }
                    }).select('_id');
                    if (!responsabile) {
                        return res.status(400).json({ error: "Responsabile Territoriale non valido o inattivo" });
                    }
                    resolvedUserId = responsabile._id;
                }
                const files = req.files;
                const signedContractFile = files?.signedContractFile?.[0];
                const legalDocumentFile = files?.legalDocumentFile?.[0];
                const isAutoApproved = ['admin', 'super_admin'].includes(req.user.role);
                const needsApproval = ['responsabile_territoriale'].includes(req.user.role);
                const newSportelloLavoro = new sportello_1.default({
                    agentName,
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
                    // Approval logic
                    isActive: isAutoApproved,
                    isApproved: isAutoApproved,
                    pendingApproval: needsApproval,
                    approvedBy: isAutoApproved ? req.user._id : undefined,
                    approvedAt: isAutoApproved ? new Date() : undefined,
                    user: new mongoose_1.default.Types.ObjectId(resolvedUserId)
                });
                await newSportelloLavoro.save();
                // Send notification if needs approval
                if (needsApproval) {
                    await notificationService_1.NotificationService.notifyAdminsOfPendingApproval({
                        title: 'New Sportello Lavoro Pending Approval',
                        message: `${req.user.firstName || req.user.username} created a new Sportello Lavoro "${businessName}" that needs approval.`,
                        type: 'sportello_pending',
                        entityId: newSportelloLavoro._id.toString(), // Fix: Cast to ObjectId and convert to string
                        entityName: businessName,
                        createdBy: req.user._id.toString(),
                        createdByName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName}` : req.user.username
                    });
                }
                const DashboardStats = require("../models/Dashboard").default;
                await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { sportelloLavoro: 1 } }, { new: true, upsert: true });
                return res.status(201).json({
                    ...newSportelloLavoro.toObject(),
                    message: needsApproval ? 'Sportello Lavoro created and submitted for approval' : 'Sportello Lavoro created successfully'
                });
            }
            catch (saveError) {
                console.error("Create sportello lavoro error:", saveError);
                if (saveError.code === 11000 && saveError.keyPattern && saveError.keyPattern.vatNumber) {
                    return res.status(400).json({ error: "VAT number already exists" });
                }
                return res.status(500).json({ error: "Server error" });
            }
        });
    }
    catch (err) {
        console.error("Create sportello lavoro error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.createSportelloLavoro = createSportelloLavoro;
const updateSportelloLavoro = async (req, res) => {
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
            const { businessName, vatNumber, address, city, postalCode, province, agreedCommission, email, pec } = req.body;
            const sportelloLavoro = await sportello_1.default.findById(id);
            if (!sportelloLavoro) {
                return res.status(404).json({ error: "Sportello Lavoro not found" });
            }
            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            if (!['admin', 'super_admin'].includes(req.user.role) && !sportelloLavoro.user.equals(req.user._id)) {
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
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }
            try {
                const files = req.files;
                const signedContractFile = files?.signedContractFile?.[0];
                const legalDocumentFile = files?.legalDocumentFile?.[0];
                if (businessName !== undefined)
                    sportelloLavoro.businessName = businessName;
                if (vatNumber !== undefined)
                    sportelloLavoro.vatNumber = vatNumber;
                if (address !== undefined)
                    sportelloLavoro.address = address;
                if (city !== undefined)
                    sportelloLavoro.city = city;
                if (postalCode !== undefined)
                    sportelloLavoro.postalCode = postalCode;
                if (province !== undefined)
                    sportelloLavoro.province = province;
                if (agreedCommission !== undefined)
                    sportelloLavoro.agreedCommission = parseFloat(agreedCommission);
                if (email !== undefined)
                    sportelloLavoro.email = email;
                if (pec !== undefined)
                    sportelloLavoro.pec = pec;
                if (signedContractFile) {
                    sportelloLavoro.signedContractFile = {
                        filename: signedContractFile.filename,
                        originalName: signedContractFile.originalname,
                        path: signedContractFile.path,
                        mimetype: signedContractFile.mimetype,
                        size: signedContractFile.size
                    };
                }
                if (legalDocumentFile) {
                    sportelloLavoro.legalDocumentFile = {
                        filename: legalDocumentFile.filename,
                        originalName: legalDocumentFile.originalname,
                        path: legalDocumentFile.path,
                        mimetype: legalDocumentFile.mimetype,
                        size: legalDocumentFile.size
                    };
                }
                await sportelloLavoro.save();
                return res.json(sportelloLavoro);
            }
            catch (updateError) {
                console.error("Update sportello lavoro error:", updateError);
                if (updateError.code === 11000 && updateError.keyPattern && updateError.keyPattern.vatNumber) {
                    return res.status(400).json({ error: "VAT number already exists" });
                }
                return res.status(500).json({ error: "Server error" });
            }
        });
    }
    catch (err) {
        console.error("Update sportello lavoro error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.updateSportelloLavoro = updateSportelloLavoro;
const deleteSportelloLavoro = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const sportelloLavoro = await sportello_1.default.findById(id);
        if (!sportelloLavoro) {
            return res.status(404).json({ error: "Sportello Lavoro not found" });
        }
        if (!['admin', 'super_admin'].includes(req.user.role) && !sportelloLavoro.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        if (sportelloLavoro.signedContractFile?.path && fs_1.default.existsSync(sportelloLavoro.signedContractFile.path)) {
            fs_1.default.unlinkSync(sportelloLavoro.signedContractFile.path);
        }
        if (sportelloLavoro.legalDocumentFile?.path && fs_1.default.existsSync(sportelloLavoro.legalDocumentFile.path)) {
            fs_1.default.unlinkSync(sportelloLavoro.legalDocumentFile.path);
        }
        await sportelloLavoro.deleteOne();
        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { sportelloLavoro: -1 } }, { new: true });
        return res.json({ message: "Sportello Lavoro deleted successfully" });
    }
    catch (err) {
        console.error("Delete sportello lavoro error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteSportelloLavoro = deleteSportelloLavoro;
const uploadSportelloLavoroFromExcel = async (req, res) => {
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
                const sportelloLavoro = [];
                const errors = [];
                for (const [index, row] of data.entries()) {
                    try {
                        console.log(`Processing row ${index + 1}:`, JSON.stringify(row));
                        const sportelloLavoroData = {
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
                        if (!sportelloLavoroData.businessName) {
                            throw new Error("Ragione Sociale is required");
                        }
                        if (!sportelloLavoroData.vatNumber) {
                            throw new Error("Partita IVA is required");
                        }
                        if (!sportelloLavoroData.address) {
                            throw new Error("Indirizzo is required");
                        }
                        if (!sportelloLavoroData.city) {
                            throw new Error("Città is required");
                        }
                        if (!sportelloLavoroData.postalCode) {
                            throw new Error("CAP is required");
                        }
                        if (!sportelloLavoroData.province) {
                            throw new Error("Provincia is required");
                        }
                        if (!sportelloLavoroData.agreedCommission || sportelloLavoroData.agreedCommission <= 0) {
                            throw new Error("Competenze concordate is required and must be greater than 0");
                        }
                        console.log(`Saving sportello lavoro: ${sportelloLavoroData.businessName}`);
                        const sportelloLavoroRecord = new sportello_1.default(sportelloLavoroData);
                        await sportelloLavoroRecord.save();
                        sportelloLavoro.push(sportelloLavoroRecord);
                        console.log(`Sportello Lavoro saved successfully: ${sportelloLavoroRecord._id}`);
                    }
                    catch (rowError) {
                        console.error(`Error processing row ${index + 2}:`, rowError);
                        errors.push(`Row ${index + 2}: ${rowError.message}`);
                    }
                }
                fs_1.default.unlinkSync(file.path);
                console.log("Uploaded file cleaned up");
                if (sportelloLavoro.length > 0) {
                    const DashboardStats = require("../models/Dashboard").default;
                    await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { sportelloLavoro: sportelloLavoro.length } }, { new: true, upsert: true });
                    console.log("Dashboard stats updated");
                }
                console.log(`Import complete: ${sportelloLavoro.length} sportello lavoro created, ${errors.length} errors`);
                return res.status(201).json({
                    message: `${sportelloLavoro.length} sportello lavoro imported successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
                    sportelloLavoro,
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
        console.error("Upload sportello lavoro error:", err);
        return res.status(500).json({ error: "Server error: " + err.message });
    }
};
exports.uploadSportelloLavoroFromExcel = uploadSportelloLavoroFromExcel;
//# sourceMappingURL=sportelloLavoroController.js.map
