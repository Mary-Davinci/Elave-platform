"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = exports.getCurrentUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const generateToken_1 = require("../utils/generateToken");
const getCurrentUser = async (req, res) => {
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
    }
    catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getCurrentUser = getCurrentUser;
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = new User_1.default({ username, email, password: hashedPassword });
        await newUser.save();
        return res.status(201).json({ message: "User registered successfully" });
    }
    catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.register = register;
// Update this function in src/controllers/authController.ts
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid password" });
        }
        const token = (0, generateToken_1.generateToken)(user._id.toString());
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
            user: userData // Send user data along with the token
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.login = login;
//# sourceMappingURL=authController.js.map