"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadEmployeesFromExcel = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeeById = exports.getEmployeesByCompany = void 0;
const Employee_1 = __importDefault(require("../models/Employee"));
const Company_1 = __importDefault(require("../models/Company"));
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const xlsx_1 = __importDefault(require("xlsx"));
// IMPORTANT: Make sure you have the Employee model imported correctly
// If this line fails, the Employee model doesn't exist or isn't exported properly
console.log("Employee model loaded:", Employee_1.default);
// Set up multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `employees-${Date.now()}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        console.log("Employee file upload attempt:", {
            originalname: file.originalname,
            mimetype: file.mimetype,
            extension: path_1.default.extname(file.originalname).toLowerCase()
        });
        const validExtensions = /\.xlsx$|\.xls$/i;
        const hasValidExtension = validExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
        if (hasValidExtension) {
            return cb(null, true);
        }
        else {
            return cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
        }
    }
}).single('file');
// Get all employees for a company
const getEmployeesByCompany = async (req, res) => {
    try {
        console.log("=== GET EMPLOYEES BY COMPANY ===");
        console.log("User:", req.user ? req.user._id : "No user");
        console.log("Company ID:", req.params.companyId);
        if (!req.user) {
            console.log("ERROR: User not authenticated");
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { companyId } = req.params;
        // Verify company exists and user has access
        const company = await Company_1.default.findById(companyId);
        if (!company) {
            console.log("ERROR: Company not found");
            return res.status(404).json({ error: "Company not found" });
        }
        // Check if user has access to this company
        if (req.user.role !== 'admin' && !company.user.equals(req.user._id)) {
            console.log("ERROR: Access denied");
            return res.status(403).json({ error: "Access denied" });
        }
        const employees = await Employee_1.default.find({ companyId }).sort({ createdAt: -1 });
        console.log("Found employees:", employees.length);
        return res.json(employees);
    }
    catch (err) {
        console.error("Get employees error:", err);
        return res.status(500).json({ error: "Server error: " + err.message });
    }
};
exports.getEmployeesByCompany = getEmployeesByCompany;
// Get single employee by ID
const getEmployeeById = async (req, res) => {
    try {
        console.log("=== GET EMPLOYEE BY ID ===");
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        console.log("Employee ID:", id);
        const employee = await Employee_1.default.findById(id).populate('companyId');
        if (!employee) {
            console.log("ERROR: Employee not found");
            return res.status(404).json({ error: "Employee not found" });
        }
        // Check if user has access to this employee's company
        const company = await Company_1.default.findById(employee.companyId);
        if (!company || (req.user.role !== 'admin' && !company.user.equals(req.user._id))) {
            console.log("ERROR: Access denied");
            return res.status(403).json({ error: "Access denied" });
        }
        return res.json(employee);
    }
    catch (err) {
        console.error("Get employee error:", err);
        return res.status(500).json({ error: "Server error: " + err.message });
    }
};
exports.getEmployeeById = getEmployeeById;
// Create a new employee
const createEmployee = async (req, res) => {
    try {
        console.log("=== CREATE EMPLOYEE ===");
        console.log("User:", req.user ? req.user._id : "No user");
        console.log("Request body:", JSON.stringify(req.body, null, 2));
        if (!req.user) {
            console.log("ERROR: User not authenticated");
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { companyId, nome, cognome, dataNascita, cittaNascita, provinciaNascita, genere, codiceFiscale, indirizzo, numeroCivico, citta, provincia, cap, cellulare, telefono, email, attivo = true } = req.body;
        console.log("Extracted data:", {
            companyId,
            nome,
            cognome,
            dataNascita,
            cittaNascita,
            provinciaNascita,
            genere,
            codiceFiscale,
            indirizzo,
            numeroCivico,
            citta,
            provincia,
            cap,
            cellulare,
            telefono,
            email,
            attivo
        });
        // Validate required fields
        const errors = [];
        if (!companyId)
            errors.push("Company ID is required");
        if (!nome)
            errors.push("Nome is required");
        if (!cognome)
            errors.push("Cognome is required");
        if (!dataNascita)
            errors.push("Data di nascita is required");
        if (!cittaNascita)
            errors.push("Città di nascita is required");
        if (!provinciaNascita)
            errors.push("Provincia di nascita is required");
        if (!genere)
            errors.push("Genere is required");
        if (!codiceFiscale)
            errors.push("Codice fiscale is required");
        if (!indirizzo)
            errors.push("Indirizzo is required");
        if (!numeroCivico)
            errors.push("Numero civico is required");
        if (!citta)
            errors.push("Città is required");
        if (!provincia)
            errors.push("Provincia is required");
        if (!cap)
            errors.push("CAP is required");
        if (errors.length > 0) {
            console.log("Validation errors:", errors);
            return res.status(400).json({ errors });
        }
        // Verify company exists and user has access
        console.log("Verifying company access...");
        const company = await Company_1.default.findById(companyId);
        if (!company) {
            console.log("ERROR: Company not found for ID:", companyId);
            return res.status(404).json({ error: "Company not found" });
        }
        // Check if user has access to this company
        if (req.user.role !== 'admin' && !company.user.equals(req.user._id)) {
            console.log("ERROR: Access denied. User role:", req.user.role, "Company user:", company.user, "Request user:", req.user._id);
            return res.status(403).json({ error: "Access denied" });
        }
        console.log("Company access verified. Creating employee...");
        // Create new employee
        const employeeData = {
            companyId: new mongoose_1.default.Types.ObjectId(companyId),
            nome: nome.trim(),
            cognome: cognome.trim(),
            dataNascita,
            cittaNascita: cittaNascita.trim(),
            provinciaNascita: provinciaNascita.trim(),
            genere,
            codiceFiscale: codiceFiscale.trim().toUpperCase(),
            indirizzo: indirizzo.trim(),
            numeroCivico: numeroCivico.trim(),
            citta: citta.trim(),
            provincia: provincia.trim(),
            cap: cap.trim(),
            cellulare: cellulare?.trim() || '',
            telefono: telefono?.trim() || '',
            email: email?.trim() || '',
            stato: attivo ? 'attivo' : 'inattivo'
        };
        console.log("Employee data to save:", JSON.stringify(employeeData, null, 2));
        const newEmployee = new Employee_1.default(employeeData);
        console.log("Employee instance created:", newEmployee);
        console.log("Attempting to save employee...");
        const savedEmployee = await newEmployee.save();
        console.log("Employee saved successfully:", savedEmployee._id);
        return res.status(201).json(savedEmployee);
    }
    catch (err) {
        console.error("=== CREATE EMPLOYEE ERROR ===");
        console.error("Error type:", err.constructor.name);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        // More specific error handling
        if (err.name === 'ValidationError') {
            console.error("Validation error details:", err.errors);
            const validationErrors = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({
                error: "Validation failed",
                errors: validationErrors,
                details: err.errors
            });
        }
        if (err.code === 11000) {
            console.error("Duplicate key error:", err.keyPattern, err.keyValue);
            if (err.keyPattern && err.keyPattern.codiceFiscale) {
                return res.status(400).json({ error: "Codice fiscale already exists" });
            }
            return res.status(400).json({ error: "Duplicate data detected" });
        }
        if (err.name === 'CastError') {
            console.error("Cast error details:", err.path, err.value, err.kind);
            return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` });
        }
        return res.status(500).json({ error: "Server error: " + err.message });
    }
};
exports.createEmployee = createEmployee;
// Update employee
const updateEmployee = async (req, res) => {
    try {
        console.log("=== UPDATE EMPLOYEE ===");
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const { nome, cognome, dataNascita, cittaNascita, provinciaNascita, genere, codiceFiscale, indirizzo, numeroCivico, citta, provincia, cap, cellulare, telefono, email, attivo } = req.body;
        const employee = await Employee_1.default.findById(id);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }
        // Check if user has access to this employee's company
        const company = await Company_1.default.findById(employee.companyId);
        if (!company || (req.user.role !== 'admin' && !company.user.equals(req.user._id))) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Update fields
        if (nome !== undefined)
            employee.nome = nome.trim();
        if (cognome !== undefined)
            employee.cognome = cognome.trim();
        if (dataNascita !== undefined)
            employee.dataNascita = dataNascita;
        if (cittaNascita !== undefined)
            employee.cittaNascita = cittaNascita.trim();
        if (provinciaNascita !== undefined)
            employee.provinciaNascita = provinciaNascita.trim();
        if (genere !== undefined)
            employee.genere = genere;
        if (codiceFiscale !== undefined)
            employee.codiceFiscale = codiceFiscale.trim().toUpperCase();
        if (indirizzo !== undefined)
            employee.indirizzo = indirizzo.trim();
        if (numeroCivico !== undefined)
            employee.numeroCivico = numeroCivico.trim();
        if (citta !== undefined)
            employee.citta = citta.trim();
        if (provincia !== undefined)
            employee.provincia = provincia.trim();
        if (cap !== undefined)
            employee.cap = cap.trim();
        if (cellulare !== undefined)
            employee.cellulare = cellulare.trim();
        if (telefono !== undefined)
            employee.telefono = telefono.trim();
        if (email !== undefined)
            employee.email = email.trim();
        if (attivo !== undefined)
            employee.stato = attivo ? 'attivo' : 'inattivo';
        await employee.save();
        return res.json(employee);
    }
    catch (err) {
        console.error("Update employee error:", err);
        if (err.code === 11000) {
            if (err.keyPattern && err.keyPattern.codiceFiscale) {
                return res.status(400).json({ error: "Codice fiscale already exists" });
            }
        }
        return res.status(500).json({ error: "Server error: " + err.message });
    }
};
exports.updateEmployee = updateEmployee;
// Delete employee
const deleteEmployee = async (req, res) => {
    try {
        console.log("=== DELETE EMPLOYEE ===");
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const employee = await Employee_1.default.findById(id);
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }
        // Check if user has access to this employee's company
        const company = await Company_1.default.findById(employee.companyId);
        if (!company || (req.user.role !== 'admin' && !company.user.equals(req.user._id))) {
            return res.status(403).json({ error: "Access denied" });
        }
        await employee.deleteOne();
        return res.json({ message: "Employee deleted successfully" });
    }
    catch (err) {
        console.error("Delete employee error:", err);
        return res.status(500).json({ error: "Server error: " + err.message });
    }
};
exports.deleteEmployee = deleteEmployee;
// Upload employees from Excel file
const uploadEmployeesFromExcel = async (req, res) => {
    try {
        console.log("=== UPLOAD EMPLOYEES FROM EXCEL ===");
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { companyId } = req.params;
        console.log("Company ID:", companyId);
        // Verify company exists and user has access
        const company = await Company_1.default.findById(companyId);
        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }
        if (req.user.role !== 'admin' && !company.user.equals(req.user._id)) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Handle file upload using multer
        upload(req, res, async (err) => {
            if (err) {
                console.error("File upload error:", err);
                return res.status(400).json({ error: err.message });
            }
            if (!req.file) {
                return res.status(400).json({ error: "No file provided" });
            }
            try {
                console.log("Employee Excel file uploaded successfully:", req.file.path);
                // Read Excel file
                const workbook = xlsx_1.default.readFile(req.file.path);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = xlsx_1.default.utils.sheet_to_json(worksheet);
                console.log("Employee Excel data parsed. Row count:", data.length);
                if (!data || data.length === 0) {
                    fs_1.default.unlinkSync(req.file.path);
                    return res.status(400).json({ error: "Excel file has no data" });
                }
                // Process employees
                const employees = [];
                const errors = [];
                for (const [index, row] of data.entries()) {
                    try {
                        console.log(`Processing employee row ${index + 1}:`, JSON.stringify(row));
                        const employeeData = {
                            companyId: new mongoose_1.default.Types.ObjectId(companyId),
                            nome: row['Nome'] || '',
                            cognome: row['Cognome'] || '',
                            dataNascita: row['Data di nascita'] || row['Data Nascita'] || '',
                            cittaNascita: row['Città di nascita'] || row['Citta Nascita'] || '',
                            provinciaNascita: row['Provincia di nascita'] || row['Provincia Nascita'] || '',
                            genere: row['Genere'] || '',
                            codiceFiscale: (row['Codice Fiscale'] || row['CF'] || '').toUpperCase(),
                            indirizzo: row['Indirizzo'] || '',
                            numeroCivico: row['Numero Civico'] || row['N. Civico'] || '',
                            citta: row['Città'] || row['Citta'] || '',
                            provincia: row['Provincia'] || '',
                            cap: row['CAP'] || '',
                            cellulare: row['Cellulare'] || '',
                            telefono: row['Telefono'] || '',
                            email: row['Email'] || '',
                            stato: (row['Attivo'] === 'si' || row['Attivo'] === 'yes' || row['Attivo'] === true ||
                                row['Active'] === 'si' || row['Active'] === 'yes' || row['Active'] === true ||
                                row['Stato'] === 'attivo') ? 'attivo' : 'inattivo'
                        };
                        // Validate required fields
                        const requiredFields = ['nome', 'cognome', 'dataNascita', 'cittaNascita', 'provinciaNascita', 'genere', 'codiceFiscale', 'indirizzo', 'numeroCivico', 'citta', 'provincia', 'cap'];
                        for (const field of requiredFields) {
                            if (!employeeData[field]) {
                                throw new Error(`${field} is required`);
                            }
                        }
                        console.log(`Saving employee: ${employeeData.nome} ${employeeData.cognome}`);
                        // Create and save employee
                        const employee = new Employee_1.default(employeeData);
                        await employee.save();
                        employees.push(employee);
                        console.log(`Employee saved successfully: ${employee._id}`);
                    }
                    catch (rowError) {
                        console.error(`Error processing employee row ${index + 2}:`, rowError);
                        errors.push(`Row ${index + 2}: ${rowError.message}`);
                    }
                }
                // Clean up the uploaded file
                fs_1.default.unlinkSync(req.file.path);
                console.log("Employee uploaded file cleaned up");
                // Return response
                console.log(`Employee import complete: ${employees.length} employees created, ${errors.length} errors`);
                return res.status(201).json({
                    message: `${employees.length} employees imported successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
                    employees,
                    errors: errors.length > 0 ? errors : undefined
                });
            }
            catch (processError) {
                // Clean up the uploaded file
                if (req.file && fs_1.default.existsSync(req.file.path)) {
                    fs_1.default.unlinkSync(req.file.path);
                }
                console.error("Employee Excel processing error:", processError);
                return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
            }
        });
    }
    catch (err) {
        console.error("Upload employees error:", err);
        return res.status(500).json({ error: "Server error: " + err.message });
    }
};
exports.uploadEmployeesFromExcel = uploadEmployeesFromExcel;
//# sourceMappingURL=employeeController.js.map