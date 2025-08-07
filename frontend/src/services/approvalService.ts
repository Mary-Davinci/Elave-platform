import api from './api'; // Your existing API service

export const approvalService = {
  // Get all pending items
  getPendingItems: async () => {
    const response = await api.get('/api/approvals/pending');
    return response.data;
  },

  // Approve items
  approveCompany: async (id: string) => {
    const response = await api.post(`/api/approvals/approve/company/${id}`);
    return response.data;
  },

  approveSportello: async (id: string) => {
    const response = await api.post(`/api/approvals/approve/sportello/${id}`);
    return response.data;
  },

  approveAgente: async (id: string) => {
    const response = await api.post(`/api/approvals/approve/agente/${id}`);
    return response.data;
  },

  approveUser: async (id: string) => {
    const response = await api.post(`/api/approvals/approve/user/${id}`);
    return response.data;
  },

  // Reject items
  rejectItem: async (type: string, id: string, reason?: string) => {
    const response = await api.post(`/api/approvals/reject/${type}/${id}`, { reason });
    return response.data;
  }
};

export const notificationService = {
  // Get notifications for current user
  getNotifications: async () => {
    const response = await api.get('/api/notifications');
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (id: string) => {
    const response = await api.post(`/api/notifications/${id}/read`);
    return response.data;
  }
};