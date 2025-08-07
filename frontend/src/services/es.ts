// src/services/employeeService.ts
import api from './api';
import { Employee } from '../types/interfaces';

export interface EmployeeFormData {
  companyId: string;
  nome: string;
  cognome: string;
  dataNascita: string;
  cittaNascita: string;
  provinciaNascita: string;
  genere: 'M' | 'F' | 'A';
  codiceFiscale: string;
  indirizzo: string;
  numeroCivico: string;
  citta: string;
  provincia: string;
  cap: string;
  cellulare?: string;
  telefono?: string;
  email?: string;
  attivo?: boolean;
}

// Get all employees for a company
export const getEmployeesByCompany = async (companyId: string): Promise<Employee[]> => {
  try {
    const response = await api.get<Employee[]>(`/api/employees/company/${companyId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

// Get employee by id
export const getEmployeeById = async (id: string): Promise<Employee> => {
  try {
    const response = await api.get<Employee>(`/api/employees/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching employee with id ${id}:`, error);
    throw error;
  }
};

// Create a new employee
export const createEmployee = async (employeeData: EmployeeFormData): Promise<Employee> => {
  try {
    // Prepare the data for submission
    const preparedData = {
      companyId: employeeData.companyId,
      nome: employeeData.nome?.trim() || '',
      cognome: employeeData.cognome?.trim() || '',
      dataNascita: employeeData.dataNascita,
      cittaNascita: employeeData.cittaNascita?.trim() || '',
      provinciaNascita: employeeData.provinciaNascita?.trim() || '',
      genere: employeeData.genere,
      codiceFiscale: employeeData.codiceFiscale?.trim().toUpperCase() || '',
      indirizzo: employeeData.indirizzo?.trim() || '',
      numeroCivico: employeeData.numeroCivico?.trim() || '',
      citta: employeeData.citta?.trim() || '',
      provincia: employeeData.provincia?.trim() || '',
      cap: employeeData.cap?.trim() || '',
      cellulare: employeeData.cellulare?.trim() || '',
      telefono: employeeData.telefono?.trim() || '',
      email: employeeData.email?.trim() || '',
      attivo: employeeData.attivo !== undefined ? employeeData.attivo : true
    };

    // Validate required fields
    const requiredFields = [
      'companyId', 'nome', 'cognome', 'dataNascita', 'cittaNascita', 
      'provinciaNascita', 'genere', 'codiceFiscale', 'indirizzo', 
      'numeroCivico', 'citta', 'provincia', 'cap'
    ];

    for (const field of requiredFields) {
      if (!preparedData[field as keyof typeof preparedData]) {
        throw new Error(`${field} is required`);
      }
    }

    const response = await api.post<Employee>('/api/employees', preparedData);
    return response.data;
  } catch (error: any) {
    console.error('Error creating employee:', error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};

// Update employee
export const updateEmployee = async (id: string, employeeData: Partial<EmployeeFormData>): Promise<Employee> => {
  try {
    // Prepare the data for submission
    const preparedData: any = {};
    
    if (employeeData.nome !== undefined) preparedData.nome = employeeData.nome.trim();
    if (employeeData.cognome !== undefined) preparedData.cognome = employeeData.cognome.trim();
    if (employeeData.dataNascita !== undefined) preparedData.dataNascita = employeeData.dataNascita;
    if (employeeData.cittaNascita !== undefined) preparedData.cittaNascita = employeeData.cittaNascita.trim();
    if (employeeData.provinciaNascita !== undefined) preparedData.provinciaNascita = employeeData.provinciaNascita.trim();
    if (employeeData.genere !== undefined) preparedData.genere = employeeData.genere;
    if (employeeData.codiceFiscale !== undefined) preparedData.codiceFiscale = employeeData.codiceFiscale.trim().toUpperCase();
    if (employeeData.indirizzo !== undefined) preparedData.indirizzo = employeeData.indirizzo.trim();
    if (employeeData.numeroCivico !== undefined) preparedData.numeroCivico = employeeData.numeroCivico.trim();
    if (employeeData.citta !== undefined) preparedData.citta = employeeData.citta.trim();
    if (employeeData.provincia !== undefined) preparedData.provincia = employeeData.provincia.trim();
    if (employeeData.cap !== undefined) preparedData.cap = employeeData.cap.trim();
    if (employeeData.cellulare !== undefined) preparedData.cellulare = employeeData.cellulare.trim();
    if (employeeData.telefono !== undefined) preparedData.telefono = employeeData.telefono.trim();
    if (employeeData.email !== undefined) preparedData.email = employeeData.email.trim();
    if (employeeData.attivo !== undefined) preparedData.attivo = employeeData.attivo;

    const response = await api.put<Employee>(`/api/employees/${id}`, preparedData);
    return response.data;
  } catch (error: any) {
    console.error(`Error updating employee with id ${id}:`, error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};

// Delete employee
export const deleteEmployee = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/employees/${id}`);
  } catch (error: any) {
    console.error(`Error deleting employee with id ${id}:`, error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};

// Upload employees from Excel file
export const uploadEmployeesFromExcel = async (companyId: string, formData: FormData): Promise<Employee[]> => {
  try {
    console.log("Uploading employee Excel file...");
    
    // Debug FormData contents
    for (const pair of formData.entries()) {
      console.log(`FormData contains: ${pair[0]}, ${pair[1] instanceof File ? pair[1].name : pair[1]}`);
    }
    
    const response = await api.post<{
      message: string;
      employees: Employee[];
      errors?: string[];
    }>(`/api/employees/company/${companyId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log("Employee upload response:", response.data);
    
    // Check if we have errors in the response
    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(response.data.errors.join(', '));
    }
    
    return response.data.employees || [];
  } catch (error: any) {
    console.error('Error uploading employees from Excel:', error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};