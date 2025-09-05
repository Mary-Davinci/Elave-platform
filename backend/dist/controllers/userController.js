"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = exports.changePassword = exports.deleteUser = exports.updateUser = exports.getUserById = exports.createUser = exports.getManagedUsers = exports.rejectUser = exports.approveUser = exports.getPendingUsers = exports.getUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const ROLE_HIERARCHY = {
    "segnalatori": 1,
    "sportello_lavoro": 2,
    "responsabile_territoriale": 3,
    "admin": 4,
    "super_admin": 5
};
const hasMinimumRole = (userRole, requiredRole) => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
};
const getUsers = async (req, res) => {
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
        const users = await User_1.default.find(query)
            .select("-password")
            .populate('approvedBy', 'username email')
            .sort({ createdAt: -1 });
        return res.json(users);
    }
    catch (err) {
        console.error("Get users error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getUsers = getUsers;
const getPendingUsers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!hasMinimumRole(req.user.role, "admin")) {
            return res.status(403).json({ error: "Admin access required" });
        }
        const pendingUsers = await User_1.default.find({
            pendingApproval: true,
            isApproved: false
        })
            .select("-password")
            .populate('managedBy', 'username email role')
            .sort({ createdAt: -1 });
        return res.json(pendingUsers);
    }
    catch (err) {
        console.error("Get pending users error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getPendingUsers = getPendingUsers;
const approveUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!hasMinimumRole(req.user.role, "admin")) {
            return res.status(403).json({ error: "Admin access required" });
        }
        const { id } = req.params;
        const user = await User_1.default.findById(id);
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
    }
    catch (err) {
        console.error("Approve user error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.approveUser = approveUser;
const rejectUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!hasMinimumRole(req.user.role, "admin")) {
            return res.status(403).json({ error: "Admin access required" });
        }
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (!user.pendingApproval) {
            return res.status(400).json({ error: "User is not pending approval" });
        }
        await user.deleteOne();
        return res.json({ message: "User rejected and deleted successfully" });
    }
    catch (err) {
        console.error("Reject user error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.rejectUser = rejectUser;
const getManagedUsers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (hasMinimumRole(req.user.role, "admin")) {
            const users = await User_1.default.find()
                .select('-password')
                .sort({ createdAt: -1 });
            return res.json(users);
        }
        const users = await User_1.default.find({ managedBy: req.user._id })
            .select('-password')
            .sort({ createdAt: -1 });
        return res.json(users);
    }
    catch (error) {
        console.error("Get managed users error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getManagedUsers = getManagedUsers;
const createUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!hasMinimumRole(req.user.role, "responsabile_territoriale")) {
            return res.status(403).json({ error: "Responsabile Territoriale access or higher required" });
        }
        const { username, email, password, firstName, lastName, organization, role, profitSharePercentage } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Username, email, and password are required" });
        }
        const currentUserLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const targetRoleLevel = ROLE_HIERARCHY[role] || 0;
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
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
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
        }
        else if (req.user.role === "responsabile_territoriale") {
            isApproved = false;
            pendingApproval = true;
        }
        const newUser = new User_1.default({
            username,
            email,
            password: hashedPassword,
            firstName: firstName || '',
            lastName: lastName || '',
            organization: organization || '',
            role: role || 'segnalatori',
            profitSharePercentage: profitSharePercentage || defaultProfitShares[role] || 20,
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
    }
    catch (err) {
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
exports.createUser = createUser;
const getUserById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const user = await User_1.default.findById(id)
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
    }
    catch (err) {
        console.error("Get user error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getUserById = getUserById;
const updateUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const { username, email, firstName, lastName, organization, role, profitSharePercentage, isActive } = req.body;
        const user = await User_1.default.findById(id);
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
            const currentUserLevel = ROLE_HIERARCHY[req.user.role] || 0;
            const targetRoleLevel = ROLE_HIERARCHY[role] || 0;
            const currentTargetLevel = ROLE_HIERARCHY[user.role] || 0;
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
        if (username !== undefined)
            user.username = username;
        if (email !== undefined)
            user.email = email;
        if (firstName !== undefined)
            user.firstName = firstName;
        if (lastName !== undefined)
            user.lastName = lastName;
        if (organization !== undefined)
            user.organization = organization;
        if (role !== undefined)
            user.role = role;
        if (profitSharePercentage !== undefined)
            user.profitSharePercentage = profitSharePercentage;
        if (isActive !== undefined)
            user.isActive = isActive;
        await user.save();
        const userResponse = user.toObject();
        const { password: _, ...userWithoutPassword } = userResponse;
        return res.json({
            message: "User updated successfully",
            user: userWithoutPassword
        });
    }
    catch (err) {
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
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (req.user.role !== "super_admin") {
            return res.status(403).json({ error: "Only super administrators can delete users" });
        }
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: "You cannot delete your own account" });
        }
        await user.deleteOne();
        return res.json({ message: "User deleted successfully" });
    }
    catch (err) {
        console.error("Delete user error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteUser = deleteUser;
const changePassword = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        const objectId = new mongoose_1.default.Types.ObjectId(id);
        if (!hasMinimumRole(req.user.role, "admin") && !req.user._id.equals(objectId)) {
            return res.status(403).json({ error: "You can only change your own password" });
        }
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (!hasMinimumRole(req.user.role, "admin") || req.user._id.equals(objectId)) {
            const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Current password is incorrect" });
            }
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        return res.json({ message: "Password updated successfully" });
    }
    catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.changePassword = changePassword;
const searchUsers = async (req, res) => {
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
        }
        else {
            searchQuery = {
                $or: [
                    { username: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } },
                    { firstName: { $regex: query, $options: 'i' } },
                    { lastName: { $regex: query, $options: 'i' } }
                ]
            };
        }
        const users = await User_1.default.find(searchQuery)
            .select('_id username email firstName lastName role')
            .limit(10);
        return res.json(users);
    }
    catch (error) {
        console.error("Search users error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.searchUsers = searchUsers;
//# sourceMappingURL=userController.js.map