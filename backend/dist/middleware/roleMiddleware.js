"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasMinimumRole = exports.ROLE_HIERARCHY = exports.viewUtilitiesOnlyMiddleware = exports.approvedUserMiddleware = exports.userCreationMiddleware = exports.superAdminRoleMiddleware = exports.adminRoleMiddleware = exports.responsabileTerritorialeMiddleware = exports.sportelloLavoroRoleMiddleware = exports.segnalaториRoleMiddleware = void 0;
const ROLE_HIERARCHY = {
    "segnalatori": 1,
    "sportello_lavoro": 2,
    "responsabile_territoriale": 3,
    "admin": 4,
    "super_admin": 5
};
exports.ROLE_HIERARCHY = ROLE_HIERARCHY;
const hasMinimumRole = (userRole, requiredRole) => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
};
exports.hasMinimumRole = hasMinimumRole;
const segnalaториRoleMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    if (hasMinimumRole(req.user.role, "segnalatori")) {
        next();
    }
    else {
        return res.status(403).json({ message: "Access denied, insufficient permissions" });
    }
};
exports.segnalaториRoleMiddleware = segnalaториRoleMiddleware;
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
const userCreationMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    if (!hasMinimumRole(req.user.role, "responsabile_territoriale")) {
        return res.status(403).json({
            message: "Access denied, requires responsabile_territoriale role or higher to create users"
        });
    }
    if (req.body && req.body.role) {
        const currentUserLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const targetRoleLevel = ROLE_HIERARCHY[req.body.role] || 0;
        if (currentUserLevel <= targetRoleLevel) {
            return res.status(403).json({
                message: "You can only create users with roles below your current role"
            });
        }
        if (req.user.role === "responsabile_territoriale" && req.body.role === "responsabile_territoriale") {
            return res.status(403).json({
                message: "Responsabile Territoriale cannot create other Responsabile Territoriale users"
            });
        }
    }
    next();
};
exports.userCreationMiddleware = userCreationMiddleware;
const approvedUserMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    if (req.user.role === "admin" || req.user.role === "super_admin") {
        return next();
    }
    if (!req.user.isApproved) {
        return res.status(403).json({
            message: "Your account is pending approval. Please contact an administrator."
        });
    }
    next();
};
exports.approvedUserMiddleware = approvedUserMiddleware;
const viewUtilitiesOnlyMiddleware = (req, res, next) => {
    if (req.method === 'GET') {
        return next();
    }
    if (req.user && hasMinimumRole(req.user.role, "admin")) {
        return next();
    }
    return res.status(403).json({ message: "You can only view utilities, not modify them. Admin role required for modifications." });
};
exports.viewUtilitiesOnlyMiddleware = viewUtilitiesOnlyMiddleware;
//# sourceMappingURL=roleMiddleware.js.map