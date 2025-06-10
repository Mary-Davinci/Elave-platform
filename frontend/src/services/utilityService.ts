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

export const uploadUtility = async (formData: FormData) => {
  try {
    const response = await api.post('/api/utilities/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading utility:', error);
    throw error;
  }
};

export const addUtility = async (utilityData: {
  name: string;
  fileUrl: string;
  type: 'form' | 'faq' | 'manual' | 'document' | 'spreadsheet' | 'other';
  isPublic?: boolean;
}) => {
  try {
    const response = await api.post('/api/utilities', utilityData);
    return response.data;
  } catch (error) {
    console.error('Error adding utility:', error);
    throw error;
  }
};

export const deleteUtility = async (utilityId: string) => {
  try {
    const response = await api.delete(`/api/utilities/${utilityId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting utility:', error);
    throw error;
  }
};

export const downloadUtility = async (utilityId: string) => {
  try {
    const response = await api.get(`/api/utilities/${utilityId}/download`);
    return response.data;
  } catch (error) {
    console.error('Error downloading utility:', error);
    throw error;
  }
};

// Helper function to get suggested type based on filename
export const getSuggestedType = (filename: string): 'form' | 'faq' | 'manual' | 'document' | 'spreadsheet' | 'other' => {
  const extension = filename.toLowerCase().split('.').pop();
  const lowerName = filename.toLowerCase();

  // Check filename for keywords
  if (lowerName.includes('form') || lowerName.includes('application')) {
    return 'form';
  }
  if (lowerName.includes('faq') || lowerName.includes('question')) {
    return 'faq';
  }
  if (lowerName.includes('manual') || lowerName.includes('guide') || lowerName.includes('instruction')) {
    return 'manual';
  }

  // Check by extension
  switch (extension) {
    case 'xls':
    case 'xlsx':
      return 'spreadsheet';
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
      return 'document';
    default:
      return 'other';
  }
};