// src/services/notificationService.ts (REAL API - NO MOCK DATA)
import { useState, useEffect, useCallback } from 'react';

// Your existing API service - make sure this is set up correctly
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Real API calls - no mock data
const api = {
  get: async (url: string) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  post: async (url: string, data?: any) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  delete: async (url: string) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
};

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'company_pending' | 'sportello_pending' | 'agente_pending' | 'segnalatore_pending';
  entityId: string;
  entityName: string;
  createdBy: string;
  createdByName: string;
  recipients: string[];
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}

export class NotificationService {
  /**
   * Get notifications from REAL API
   */
  static async getNotifications(): Promise<NotificationResponse> {
    try {
      console.log('🔔 Fetching REAL notifications from API...');
      const response = await api.get('/api/notifications');
      
      console.log('✅ Real notifications received:', response);
      return {
        notifications: response.notifications || [],
        unreadCount: response.unreadCount || 0
      };
    } catch (error: any) {
      console.error('❌ Error fetching real notifications:', error);
      
      // Don't fallback to mock data - throw the real error
      if (error.message.includes('404')) {
        throw new Error('Notification API endpoint not found. Make sure your backend has /api/notifications route.');
      } else if (error.message.includes('401')) {
        throw new Error('Authentication failed. Please login again.');
      } else if (error.message.includes('403')) {
        throw new Error('Access denied. You need admin privileges to view notifications.');
      } else {
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }
    }
  }

  /**
   * Mark a notification as read - REAL API
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      console.log('✓ Marking notification as read via REAL API:', notificationId);
      await api.post(`/api/notifications/${notificationId}/read`);
      console.log('✅ Notification marked as read successfully');
    } catch (error: any) {
      console.error('❌ Error marking notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read - REAL API
   */
  static async markAllAsRead(): Promise<void> {
    try {
      console.log('✓ Marking all notifications as read via REAL API...');
      await api.post('/api/notifications/mark-all-read');
      console.log('✅ All notifications marked as read successfully');
    } catch (error: any) {
      console.error('❌ Error marking all notifications as read:', error);
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Get unread notification count - REAL API
   */
  static async getUnreadCount(): Promise<number> {
    try {
      console.log('🔢 Fetching unread count from REAL API...');
      const response = await api.get('/api/notifications/count');
      console.log('✅ Unread count received:', response.count);
      return response.count || 0;
    } catch (error: any) {
      console.error('❌ Error fetching unread count:', error);
      throw new Error(`Failed to fetch unread count: ${error.message}`);
    }
  }

  /**
   * Delete a notification - REAL API
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting notification via REAL API:', notificationId);
      await api.delete(`/api/notifications/${notificationId}`);
      console.log('✅ Notification deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting notification:', error);
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Test API connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing API connection...');
      await api.get('/health'); // Try your health endpoint first
      console.log('✅ API connection successful');
      return true;
    } catch (error) {
      console.error('❌ API connection failed:', error);
      return false;
    }
  }
}

// Enhanced React hook for REAL notifications
export const useNotifications = (pollInterval: number = 30000) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 useNotifications: Fetching REAL notifications...');
      
      const data = await NotificationService.getNotifications();
      
      console.log('✅ useNotifications: Real notifications fetched successfully:', data);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setIsConnected(true);
      
    } catch (err: any) {
      console.error('❌ useNotifications: Error occurred:', err);
      
      let errorMessage = 'Failed to fetch notifications';
      
      if (err.message.includes('not found')) {
        errorMessage = 'Notification API not available. Check your backend.';
      } else if (err.message.includes('Authentication')) {
        errorMessage = 'Please login again';
      } else if (err.message.includes('Access denied')) {
        errorMessage = 'You need admin privileges';
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server';
      }
      
      setError(errorMessage);
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
      
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      console.log('✓ useNotifications: Marking notification as read:', notificationId);
      await NotificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      console.log('✅ useNotifications: Notification marked as read successfully');
    } catch (err: any) {
      console.error('❌ useNotifications: Error marking as read:', err);
      setError(err.message);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      console.log('✓ useNotifications: Marking all notifications as read...');
      await NotificationService.markAllAsRead();
      
      setNotifications([]);
      setUnreadCount(0);
      
      console.log('✅ useNotifications: All notifications marked as read successfully');
    } catch (err: any) {
      console.error('❌ useNotifications: Error marking all as read:', err);
      setError(err.message);
    }
  }, []);

  const retry = useCallback(() => {
    console.log('🔄 useNotifications: Retrying...');
    setError(null);
    fetchNotifications();
  }, [fetchNotifications]);

  // Test connection on mount
  useEffect(() => {
    const testConnection = async () => {
      const connected = await NotificationService.testConnection();
      setIsConnected(connected);
      if (!connected) {
        setError('Cannot connect to backend server');
      }
    };
    
    testConnection();
  }, []);

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    console.log('🎣 useNotifications: Hook mounted, starting real API fetch...');
    fetchNotifications();
    
    if (pollInterval > 0) {
      console.log(`⏰ useNotifications: Setting up polling every ${pollInterval}ms`);
      const interval = setInterval(() => {
        console.log('⏰ useNotifications: Polling interval triggered - fetching real notifications');
        fetchNotifications();
      }, pollInterval);
      
      return () => {
        console.log('🧹 useNotifications: Cleaning up polling interval');
        clearInterval(interval);
      };
    }
  }, [fetchNotifications, pollInterval]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    isConnected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    retry,
    refetch: fetchNotifications
  };
};

export default NotificationService;