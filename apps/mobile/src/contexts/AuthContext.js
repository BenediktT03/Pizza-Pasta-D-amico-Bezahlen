/**
 * EATECH Mobile App - Auth Context
 * Version: 25.0.0
 * Description: Authentication Context für die EATECH Admin App
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/contexts/AuthContext.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Services
import { auth } from '../services/firebase';

// ============================================================================
// CONTEXT
// ============================================================================
const AuthContext = createContext({});

// ============================================================================
// AUTH PROVIDER
// ============================================================================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  useEffect(() => {
    checkAuthState();
  }, []);

  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const checkAuthState = async () => {
    try {
      // Check for stored auth token
      const token = await getSecureToken();
      
      if (token) {
        // Validate token with backend
        const userData = await validateToken(token);
        
        if (userData) {
          setUser(userData);
        } else {
          // Token invalid, clear it
          await clearSecureToken();
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // SECURE STORAGE
  // ============================================================================
  const getSecureToken = async () => {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem('authToken');
      } else {
        return await SecureStore.getItemAsync('authToken');
      }
    } catch (error) {
      console.error('Error getting secure token:', error);
      return null;
    }
  };

  const setSecureToken = async (token) => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem('authToken', token);
      } else {
        await SecureStore.setItemAsync('authToken', token);
      }
    } catch (error) {
      console.error('Error setting secure token:', error);
    }
  };

  const clearSecureToken = async () => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem('authToken');
      } else {
        await SecureStore.deleteItemAsync('authToken');
      }
    } catch (error) {
      console.error('Error clearing secure token:', error);
    }
  };

  // ============================================================================
  // LOGIN
  // ============================================================================
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      // Firebase authentication
      const credential = await auth.signInWithEmailAndPassword(email, password);
      const token = await credential.user.getIdToken();
      
      // Get user data
      const userData = {
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName,
        photoURL: credential.user.photoURL,
        token,
      };

      // Check if user is admin/staff
      const idTokenResult = await credential.user.getIdTokenResult();
      const isAdmin = idTokenResult.claims.admin || idTokenResult.claims.staff;
      
      if (!isAdmin) {
        throw new Error('Nur Administratoren können sich in der App anmelden');
      }

      // Save token securely
      await setSecureToken(token);
      
      // Save user data
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      // Set user state
      setUser(userData);
      
      // Save password for biometric login (encrypted)
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(`password_${email}`, password);
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // LOGOUT
  // ============================================================================
  const logout = async () => {
    setLoading(true);

    try {
      // Sign out from Firebase
      await auth.signOut();
      
      // Clear stored data
      await clearSecureToken();
      await AsyncStorage.removeItem('userData');
      
      // Clear user state
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // TOKEN VALIDATION
  // ============================================================================
  const validateToken = async (token) => {
    try {
      // This would normally validate with your backend
      // For now, we'll check if the token is still valid with Firebase
      const userData = await AsyncStorage.getItem('userData');
      
      if (userData) {
        return JSON.parse(userData);
      }
      
      return null;
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  };

  // ============================================================================
  // REFRESH TOKEN
  // ============================================================================
  const refreshToken = async () => {
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true);
        await setSecureToken(token);
        
        if (user) {
          setUser({ ...user, token });
        }
        
        return token;
      }
      
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  // ============================================================================
  // UPDATE USER
  // ============================================================================
  const updateUser = async (updates) => {
    try {
      if (auth.currentUser) {
        // Update Firebase profile
        await auth.currentUser.updateProfile(updates);
        
        // Update local user data
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error.message);
      return false;
    }
  };

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================
  const resetPassword = async (email) => {
    try {
      await auth.sendPasswordResetEmail(email);
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error.message);
      return false;
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    refreshToken,
    updateUser,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
};

// ============================================================================
// EXPORT
// ============================================================================
export default AuthContext;