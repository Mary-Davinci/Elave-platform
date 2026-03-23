import { Request, Response } from "express";
import Employee from "../models/Employee";
import Company from "../models/Company";
import EmployeeImport from "../models/EmployeeImport";
import { CustomRequestHandler } from "../types/express";
import mongoose from "mongoose";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import crypto from "crypto";

const isPrivileged = (role: string) => role === 'admin' || role === 'super_admin';


console.log("Employee model loaded:", Employee);


const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, `employees-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log("Employee file upload attempt:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase()
    });

    const validExtensions = /\.xlsx$|\.xls$/i;
    const hasValidExtension = validExtensions.test(path.extname(file.originalname).toLowerCase());

    if (hasValidExtension) {
      return cb(null, true);
    } else {
      return cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
    }
  }
}).single('file');


export const getEmployeesByCompany: CustomRequestHandler = async (req, res) => {
  try {
    console.log("=== GET EMPLOYEES BY COMPANY ===");
    console.log("User:", req.user ? req.user._id : "No user");
    console.log("Company ID:", req.params.companyId);

    if (!req.user) {
      console.log("ERROR: User not authenticated");
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { companyId } = req.params;

    const company = await Company.findById(companyId);
    if (!company) {
      console.log("ERROR: Company not found");
      return res.status(404).json({ error: "Company not found" });
    }

    if (!isPrivileged(req.user.role) && !company.user.equals(req.user._id)) {
      console.log("ERROR: Access denied");
      return res.status(403).json({ error: "Access denied" });
    }

    const employees = await Employee.find({ companyId }).sort({ createdAt: -1 });
    console.log("Found employees:", employees.length);
    
    return res.json(employees);
  } catch (err: any) {
    console.error("Get employees error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};

export const getEmployeeById: CustomRequestHandler = async (req, res) => {
  try {
    console.log("=== GET EMPLOYEE BY ID ===");
    
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    console.log("Employee ID:", id);
    
    const employee = await Employee.findById(id).populate('companyId');
    
    if (!employee) {
      console.log("ERROR: Employee not found");
      return res.status(404).json({ error: "Employee not found" });
    }

    const company = await Company.findById(employee.companyId);
    if (!company || (!isPrivileged(req.user.role) && !company.user.equals(req.user._id))) {
      console.log("ERROR: Access denied");
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(employee);
  } catch (err: any) {
    console.error("Get employee error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};

export const createEmployee: CustomRequestHandler = async (req, res) => {
  try {
    console.log("=== CREATE EMPLOYEE ===");
    console.log("User:", req.user ? req.user._id : "No user");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    if (!req.user) {
      console.log("ERROR: User not authenticated");
      return res.status(401).json({ error: "User not authenticated" });
    }

    const {
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
      attivo = true
    } = req.body;

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

    const errors: string[] = [];
    if (!companyId) errors.push("Company ID is required");
    if (!nome) errors.push("Nome is required");
    if (!cognome) errors.push("Cognome is required");
    if (!codiceFiscale) errors.push("Codice fiscale is required");

    if (errors.length > 0) {
      console.log("Validation errors:", errors);
      return res.status(400).json({ errors });
    }

    console.log("Verifying company access...");
    const company = await Company.findById(companyId);
    if (!company) {
      console.log("ERROR: Company not found for ID:", companyId);
      return res.status(404).json({ error: "Company not found" });
    }

    if (!isPrivileged(req.user.role) && !company.user.equals(req.user._id)) {
      console.log("ERROR: Access denied. User role:", req.user.role, "Company user:", company.user, "Request user:", req.user._id);
      return res.status(403).json({ error: "Access denied" });
    }

    console.log("Company access verified. Creating employee...");

    const clean = (value: unknown) => String(value || '').trim();
    const employeeData = {
      companyId: new mongoose.Types.ObjectId(companyId),
      nome: clean(nome),
      cognome: clean(cognome),
      dataNascita: clean(dataNascita),
      cittaNascita: clean(cittaNascita),
      provinciaNascita: clean(provinciaNascita),
      genere: clean(genere) || undefined,
      codiceFiscale: clean(codiceFiscale).toUpperCase(),
      indirizzo: clean(indirizzo),
      numeroCivico: clean(numeroCivico),
      citta: clean(citta),
      provincia: clean(provincia),
      cap: clean(cap),
      cellulare: clean(cellulare),
      telefono: clean(telefono),
      email: clean(email),
      stato: attivo ? 'attivo' : 'inattivo'
    };

    console.log("Employee data to save:", JSON.stringify(employeeData, null, 2));

    const newEmployee = new Employee(employeeData);
    console.log("Employee instance created:", newEmployee);

    console.log("Attempting to save employee...");
    const savedEmployee = await newEmployee.save();
    console.log("Employee saved successfully:", savedEmployee._id);

    return res.status(201).json(savedEmployee);
  } catch (err: any) {
    console.error("=== CREATE EMPLOYEE ERROR ===");
    console.error("Error type:", err.constructor.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    if (err.name === 'ValidationError') {
      console.error("Validation error details:", err.errors);
      const validationErrors = Object.values(err.errors).map((e: any) => e.message);
      return res.status(400).json({ 
        error: "Validation failed", 
        errors: validationErrors,
        details: err.errors 
      });
    }
    
    if (err.code === 11000) {
      console.error("Duplicate key error:", err.keyPattern, err.keyValue);
      if (err.keyPattern && err.keyPattern.codiceFiscale) {
        return res.status(400).json({ error: "Codice fiscale già presente per questa azienda" });
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

export const updateEmployee: CustomRequestHandler = async (req, res) => {
  try {
    console.log("=== UPDATE EMPLOYEE ===");
    
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const {
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
    } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const company = await Company.findById(employee.companyId);
    if (!company || (!isPrivileged(req.user.role) && !company.user.equals(req.user._id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (nome !== undefined) employee.nome = nome.trim();
    if (cognome !== undefined) employee.cognome = cognome.trim();
    if (dataNascita !== undefined) employee.dataNascita = dataNascita;
    if (cittaNascita !== undefined) employee.cittaNascita = cittaNascita.trim();
    if (provinciaNascita !== undefined) employee.provinciaNascita = provinciaNascita.trim();
    if (genere !== undefined) employee.genere = genere;
    if (codiceFiscale !== undefined) employee.codiceFiscale = codiceFiscale.trim().toUpperCase();
    if (indirizzo !== undefined) employee.indirizzo = indirizzo.trim();
    if (numeroCivico !== undefined) employee.numeroCivico = numeroCivico.trim();
    if (citta !== undefined) employee.citta = citta.trim();
    if (provincia !== undefined) employee.provincia = provincia.trim();
    if (cap !== undefined) employee.cap = cap.trim();
    if (cellulare !== undefined) employee.cellulare = cellulare.trim();
    if (telefono !== undefined) employee.telefono = telefono.trim();
    if (email !== undefined) employee.email = email.trim();
    if (attivo !== undefined) employee.stato = attivo ? 'attivo' : 'inattivo';

    await employee.save();

    return res.json(employee);
  } catch (err: any) {
    console.error("Update employee error:", err);
    
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.codiceFiscale) {
        return res.status(400).json({ error: "Codice fiscale già presente per questa azienda" });
      }
    }
    
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};

export const deleteEmployee: CustomRequestHandler = async (req, res) => {
  try {
    console.log("=== DELETE EMPLOYEE ===");
    
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    
    const company = await Company.findById(employee.companyId);
    if (!company || (!isPrivileged(req.user.role) && !company.user.equals(req.user._id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await employee.deleteOne();

    return res.json({ message: "Employee deleted successfully" });
  } catch (err: any) {
    console.error("Delete employee error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};


export const uploadEmployeesFromExcel: CustomRequestHandler = async (req, res) => {
  try {
    console.log("=== UPLOAD EMPLOYEES FROM EXCEL ===");
    
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { companyId } = req.params;
    console.log("Company ID:", companyId);

    
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (!isPrivileged(req.user.role) && !company.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
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
        console.log("Employee Excel file uploaded successfully:", req.file.path);
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

        const existingImport = await EmployeeImport.findOne({
          companyId: new mongoose.Types.ObjectId(companyId),
          fileHash,
        }).lean();

        if (existingImport) {
          fs.unlinkSync(req.file.path);

          const existingEmployees = existingImport.createdEmployeeIds?.length
            ? await Employee.find({ _id: { $in: existingImport.createdEmployeeIds } })
            : [];

          return res.status(200).json({
            message: `Import già elaborato in precedenza: ${existingImport.createdCount} dipendenti importati`,
            createdCount: existingImport.createdCount,
            errorCount: existingImport.errorCount,
            employees: existingEmployees,
            errors: existingImport.errorCount > 0 ? existingImport.importErrors : undefined,
            idempotentReplay: true,
          });
        }
        
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        console.log("Employee Excel data parsed. Row count:", data.length);

        if (!data || data.length === 0) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Excel file has no data" });
        }

        const employees: any[] = [];
        const errors: string[] = [];
        const normalizeHeader = (value: unknown) =>
          String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        const readCell = (row: Record<string, unknown>, candidates: string[]) => {
          const normalizedCandidates = candidates.map(normalizeHeader);
          for (const [key, value] of Object.entries(row || {})) {
            if (normalizedCandidates.includes(normalizeHeader(key))) {
              return value;
            }
          }
          return '';
        };
        const clean = (value: unknown) => String(value || '').trim();
        const normalizeGender = (value: unknown): 'M' | 'F' | 'A' | undefined => {
          const raw = clean(value).toUpperCase();
          if (!raw) return undefined;
          if (['M', 'MASCHIO', 'UOMO'].includes(raw)) return 'M';
          if (['F', 'FEMMINA', 'DONNA'].includes(raw)) return 'F';
          if (['A', 'ALTRO', 'N', 'ND', 'NONBINARIO', 'NON BINARIO'].includes(raw)) return 'A';
          return undefined;
        };

        const parsedRows = (data as any[]).map((row, index) => {
          const rowObj = (row || {}) as Record<string, unknown>;
          return {
            rowNumber: index + 2,
            employeeData: {
              companyId: new mongoose.Types.ObjectId(companyId),
              nome: clean(readCell(rowObj, ['Nome', 'Firstname', 'First Name'])),
              cognome: clean(readCell(rowObj, ['Cognome', 'Surname', 'Last Name', 'Lastname'])),
              dataNascita: clean(readCell(rowObj, ['Data di nascita', 'Data Nascita', 'Birth Date'])),
              cittaNascita: clean(readCell(rowObj, ['Citt? di nascita', 'Citta Nascita', 'Luogo di nascita'])),
              provinciaNascita: clean(readCell(rowObj, ['Provincia di nascita', 'Provincia Nascita'])),
              genere: normalizeGender(readCell(rowObj, ['Genere', 'Sesso'])),
              codiceFiscale: clean(readCell(rowObj, ['Codice Fiscale', 'CodiceFiscale', 'CF', 'Fiscal Code'])).toUpperCase(),
              indirizzo: clean(readCell(rowObj, ['Indirizzo', 'Address'])),
              numeroCivico: clean(readCell(rowObj, ['Numero Civico', 'N. Civico', 'Civico'])),
              citta: clean(readCell(rowObj, ['Citt?', 'Citta', 'Comune', 'City'])),
              provincia: clean(readCell(rowObj, ['Provincia', 'Province'])),
              cap: clean(readCell(rowObj, ['CAP', 'Zip'])),
              cellulare: clean(readCell(rowObj, ['Cellulare', 'Mobile'])),
              telefono: clean(readCell(rowObj, ['Telefono', 'Phone'])),
              email: clean(readCell(rowObj, ['Email', 'E-mail'])),
              stato: 'attivo'
            }
          };
        });

        const cfCandidates = parsedRows
          .map((r) => r.employeeData.codiceFiscale)
          .filter((cf) => Boolean(cf));
        const existingCfDocs = await Employee.find(
          { companyId, codiceFiscale: { $in: cfCandidates } },
          { codiceFiscale: 1 }
        ).lean();
        const existingCfSet = new Set(
          existingCfDocs.map((d: any) => String(d?.codiceFiscale || '').toUpperCase()).filter(Boolean)
        );
        const seenInFile = new Set<string>();

        for (const { rowNumber, employeeData } of parsedRows) {
          try {
            const requiredFields = ['nome', 'cognome', 'codiceFiscale'];
            for (const field of requiredFields) {
              if (!employeeData[field as keyof typeof employeeData]) {
                throw new Error(`${field} is required`);
              }
            }

            if (seenInFile.has(employeeData.codiceFiscale)) {
              throw new Error(`codiceFiscale duplicato nel file (${employeeData.codiceFiscale})`);
            }
            seenInFile.add(employeeData.codiceFiscale);

            if (existingCfSet.has(employeeData.codiceFiscale)) {
              throw new Error(`codiceFiscale già presente per questa azienda (${employeeData.codiceFiscale})`);
            }

            console.log(`Saving employee: ${employeeData.nome} ${employeeData.cognome}`);
            
            const employee = new Employee(employeeData);
            await employee.save();
            employees.push(employee);
            existingCfSet.add(employeeData.codiceFiscale);
            console.log(`Employee saved successfully: ${employee._id}`);
          } catch (rowError: any) {
            console.error(`Error processing employee row ${rowNumber}:`, rowError);
            errors.push(`Row ${rowNumber}: ${rowError.message}`);
          }
        }

        fs.unlinkSync(req.file.path);
        console.log("Employee uploaded file cleaned up");

        try {
          await EmployeeImport.create({
            companyId: new mongoose.Types.ObjectId(companyId),
            fileHash,
            originalName: req.file.originalname,
            uploadedBy: req.user?._id,
            createdCount: employees.length,
            errorCount: errors.length,
            importErrors: errors,
            createdEmployeeIds: employees.map((employee: any) => employee._id),
          });
        } catch (importErr: any) {
          if (importErr?.code !== 11000) {
            console.warn("Employee import idempotency save warning:", importErr?.message || importErr);
          }
        }

        console.log(`Employee import complete: ${employees.length} employees created, ${errors.length} errors`);
        return res.status(201).json({
          message: `${employees.length} dipendenti importati${errors.length > 0 ? ` con ${errors.length} errori` : ''}`,
          createdCount: employees.length,
          errorCount: errors.length,
          employees,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (processError: any) {
        
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        console.error("Employee Excel processing error:", processError);
        return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
      }
    });
  } catch (err: any) {
    console.error("Upload employees error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};

export const downloadEmployeesTemplateXlsx: CustomRequestHandler = async (_req, res) => {
  try {
    const headers = ['Nome', 'Cognome', 'Codice Fiscale'];
    const sampleRow = ['Mario', 'Rossi', 'RSSMRA80A01H501U'];
    const ws = xlsx.utils.aoa_to_sheet([headers, sampleRow]);
    ws['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 24 }];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Dipendenti');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = 'template_dipendenti.xlsx';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err: any) {
    console.error('Download employee template xlsx error:', err);
    return res.status(500).json({ error: 'Errore durante la generazione del template XLSX' });
  }
};

