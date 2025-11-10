// src/services/sportelloLavoroService.ts
import { SportelloLavoroFormData } from '../types/interfaces';
import api from './api';

export interface SportelloLavoroResponse {
  _id: string;
  agentName?: string;
  businessName: string;
  vatNumber: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  agreedCommission: number;
  email?: string;
  pec?: string;
  isActive?: boolean;
  isApproved?: boolean;
  signedContractFile?: {
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
  };
  legalDocumentFile?: {
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
  };
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface SportelloLavoroCreateRequest extends SportelloLavoroFormData {
  signedContractFile?: File;
  legalDocumentFile?: File;
}

export interface SportelloLavoroListResponse {
  data: SportelloLavoroResponse[];
  total: number;
}

export interface SportelloLavoroUploadResponse {
  message: string;
  sportelloLavoro: SportelloLavoroResponse[];
  errors?: string[];
}

export interface ApiError {
  error: string;
  errors?: string[];
}

class SportelloLavoroService {
  private baseUrl = '/api/sportello-lavoro';

  async getAllSportelloLavoro(): Promise<SportelloLavoroResponse[]> {
    try {
      const response = await api.get(this.baseUrl);
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to fetch sportello lavoro';
      console.error('Error fetching sportello lavoro:', msg);
      throw new Error(msg);
    }
  }

  
  async getSportelloLavoroById(id: string): Promise<SportelloLavoroResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch sportello lavoro');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching sportello lavoro by ID:', error);
      throw error;
    }
  }


  async createSportelloLavoro(data: SportelloLavoroCreateRequest): Promise<SportelloLavoroResponse> {
    try {
      const formData = new FormData();
      
      
      formData.append('businessName', data.businessName);
      formData.append('vatNumber', data.vatNumber);
      formData.append('address', data.address);
      formData.append('city', data.city);
      formData.append('postalCode', data.postalCode);
      formData.append('province', data.province);
      formData.append('agreedCommission', data.agreedCommission.toString());
      
      if (data.email) {
        formData.append('email', data.email);
      }
      if (data.pec) {
        formData.append('pec', data.pec);
      }
      
      
      if (data.signedContractFile) {
        formData.append('signedContractFile', data.signedContractFile);
      }
      if (data.legalDocumentFile) {
        formData.append('legalDocumentFile', data.legalDocumentFile);
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create sportello lavoro');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating sportello lavoro:', error);
      throw error;
    }
  }

 
  async updateSportelloLavoro(id: string, data: Partial<SportelloLavoroCreateRequest>): Promise<SportelloLavoroResponse> {
    try {
      const formData = new FormData();
      
      
      if (data.businessName !== undefined) {
        formData.append('businessName', data.businessName);
      }
      if (data.vatNumber !== undefined) {
        formData.append('vatNumber', data.vatNumber);
      }
      if (data.address !== undefined) {
        formData.append('address', data.address);
      }
      if (data.city !== undefined) {
        formData.append('city', data.city);
      }
      if (data.postalCode !== undefined) {
        formData.append('postalCode', data.postalCode);
      }
      if (data.province !== undefined) {
        formData.append('province', data.province);
      }
      if (data.agreedCommission !== undefined) {
        formData.append('agreedCommission', data.agreedCommission.toString());
      }
      if (data.email !== undefined) {
        formData.append('email', data.email);
      }
      if (data.pec !== undefined) {
        formData.append('pec', data.pec);
      }
      
      
      if (data.signedContractFile) {
        formData.append('signedContractFile', data.signedContractFile);
      }
      if (data.legalDocumentFile) {
        formData.append('legalDocumentFile', data.legalDocumentFile);
      }

      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update sportello lavoro');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating sportello lavoro:', error);
      throw error;
    }
  }


  async deleteSportelloLavoro(id: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete sportello lavoro');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting sportello lavoro:', error);
      throw error;
    }
  }

  
  async uploadSportelloLavoroFromExcel(file: File): Promise<SportelloLavoroUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload Excel file');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading Excel file:', error);
      throw error;
    }
  }

 
  async downloadFile(sportelloLavoroId: string, fileType: 'contract' | 'legal'): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/${sportelloLavoroId}/download/${fileType}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      return await response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  validateVatNumber(vatNumber: string): boolean {
  
    const vatRegex = /^[0-9]{11}$/;
    return vatRegex.test(vatNumber);
  }

  
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }


  validatePostalCode(postalCode: string): boolean {
    const postalCodeRegex = /^[0-9]{5}$/;
    return postalCodeRegex.test(postalCode);
  }


  validateFile(file: File, allowedTypes: string[], maxSize: number): { valid: boolean; error?: string } {

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      };
    }

    return { valid: true };
  }

  getDocumentAllowedTypes(): string[] {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
  }

  
  getExcelAllowedTypes(): string[] {
    return [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/excel',
      'application/x-excel',
      'application/x-msexcel'
    ];
  }


  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }


  formatPercentage(percentage: number): string {
    return `${percentage}%`;
  }

  getFileSizeString(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}


export const sportelloLavoroService = new SportelloLavoroService();
export default sportelloLavoroService;
