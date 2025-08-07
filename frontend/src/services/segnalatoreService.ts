import { SegnalatoreFormData } from '../types/interfaces';

export interface SegnalatoreResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  taxCode: string;
  agreementPercentage: number;
  specialization?: string;
  notes?: string;
  contractFile?: {
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
  };
  idDocumentFile?: {
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
  };
  isActive: boolean;
  user: string;
  createdAt: string;
  updatedAt: string;
}

export interface SegnalatoreCreateRequest extends SegnalatoreFormData {
  contractFile?: File;
  idDocumentFile?: File;
}

export interface SegnalatoreListResponse {
  data: SegnalatoreResponse[];
  total: number;
}

export interface SegnalatoreUploadResponse {
  message: string;
  segnalatori: SegnalatoreResponse[];
  errors?: string[];
}

export interface ApiError {
  error: string;
  errors?: string[];
}

class SegnalatoreService {
  private baseUrl: string;
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    this.baseUrl = `${this.apiBaseUrl}/api/segnalatori`;
  }

  // Get authorization headers
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  // Get all segnalatori
  async getAllSegnalatori(): Promise<SegnalatoreResponse[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch segnalatori');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching segnalatori:', error);
      throw error;
    }
  }

  // Get segnalatore by ID
  async getSegnalatoreById(id: string): Promise<SegnalatoreResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch segnalatore');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching segnalatore by ID:', error);
      throw error;
    }
  }

  // Create new segnalatore
  async createSegnalatore(data: SegnalatoreCreateRequest): Promise<SegnalatoreResponse> {
    try {
      const formData = new FormData();
      
      // Append form data
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('email', data.email);
      formData.append('address', data.address);
      formData.append('city', data.city);
      formData.append('postalCode', data.postalCode);
      formData.append('province', data.province);
      formData.append('taxCode', data.taxCode);
      formData.append('agreementPercentage', data.agreementPercentage.toString());
      
      if (data.phone) {
        formData.append('phone', data.phone);
      }
      if (data.specialization) {
        formData.append('specialization', data.specialization);
      }
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      
      // Append files if present
      if (data.contractFile) {
        formData.append('contractFile', data.contractFile);
      }
      if (data.idDocumentFile) {
        formData.append('idDocumentFile', data.idDocumentFile);
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...this.getAuthHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create segnalatore');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating segnalatore:', error);
      throw error;
    }
  }

  // Update existing segnalatore
  async updateSegnalatore(id: string, data: Partial<SegnalatoreCreateRequest>): Promise<SegnalatoreResponse> {
    try {
      const formData = new FormData();
      
      // Append form data only if defined
      if (data.firstName !== undefined) {
        formData.append('firstName', data.firstName);
      }
      if (data.lastName !== undefined) {
        formData.append('lastName', data.lastName);
      }
      if (data.email !== undefined) {
        formData.append('email', data.email);
      }
      if (data.phone !== undefined) {
        formData.append('phone', data.phone);
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
      if (data.taxCode !== undefined) {
        formData.append('taxCode', data.taxCode);
      }
      if (data.agreementPercentage !== undefined) {
        formData.append('agreementPercentage', data.agreementPercentage.toString());
      }
      if (data.specialization !== undefined) {
        formData.append('specialization', data.specialization);
      }
      if (data.notes !== undefined) {
        formData.append('notes', data.notes);
      }
      
      // Append files if provided
      if (data.contractFile) {
        formData.append('contractFile', data.contractFile);
      }
      if (data.idDocumentFile) {
        formData.append('idDocumentFile', data.idDocumentFile);
      }

      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          ...this.getAuthHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update segnalatore');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating segnalatore:', error);
      throw error;
    }
  }

  // Delete segnalatore
  async deleteSegnalatore(id: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete segnalatore');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting segnalatore:', error);
      throw error;
    }
  }

  // Upload segnalatori from Excel file
  async uploadSegnalatoriFromExcel(file: File): Promise<SegnalatoreUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...this.getAuthHeaders(),
        },
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

  // Download file (contract or ID document)
  async downloadFile(segnalatoreId: string, fileType: 'contract' | 'id'): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/${segnalatoreId}/download/${fileType}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...this.getAuthHeaders(),
        },
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

  // Search segnalatori
  async searchSegnalatori(query: string): Promise<SegnalatoreResponse[]> {
    try {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search segnalatori');
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching segnalatori:', error);
      throw error;
    }
  }

  // Get segnalatori statistics
  async getSegnalatoriStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    averagePercentage: number;
    byProvince: Record<string, number>;
    bySpecialization: Record<string, number>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch statistics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  // Validation methods
  validateTaxCode(taxCode: string): boolean {
    // Italian tax code validation
    const taxCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    return taxCodeRegex.test(taxCode.toUpperCase());
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePostalCode(postalCode: string): boolean {
    const postalCodeRegex = /^[0-9]{5}$/;
    return postalCodeRegex.test(postalCode);
  }

  validatePercentage(percentage: number): boolean {
    return percentage >= 0 && percentage <= 100;
  }

  validateFile(file: File, allowedTypes: string[], maxSize: number): { valid: boolean; error?: string } {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
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

  // Utility methods
  formatPercentage(percentage: number): string {
    return `${percentage}%`;
  }

  formatFullName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`;
  }

  formatAddress(address: string, city: string, postalCode: string, province: string): string {
    return `${address}, ${city} ${postalCode} (${province})`;
  }

  getFileSizeString(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Export methods
  exportToCSV(segnalatori: SegnalatoreResponse[]): void {
    const headers = [
      'Nome',
      'Cognome',
      'Email',
      'Telefono',
      'Indirizzo',
      'Città',
      'CAP',
      'Provincia',
      'Codice Fiscale',
      'Percentuale Accordo',
      'Specializzazione',
      'Note',
      'Status',
      'Data Creazione'
    ];

    const rows = segnalatori.map(segnalatore => [
      segnalatore.firstName,
      segnalatore.lastName,
      segnalatore.email,
      segnalatore.phone || '',
      segnalatore.address,
      segnalatore.city,
      segnalatore.postalCode,
      segnalatore.province,
      segnalatore.taxCode,
      segnalatore.agreementPercentage,
      segnalatore.specialization || '',
      segnalatore.notes || '',
      segnalatore.isActive ? 'Attivo' : 'Inattivo',
      new Date(segnalatore.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `segnalatori_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Generate template for Excel import
  generateTemplate(): void {
    const headers = [
      'Nome',
      'Cognome',
      'Email',
      'Telefono',
      'Indirizzo',
      'Città',
      'CAP',
      'Provincia',
      'Codice Fiscale',
      'Percentuale Accordo',
      'Specializzazione',
      'Note'
    ];

    const sampleRow = [
      'Mario',
      'Rossi',
      'mario.rossi@email.com',
      '+39 123 456 7890',
      'Via Roma 123',
      'Milano',
      '20100',
      'MI',
      'RSSMRA80A01F205X',
      '15.5',
      'Edilizia',
      'Specialista nel settore edile'
    ];

    const csvContent = [headers, sampleRow]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'segnalatori_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Create and export singleton instance
export const segnalatoreService = new SegnalatoreService();
export default segnalatoreService;
