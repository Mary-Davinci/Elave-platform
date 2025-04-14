// src/middleware/authMiddleware.ts
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
    // Get the token from the header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No authentication token, access denied" });
    }

    // Verify the token
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    
    // Get the user from the database
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      return res.status(401).json({ message: "Token is valid but user not found" });
    }
    
    // Attach the user to the request
    req.user = user;
    
    // Continue
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

// Admin authorization middleware
export const adminMiddleware: CustomRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied, admin role required" });
  }
};