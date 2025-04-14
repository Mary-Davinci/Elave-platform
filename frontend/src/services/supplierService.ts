// src/services/supplierService.ts
import api from './api';

// Interface for supplier data
export interface Supplier {
  _id: string;
  ragioneSociale: string;
  indirizzo: string;
  citta: string;
  cap: string;
  provincia: string;
  partitaIva: string;
  codiceFiscale?: string;
  referente: string;
  cellulare: string;
  telefono?: string;
  email: string;
  pec?: string;
  user: string;
  createdAt: string;
  updatedAt: string;
}

// Interface for supplier form data
export interface SupplierFormData {
  ragioneSociale: string;
  indirizzo: string;
  citta: string;
  cap: string;
  provincia: string;
  partitaIva: string;
  codiceFiscale?: string;
  referente: string;
  cellulare: string;
  telefono?: string;
  email: string;
  pec?: string;
}

/**
 * Fetch all suppliers
 * @returns Promise with array of suppliers
 */
export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const response = await api.get<Supplier[]>('/api/suppliers');
    return response.data;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
};

/**
 * Fetch a single supplier by ID
 * @param id Supplier ID
 * @returns Promise with supplier data
 */
export const getSupplierById = async (id: string): Promise<Supplier> => {
  try {
    const response = await api.get<Supplier>(`/api/suppliers/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching supplier with id ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new supplier
 * @param supplierData Supplier data
 * @returns Promise with created supplier
 */
export const createSupplier = async (supplierData: SupplierFormData): Promise<Supplier> => {
  try {
    const response = await api.post<Supplier>('/api/suppliers', supplierData);
    return response.data;
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    
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
 * Update an existing supplier
 * @param id Supplier ID
 * @param supplierData Updated supplier data
 * @returns Promise with updated supplier
 */
export const updateSupplier = async (id: string, supplierData: Partial<SupplierFormData>): Promise<Supplier> => {
  try {
    const response = await api.put<Supplier>(`/api/suppliers/${id}`, supplierData);
    return response.data;
  } catch (error: any) {
    console.error(`Error updating supplier with id ${id}:`, error);
    
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
 * Delete a supplier
 * @param id Supplier ID
 * @returns Promise indicating success
 */
export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/suppliers/${id}`);
  } catch (error: any) {
    console.error(`Error deleting supplier with id ${id}:`, error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};