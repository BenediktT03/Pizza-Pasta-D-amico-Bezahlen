/**
 * EATECH Master Authentication Hook
 * Version: 1.0.0
 * 
 * React Hook für Master Authentication
 * Provides authentication state and methods
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/hooks/useMasterAuth.js
 */

import { useState, useEffect, useContext, createContext } from 'react';
import AuthService from '../services/AuthService';
import { useNavigate } from 'react-router-dom';

// Create Auth Context
const MasterAuthContext = createContext(null);

/**
 * Master Auth Provider Component
 */
export const MasterAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = AuthService.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        // Load session data
        const sessionData = AuthService.currentSession;
        setSession(sessionData);
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Auth methods
  const login = async (credentials) => {
    try {
      const result = await AuthService.login(credentials);
      if (result.success) {
        setUser(result.user);
        setSession({
          sessionId: result.sessionId,
          ip: result.ip,
          requires2FA: result.requires2FA
        });
      }
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      setSession(null);
      navigate('/master/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const checkMasterStatus = async () => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      const isMaster = await AuthService.verifyMasterRole(currentUser.uid);
      return isMaster;
    }
    return false;
  };

  const value = {
    user,
    loading,
    session,
    login,
    logout,
    checkMasterStatus,
    isAuthenticated: !!user,
    isMaster: user?.role === 'master_admin'
  };

  return (
    <MasterAuthContext.Provider value={value}>
      {children}
    </MasterAuthContext.Provider>
  );
};

/**
 * Hook to use Master Auth Context
 */
export const useMasterAuth = () => {
  const context = useContext(MasterAuthContext);
  if (!context) {
    throw new Error('useMasterAuth must be used within MasterAuthProvider');
  }
  return context;
};