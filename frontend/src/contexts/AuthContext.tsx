// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  role: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user from localStorage if available
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Just set loading to false since we're getting user from localStorage
    setLoading(false);
  }, []);
  
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/api/auth/login', { email, password });
      
      // Extract token and user data from response
      const { token, user: userData } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Save token to localStorage and set headers
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token);
      
      if (userData) {
        // If we got user data from backend, use it
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        // Fallback if no user data was provided
        console.warn('No user data received from login response');
        const fallbackUser = {
          _id: 'temp-id',
          username: email.split('@')[0], // Fallback username from email
          email,
          role: 'user'
        };
        setUser(fallbackUser);
        localStorage.setItem('user', JSON.stringify(fallbackUser));
      }
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'An error occurred during login');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const register = async (username: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Store the username in localStorage so we can use it even before login
      const tempUser = {
        _id: 'pending',
        username, // This is the username provided during registration
        email,
        role: 'user'
      };
      localStorage.setItem('registeredUser', JSON.stringify(tempUser));
      
      // Register the user
      await api.post('/api/auth/register', { username, email, password });
      
      // After registration, log the user in
      await login(email, password);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred during registration');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    api.defaults.headers.common['Authorization'] = '';
    setUser(null);
    setToken(null);
  };
  
  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!token, 
      user, 
      token, 
      loading, 
      login, 
      register, 
      logout,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};