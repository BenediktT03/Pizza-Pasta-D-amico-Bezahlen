/**
 * EATECH Master Authentication Hook
 * Version: 1.0.0
 * 
 * Custom React Hook für Master-Admin Authentifizierung
 * Features:
 * - Authentication State Management
 * - Session Handling
 * - Role-based Access Control
 * - Activity Tracking
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/hooks/useMasterAuth.js
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create Auth Context
const MasterAuthContext = createContext({});

// Auth Provider Component
export const MasterAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState(null);

  // Mock auth service (replace with real Firebase auth)
  const authService = {
    getCurrentUser: () => {
      // Check if user is stored in sessionStorage
      const storedUser = sessionStorage.getItem('masterUser');
      return storedUser ? JSON.parse(storedUser) : null;
    },
    
    login: async (email, password) => {
      // Mock login logic
      if (email === 'admin@eatech.ch' && password === 'master123') {
        const userData = {
          id: '1',
          email: email,
          name: 'Master Admin',
          role: 'super_admin',
          permissions: ['all'],
          lastLogin: new Date().toISOString()
        };
        
        sessionStorage.setItem('masterUser', JSON.stringify(userData));
        sessionStorage.setItem('masterToken', 'mock-jwt-token');
        
        return { success: true, user: userData };
      }
      
      throw new Error('Invalid credentials');
    },
    
    logout: async () => {
      sessionStorage.removeItem('masterUser');
      sessionStorage.removeItem('masterToken');
    },
    
    checkSession: () => {
      const token = sessionStorage.getItem('masterToken');
      return !!token;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        const hasValidSession = authService.checkSession();
        
        if (currentUser && hasValidSession) {
          setUser(currentUser);
          setIsAuthenticated(true);
          
          // Set session expiry (30 minutes from now)
          const expiry = new Date();
          expiry.setMinutes(expiry.getMinutes() + 30);
          setSessionExpiry(expiry);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Session timeout handler
  useEffect(() => {
    if (!sessionExpiry) return;

    const checkExpiry = setInterval(() => {
      if (new Date() > sessionExpiry) {
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkExpiry);
  }, [sessionExpiry]);

  // Login function
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    
    try {
      const result = await authService.login(email, password);
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        
        // Set session expiry
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 30);
        setSessionExpiry(expiry);
        
        return { success: true };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpiry(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Check if user has specific permission
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.permissions.includes('all')) return true;
    return user.permissions.includes(permission);
  }, [user]);

  // Check if user has specific role
  const hasRole = useCallback((role) => {
    if (!user) return false;
    return user.role === role;
  }, [user]);

  // Update user activity
  const updateActivity = useCallback(() => {
    if (sessionExpiry) {
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 30);
      setSessionExpiry(expiry);
    }
  }, [sessionExpiry]);

  // Check master status
  const checkMasterStatus = useCallback(() => {
    return user && (user.role === 'super_admin' || user.role === 'master_admin');
  }, [user]);

  // Context value
  const value = {
    user,
    isLoading,
    isAuthenticated,
    sessionExpiry,
    login,
    logout,
    hasPermission,
    hasRole,
    updateActivity,
    checkMasterStatus
  };

  return (
    <MasterAuthContext.Provider value={value}>
      {children}
    </MasterAuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useMasterAuth = () => {
  const context = useContext(MasterAuthContext);
  
  if (!context) {
    throw new Error('useMasterAuth must be used within MasterAuthProvider');
  }
  
  return context;
};

// Higher-order component for protected routes
export const withMasterAuth = (Component, requiredRole = null) => {
  return function ProtectedComponent(props) {
    const { isAuthenticated, isLoading, hasRole } = useMasterAuth();
    
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!isAuthenticated) {
      window.location.href = '/master/login';
      return null;
    }
    
    if (requiredRole && !hasRole(requiredRole)) {
      return <div>Access Denied</div>;
    }
    
    return <Component {...props} />;
  };
};