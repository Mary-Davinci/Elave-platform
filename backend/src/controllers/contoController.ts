import { Request, Response } from "express";
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
const FIACOM_NET_RATIO = 0.8;

const round2 = (value: number) => Math.round(value * 100) / 100;
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

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const buildImportKey = (data: any, baseAmount: number | null, nonRec: number | null) => {
  const mese = (data.mese || "").toString().trim();
  const anno = (data.anno || "").toString().trim();
  const matricola = (data.matricolaInps || "").toString().trim().toUpperCase();
  const ragione = (data.ragioneSociale || "").toString().trim().toUpperCase();
  const fiacom = baseAmount && baseAmount > 0 ? `F:${round2(baseAmount)}` : "";
  const non = nonRec && nonRec > 0 ? `NR:${round2(nonRec)}` : "";
  return ["proselitismo", mese, anno, matricola, ragione, fiacom, non].join("|");
};

const getEffectiveUserId = (req: Request) => {
  if (!req.user) return null;
  const requested = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
  if (isAdmin && requested) return requested;
  if (isAdmin) return null; // global view for admin/super_admin
  return req.user._id?.toString() || null;
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

        rows.slice(1).forEach((row, idx) => {
          if (isRowEmpty(row)) return;
          const data = buildRowData(row, headerIndexes);
          const errors: string[] = [];
          const baseAmount = parseNumber(data.quotaFiacom);
          const nonRec = parseNumber(data.nonRiconciliata);

          if (!data.matricolaInps && !data.ragioneSociale) {
            errors.push("Matricola INPS o Ragione Sociale mancante");
          }

          if (!baseAmount || baseAmount <= 0) {
            if (nonRec && nonRec > 0) {
              nonRiconciliate.push({ rowNumber: idx + 2, data, errors });
            } else {
              errors.push("Quota FIACOM mancante o non valida");
              preview.push({ rowNumber: idx + 2, data, errors });
            }
          } else {
            preview.push({ rowNumber: idx + 2, data, errors });
          }
        });

        fs.unlinkSync(file.path);
        return res.json({
          preview,
          nonRiconciliate,
          errors: preview.flatMap((p) => p.errors || []),
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
          const importKey = buildImportKey(data, baseAmount, nonRec);

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
                account: "proselitismo",
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
            }).select("_id user companyName businessName contactInfo.laborConsultantId contactInfo.laborConsultant");
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
              .select("_id user companyName businessName contactInfo.laborConsultantId contactInfo.laborConsultant")
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
            errors.push(`Row ${i + 1}: Responsabile territoriale non associato`);
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
            if (normalizedName && normalizedName !== currentName) {
              await Company.updateOne(
                { _id: company._id },
                {
                  $set: {
                    "contactInfo.laborConsultantId": sportelloDoc._id,
                    "contactInfo.laborConsultant": normalizedName,
                  },
                }
              );
            } else if (!sportelloId) {
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

          const description = descriptionParts.join(" | ") || "Competenza proselitismo";

          transactionsToInsert.push(
            {
              account: "proselitismo",
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
              account: "proselitismo",
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
              account: "proselitismo",
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
                duplicateRows.push({ rowNumber: row.rowNumber, reason: "Duplicato già presente", data: row.data });
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

        if (!existingImport) {
          await ContoImport.create({
            fileHash,
            originalName: file.originalname,
            uploadedBy: uploaderId,
            rowCount: rows.length - 1,
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

    const { account, from, to, type, status, q, page, limit } = req.query as Record<string, string>;
    const userId = getEffectiveUserId(req);
    const query: any = {};
    if (userId) query.user = userId;
    if (account) query.account = account;
    if (type) query.type = type;
    if (status) query.status = status;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = (pageNum - 1) * pageSize;

    const hasSearch = Boolean(q && q.trim());
    let enriched: any[] = [];
    let total = 0;

    if (!hasSearch) {
      const [transactions, totalCount] = await Promise.all([
        ContoTransaction.find(query)
          .sort({ date: -1, createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .populate({
            path: "company",
            select: "businessName companyName user contactInfo.laborConsultantId",
            populate: [
              { path: "user", select: "firstName lastName username profitSharePercentage" },
              { path: "contactInfo.laborConsultantId", select: "businessName agentName agreedCommission" },
            ],
          })
          .populate({ path: "user", select: "firstName lastName username role" })
          .lean(),
        ContoTransaction.countDocuments(query),
      ]);

      enriched = transactions.map((tx: any) => {
        const company = tx.company;
        const companyName = company?.companyName || company?.businessName;
        const responsabileFromCompanyUser = company?.user
          ? `${company.user.firstName || ""} ${company.user.lastName || ""}`.trim() || company.user.username
          : undefined;
        const sportello = company?.contactInfo?.laborConsultantId;
        const sportelloFromId = sportello?.businessName || sportello?.agentName;
        const responsabileName =
          company?.contractDetails?.territorialManager || responsabileFromCompanyUser;
        const sportelloName =
          sportelloFromId || company?.contactInfo?.laborConsultant;
        return {
          ...tx,
          companyName,
          responsabileName,
          sportelloName,
        };
      });
      total = totalCount;
    } else {
      const regex = new RegExp(escapeRegex(q.trim()), "i");
      const pipeline: any[] = [
        { $match: query },
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
          $addFields: {
            companyName: { $ifNull: ["$companyDoc.companyName", "$companyDoc.businessName"] },
            responsabileName: {
              $let: {
                vars: {
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
                  $ifNull: [
                    "$responsabileDoc.organization",
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
            sportelloName: {
              $ifNull: [
                "$sportelloDoc.businessName",
                { $ifNull: ["$sportelloDoc.agentName", "$companyDoc.contactInfo.laborConsultant"] },
              ],
            },
          },
        },
        {
          $match: {
            $or: [
              { description: { $regex: regex } },
              { companyName: { $regex: regex } },
              { responsabileName: { $regex: regex } },
              { sportelloName: { $regex: regex } },
            ],
          },
        },
        { $sort: { date: -1, createdAt: -1 } },
        {
          $facet: {
            items: [{ $skip: skip }, { $limit: pageSize }],
            total: [{ $count: "count" }],
          },
        },
      ];

      const result = await ContoTransaction.aggregate(pipeline);
      const items = result?.[0]?.items || [];
      const count = result?.[0]?.total?.[0]?.count ?? 0;
      enriched = items.map((tx: any) => ({
        ...tx,
        companyName: tx.companyName,
        responsabileName: tx.responsabileName,
        sportelloName: tx.sportelloName,
      }));
      total = count;
    }

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

export const getContoSummary: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { account, from, to, type, status, q } = req.query as Record<string, string>;
    const userId = getEffectiveUserId(req);
    const match: any = {};
    if (userId) {
      match.user = new mongoose.Types.ObjectId(userId);
    }
    if (account) match.account = account;
    if (type) match.type = type;
    if (status) match.status = status;
    if (q) match.description = { $regex: q, $options: "i" };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
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
                  { $group: { _id: "$importKey", elav: { $first: "$rawAmount" } } },
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
    const balance = fiacomTotal != null ? fiacomTotal - outgoing : incoming - outgoing;
    const responsabileTotal = useRawForFiacom
      ? Number(totals[0]?.competenze?.[0]?.responsabileTotal ?? 0)
      : 0;
    const sportelloTotal = useRawForFiacom
      ? Number(totals[0]?.competenze?.[0]?.sportelloTotal ?? 0)
      : 0;

    const matchNonRiconciliate: any = {};
    if (userId) {
      matchNonRiconciliate.user = new mongoose.Types.ObjectId(userId);
    }
    if (account) matchNonRiconciliate.account = account;
    if (q) matchNonRiconciliate.description = { $regex: q, $options: "i" };
    if (from || to) {
      matchNonRiconciliate.date = {};
      if (from) matchNonRiconciliate.date.$gte = new Date(from);
      if (to) matchNonRiconciliate.date.$lte = new Date(to);
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
    const nonRiconciliateTotal = nonRiconciliateTotals[0]?.total ?? 0;

    return res.json({
      balance,
      incoming,
      outgoing,
      nonRiconciliateTotal,
      responsabileTotal,
      sportelloTotal,
      totalElav,
      updatedAt: new Date().toISOString(),
    });
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

    const imports = await ContoImport.find({})
      .sort({ createdAt: -1 })
      .select("fileHash originalName uploadedBy rowCount createdAt");

    return res.json(imports);
  } catch (err: any) {
    console.error("Get conto imports error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getNonRiconciliate: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { account, from, to, q, page, limit } = req.query as Record<string, string>;
    const userId = getEffectiveUserId(req);
    const query: any = {};
    if (userId) query.user = userId;
    if (account) query.account = account;
    if (q) query.description = { $regex: q, $options: "i" };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = (pageNum - 1) * pageSize;

    const [items, total] = await Promise.all([
      ContoNonRiconciliata.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate({
          path: "company",
          select: "businessName companyName user contactInfo.laborConsultantId contactInfo.laborConsultant contractDetails.territorialManager",
          populate: [
            { path: "user", select: "firstName lastName username" },
            { path: "contactInfo.laborConsultantId", select: "businessName agentName" },
          ],
        })
        .lean(),
      ContoNonRiconciliata.countDocuments(query),
    ]);

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
        company?.contactInfo?.laborConsultantId?.businessName ||
        company?.contactInfo?.laborConsultantId?.agentName ||
        company?.contactInfo?.laborConsultant;
      return {
        ...item,
        companyName,
        responsabileName,
        sportelloName,
      };
    }));

    return res.json({
      items: enriched,
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

    const { account, from, to, type, status, q } = req.query as Record<string, string>;
    const userId = getEffectiveUserId(req);
    const match: any = {};
    if (userId) {
      match.user = new mongoose.Types.ObjectId(userId);
    }
    if (account) match.account = account;
    if (type) match.type = type;
    if (status) match.status = status;
    if (q) match.description = { $regex: q, $options: "i" };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
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
            $ifNull: ["$sportelloDoc.businessName", "$sportelloDoc.agentName"],
          },
          sportelloNameKey: {
            $toLower: {
              $trim: {
                input: {
                  $ifNull: ["$sportelloDoc.businessName", "$sportelloDoc.agentName"],
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

    return res.json({
      responsabili: payload.responsabili || [],
      sportelli: payload.sportelli || [],
    });
  } catch (err: any) {
    console.error("Get conto breakdown error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
