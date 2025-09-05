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
        const { username, email, password, role } = req.body;
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }
        const validRoles = ["super_admin", "admin", "responsabile_territoriale", "sportello_lavoro", "segnalatori"];
        const userRole = role && validRoles.includes(role) ? role : "segnalatori";
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = new User_1.default({
            username,
            email,
            password: hashedPassword,
            role: userRole
        });
        await newUser.save();
        return res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.register = register;
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
        const userData = {
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            organization: user.organization || "",
            role: user.role || "segnalatori"
        };
        console.log("Login response sending user data:", {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        });
        return res.json({
            token,
            user: userData
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.login = login;
//# sourceMappingURL=authController.js.map