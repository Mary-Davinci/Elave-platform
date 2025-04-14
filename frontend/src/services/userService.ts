// src/services/userService.ts
import api from './api';

export interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserFormData {
  username: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  role?: string;
}

/// src/services/userService.ts - Update all API endpoints

// Get users managed by the current user
export const getManagedUsers = async () => {
  try {
    const response = await api.get('/api/utilities'); // Changed from '/api/users'
    return response.data;
  } catch (error) {
    console.error('Error fetching managed users:', error);
    throw error;
  }
};

// Get all users (admin only)
export const getAllUsers = async () => {
  try {
    const response = await api.get('/api/utilities/admin'); // Changed from '/api/users/admin'
    return response.data;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
};

// Create a new user (admin only)
export const createUser = async (userData: UserFormData) => {
  try {
    const response = await api.post('/api/utilities', userData); // Changed from '/api/users'
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Get a user by ID
export const getUserById = async (userId: string) => {
  try {
    const response = await api.get(`/api/utilities/${userId}`); // Changed from '/api/users/${userId}'
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

// Update a user
export const updateUser = async (userId: string, userData: Partial<UserFormData>) => {
  try {
    const response = await api.put(`/api/utilities/${userId}`, userData); // Changed from '/api/users/${userId}'
    return response.data;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
};

// Delete a user (admin only)
export const deleteUser = async (userId: string) => {
  try {
    const response = await api.delete(`/api/utilities/${userId}`); // Changed from '/api/users/${userId}'
    return response.data;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

// Change user password
export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  try {
    const response = await api.post(`/api/utilities/${userId}/change-password`, { // Changed from '/api/users/${userId}/change-password'
      currentPassword,
      newPassword
    });
    return response.data;
  } catch (error) {
    console.error(`Error changing password for user ${userId}:`, error);
    throw error;
  }
};