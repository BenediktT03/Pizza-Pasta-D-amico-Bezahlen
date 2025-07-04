/**
 * EATECH - Tenant Context (Simplified)
 * Version: 1.0.0
 * Description: Multi-tenant context provider
 * File Path: /packages/core/src/contexts/TenantContext.jsx
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

// Create context
const TenantContext = createContext();

// Provider component
export const TenantProvider = ({ children }) => {
    const [tenant, setTenant] = useState({
        id: 'demo',
        name: 'Demo Restaurant',
        subdomain: 'demo',
        features: {
            inventory: true,
            loyalty: true,
            analytics: true
        }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // For now, just provide mock data
    const value = {
        tenant,
        loading,
        error,
        isLandingPage: false,
        isMasterAdmin: false
    };

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
};

// Hook to use tenant context
export const useTenant = () => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant must be used within TenantProvider');
    }
    return context;
};