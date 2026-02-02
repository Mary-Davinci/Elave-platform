"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContoSummary = exports.getContoTransactions = exports.createCompetenzaTransactions = void 0;
const ContoTransaction_1 = __importDefault(require("../models/ContoTransaction"));
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const FIACOM_NET_RATIO = 3.5 / 8;
const RESPONSABILE_RATIO = 1.5 / 8;
const SPORTELLO_RATIO = 3 / 8;
const round2 = (value) => Math.round(value * 100) / 100;
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
        return res.json({
            balance,
            incoming,
            outgoing,
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
