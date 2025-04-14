// src/controllers/userController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User";
import { CustomRequestHandler } from "../types/express";

// Get all users (admin only)
export const getUsers: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    return res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get all users managed by the current user
export const getManagedUsers: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // If admin, return all users
    if (req.user.role === 'admin') {
      const users = await User.find()
        .select('-password')
        .sort({ createdAt: -1 });
      return res.json(users);
    }

    // For non-admin users, return only users they manage
    const users = await User.find({ managedBy: req.user._id })
      .select('-password')
      .sort({ createdAt: -1 });

    return res.json(users);
  } catch (error) {
    console.error("Get managed users error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Create a new user (admin only)
export const createUser: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { username, email, password, firstName, lastName, organization, role } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      organization: organization || '',
      role: role || 'user',
      managedBy: req.user._id // Set the current admin as the manager
    });

    await newUser.save();
    
    // Create a new object without the password
    const userResponse = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      organization: newUser.organization,
      role: newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    return res.status(201).json(userResponse);
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get a single user by ID
export const getUserById: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    
    // Convert string ID to ObjectId
    const objectId = new mongoose.Types.ObjectId(id);

    // Admins can view any user
    if (req.user.role !== 'admin') {
      // Non-admins can only view themselves or users they manage
      if (!req.user._id.equals(objectId) && !(req.user.manages && req.user.manages.some(managedId => managedId.equals(objectId)))) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Update a user
export const updateUser: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const { username, email, firstName, lastName, organization, role } = req.body;

    // Convert string ID to ObjectId
    const objectId = new mongoose.Types.ObjectId(id);

    // For non-admin users, they can only update their own profile
    if (req.user.role !== 'admin' && !req.user._id.equals(objectId)) {
      return res.status(403).json({ error: "You can only update your own profile" });
    }

    // Get the user to update
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (organization !== undefined) user.organization = organization;
    
    // Only admins can change roles
    if (role && req.user.role === 'admin') {
      user.role = role;
    }

    await user.save();
    
    // Create a new object without the password
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organization: user.organization,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return res.json(userResponse);
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Delete a user (admin only)
export const deleteUser: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    // Convert string ID to ObjectId
    const objectId = new mongoose.Types.ObjectId(id);

    // Make sure admins can't delete themselves
    if (req.user._id.equals(objectId)) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await user.deleteOne();

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Change user password
export const changePassword: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Convert string ID to ObjectId
    const objectId = new mongoose.Types.ObjectId(id);

    // Only admins can change other users' passwords without current password
    if (req.user.role !== 'admin' && !req.user._id.equals(objectId)) {
      return res.status(403).json({ error: "You can only change your own password" });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If not admin and changing own password, verify current password
    if (req.user.role !== 'admin' || req.user._id.equals(objectId)) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
    }

    // Hash the new password
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

    // Search by username, email, first name, or last name
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } }
      ]
    })
    .select('_id username email firstName lastName')
    .limit(10); // Limit results for performance

    return res.json(users);
  } catch (error) {
    console.error("Search users error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};