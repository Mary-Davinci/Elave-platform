import { Request, Response } from "express";
import Account, { IAccount } from "../models/Account";
import Company from "../models/Company";
import Project from "../models/Project";
import DashboardStats from "../models/Dashboard";
import { CustomRequestHandler } from "../types/express";


export const getDashboardStats: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userId = req.user._id;

    const accounts: IAccount[] = await Account.find({ user: userId });
    const proselitismoAccount = accounts.find((acc: IAccount) => acc.type === "proselitismo") || { balance: 0 };
    const serviziAccount = accounts.find((acc: IAccount) => acc.type === "servizi") || { balance: 0 };    

    const companiesCount = await Company.countDocuments({ user: userId });
    
    const actuatorsCount = 0; 
    
    const employeesCount = await Company.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: "$employees" } } }
    ]);
    
    const totalEmployees = employeesCount.length > 0 ? employeesCount[0].total : 0;

    const suppliersCount = 0; 
  
    const unreadMessages = 0; 

    const requestedProjects = await Project.countDocuments({ 
      user: userId, 
      status: "requested" 
    });
    
    const inProgressProjects = await Project.countDocuments({ 
      user: userId, 
      status: "inProgress" 
    });
    
    const completedProjects = await Project.countDocuments({ 
      user: userId, 
      status: "completed" 
    });

    await DashboardStats.findOneAndUpdate(
      { user: userId },
      {
        companies: companiesCount,
        actuators: actuatorsCount,
        employees: totalEmployees,
        suppliers: suppliersCount,
        unreadMessages: unreadMessages,
        projectsRequested: requestedProjects,
        projectsInProgress: inProgressProjects,
        projectsCompleted: completedProjects,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

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
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const initializeUserDashboard: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userId = req.user._id;

    const existingAccounts: IAccount[] = await Account.find({ user: userId });
    
    if (existingAccounts.length === 0) {
      

await Account.create([
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
     
      await DashboardStats.create({
        user: userId,
        companies: 0, 
        actuators: 0,
        employees: 0,
        suppliers: 0,
        unreadMessages: 0,
        projectsRequested: 0,
        projectsInProgress: 0,
        projectsCompleted: 0, 
        updatedAt: new Date()
      });

      return res.status(201).json({ message: "Dashboard initialized successfully" });
    } else {
      return res.status(200).json({ message: "Dashboard already initialized" });
    }
  } catch (error) {
    console.error("Dashboard initialization error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};