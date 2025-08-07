import { Request, Response } from 'express';

/**
 * Gets the user profile data
 * @param req Express request
 * @param res Express response
 */
export const getProfileData = (req: Request, res: Response): void => {
  try {
    
    const user = (req as any).user;
    
 
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }
    
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