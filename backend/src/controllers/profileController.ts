// src/controllers/profileController.ts
import { Request, Response } from 'express';

/**
 * Gets the user profile data
 * @param req Express request
 * @param res Express response
 */
export const getProfileData = (req: Request, res: Response): void => {
  try {
    // Need to type-cast req to include the user property added by auth middleware
    const user = (req as any).user;
    
    // Check if user exists in the request (set by auth middleware)
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }
    
    // Return the user profile data
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'user',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        organization: user.organization || '',
        // Add any other profile data you want to include
      }
    });
  } catch (error: any) {
    console.error('Error fetching profile data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile data',
      error: error.message || 'Unknown error'
    });
  }
};