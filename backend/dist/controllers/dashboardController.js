"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeUserDashboard = exports.getDashboardStats = void 0;
const Account_1 = __importDefault(require("../models/Account"));
const Company_1 = __importDefault(require("../models/Company"));
const Project_1 = __importDefault(require("../models/Project"));
const Dashboard_1 = __importDefault(require("../models/Dashboard"));
// Get dashboard stats for the authenticated user
const getDashboardStats = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const userId = req.user._id;
        // Get accounts data
        const accounts = await Account_1.default.find({ user: userId });
        const proselitismoAccount = accounts.find(acc => acc.type === "proselitismo") || { balance: 0 };
        const serviziAccount = accounts.find(acc => acc.type === "servizi") || { balance: 0 };
        // Count companies - real count from database
        const companiesCount = await Company_1.default.countDocuments({ user: userId });
        // Count actuators - use real count instead of hardcoded value
        const actuatorsCount = 0; // Change this to a real count if you have an actuators collection
        // Count employees
        const employeesCount = await Company_1.default.aggregate([
            { $match: { user: userId } },
            { $group: { _id: null, total: { $sum: "$employees" } } }
        ]);
        const totalEmployees = employeesCount.length > 0 ? employeesCount[0].total : 0;
        // Count suppliers
        const suppliersCount = 0; // Implement if needed
        // Unread messages
        const unreadMessages = 0; // Implement if needed
        // Projects stats - real counts from database
        const requestedProjects = await Project_1.default.countDocuments({
            user: userId,
            status: "requested"
        });
        const inProgressProjects = await Project_1.default.countDocuments({
            user: userId,
            status: "inProgress"
        });
        const completedProjects = await Project_1.default.countDocuments({
            user: userId,
            status: "completed"
        });
        // Update or create dashboard stats
        await Dashboard_1.default.findOneAndUpdate({ user: userId }, {
            companies: companiesCount,
            actuators: actuatorsCount,
            employees: totalEmployees,
            suppliers: suppliersCount,
            unreadMessages: unreadMessages,
            projectsRequested: requestedProjects,
            projectsInProgress: inProgressProjects,
            projectsCompleted: completedProjects,
            updatedAt: new Date()
        }, { upsert: true, new: true });
        return res.json({
            accounts: {
                proselitismo: {
                    balance: proselitismoAccount.balance || 0
                },
                servizi: {
                    balance: serviziAccount.balance || 0
                }
            },
            statistics: {
                companies: companiesCount,
                actuators: actuatorsCount,
                employees: totalEmployees,
                suppliers: suppliersCount,
                unreadMessages: unreadMessages
            },
            projects: {
                requested: requestedProjects,
                inProgress: inProgressProjects,
                completed: completedProjects
            }
        });
    }
    catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getDashboardStats = getDashboardStats;
const initializeUserDashboard = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const userId = req.user._id;
        // Check if user already has accounts
        const existingAccounts = await Account_1.default.find({ user: userId });
        if (existingAccounts.length === 0) {
            // Create empty accounts with zero balances
            // Create empty accounts with zero balances
            await Account_1.default.create([
                {
                    name: "Conto proselitismo",
                    type: "proselitismo",
                    balance: 0.00,
                    user: userId
                },
                {
                    name: "Conto servizi",
                    type: "servizi",
                    balance: 0.00,
                    user: userId
                }
            ]);
            // Create empty dashboard stats
            await Dashboard_1.default.create({
                user: userId,
                companies: 0, // Changed to 0
                actuators: 0, // Changed to 0
                employees: 0,
                suppliers: 0,
                unreadMessages: 0,
                projectsRequested: 0,
                projectsInProgress: 0, // Changed to 0
                projectsCompleted: 0, // Changed to 0
                updatedAt: new Date()
            });
            return res.status(201).json({ message: "Dashboard initialized successfully" });
        }
        else {
            return res.status(200).json({ message: "Dashboard already initialized" });
        }
    }
    catch (error) {
        console.error("Dashboard initialization error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.initializeUserDashboard = initializeUserDashboard;
//# sourceMappingURL=dashboardController.js.map