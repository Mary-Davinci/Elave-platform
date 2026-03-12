import { Response } from "express";
import { CustomRequestHandler } from "../types/express";
import ContoTransaction from "../models/ContoTransaction";
import ContoNonRiconciliata from "../models/ContoNonRiconciliata";
import ContoImport from "../models/ContoImport";
import User from "../models/User";
import Company from "../models/Company";
import SportelloLavoro from "../models/sportello";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import xlsx from "xlsx";
import crypto from "crypto";
import {
  clearComputedContoCaches,
  getComputedCacheKey,
  readComputedBreakdownCache,
  readComputedSummaryCache,
  writeComputedBreakdownCache,
  writeComputedSummaryCache,
} from "../services/contoCacheService";
import {
  escapeRegex,
  getEffectiveUserId,
  getSportelloScopedCompanyIds,
  getResponsabileScope,
} from "../services/contoScopeService";
const FIACOM_NET_RATIO = 0.8;
type ContoAccount = "proselitismo" | "servizi";

// TODO(conto-refactor): ridurre progressivamente contoController monolitico.
// 1) Estrarre parsing/import XLSX in contoImportService (preview/upload + dedupe).
// 2) Estrarre query summary/breakdown in contoAnalyticsService (pipeline aggregate).
// 3) Estrarre query transactions/non-riconciliate in contoQueryService (filtri + paging).
// 4) Lasciare qui solo orchestrazione HTTP (req/res) e mapping errori.
// 5) Aggiungere test di regressione su proselitismo/servizi prima della rimozione finale.

const round2 = (value: number) => Math.round(value * 100) / 100;
const parseDateStart = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};
const parseDateEnd = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};
const getRequestedContoAccount = (
  req: Parameters<CustomRequestHandler>[0]
): ContoAccount => {
  const raw = String(req.body?.account ?? req.query?.account ?? "proselitismo")
    .trim()
    .toLowerCase();
  return raw === "servizi" ? "servizi" : "proselitismo";
};
const normalizePercent = (value: unknown, fallback: number) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < 0) return 0;
  if (num > 100) return 100;
  return num;
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, "../uploads/conto");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `conto-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const validExtensions = /\.xlsx$|\.xls$/i;
    if (validExtensions.test(path.extname(file.originalname).toLowerCase())) {
      return cb(null, true);
    }
    return cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
  },
}).single("file");

const normalizeHeader = (value: any) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");

const headerAliases: Record<string, string[]> = {
  mese: ["mese"],
  anno: ["anno"],
  matricolaInps: ["matricola inps", "matricola", "inps"],
  ragioneSociale: ["ragione sociale", "ragione", "azienda", "impresa"],
  nonRiconciliata: ["non riconciliata", "quota non riconciliata", "non riconciliate"],
  quotaRiconciliata: ["quota riconciliata", "riconciliata"],
  fondoSanitario: ["fondo sanitario", "fondo sanitario"],
  quotaFiacom: ["quota fiacom", "fiacom", "quota elav", "elav"],
};

const findHeaderIndex = (headers: any[], aliases: string[]) => {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(normalizeHeader(alias));
    if (idx >= 0) return idx;
  }
  return -1;
};

const parseNumber = (value: any) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/\./g, "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

const parseMonth = (value: any) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Math.min(Math.max(value, 1), 12);
  const v = String(value).toLowerCase().trim();
  const map: Record<string, number> = {
    gennaio: 1,
    feb: 2,
    febbraio: 2,
    mar: 3,
    marzo: 3,
    apr: 4,
    aprile: 4,
    mag: 5,
    maggio: 5,
    giu: 6,
    giugno: 6,
    lug: 7,
    luglio: 7,
    ago: 8,
    agosto: 8,
    set: 9,
    settembre: 9,
    ott: 10,
    ottobre: 10,
    nov: 11,
    novembre: 11,
    dic: 12,
    dicembre: 12,
  };
  const num = map[v];
  if (num) return num;
  const asNum = Number(v);
  return Number.isFinite(asNum) ? Math.min(Math.max(asNum, 1), 12) : null;
};

const buildRowData = (row: any[], headerIndexes: Record<string, number>) => {
  const get = (key: string) => {
    const idx = headerIndexes[key];
    if (idx === undefined || idx < 0) return "";
    return row[idx];
  };
  return {
    mese: get("mese")?.toString().trim() || "",
    anno: get("anno")?.toString().trim() || "",
    matricolaInps: get("matricolaInps")?.toString().trim() || "",
    ragioneSociale: get("ragioneSociale")?.toString().trim() || "",
    nonRiconciliata: get("nonRiconciliata"),
    quotaRiconciliata: get("quotaRiconciliata"),
    fondoSanitario: get("fondoSanitario"),
    quotaFiacom: get("quotaFiacom"),
  };
};

const isRowEmpty = (row: any[]) =>
  !row ||
  row.length === 0 ||
  row.every((cell) => {
    if (cell === null || cell === undefined) return true;
    const value = String(cell).trim();
    return value === "";
  });

const buildImportKey = (
  data: any,
  baseAmount: number | null,
  nonRec: number | null,
  account: ContoAccount
) => {
  const mese = (data.mese || "").toString().trim();
  const anno = (data.anno || "").toString().trim();
  const matricola = (data.matricolaInps || "").toString().trim().toUpperCase();
  const ragione = (data.ragioneSociale || "").toString().trim().toUpperCase();
  const fiacom = baseAmount && baseAmount > 0 ? `F:${round2(baseAmount)}` : "";
  const non = nonRec && nonRec > 0 ? `NR:${round2(nonRec)}` : "";
  return [account, mese, anno, matricola, ragione, fiacom, non].join("|");
};


export const createCompetenzaTransactions: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const {
      account = "proselitismo",
      baseAmount,
      responsabileId,
      sportelloId,
      description = "Competenza proselitismo",
      category = "Competenza",
      companyId,
      source = "manuale",
    } = req.body as {
      account?: "proselitismo" | "servizi";
      baseAmount?: number | string;
      responsabileId?: string;
      sportelloId?: string;
      description?: string;
      category?: string;
      companyId?: string;
      source?: "manuale" | "xlsx";
    };

    const base = Number(baseAmount);
    if (!Number.isFinite(base) || base <= 0) {
      return res.status(400).json({ error: "baseAmount is required and must be > 0" });
    }
    if (!responsabileId || !sportelloId) {
      return res.status(400).json({ error: "responsabileId and sportelloId are required" });
    }

    const [responsabile, sportello] = await Promise.all([
      User.findById(responsabileId).select("_id role isActive"),
      User.findById(sportelloId).select("_id role isActive"),
    ]);

    if (!responsabile || responsabile.role !== "responsabile_territoriale" || responsabile.isActive === false) {
      return res.status(400).json({ error: "Responsabile territoriale non valido o inattivo" });
    }
    if (!sportello || sportello.role !== "sportello_lavoro" || sportello.isActive === false) {
      return res.status(400).json({ error: "Sportello lavoro non valido o inattivo" });
    }

    const fiacomAmount = round2(base * FIACOM_NET_RATIO);
    const responsabilePercent = normalizePercent(
      responsabile.profitSharePercentage,
      0
    );
    const responsabileAmount = round2(fiacomAmount * (responsabilePercent / 100));
    const sportelloDoc = await SportelloLavoro.findOne({ user: sportello._id })
      .select("_id agreedCommission isActive")
      .lean<{ _id: mongoose.Types.ObjectId; agreedCommission?: number; isActive?: boolean }>();
    if (!sportelloDoc || sportelloDoc.isActive === false) {
      return res.status(400).json({ error: "Sportello lavoro non valido o inattivo" });
    }
    const sportelloPercent = normalizePercent(sportelloDoc.agreedCommission, 0);
    const sportelloAmount = round2(fiacomAmount * (sportelloPercent / 100));
    console.log("[conto] competenza ratios", {
      base,
      fiacomAmount,
      responsabilePercent,
      responsabileAmount,
      sportelloPercent,
      sportelloAmount,
    });

    const companyRef = companyId && mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : undefined;

    const transactions = await ContoTransaction.insertMany([
      {
        account,
        amount: fiacomAmount,
        rawAmount: base,
        type: "entrata",
        status: "completata",
        description,
        category,
        user: req.user._id,
        company: companyRef,
        source,
      },
      {
        account,
        amount: responsabileAmount,
        rawAmount: base,
        type: "entrata",
        status: "completata",
        description,
        category,
        user: responsabile._id,
        company: companyRef,
        source,
      },
      {
        account,
        amount: sportelloAmount,
        rawAmount: base,
        type: "entrata",
        status: "completata",
        description,
        category,
        user: sportello._id,
        company: companyRef,
        source,
      },
    ]);
    clearComputedContoCaches();

    return res.status(201).json({
      message: "Transazioni create",
      transactions,
      breakdown: {
        baseAmount: base,
        fiacomAmount,
        responsabileAmount,
        sportelloAmount,
      },
    });
  } catch (err: any) {
    console.error("Create conto transactions error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const previewContoFromExcel: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      try {
        const targetAccount = getRequestedContoAccount(req);
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
        const existingImport = await ContoImport.findOne({ fileHash }).select("createdAt");

        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rows || rows.length < 2) {
          fs.unlinkSync(file.path);
          return res.status(400).json({ error: "Excel file has no data" });
        }

        const headerRow = rows[0];
        const headerIndexes: Record<string, number> = {};
        Object.keys(headerAliases).forEach((key) => {
          headerIndexes[key] = findHeaderIndex(headerRow, headerAliases[key]);
        });

        const preview: any[] = [];
        const nonRiconciliate: any[] = [];

        for (let idx = 0; idx < rows.slice(1).length; idx += 1) {
          const row = rows[idx + 1];
          if (isRowEmpty(row)) continue;
          const data = buildRowData(row, headerIndexes);
          const errors: string[] = [];
          const rowNumber = idx + 2;
          const baseAmount = parseNumber(data.quotaFiacom);
          const nonRec = parseNumber(data.nonRiconciliata);

          if (!data.matricolaInps && !data.ragioneSociale) {
            errors.push("Matricola INPS o Ragione Sociale mancante");
          }

          if (baseAmount && baseAmount > 0 && (data.matricolaInps || data.ragioneSociale)) {
            const nameRegex = data.ragioneSociale
              ? new RegExp(`^\\s*${escapeRegex(data.ragioneSociale)}\\s*$`, "i")
              : null;
            let company = null as any;

            if (data.matricolaInps) {
              const matricolaToken = String(data.matricolaInps).trim();
              const matricolaRegex = new RegExp(`(^|\\s)${escapeRegex(matricolaToken)}(\\s|$)`, "i");
              company = await Company.findOne({
                $or: [
                  { inpsCode: data.matricolaInps },
                  { matricola: data.matricolaInps },
                  { inpsCode: matricolaRegex },
                  { matricola: matricolaRegex },
                ],
              }).select("_id user companyName businessName contractDetails.territorialManager contactInfo.laborConsultantId contactInfo.laborConsultant");
            }

            if (!company && nameRegex) {
              const matches = await Company.find({
                $or: [{ businessName: nameRegex }, { companyName: nameRegex }],
              })
                .select("_id user companyName businessName contractDetails.territorialManager contactInfo.laborConsultantId contactInfo.laborConsultant")
                .limit(2);
              if (matches.length > 1) {
                errors.push("Azienda ambigua (stesso nome, matricola diversa). Usa la matricola.");
              } else {
                company = matches[0] || null;
              }
            }

            if (!company) {
              errors.push("Azienda non trovata");
            } else {
              let responsabileId: string | null = null;
              const territorialManagerName = company.contractDetails?.territorialManager?.trim() || "";
              if (territorialManagerName) {
                const managerRegex = new RegExp(`^\\s*${escapeRegex(territorialManagerName)}\\s*$`, "i");
                const responsabile = await User.findOne({
                  isActive: true,
                  role: "responsabile_territoriale",
                  $or: [
                    { organization: managerRegex },
                    { username: managerRegex },
                    { firstName: managerRegex },
                    { lastName: managerRegex },
                  ],
                })
                  .select("_id")
                  .lean<{ _id: mongoose.Types.ObjectId }>();
                if (responsabile) responsabileId = responsabile._id.toString();
              }
              if (!responsabileId && company.user) {
                const responsabileByCompanyUser = await User.findOne({
                  _id: company.user,
                  isActive: true,
                  role: "responsabile_territoriale",
                })
                  .select("_id")
                  .lean<{ _id: mongoose.Types.ObjectId }>();
                if (responsabileByCompanyUser) responsabileId = responsabileByCompanyUser._id.toString();
              }
              if (!responsabileId) {
                errors.push("Responsabile territoriale non associato");
              }

              let sportelloId = company.contactInfo?.laborConsultantId?.toString();
              const consultantName = company.contactInfo?.laborConsultant?.trim() || "";
              let sportelloDoc = null as {
                _id: mongoose.Types.ObjectId;
                isActive?: boolean;
              } | null;

              if (sportelloId) {
                sportelloDoc = await SportelloLavoro.findById(sportelloId)
                  .select("_id isActive")
                  .lean<{ _id: mongoose.Types.ObjectId; isActive?: boolean }>();
                if (!sportelloDoc || sportelloDoc.isActive === false) {
                  sportelloDoc = null;
                  sportelloId = "";
                }
              }
              if (!sportelloDoc && consultantName) {
                const consultantRegex = new RegExp(`^\\s*${escapeRegex(consultantName)}\\s*$`, "i");
                sportelloDoc = await SportelloLavoro.findOne({
                  isActive: true,
                  $or: [{ businessName: consultantRegex }, { agentName: consultantRegex }],
                })
                  .select("_id isActive")
                  .lean<{ _id: mongoose.Types.ObjectId; isActive?: boolean }>();
                if (sportelloDoc) {
                  sportelloId = sportelloDoc._id.toString();
                }
              }
              if (!sportelloId) {
                errors.push("Sportello lavoro non associato");
              }
            }
          }

          if (!baseAmount || baseAmount <= 0) {
            if (nonRec && nonRec > 0) {
              nonRiconciliate.push({ rowNumber, data, errors });
            } else {
              errors.push("Quota FIACOM mancante o non valida");
              preview.push({ rowNumber, data, errors });
            }
          } else {
            preview.push({ rowNumber, data, errors });
          }
        }

        fs.unlinkSync(file.path);
        return res.json({
          preview,
          nonRiconciliate,
          errors: preview.flatMap((p) => p.errors || []),
          account: targetAccount,
          fileHash,
          fileAlreadyUploaded: !!existingImport,
          fileAlreadyUploadedAt: existingImport?.createdAt,
        });
      } catch (processError: any) {
        if (file && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
      }
    });
  } catch (err: any) {
    console.error("Preview conto error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const uploadContoFromExcel: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const uploaderId = req.user._id;

    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (!uploaderId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      try {
        const targetAccount = getRequestedContoAccount(req);
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
        const existingImport = await ContoImport.findOne({ fileHash }).select("createdAt");
        const confirmDuplicates = String(req.body?.confirmDuplicates || "").toLowerCase() === "true";

        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rows || rows.length < 2) {
          fs.unlinkSync(file.path);
          return res.status(400).json({ error: "Excel file has no data" });
        }

        const headerRow = rows[0];
        const headerIndexes: Record<string, number> = {};
        Object.keys(headerAliases).forEach((key) => {
          headerIndexes[key] = findHeaderIndex(headerRow, headerAliases[key]);
        });

        const errors: string[] = [];
        const transactionsToInsert: any[] = [];
        const nonRiconciliateToInsert: any[] = [];
        const duplicateRows: any[] = [];
        const rowKeys: { key: string; rowNumber: number; data: any }[] = [];
        const seenInFile = new Set<string>();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (isRowEmpty(row)) {
            continue;
          }
          const data = buildRowData(row, headerIndexes);
          const baseAmount = parseNumber(data.quotaFiacom);
          const nonRec = parseNumber(data.nonRiconciliata);
          const importKey = buildImportKey(data, baseAmount, nonRec, targetAccount);

          if (!data.matricolaInps && !data.ragioneSociale) {
            errors.push(`Row ${i + 1}: Matricola INPS o Ragione Sociale mancante`);
            continue;
          }

          if (seenInFile.has(importKey)) {
            duplicateRows.push({ rowNumber: i + 1, reason: "Duplicato nel file", data });
            continue;
          }
          seenInFile.add(importKey);
          rowKeys.push({ key: importKey, rowNumber: i + 1, data });

          if (!baseAmount || baseAmount <= 0) {
            if (nonRec && nonRec > 0) {
              const month = parseMonth(data.mese);
              const year = Number(data.anno);
              const date =
                month && Number.isFinite(year)
                  ? new Date(year, month - 1, 1)
                  : new Date();
              const descriptionParts = [
                data.ragioneSociale ? `Azienda: ${data.ragioneSociale}` : null,
                data.matricolaInps ? `Matricola: ${data.matricolaInps}` : null,
                data.nonRiconciliata ? `Non riconciliata: ${data.nonRiconciliata}` : null,
              ].filter(Boolean);
              const description = descriptionParts.join(" | ") || "Quota non riconciliata";
              nonRiconciliateToInsert.push({
                account: targetAccount,
                amount: nonRec,
                description,
                user: uploaderId,
                source: "xlsx",
                importKey,
                date,
              });
              continue;
            }
            errors.push(`Row ${i + 1}: Quota FIACOM mancante o non valida`);
            continue;
          }

          const nameRegex = data.ragioneSociale
            ? new RegExp(`^\\s*${escapeRegex(data.ragioneSociale)}\\s*$`, "i")
            : null;

          let company = null as any;

          let triedMatricola = false;
          if (data.matricolaInps) {
            triedMatricola = true;
            const matricolaToken = String(data.matricolaInps).trim();
            const matricolaRegex = new RegExp(
              `(^|\\s)${escapeRegex(matricolaToken)}(\\s|$)`,
              "i"
            );
            company = await Company.findOne({
              $or: [
                { inpsCode: data.matricolaInps },
                { matricola: data.matricolaInps },
                { inpsCode: matricolaRegex },
                { matricola: matricolaRegex },
              ],
            }).select("_id user companyName businessName contractDetails.territorialManager contactInfo.laborConsultantId contactInfo.laborConsultant");
            if (company) {
              console.log("[conto-upload] matched by matricola", {
                row: i + 1,
                matricola: matricolaToken,
                companyId: company._id?.toString?.() || company._id,
                companyName: company.companyName || company.businessName,
              });
            }
          }

          if (!company && nameRegex) {
            const matches = await Company.find({
              $or: [{ businessName: nameRegex }, { companyName: nameRegex }],
            })
              .select("_id user companyName businessName contractDetails.territorialManager contactInfo.laborConsultantId contactInfo.laborConsultant")
              .limit(2);

            if (matches.length > 1) {
              errors.push(`Row ${i + 1}: Azienda ambigua (stesso nome, matricola diversa). Usa la matricola.`);
              continue;
            }

            company = matches[0] || null;
          }

          if (!company) {
            errors.push(`Row ${i + 1}: Azienda non trovata`);
            continue;
          }

          let responsabileId: string | null = null;
          const territorialManagerName = company.contractDetails?.territorialManager?.trim() || "";
          if (territorialManagerName) {
            const managerRegex = new RegExp(`^\\s*${escapeRegex(territorialManagerName)}\\s*$`, "i");
            const responsabile = await User.findOne({
              isActive: true,
              role: "responsabile_territoriale",
              $or: [
                { organization: managerRegex },
                { username: managerRegex },
                { firstName: managerRegex },
                { lastName: managerRegex },
              ],
            })
              .select("_id")
              .lean<{ _id: mongoose.Types.ObjectId }>();
            if (responsabile) {
              responsabileId = responsabile._id.toString();
            }
          }
          // Fallback: if contractual manager name is missing/unresolved, use company.user
          // when that user is an active responsabile territoriale.
          if (!responsabileId && company.user) {
            const responsabileByCompanyUser = await User.findOne({
              _id: company.user,
              isActive: true,
              role: "responsabile_territoriale",
            })
              .select("_id")
              .lean<{ _id: mongoose.Types.ObjectId }>();
            if (responsabileByCompanyUser) {
              responsabileId = responsabileByCompanyUser._id.toString();
            }
          }
          let sportelloId = company.contactInfo?.laborConsultantId?.toString();
          let sportelloDoc: {
            _id: mongoose.Types.ObjectId;
            businessName?: string;
            agentName?: string;
            agreedCommission?: number;
            isActive?: boolean;
          } | null = null;
          const consultantName = company.contactInfo?.laborConsultant?.trim() || "";

          if (!responsabileId) {
            errors.push(
              `Row ${i + 1} (${data.matricolaInps || "-"} | ${data.ragioneSociale || "-"})` +
                `: Responsabile territoriale non associato`
            );
            continue;
          }
          if (sportelloId) {
            sportelloDoc = await SportelloLavoro.findById(sportelloId)
              .select("_id businessName agentName agreedCommission isActive")
              .lean<{
                _id: mongoose.Types.ObjectId;
                businessName?: string;
                agentName?: string;
                agreedCommission?: number;
                isActive?: boolean;
              }>();
            if (!sportelloDoc || sportelloDoc.isActive === false) {
              sportelloDoc = null;
              sportelloId = "";
            }
          }
          if (!sportelloDoc && consultantName) {
            const consultantRegex = new RegExp(`^\\s*${escapeRegex(consultantName)}\\s*$`, "i");
            sportelloDoc = await SportelloLavoro.findOne({
              isActive: true,
              $or: [{ businessName: consultantRegex }, { agentName: consultantRegex }],
            })
              .select("_id businessName agentName agreedCommission isActive")
              .lean<{
                _id: mongoose.Types.ObjectId;
                businessName?: string;
                agentName?: string;
                agreedCommission?: number;
                isActive?: boolean;
              }>();
            if (sportelloDoc) {
              sportelloId = sportelloDoc._id.toString();
            }
          }
          if (sportelloDoc) {
            const normalizedName = (sportelloDoc.businessName || sportelloDoc.agentName || consultantName).trim();
            const currentName = consultantName.trim();
            // During conto import we must not overwrite company anagrafica.
            // We only backfill missing sportello fields.
            if (!sportelloId || !currentName) {
              await Company.updateOne(
                { _id: company._id },
                {
                  $set: {
                    "contactInfo.laborConsultantId": sportelloDoc._id,
                    ...(currentName ? {} : { "contactInfo.laborConsultant": normalizedName }),
                  },
                }
              );
            }
          }
          if (!sportelloId) {
            errors.push(`Row ${i + 1}: Sportello lavoro non associato`);
            continue;
          }

          const fiacomAmount = round2(baseAmount * FIACOM_NET_RATIO);
          const responsabileUser = await User.findById(responsabileId).select(
            "_id role isActive profitSharePercentage"
          );
          if (!responsabileUser || responsabileUser.isActive === false) {
            errors.push(`Row ${i + 1}: Responsabile territoriale non valido o inattivo`);
            continue;
          }
          if (!sportelloDoc) {
            sportelloDoc = await SportelloLavoro.findById(sportelloId)
              .select("_id agreedCommission isActive")
              .lean<{
                _id: mongoose.Types.ObjectId;
                agreedCommission?: number;
                isActive?: boolean;
              }>();
          }
          if (!sportelloDoc || sportelloDoc.isActive === false) {
            errors.push(`Row ${i + 1}: Sportello lavoro non valido o inattivo`);
            continue;
          }
          const responsabilePercent = normalizePercent(
            responsabileUser.profitSharePercentage,
            0
          );
          const responsabileAmount = round2(fiacomAmount * (responsabilePercent / 100));
          const sportelloPercent = normalizePercent(sportelloDoc.agreedCommission, 0);
          const sportelloAmount = round2(fiacomAmount * (sportelloPercent / 100));
          console.log("[conto] xlsx ratios", {
            row: i + 1,
            baseAmount,
            fiacomAmount,
            responsabilePercent,
            responsabileAmount,
            sportelloPercent,
            sportelloAmount,
          });

          const month = parseMonth(data.mese);
          const year = Number(data.anno);
          const date =
            month && Number.isFinite(year)
              ? new Date(year, month - 1, 1)
              : new Date();

          const descriptionParts = [
            data.ragioneSociale ? `Azienda: ${data.ragioneSociale}` : null,
            data.matricolaInps ? `Matricola: ${data.matricolaInps}` : null,
            data.quotaRiconciliata ? `Riconciliata: ${data.quotaRiconciliata}` : null,
            data.nonRiconciliata ? `Non riconciliata: ${data.nonRiconciliata}` : null,
            data.fondoSanitario ? `Fondo sanitario: ${data.fondoSanitario}` : null,
          ].filter(Boolean);

          const description =
            descriptionParts.join(" | ") || `Competenza ${targetAccount}`;

          transactionsToInsert.push(
            {
              account: targetAccount,
              amount: fiacomAmount,
              rawAmount: baseAmount,
              type: "entrata",
              status: "completata",
              description,
              category: "Competenza",
              user: uploaderId,
              company: company._id,
              source: "xlsx",
              importKey,
              date,
            },
            {
              account: targetAccount,
              amount: responsabileAmount,
              rawAmount: baseAmount,
              type: "entrata",
              status: "completata",
              description,
              category: "Competenza",
              user: responsabileId,
              company: company._id,
              source: "xlsx",
              importKey,
              date,
            },
            {
              account: targetAccount,
              amount: sportelloAmount,
              rawAmount: baseAmount,
              type: "entrata",
              status: "completata",
              description,
              category: "Competenza",
              user: sportelloId,
              company: company._id,
              source: "xlsx",
              importKey,
              date,
            }
          );
        }

        if (rowKeys.length > 0) {
          const keys = rowKeys.map((r) => r.key);
          const [existingTx, existingNon] = await Promise.all([
            ContoTransaction.find({ importKey: { $in: keys } }).select("importKey"),
            ContoNonRiconciliata.find({ importKey: { $in: keys } }).select("importKey"),
          ]);
          const existingKeys = new Set<string>([
            ...existingTx.map((t: any) => t.importKey).filter(Boolean),
            ...existingNon.map((n: any) => n.importKey).filter(Boolean),
          ]);
          if (existingKeys.size > 0) {
            rowKeys.forEach((row) => {
              if (existingKeys.has(row.key)) {
                duplicateRows.push({ rowNumber: row.rowNumber, reason: "Duplicato giÃ  presente", data: row.data });
              }
            });
          }

          if (existingKeys.size > 0) {
            const allowKeys = new Set(keys.filter((k) => !existingKeys.has(k)));
            const filterByKey = (item: any) => !item.importKey || allowKeys.has(item.importKey);
            const filteredTransactions = transactionsToInsert.filter(filterByKey);
            const filteredNonRiconciliate = nonRiconciliateToInsert.filter(filterByKey);
            transactionsToInsert.length = 0;
            transactionsToInsert.push(...filteredTransactions);
            nonRiconciliateToInsert.length = 0;
            nonRiconciliateToInsert.push(...filteredNonRiconciliate);
          }
        }

        if ((duplicateRows.length > 0 || existingImport) && !confirmDuplicates) {
          fs.unlinkSync(file.path);
          return res.status(200).json({
            message: "Sono state trovate righe duplicate. Conferma per continuare.",
            requiresConfirmation: true,
            duplicates: duplicateRows,
            fileAlreadyUploaded: !!existingImport,
            fileAlreadyUploadedAt: existingImport?.createdAt,
          });
        }

        if (transactionsToInsert.length > 0) {
          await ContoTransaction.insertMany(transactionsToInsert);
        }
        if (nonRiconciliateToInsert.length > 0) {
          await ContoNonRiconciliata.insertMany(nonRiconciliateToInsert);
        }
        if (transactionsToInsert.length > 0 || nonRiconciliateToInsert.length > 0) {
          clearComputedContoCaches();
        }

        if (!existingImport) {
          const importKeys = Array.from(
            new Set(
              [
                ...transactionsToInsert.map((item: any) => item.importKey),
                ...nonRiconciliateToInsert.map((item: any) => item.importKey),
              ].filter(Boolean)
            )
          );
          await ContoImport.create({
            fileHash,
            account: targetAccount,
            originalName: file.originalname,
            uploadedBy: uploaderId,
            rowCount: rows.length - 1,
            importKeys,
          });
        }

        fs.unlinkSync(file.path);

        return res.status(201).json({
          message: `${transactionsToInsert.length} transazioni create${errors.length ? ` con ${errors.length} errori` : ""}`,
          errors: errors.length ? errors : undefined,
          duplicates: duplicateRows.length ? duplicateRows : undefined,
        });
      } catch (processError: any) {
        if (file && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
      }
    });
  } catch (err: any) {
    console.error("Upload conto error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getContoTransactions: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { account, from, to, type, status, q, company, responsabile, sportello, page, limit, lite } =
      req.query as Record<string, string>;
    const isLite = String(lite || "").toLowerCase() === "1" || String(lite || "").toLowerCase() === "true";
    const userId = getEffectiveUserId(req);
    const isResponsabile = req.user.role === "responsabile_territoriale";
    const isResponsabileScope = isResponsabile && account === "proselitismo";
    const isSportelloScope = req.user.role === "sportello_lavoro";
    let responsabileCompanyIds: mongoose.Types.ObjectId[] = [];
    let sportelloCompanyIds: mongoose.Types.ObjectId[] = [];

    if (isResponsabileScope) {
      const scope = await getResponsabileScope(req.user._id);
      responsabileCompanyIds = scope.responsabileCompanyIds;
    }

    if (isSportelloScope) {
      sportelloCompanyIds = await getSportelloScopedCompanyIds(req.user._id);
    }

    const query: any = {};
    if (userId && !isResponsabileScope && !isSportelloScope) query.user = userId;
    if (account) query.account = account;
    if (isResponsabileScope) {
      query.company = {
        $in: responsabileCompanyIds.length ? responsabileCompanyIds : [],
      };
    }
    if (isSportelloScope) {
      query.company = {
        $in: sportelloCompanyIds.length ? sportelloCompanyIds : [],
      };
      query.$or = sportelloCompanyIds.length
        ? [
            { user: new mongoose.Types.ObjectId(req.user._id) },
            { company: { $in: sportelloCompanyIds } },
          ]
        : [{ user: new mongoose.Types.ObjectId(req.user._id) }];
      delete query.company;
    }
    if (type) query.type = type;
    if (status) query.status = status;
    if (from || to) {
      query.date = {};
      const fromDate = parseDateStart(from);
      const toDate = parseDateEnd(to);
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
      if (!fromDate && !toDate) delete query.date;
    }

    const structuredClauses: any[] = [];
    if (company?.trim()) {
      structuredClauses.push({ companyName: { $regex: new RegExp(escapeRegex(company.trim()), "i") } });
    }
    if (responsabile?.trim()) {
      structuredClauses.push({ responsabileName: { $regex: new RegExp(escapeRegex(responsabile.trim()), "i") } });
    }
    if (sportello?.trim()) {
      const sportelloRegex = new RegExp(escapeRegex(sportello.trim()), "i");
      structuredClauses.push({
        $or: [
          { sportelloName: { $regex: sportelloRegex } },
          { "sportelloDoc.agentName": { $regex: sportelloRegex } },
          { "sportelloDoc.businessName": { $regex: sportelloRegex } },
          { "companyDoc.contactInfo.laborConsultant": { $regex: sportelloRegex } },
          {
            "companyDoc.contactInfo.laborConsultant.businessName": {
              $regex: sportelloRegex,
            },
          },
          {
            "companyDoc.contactInfo.laborConsultant.agentName": {
              $regex: sportelloRegex,
            },
          },
        ],
      });
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = (pageNum - 1) * pageSize;

    const hasSearch = Boolean(q && q.trim());
    if (hasSearch) {
      const regex = new RegExp(escapeRegex(q.trim()), "i");
      const searchOr = [
        { description: { $regex: regex } },
        { importKey: { $regex: regex } },
        { companyName: { $regex: regex } },
        { responsabileName: { $regex: regex } },
        { sportelloName: { $regex: regex } },
      ];
      if (Array.isArray(query.$or)) {
        const roleOr = query.$or;
        delete query.$or;
        query.$and = [{ $or: roleOr }, { $or: searchOr }];
      } else {
        query.$or = searchOr;
      }
    }
    let transactions: any[] = [];
    let total = 0;

    if (isLite && account === "proselitismo") {
      const shouldPreferRequesterRow =
        req.user.role !== "admin" && req.user.role !== "super_admin";
      const requesterObjectId = new mongoose.Types.ObjectId(req.user._id);
      const pipeline: any[] = [
        { $match: query },
        {
          $addFields: {
            dedupeKey: { $ifNull: ["$importKey", { $toString: "$_id" }] },
            ...(shouldPreferRequesterRow
              ? {
                  dedupePriority: {
                    $cond: [{ $eq: ["$user", requesterObjectId] }, 0, 1],
                  },
                }
              : {}),
          },
        },
        { $sort: { ...(shouldPreferRequesterRow ? { dedupePriority: 1 } : {}), date: -1, createdAt: -1, _id: -1 } },
        { $group: { _id: "$dedupeKey", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
        { $sort: { date: -1, createdAt: -1, _id: -1 } },
        {
          $lookup: {
            from: "companies",
            localField: "company",
            foreignField: "_id",
            as: "companyDoc",
          },
        },
        { $unwind: { path: "$companyDoc", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "companyDoc.user",
            foreignField: "_id",
            as: "responsabileDoc",
          },
        },
        { $unwind: { path: "$responsabileDoc", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "sportellolavoros",
            localField: "companyDoc.contactInfo.laborConsultantId",
            foreignField: "_id",
            as: "sportelloDoc",
          },
        },
        { $unwind: { path: "$sportelloDoc", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "requesterDoc",
          },
        },
        { $unwind: { path: "$requesterDoc", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            companyName: {
              $ifNull: [
                "$companyName",
                { $ifNull: ["$companyDoc.companyName", "$companyDoc.businessName"] },
              ],
            },
            responsabileName: {
              $ifNull: [
                "$responsabileName",
                {
                  $ifNull: [
                    "$companyDoc.contractDetails.territorialManager",
                    {
                      $trim: {
                        input: {
                          $concat: [
                            { $ifNull: ["$responsabileDoc.firstName", ""] },
                            " ",
                            { $ifNull: ["$responsabileDoc.lastName", ""] },
                          ],
                        },
                      },
                    },
                  ],
                },
              ],
            },
            sportelloName: {
              $ifNull: [
                "$sportelloName",
                {
                  $ifNull: [
                    "$sportelloDoc.agentName",
                    {
                      $ifNull: [
                        "$sportelloDoc.businessName",
                        {
                          $ifNull: [
                            "$companyDoc.contactInfo.laborConsultant.businessName",
                            {
                              $ifNull: [
                                "$companyDoc.contactInfo.laborConsultant.agentName",
                                "$companyDoc.contactInfo.laborConsultant",
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            requesterName: {
              $ifNull: [
                "$requesterName",
                {
                  $ifNull: [
                    {
                      $trim: {
                        input: {
                          $concat: [
                            { $ifNull: ["$requesterDoc.firstName", ""] },
                            " ",
                            { $ifNull: ["$requesterDoc.lastName", ""] },
                          ],
                        },
                      },
                    },
                    { $ifNull: ["$requesterDoc.organization", "$requesterDoc.username"] },
                  ],
                },
              ],
            },
          },
        },
        ...(structuredClauses.length ? [{ $match: { $and: structuredClauses } }] : []),
        {
          $facet: {
            items: [{ $skip: skip }, { $limit: pageSize }],
            total: [{ $count: "count" }],
          },
        },
      ];

      const result = await ContoTransaction.aggregate(pipeline);
      transactions = result?.[0]?.items || [];
      total = Number(result?.[0]?.total?.[0]?.count || 0);
    } else {
      const txQuery = ContoTransaction.find(query)
        .sort({ date: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(pageSize);

      if (!isLite) {
        txQuery
          .populate({
            path: "company",
            select: "businessName companyName user contactInfo.laborConsultantId contactInfo.laborConsultant contractDetails.territorialManager",
            populate: [
              { path: "user", select: "firstName lastName username profitSharePercentage" },
              { path: "contactInfo.laborConsultantId", select: "businessName agentName agreedCommission" },
            ],
          })
          .populate({ path: "user", select: "firstName lastName username organization role" });
      }

      const result = await Promise.all([
        txQuery.lean(),
        ContoTransaction.countDocuments(query),
      ]);
      transactions = result[0] as any[];
      total = Number(result[1] || 0);
    }

    const enriched = transactions.map((tx: any) => {
      const company = tx.company;
      const companyName = tx.companyName || company?.companyName || company?.businessName;
      const responsabileFromCompanyUser = company?.user
        ? `${company.user.firstName || ""} ${company.user.lastName || ""}`.trim() || company.user.username
        : undefined;
      const sportello = company?.contactInfo?.laborConsultantId;
      const sportelloFromId = sportello?.agentName || sportello?.businessName;
      const sportelloRaw = company?.contactInfo?.laborConsultant;
      const sportelloFromRaw =
        typeof sportelloRaw === "string"
          ? sportelloRaw
          : sportelloRaw?.businessName || sportelloRaw?.agentName || "";
      const responsabileName =
        tx.responsabileName || company?.contractDetails?.territorialManager || responsabileFromCompanyUser;
      const sportelloName = tx.sportelloName || sportelloFromId || sportelloFromRaw;
      const requesterRaw = tx.user;
      const requesterName =
        tx.requesterName ||
        (typeof requesterRaw === "object" && requesterRaw
          ? `${requesterRaw.firstName || ""} ${requesterRaw.lastName || ""}`.trim() ||
            requesterRaw.organization ||
            requesterRaw.username
          : undefined);
      return {
        ...tx,
        companyName,
        responsabileName,
        sportelloName,
        requesterName,
      };
    });

    return res.json({
      transactions: enriched,
      total,
      page: pageNum,
      pageSize,
    });
  } catch (err: any) {
    console.error("Get conto transactions error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

const collectTransactionsForExport = async (
  req: any,
  next: any
): Promise<any[] | { errorStatus: number; errorPayload: any }> => {
  const limit = 500;
  let page = 1;
  let total = Number.MAX_SAFE_INTEGER;
  const allTransactions: any[] = [];

  while (allTransactions.length < total) {
    const capture: { statusCode?: number; payload?: any } = {};
    const fakeRes = {
      status(code: number) {
        capture.statusCode = code;
        return this;
      },
      json(payload: any) {
        capture.payload = payload;
        return this;
      },
    } as unknown as Response;

    const fakeReq = {
      ...req,
      query: {
        ...(req.query || {}),
        page: String(page),
        limit: String(limit),
        lite: "1",
      },
    } as any;

    await getContoTransactions(fakeReq, fakeRes, next);

    if ((capture.statusCode || 200) >= 400) {
      return {
        errorStatus: capture.statusCode || 500,
        errorPayload: capture.payload || { error: "Export failed" },
      };
    }

    const transactions = Array.isArray(capture.payload?.transactions)
      ? capture.payload.transactions
      : [];
    allTransactions.push(...transactions);

    total = Number(capture.payload?.total || allTransactions.length);
    if (!transactions.length || page > 200) break;
    page += 1;
  }

  return allTransactions;
};

const collectNonRiconciliateForExport = async (
  req: any
): Promise<any[] | { errorStatus: number; errorPayload: any }> => {
  const limit = 500;
  let page = 1;
  let total = Number.MAX_SAFE_INTEGER;
  const allItems: any[] = [];

  while (allItems.length < total) {
    const capture: { statusCode?: number; payload?: any } = {};
    const fakeRes = {
      status(code: number) {
        capture.statusCode = code;
        return this;
      },
      json(payload: any) {
        capture.payload = payload;
        return this;
      },
    } as unknown as Response;

    const fakeReq = {
      ...req,
      query: {
        ...(req.query || {}),
        page: String(page),
        limit: String(limit),
      },
    } as any;

    await getNonRiconciliate(fakeReq, fakeRes, undefined as any);

    if ((capture.statusCode || 200) >= 400) {
      return {
        errorStatus: capture.statusCode || 500,
        errorPayload: capture.payload || { error: "Export failed" },
      };
    }

    const items = Array.isArray(capture.payload?.items) ? capture.payload.items : [];
    allItems.push(...items);
    total = Number(capture.payload?.total || allItems.length);
    if (!items.length || page > 200) break;
    page += 1;
  }

  return allItems;
};

const normalizeReportLabel = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getCompanySportelloName = (company: any) => {
  const fromRef = String(
    company?.contactInfo?.laborConsultantId?.agentName ||
      company?.contactInfo?.laborConsultantId?.businessName ||
      ""
  ).trim();
  if (fromRef) return fromRef;
  return String(company?.contactInfo?.laborConsultant || "").trim();
};

const getCompanyResponsabileName = (company: any) =>
  String(
    company?.contractDetails?.territorialManager ||
      company?.territorialManager ||
      company?.user?.organization ||
      `${company?.user?.firstName || ""} ${company?.user?.lastName || ""}`.trim() ||
      company?.user?.username ||
      ""
  ).trim();

const collectScopedCompaniesForProselitismoReport = async (req: any) => {
  const role = req.user?.role;
  const userId = getEffectiveUserId(req);
  const isResponsabileScope = role === "responsabile_territoriale";
  const isSportelloScope = role === "sportello_lavoro";

  let query: any = {};
  if (userId && !isResponsabileScope && !isSportelloScope) {
    query.user = new mongoose.Types.ObjectId(userId);
  }
  if (isResponsabileScope) {
    const scope = await getResponsabileScope(req.user._id);
    query._id = { $in: scope.responsabileCompanyIds };
  }
  if (isSportelloScope) {
    const companyIds = await getSportelloScopedCompanyIds(req.user._id);
    query._id = { $in: companyIds };
  }

  const companies = await Company.find(query)
    .select("businessName companyName inpsCode matricola territorialManager contractDetails.territorialManager contactInfo.laborConsultant contactInfo.laborConsultantId user")
    .populate("contactInfo.laborConsultantId", "businessName agentName")
    .populate("user", "firstName lastName username organization")
    .lean();

  const companyFilter = String(req.query?.company || "").trim();
  const responsabileFilter = String(req.query?.responsabile || "").trim();
  const sportelloFilter = String(req.query?.sportello || "").trim();
  const companyNeedle = normalizeReportLabel(companyFilter);
  const responsabileNeedle = normalizeReportLabel(responsabileFilter);
  const sportelloNeedle = normalizeReportLabel(sportelloFilter);

  return companies.filter((company: any) => {
    const companyName = String(company?.businessName || company?.companyName || "").trim();
    const responsabileName = getCompanyResponsabileName(company);
    const sportelloName = getCompanySportelloName(company);
    if (companyNeedle && !normalizeReportLabel(companyName).includes(companyNeedle)) return false;
    if (responsabileNeedle && !normalizeReportLabel(responsabileName).includes(responsabileNeedle)) return false;
    if (sportelloNeedle && !normalizeReportLabel(sportelloName).includes(sportelloNeedle)) return false;
    return true;
  });
};

const extractCompanyFromDescription = (description: unknown): string => {
  const text = String(description || "");
  const match = text.match(/Azienda:\s*([^|]+)/i);
  return match ? String(match[1] || "").trim() : "";
};

const parseLooseNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value !== "string") return NaN;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
};

const extractRiconciliataFromDescription = (description: unknown): number => {
  const text = String(description || "");
  const match = text.match(/Riconciliata:\s*([-+]?[0-9][0-9.,]*)/i);
  if (!match) return NaN;
  return parseLooseNumber(match[1]);
};

const getQuotaElavForReport = (transaction: any): number => {
  const fromRaw = Number(transaction?.rawAmount);
  if (Number.isFinite(fromRaw) && fromRaw > 0) return fromRaw;

  const fromDescription = extractRiconciliataFromDescription(transaction?.description);
  if (Number.isFinite(fromDescription) && fromDescription > 0) return fromDescription;

  const fromAmount = Number(transaction?.amount);
  if (Number.isFinite(fromAmount) && fromAmount > 0) return fromAmount;

  return 0;
};

const buildControlloRows = (allTransactions: any[]) => {
  const monthlyMap = new Map<
    string,
    {
      periodo: string;
      azienda: string;
      responsabile: string;
      sportello: string;
      totaleElav: number;
      movimenti: number;
    }
  >();

  for (const t of allTransactions) {
    if (String(t?.type || "").toLowerCase() !== "entrata") continue;
    const date = t?.date ? new Date(t.date) : null;
    if (!date || Number.isNaN(date.getTime())) continue;

    const periodo = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const azienda = String(
      t?.companyName ||
        t?.company?.companyName ||
        t?.company?.businessName ||
        extractCompanyFromDescription(t?.description) ||
        "Azienda non specificata"
    ).trim();
    const responsabile = String(t?.responsabileName || "").trim();
    const sportello = String(t?.sportelloName || "").trim();
    const quotaElav = getQuotaElavForReport(t);
    if (quotaElav <= 0) continue;
    const key = [periodo, azienda, responsabile, sportello].join("|");

    const current = monthlyMap.get(key);
    if (current) {
      current.totaleElav += quotaElav;
      current.movimenti += 1;
    } else {
      monthlyMap.set(key, {
        periodo,
        azienda,
        responsabile,
        sportello,
        totaleElav: quotaElav,
        movimenti: 1,
      });
    }
  }

  return Array.from(monthlyMap.values())
    .sort((a, b) => {
      if (a.periodo !== b.periodo) return a.periodo > b.periodo ? -1 : 1;
      return a.azienda.localeCompare(b.azienda, "it");
    })
    .map((r) => ({
      Periodo: r.periodo,
      Azienda: r.azienda,
      "Responsabile Territoriale": r.responsabile,
      "Sportello Lavoro": r.sportello,
      "Totale ELAV mensile": Number(r.totaleElav.toFixed(2)),
      Movimenti: r.movimenti,
    }));
};

const buildFatturazioneRows = (allTransactions: any[], req: any) => {
  const role = req.user?.role;
  const isAdminScope = role === "admin" || role === "super_admin";
  const hasResponsabileFilter = Boolean(String(req.query?.responsabile || "").trim());
  const hasSportelloFilter = Boolean(String(req.query?.sportello || "").trim());
  const companyMap = new Map<
    string,
    {
      azienda: string;
      responsabile: string;
      sportello: string;
      totaleElav: number;
      provvigioni: number;
      movimenti: number;
      seenMovements: Set<string>;
    }
  >();

  for (const t of allTransactions) {
    if (String(t?.type || "").toLowerCase() !== "entrata") continue;
    const azienda = String(
      t?.companyName ||
        t?.company?.companyName ||
        t?.company?.businessName ||
        extractCompanyFromDescription(t?.description) ||
        "Azienda non specificata"
    ).trim();

    const responsabile = String(t?.responsabileName || "").trim();
    const sportello = String(t?.sportelloName || "").trim();
    const quotaElav = getQuotaElavForReport(t);
    if (quotaElav <= 0) continue;

    const companyKey = azienda.toLowerCase();
    const movementKey = String(t?.importKey || `${t?.date || ""}|${azienda}|${t?._id || ""}`);
    const responsabilePct = Number(
      t?.company?.user?.profitSharePercentage ?? t?.responsabileDoc?.profitSharePercentage
    );
    const sportelloPct = Number(
      t?.company?.contactInfo?.laborConsultantId?.agreedCommission ?? t?.sportelloDoc?.agreedCommission
    );
    const fallbackPct = quotaElav > 0 ? (Number(t?.amount || 0) / quotaElav) * 100 : 0;
    const percentual = (() => {
      if (role === "responsabile_territoriale") {
        return Number.isFinite(responsabilePct) ? responsabilePct : fallbackPct;
      }
      if (role === "sportello_lavoro") {
        return Number.isFinite(sportelloPct) ? sportelloPct : fallbackPct;
      }
      if (isAdminScope && hasSportelloFilter) {
        return Number.isFinite(sportelloPct) ? sportelloPct : fallbackPct;
      }
      if (isAdminScope && hasResponsabileFilter) {
        return Number.isFinite(responsabilePct) ? responsabilePct : fallbackPct;
      }
      return 80;
    })();
    const provvigioneRiga = (quotaElav * percentual) / 100;

    const current = companyMap.get(companyKey);
    if (current) {
      if (!current.seenMovements.has(movementKey)) {
        current.seenMovements.add(movementKey);
        current.totaleElav += quotaElav;
        current.provvigioni += provvigioneRiga;
        current.movimenti += 1;
      }
      if (!current.responsabile && responsabile) current.responsabile = responsabile;
      if (!current.sportello && sportello) current.sportello = sportello;
    } else {
      companyMap.set(companyKey, {
        azienda,
        responsabile,
        sportello,
        totaleElav: quotaElav,
        provvigioni: provvigioneRiga,
        movimenti: 1,
        seenMovements: new Set([movementKey]),
      });
    }
  }

  return Array.from(companyMap.values())
    .sort((a, b) => a.azienda.localeCompare(b.azienda, "it"))
    .map((r) => ({
      Azienda: r.azienda,
      "Responsabile Territoriale": r.responsabile,
      "Sportello Lavoro": r.sportello,
      "Totale Quote ELAV": Number(r.totaleElav.toFixed(2)),
      Provvigioni: Number(r.provvigioni.toFixed(2)),
      Movimenti: r.movimenti,
    }));
};

export const previewContoTransactionsReport: CustomRequestHandler = async (req, res, next) => {
  try {
    const collected = await collectTransactionsForExport(req, next);
    if (!Array.isArray(collected)) {
      return res.status(collected.errorStatus).json(collected.errorPayload);
    }
    const rows = buildControlloRows(collected);
    const totalElav = rows.reduce((sum, r: any) => sum + Number(r["Totale ELAV mensile"] || 0), 0);
    return res.json({
      items: rows.slice(0, 20),
      total: rows.length,
      summary: {
        totaleElav: Number(totalElav.toFixed(2)),
      },
    });
  } catch (err: any) {
    console.error("Preview conto transactions report error:", err);
    return res.status(500).json({ error: "Server error while previewing report" });
  }
};

export const previewMonthlyCompanyTotalsReport: CustomRequestHandler = async (req, res, next) => {
  try {
    const collected = await collectTransactionsForExport(req, next);
    if (!Array.isArray(collected)) {
      return res.status(collected.errorStatus).json(collected.errorPayload);
    }
    const rows = buildFatturazioneRows(collected, req);
    const totaleQuote = rows.reduce((sum, r: any) => sum + Number(r["Totale Quote ELAV"] || 0), 0);
    const totaleProvvigioni = rows.reduce((sum, r: any) => sum + Number(r["Provvigioni"] || 0), 0);
    return res.json({
      items: rows.slice(0, 20),
      total: rows.length,
      summary: {
        totaleQuoteElav: Number(totaleQuote.toFixed(2)),
        totaleProvvigioni: Number(totaleProvvigioni.toFixed(2)),
      },
    });
  } catch (err: any) {
    console.error("Preview monthly company totals report error:", err);
    return res.status(500).json({ error: "Server error while previewing monthly report" });
  }
};

export const exportContoTransactionsXlsx: CustomRequestHandler = async (req, res, next) => {
  try {
    const collected = await collectTransactionsForExport(req, next);
    if (!Array.isArray(collected)) {
      return res.status(collected.errorStatus).json(collected.errorPayload);
    }
    const rows = buildControlloRows(collected);

    const ws = xlsx.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 }, // Periodo
      { wch: 40 }, // Azienda
      { wch: 28 }, // Responsabile Territoriale
      { wch: 28 }, // Sportello Lavoro
      { wch: 20 }, // Totale ELAV mensile
      { wch: 10 }, // Movimenti
    ];
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Controllo");
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    const from = String(req.query?.from || "all");
    const to = String(req.query?.to || "all");
    const filename = `report-proselitismo-${from}-${to}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err: any) {
    console.error("Export conto transactions xlsx error:", err);
    return res.status(500).json({ error: "Server error while exporting report" });
  }
};

export const exportMonthlyCompanyTotalsXlsx: CustomRequestHandler = async (req, res, next) => {
  try {
    const collected = await collectTransactionsForExport(req, next);
    if (!Array.isArray(collected)) {
      return res.status(collected.errorStatus).json(collected.errorPayload);
    }
    const rows = buildFatturazioneRows(collected, req);

    const ws = xlsx.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 40 }, // Azienda
      { wch: 28 }, // Responsabile Territoriale
      { wch: 28 }, // Sportello Lavoro
      { wch: 18 }, // Totale Quote ELAV
      { wch: 14 }, // Provvigioni
      { wch: 10 }, // Movimenti
    ];
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Fatturazione");
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    const fromQuery = String(req.query?.from || "all");
    const toQuery = String(req.query?.to || "all");
    const filename = `prospetto-fatturazione-${fromQuery}-${toQuery}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err: any) {
    console.error("Export monthly company totals xlsx error:", err);
    return res.status(500).json({ error: "Server error while exporting monthly report" });
  }
};

export const exportCollectedAndRecoveryXlsx: CustomRequestHandler = async (req, res, next) => {
  try {
    const collected = await collectTransactionsForExport(req, next);
    if (!Array.isArray(collected)) {
      return res.status(collected.errorStatus).json(collected.errorPayload);
    }
    const scopedCompanies = await collectScopedCompaniesForProselitismoReport(req);
    const fromDate = parseDateStart(String(req.query?.from || ""));
    const toDate = parseDateEnd(String(req.query?.to || ""));
    const txYears = Array.from(
      new Set(
        collected
          .map((tx) => (tx?.date ? new Date(tx.date) : null))
          .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
          .map((d) => d.getFullYear())
      )
    ).sort((a, b) => b - a);
    const fallbackYear = txYears[0] ?? new Date().getFullYear();
    const targetYear = fromDate?.getFullYear() || toDate?.getFullYear() || fallbackYear;
    const startMonth = fromDate && fromDate.getFullYear() === targetYear ? fromDate.getMonth() : 0;
    const endMonth = toDate && toDate.getFullYear() === targetYear ? toDate.getMonth() : 11;
    const rangeStart = Math.min(startMonth, endMonth);
    const rangeEnd = Math.max(startMonth, endMonth);
    const periodMonths = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, idx) => rangeStart + idx);
    const monthNames = [
      "gennaio",
      "febbraio",
      "marzo",
      "aprile",
      "maggio",
      "giugno",
      "luglio",
      "agosto",
      "settembre",
      "ottobre",
      "novembre",
      "dicembre",
    ];

    const companyKey = (value: string) => normalizeReportLabel(value);
    const formatEuro = (value: number) =>
      `${Number(value || 0).toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} €`;

    const companyRows = scopedCompanies.map((company: any) => {
      const azienda = String(company?.businessName || company?.companyName || "").trim();
      const matricola = String(company?.inpsCode || company?.matricola || "").trim();
      const responsabile = getCompanyResponsabileName(company);
      const sportello = getCompanySportelloName(company);
      return {
        key: companyKey(azienda),
        azienda,
        matricola,
        responsabile,
        sportello,
      };
    });

    const monthlyPaid = new Map<string, number[]>();
    for (const tx of collected) {
      if (String(tx?.type || "").toLowerCase() !== "entrata") continue;
      const date = tx?.date ? new Date(tx.date) : null;
      if (!date || Number.isNaN(date.getTime())) continue;
      if (date.getFullYear() !== targetYear) continue;
      const azienda = String(
        tx?.companyName ||
          tx?.company?.companyName ||
          tx?.company?.businessName ||
          extractCompanyFromDescription(tx?.description) ||
          ""
      ).trim();
      if (!azienda) continue;
      const key = companyKey(azienda);
      const monthIndex = date.getMonth();
      const quotaElav = getQuotaElavForReport(tx);
      if (!Number.isFinite(quotaElav) || quotaElav <= 0) continue;
      const bucket = monthlyPaid.get(key) || Array(12).fill(0);
      bucket[monthIndex] += quotaElav;
      monthlyPaid.set(key, bucket);
    }

    const recoveryRows = companyRows
      .map((company) => {
        const monthly = monthlyPaid.get(company.key) || Array(12).fill(0);
        const missingMonths = periodMonths.filter((monthIndex) => Number(monthly[monthIndex] || 0) <= 0);
        return { ...company, missingMonths };
      })
      .filter((company) => company.missingMonths.length > 0)
      .sort((a, b) => {
        const aMat = String(a.matricola || "").trim();
        const bMat = String(b.matricola || "").trim();
        if (aMat && bMat && aMat !== bMat) return aMat.localeCompare(bMat, "it");
        if (aMat && !bMat) return -1;
        if (!aMat && bMat) return 1;
        return String(a.azienda || "").localeCompare(String(b.azienda || ""), "it");
      })
      .map((company) => {
        const months = Array.from(company.missingMonths || [])
          .sort((a, b) => a - b)
          .map((month) => monthNames[month])
          .filter((month): month is string => Boolean(month))
          .map((month) => month.trim());
        const formattedMonths = months.join(", ");
        return [
          company.matricola || "-",
          company.azienda || "-",
          "Inviare copia F24 e UNIEMENS per i mesi:",
          formattedMonths,
        ];
      });

    const aoa: any[][] = [];
    aoa.push([`PROSPETTO QUOTE RACCOLTE E DA RECUPERARE ${targetYear}`]);
    aoa.push([]);
    aoa.push(["Matricola INPS", "Nome Azienda", ...monthNames]);

    for (const company of companyRows) {
      const monthly = monthlyPaid.get(company.key) || Array(12).fill(0);
      aoa.push([
        company.matricola || "-",
        company.azienda || "-",
        ...monthly.map((value) => (value > 0 ? formatEuro(value) : "-")),
      ]);
    }

    aoa.push([]);
    aoa.push(["RICHIESTA COPIA F24 ED UNIEMENS PER RECUPERO CREDITO VERSO INPS"]);
    aoa.push(["Matricola INPS", "Nome Azienda", "Azione", "Mesi da recuperare"]);
    if (recoveryRows.length) {
      aoa.push(...recoveryRows);
    } else {
      aoa.push(["-", "-", "-", "-"]);
    }

    const ws = xlsx.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 20 }, // A
      { wch: 40 }, // B
      { wch: 34 }, // C
      { wch: 62 }, // D (mesi da recuperare)
      ...Array.from({ length: 10 }, () => ({ wch: 14 })), // E-N
    ];

    const recoveryHeaderRow = 5 + companyRows.length;
    const recoveryDataStart = recoveryHeaderRow + 2;
    const recoveryDataEnd = recoveryDataStart + Math.max(recoveryRows.length, 1) - 1;
    for (let row = recoveryDataStart; row <= recoveryDataEnd; row += 1) {
      const monthsCellRef = `D${row}`;
      const actionCellRef = `C${row}`;
      if (ws[monthsCellRef]) {
        ws[monthsCellRef].s = {
          alignment: { wrapText: true, vertical: "top" },
        } as any;
      }
      if (ws[actionCellRef]) {
        ws[actionCellRef].s = {
          alignment: { vertical: "top" },
        } as any;
      }
    }
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Quote raccolte");
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `prospetto-quote-raccolte-recupero-${targetYear}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err: any) {
    console.error("Export collected and recovery xlsx error:", err);
    return res.status(500).json({ error: "Server error while exporting collected/recovery report" });
  }
};

export const getContoSummary: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const cacheKey = getComputedCacheKey(req);
    const cached = readComputedSummaryCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { account, from, to, type, status, q } = req.query as Record<string, string>;
    const userId = getEffectiveUserId(req);
    const isResponsabile = req.user.role === "responsabile_territoriale";
    const isResponsabileScope = isResponsabile && account === "proselitismo";
    const isSportelloScope = req.user.role === "sportello_lavoro";
    const responsabileObjectId = isResponsabile ? new mongoose.Types.ObjectId(req.user._id) : null;
    let sportelloCompanyIds: mongoose.Types.ObjectId[] = [];
    let responsabileMatch: any = null;
    let responsabileCompanyIds: mongoose.Types.ObjectId[] | null = null;
    let responsabileNames: string[] = [];
    if (isResponsabile) {
      const scope = await getResponsabileScope(req.user._id);
      responsabileNames = scope.responsabileNames;
      responsabileMatch = scope.responsabileMatch;
      responsabileCompanyIds = scope.responsabileCompanyIds;
    }
    if (isSportelloScope) {
      sportelloCompanyIds = await getSportelloScopedCompanyIds(req.user._id);
    }
    const match: any = {};
    if (userId && !isResponsabileScope && !isSportelloScope) {
      match.user = new mongoose.Types.ObjectId(userId);
    }
    if (account) match.account = account;
    if (isSportelloScope) {
      match.$or = sportelloCompanyIds.length
        ? [
            { user: new mongoose.Types.ObjectId(req.user._id) },
            { company: { $in: sportelloCompanyIds } },
          ]
        : [{ user: new mongoose.Types.ObjectId(req.user._id) }];
    }
    if (type) match.type = type;
    if (status) match.status = status;
    if (q) match.description = { $regex: q, $options: "i" };
    if (from || to) {
      match.date = {};
      const fromDate = parseDateStart(from);
      const toDate = parseDateEnd(to);
      if (fromDate) match.date.$gte = fromDate;
      if (toDate) match.date.$lte = toDate;
      if (!fromDate && !toDate) delete match.date;
    }

    const useRawForFiacom = account === "proselitismo";

    const totals = await ContoTransaction.aggregate([
      { $match: match },
      ...(useRawForFiacom
        ? [
            {
              $facet: {
                fiacom: [
                  { $match: { type: "entrata", rawAmount: { $gt: 0 }, importKey: { $exists: true, $ne: "" } } },
                  { $group: { _id: "$importKey", elav: { $first: "$rawAmount" }, company: { $first: "$company" } } },
                  ...(isResponsabileScope
                    ? [
                        {
                          $lookup: {
                            from: "companies",
                            localField: "company",
                            foreignField: "_id",
                            as: "companyDoc",
                          },
                        },
                        { $unwind: { path: "$companyDoc", preserveNullAndEmptyArrays: true } },
                        { $match: responsabileMatch },
                      ]
                    : []),
                  {
                    $group: {
                      _id: null,
                      totalElav: { $sum: "$elav" },
                      fiacomTotal: { $sum: { $multiply: ["$elav", FIACOM_NET_RATIO] } },
                    },
                  },
                ],
                competenze: [
                  { $match: { type: "entrata", rawAmount: { $gt: 0 }, importKey: { $exists: true, $ne: "" } } },
                  {
                    $group: {
                      _id: "$importKey",
                      elav: { $first: "$rawAmount" },
                      company: { $first: "$company" },
                    },
                  },
                  {
                    $lookup: {
                      from: "companies",
                      localField: "company",
                      foreignField: "_id",
                      as: "companyDoc",
                    },
                  },
                  { $unwind: { path: "$companyDoc", preserveNullAndEmptyArrays: true } },
                  ...(isResponsabileScope ? [{ $match: responsabileMatch }] : []),
                  ...(isSportelloScope
                    ? [{ $match: { company: { $in: sportelloCompanyIds } } }]
                    : []),
                  {
                    $lookup: {
                      from: "users",
                      localField: "companyDoc.user",
                      foreignField: "_id",
                      as: "responsabileDoc",
                    },
                  },
                  { $unwind: { path: "$responsabileDoc", preserveNullAndEmptyArrays: true } },
                  {
                    $lookup: {
                      from: "sportellolavoros",
                      localField: "companyDoc.contactInfo.laborConsultantId",
                      foreignField: "_id",
                      as: "sportelloDoc",
                    },
                  },
                  { $unwind: { path: "$sportelloDoc", preserveNullAndEmptyArrays: true } },
                  {
                    $addFields: {
                      responsabilePercent: "$responsabileDoc.profitSharePercentage",
                      sportelloPercent: "$sportelloDoc.agreedCommission",
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      responsabileTotal: {
                        $sum: {
                          // Responsabili calcolati sulla quota ELAV totale
                          $multiply: ["$elav", { $divide: ["$responsabilePercent", 100] }],
                        },
                      },
                      sportelloTotal: {
                        // Sportelli calcolati sulla quota ELAV totale
                        $sum: { $multiply: ["$elav", { $divide: ["$sportelloPercent", 100] }] },
                      },
                    },
                  },
                ],
                totals: [
                  ...(isResponsabileScope
                    ? [{ $match: { user: responsabileObjectId } }]
                    : isSportelloScope
                      ? [{ $match: { user: new mongoose.Types.ObjectId(req.user._id) } }]
                      : []),
                  {
                    $group: {
                      _id: null,
                      incoming: { $sum: { $cond: [{ $eq: ["$type", "entrata"] }, "$amount", 0] } },
                      outgoing: { $sum: { $cond: [{ $eq: ["$type", "uscita"] }, "$amount", 0] } },
                    },
                  },
                ],
              },
            },
          ]
        : [
            {
              $group: {
                _id: null,
                incoming: { $sum: { $cond: [{ $eq: ["$type", "entrata"] }, "$amount", 0] } },
                outgoing: { $sum: { $cond: [{ $eq: ["$type", "uscita"] }, "$amount", 0] } },
              },
            },
          ]),
    ]);

    const fiacomTotal =
      useRawForFiacom && totals[0]?.fiacom?.[0]?.fiacomTotal != null
        ? Number(totals[0].fiacom[0].fiacomTotal)
        : null;
    const totalElav =
      useRawForFiacom && totals[0]?.fiacom?.[0]?.totalElav != null
        ? Number(totals[0].fiacom[0].totalElav)
        : null;
    const incoming = useRawForFiacom
      ? Number(totals[0]?.totals?.[0]?.incoming ?? 0)
      : Number(totals[0]?.incoming ?? 0);
    const outgoing = useRawForFiacom
      ? Number(totals[0]?.totals?.[0]?.outgoing ?? 0)
      : Number(totals[0]?.outgoing ?? 0);
    const responsabileTotal = useRawForFiacom
      ? Number(totals[0]?.competenze?.[0]?.responsabileTotal ?? 0)
      : 0;
    const sportelloTotal = useRawForFiacom
      ? Number(totals[0]?.competenze?.[0]?.sportelloTotal ?? 0)
      : 0;
    const balance = isSportelloScope
      ? sportelloTotal
      : fiacomTotal != null
        ? fiacomTotal - outgoing
        : incoming - outgoing;

    let fiacomReference: number | null = null;
    if (
      account === "servizi" &&
      (req.user.role === "admin" || req.user.role === "super_admin")
    ) {
      const fiacomReferenceAgg = await ContoTransaction.aggregate([
        {
          $match: {
            account: "proselitismo",
            type: "entrata",
            rawAmount: { $gt: 0 },
            importKey: { $exists: true, $ne: "" },
          },
        },
        {
          $group: {
            _id: "$importKey",
            elav: { $first: "$rawAmount" },
          },
        },
        {
          $group: {
            _id: null,
            fiacomTotal: { $sum: { $multiply: ["$elav", FIACOM_NET_RATIO] } },
          },
        },
      ]);
      fiacomReference = Number(fiacomReferenceAgg[0]?.fiacomTotal ?? 0);
    }

    let responsabileReference: number | null = null;
    if (account === "servizi" && req.user.role === "responsabile_territoriale") {
      const responsabileRefMatch: any = {
        account: "proselitismo",
        type: "entrata",
        rawAmount: { $gt: 0 },
        importKey: { $exists: true, $ne: "" },
      };
      if (from || to) {
        responsabileRefMatch.date = {};
        const fromDate = parseDateStart(from);
        const toDate = parseDateEnd(to);
        if (fromDate) responsabileRefMatch.date.$gte = fromDate;
        if (toDate) responsabileRefMatch.date.$lte = toDate;
        if (!fromDate && !toDate) delete responsabileRefMatch.date;
      }
      if (q) {
        responsabileRefMatch.description = { $regex: q, $options: "i" };
      }
      const responsabileRefAgg = await ContoTransaction.aggregate([
        { $match: responsabileRefMatch },
        {
          $group: {
            _id: "$importKey",
            elav: { $first: "$rawAmount" },
            company: { $first: "$company" },
          },
        },
        {
          $lookup: {
            from: "companies",
            localField: "company",
            foreignField: "_id",
            as: "companyDoc",
          },
        },
        { $unwind: { path: "$companyDoc", preserveNullAndEmptyArrays: true } },
        ...(responsabileMatch ? [{ $match: responsabileMatch }] : []),
        {
          $lookup: {
            from: "users",
            localField: "companyDoc.user",
            foreignField: "_id",
            as: "responsabileDoc",
          },
        },
        { $unwind: { path: "$responsabileDoc", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            responsabilePercent: "$responsabileDoc.profitSharePercentage",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: ["$elav", { $divide: ["$responsabilePercent", 100] }],
              },
            },
          },
        },
      ]);
      responsabileReference = Number(responsabileRefAgg[0]?.total ?? 0);
    }

    let sportelloReference: number | null = null;
    if (account === "servizi" && req.user.role === "sportello_lavoro") {
      if (!sportelloCompanyIds.length) {
        sportelloReference = 0;
      } else {
      const sportelloRefMatch: any = {
        account: "proselitismo",
        type: "entrata",
        rawAmount: { $gt: 0 },
        importKey: { $exists: true, $ne: "" },
      };
      if (from || to) {
        sportelloRefMatch.date = {};
        const fromDate = parseDateStart(from);
        const toDate = parseDateEnd(to);
        if (fromDate) sportelloRefMatch.date.$gte = fromDate;
        if (toDate) sportelloRefMatch.date.$lte = toDate;
        if (!fromDate && !toDate) delete sportelloRefMatch.date;
      }
      if (q) {
        sportelloRefMatch.description = { $regex: q, $options: "i" };
      }
      const sportelloRefAgg = await ContoTransaction.aggregate([
        { $match: sportelloRefMatch },
        {
          $group: {
            _id: "$importKey",
            elav: { $first: "$rawAmount" },
            company: { $first: "$company" },
          },
        },
        ...(sportelloCompanyIds.length
          ? [{ $match: { company: { $in: sportelloCompanyIds } } }]
          : []),
        {
          $lookup: {
            from: "companies",
            localField: "company",
            foreignField: "_id",
            as: "companyDoc",
          },
        },
        { $unwind: { path: "$companyDoc", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "sportellolavoros",
            localField: "companyDoc.contactInfo.laborConsultantId",
            foreignField: "_id",
            as: "sportelloDoc",
          },
        },
        { $unwind: { path: "$sportelloDoc", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            sportelloPercent: "$sportelloDoc.agreedCommission",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: ["$elav", { $divide: ["$sportelloPercent", 100] }],
              },
            },
          },
        },
      ]);
      sportelloReference = Number(sportelloRefAgg[0]?.total ?? 0);
      }
    }

    let nonRiconciliateTotal = 0;
    if (isResponsabileScope) {
      const matchNonRiconciliate: any = {};
      if (account) matchNonRiconciliate.account = account;
      if (q) {
        matchNonRiconciliate.$or = [
          { description: { $regex: q, $options: "i" } },
          { importKey: { $regex: q, $options: "i" } },
        ];
      }
      if (from || to) {
        matchNonRiconciliate.date = {};
        const fromDate = parseDateStart(from);
        const toDate = parseDateEnd(to);
        if (fromDate) matchNonRiconciliate.date.$gte = fromDate;
        if (toDate) matchNonRiconciliate.date.$lte = toDate;
        if (!fromDate && !toDate) delete matchNonRiconciliate.date;
      }

      const items = await ContoNonRiconciliata.find(matchNonRiconciliate)
        .populate({
          path: "company",
          select: "businessName companyName user contactInfo.laborConsultantId contactInfo.laborConsultant contractDetails.territorialManager",
          populate: [
            { path: "user", select: "firstName lastName username" },
            { path: "contactInfo.laborConsultantId", select: "businessName agentName" },
          ],
        })
        .lean();

      const normalizeName = (value: string) => {
        let cleaned = value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        const suffixes = ["srls", "srl", "sas", "snc", "spa"];
        for (const suffix of suffixes) {
          if (cleaned.endsWith(suffix)) {
            cleaned = cleaned.slice(0, -suffix.length);
          }
        }
        return cleaned.trim();
      };
      const normalizedResponsabili = responsabileNames
        .map((value) => normalizeName(value))
        .filter(Boolean);

      const matchesResponsabile = (company?: any, fallbackName?: string) => {
        const fallbackNormalized = normalizeName(String(fallbackName || ""));
        if (fallbackNormalized) {
          if (normalizedResponsabili.some((candidate) => candidate && fallbackNormalized.includes(candidate))) {
            return true;
          }
        }
        if (!company) return false;
        if (responsabileObjectId && company.user && String(company.user._id || company.user) === String(responsabileObjectId)) {
          return true;
        }
        const manager = normalizeName(String(company.contractDetails?.territorialManager || ""));
        if (!manager) return false;
        return normalizedResponsabili.some((candidate) => candidate && manager.includes(candidate));
      };

      const enriched = await Promise.all(items.map(async (item: any) => {
        let company = item.company;
        if (!company && item.description) {
          const matricolaMatch = String(item.description).match(/Matricola:\s*([0-9A-Za-z]+)/i);
          const nameMatch = String(item.description).match(/Azienda:\s*([^|]+)/i);
          const matricolaToken = matricolaMatch ? matricolaMatch[1].trim() : "";
          const nameToken = nameMatch ? nameMatch[1].trim() : "";

          if (matricolaToken) {
            const matricolaRegex = new RegExp(
              `(^|\\s)${escapeRegex(matricolaToken)}(\\s|$)`,
              "i"
            );
            company = await Company.findOne({
              $or: [
                { inpsCode: matricolaToken },
                { matricola: matricolaToken },
                { inpsCode: matricolaRegex },
                { matricola: matricolaRegex },
              ],
            })
              .populate("user", "firstName lastName username")
              .lean();
          }

          if (!company && nameToken) {
            const nameRegex = new RegExp(`^\\s*${escapeRegex(nameToken)}\\s*$`, "i");
            company = await Company.findOne({
              $or: [{ businessName: nameRegex }, { companyName: nameRegex }],
            })
              .populate("user", "firstName lastName username")
              .lean();
          }
        }
        return { ...item, company };
      }));

      nonRiconciliateTotal = enriched
        .filter((item) => matchesResponsabile(item.company, item.responsabileName))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    } else {
      const matchNonRiconciliate: any = {};
      if (userId) {
        matchNonRiconciliate.user = new mongoose.Types.ObjectId(userId);
      }
      if (account) matchNonRiconciliate.account = account;
      if (q) {
        matchNonRiconciliate.$or = [
          { description: { $regex: q, $options: "i" } },
          { importKey: { $regex: q, $options: "i" } },
        ];
      }
      if (from || to) {
        matchNonRiconciliate.date = {};
        const fromDate = parseDateStart(from);
        const toDate = parseDateEnd(to);
        if (fromDate) matchNonRiconciliate.date.$gte = fromDate;
        if (toDate) matchNonRiconciliate.date.$lte = toDate;
        if (!fromDate && !toDate) delete matchNonRiconciliate.date;
      }

      const nonRiconciliateTotals = await ContoNonRiconciliata.aggregate([
        { $match: matchNonRiconciliate },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);
      nonRiconciliateTotal = nonRiconciliateTotals[0]?.total ?? 0;
    }

    const scopedResponsabileTotal =
      account === "servizi" && req.user.role === "responsabile_territoriale"
        ? Number(responsabileReference ?? 0)
        : responsabileTotal;
    const scopedSportelloTotal =
      account === "servizi" && req.user.role === "sportello_lavoro"
        ? Number(sportelloReference ?? 0)
        : sportelloTotal;
    const scopedBalance =
      account === "servizi"
        ? req.user.role === "sportello_lavoro"
          ? scopedSportelloTotal
          : req.user.role === "responsabile_territoriale"
            ? scopedResponsabileTotal
            : req.user.role === "admin" || req.user.role === "super_admin"
              ? Number(fiacomReference ?? balance)
              : balance
        : balance;

    const payload = {
      balance: scopedBalance,
      incoming,
      outgoing,
      nonRiconciliateTotal,
      responsabileTotal: scopedResponsabileTotal,
      sportelloTotal: scopedSportelloTotal,
      totalElav,
      fiacomReference,
      updatedAt: new Date().toISOString(),
    };
    writeComputedSummaryCache(cacheKey, payload);
    return res.json(payload);
  } catch (err: any) {
    console.error("Get conto summary error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getContoImports: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { account } = req.query as Record<string, string>;
    const query: any = {};
    if (account === "proselitismo" || account === "servizi") {
      query.$or = [{ account }, { account: { $exists: false } }];
    }

    const imports = await ContoImport.find(query)
      .sort({ createdAt: -1 })
      .select("fileHash account originalName uploadedBy rowCount createdAt");

    return res.json(imports);
  } catch (err: any) {
    console.error("Get conto imports error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteContoImport: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { fileHash } = req.params as { fileHash?: string };
    const { account } = req.query as Record<string, string>;
    const normalizedHash = String(fileHash || "").trim();
    if (!normalizedHash) {
      return res.status(400).json({ error: "fileHash mancante" });
    }

    const importDoc = await ContoImport.findOne({ fileHash: normalizedHash }).lean();
    if (!importDoc) {
      return res.status(404).json({ error: "File flusso non trovato" });
    }

    const selectedAccount = account === "servizi" ? "servizi" : "proselitismo";
    if (importDoc.account && importDoc.account !== selectedAccount) {
      return res.status(400).json({ error: "Il file flusso appartiene a un account diverso" });
    }

    let importKeys = Array.isArray(importDoc.importKeys)
      ? importDoc.importKeys.filter((value) => typeof value === "string" && value.trim().length > 0)
      : [];
    let legacyCreatedAtWindow: { start: Date; end: Date } | null = null;

    if (!importKeys.length) {
      // Legacy fallback: for older imports that did not store importKeys, try to
      // reconstruct the batch using createdAt proximity buckets.
      const batchCreatedAt =
        importDoc.createdAt instanceof Date
          ? importDoc.createdAt
          : importDoc.createdAt
            ? new Date(importDoc.createdAt as any)
            : null;
      if (batchCreatedAt && !Number.isNaN(batchCreatedAt.getTime())) {
        const createdAtMs = batchCreatedAt.getTime();
        const windows = [
          { backMs: 15 * 60 * 1000, forwardMs: 2 * 60 * 1000 }, // 15m/2m
          { backMs: 24 * 60 * 60 * 1000, forwardMs: 24 * 60 * 60 * 1000 }, // 24h
          { backMs: 7 * 24 * 60 * 60 * 1000, forwardMs: 24 * 60 * 60 * 1000 }, // 7d/1d
        ];

        for (const windowCfg of windows) {
          const windowStart = new Date(createdAtMs - windowCfg.backMs);
          const windowEnd = new Date(createdAtMs + windowCfg.forwardMs);

          const [legacyTx, legacyNonRic] = await Promise.all([
            ContoTransaction.find(
              {
                account: selectedAccount,
                source: "xlsx",
                createdAt: { $gte: windowStart, $lte: windowEnd },
              },
              { importKey: 1, createdAt: 1 }
            )
              .sort({ createdAt: -1 })
              .lean(),
            ContoNonRiconciliata.find(
              {
                account: selectedAccount,
                source: "xlsx",
                createdAt: { $gte: windowStart, $lte: windowEnd },
              },
              { importKey: 1, createdAt: 1 }
            )
              .sort({ createdAt: -1 })
              .lean(),
          ]);

          const bucketMap = new Map<
            number,
            {
              keys: Set<string>;
              docs: number;
            }
          >();
          for (const row of [...legacyTx, ...legacyNonRic]) {
            const key = String((row as any)?.importKey || "").trim();
            const ts = new Date((row as any)?.createdAt || 0).getTime();
            if (!key || !Number.isFinite(ts) || ts <= 0) continue;
            const bucketTs = Math.floor(ts / 1000) * 1000; // second precision bucket
            const bucket = bucketMap.get(bucketTs) || { keys: new Set<string>(), docs: 0 };
            bucket.keys.add(key);
            bucket.docs += 1;
            bucketMap.set(bucketTs, bucket);
          }

          const allRows = [...legacyTx, ...legacyNonRic];
          const allBucketMap = new Map<number, number>();
          for (const row of allRows) {
            const ts = new Date((row as any)?.createdAt || 0).getTime();
            if (!Number.isFinite(ts) || ts <= 0) continue;
            const bucketTs = Math.floor(ts / 1000) * 1000;
            allBucketMap.set(bucketTs, (allBucketMap.get(bucketTs) || 0) + 1);
          }

          const targetRows = Number(importDoc.rowCount || 0);
          const rankedBuckets = Array.from(allBucketMap.entries())
            .map(([ts, docs]) => {
              const keyedDocs = bucketMap.get(ts)?.docs || 0;
              const timeDistance = Math.abs(createdAtMs - ts);
              const sizeDistance = targetRows > 0 ? Math.abs(docs - targetRows) : 0;
              return { ts, docs, keyedDocs, timeDistance, sizeDistance };
            })
            .sort((a, b) => {
              if (a.sizeDistance !== b.sizeDistance) return a.sizeDistance - b.sizeDistance;
              return a.timeDistance - b.timeDistance;
            });

          const chosen = rankedBuckets[0];
          if (chosen) {
            const start = new Date(chosen.ts);
            const end = new Date(chosen.ts + 999);
            legacyCreatedAtWindow = { start, end };
            const chosenKeys = bucketMap.get(chosen.ts);
            importKeys = chosenKeys ? Array.from(chosenKeys.keys) : [];
            break;
          }
        }
      }
      if (!importKeys.length && !legacyCreatedAtWindow) {
        return res.status(409).json({
          error:
            "Impossibile eliminare questo flusso storico automaticamente: manca la mappatura righe/importKey. Ricarica i nuovi flussi per usare questa funzione.",
        });
      }
    }

    const baseFilter = { account: selectedAccount, source: "xlsx" } as any;
    const transactionFilter = importKeys.length
      ? { ...baseFilter, importKey: { $in: importKeys } }
      : { ...baseFilter, createdAt: { $gte: legacyCreatedAtWindow!.start, $lte: legacyCreatedAtWindow!.end } };
    const nonRiconciliataFilter = importKeys.length
      ? { ...baseFilter, importKey: { $in: importKeys } }
      : { ...baseFilter, createdAt: { $gte: legacyCreatedAtWindow!.start, $lte: legacyCreatedAtWindow!.end } };

    const [deletedTransactions, deletedNonRiconciliate] = await Promise.all([
      ContoTransaction.deleteMany(transactionFilter),
      ContoNonRiconciliata.deleteMany(nonRiconciliataFilter),
    ]);

    await ContoImport.deleteOne({ _id: importDoc._id });
    clearComputedContoCaches();

    return res.json({
      message: "File flusso eliminato con successo",
      deletedTransactions: deletedTransactions.deletedCount || 0,
      deletedNonRiconciliate: deletedNonRiconciliate.deletedCount || 0,
      deletionMode: importKeys.length ? "importKeys" : "legacyCreatedAtWindow",
    });
  } catch (err: any) {
    console.error("Delete conto import error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getNonRiconciliate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { account, from, to, q, company, responsabile, sportello, page, limit } = req.query as Record<string, string>;
    const userId = getEffectiveUserId(req);
    const isResponsabile = req.user.role === "responsabile_territoriale";
    const isResponsabileScope = isResponsabile && account === "proselitismo";
    const isSportelloScope = req.user.role === "sportello_lavoro";
    let sportelloCompanyIds: mongoose.Types.ObjectId[] = [];
    let responsabileNames: string[] = [];
    if (isResponsabileScope) {
      const scope = await getResponsabileScope(req.user._id);
      responsabileNames = scope.responsabileNames;
    }
    if (isSportelloScope) {
      sportelloCompanyIds = await getSportelloScopedCompanyIds(req.user._id);
    }
    const query: any = {};
    if (userId && !isResponsabileScope && !isSportelloScope) query.user = userId;
    if (account) query.account = account;
    if (isSportelloScope) {
      query.$or = sportelloCompanyIds.length
        ? [
            { user: new mongoose.Types.ObjectId(req.user._id) },
            { company: { $in: sportelloCompanyIds } },
          ]
        : [{ user: new mongoose.Types.ObjectId(req.user._id) }];
    }
    const qTerm = (q || "").trim().toLowerCase();
    if (q && !isResponsabileScope) {
      const textOr = [
        { description: { $regex: q, $options: "i" } },
        { importKey: { $regex: q, $options: "i" } },
      ];
      if (Array.isArray(query.$or)) {
        const roleOr = query.$or;
        delete query.$or;
        query.$and = [{ $or: roleOr }, { $or: textOr }];
      } else {
        query.$or = textOr;
      }
    }
    if (from || to) {
      query.date = {};
      const fromDate = parseDateStart(from);
      const toDate = parseDateEnd(to);
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
      if (!fromDate && !toDate) delete query.date;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = (pageNum - 1) * pageSize;

    const rawItems = await ContoNonRiconciliata.find(query)
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .populate({
        path: "company",
        select: "businessName companyName user contactInfo.laborConsultantId contactInfo.laborConsultant contractDetails.territorialManager",
        populate: [
          { path: "user", select: "firstName lastName username" },
          { path: "contactInfo.laborConsultantId", select: "businessName agentName" },
        ],
      })
      .lean();

    const normalizeName = (value: string) => {
      let cleaned = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
      const suffixes = ["srls", "srl", "sas", "snc", "spa"];
      for (const suffix of suffixes) {
        if (cleaned.endsWith(suffix)) {
          cleaned = cleaned.slice(0, -suffix.length);
        }
      }
      return cleaned.trim();
    };
    const normalizedResponsabili = responsabileNames
      .map((value) => normalizeName(value))
      .filter(Boolean);
    const responsabileObjectId = isResponsabileScope ? new mongoose.Types.ObjectId(req.user._id) : null;
    const matchesResponsabile = (company?: any, fallbackName?: string) => {
      const fallbackNormalized = normalizeName(String(fallbackName || ""));
      if (fallbackNormalized) {
        if (normalizedResponsabili.some((candidate) => candidate && fallbackNormalized.includes(candidate))) {
          return true;
        }
      }
      if (!company) return false;
      if (responsabileObjectId && company.user && String(company.user._id || company.user) === String(responsabileObjectId)) {
        return true;
      }
      const manager = normalizeName(String(company.contractDetails?.territorialManager || ""));
      if (!manager) return false;
      return normalizedResponsabili.some((candidate) => candidate && manager.includes(candidate));
    };

    const enrichedAll = await Promise.all(rawItems.map(async (item: any) => {
      let company = item.company;

      if (!company && item.description) {
        const matricolaMatch = String(item.description).match(/Matricola:\s*([0-9A-Za-z]+)/i);
        const nameMatch = String(item.description).match(/Azienda:\s*([^|]+)/i);
        const matricolaToken = matricolaMatch ? matricolaMatch[1].trim() : "";
        const nameToken = nameMatch ? nameMatch[1].trim() : "";

        if (matricolaToken) {
          const matricolaRegex = new RegExp(
            `(^|\\s)${escapeRegex(matricolaToken)}(\\s|$)`,
            "i"
          );
          company = await Company.findOne({
            $or: [
              { inpsCode: matricolaToken },
              { matricola: matricolaToken },
              { inpsCode: matricolaRegex },
              { matricola: matricolaRegex },
            ],
          })
            .populate("user", "firstName lastName username")
            .populate("contactInfo.laborConsultantId", "businessName agentName")
            .lean();
        }

        if (!company && nameToken) {
          const nameRegex = new RegExp(`^\\s*${escapeRegex(nameToken)}\\s*$`, "i");
          company = await Company.findOne({
            $or: [{ businessName: nameRegex }, { companyName: nameRegex }],
          })
            .populate("user", "firstName lastName username")
            .populate("contactInfo.laborConsultantId", "businessName agentName")
            .lean();
        }
      }

      const companyName = company?.companyName || company?.businessName;
      const responsabileName =
        company?.contractDetails?.territorialManager ||
        (company?.user
          ? `${company.user.firstName || ""} ${company.user.lastName || ""}`.trim() || company.user.username
          : undefined);
      const sportelloName =
        company?.contactInfo?.laborConsultantId?.agentName ||
        company?.contactInfo?.laborConsultantId?.businessName ||
        company?.contactInfo?.laborConsultant;
      return {
        ...item,
        companyName,
        responsabileName,
        sportelloName,
      };
    }));

    const filteredByRole = isResponsabileScope
      ? enrichedAll.filter((item) => matchesResponsabile(item.company, item.responsabileName))
      : enrichedAll;
    const companyTerm = (company || "").trim().toLowerCase();
    const responsabileTerm = (responsabile || "").trim().toLowerCase();
    const sportelloTerm = (sportello || "").trim().toLowerCase();
    const filteredByStructuredSearch = filteredByRole.filter((item: any) => {
      const companyValue = String(item.companyName || "").toLowerCase();
      const responsabileValue = String(item.responsabileName || "").toLowerCase();
      const sportelloValue = String(item.sportelloName || "").toLowerCase();
      if (companyTerm && !companyValue.includes(companyTerm)) return false;
      if (responsabileTerm && !responsabileValue.includes(responsabileTerm)) return false;
      if (sportelloTerm && !sportelloValue.includes(sportelloTerm)) return false;
      return true;
    });
    const filtered = qTerm
      ? filteredByStructuredSearch.filter((item: any) => {
          const fields = [
            item.description,
            item.importKey,
            item.companyName,
            item.responsabileName,
            item.sportelloName,
          ]
            .filter(Boolean)
            .map((value: any) => String(value).toLowerCase());
          return fields.some((value: string) => value.includes(qTerm));
        })
      : filteredByStructuredSearch;
    const total = filtered.length;
    const items = filtered.slice(skip, skip + pageSize);

    return res.json({
      items,
      total,
      page: pageNum,
      pageSize,
    });
  } catch (err: any) {
    console.error("Get non riconciliate error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getContoBreakdown: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const cacheKey = getComputedCacheKey(req);
    const cached = readComputedBreakdownCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { account, from, to, type, status, q } = req.query as Record<string, string>;
    const userId = getEffectiveUserId(req);
    const isResponsabile = req.user.role === "responsabile_territoriale";
    const isResponsabileScope = isResponsabile && account === "proselitismo";
    const isSportelloScope = req.user.role === "sportello_lavoro";
    const responsabileObjectId = isResponsabile ? new mongoose.Types.ObjectId(req.user._id) : null;
    let sportelloCompanyIds: mongoose.Types.ObjectId[] = [];
    let responsabileMatch: any = null;
    if (isResponsabileScope) {
      const scope = await getResponsabileScope(req.user._id);
      responsabileMatch = scope.responsabileMatch;
    }
    if (isSportelloScope) {
      sportelloCompanyIds = await getSportelloScopedCompanyIds(req.user._id);
    }
    const match: any = {};
    if (userId && !isResponsabileScope && !isSportelloScope) {
      match.user = new mongoose.Types.ObjectId(userId);
    }
    if (account) match.account = account;
    if (isSportelloScope) {
      match.$or = sportelloCompanyIds.length
        ? [
            { user: new mongoose.Types.ObjectId(req.user._id) },
            { company: { $in: sportelloCompanyIds } },
          ]
        : [{ user: new mongoose.Types.ObjectId(req.user._id) }];
    }
    if (type) match.type = type;
    if (status) match.status = status;
    if (q) match.description = { $regex: q, $options: "i" };
    if (from || to) {
      match.date = {};
      const fromDate = parseDateStart(from);
      const toDate = parseDateEnd(to);
      if (fromDate) match.date.$gte = fromDate;
      if (toDate) match.date.$lte = toDate;
      if (!fromDate && !toDate) delete match.date;
    }

    const pipeline: any[] = [
      { $match: match },
      {
        $match: {
          type: "entrata",
          rawAmount: { $gt: 0 },
          importKey: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$importKey",
          elav: { $first: "$rawAmount" },
          company: { $first: "$company" },
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "company",
          foreignField: "_id",
          as: "companyDoc",
        },
      },
      { $unwind: { path: "$companyDoc", preserveNullAndEmptyArrays: true } },
      ...(isResponsabileScope ? [{ $match: responsabileMatch }] : []),
      {
        $lookup: {
          from: "users",
          localField: "companyDoc.user",
          foreignField: "_id",
          as: "responsabileDoc",
        },
      },
      { $unwind: { path: "$responsabileDoc", preserveNullAndEmptyArrays: true } },
      {
        // Some datasets store laborConsultantId as string; normalize to ObjectId for lookup.
        $addFields: {
          laborConsultantObjId: "$companyDoc.contactInfo.laborConsultantId",
        },
      },
      {
        $lookup: {
          from: "sportellolavoros",
          localField: "laborConsultantObjId",
          foreignField: "_id",
          as: "sportelloDoc",
        },
      },
      { $unwind: { path: "$sportelloDoc", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          fiacomAmount: { $multiply: ["$elav", FIACOM_NET_RATIO] },
          responsabilePercent: "$responsabileDoc.profitSharePercentage",
          sportelloPercent: "$sportelloDoc.agreedCommission",
          responsabileName: {
            $let: {
              vars: {
                org: { $ifNull: ["$responsabileDoc.organization", ""] },
                full: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ["$responsabileDoc.firstName", ""] },
                        " ",
                        { $ifNull: ["$responsabileDoc.lastName", ""] },
                      ],
                    },
                  },
                },
              },
              in: {
                $cond: [
                  { $gt: [{ $strLenCP: "$$org" }, 0] },
                  "$$org",
                  {
                    $cond: [
                      { $gt: [{ $strLenCP: "$$full" }, 0] },
                      "$$full",
                      "$responsabileDoc.username",
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          sportelloName: {
            // Prefer agentName in UI labels to avoid showing territorial-manager-like business aliases.
            $ifNull: ["$sportelloDoc.agentName", "$sportelloDoc.businessName"],
          },
          sportelloNameKey: {
            $toLower: {
              $trim: {
                input: {
                  $ifNull: ["$sportelloDoc.agentName", "$sportelloDoc.businessName"],
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id", // importKey
          elav: { $first: "$elav" },
          fiacomAmount: { $first: "$fiacomAmount" },
          responsabileDoc: { $first: "$responsabileDoc" },
          responsabileName: { $first: "$responsabileName" },
          responsabilePercent: { $first: "$responsabilePercent" },
          sportelloDoc: { $first: "$sportelloDoc" },
          sportelloName: { $first: "$sportelloName" },
          sportelloNameKey: { $first: "$sportelloNameKey" },
          sportelloPercent: { $first: "$sportelloPercent" },
          sportelloUserRole: { $first: "$sportelloUserRole" },
        },
      },
      {
        $facet: {
          responsabili: [
            { $match: { "responsabileDoc._id": { $ne: null } } },
            {
              $group: {
                _id: "$responsabileDoc._id",
                name: { $first: "$responsabileName" },
                rawTotal: { $sum: "$elav" },
                total: {
                  $sum: {
                    // Responsabili calcolati sulla quota ELAV totale
                    $multiply: ["$elav", { $divide: ["$responsabilePercent", 100] }],
                  },
                },
                fiacomTotal: { $sum: "$fiacomAmount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
          ],
          sportelli: [
            {
              $match: { "sportelloDoc._id": { $ne: null } },
            },
            {
              $group: {
                // Raggruppiamo per nome normalizzato per evitare duplicati (sportelli con stesso nome ma ID diversi).
                _id: "$sportelloNameKey",
                name: { $first: "$sportelloName" },
                rawTotal: { $sum: "$elav" },
                total: {
                  $sum: {
                    // Sportelli calcolati sulla quota ELAV totale
                    $multiply: ["$elav", { $divide: ["$sportelloPercent", 100] }],
                  },
                },
                fiacomTotal: { $sum: "$fiacomAmount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
          ],
        },
      },
    ];

    const result = await ContoTransaction.aggregate(pipeline);
    const payload = result?.[0] || {};

    const payloadRes = {
      responsabili: payload.responsabili || [],
      sportelli: payload.sportelli || [],
    };
    writeComputedBreakdownCache(cacheKey, payloadRes);
    return res.json(payloadRes);
  } catch (err: any) {
    console.error("Get conto breakdown error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
