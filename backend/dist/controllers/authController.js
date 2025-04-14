"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_1 = __importDefault(require("../models/user"));
const generateToken_1 = require("../utils/generateToken");
// Properly typed RequestHandler that doesn't return the response object
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await user_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ error: "Email already in use" });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = new user_1.default({ username, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Server error" });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await user_1.default.findOne({ email });
        if (!user) {
            res.status(400).json({ error: "User not found" });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ error: "Invalid password" });
            return;
        }
        const token = (0, generateToken_1.generateToken)(user._id.toString());
        res.json({ token });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error" });
    }
};
exports.login = login;
//# sourceMappingURL=authController.js.map