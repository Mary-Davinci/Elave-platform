"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCompaniesFromExcel = exports.deleteCompany = exports.updateCompany = exports.createCompany = exports.getCompanyById = exports.getCompanies = void 0;
const Company_1 = __importDefault(require("../models/Company"));
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const xlsx_1 = __importDefault(require("xlsx"));
const notificationService_1 = require("../models/notificationService");
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        console.log("File upload attempt:", {
            originalname: file.originalname,
            mimetype: file.mimetype,
            extension: path_1.default.extname(file.originalname).toLowerCase()
        });
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
        console.log("Validation results:", {
            hasValidExtension,
            hasValidMimeType,
            mimeTypeCheck: file.mimetype
        });
        if (hasValidExtension) {
            return cb(null, true);
        }
        else {
            return cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
        }
    }
}).single('file');
const getCompanies = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        let query = {};
        if (req.user.role !== 'admin') {
            query = { user: req.user._id };
        }
        const companies = await Company_1.default.find(query).sort({ createdAt: -1 });
        return res.json(companies);
    }
    catch (err) {
        console.error("Get companies error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getCompanies = getCompanies;
const getCompanyById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const company = await Company_1.default.findById(id);
        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }
        if (req.user.role !== 'admin' && !company.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        return res.json(company);
    }
    catch (err) {
        console.error("Get company error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getCompanyById = getCompanyById;
const createCompany = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { businessName, companyName, vatNumber, fiscalCode, matricola, inpsCode, address, contactInfo, contractDetails, industry, employees, signaler, actuator, isActive } = req.body;
        const errors = [];
        if (!businessName)
            errors.push("Ragione Sociale is required");
        if (!vatNumber)
            errors.push("Partita IVA is required");
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        const isAutoApproved = ['admin', 'super_admin'].includes(req.user.role);
        const needsApproval = ['responsabile_territoriale', 'sportello_lavoro'].includes(req.user.role);
        const newCompany = new Company_1.default({
            businessName,
            companyName: companyName || businessName,
            vatNumber,
            fiscalCode,
            matricola,
            inpsCode,
            address: address || {},
            contactInfo: contactInfo || {},
            contractDetails: contractDetails || {},
            industry: industry || '',
            employees: employees || 0,
            signaler,
            actuator,
            isActive: isAutoApproved ? (isActive !== undefined ? isActive : true) : false,
            isApproved: isAutoApproved,
            pendingApproval: needsApproval,
            approvedBy: isAutoApproved ? req.user._id : undefined,
            approvedAt: isAutoApproved ? new Date() : undefined,
            user: new mongoose_1.default.Types.ObjectId(req.user._id)
        });
        await newCompany.save();
        if (needsApproval) {
            await notificationService_1.NotificationService.notifyAdminsOfPendingApproval({
                title: 'New Company Pending Approval',
                message: `${req.user.firstName || req.user.username} created a new company "${businessName}" that needs approval.`,
                type: 'company_pending',
                entityId: newCompany._id.toString(), // Fix: Cast to ObjectId and convert to string
                entityName: businessName,
                createdBy: req.user._id.toString(),
                createdByName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName}` : req.user.username
            });
        }
        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { companies: 1 } }, { new: true, upsert: true });
        return res.status(201).json({
            ...newCompany.toObject(),
            message: needsApproval ? 'Company created and submitted for approval' : 'Company created successfully'
        });
    }
    catch (err) {
        console.error("Create company error:", err);
        if (err.code === 11000 && err.keyPattern && err.keyPattern.vatNumber) {
            return res.status(400).json({ error: "VAT number already exists" });
        }
        return res.status(500).json({ error: "Server error" });
    }
};
exports.createCompany = createCompany;
const updateCompany = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const { businessName, companyName, vatNumber, fiscalCode, matricola, inpsCode, address, contactInfo, contractDetails, industry, employees, signaler, actuator, isActive } = req.body;
        const company = await Company_1.default.findById(id);
        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }
        if (req.user.role !== 'admin' && !company.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        const errors = [];
        if (businessName === '')
            errors.push("Ragione Sociale cannot be empty");
        if (vatNumber === '')
            errors.push("Partita IVA cannot be empty");
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        if (businessName !== undefined)
            company.businessName = businessName;
        if (companyName !== undefined)
            company.companyName = companyName;
        if (vatNumber !== undefined)
            company.vatNumber = vatNumber;
        if (fiscalCode !== undefined)
            company.fiscalCode = fiscalCode;
        if (matricola !== undefined)
            company.matricola = matricola;
        if (inpsCode !== undefined)
            company.inpsCode = inpsCode;
        if (address) {
            company.address = {
                ...company.address,
                ...address
            };
        }
        if (contactInfo) {
            company.contactInfo = {
                ...company.contactInfo,
                ...contactInfo
            };
        }
        if (contractDetails) {
            company.contractDetails = {
                ...company.contractDetails,
                ...contractDetails
            };
        }
        if (industry !== undefined)
            company.industry = industry;
        if (employees !== undefined)
            company.employees = employees;
        if (signaler !== undefined)
            company.signaler = signaler;
        if (actuator !== undefined)
            company.actuator = actuator;
        if (isActive !== undefined)
            company.isActive = isActive;
        await company.save();
        return res.json(company);
    }
    catch (err) {
        console.error("Update company error:", err);
        if (err.code === 11000 && err.keyPattern && err.keyPattern.vatNumber) {
            return res.status(400).json({ error: "VAT number already exists" });
        }
        return res.status(500).json({ error: "Server error" });
    }
};
exports.updateCompany = updateCompany;
const deleteCompany = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const company = await Company_1.default.findById(id);
        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }
        if (req.user.role !== 'admin' && !company.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        await company.deleteOne();
        const DashboardStats = require("../models/Dashboard").default;
        await DashboardStats.findOneAndUpdate({ user: req.user._id }, { $inc: { companies: -1 } }, { new: true });
        return res.json({ message: "Company deleted successfully" });
    }
    catch (err) {
        console.error("Delete company error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteCompany = deleteCompany;
const uploadCompaniesFromExcel = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        upload(req, res, async (err) => {
            if (err) {
                console.error("File upload error:", err);
                return res.status(400).json({ error: err.message });
            }
            if (!req.file) {
                return res.status(400).json({ error: "No file provided" });
            }
            try {
                console.log("File uploaded successfully:", req.file.path);
                const workbook = xlsx_1.default.readFile(req.file.path);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = xlsx_1.default.utils.sheet_to_json(worksheet);
                console.log("Excel data parsed. Row count:", data.length);
                console.log("Sample row:", data.length > 0 ? JSON.stringify(data[0]) : "No data");
                if (!data || data.length === 0) {
                    fs_1.default.unlinkSync(req.file.path);
                    return res.status(400).json({ error: "Excel file has no data" });
                }
                const companies = [];
                const errors = [];
                for (const [index, row] of data.entries()) {
                    try {
                        console.log(`Processing row ${index + 1}:`, JSON.stringify(row));
                        const companyData = {
                            businessName: row['Ragione Sociale'] || '',
                            companyName: row['Azienda'] || row['Ragione Sociale'] || '',
                            vatNumber: row['Partita IVA'] || '',
                            fiscalCode: row['Codice Fiscale'] || '',
                            matricola: row['Matricola'] || '',
                            inpsCode: row['Codice INPS'] || '',
                            address: {
                                street: row['Indirizzo'] || '',
                                city: row['Citta\''] || row['Città'] || '',
                                postalCode: row['Cap'] || row['CAP'] || '',
                                province: row['Provincia'] || '',
                                country: 'Italy'
                            },
                            contactInfo: {
                                phoneNumber: row['Telefono'] || '',
                                mobile: row['Cellulare'] || '',
                                email: row['Email'] || '',
                                pec: row['PEC'] || '',
                                referent: row['Referente'] || ''
                            },
                            contractDetails: {
                                contractType: row['Tipologia contratto'] || '',
                                ccnlType: row['CCNL applicato (indicare codice INPS o codice CNEL)'] || '',
                                bilateralEntity: row['Ente Bilaterale di riferimento'] || '',
                                hasFondoSani: row['Fondo Sani'] === 'si' || row['Fondo Sani'] === 'yes' || row['Fondo Sani'] === true,
                                useEbapPayment: row['EBAP'] === 'si' || row['EBAP'] === 'yes' || row['EBAP'] === true
                            },
                            industry: row['Settore'] || '',
                            employees: parseInt(String(row['Dipendenti'] || '0')) || 0,
                            signaler: row['Segnalatore'] || '',
                            actuator: row['Attuatore'] || '',
                            isActive: row['Attivo'] === 'si' || row['Attivo'] === 'yes' || row['Attivo'] === true ||
                                row['Active'] === 'si' || row['Active'] === 'yes' || row['Active'] === true || true,
                            user: req.user?._id
                        };
                        if (!companyData.businessName) {
                            throw new Error("Ragione Sociale is required");
                        }
                        if (!companyData.vatNumber) {
                            throw new Error("Partita IVA is required");
                        }
                        console.log(`Saving company: ${companyData.businessName}`);
                        const company = new Company_1.default(companyData);
                        await company.save();
                        companies.push(company);
                        console.log(`Company saved successfully: ${company._id}`);
                    }
                    catch (rowError) {
                        console.error(`Error processing row ${index + 2}:`, rowError);
                        errors.push(`Row ${index + 2}: ${rowError.message}`);
                    }
                }
                fs_1.default.unlinkSync(req.file.path);
                console.log("Uploaded file cleaned up");
                if (companies.length > 0) {
                    const DashboardStats = require("../models/Dashboard").default;
                    await DashboardStats.findOneAndUpdate({ user: req.user?._id }, { $inc: { companies: companies.length } }, { new: true, upsert: true });
                    console.log("Dashboard stats updated");
                }
                console.log(`Import complete: ${companies.length} companies created, ${errors.length} errors`);
                return res.status(201).json({
                    message: `${companies.length} companies imported successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
                    companies,
                    errors: errors.length > 0 ? errors : undefined
                });
            }
            catch (processError) {
                if (req.file && fs_1.default.existsSync(req.file.path)) {
                    fs_1.default.unlinkSync(req.file.path);
                }
                console.error("Excel processing error:", processError);
                return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
            }
        });
    }
    catch (err) {
        console.error("Upload companies error:", err);
        return res.status(500).json({ error: "Server error: " + err.message });
    }
};
exports.uploadCompaniesFromExcel = uploadCompaniesFromExcel;
//# sourceMappingURL=companyController.js.map