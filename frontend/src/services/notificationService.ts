// src/services/notificationService.ts (REAL API - NO MOCK DATA)
import { useState, useEffect, useCallback } from 'react';

// ---- Base URL resolver (supports both env names, trims trailing slash) ----
function resolveApiBase(): string {
  // Support either key
  const envUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    '';

  const cleaned = envUrl.replace(/\/+$/, ''); // trim trailing slashes

  // If nothing set, pick a sensible default based on where the app runs
  const isLocal =
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

  // Local dev default -> your backend on 5000
  if (!cleaned && isLocal) return 'http://localhost:5000';

  // In production, do NOT silently fall back to localhost; keep empty to fail fast
  return cleaned; // must be set via env in prod
}

const API_BASE_URL = resolveApiBase();

if (!API_BASE_URL) {
  // Helpful console hint if someone forgot to set the env var in prod
  // (Vite requires the VITE_ prefix)
  console.warn(
    '[notificationService] No VITE_API_URL (or VITE_API_BASE_URL) set. ' +
      'Requests will fail in production. Set it in .env.production.'
  );
}

// ---- Tiny fetch wrapper ----
const api = {
  async get(url: string) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },

  async post(url: string, data?: any) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },

  async delete(url: string) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },
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
  readBy: Array<{ user: string; readAt: string }>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}

export class NotificationService {
  static async getNotifications(): Promise<NotificationResponse> {
    try {
      console.log('🔔 Fetching REAL notifications from API...', API_BASE_URL);
      const response = await api.get('/api/notifications');
      return {
        notifications: response.notifications || [],
        unreadCount: response.unreadCount ?? 0,
      };
    } catch (error: any) {
      console.error('❌ Error fetching real notifications:', error);
      if (String(error.message).includes('404')) {
        throw new Error('Notification API endpoint not found. Make sure your backend exposes /api/notifications.');
      } else if (String(error.message).includes('401')) {
        throw new Error('Authentication failed. Please login again.');
      } else if (String(error.message).includes('403')) {
        throw new Error('Access denied. You need admin privileges to view notifications.');
      } else {
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await api.post(`/api/notifications/${notificationId}/read`);
  }

  static async markAllAsRead(): Promise<void> {
    await api.post('/api/notifications/mark-all-read');
  }

  static async getUnreadCount(): Promise<number> {
    const response = await api.get('/api/notifications/count');
    return response.count ?? 0;
  }

  static async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/api/notifications/${notificationId}`);
  }

  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing API connection...', API_BASE_URL);
      // Use whatever your backend actually exposes. If it’s /api/health, change this line:
      await api.get('/health');
      return true;
    } catch (e) {
      console.error('❌ API connection failed:', e);
      return false;
    }
  }
}

// Hook unchanged below (uses the fixed service) …
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
      const data = await NotificationService.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setIsConnected(true);
    } catch (err: any) {
      console.error('❌ useNotifications error:', err);
      let msg = 'Failed to fetch notifications';
      if (err.message.includes('not found')) msg = 'Notification API not available. Check your backend.';
      else if (err.message.includes('Authentication')) msg = 'Please login again';
      else if (err.message.includes('Access denied')) msg = 'You need admin privileges';
      else if (err.message.toLowerCase().includes('fetch')) msg = 'Cannot connect to server';
      setError(msg);
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const retry = useCallback(() => {
    setError(null);
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    (async () => {
      const ok = await NotificationService.testConnection();
      setIsConnected(ok);
      if (!ok) setError('Cannot connect to backend server');
    })();
  }, []);

  useEffect(() => {
    fetchNotifications();
    if (pollInterval > 0) {
      const id = setInterval(fetchNotifications, pollInterval);
      return () => clearInterval(id);
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
    refetch: fetchNotifications,
  };

  
};

export default NotificationService;
