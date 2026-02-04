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
    [
      { $set: { seq: { $ifNull: ["$seq", -1] } } },
      { $set: { seq: { $add: ["$seq", 1] } } },
    ],
    { new: true, upsert: true }
  );
  if (!counter) return 0;
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

    const preview =
      String(req.query?.preview || "").toLowerCase() === "1" ||
      String(req.query?.preview || "").toLowerCase() === "true";

    if (preview) {
      const counter = await Counter.findById(COMPANY_ANAGRAFICA_COUNTER_ID);
      const next = Number(counter?.seq ?? -1) + 1;
      return res.json({ numeroAnagrafica: String(next) });
    }

    const next = await getNextCompanyNumeroAnagrafica();
    return res.json({ numeroAnagrafica: String(next) });
  } catch (err: any) {
    console.error("Get next numero anagrafica error:", {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
    });
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

    console.log("[createCompany] request user:", {
      id: req.user._id,
      role: req.user.role,
      email: req.user.email,
    });
    console.log("[createCompany] request body keys:", Object.keys(req.body || {}));

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
            console.warn("[createCompany] consultant not found", contactInfo.laborConsultantId);
            return res.status(400).json({ error: 'Invalid laborConsultantId: consultant not found' });
          }
          // Solo il proprietario o admin possono selezionare il consulente
          if (!isPrivileged(req.user.role) && !consultant.user.equals(req.user._id)) {
            console.warn("[createCompany] consultant ownership mismatch", {
              userId: req.user._id,
              consultantUser: consultant.user,
            });
            return res.status(403).json({ error: 'You do not own the selected consultant' });
          }
          if (!consultant.isActive) {
            console.warn("[createCompany] consultant not active", contactInfo.laborConsultantId);
            return res.status(400).json({ error: 'Selected consultant is not active' });
          }
        } catch (e) {
          console.error("[createCompany] consultant lookup error", e);
          return res.status(400).json({ error: 'Invalid laborConsultantId' });
        }
      }


    const errors: string[] = [];
    if (!businessName) errors.push("Ragione Sociale is required");
    if (!vatNumber) errors.push("Partita IVA is required");
    
    if (errors.length > 0) {
      console.warn("[createCompany] validation errors:", errors);
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

        const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        let data: any[] = [];

        const headerIndex = rawRows.findIndex((row) =>
          row.some((cell) => {
            const key = String(cell || '')
              .trim()
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '');
            return key === 'ragionesociale' || key === 'partitaiva' || key === 'codicefiscale' || key === 'numeronagrafica';
          })
        );

        if (headerIndex >= 0) {
          const headers = rawRows[headerIndex].map((cell) => String(cell || '').trim());
          for (let i = headerIndex + 1; i < rawRows.length; i += 1) {
            const row = rawRows[i];
            const isEmpty = row.every((cell) => String(cell || '').trim() === '');
            if (isEmpty) continue;
            const obj: Record<string, any> = {};
            for (let c = 0; c < headers.length; c += 1) {
              const header = headers[c];
              if (!header) continue;
              obj[header] = row[c];
            }
            data.push(obj);
          }
        } else {
          data = xlsx.utils.sheet_to_json(worksheet);
        }

        console.log("Excel data parsed. Row count:", data.length);
        console.log("Sample row:", data.length > 0 ? JSON.stringify(data[0]) : "No data");

        if (!data || data.length === 0) {
        
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Excel file has no data" });
        }

        
        const companies: any[] = [];
        const errors: string[] = [];
        const previewRows: any[] = [];
        const isPreview = String(req.query?.preview || '').toLowerCase() === '1' ||
          String(req.query?.preview || '').toLowerCase() === 'true';
        const seenVat = new Set<string>();
        const seenFiscal = new Set<string>();

        let previewCounter = 0;
        if (isPreview) {
          const counter = await Counter.findById(COMPANY_ANAGRAFICA_COUNTER_ID);
          previewCounter = Number(counter?.seq ?? -1);
        }

        const normalizeKey = (value: unknown) => {
          if (value == null) return '';
          return String(value)
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
        };

        const pick = (row: Record<string, any>, keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
              return row[key];
            }
          }
          const normalized = new Map<string, any>();
          for (const k of Object.keys(row)) {
            normalized.set(normalizeKey(k), row[k]);
          }
          for (const key of keys) {
            const nk = normalizeKey(key);
            if (normalized.has(nk)) return normalized.get(nk);
          }
          return '';
        };

        for (const [index, row] of (data as any[]).entries()) {
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

            const rowErrors: string[] = [];
            if (!companyData.businessName) rowErrors.push("Ragione Sociale is required");

            const normalizedNumeroAnagrafica = normalizeNumeroAnagrafica(companyData.numeroAnagrafica);
            if (!normalizedNumeroAnagrafica) {
              if (isPreview) {
                previewCounter += 1;
                companyData.numeroAnagrafica = String(previewCounter);
              } else {
                const next = await getNextCompanyNumeroAnagrafica();
                companyData.numeroAnagrafica = String(next);
              }
            } else {
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
              if (seenVat.has(normalizedVat)) rowErrors.push("Duplicate Partita IVA in file");
              seenVat.add(normalizedVat);
            }
            if (normalizedFiscal) {
              if (seenFiscal.has(normalizedFiscal)) rowErrors.push("Duplicate Codice Fiscale in file");
              seenFiscal.add(normalizedFiscal);
            }

            if (normalizedVat || normalizedFiscal) {
              const existing = await Company.findOne({
                $or: [
                  normalizedVat ? { vatNumber: normalizedVat } : undefined,
                  normalizedFiscal ? { fiscalCode: normalizedFiscal } : undefined
                ].filter(Boolean) as any[]
              });
              if (existing) rowErrors.push("Company already exists (Partita IVA or Codice Fiscale)");
            }

            if (isPreview) {
              previewRows.push({
                rowNumber: index + 2,
                data: companyData,
                errors: rowErrors
              });
              if (rowErrors.length) {
                errors.push(`Row ${index + 2}: ${rowErrors.join(', ')}`);
              }
              continue;
            }

            if (rowErrors.length) {
              errors.push(`Row ${index + 2}: ${rowErrors.join(', ')}`);
              continue;
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

        if (!isPreview && companies.length > 0) {
          const DashboardStats = require("../models/Dashboard").default;
          await DashboardStats.findOneAndUpdate(
            { user: req.user?._id },
            { $inc: { companies: companies.length } },
            { new: true, upsert: true }
          );
          console.log("Dashboard stats updated");
        }

        console.log(`Import complete: ${companies.length} companies created, ${errors.length} errors`);
        if (isPreview) {
          return res.status(200).json({
            message: `${previewRows.length} rows parsed${errors.length > 0 ? ` with ${errors.length} issues` : ''}`,
            preview: previewRows,
            errors: errors.length > 0 ? errors : undefined
          });
        }

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
