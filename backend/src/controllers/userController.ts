import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User";
import { CustomRequestHandler } from "../types/express";

const ROLE_HIERARCHY = {
  "segnalatori": 1,
  "sportello_lavoro": 2,
  "responsabile_territoriale": 3,
  "admin": 4,
  "super_admin": 5
} as const;

const hasMinimumRole = (userRole: string, requiredRole: string): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0;
  return userLevel >= requiredLevel;
};


export const getUsers: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!hasMinimumRole(req.user.role, "admin")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    let query = {};
    
    if (!["admin", "super_admin"].includes(req.user.role)) {
      query = { 
        $or: [
          { managedBy: req.user._id },
          { _id: req.user._id }
        ]
      };
    }

    const users = await User.find(query)
      .select("-password")
      .populate('approvedBy', 'username email')
      .sort({ createdAt: -1 });

    return res.json(users);
  } catch (err: any) {
    console.error("Get users error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getPendingUsers: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!hasMinimumRole(req.user.role, "admin")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const pendingUsers = await User.find({ 
      pendingApproval: true,
      isApproved: false 
    })
      .select("-password")
      .populate('managedBy', 'username email role')
      .sort({ createdAt: -1 });

    return res.json(pendingUsers);
  } catch (err: any) {
    console.error("Get pending users error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const approveUser: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!hasMinimumRole(req.user.role, "admin")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.pendingApproval) {
      return res.status(400).json({ error: "User is not pending approval" });
    }

    user.isApproved = true;
    user.pendingApproval = false;
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();

    await user.save();

    const userResponse = user.toObject();
    const { password: _, ...userWithoutPassword } = userResponse;

    return res.json({
      message: "User approved successfully",
      user: userWithoutPassword
    });
  } catch (err: any) {
    console.error("Approve user error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const rejectUser: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!hasMinimumRole(req.user.role, "admin")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.pendingApproval) {
      return res.status(400).json({ error: "User is not pending approval" });
    }

    await user.deleteOne();

    return res.json({ message: "User rejected and deleted successfully" });
  } catch (err: any) {
    console.error("Reject user error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getManagedUsers: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (hasMinimumRole(req.user.role, "admin")) {
      const users = await User.find()
        .select('-password')
        .sort({ createdAt: -1 });
      return res.json(users);
    }

    // First try to return users explicitly managed by this territorial manager
    const users = await User.find({ managedBy: req.user._id })
      .select('-password')
      .sort({ createdAt: -1 });

    // If there are no managed users and the caller is a territorial manager,
    // fallback to returning active sportello_lavoro users so the UI can show
    // at least the currently active sportelli in the dropdown.
    if ((!users || users.length === 0) && req.user.role === 'responsabile_territoriale') {
      const fallback = await User.find({ role: 'sportello_lavoro', isActive: true })
        .select('-password')
        .sort({ createdAt: -1 });

      return res.json(fallback);
    }

    return res.json(users);
  } catch (error) {
    console.error("Get managed users error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createUser: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    if (!hasMinimumRole(req.user.role, "responsabile_territoriale")) {
      return res.status(403).json({ error: "Responsabile Territoriale access or higher required" });
    }

    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      organization, 
      role, 
      profitSharePercentage 
    } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    const currentUserLevel = ROLE_HIERARCHY[req.user.role as keyof typeof ROLE_HIERARCHY] || 0;
    const targetRoleLevel = ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] || 0;

    if (currentUserLevel <= targetRoleLevel) {
      return res.status(403).json({ 
        error: "You can only create users with roles below your current role" 
      });
    }

    if (req.user.role === "responsabile_territoriale" && role === "responsabile_territoriale") {
      return res.status(403).json({ 
        error: "Responsabile Territoriale cannot create other Responsabile Territoriale users" 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);

    const defaultProfitShares = {
      'super_admin': 0,
      'admin': 0,
      'responsabile_territoriale': 80,
      'sportello_lavoro': 40,
      'segnalatori': 20
    };

    let isApproved = false;
    let pendingApproval = false;

    if (hasMinimumRole(req.user.role, "admin")) {
      isApproved = true;
      pendingApproval = false;
    } else if (req.user.role === "responsabile_territoriale") {
      
      isApproved = false;
      pendingApproval = true;
    }

    
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      organization: organization || '',
      role: role || 'segnalatori',
      profitSharePercentage: profitSharePercentage || defaultProfitShares[role as keyof typeof defaultProfitShares] || 20,
      managedBy: req.user._id, 
      isActive: true,
      isApproved,
      pendingApproval
    });

    await newUser.save();

    const userResponse = newUser.toObject();
    const { password: _, ...userWithoutPassword } = userResponse;

    const message = pendingApproval 
      ? "User created successfully and is pending admin approval"
      : "User created successfully";

    return res.status(201).json({
      message,
      user: userWithoutPassword,
      pendingApproval
    });
  } catch (err: any) {
    console.error("Create user error:", err);
    
    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return res.status(400).json({ error: "Email already exists" });
      }
      if (err.keyPattern?.username) {
        return res.status(400).json({ error: "Username already exists" });
      }
    }
    
    return res.status(500).json({ error: "Server error" });
  }
};

export const getUserById: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    
    const user = await User.findById(id)
      .select("-password")
      .populate('approvedBy', 'username email');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!hasMinimumRole(req.user.role, "admin")) {
      if (user._id.toString() !== req.user._id.toString() && 
          !user.managedBy?.equals(req.user._id)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    return res.json(user);
  } catch (err: any) {
    console.error("Get user error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateUser: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const {
      username,
      email,
      firstName,
      lastName,
      organization,
      role,
      profitSharePercentage,
      isActive
    } = req.body;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!hasMinimumRole(req.user.role, "admin")) {
      if (user._id.toString() !== req.user._id.toString() && 
          !user.managedBy?.equals(req.user._id)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    if (role && role !== user.role) {
      const currentUserLevel = ROLE_HIERARCHY[req.user.role as keyof typeof ROLE_HIERARCHY] || 0;
      const targetRoleLevel = ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] || 0;
      const currentTargetLevel = ROLE_HIERARCHY[user.role as keyof typeof ROLE_HIERARCHY] || 0;

      if (currentUserLevel <= targetRoleLevel || currentUserLevel <= currentTargetLevel) {
        return res.status(403).json({ 
          error: "You can only modify users with roles below your current role" 
        });
      }

      if (req.user.role === "responsabile_territoriale" && role === "responsabile_territoriale") {
        return res.status(403).json({ 
          error: "Responsabile Territoriale cannot assign responsabile_territoriale role" 
        });
      }
    }

    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (organization !== undefined) user.organization = organization;
    if (role !== undefined) user.role = role;
    if (profitSharePercentage !== undefined) user.profitSharePercentage = profitSharePercentage;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const userResponse = user.toObject();
    const { password: _, ...userWithoutPassword } = userResponse;

    return res.json({
      message: "User updated successfully",
      user: userWithoutPassword
    });
  } catch (err: any) {
    console.error("Update user error:", err);
    
    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return res.status(400).json({ error: "Email already exists" });
      }
      if (err.keyPattern?.username) {
        return res.status(400).json({ error: "Username already exists" });
      }
    }
    
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteUser: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (req.user.role !== "super_admin") {
      if (user.role === "admin" || user.role === "super_admin") {
        return res.status(403).json({ error: "Only super administrators can delete admin users" });
      }
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    await user.deleteOne();

    return res.json({ message: "User deleted successfully" });
  } catch (err: any) {
    console.error("Delete user error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const changePassword: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const objectId = new mongoose.Types.ObjectId(id);

    if (!hasMinimumRole(req.user.role, "admin") && !req.user._id.equals(objectId)) {
      return res.status(403).json({ error: "You can only change your own password" });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!hasMinimumRole(req.user.role, "admin") || req.user._id.equals(objectId)) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const searchUsers: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Search query is required" });
    }

    let searchQuery = {};

    if (!hasMinimumRole(req.user.role, "admin")) {
      searchQuery = {
        $and: [
          { managedBy: req.user._id },
          {
            $or: [
              { username: { $regex: query, $options: 'i' } },
              { email: { $regex: query, $options: 'i' } },
              { firstName: { $regex: query, $options: 'i' } },
              { lastName: { $regex: query, $options: 'i' } }
            ]
          }
        ]
      };
    } else {
      searchQuery = {
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(searchQuery)
      .select('_id username email firstName lastName role')
      .limit(10); 

    return res.json(users);
  } catch (error) {
    console.error("Search users error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getResponsabiliMinimal: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!hasMinimumRole(req.user.role, "admin")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const users = await User.find({
      role: "responsabile_territoriale",
      isActive: { $ne: false }
    })
      .select("_id username firstName lastName email isActive")
      .sort({ createdAt: -1 });

    return res.json(users);
  } catch (err: any) {
    console.error("Get responsabili minimal error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
