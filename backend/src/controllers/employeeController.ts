import { Request, Response } from "express";
import Employee from "../models/Employee";
import Company from "../models/Company";
import { CustomRequestHandler } from "../types/express";
import mongoose from "mongoose";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';

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
    if (!dataNascita) errors.push("Data di nascita is required");
    if (!cittaNascita) errors.push("Città di nascita is required");
    if (!provinciaNascita) errors.push("Provincia di nascita is required");
    if (!genere) errors.push("Genere is required");
    if (!codiceFiscale) errors.push("Codice fiscale is required");
    if (!indirizzo) errors.push("Indirizzo is required");
    if (!numeroCivico) errors.push("Numero civico is required");
    if (!citta) errors.push("Città is required");
    if (!provincia) errors.push("Provincia is required");
    if (!cap) errors.push("CAP is required");

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

    const employeeData = {
      companyId: new mongoose.Types.ObjectId(companyId),
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
        return res.status(400).json({ error: "Codice fiscale already exists" });
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

        for (const [index, row] of (data as any[]).entries()) {
          try {
            console.log(`Processing employee row ${index + 1}:`, JSON.stringify(row));
            
            const employeeData = {
              companyId: new mongoose.Types.ObjectId(companyId),
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

            const requiredFields = ['nome', 'cognome', 'dataNascita', 'cittaNascita', 'provinciaNascita', 'genere', 'codiceFiscale', 'indirizzo', 'numeroCivico', 'citta', 'provincia', 'cap'];
            for (const field of requiredFields) {
              if (!employeeData[field as keyof typeof employeeData]) {
                throw new Error(`${field} is required`);
              }
            }

            console.log(`Saving employee: ${employeeData.nome} ${employeeData.cognome}`);
            
            const employee = new Employee(employeeData);
            await employee.save();
            employees.push(employee);
            console.log(`Employee saved successfully: ${employee._id}`);
          } catch (rowError: any) {
            console.error(`Error processing employee row ${index + 2}:`, rowError);
            errors.push(`Row ${index + 2}: ${rowError.message}`);
          }
        }

        fs.unlinkSync(req.file.path);
        console.log("Employee uploaded file cleaned up");

        console.log(`Employee import complete: ${employees.length} employees created, ${errors.length} errors`);
        return res.status(201).json({
          message: `${employees.length} employees imported successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
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
