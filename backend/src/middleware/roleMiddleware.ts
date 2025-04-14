// src/middleware/roleMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { CustomRequestHandler } from "../types/express";

// Middleware to check if user has "user" role or higher (user, attuatore, admin)
export const userRoleMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  // Any role can access this route
  if (["user", "attuatore", "admin"].includes(req.user.role)) {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, insufficient permissions" });
  }
};

// Middleware to check if user can only view utilities (no modification)
export const viewUtilitiesOnlyMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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