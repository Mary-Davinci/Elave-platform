// src/services/agenteService.ts
import api from './api';
import { Agente, AgenteFormData } from '../types/interfaces';

// Get all agents
export const getAgenti = async (): Promise<Agente[]> => {
  try {
    const response = await api.get<Agente[]>('/api/agenti');
    return response.data;
  } catch (error) {
    console.error('Error fetching agenti:', error);
    throw error;
  }
};

// Get agent by id
export const getAgenteById = async (id: string): Promise<Agente> => {
  try {
    const response = await api.get<Agente>(`/api/agenti/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching agente with id ${id}:`, error);
    throw error;
  }
};

// Create a new agent
export const createAgente = async (agenteData: AgenteFormData): Promise<Agente> => {
  try {
    // Create FormData for file uploads
    const formData = new FormData();
    
    // Add text fields
    formData.append('businessName', agenteData.businessName?.trim() || '');
    formData.append('vatNumber', agenteData.vatNumber?.trim() || '');
    formData.append('address', agenteData.address?.trim() || '');
    formData.append('city', agenteData.city?.trim() || '');
    formData.append('postalCode', agenteData.postalCode?.trim() || '');
    formData.append('province', agenteData.province?.trim() || '');
    formData.append('agreedCommission', agenteData.agreedCommission?.toString() || '0');
    formData.append('email', agenteData.email?.trim() || '');
    formData.append('pec', agenteData.pec?.trim() || '');
    
    // Add files if they exist
    if (agenteData.signedContractFile) {
      formData.append('signedContractFile', agenteData.signedContractFile);
    }
    
    if (agenteData.legalDocumentFile) {
      formData.append('legalDocumentFile', agenteData.legalDocumentFile);
    }

    // Validate required fields
    if (!agenteData.businessName?.trim()) {
      throw new Error("Ragione Sociale is required");
    }

    if (!agenteData.vatNumber?.trim()) {
      throw new Error("Partita IVA is required");
    }

    if (!agenteData.address?.trim()) {
      throw new Error("Indirizzo is required");
    }

    if (!agenteData.city?.trim()) {
      throw new Error("Città is required");
    }

    if (!agenteData.postalCode?.trim()) {
      throw new Error("CAP is required");
    }

    if (!agenteData.province?.trim()) {
      throw new Error("Provincia is required");
    }

    if (!agenteData.agreedCommission || agenteData.agreedCommission <= 0) {
      throw new Error("Competenze concordate is required and must be greater than 0");
    }

    const response = await api.post<Agente>('/api/agenti', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating agente:', error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};

// Update agent
export const updateAgente = async (id: string, agenteData: Partial<AgenteFormData>): Promise<Agente> => {
  try {
    // Create FormData for file uploads
    const formData = new FormData();
    
    // Add text fields only if they exist
    if (agenteData.businessName !== undefined) {
      formData.append('businessName', agenteData.businessName?.trim() || '');
    }
    if (agenteData.vatNumber !== undefined) {
      formData.append('vatNumber', agenteData.vatNumber?.trim() || '');
    }
    if (agenteData.address !== undefined) {
      formData.append('address', agenteData.address?.trim() || '');
    }
    if (agenteData.city !== undefined) {
      formData.append('city', agenteData.city?.trim() || '');
    }
    if (agenteData.postalCode !== undefined) {
      formData.append('postalCode', agenteData.postalCode?.trim() || '');
    }
    if (agenteData.province !== undefined) {
      formData.append('province', agenteData.province?.trim() || '');
    }
    if (agenteData.agreedCommission !== undefined) {
      formData.append('agreedCommission', agenteData.agreedCommission?.toString() || '0');
    }
    if (agenteData.email !== undefined) {
      formData.append('email', agenteData.email?.trim() || '');
    }
    if (agenteData.pec !== undefined) {
      formData.append('pec', agenteData.pec?.trim() || '');
    }
    
    // Add files if they exist
    if (agenteData.signedContractFile) {
      formData.append('signedContractFile', agenteData.signedContractFile);
    }
    
    if (agenteData.legalDocumentFile) {
      formData.append('legalDocumentFile', agenteData.legalDocumentFile);
    }

    const response = await api.put<Agente>(`/api/agenti/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error(`Error updating agente with id ${id}:`, error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};

// Delete agent
export const deleteAgente = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/agenti/${id}`);
  } catch (error: any) {
    console.error(`Error deleting agente with id ${id}:`, error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};

/**
 * Upload agents from Excel file
 * @param formData The form data containing the Excel file
 * @returns Array of created agents
 */
export const uploadAgentiFromExcel = async (formData: FormData): Promise<Agente[]> => {
  try {
    console.log("Uploading Excel file for agenti...");
    
    // Debug FormData contents
    for (const pair of formData.entries()) {
      console.log(`FormData contains: ${pair[0]}, ${pair[1] instanceof File ? pair[1].name : pair[1]}`);
    }
    
    const response = await api.post<{
      message: string;
      agenti: Agente[];
      errors?: string[];
    }>('/api/agenti/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log("Upload response:", response.data);
    
    // Check if we have errors in the response
    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(response.data.errors.join(', '));
    }
    
    return response.data.agenti || [];
  } catch (error: any) {
    console.error('Error uploading agenti from Excel:', error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};