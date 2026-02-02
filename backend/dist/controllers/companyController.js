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
        if (!['admin', 'super_admin'].includes(req.user.role)) {
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
        if (!['admin', 'super_admin'].includes(req.user.role) && !company.user.equals(req.user._id)) {
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
                if (isPreview) {
                    return res.status(200).json({
                        message: previewRows.length + ' rows parsed' + (errors.length > 0 ? ' with ' + errors.length + ' issues' : ''),
                        preview: previewRows,
                        errors: errors.length > 0 ? errors : undefined
                    });
                }
                if (isPreview) {
                    return res.status(200).json({
                        message: previewRows.length + ' rows parsed' + (errors.length > 0 ? ' with ' + errors.length + ' issues' : ''),
                        preview: previewRows,
                        errors: errors.length > 0 ? errors : undefined
                    });
                }
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
        if (!['admin', 'super_admin'].includes(req.user.role) && !company.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        const errors = [];
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
        if (!['admin', 'super_admin'].includes(req.user.role) && !company.user.equals(req.user._id)) {
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
                const rawRows = xlsx_1.default.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                let data = [];
                const headerIndex = rawRows.findIndex((row) => row.some((cell) => {
                    const key = String(cell || '')
                        .trim()
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[̀-ͯ]/g, '')
                        .replace(/[^a-z0-9]/g, '');
                    return key === 'ragionesociale' || key === 'partitaiva' || key === 'codicefiscale' || key === 'numeronagrafica';
                }));
                if (headerIndex >= 0) {
                    const headers = rawRows[headerIndex].map((cell) => String(cell || '').trim());
                    for (let i = headerIndex + 1; i < rawRows.length; i += 1) {
                        const row = rawRows[i];
                        const isEmpty = row.every((cell) => String(cell || '').trim() === '');
                        if (isEmpty)
                            continue;
                        const obj = {};
                        for (let c = 0; c < headers.length; c += 1) {
                            const header = headers[c];
                            if (!header)
                                continue;
                            obj[header] = row[c];
                        }
                        data.push(obj);
                    }
                }
                else {
                    data = xlsx_1.default.utils.sheet_to_json(worksheet);
                }
                console.log("Excel data parsed. Row count:", data.length);
                console.log("Sample row:", data.length > 0 ? JSON.stringify(data[0]) : "No data");
                if (!data || data.length === 0) {
                    fs_1.default.unlinkSync(req.file.path);
                    return res.status(400).json({ error: "Excel file has no data" });
                }
                const companies = [];
                const errors = [];
                const previewRows = [];
                const isPreview = String(req.query?.preview || '').toLowerCase() === '1' ||
                    String(req.query?.preview || '').toLowerCase() === 'true';
                const seenVat = new Set();
                const seenFiscal = new Set();
                let previewCounter = 0;
                if (isPreview) {
                    const counter = await Counter_1.default.findById(COMPANY_ANAGRAFICA_COUNTER_ID);
                    previewCounter = Number(counter?.seq ?? -1);
                }
                const normalizeKey = (value) => {
                    if (value == null) return '';
                    return String(value)
                        .trim()
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]/g, '');
                };
                const pick = (row, keys) => {
                    for (const key of keys) {
                        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
                            return row[key];
                        }
                    }
                    const normalized = new Map();
                    for (const k of Object.keys(row)) {
                        normalized.set(normalizeKey(k), row[k]);
                    }
                    for (const key of keys) {
                        const nk = normalizeKey(key);
                        if (normalized.has(nk)) return normalized.get(nk);
                    }
                    return '';
                };
                for (const [index, row] of data.entries()) {
                    try {
                        console.log(`Processing row ${index + 1}:`, JSON.stringify(row));
                        const companyData = {
                            businessName: pick(row, ['Ragione Sociale', 'Ragione sociale', 'Azienda']) || '',
                            companyName: pick(row, ['Azienda', 'Ragione Sociale', 'Ragione sociale']) || '',
                            vatNumber: pick(row, ['Partita IVA', 'Partita Iva', 'P.IVA', 'P IVA']) || '',
                            fiscalCode: pick(row, ['Codice Fiscale', 'Codice fiscale']) || '',
                            matricola: pick(row, ['Matricola']) || '',
                            inpsCode: pick(row, ['Matricola INPS', 'Matricola Inps', 'Codice INPS', 'INPS']) || '',
                            numeroAnagrafica: pick(row, ['Numero anagrafica', 'Numero Anagrafica', 'N. Anagrafica']) || '',
                            address: {
                                street: pick(row, ['Indirizzo', 'Via', 'Sede']) || '',
                                city: pick(row, ['Città', "Citta'", 'Citta', 'CittÃ ']) || '',
                                postalCode: pick(row, ['CAP', 'Cap', 'C.A.P.']) || '',
                                province: pick(row, ['Provincia', 'Prov']) || '',
                                country: 'Italy'
                            },
                            contactInfo: {
                                phoneNumber: pick(row, ['Telefono', 'Tel', 'Fisso']) || '',
                                mobile: pick(row, ['Cellulare', 'Mobile']) || '',
                                email: pick(row, ['Email', 'E-mail', 'Mail']) || '',
                                pec: pick(row, ['PEC', 'Pec']) || '',
                                referent: pick(row, ['Referente', 'Referent']) || '',
                                laborConsultant: pick(row, ['Responsabile Sportello', 'Sportello Lavoro', 'Consulente del Lavoro', 'Consulente del lavoro']) || ''
                            },
                            contractDetails: {
                                contractType: pick(row, ['Tipologia contratto', 'Tipologia Contratto']) || '',
                                ccnlType: pick(row, ['CCNL di riferimento', 'CCNL', 'CCNL applicato (indicare codice INPS o codice CNEL)']) || '',
                                bilateralEntity: pick(row, ['Ente Bilaterale', 'Ente Bilaterale di riferimento', 'Ente Bilaterale di Riferimento']) || '',
                                hasFondoSani: pick(row, ['Fondo Sani', 'FondoSani']) === 'si' || pick(row, ['Fondo Sani', 'FondoSani']) === 'yes' || pick(row, ['Fondo Sani', 'FondoSani']) === true,
                                useEbapPayment: pick(row, ['EBAP', 'Ebap']) === 'si' || pick(row, ['EBAP', 'Ebap']) === 'yes' || pick(row, ['EBAP', 'Ebap']) === true,
                                territorialManager: pick(row, ['Responsabile Territoriale', 'Responsabile territoriale']) || ''
                            },
                            industry: pick(row, ['Settore', 'Industry']) || '',
                            employees: parseInt(String(pick(row, ['Dipendenti', 'Dipendenti/Numero', 'Employees']) || '0')) || 0,
                            signaler: pick(row, ['Segnalatore', 'Procacciatore']) || '',
                            actuator: pick(row, ['Attuatore', 'Actuator']) || '',
                            isActive: row['Attivo'] === 'si' || row['Attivo'] === 'yes' || row['Attivo'] === true ||
                                row['Active'] === 'si' || row['Active'] === 'yes' || row['Active'] === true || true,
                            user: req.user?._id
                        };
                        if (!companyData.matricola && companyData.inpsCode) {
                            companyData.matricola = companyData.inpsCode;
                        }
                        const rowErrors = [];
                        if (!companyData.businessName)
                            rowErrors.push("Ragione Sociale is required");
                        const normalizedNumeroAnagrafica = normalizeNumeroAnagrafica(companyData.numeroAnagrafica);
                        if (!normalizedNumeroAnagrafica) {
                            if (isPreview) {
                                previewCounter += 1;
                                companyData.numeroAnagrafica = String(previewCounter);
                            }
                            else {
                                const next = await getNextCompanyNumeroAnagrafica();
                                companyData.numeroAnagrafica = String(next);
                            }
                        }
                        else {
                            companyData.numeroAnagrafica = normalizedNumeroAnagrafica;
                            if (!isPreview) {
                                await ensureAnagraficaCounterAtLeast(normalizedNumeroAnagrafica);
                            }
                        }
                        const normalizedFiscal = String(companyData.fiscalCode || '').trim();
                        if (!String(companyData.vatNumber || '').trim() && normalizedFiscal) {
                            companyData.vatNumber = normalizedFiscal;
                        }
                        if (!String(companyData.vatNumber || '').trim()) {
                            companyData.vatNumber = `NO-PIVA-${companyData.numeroAnagrafica || index + 2}`;
                        }
                        const normalizedVat = String(companyData.vatNumber || '').trim();
                        if (normalizedVat) {
                            if (seenVat.has(normalizedVat))
                                rowErrors.push("Duplicate Partita IVA in file");
                            seenVat.add(normalizedVat);
                        }
                        if (normalizedFiscal) {
                            if (seenFiscal.has(normalizedFiscal))
                                rowErrors.push("Duplicate Codice Fiscale in file");
                            seenFiscal.add(normalizedFiscal);
                        }
                        if (normalizedVat || normalizedFiscal) {
                            const existing = await Company_1.default.findOne({
                                $or: [
                                    normalizedVat ? { vatNumber: normalizedVat } : undefined,
                                    normalizedFiscal ? { fiscalCode: normalizedFiscal } : undefined
                                ].filter(Boolean)
                            });
                            if (existing)
                                rowErrors.push("Company already exists (Partita IVA or Codice Fiscale)");
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
                if (!isPreview && companies.length > 0) {
                    const DashboardStats = require("../models/Dashboard").default;
                    await DashboardStats.findOneAndUpdate({ user: req.user?._id }, { $inc: { companies: companies.length } }, { new: true, upsert: true });
                    console.log("Dashboard stats updated");
                }
                console.log(`Import complete: ${companies.length} companies created, ${errors.length} errors`);
                if (isPreview) {
                    return res.status(200).json({
                        message: previewRows.length + ' rows parsed' + (errors.length > 0 ? ' with ' + errors.length + ' issues' : ''),
                        preview: previewRows,
                        errors: errors.length > 0 ? errors : undefined
                    });
                }
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
