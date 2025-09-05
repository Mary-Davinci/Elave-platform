"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminMiddleware = exports.adminMiddleware = exports.authWithApprovalMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authMiddleware = async (req, res, next) => {
    try {
        const rawAuthHeader = req.header("Authorization");
        console.log("Authorization header received:", rawAuthHeader);
        const token = rawAuthHeader?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ message: "No authentication token, access denied" });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const user = await User_1.default.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(401).json({ message: "Token is valid but user not found" });
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({ message: "Token is not valid" });
    }
};
exports.authMiddleware = authMiddleware;
const authWithApprovalMiddleware = async (req, res, next) => {
    try {
        const rawAuthHeader = req.header("Authorization");
        const token = rawAuthHeader?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ message: "No authentication token, access denied" });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const user = await User_1.default.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(401).json({ message: "Token is valid but user not found" });
        }
        if (!["admin", "super_admin"].includes(user.role) && !user.isApproved) {
            return res.status(403).json({
                message: "Your account is pending approval. Please contact an administrator.",
                pendingApproval: true
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error("Auth with approval middleware error:", error);
        return res.status(401).json({ message: "Token is not valid" });
    }
};
exports.authWithApprovalMiddleware = authWithApprovalMiddleware;
const adminMiddleware = (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.role === "super_admin")) {
        next();
    }
    else {
        return res.status(403).json({ message: "Access denied, admin role or higher required" });
    }
};
exports.adminMiddleware = adminMiddleware;
const superAdminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === "super_admin") {
        next();
    }
    else {
        return res.status(403).json({ message: "Access denied, super_admin role required" });
    }
};
exports.superAdminMiddleware = superAdminMiddleware;
//# sourceMappingURL=authMiddleware.js.map