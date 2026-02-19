import { Request, Response } from "express";
import Company from "../models/Company";
import Counter from "../models/Counter";
import SportelloLavoro from "../models/sportello";
import User from "../models/User";
import { CustomRequestHandler } from "../types/express";
import mongoose from "mongoose";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { NotificationService } from "../models/notificationService";

const isPrivileged = (role: string) => role === 'admin' || role === 'super_admin';
const COMPANY_ANAGRAFICA_COUNTER_ID = "companyNumeroAnagrafica";
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildExactRegex = (value: string) => new RegExp(`^\\s*${escapeRegex(value)}\\s*$`, "i");
const normalizeEntityName = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(srls?|s p a|spa|s a s|sas|snc|s n c|s a p a|sapa)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const resolveResponsabileByTerritorialManager = async (territorialManager?: string) => {
  const raw = (territorialManager || "").trim();
  if (!raw) return null;
  const exact = buildExactRegex(raw);
  const parts = raw.split(/\s+/).filter(Boolean);
  const nameQueries: any[] = [{ organization: exact }, { username: exact }];
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts.slice(1).join(" ");
    nameQueries.push({
      firstName: buildExactRegex(first),
      lastName: buildExactRegex(last),
    });
  } else {
    nameQueries.push({ firstName: exact }, { lastName: exact });
  }

  const candidates = await User.find({
    role: "responsabile_territoriale",
    isActive: { $ne: false },
    $or: nameQueries,
  }).select("_id firstName lastName username organization");

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    console.warn("[company] responsabile ambiguo", {
      territorialManager: raw,
      candidates: candidates.map((c) => ({
        id: c._id?.toString(),
        organization: c.organization,
        username: c.username,
        firstName: c.firstName,
        lastName: c.lastName,
      })),
    });
  }
  const normalizedRaw = normalizeEntityName(raw);
  if (!normalizedRaw) return null;
  const allActive = await User.find({
    role: "responsabile_territoriale",
    isActive: { $ne: false },
  }).select("_id firstName lastName username organization");
  const fuzzy = allActive.filter((c) => {
    const organization = normalizeEntityName(c.organization || "");
    const username = normalizeEntityName(c.username || "");
    const fullName = normalizeEntityName(`${c.firstName || ""} ${c.lastName || ""}`);
    return organization === normalizedRaw || username === normalizedRaw || fullName === normalizedRaw;
  });
  if (fuzzy.length === 1) return fuzzy[0];
  if (fuzzy.length > 1) {
    console.warn("[company] responsabile fuzzy ambiguo", {
      territorialManager: raw,
      normalized: normalizedRaw,
      candidates: fuzzy.map((c) => ({
        id: c._id?.toString(),
        organization: c.organization,
        username: c.username,
        firstName: c.firstName,
        lastName: c.lastName,
      })),
    });
  }
  return null;
};

const resolveSportelloByName = async (sportelloName?: string) => {
  const raw = (sportelloName || "").trim();
  if (!raw) return null;
  const exact = buildExactRegex(raw);
  const candidates = await SportelloLavoro.find({
    isActive: { $ne: false },
    $or: [{ businessName: exact }, { agentName: exact }],
  }).select("_id businessName agentName");
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    console.warn("[company] sportello ambiguo", {
      sportelloName: raw,
      candidates: candidates.map((c) => ({
        id: c._id?.toString(),
        businessName: c.businessName,
        agentName: c.agentName,
      })),
    });
  }
  const normalizedRaw = normalizeEntityName(raw);
  if (!normalizedRaw) return null;
  const allSportelli = await SportelloLavoro.find({
    isActive: { $ne: false },
  }).select("_id businessName agentName");
  const fuzzy = allSportelli.filter((s) => {
    const business = normalizeEntityName(s.businessName || "");
    const agent = normalizeEntityName(s.agentName || "");
    return business === normalizedRaw || agent === normalizedRaw;
  });
  if (fuzzy.length === 1) return fuzzy[0];
  if (fuzzy.length > 1) {
    console.warn("[company] sportello fuzzy ambiguo", {
      sportelloName: raw,
      normalized: normalizedRaw,
      candidates: fuzzy.map((s) => ({
        id: s._id?.toString(),
        businessName: s.businessName,
        agentName: s.agentName,
      })),
    });
  }
  return null;
};

const normalizeNumeroAnagrafica = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length ? normalized : undefined;
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const normalizeObjectId = (value: unknown): string => {
  if (!value) return "";
  return String((value as any)?._id || value).trim();
};

const buildComparableCompanyPayload = (payload: any) => ({
  businessName: normalizeText(payload?.businessName),
  companyName: normalizeText(payload?.companyName),
  vatNumber: normalizeText(payload?.vatNumber),
  fiscalCode: normalizeText(payload?.fiscalCode),
  matricola: normalizeText(payload?.matricola),
  inpsCode: normalizeText(payload?.inpsCode),
  numeroAnagrafica: normalizeText(payload?.numeroAnagrafica),
  address: {
    street: normalizeText(payload?.address?.street),
    city: normalizeText(payload?.address?.city),
    postalCode: normalizeText(payload?.address?.postalCode),
    province: normalizeText(payload?.address?.province),
    country: normalizeText(payload?.address?.country),
  },
  contactInfo: {
    phoneNumber: normalizeText(payload?.contactInfo?.phoneNumber),
    mobile: normalizeText(payload?.contactInfo?.mobile),
    email: normalizeText(payload?.contactInfo?.email),
    pec: normalizeText(payload?.contactInfo?.pec),
    referent: normalizeText(payload?.contactInfo?.referent),
    laborConsultant: normalizeText(payload?.contactInfo?.laborConsultant),
    laborConsultantId: normalizeObjectId(payload?.contactInfo?.laborConsultantId),
  },
  contractDetails: {
    contractType: normalizeText(payload?.contractDetails?.contractType),
    ccnlType: normalizeText(payload?.contractDetails?.ccnlType),
    bilateralEntity: normalizeText(payload?.contractDetails?.bilateralEntity),
    hasFondoSani: Boolean(payload?.contractDetails?.hasFondoSani),
    useEbapPayment: Boolean(payload?.contractDetails?.useEbapPayment),
    territorialManager: normalizeText(payload?.contractDetails?.territorialManager),
  },
  industry: normalizeText(payload?.industry),
  employees: Number(payload?.employees || 0),
  signaler: normalizeText(payload?.signaler),
  actuator: normalizeText(payload?.actuator),
  isActive: Boolean(payload?.isActive),
  user: normalizeObjectId(payload?.user),
});

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

    const isPreview =
      String(req.query?.preview || "").toLowerCase() === "1" ||
      String(req.query?.preview || "").toLowerCase() === "true";

    if (isPreview) {
      return res.status(400).json({ error: "Preview not supported for company creation" });
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
      territorialManager,
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

    const territorialManagerName =
      contractDetails?.territorialManager?.trim?.() ||
      String(territorialManager || "").trim();
    let resolvedResponsabileId: mongoose.Types.ObjectId | undefined;
    if (territorialManagerName) {
      const resolved = await resolveResponsabileByTerritorialManager(territorialManagerName);
      if (!resolved) {
        return res.status(400).json({
          error: `Responsabile territoriale non trovato per "${territorialManagerName}"`,
        });
      }
      resolvedResponsabileId = resolved._id as mongoose.Types.ObjectId;
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
      contractDetails: {
        ...(contractDetails || {}),
        ...(territorialManagerName ? { territorialManager: territorialManagerName } : {}),
      },
      industry: industry || '',
      employees: employees || 0,
      signaler,
      actuator,

      isActive: isAutoApproved ? (isActive !== undefined ? isActive : true) : false,
      isApproved: isAutoApproved,
      pendingApproval: needsApproval,
      approvedBy: isAutoApproved ? req.user._id : undefined,
      approvedAt: isAutoApproved ? new Date() : undefined,
      user: resolvedResponsabileId || new mongoose.Types.ObjectId(req.user._id)
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
      territorialManager,
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

    if (contractDetails || territorialManager !== undefined) {
      const territorialManagerName =
        contractDetails?.territorialManager?.trim?.() ||
        String(territorialManager || "").trim();
      company.contractDetails = { 
        ...company.contractDetails, 
        ...contractDetails,
        ...(territorialManagerName ? { territorialManager: territorialManagerName } : {}),
      };
      if (territorialManagerName) {
        const resolved = await resolveResponsabileByTerritorialManager(territorialManagerName);
        if (!resolved) {
          return res.status(400).json({
            error: `Responsabile territoriale non trovato per "${territorialManagerName}"`,
          });
        }
        company.user = resolved._id as mongoose.Types.ObjectId;
      }
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
        const upsertExistingValue = String(req.query?.upsertExisting ?? "1").toLowerCase();
        const upsertExisting = upsertExistingValue !== "0" && upsertExistingValue !== "false";
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
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
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
            

            const activeRaw = pick(row, ['Attivo', 'Active']);
            const activeNormalized = String(activeRaw ?? '').trim().toLowerCase();
            let parsedIsActive: boolean | undefined;
            if (activeNormalized !== '') {
              if (['si', 'yes', 'true', '1', 'active', 'attivo'].includes(activeNormalized)) {
                parsedIsActive = true;
              } else if (['no', 'false', '0', 'inactive', 'inattivo'].includes(activeNormalized)) {
                parsedIsActive = false;
              }
            }

            const companyData: any = {
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
                laborConsultant: ''
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
              isActive: parsedIsActive,
              user: req.user?._id
            };

            const sportelloCandidates = [
              pick(row, ['Responsabile Sportello', 'Sportello', 'Sportello di riferimento', 'Agente di riferimento']),
              pick(row, ['Sportello Lavoro', 'Consulente del Lavoro', 'Consulente del lavoro']),
            ]
              .map((value) => String(value || '').trim())
              .filter((value, idx, arr) => value && arr.indexOf(value) === idx);
            if (sportelloCandidates.length > 0) {
              companyData.contactInfo.laborConsultant = sportelloCandidates[0];
            }

            const normalizedTerritorialManager = String(companyData.contractDetails?.territorialManager || '')
              .trim()
              .toLowerCase();
            const normalizedLaborConsultant = String(companyData.contactInfo?.laborConsultant || '')
              .trim()
              .toLowerCase();
            if (
              normalizedLaborConsultant &&
              normalizedTerritorialManager &&
              normalizedLaborConsultant === normalizedTerritorialManager
            ) {
              const explicitSportello =
                pick(row, ['Responsabile Sportello', 'Sportello', 'Sportello di riferimento', 'Agente di riferimento']) || '';
              const normalizedExplicitSportello = String(explicitSportello).trim().toLowerCase();
              if (normalizedExplicitSportello && normalizedExplicitSportello !== normalizedTerritorialManager) {
                companyData.contactInfo.laborConsultant = explicitSportello;
              }
            }

            if (!companyData.matricola && companyData.inpsCode) {
              companyData.matricola = companyData.inpsCode;
            }

            let rowErrors: string[] = [];
            if (!companyData.businessName) rowErrors.push("Ragione Sociale is required");

            const normalizedNumeroAnagrafica = normalizeNumeroAnagrafica(companyData.numeroAnagrafica);
            const hasNumeroAnagraficaFromFile = !!normalizedNumeroAnagrafica;
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

            if (companyData.contractDetails?.territorialManager) {
              const resolved = await resolveResponsabileByTerritorialManager(
                companyData.contractDetails.territorialManager
              );
              if (!resolved) {
                rowErrors.push(
                  `Responsabile territoriale non trovato per "${companyData.contractDetails.territorialManager}"`
                );
              } else {
                companyData.user = resolved._id;
              }
            }

            if (sportelloCandidates.length > 0) {
              let resolvedSportello: any = null;
              let rawSportelloName = '';
              for (const candidate of sportelloCandidates) {
                const resolved = await resolveSportelloByName(candidate);
                if (resolved) {
                  resolvedSportello = resolved;
                  rawSportelloName = candidate;
                  break;
                }
              }
              if (!resolvedSportello) {
                rowErrors.push(
                  `Sportello lavoro non trovato per "${sportelloCandidates.join(' / ')}"`
                );
              } else {
                companyData.contactInfo.laborConsultantId = resolvedSportello._id;
                const normalizedRaw = normalizeEntityName(rawSportelloName);
                const normalizedAgent = normalizeEntityName(resolvedSportello.agentName || '');
                const normalizedBusiness = normalizeEntityName(resolvedSportello.businessName || '');
                if (normalizedRaw && normalizedRaw === normalizedAgent) {
                  companyData.contactInfo.laborConsultant = resolvedSportello.agentName;
                } else if (normalizedRaw && normalizedRaw === normalizedBusiness) {
                  companyData.contactInfo.laborConsultant = resolvedSportello.businessName;
                } else {
                  companyData.contactInfo.laborConsultant =
                    resolvedSportello.agentName || resolvedSportello.businessName || rawSportelloName;
                }
              }
            }

            if (normalizedVat) {
              if (seenVat.has(normalizedVat)) rowErrors.push("Duplicate Partita IVA in file");
              seenVat.add(normalizedVat);
            }
            if (normalizedFiscal) {
              if (seenFiscal.has(normalizedFiscal)) rowErrors.push("Duplicate Codice Fiscale in file");
              seenFiscal.add(normalizedFiscal);
            }

            let existingCompany: any = null;
            if (normalizedVat || normalizedFiscal) {
              existingCompany = await Company.findOne({
                $or: [
                  normalizedVat ? { vatNumber: normalizedVat } : undefined,
                  normalizedFiscal ? { fiscalCode: normalizedFiscal } : undefined
                ].filter(Boolean) as any[]
              });
              if (existingCompany && !upsertExisting) {
                rowErrors.push("Company already exists (Partita IVA or Codice Fiscale)");
              }
              // In upsert mode, if file does not provide a valid sportello,
              // preserve existing assignment instead of overwriting with wrong values.
              if (existingCompany && upsertExisting) {
                if (!hasNumeroAnagraficaFromFile && existingCompany.numeroAnagrafica) {
                  companyData.numeroAnagrafica = existingCompany.numeroAnagrafica;
                }
                if (!companyData.user && existingCompany.user) {
                  companyData.user = existingCompany.user;
                }
                if (typeof companyData.isActive !== 'boolean') {
                  companyData.isActive = existingCompany.isActive;
                }
                const incomingSportelloName = String(companyData.contactInfo?.laborConsultant || '').trim();
                const incomingResponsabileName = String(companyData.contractDetails?.territorialManager || '').trim();
                const existingSportelloName = String(existingCompany?.contactInfo?.laborConsultant || '').trim();
                // Prevent accidental overwrite when file puts responsabile name in sportello column.
                if (
                  incomingSportelloName &&
                  incomingResponsabileName &&
                  incomingSportelloName.toLowerCase() === incomingResponsabileName.toLowerCase() &&
                  existingSportelloName &&
                  existingSportelloName.toLowerCase() !== incomingSportelloName.toLowerCase()
                ) {
                  companyData.contactInfo = {
                    ...(companyData.contactInfo || {}),
                    laborConsultantId: existingCompany?.contactInfo?.laborConsultantId,
                    laborConsultant: existingSportelloName,
                  };
                }
                const hasIncomingSportelloId = !!companyData.contactInfo?.laborConsultantId;
                const hasIncomingSportelloName = !!String(companyData.contactInfo?.laborConsultant || '').trim();
                if (!hasIncomingSportelloId && !hasIncomingSportelloName) {
                  companyData.contactInfo = {
                    ...(companyData.contactInfo || {}),
                    laborConsultantId: existingCompany?.contactInfo?.laborConsultantId,
                    laborConsultant: existingCompany?.contactInfo?.laborConsultant || '',
                  };
                }
                rowErrors = rowErrors.filter((err) => {
                  if (err.startsWith('Responsabile territoriale non trovato') && !!companyData.user) {
                    return false;
                  }
                  if (
                    err.startsWith('Sportello lavoro non trovato') &&
                    (
                      !!companyData.contactInfo?.laborConsultantId ||
                      !!String(companyData.contactInfo?.laborConsultant || '').trim()
                    )
                  ) {
                    return false;
                  }
                  return true;
                });
              }
            }

            if (isPreview) {
              let previewAction: "create" | "update" | "unchanged" | "error" = "create";
              if (rowErrors.length > 0) {
                previewAction = "error";
              } else if (existingCompany) {
                const updatePayload = {
                  businessName: companyData.businessName,
                  companyName: companyData.companyName,
                  vatNumber: companyData.vatNumber,
                  fiscalCode: companyData.fiscalCode,
                  matricola: companyData.matricola,
                  inpsCode: companyData.inpsCode,
                  address: companyData.address,
                  contactInfo: companyData.contactInfo,
                  contractDetails: companyData.contractDetails,
                  industry: companyData.industry,
                  employees: companyData.employees,
                  signaler: companyData.signaler,
                  actuator: companyData.actuator,
                  isActive: companyData.isActive,
                  ...(companyData.user ? { user: companyData.user } : {}),
                };
                const incomingComparable = buildComparableCompanyPayload(updatePayload);
                const existingComparable = buildComparableCompanyPayload({
                  ...existingCompany.toObject(),
                  user: companyData.user || existingCompany.user,
                });
                previewAction =
                  JSON.stringify(incomingComparable) === JSON.stringify(existingComparable)
                    ? "unchanged"
                    : "update";
              }
              previewRows.push({
                rowNumber: index + 2,
                data: companyData,
                errors: rowErrors,
                action: previewAction,
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

            if (existingCompany && upsertExisting) {
              const updatePayload = {
                businessName: companyData.businessName,
                companyName: companyData.companyName,
                vatNumber: companyData.vatNumber,
                fiscalCode: companyData.fiscalCode,
                matricola: companyData.matricola,
                inpsCode: companyData.inpsCode,
                address: companyData.address,
                contactInfo: companyData.contactInfo,
                contractDetails: companyData.contractDetails,
                industry: companyData.industry,
                employees: companyData.employees,
                signaler: companyData.signaler,
                actuator: companyData.actuator,
                ...(typeof companyData.isActive === 'boolean' ? { isActive: companyData.isActive } : {}),
                ...(companyData.user ? { user: companyData.user } : {}),
              };
              const incomingComparable = buildComparableCompanyPayload(updatePayload);
              const existingComparable = buildComparableCompanyPayload({
                ...existingCompany.toObject(),
                user: companyData.user || existingCompany.user,
              });
              if (JSON.stringify(incomingComparable) === JSON.stringify(existingComparable)) {
                skippedCount += 1;
                continue;
              }
              const updated = await Company.findByIdAndUpdate(
                existingCompany._id,
                { $set: updatePayload },
                { new: true, runValidators: true }
              );
              if (updated) {
                companies.push(updated);
                updatedCount += 1;
                console.log(`Company updated successfully: ${updated._id}`);
              }
            } else {
              console.log(`Saving company: ${companyData.businessName}`);
              const company = new Company(companyData);
              if (typeof companyData.isActive !== 'boolean') {
                company.isActive = true;
              }
              await company.save();
              companies.push(company);
              createdCount += 1;
              console.log(`Company saved successfully: ${company._id}`);
            }
          } catch (rowError: any) {
            console.error(`Error processing row ${index + 2}:`, rowError);
            errors.push(`Row ${index + 2}: ${rowError.message}`);
          }
        }

        fs.unlinkSync(req.file.path);
        console.log("Uploaded file cleaned up");

        if (!isPreview && createdCount > 0) {
          const DashboardStats = require("../models/Dashboard").default;
          await DashboardStats.findOneAndUpdate(
            { user: req.user?._id },
            { $inc: { companies: createdCount } },
            { new: true, upsert: true }
          );
          console.log("Dashboard stats updated");
        }

        console.log(`Import complete: created=${createdCount}, updated=${updatedCount}, skipped=${skippedCount}, errors=${errors.length}`);
        if (isPreview) {
          return res.status(200).json({
            message: `${previewRows.length} rows parsed${errors.length > 0 ? ` with ${errors.length} issues` : ''}`,
            preview: previewRows,
            errors: errors.length > 0 ? errors : undefined
          });
        }

        return res.status(201).json({
          message: `${createdCount} create, ${updatedCount} update, ${skippedCount} unchanged${errors.length > 0 ? `, ${errors.length} errori` : ''}`,
          companies,
          createdCount,
          updatedCount,
          skippedCount,
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
