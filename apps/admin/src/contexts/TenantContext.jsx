/**
 * EATECH - Tenant Context
 * File Path: /apps/admin/src/contexts/TenantContext.jsx
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTenant = async () => {
      try {
        // Mock tenant data for now
        const mockTenant = {
          id: 'demo-restaurant',
          name: 'Demo Restaurant',
          subdomain: 'demo',
          plan: 'premium',
          features: ['orders', 'inventory', 'analytics', 'loyalty'],
          settings: {
            currency: 'CHF',
            language: 'de-CH',
            timezone: 'Europe/Zurich',
            theme: 'sunset-grill'
          },
          branding: {
            logo: '/logo.png',
            primaryColor: '#FF6B6B',
            secondaryColor: '#4ECDC4'
          }
        };
        
        setTenant(mockTenant);
      } catch (err) {
        console.error('Failed to load tenant:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadTenant();
  }, []);

  const updateTenantSettings = async (settings) => {
    try {
      // TODO: Update in Firebase
      setTenant(prev => ({
        ...prev,
        settings: { ...prev.settings, ...settings }
      }));
    } catch (err) {
      console.error('Failed to update tenant settings:', err);
      throw err;
    }
  };

  const hasFeature = (feature) => {
    return tenant?.features?.includes(feature) || false;
  };

  const value = {
    tenant,
    loading,
    error,
    updateTenantSettings,
    hasFeature
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};

export default TenantContext;