// src/controllers/editpassword.ts
import { Request, Response } from 'express';
import User from '../models/User';
import * as crypto from 'crypto';

/**
 * Change user password
 * @param req Express request with currentPassword, newPassword
 * @param res Express response
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get user from request (added by auth middleware)
    const user = (req as any).user;
    
    // Check if user exists
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }
    
    // Get current and new password from request body
    const { currentPassword, newPassword } = req.body;
    
    // Validate inputs
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
      return;
    }
    
    // Find user in database
    const userFromDb = await User.findById(user._id);
    
    if (!userFromDb) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    // OPTION 2: If you're using a different password hashing method
    // This is an example using crypto - replace with your actual password verification logic
    const hash = crypto.createHash('sha256').update(currentPassword).digest('hex');
    const isMatch = (hash === userFromDb.password);
    
    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }
    
    // Validate new password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include uppercase, lowercase, and number'
      });
      return;
    }
    
    // Using crypto as an example - replace with your actual password hashing
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
    
    // Update user password
    userFromDb.password = hashedPassword;
    await userFromDb.save();
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error: any) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change',
      error: error.message || 'Unknown error'
    });
  }
};

// Export both as named export and default export
export default { changePassword };