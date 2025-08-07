"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = exports.changePassword = exports.deleteUser = exports.updateUser = exports.getUserById = exports.createUser = exports.getManagedUsers = exports.rejectUser = exports.approveUser = exports.getPendingUsers = exports.getUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
    "segnalatori": 1,
    "sportello_lavoro": 2,
    "responsabile_territoriale": 3,
    "admin": 4,
    "super_admin": 5
};
// Helper function to check if user has minimum required role level
const hasMinimumRole = (userRole, requiredRole) => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
};
// Get all users (including pending approval users for admins)
const getUsers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Check if user has admin privileges
        if (!hasMinimumRole(req.user.role, "admin")) {
            return res.status(403).json({ error: "Admin access required" });
        }
        let query = {};
        // If not admin or super_admin, apply data filtering
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
// NEW: Get pending approval users (Admin/Super Admin only)
const getPendingUsers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admin and super_admin can see pending users
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
// NEW: Approve a pending user
const approveUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admin and super_admin can approve users
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
        // Approve the user
        user.isApproved = true;
        user.pendingApproval = false;
        user.approvedBy = req.user._id;
        user.approvedAt = new Date();
        await user.save();
        // Remove password from response
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
// NEW: Reject a pending user
const rejectUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Only admin and super_admin can reject users
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
        // Delete the rejected user
        await user.deleteOne();
        return res.json({ message: "User rejected and deleted successfully" });
    }
    catch (err) {
        console.error("Reject user error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.rejectUser = rejectUser;
// Get all users managed by the current user
const getManagedUsers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // If admin or above, return all users
        if (hasMinimumRole(req.user.role, "admin")) {
            const users = await User_1.default.find()
                .select('-password')
                .sort({ createdAt: -1 });
            return res.json(users);
        }
        // For lower level users, return only users they manage
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
// UPDATED: Create new user with approval logic
const createUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Check if user has at least responsabile_territoriale privileges for user creation
        if (!hasMinimumRole(req.user.role, "responsabile_territoriale")) {
            return res.status(403).json({ error: "Responsabile Territoriale access or higher required" });
        }
        const { username, email, password, firstName, lastName, organization, role, profitSharePercentage } = req.body;
        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Username, email, and password are required" });
        }
        // UPDATED: Enhanced role creation restrictions
        const currentUserLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const targetRoleLevel = ROLE_HIERARCHY[role] || 0;
        // Users can only create roles BELOW their level (not equal to their level)
        if (currentUserLevel <= targetRoleLevel) {
            return res.status(403).json({
                error: "You can only create users with roles below your current role"
            });
        }
        // SPECIAL RESTRICTION: responsabile_territoriale cannot create other responsabile_territoriale
        if (req.user.role === "responsabile_territoriale" && role === "responsabile_territoriale") {
            return res.status(403).json({
                error: "Responsabile Territoriale cannot create other Responsabile Territoriale users"
            });
        }
        // Check if email already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Set default profit share based on role
        const defaultProfitShares = {
            'super_admin': 0,
            'admin': 0,
            'responsabile_territoriale': 80,
            'sportello_lavoro': 40,
            'segnalatori': 20
        };
        // UPDATED: Determine approval status based on creator role
        let isApproved = false;
        let pendingApproval = false;
        if (hasMinimumRole(req.user.role, "admin")) {
            // Admin and super_admin can approve directly
            isApproved = true;
            pendingApproval = false;
        }
        else if (req.user.role === "responsabile_territoriale") {
            // responsabile_territoriale creates users that need approval
            isApproved = false;
            pendingApproval = true;
        }
        // Create new user
        const newUser = new User_1.default({
            username,
            email,
            password: hashedPassword,
            firstName: firstName || '',
            lastName: lastName || '',
            organization: organization || '',
            role: role || 'segnalatori',
            profitSharePercentage: profitSharePercentage || defaultProfitShares[role] || 20,
            managedBy: req.user._id, // Set current user as manager
            isActive: true,
            isApproved,
            pendingApproval
        });
        await newUser.save();
        // Remove password from response
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
// Get single user by ID
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
        // Check if current user can access this user
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
// Update user
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
        // Check permissions
        if (!hasMinimumRole(req.user.role, "admin")) {
            if (user._id.toString() !== req.user._id.toString() &&
                !user.managedBy?.equals(req.user._id)) {
                return res.status(403).json({ error: "Access denied" });
            }
        }
        // If updating role, check permissions
        if (role && role !== user.role) {
            const currentUserLevel = ROLE_HIERARCHY[req.user.role] || 0;
            const targetRoleLevel = ROLE_HIERARCHY[role] || 0;
            const currentTargetLevel = ROLE_HIERARCHY[user.role] || 0;
            // Users can only modify roles BELOW their level (not equal to their level)
            if (currentUserLevel <= targetRoleLevel || currentUserLevel <= currentTargetLevel) {
                return res.status(403).json({
                    error: "You can only modify users with roles below your current role"
                });
            }
            // SPECIAL RESTRICTION: responsabile_territoriale cannot change users to responsabile_territoriale
            if (req.user.role === "responsabile_territoriale" && role === "responsabile_territoriale") {
                return res.status(403).json({
                    error: "Responsabile Territoriale cannot assign responsabile_territoriale role"
                });
            }
        }
        // Update fields
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
        // Remove password from response
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
// Delete user
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
        // Only super_admin can delete users
        if (req.user.role !== "super_admin") {
            return res.status(403).json({ error: "Only super administrators can delete users" });
        }
        // Prevent deleting yourself
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
// Change user password
const changePassword = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        // Convert string ID to ObjectId
        const objectId = new mongoose_1.default.Types.ObjectId(id);
        // Only admins can change other users' passwords without current password
        if (!hasMinimumRole(req.user.role, "admin") && !req.user._id.equals(objectId)) {
            return res.status(403).json({ error: "You can only change your own password" });
        }
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        // If not admin and changing own password, verify current password
        if (!hasMinimumRole(req.user.role, "admin") || req.user._id.equals(objectId)) {
            const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Current password is incorrect" });
            }
        }
        // Hash the new password
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
        // If not admin or above, limit search to managed users
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
            // Admin can search all users
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
            .limit(10); // Limit results for performance
        return res.json(users);
    }
    catch (error) {
        console.error("Search users error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.searchUsers = searchUsers;
//# sourceMappingURL=userController.js.map