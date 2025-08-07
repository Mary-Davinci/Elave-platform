"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasMinimumRole = exports.ROLE_HIERARCHY = exports.viewUtilitiesOnlyMiddleware = exports.approvedUserMiddleware = exports.userCreationMiddleware = exports.superAdminRoleMiddleware = exports.adminRoleMiddleware = exports.responsabileTerritorialeMiddleware = exports.sportelloLavoroRoleMiddleware = exports.segnalaториRoleMiddleware = void 0;
// Define role hierarchy (higher number = higher permissions)
const ROLE_HIERARCHY = {
    "segnalatori": 1,
    "sportello_lavoro": 2,
    "responsabile_territoriale": 3,
    "admin": 4,
    "super_admin": 5
};
exports.ROLE_HIERARCHY = ROLE_HIERARCHY;
// Helper function to check if user has minimum required role level
const hasMinimumRole = (userRole, requiredRole) => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
};
exports.hasMinimumRole = hasMinimumRole;
// Middleware to check if user has "segnalatori" role or higher (all roles)
const segnalaториRoleMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    // Any authenticated user can access this route
    if (hasMinimumRole(req.user.role, "segnalatori")) {
        next();
    }
    else {
        return res.status(403).json({ message: "Access denied, insufficient permissions" });
    }
};
exports.segnalaториRoleMiddleware = segnalaториRoleMiddleware;
// Middleware to check if user has "sportello_lavoro" role or higher
const sportelloLavoroRoleMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    if (hasMinimumRole(req.user.role, "sportello_lavoro")) {
        next();
    }
    else {
        return res.status(403).json({ message: "Access denied, requires sportello_lavoro role or higher" });
    }
};
exports.sportelloLavoroRoleMiddleware = sportelloLavoroRoleMiddleware;
// Middleware to check if user has "responsabile_territoriale" role or higher
const responsabileTerritorialeMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    if (hasMinimumRole(req.user.role, "responsabile_territoriale")) {
        next();
    }
    else {
        return res.status(403).json({ message: "Access denied, requires responsabile_territoriale role or higher" });
    }
};
exports.responsabileTerritorialeMiddleware = responsabileTerritorialeMiddleware;
// Middleware to check if user has "admin" role or higher
const adminRoleMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    if (hasMinimumRole(req.user.role, "admin")) {
        next();
    }
    else {
        return res.status(403).json({ message: "Access denied, requires admin role or higher" });
    }
};
exports.adminRoleMiddleware = adminRoleMiddleware;
// Middleware to check if user has "super_admin" role (highest level)
const superAdminRoleMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    if (req.user.role === "super_admin") {
        next();
    }
    else {
        return res.status(403).json({ message: "Access denied, requires super_admin role" });
    }
};
exports.superAdminRoleMiddleware = superAdminRoleMiddleware;
// NEW: Middleware to check if user can create users with specific role restrictions
const userCreationMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    // Must be at least responsabile_territoriale to create users
    if (!hasMinimumRole(req.user.role, "responsabile_territoriale")) {
        return res.status(403).json({
            message: "Access denied, requires responsabile_territoriale role or higher to create users"
        });
    }
    // If creating a user, check role restrictions in the request body
    if (req.body && req.body.role) {
        const currentUserLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const targetRoleLevel = ROLE_HIERARCHY[req.body.role] || 0;
        // Users can only create roles BELOW their level (not equal to their level)
        if (currentUserLevel <= targetRoleLevel) {
            return res.status(403).json({
                message: "You can only create users with roles below your current role"
            });
        }
        // SPECIAL RESTRICTION: responsabile_territoriale cannot create other responsabile_territoriale
        if (req.user.role === "responsabile_territoriale" && req.body.role === "responsabile_territoriale") {
            return res.status(403).json({
                message: "Responsabile Territoriale cannot create other Responsabile Territoriale users"
            });
        }
    }
    next();
};
exports.userCreationMiddleware = userCreationMiddleware;
// NEW: Middleware to check if user is approved (for non-admin/super_admin users)
const approvedUserMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    // Admin and super_admin are always considered approved
    if (req.user.role === "admin" || req.user.role === "super_admin") {
        return next();
    }
    // Check if user is approved
    if (!req.user.isApproved) {
        return res.status(403).json({
            message: "Your account is pending approval. Please contact an administrator."
        });
    }
    next();
};
exports.approvedUserMiddleware = approvedUserMiddleware;
// Middleware to check if user can only view utilities (no modification)
// Only admin and super_admin can modify, others can only view
const viewUtilitiesOnlyMiddleware = (req, res, next) => {
    // If it's a GET request, allow it for all authenticated users
    if (req.method === 'GET') {
        return next();
    }
    // For non-GET requests, only admin or super_admin can proceed
    if (req.user && hasMinimumRole(req.user.role, "admin")) {
        return next();
    }
    return res.status(403).json({ message: "You can only view utilities, not modify them. Admin role required for modifications." });
};
exports.viewUtilitiesOnlyMiddleware = viewUtilitiesOnlyMiddleware;
//# sourceMappingURL=roleMiddleware.js.map