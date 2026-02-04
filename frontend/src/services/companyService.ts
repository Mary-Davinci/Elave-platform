// src/services/companyService.ts
import api from './api';
import { Company, CompanyFormData } from '../types/interfaces';

// Get all companies
export const getCompanies = async (): Promise<Company[]> => {
  try {
    const response = await api.get<Company[]>('/api/companies');
    return response.data;
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
};

// Get company by id
export const getCompanyById = async (id: string): Promise<Company> => {
  try {
    const response = await api.get<Company>(`/api/companies/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching company with id ${id}:`, error);
    throw error;
  }
};

export const getNextNumeroAnagrafica = async (): Promise<string> => {
  try {
    const response = await api.get<{ numeroAnagrafica: string }>(
      '/api/companies/numero-anagrafica/next',
      { params: { preview: true } }
    );
    return response.data.numeroAnagrafica;
  } catch (error) {
    console.error('Error fetching next numero anagrafica:', error);
    throw error;
  }
};

// Create a new company
// src/services/companyService.ts
export const createCompany = async (companyData: CompanyFormData): Promise<Company> => {
  try {
    const preparedData = {
      businessName: companyData.businessName?.trim() || '',
      companyName:
        companyData.companyName?.trim() ||
        companyData.businessName?.trim() ||
        '',
      vatNumber: companyData.vatNumber?.trim() || '',
      fiscalCode: companyData.fiscalCode?.trim() || '',
      matricola: companyData.matricola?.trim() || '',
      inpsCode: companyData.inpsCode?.trim() || '',
      numeroAnagrafica: companyData.numeroAnagrafica?.trim() || '',

      address: {
        street: companyData.address?.street?.trim() || '',
        city: companyData.address?.city?.trim() || '',
        postalCode: companyData.address?.postalCode?.trim() || '',
        province: companyData.address?.province?.trim() || '',
        country: companyData.address?.country?.trim() || 'Italy',
      },

      contactInfo: {
        phoneNumber: companyData.contactInfo?.phoneNumber?.trim() || '',
        mobile: companyData.contactInfo?.mobile?.trim() || '',
        email: companyData.contactInfo?.email?.trim() || '',
        pec: companyData.contactInfo?.pec?.trim() || '',
        referent: companyData.contactInfo?.referent?.trim() || '',
        // NEW fields (kept if present)
        laborConsultant: companyData.contactInfo?.laborConsultant?.trim() || '',
        laborConsultantId: companyData.contactInfo?.laborConsultantId || '',
      },

      contractDetails: {
        contractType: companyData.contractDetails?.contractType?.trim() || '',
        ccnlType: companyData.contractDetails?.ccnlType?.trim() || '',
        bilateralEntity: companyData.contractDetails?.bilateralEntity?.trim() || '',
        hasFondoSani: !!companyData.contractDetails?.hasFondoSani,
        useEbapPayment: !!companyData.contractDetails?.useEbapPayment,
        // NEW fields (match types)
        elavAdhesion: !!companyData.contractDetails?.elavAdhesion,
        saluteAmicaAdhesion: companyData.contractDetails?.saluteAmicaAdhesion || '',
        // If your backend expects territorialManager inside contractDetails:
        territorialManager:
          (companyData as any)?.territorialManager?.trim?.() ||
          (companyData as any)?.contractDetails?.territorialManager?.trim?.() ||
          '',
      },

      industry: companyData.industry?.trim() || '',
      employees: Number(companyData.employees) || 0,
      signaler: companyData.signaler?.trim() || '',
      actuator: companyData.actuator?.trim() || '',
      isActive: companyData.isActive !== undefined ? !!companyData.isActive : true,
    };

    // basic client-side required checks (adjust to your backend rules)
    if (!preparedData.businessName) throw new Error('Business name is required');
    if (!preparedData.vatNumber) throw new Error('VAT number is required');
    if (!preparedData.inpsCode) throw new Error('INPS code is required');

    const { data } = await api.post<Company>('/api/companies', preparedData);
    return data;
  } catch (error: any) {
    console.error('Error creating company:', error);
    if (error.response?.data?.errors) throw new Error(error.response.data.errors.join(', '));
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw error;
  }
};


// Update company
export const updateCompany = async (id: string, companyData: Partial<CompanyFormData>): Promise<Company> => {
  try {
    // Prepare the data for submission (similar to createCompany)
    const preparedData = {
      businessName: companyData.businessName?.trim(),
      companyName: companyData.companyName?.trim(),
      vatNumber: companyData.vatNumber?.trim(),
      fiscalCode: companyData.fiscalCode?.trim(),
      matricola: companyData.matricola?.trim(),
      inpsCode: companyData.inpsCode?.trim(),
      numeroAnagrafica: companyData.numeroAnagrafica?.trim(),
      
      address: companyData.address ? {
        street: companyData.address.street?.trim(),
        city: companyData.address.city?.trim(),
        postalCode: companyData.address.postalCode?.trim(),
        province: companyData.address.province?.trim(),
        country: companyData.address.country?.trim()
      } : undefined,
      
      contactInfo: companyData.contactInfo ? {
        phoneNumber: companyData.contactInfo.phoneNumber?.trim(),
        mobile: companyData.contactInfo.mobile?.trim(),
        email: companyData.contactInfo.email?.trim(),
        pec: companyData.contactInfo.pec?.trim(),
        referent: companyData.contactInfo.referent?.trim()
      ,
        laborConsultant: companyData.contactInfo.laborConsultant?.trim(),
        laborConsultantId: companyData.contactInfo.laborConsultantId
      } : undefined,
      

      contractDetails: companyData.contractDetails ? {
        contractType: companyData.contractDetails.contractType?.trim(),
        ccnlType: companyData.contractDetails.ccnlType?.trim(),
        bilateralEntity: companyData.contractDetails.bilateralEntity?.trim(),
        hasFondoSani: companyData.contractDetails.hasFondoSani,
        useEbapPayment: companyData.contractDetails.useEbapPayment
      } : undefined,
      
      industry: companyData.industry?.trim(),
      employees: companyData.employees,
      signaler: companyData.signaler?.trim(),
      actuator: companyData.actuator?.trim(),
      isActive: companyData.isActive
    };

    const response = await api.put<Company>(`/api/companies/${id}`, preparedData);
    return response.data;
  } catch (error: any) {
    console.error(`Error updating company with id ${id}:`, error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};

// Delete company
export const deleteCompany = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/companies/${id}`);
  } catch (error: any) {
    console.error(`Error deleting company with id ${id}:`, error);
    
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
 * Upload companies from Excel file
 * @param formData The form data containing the Excel file
 * @returns Array of created companies
 */
// src/services/companyService.ts - update the uploadCompaniesFromExcel function

export interface CompanyUploadPreviewRow {
  rowNumber: number;
  data: Company;
  errors?: string[];
}

export interface CompanyUploadPreviewResponse {
  message: string;
  preview: CompanyUploadPreviewRow[];
  errors?: string[];
}

export const uploadCompaniesFromExcel = async (
  formData: FormData
): Promise<Company[]> => {
  try {
    console.log("Uploading Excel file...");
    
    // Debug FormData contents
    for (const pair of formData.entries()) {
      console.log(`FormData contains: ${pair[0]}, ${pair[1] instanceof File ? pair[1].name : pair[1]}`);
    }
    
    const endpoint = '/api/companies/upload';
    const response = await api.post<{
      message: string;
      companies?: Company[];
      preview?: CompanyUploadPreviewRow[];
      errors?: string[];
    }>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000
    });
    
    console.log("Upload response:", response.data);
    
    // Check if we have errors in the response
    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(response.data.errors.join(', '));
    }
    
    return response.data.companies || [];
  } catch (error: any) {
    console.error('Error uploading companies from Excel:', error);
    
    // Extract and throw meaningful error messages
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};

export const previewCompaniesFromExcel = async (
  formData: FormData
): Promise<CompanyUploadPreviewResponse> => {
  try {
    console.log("Previewing Excel file...");
    const response = await api.post<{
      message: string;
      preview?: CompanyUploadPreviewRow[];
      errors?: string[];
    }>('/api/companies/upload?preview=1', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000
    });

    return {
      message: response.data.message,
      preview: response.data.preview || [],
      errors: response.data.errors
    };
  } catch (error: any) {
    console.error('Error previewing companies from Excel:', error);
    if (error.response?.data?.errors) {
      throw new Error(error.response.data.errors.join(', '));
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};
