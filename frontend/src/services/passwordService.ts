// src/services/passwordService.ts
import api from './api';

/**
 * Change user password
 * @param currentPassword The current password
 * @param newPassword The new password
 * @returns Promise with the response data
 */
export const changePassword = async (
  currentPassword: string, 
  newPassword: string
): Promise<{success: boolean; message: string}> => {
  try {
    const response = await api.post('/api/user/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  } catch (error: any) {
    // Extract error message from API response if available
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message || 'Failed to change password');
    }
    throw error;
  }
};