import mongoose from "mongoose";
import Account, { IAccount } from "../models/Account";
import Company from "../models/Company";
import Project from "../models/Project";
import DashboardStats from "../models/Dashboard";
import User from "../models/User";
import Segnalatore from "../models/Segnalatore";        // <-- your Segnalatore model file name
import SportelloLavoro from "../models/sportello";      // <-- your SportelloLavoro model file name
import Agente from "../models/Agenti";                  // <-- your Agente model file name
import Message from "../models/Message";
import { CustomRequestHandler } from "../types/express";

const toId = (v: any) => new mongoose.Types.ObjectId(String(v));


async function getScopedUserIds(currentUserId: mongoose.Types.ObjectId, role: string) {
  if (role === "admin" || role === "super_admin") return null; // GLOBAL

  const scope = new Set<string>([currentUserId.toString()]);

  // Direct reports
  const direct = await User.find({ managedBy: currentUserId }, { _id: 1 }).lean();
  const directIds = direct.map(u => u._id as mongoose.Types.ObjectId);
  directIds.forEach(id => scope.add(id.toString()));

  if (role === "responsabile_territoriale") {
    // Second-level (reports of direct reports)
    if (directIds.length) {
      const second = await User.find({ managedBy: { $in: directIds } }, { _id: 1 }).lean();
      second.forEach(u => scope.add(String(u._id)));
    }
  }

  return Array.from(scope).map(toId);
}

function ownedByScopeFilter(scopeIds: mongoose.Types.ObjectId[] | null) {
  if (!scopeIds) return {}; // admin/global
  return { user: { $in: scopeIds } }; // your models (Company, Segnalatore, SportelloLavoro) use "user"
}

export const getDashboardStats: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not authenticated" });

    const userId = toId(req.user._id);
    const role = req.user.role;

    // Scope users
    const scopeIds = await getScopedUserIds(userId, role);

    // --- Accounts (only for current user, as before) ---
    const accounts: IAccount[] = await Account.find({ user: userId });
    const proselitismoAccount =
      accounts.find(a => a.type === "proselitismo") || ({ balance: 0 } as IAccount);
    const serviziAccount =
      accounts.find(a => a.type === "servizi") || ({ balance: 0 } as IAccount);

    // --- Companies (count) & Employees (sum) ---
    const companyFilter = ownedByScopeFilter(scopeIds);
    const companiesCount = await Company.countDocuments(companyFilter);
    const employeesAgg = await Company.aggregate([
      { $match: (companyFilter as any) },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$employees", 0] } } } },
    ]);
    const totalEmployees = employeesAgg[0]?.total ?? 0;

    // --- Sportelli Lavoro (from dedicated collection) ---
    const sportelloFilter = ownedByScopeFilter(scopeIds);
    const sportelliCount = await SportelloLavoro.countDocuments(sportelloFilter);

    // --- Segnalatori (from dedicated collection) ---
    const segnalatoriFilter = ownedByScopeFilter(scopeIds);
    const segnalatoriCount = await Segnalatore.countDocuments(segnalatoriFilter);

    // --- Responsabili Territoriali (from dedicated collection) ---
    const responsabiliFilter = ownedByScopeFilter(scopeIds);
    const responsabiliCount = await Agente.countDocuments(responsabiliFilter);
    // --- Messages (unread for current user only) ---
    const unreadMessages = await Message.countDocuments({
      recipients: userId,
      read: false,
      status: "inbox",
    });

    // --- Projects (global for admin, scoped otherwise) ---
    const projectFilter =
      !scopeIds ? {} : { $or: [{ user: { $in: scopeIds } }, { createdBy: { $in: scopeIds } }, { owner: { $in: scopeIds } }] };
    const requestedProjects = await Project.countDocuments({ ...projectFilter, status: "requested" });
    const inProgressProjects = await Project.countDocuments({ ...projectFilter, status: "inProgress" });
    const completedProjects = await Project.countDocuments({ ...projectFilter, status: "completed" });

    // --- Persist snapshot ---
    await DashboardStats.findOneAndUpdate(
      { user: userId },
      {
        companies: companiesCount,
        actuators: sportelliCount,        // Sportelli Lavoro
        employees: totalEmployees,
        suppliers: responsabiliCount,     // Responsabili Territoriali
        segnalatori: segnalatoriCount,    // Segnalatori
        unreadMessages,
        projectsRequested: requestedProjects,
        projectsInProgress: inProgressProjects,
        projectsCompleted: completedProjects,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // --- Respond ---
    return res.json({
      accounts: {
        proselitismo: { balance: proselitismoAccount.balance || 0 },
        servizi:      { balance: serviziAccount.balance || 0 },
      },
      statistics: {
        companies: companiesCount,
        actuators: sportelliCount,      // Sportelli Lavoro
        employees: totalEmployees,
        suppliers: responsabiliCount,   // Responsabili Territoriali
        segnalatori: segnalatoriCount,  // Segnalatori
        unreadMessages,
      },
      projects: {
        requested:  requestedProjects,
        inProgress: inProgressProjects,
        completed:  completedProjects,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
