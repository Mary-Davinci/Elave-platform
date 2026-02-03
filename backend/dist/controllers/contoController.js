"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadContoFromExcel = exports.previewContoFromExcel = exports.getContoSummary = exports.getContoTransactions = exports.createCompetenzaTransactions = void 0;
const ContoTransaction_1 = __importDefault(require("../models/ContoTransaction"));
const ContoNonRiconciliata_1 = __importDefault(require("../models/ContoNonRiconciliata"));
const User_1 = __importDefault(require("../models/User"));
const Company_1 = __importDefault(require("../models/Company"));
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const xlsx_1 = __importDefault(require("xlsx"));
const FIACOM_NET_RATIO = 3.5 / 8;
const RESPONSABILE_RATIO = 1.5 / 8;
const SPORTELLO_RATIO = 3 / 8;
const round2 = (value) => Math.round(value * 100) / 100;
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path_1.default.join(__dirname, "../uploads/conto");
            if (!fs_1.default.existsSync(uploadDir)) {
                fs_1.default.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, `conto-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
        },
    }),
    fileFilter: (req, file, cb) => {
        const validExtensions = /\.xlsx$|\.xls$/i;
        if (validExtensions.test(path_1.default.extname(file.originalname).toLowerCase())) {
            return cb(null, true);
        }
        return cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
    },
}).single("file");
const normalizeHeader = (value) => String(value || "").toLowerCase().trim().replace(/\s+/g, " ").replace(/[^\w\s]/g, "");
const headerAliases = {
    mese: ["mese"],
    anno: ["anno"],
    matricolaInps: ["matricola inps", "matricola", "inps"],
    ragioneSociale: ["ragione sociale", "ragione", "azienda", "impresa"],
    nonRiconciliata: ["non riconciliata", "quota non riconciliata", "non riconciliate"],
    quotaRiconciliata: ["quota riconciliata", "riconciliata"],
    fondoSanitario: ["fondo sanitario", "fondo sanitario"],
    quotaFiacom: ["quota fiacom", "fiacom", "quota fiacom"],
};
const findHeaderIndex = (headers, aliases) => {
    const normalized = headers.map(normalizeHeader);
    for (const alias of aliases) {
        const idx = normalized.indexOf(normalizeHeader(alias));
        if (idx >= 0)
            return idx;
    }
    return -1;
};
const parseNumber = (value) => {
    if (value === null || value === undefined || value === "")
        return null;
    if (typeof value === "number")
        return value;
    const cleaned = String(value).replace(/\./g, "").replace(",", ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
};
const parseMonth = (value) => {
    if (value === null || value === undefined || value === "")
        return null;
    if (typeof value === "number")
        return Math.min(Math.max(value, 1), 12);
    const v = String(value).toLowerCase().trim();
    const map = {
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
    if (num)
        return num;
    const asNum = Number(v);
    return Number.isFinite(asNum) ? Math.min(Math.max(asNum, 1), 12) : null;
};
const buildRowData = (row, headerIndexes) => {
    const get = (key) => {
        const idx = headerIndexes[key];
        if (idx === undefined || idx < 0)
            return "";
        return row[idx];
    };
    return {
        mese: (get("mese")?.toString().trim()) || "",
        anno: (get("anno")?.toString().trim()) || "",
        matricolaInps: (get("matricolaInps")?.toString().trim()) || "",
        ragioneSociale: (get("ragioneSociale")?.toString().trim()) || "",
        nonRiconciliata: get("nonRiconciliata"),
        quotaRiconciliata: get("quotaRiconciliata"),
        fondoSanitario: get("fondoSanitario"),
        quotaFiacom: get("quotaFiacom"),
    };
};
const getEffectiveUserId = (req) => {
    if (!req.user)
        return null;
    const requested = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
    if (isAdmin && requested)
        return requested;
    return (req.user._id?.toString()) || null;
};
const createCompetenzaTransactions = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { account = "proselitismo", baseAmount, responsabileId, sportelloId, description = "Competenza proselitismo", category = "Competenza", companyId, source = "manuale", } = req.body;
        const base = Number(baseAmount);
        if (!Number.isFinite(base) || base <= 0) {
            return res.status(400).json({ error: "baseAmount is required and must be > 0" });
        }
        if (!responsabileId || !sportelloId) {
            return res.status(400).json({ error: "responsabileId and sportelloId are required" });
        }
        const [responsabile, sportello] = await Promise.all([
            User_1.default.findById(responsabileId).select("_id role isActive"),
            User_1.default.findById(sportelloId).select("_id role isActive"),
        ]);
        if (!responsabile || responsabile.role !== "responsabile_territoriale" || responsabile.isActive === false) {
            return res.status(400).json({ error: "Responsabile territoriale non valido o inattivo" });
        }
        if (!sportello || sportello.role !== "sportello_lavoro" || sportello.isActive === false) {
            return res.status(400).json({ error: "Sportello lavoro non valido o inattivo" });
        }
        const fiacomAmount = round2(base * FIACOM_NET_RATIO);
        const responsabileAmount = round2(base * RESPONSABILE_RATIO);
        const sportelloAmount = round2(base * SPORTELLO_RATIO);
        const companyRef = companyId && mongoose_1.default.Types.ObjectId.isValid(companyId)
            ? new mongoose_1.default.Types.ObjectId(companyId)
            : undefined;
        const transactions = await ContoTransaction_1.default.insertMany([
            {
                account,
                amount: fiacomAmount,
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
    }
    catch (err) {
        console.error("Create conto transactions error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.createCompetenzaTransactions = createCompetenzaTransactions;
const previewContoFromExcel = async (req, res) => {
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
                const workbook = xlsx_1.default.readFile(file.path);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows = xlsx_1.default.utils.sheet_to_json(worksheet, { header: 1 });
                if (!rows || rows.length < 2) {
                    fs_1.default.unlinkSync(file.path);
                    return res.status(400).json({ error: "Excel file has no data" });
                }
                const headerRow = rows[0];
                const headerIndexes = {};
                Object.keys(headerAliases).forEach((key) => {
                    headerIndexes[key] = findHeaderIndex(headerRow, headerAliases[key]);
                });
                const preview = [];
                const nonRiconciliate = [];
                rows.slice(1).forEach((row, idx) => {
                    const data = buildRowData(row, headerIndexes);
                    const errors = [];
                    const baseAmount = parseNumber(data.quotaFiacom);
                    const nonRec = parseNumber(data.nonRiconciliata);
                    if (!data.matricolaInps && !data.ragioneSociale) {
                        errors.push("Matricola INPS o Ragione Sociale mancante");
                    }
                    if (!baseAmount || baseAmount <= 0) {
                        if (nonRec && nonRec > 0) {
                            nonRiconciliate.push({ rowNumber: idx + 2, data, errors });
                        }
                        else {
                            errors.push("Quota FIACOM mancante o non valida");
                            preview.push({ rowNumber: idx + 2, data, errors });
                        }
                    }
                    else {
                        preview.push({ rowNumber: idx + 2, data, errors });
                    }
                });
                fs_1.default.unlinkSync(file.path);
                return res.json({
                    preview,
                    nonRiconciliate,
                    errors: preview.flatMap((p) => p.errors || []),
                });
            }
            catch (processError) {
                if (file && fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
                return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
            }
        });
    }
    catch (err) {
        console.error("Preview conto error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.previewContoFromExcel = previewContoFromExcel;
const uploadContoFromExcel = async (req, res) => {
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
                const workbook = xlsx_1.default.readFile(file.path);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows = xlsx_1.default.utils.sheet_to_json(worksheet, { header: 1 });
                if (!rows || rows.length < 2) {
                    fs_1.default.unlinkSync(file.path);
                    return res.status(400).json({ error: "Excel file has no data" });
                }
                const headerRow = rows[0];
                const headerIndexes = {};
                Object.keys(headerAliases).forEach((key) => {
                    headerIndexes[key] = findHeaderIndex(headerRow, headerAliases[key]);
                });
                const errors = [];
                const transactionsToInsert = [];
                const nonRiconciliateToInsert = [];
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const data = buildRowData(row, headerIndexes);
                    const baseAmount = parseNumber(data.quotaFiacom);
                    const nonRec = parseNumber(data.nonRiconciliata);
                    if (!data.matricolaInps && !data.ragioneSociale) {
                        errors.push(`Row ${i + 1}: Matricola INPS o Ragione Sociale mancante`);
                        continue;
                    }
                    if (!baseAmount || baseAmount <= 0) {
                        if (nonRec && nonRec > 0) {
                            const month = parseMonth(data.mese);
                            const year = Number(data.anno);
                            const date = month && Number.isFinite(year)
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
                                user: req.user._id,
                                company: company?._id,
                                source: "xlsx",
                                date,
                            });
                            continue;
                        }
                        errors.push(`Row ${i + 1}: Quota FIACOM mancante o non valida`);
                        continue;
                    }
                    const company = await Company_1.default.findOne({
                        $or: [
                            { inpsCode: data.matricolaInps },
                            { matricola: data.matricolaInps },
                            { businessName: data.ragioneSociale },
                            { companyName: data.ragioneSociale },
                        ],
                    }).select("_id user contactInfo.laborConsultantId");
                    if (!company) {
                        errors.push(`Row ${i + 1}: Azienda non trovata`);
                        continue;
                    }
                    const responsabileId = company.user?.toString();
                    const sportelloId = company.contactInfo?.laborConsultantId?.toString();
                    if (!responsabileId) {
                        errors.push(`Row ${i + 1}: Responsabile territoriale non associato`);
                        continue;
                    }
                    if (!sportelloId) {
                        errors.push(`Row ${i + 1}: Sportello lavoro non associato`);
                        continue;
                    }
                    const fiacomAmount = round2(baseAmount * FIACOM_NET_RATIO);
                    const responsabileAmount = round2(baseAmount * RESPONSABILE_RATIO);
                    const sportelloAmount = round2(baseAmount * SPORTELLO_RATIO);
                    const month = parseMonth(data.mese);
                    const year = Number(data.anno);
                    const date = month && Number.isFinite(year)
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
                    transactionsToInsert.push({
                        account: "proselitismo",
                        amount: fiacomAmount,
                        type: "entrata",
                        status: "completata",
                        description,
                        category: "Competenza",
                        user: req.user._id,
                        company: company._id,
                        source: "xlsx",
                        date,
                    }, {
                        account: "proselitismo",
                        amount: responsabileAmount,
                        type: "entrata",
                        status: "completata",
                        description,
                        category: "Competenza",
                        user: responsabileId,
                        company: company._id,
                        source: "xlsx",
                        date,
                    }, {
                        account: "proselitismo",
                        amount: sportelloAmount,
                        type: "entrata",
                        status: "completata",
                        description,
                        category: "Competenza",
                        user: sportelloId,
                        company: company._id,
                        source: "xlsx",
                        date,
                    });
                }
                if (transactionsToInsert.length > 0) {
                    await ContoTransaction_1.default.insertMany(transactionsToInsert);
                }
                if (nonRiconciliateToInsert.length > 0) {
                    await ContoNonRiconciliata_1.default.insertMany(nonRiconciliateToInsert);
                }
                fs_1.default.unlinkSync(file.path);
                return res.status(201).json({
                    message: `${transactionsToInsert.length} transazioni create${errors.length ? ` con ${errors.length} errori` : ""}`,
                    errors: errors.length ? errors : undefined,
                });
            }
            catch (processError) {
                if (file && fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
                return res.status(500).json({ error: "Error processing Excel file: " + processError.message });
            }
        });
    }
    catch (err) {
        console.error("Upload conto error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.uploadContoFromExcel = uploadContoFromExcel;
const getContoTransactions = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { account, from, to, type, status, q } = req.query;
        const userId = getEffectiveUserId(req);
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const query = { user: userId };
        if (account)
            query.account = account;
        if (type)
            query.type = type;
        if (status)
            query.status = status;
        if (q)
            query.description = { $regex: q, $options: "i" };
        if (from || to) {
            query.date = {};
            if (from)
                query.date.$gte = new Date(from);
            if (to)
                query.date.$lte = new Date(to);
        }
        const transactions = await ContoTransaction_1.default.find(query).sort({ date: -1, createdAt: -1 });
        return res.json(transactions);
    }
    catch (err) {
        console.error("Get conto transactions error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getContoTransactions = getContoTransactions;
const getContoSummary = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { account, from, to, type, status, q } = req.query;
        const userId = getEffectiveUserId(req);
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const match = { user: new mongoose_1.default.Types.ObjectId(userId) };
        if (account)
            match.account = account;
        if (type)
            match.type = type;
        if (status)
            match.status = status;
        if (q)
            match.description = { $regex: q, $options: "i" };
        if (from || to) {
            match.date = {};
            if (from)
                match.date.$gte = new Date(from);
            if (to)
                match.date.$lte = new Date(to);
        }
        const totals = await ContoTransaction_1.default.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    incoming: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "entrata"] }, "$amount", 0],
                        },
                    },
                    outgoing: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "uscita"] }, "$amount", 0],
                        },
                    },
                },
            },
        ]);
        const incoming = (totals[0]?.incoming) ?? 0;
        const outgoing = (totals[0]?.outgoing) ?? 0;
        const balance = incoming - outgoing;
        const nonRiconciliateTotals = await ContoNonRiconciliata_1.default.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                },
            },
        ]);
        const nonRiconciliateTotal = (nonRiconciliateTotals[0]?.total) ?? 0;
        return res.json({
            balance,
            incoming,
            outgoing,
            nonRiconciliateTotal,
            updatedAt: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error("Get conto summary error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getContoSummary = getContoSummary;
//# sourceMappingURL=contoController.js.map
