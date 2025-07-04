/**
 * EATECH - Authentication Context
 * File Path: /apps/admin/src/contexts/AuthContext.jsx
 */

import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Mock authentication for now
  useEffect(() => {
    // Simulate checking for existing session
    const checkAuth = async () => {
      try {
        // TODO: Check Firebase Auth
        const mockUser = {
          id: 'demo-user',
          email: 'admin@eatech.ch',
          name: 'Demo Admin',
          role: 'admin',
          tenantId: 'demo-restaurant'
        };
        
        setUser(mockUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    // TODO: Implement Firebase Auth login
    const mockUser = {
      id: 'demo-user',
      email,
      name: 'Demo Admin',
      role: 'admin',
      tenantId: 'demo-restaurant'
    };
    
    setUser(mockUser);
    setIsAuthenticated(true);
    return mockUser;
  };

  const logout = async () => {
    // TODO: Implement Firebase Auth logout
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;