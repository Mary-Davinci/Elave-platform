// src/services/api.ts - Improved version of your API service
import axios from 'axios';

// Get API URL from environment variables
let apiUrl = import.meta.env.VITE_API_URL;
console.log('Original API URL from env:', apiUrl);

// Force HTTPS for production URLs (fix mixed content error)
if (apiUrl && apiUrl.startsWith('http:') && !apiUrl.includes('localhost')) {
  apiUrl = apiUrl.replace('http:', 'https:');
  console.log('Forced HTTPS - Using:', apiUrl);
}

// Add a fallback if VITE_API_URL is not defined
if (!apiUrl) {
  console.warn('VITE_API_URL is not defined! Falling back to default URL.');
  apiUrl = 'https://elave-platform-production.up.railway.app';
}

const api = axios.create({
  baseURL: apiUrl,
  timeout: 15000, // Increased timeout for slower connections
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
    console.error('Request interceptor error:', error);
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
      console.warn('Authentication failed - redirecting to login');
      // If we get a 401 response, clear the token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Avoid infinite redirects by checking current path
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Handle forbidden access
    if (error.response && error.response.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }
    
    // Handle server errors
    if (error.response && error.response.status >= 500) {
      console.error('Server Error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Approval Service
export const approvalService = {
  // Get all pending items
  getPendingItems: async () => {
    try {
      const response = await api.get('/api/approvals/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending items:', error);
      throw error;
    }
  },

  // Approve items
  approveCompany: async (id: string) => {
    try {
      const response = await api.post(`/api/approvals/approve/company/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error approving company:', error);
      throw error;
    }
  },

  approveSportello: async (id: string) => {
    try {
      const response = await api.post(`/api/approvals/approve/sportello/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error approving sportello:', error);
      throw error;
    }
  },

  approveAgente: async (id: string) => {
    try {
      const response = await api.post(`/api/approvals/approve/agente/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error approving agente:', error);
      throw error;
    }
  },

  approveUser: async (id: string) => {
    try {
      const response = await api.post(`/api/approvals/approve/user/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error approving user:', error);
      throw error;
    }
  },

  // Reject items
  rejectItem: async (type: string, id: string, reason?: string) => {
    try {
      const response = await api.post(`/api/approvals/reject/${type}/${id}`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error rejecting item:', error);
      throw error;
    }
  }
};

// Notification Service - Enhanced with all methods
export const notificationService = {
  // Get notifications for current user
  getNotifications: async () => {
    try {
      const response = await api.get('/api/notifications');
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Return empty data instead of throwing to prevent UI crashes
      return { notifications: [], unreadCount: 0 };
    }
  },

  // Get unread notification count only
  getUnreadCount: async () => {
    try {
      const response = await api.get('/api/notifications/count');
      return response.data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return { count: 0 };
    }
  },

  // Mark notification as read
  markAsRead: async (id: string) => {
    try {
      const response = await api.post(`/api/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await api.post('/api/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete a notification
  deleteNotification: async (id: string) => {
    try {
      const response = await api.delete(`/api/notifications/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
};

// Export types for better TypeScript support
export interface NotificationData {
  _id: string;
  title: string;
  message: string;
  type: 'company_pending' | 'sportello_pending' | 'agente_pending' | 'segnalatore_pending';
  entityName: string;
  createdByName: string;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: NotificationData[];
  unreadCount: number;
}

export interface PendingItemsResponse {
  companies: any[];
  sportelloLavoro: any[];
  agenti: any[];
  segnalatori: any[];
  total: number;
}