import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { CustomRequestHandler } from "../types/express";

export const authMiddleware: CustomRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      return res.status(401).json({ message: "Token is valid but user not found" });
    }
    
    req.user = user;
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

export const authWithApprovalMiddleware: CustomRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const user = await User.findById(decoded.userId).select("-password");
    
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
  } catch (error) {
    console.error("Auth with approval middleware error:", error);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

export const adminMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "super_admin")) {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, admin role or higher required" });
  }
};

export const superAdminMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user && req.user.role === "super_admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, super_admin role required" });
  }
};