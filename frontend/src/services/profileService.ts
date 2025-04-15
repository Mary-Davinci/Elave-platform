import api from './api';

interface ProfileData {
  _id: string;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
}

/**
 * Fetches the user profile data from the backend
 * @returns Promise with the profile data
 */
export const getProfileData = async (): Promise<ProfileData> => {
  try {
    const response = await api.get('/api/dashboard/profile');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching profile data:', error);
    throw error;
  }
};