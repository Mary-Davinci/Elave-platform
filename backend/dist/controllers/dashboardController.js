"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Account_1 = __importDefault(require("../models/Account"));
const Company_1 = __importDefault(require("../models/Company"));
const Project_1 = __importDefault(require("../models/Project"));
const Dashboard_1 = __importDefault(require("../models/Dashboard"));
const User_1 = __importDefault(require("../models/User"));
const Segnalatore_1 = __importDefault(require("../models/Segnalatore")); // <-- your Segnalatore model file name
const sportello_1 = __importDefault(require("../models/sportello")); // <-- your SportelloLavoro model file name
const Agenti_1 = __importDefault(require("../models/Agenti")); // <-- your Agente model file name
const Message_1 = __importDefault(require("../models/Message"));
const toId = (v) => new mongoose_1.default.Types.ObjectId(String(v));
async function getScopedUserIds(currentUserId, role) {
    if (role === "admin" || role === "super_admin")
        return null; // GLOBAL
    const scope = new Set([currentUserId.toString()]);
    // Direct reports
    const direct = await User_1.default.find({ managedBy: currentUserId }, { _id: 1 }).lean();
    const directIds = direct.map(u => u._id);
    directIds.forEach(id => scope.add(id.toString()));
    if (role === "responsabile_territoriale") {
        // Second-level (reports of direct reports)
        if (directIds.length) {
            const second = await User_1.default.find({ managedBy: { $in: directIds } }, { _id: 1 }).lean();
            second.forEach(u => scope.add(String(u._id)));
        }
    }
    return Array.from(scope).map(toId);
}
function ownedByScopeFilter(scopeIds) {
    if (!scopeIds)
        return {}; // admin/global
    return { user: { $in: scopeIds } }; // your models (Company, Segnalatore, SportelloLavoro) use "user"
}
const getDashboardStats = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "User not authenticated" });
        const userId = toId(req.user._id);
        const role = req.user.role;
        // Scope users
        const scopeIds = await getScopedUserIds(userId, role);
        // --- Accounts (only for current user, as before) ---
        const accounts = await Account_1.default.find({ user: userId });
        const proselitismoAccount = accounts.find(a => a.type === "proselitismo") || { balance: 0 };
        const serviziAccount = accounts.find(a => a.type === "servizi") || { balance: 0 };
        // --- Companies (count) & Employees (sum) ---
        const companyFilter = ownedByScopeFilter(scopeIds);
        const companiesCount = await Company_1.default.countDocuments(companyFilter);
        const employeesAgg = await Company_1.default.aggregate([
            { $match: companyFilter },
            { $group: { _id: null, total: { $sum: { $ifNull: ["$employees", 0] } } } },
        ]);
        const totalEmployees = employeesAgg[0]?.total ?? 0;
        // --- Sportelli Lavoro (from dedicated collection) ---
        const sportelloFilter = ownedByScopeFilter(scopeIds);
        const sportelliCount = await sportello_1.default.countDocuments(sportelloFilter);
        // --- Segnalatori (from dedicated collection) ---
        const segnalatoriFilter = ownedByScopeFilter(scopeIds);
        const segnalatoriCount = await Segnalatore_1.default.countDocuments(segnalatoriFilter);
        // --- Responsabili Territoriali (from dedicated collection) ---
        const responsabiliFilter = ownedByScopeFilter(scopeIds);
        const responsabiliCount = await Agenti_1.default.countDocuments(responsabiliFilter);
        // --- Messages (unread for current user only) ---
        const unreadMessages = await Message_1.default.countDocuments({
            recipients: userId,
            read: false,
            status: "inbox",
        });
        // --- Projects (global for admin, scoped otherwise) ---
        const projectFilter = !scopeIds ? {} : { $or: [{ user: { $in: scopeIds } }, { createdBy: { $in: scopeIds } }, { owner: { $in: scopeIds } }] };
        const requestedProjects = await Project_1.default.countDocuments({ ...projectFilter, status: "requested" });
        const inProgressProjects = await Project_1.default.countDocuments({ ...projectFilter, status: "inProgress" });
        const completedProjects = await Project_1.default.countDocuments({ ...projectFilter, status: "completed" });
        // --- Persist snapshot ---
        await Dashboard_1.default.findOneAndUpdate({ user: userId }, {
            companies: companiesCount,
            actuators: sportelliCount, // Sportelli Lavoro
            employees: totalEmployees,
            suppliers: responsabiliCount, // Responsabili Territoriali
            segnalatori: segnalatoriCount, // Segnalatori
            unreadMessages,
            projectsRequested: requestedProjects,
            projectsInProgress: inProgressProjects,
            projectsCompleted: completedProjects,
            updatedAt: new Date(),
        }, { upsert: true, new: true });
        // --- Respond ---
        return res.json({
            accounts: {
                proselitismo: { balance: proselitismoAccount.balance || 0 },
                servizi: { balance: serviziAccount.balance || 0 },
            },
            statistics: {
                companies: companiesCount,
                actuators: sportelliCount, // Sportelli Lavoro
                employees: totalEmployees,
                suppliers: responsabiliCount, // Responsabili Territoriali
                segnalatori: segnalatoriCount, // Segnalatori
                unreadMessages,
            },
            projects: {
                requested: requestedProjects,
                inProgress: inProgressProjects,
                completed: completedProjects,
            },
        });
    }
    catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=dashboardController.js.map