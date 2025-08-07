import { Request, Response, NextFunction } from "express";
import { CustomRequestHandler } from "../types/express";

const ROLE_HIERARCHY = {
  "segnalatori": 1,
  "sportello_lavoro": 2,
  "responsabile_territoriale": 3,
  "admin": 4,
  "super_admin": 5
} as const;


const hasMinimumRole = (userRole: string, requiredRole: string): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0;
  return userLevel >= requiredLevel;
};

export const segnalaториRoleMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (hasMinimumRole(req.user.role, "segnalatori")) {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, insufficient permissions" });
  }
};

export const sportelloLavoroRoleMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (hasMinimumRole(req.user.role, "sportello_lavoro")) {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, requires sportello_lavoro role or higher" });
  }
};

export const responsabileTerritorialeMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (hasMinimumRole(req.user.role, "responsabile_territoriale")) {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, requires responsabile_territoriale role or higher" });
  }
};
export const adminRoleMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (hasMinimumRole(req.user.role, "admin")) {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, requires admin role or higher" });
  }
};

export const superAdminRoleMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (req.user.role === "super_admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, requires super_admin role" });
  }
};

export const userCreationMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!hasMinimumRole(req.user.role, "responsabile_territoriale")) {
    return res.status(403).json({ 
      message: "Access denied, requires responsabile_territoriale role or higher to create users" 
    });
  }

  if (req.body && req.body.role) {
    const currentUserLevel = ROLE_HIERARCHY[req.user.role as keyof typeof ROLE_HIERARCHY] || 0;
    const targetRoleLevel = ROLE_HIERARCHY[req.body.role as keyof typeof ROLE_HIERARCHY] || 0;

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

export const approvedUserMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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


export const viewUtilitiesOnlyMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  
  if (req.method === 'GET') {
    return next();
  }
  

  if (req.user && hasMinimumRole(req.user.role, "admin")) {
    return next();
  }
  
  return res.status(403).json({ message: "You can only view utilities, not modify them. Admin role required for modifications." });
};

export { ROLE_HIERARCHY, hasMinimumRole };