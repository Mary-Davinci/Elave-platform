import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { generateToken } from "../utils/generateToken";
import { CustomRequestHandler } from "../types/express";

export const getCurrentUser: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    return res.json({
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName || "",
      lastName: req.user.lastName || "",
      organization: req.user.organization || "",
      role: req.user.role
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
export const register: CustomRequestHandler = async (req, res) => {
  try {
    const { username, email, password } = req.body;

  
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });

    await newUser.save();
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Update this function in src/controllers/authController.ts
export const login: CustomRequestHandler = async (req, res) => {
  
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = generateToken(user._id.toString());
    
    // Include user data with the token response
    const userData = {
      _id: user._id,
      username: user.username, // This is the actual username from registration
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      organization: user.organization || "",
      role: user.role || "user"
    };
    // Add this logging in your login controller:
console.log("Login response sending user data:", {
  _id: user._id,
  username: user.username,
  email: user.email
});
    
    
    return res.json({ 
      token,
      user: userData  // Send user data along with the token
      
    }
  );

    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};