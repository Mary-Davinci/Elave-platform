import axios, { AxiosRequestConfig } from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
console.log('API URL being used:', apiUrl); // This will help debug

// Add a fallback if VITE_API_URL is not defined
if (!apiUrl) {
  console.warn('VITE_API_URL is not defined! Falling back to default URL.');
}

const api = axios.create({
  baseURL: apiUrl || 'http://localhost:5000',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add a request interceptor to include the auth token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Safe way to log the URL (addressing TypeScript errors)
    const baseUrl = config.baseURL || '';
    const url = config.url || '';
    console.log('Making request to:', baseUrl + url);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message);
      
      // Safe way to log the request URL
      if (error.config) {
        const baseUrl = error.config.baseURL || '';
        const url = error.config.url || '';
        console.error('Request was made to:', baseUrl + url);
      }
    }
    
    // Handle authentication issues
    if (error.response && error.response.status === 401) {
      // If we get a 401 response, clear the token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle other errors (optional)
    if (error.response && error.response.status === 500) {
      console.error('Server Error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;