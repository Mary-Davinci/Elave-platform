// src/services/employeeService.ts
import api from './api';
import { Employee, EmployeeFormData } from '../types/interfaces';

// Get all employees for a company
export const getEmployeesByCompanyId = async (companyId: string): Promise<Employee[]> => {
  try {
    const response = await api.get<Employee[]>(`/api/companies/${companyId}/employees`);
    return response.data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

// Get a single employee
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
export const createEmployee = async (companyId: string, employeeData: EmployeeFormData): Promise<Employee> => {
  try {
    // Convert attivo boolean to stato string
    const apiData = {
      ...employeeData,
      stato: employeeData.attivo ? 'attivo' : 'inattivo' as const
    };
    
    // Remove attivo as it's not in the API
    delete (apiData as any).attivo;
    
    const response = await api.post<Employee>(`/api/companies/${companyId}/employees`, apiData);
    return response.data;
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
};

// Update an employee
export const updateEmployee = async (id: string, employeeData: Partial<EmployeeFormData>): Promise<Employee> => {
  try {
    // If attivo is provided, convert it to stato
    const apiData: any = { ...employeeData };
    
    if (employeeData.attivo !== undefined) {
      apiData.stato = employeeData.attivo ? 'attivo' : 'inattivo';
      delete apiData.attivo;
    }
    
    const response = await api.put<Employee>(`/api/employees/${id}`, apiData);
    return response.data;
  } catch (error) {
    console.error(`Error updating employee with id ${id}:`, error);
    throw error;
  }
};

// Delete an employee
export const deleteEmployee = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/employees/${id}`);
  } catch (error) {
    console.error(`Error deleting employee with id ${id}:`, error);
    throw error;
  }
};

// Upload employees from Excel
export const uploadEmployeesExcel = async (companyId: string, file: File): Promise<Employee[]> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<Employee[]>(`/api/companies/${companyId}/employees/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading employees from Excel:', error);
    throw error;
  }
};