"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewUtilitiesOnlyMiddleware = exports.userRoleMiddleware = void 0;
// Middleware to check if user has "user" role or higher (user, attuatore, admin)
const userRoleMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    // Any role can access this route
    if (["user", "attuatore", "admin"].includes(req.user.role)) {
        next();
    }
    else {
        return res.status(403).json({ message: "Access denied, insufficient permissions" });
    }
};
exports.userRoleMiddleware = userRoleMiddleware;
// Middleware to check if user can only view utilities (no modification)
const viewUtilitiesOnlyMiddleware = (req, res, next) => {
    // If it's a GET request, allow it
    if (req.method === 'GET') {
        return next();
    }
    // For non-GET requests, only admin can proceed
    if (req.user && req.user.role === "admin") {
        return next();
    }
    return res.status(403).json({ message: "You can only view utilities, not modify them" });
};
exports.viewUtilitiesOnlyMiddleware = viewUtilitiesOnlyMiddleware;
//# sourceMappingURL=roleMiddleware.js.map