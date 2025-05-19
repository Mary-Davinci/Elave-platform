import axios from 'axios';

// Create axios instance with baseURL from environment variables
// In Railway, set VITE_API_URL=http://elave-platform.railway.internal
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  // Add timeout to prevent hanging requests
  timeout: 10000,
  // Enable credentials for cross-origin requests (if needed)
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
      config.headers['Authorization'] = `Bearer ${token}`;
    }
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
      // You might want to show a global notification here
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
      // You might want to show a global error notification
    }
    
    return Promise.reject(error);
  }
);

export default api;