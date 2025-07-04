/**
 * EATECH - Auth Package
 * Version: 1.0.0
 * Description: Authentication provider
 * File Path: /packages/auth/src/index.js
 */

import React, { createContext, useContext, useState } from 'react';

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState({
        uid: 'demo-user',
        email: 'admin@eatech.ch',
        displayName: 'Admin User'
    });
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [loading, setLoading] = useState(false);

    const value = {
        user,
        isAuthenticated,
        loading,
        login: async () => {},
        logout: async () => {},
        signup: async () => {}
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export default AuthProvider;