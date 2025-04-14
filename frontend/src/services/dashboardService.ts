import api from './api';

export const getDashboardStats = async () => {
  try {
    const response = await api.get('/api/dashboard/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

export const initializeDashboard = async () => {
  try {
    const response = await api.post('/api/dashboard/initialize');
    return response.data;
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    throw error;
  }
};



export const createCompany = async (companyData: any) => {
  try {
    const response = await api.post('/api/companies', companyData);
    return response.data;
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
};



export const createProject = async (projectData: any) => {
  try {
    const response = await api.post('/api/projects', projectData);
    return response.data;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

