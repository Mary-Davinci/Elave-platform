import { Request, Response } from "express";
import Company from "../models/Company";
import Counter from "../models/Counter";
import SportelloLavoro from "../models/sportello";
import { CustomRequestHandler } from "../types/express";
import mongoose from "mongoose";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { NotificationService } from "../models/notificationService";

const isPrivileged = (role: string) => role === 'admin' || role === 'super_admin';
const COMPANY_ANAGRAFICA_COUNTER_ID = "companyNumeroAnagrafica";

const normalizeNumeroAnagrafica = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length ? normalized : undefined;
};

const ensureAnagraficaCounterAtLeast = async (value: string) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return;
  await Counter.findByIdAndUpdate(
    COMPANY_ANAGRAFICA_COUNTER_ID,
    { $max: { seq: numericValue } },
    { upsert: true }
  );
};

const getNextCompanyNumeroAnagrafica = async (): Promise<number> => {
  const counter = await Counter.findByIdAndUpdate(
    COMPANY_ANAGRAFICA_COUNTER_ID,
    { $inc: { seq: 1 }, $setOnInsert: { seq: -1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log("File upload attempt:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase()
    });

    const validExtensions = /\.xlsx$|\.xls$/i;
    const hasValidExtension = validExtensions.test(path.extname(file.originalname).toLowerCase());

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
    } else {
      return cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
    }
  }
}).single('file');

export const getCompanies: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    let query = {};
    
    if (!isPrivileged(req.user.role)) {
      query = { user: req.user._id };
    }

    const companies = await Company.find(query)
      .sort({ createdAt: -1 })
      .populate('contactInfo.laborConsultantId', 'businessName agentName')
      .lean();

    const normalized = companies.map((company: any) => {
      const consultant = company?.contactInfo?.laborConsultantId;
      const consultantName = consultant?.businessName || consultant?.agentName;
      if (consultantName) {
        company.contactInfo = company.contactInfo || {};
        if (!company.contactInfo.laborConsultant) {
          company.contactInfo.laborConsultant = consultantName;
        }
      }
      return company;
    });

    return res.json(normalized);
  } catch (err: any) {
    console.error("Get companies error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getNextNumeroAnagrafica: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const next = await getNextCompanyNumeroAnagrafica();
    return res.json({ numeroAnagrafica: String(next) });
  } catch (err: any) {
    console.error("Get next numero anagrafica error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getCompanyById: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    
    const company = await Company.findById(id)
      .populate('contactInfo.laborConsultantId', 'businessName agentName')
      .lean();
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (!isPrivileged(req.user.role) && company?.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }
    const consultant = company?.contactInfo?.laborConsultantId as any;
    const consultantName = consultant?.businessName || consultant?.agentName;
    if (consultantName) {
      company.contactInfo = company.contactInfo || {};
      if (!company.contactInfo.laborConsultant) {
        company.contactInfo.laborConsultant = consultantName;
      }
    }

    return res.json(company);
  } catch (err: any) {
    console.error("Get company error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createCompany: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { 
      businessName, 
      companyName,
      vatNumber,
      fiscalCode,
      matricola,
      inpsCode,
      numeroAnagrafica,
      address,
      contactInfo,
      contractDetails,
      industry,
      employees,
      signaler,
      actuator,
      isActive 
    } = req.body;

    // valida sportello lavoro se cè
    if (contactInfo?.laborConsultantId) {
      try {
        const consultant = await SportelloLavoro.findById(contactInfo.laborConsultantId);
        if (!consultant) {
          return res.status(400).json({ error: 'Invalid laborConsultantId: consultant not found' });
        }
        // Solo il proprietario o admin possono selezionare il consulente
        if (!isPrivileged(req.user.role) && !consultant.user.equals(req.user._id)) {
          return res.status(403).json({ error: 'You do not own the selected consultant' });
        }
        if (!consultant.isActive) {
          return res.status(400).json({ error: 'Selected consultant is not active' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'Invalid laborConsultantId' });
      }
    }


    const errors: string[] = [];
    if (!businessName) errors.push("Ragione Sociale is required");
    if (!vatNumber) errors.push("Partita IVA is required");
    
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }


    const isAutoApproved = ['admin', 'super_admin'].includes(req.user.role);
    const needsApproval = ['responsabile_territoriale', 'sportello_lavoro'].includes(req.user.role);


    // sanitize contactInfo: remove empty laborConsultantId to avoid ObjectId cast errors
    if (contactInfo && contactInfo.laborConsultantId === '') {
      delete contactInfo.laborConsultantId;
    }

    const normalizedNumeroAnagrafica = normalizeNumeroAnagrafica(numeroAnagrafica);
    let resolvedNumeroAnagrafica = normalizedNumeroAnagrafica;
    if (!resolvedNumeroAnagrafica) {
      const next = await getNextCompanyNumeroAnagrafica();
      resolvedNumeroAnagrafica = String(next);
    } else {
      await ensureAnagraficaCounterAtLeast(resolvedNumeroAnagrafica);
    }

    const newCompany = new Company({
      businessName, 
      companyName: companyName || businessName,
      vatNumber,
      fiscalCode,
      matricola,
      inpsCode,
      numeroAnagrafica: resolvedNumeroAnagrafica,
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
      user: new mongoose.Types.ObjectId(req.user._id)
    });

    await newCompany.save();


    if (needsApproval) {
      await NotificationService.notifyAdminsOfPendingApproval({
        title: 'New Company Pending Approval',
        message: `${req.user.firstName || req.user.username} created a new company "${businessName}" that needs approval.`,
        type: 'company_pending',
        entityId: (newCompany._id as mongoose.Types.ObjectId).toString(), // Fix: Cast to ObjectId and convert to string
        entityName: businessName,
        createdBy: req.user._id.toString(),
        createdByName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName}` : req.user.username
      });
    }

    
    const DashboardStats = require("../models/Dashboard").default;
    await DashboardStats.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { companies: 1 } },
      { new: true, upsert: true }
    );

    return res.status(201).json({
      ...newCompany.toObject(),
      message: needsApproval ? 'Company created and submitted for approval' : 'Company created successfully'
    });
  } catch (err: any) {
    console.error("Create company error:", err);
    
    if (err.code === 11000 && err.keyPattern && err.keyPattern.vatNumber) {
      return res.status(400).json({ error: "VAT number already exists" });
    }
    
    return res.status(500).json({ error: "Server error" });
  }
};


export const updateCompany: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const { 
      businessName, 
      companyName,
      vatNumber,
      fiscalCode,
      matricola,
      inpsCode,
      numeroAnagrafica,
      address,
      contactInfo,
      contractDetails,
      industry,
      employees,
      signaler,
      actuator,
      isActive 
    } = req.body;

    const company = await Company.findById(id);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

   
    if (!isPrivileged(req.user.role) && !company.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

   
    const errors: string[] = [];
    if (businessName === '') errors.push("Ragione Sociale cannot be empty");
    if (vatNumber === '') errors.push("Partita IVA cannot be empty");

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

   
    if (businessName !== undefined) company.businessName = businessName;
    if (companyName !== undefined) company.companyName = companyName;
    if (vatNumber !== undefined) company.vatNumber = vatNumber;
    if (fiscalCode !== undefined) company.fiscalCode = fiscalCode;
    if (matricola !== undefined) company.matricola = matricola;
    if (inpsCode !== undefined) company.inpsCode = inpsCode;
    if (numeroAnagrafica !== undefined) {
      const normalizedNumeroAnagrafica = normalizeNumeroAnagrafica(numeroAnagrafica);
      company.numeroAnagrafica = normalizedNumeroAnagrafica || "";
      if (normalizedNumeroAnagrafica) {
        await ensureAnagraficaCounterAtLeast(normalizedNumeroAnagrafica);
      }
    }
    
    
    if (address) {
      company.address = { 
        ...company.address, 
        ...address 
      };
    }

    if (contactInfo) {
      // Valida sportello lavoro
      if (contactInfo.laborConsultantId) {
        try {
          const consultant = await SportelloLavoro.findById(contactInfo.laborConsultantId);
          if (!consultant) {
            return res.status(400).json({ error: 'Invalid laborConsultantId: consultant not found' });
          }
          if (!isPrivileged(req.user.role) && !consultant.user.equals(req.user._id)) {
            return res.status(403).json({ error: 'You do not own the selected consultant' });
          }
          if (!consultant.isActive) {
            return res.status(400).json({ error: 'Selected consultant is not active' });
          }
        } catch (e) {
          return res.status(400).json({ error: 'Invalid laborConsultantId' });
        }
      }
      // pulisce contactInfo
      if (contactInfo.laborConsultantId === '') {
        delete contactInfo.laborConsultantId;
      }

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

    if (industry !== undefined) company.industry = industry;
    if (employees !== undefined) company.employees = employees;
    if (signaler !== undefined) company.signaler = signaler;
    if (actuator !== undefined) company.actuator = actuator;
    if (isActive !== undefined) company.isActive = isActive;

    await company.save();

    return res.json(company);
  } catch (err: any) {
    console.error("Update company error:", err);
    
    if (err.code === 11000 && err.keyPattern && err.keyPattern.vatNumber) {
      return res.status(400).json({ error: "VAT number already exists" });
    }
    
    return res.status(500).json({ error: "Server error" });
  }
};


export const deleteCompany: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    const company = await Company.findById(id);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

  
    if (!isPrivileged(req.user.role) && !company.user.equals(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    await company.deleteOne();

    
    const DashboardStats = require("../models/Dashboard").default;
    await DashboardStats.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { companies: -1 } },
      { new: true }
    );

    return res.json({ message: "Company deleted successfully" });
  } catch (err: any) {
    console.error("Delete company error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


export const uploadCompaniesFromExcel: CustomRequestHandler = async (req, res) => {
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
        
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        console.log("Excel data parsed. Row count:", data.length);
        console.log("Sample row:", data.length > 0 ? JSON.stringify(data[0]) : "No data");

        if (!data || data.length === 0) {
        
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Excel file has no data" });
        }

        
        const companies: any[] = [];
        const errors: string[] = [];

        for (const [index, row] of (data as any[]).entries()) {
          try {
            console.log(`Processing row ${index + 1}:`, JSON.stringify(row));
            

            const companyData = {
              businessName: row['Ragione Sociale'] || '', 
              companyName: row['Azienda'] || row['Ragione Sociale'] || '',
              vatNumber: row['Partita IVA'] || '', 
              fiscalCode: row['Codice Fiscale'] || '',
              matricola: row['Matricola'] || '',
              inpsCode: row['Codice INPS'] || '',
              numeroAnagrafica: row['Numero anagrafica'] || row['Numero Anagrafica'] || '',
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

            const normalizedNumeroAnagrafica = normalizeNumeroAnagrafica(companyData.numeroAnagrafica);
            if (!normalizedNumeroAnagrafica) {
              const next = await getNextCompanyNumeroAnagrafica();
              companyData.numeroAnagrafica = String(next);
            } else {
              companyData.numeroAnagrafica = normalizedNumeroAnagrafica;
              await ensureAnagraficaCounterAtLeast(normalizedNumeroAnagrafica);
            }

            console.log(`Saving company: ${companyData.businessName}`);
            
            const company = new Company(companyData);
            await company.save();
            companies.push(company);
            console.log(`Company saved successfully: ${company._id}`);
          } catch (rowError: any) {
            console.error(`Error processing row ${index + 2}:`, rowError);
            errors.push(`Row ${index + 2}: ${rowError.message}`);
          }
        }

        fs.unlinkSync(req.file.path);
        console.log("Uploaded file cleaned up");

        if (companies.length > 0) {
          const DashboardStats = require("../models/Dashboard").default;
          await DashboardStats.findOneAndUpdate(
            { user: req.user?._id },
            { $inc: { companies: companies.length } },
            { new: true, upsert: true }
          );
          console.log("Dashboard stats updated");
        }

        console.log(`Import complete: ${companies.length} companies created, ${errors.length} errors`);
        return res.status(201).json({
          message: `${companies.length} companies imported successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
          companies,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (processError: any) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        console.error("Excel processing error:", processError);
        return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
      }
    });
  } catch (err: any) {
    console.error("Upload companies error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
};
