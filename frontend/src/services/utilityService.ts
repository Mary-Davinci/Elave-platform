// src/services/utilityService.ts
import api from './api';

export const getUtilities = async () => {
  try {
    const response = await api.get('/api/utilities');
    return response.data;
  } catch (error) {
    console.error('Error fetching utilities:', error);
    throw error;
  }
};