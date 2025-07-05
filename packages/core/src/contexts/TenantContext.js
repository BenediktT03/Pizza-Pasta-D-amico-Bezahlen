/**
 * EATECH - Multi-Tenant Context Provider
 * Manages tenant isolation and data access across the platform
 * File Path: /packages/core/src/contexts/TenantContext.js
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, onValue, off, set, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

// Create Context
const TenantContext = createContext({});

// Custom Hook
export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};

// Tenant Provider Component
export const TenantProvider = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState(null);
  const [userTenants, setUserTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantData, setTenantData] = useState(null);
  const [permissions, setPermissions] = useState({});
  
  const auth = getAuth();
  const db = getDatabase();
  const navigate = useNavigate();

  // Load user's tenants and permissions
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Load user's tenant associations
          const userTenantsRef = ref(db, `users/${user.uid}/tenants`);
          const snapshot = await get(userTenantsRef);
          
          if (snapshot.exists()) {
            const tenantsData = snapshot.val();
            const tenantsList = Object.entries(tenantsData).map(([tenantId, data]) => ({
              id: tenantId,
              ...data
            }));
            
            setUserTenants(tenantsList);
            
            // Auto-select tenant if only one
            if (tenantsList.length === 1) {
              await selectTenant(tenantsList[0].id);
            } else {
              // Check for saved preference
              const savedTenantId = localStorage.getItem('eatech_current_tenant');
              if (savedTenantId && tenantsList.find(t => t.id === savedTenantId)) {
                await selectTenant(savedTenantId);
              }
            }
          } else {
            // New user without tenants
            setUserTenants([]);
            setCurrentTenant(null);
          }
        } catch (err) {
          console.error('Error loading tenants:', err);
          setError(err.message);
        }
      } else {
        // User logged out
        setUserTenants([]);
        setCurrentTenant(null);
        setTenantData(null);
        setPermissions({});
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [auth, db]);

  // Select and load tenant data
  const selectTenant = async (tenantId) => {
    if (!tenantId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Verify user has access to this tenant
      const userTenantRef = ref(db, `users/${user.uid}/tenants/${tenantId}`);
      const userTenantSnap = await get(userTenantRef);
      
      if (!userTenantSnap.exists()) {
        throw new Error('Access denied to this tenant');
      }
      
      const userTenantData = userTenantSnap.val();
      setPermissions(userTenantData.permissions || {});
      
      // Load tenant info
      const tenantInfoRef = ref(db, `tenants/${tenantId}/info`);
      const tenantInfoSnap = await get(tenantInfoRef);
      
      if (!tenantInfoSnap.exists()) {
        throw new Error('Tenant not found');
      }
      
      const tenantInfo = tenantInfoSnap.val();
      
      // Set current tenant
      setCurrentTenant({
        id: tenantId,
        ...tenantInfo,
        role: userTenantData.role,
        permissions: userTenantData.permissions
      });
      
      setTenantData(tenantInfo);
      
      // Save preference
      localStorage.setItem('eatech_current_tenant', tenantId);
      
      // Subscribe to tenant updates
      const unsubscribeTenant = onValue(tenantInfoRef, (snapshot) => {
        if (snapshot.exists()) {
          const updatedInfo = snapshot.val();
          setTenantData(updatedInfo);
          setCurrentTenant(prev => ({
            ...prev,
            ...updatedInfo
          }));
        }
      });
      
      return () => off(tenantInfoRef, 'value', unsubscribeTenant);
      
    } catch (err) {
      console.error('Error selecting tenant:', err);
      setError(err.message);
      setCurrentTenant(null);
      setTenantData(null);
    } finally {
      setLoading(false);
    }
  };

  // Create new tenant (for new restaurant signup)
  const createTenant = async (tenantData, userRole = 'owner') => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User must be authenticated');
      
      // Generate tenant ID
      const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare tenant data
      const newTenant = {
        id: tenantId,
        name: tenantData.name,
        subdomain: tenantData.subdomain || tenantData.name.toLowerCase().replace(/\s+/g, '-'),
        owner: user.uid,
        plan: tenantData.plan || 'trial',
        status: 'active',
        created: Date.now(),
        updated: Date.now(),
        settings: {
          currency: 'CHF',
          language: 'de',
          timezone: 'Europe/Zurich',
          ...tenantData.settings
        },
        features: {
          maxProducts: 50,
          maxUsers: 5,
          maxOrders: 1000,
          ...getFeaturesByPlan(tenantData.plan || 'trial')
        }
      };
      
      // Create tenant in database
      await set(ref(db, `tenants/${tenantId}/info`), newTenant);
      
      // Add user-tenant association
      await set(ref(db, `users/${user.uid}/tenants/${tenantId}`), {
        role: userRole,
        joined: Date.now(),
        permissions: getRolePermissions(userRole)
      });
      
      // Select the new tenant
      await selectTenant(tenantId);
      
      return tenantId;
      
    } catch (err) {
      console.error('Error creating tenant:', err);
      throw err;
    }
  };

  // Switch between tenants
  const switchTenant = async (tenantId) => {
    if (currentTenant?.id === tenantId) return;
    
    const tenant = userTenants.find(t => t.id === tenantId);
    if (!tenant) {
      throw new Error('Tenant not found in user tenants');
    }
    
    await selectTenant(tenantId);
    
    // Navigate to dashboard
    navigate('/');
  };

  // Check permission
  const hasPermission = (permission) => {
    if (!permissions) return false;
    
    // Owner has all permissions
    if (currentTenant?.role === 'owner') return true;
    
    // Check specific permission
    return permissions[permission] === true;
  };

  // Get tenant-specific database reference
  const getTenantRef = (path) => {
    if (!currentTenant?.id) throw new Error('No tenant selected');
    return ref(db, `tenants/${currentTenant.id}/${path}`);
  };

  // Helper functions
  const getFeaturesByPlan = (plan) => {
    const features = {
      trial: {
        maxProducts: 50,
        maxUsers: 5,
        maxOrders: 100,
        maxTables: 10,
        analytics: false,
        api: false,
        whiteLabel: false
      },
      basic: {
        maxProducts: 100,
        maxUsers: 10,
        maxOrders: 1000,
        maxTables: 25,
        analytics: true,
        api: false,
        whiteLabel: false
      },
      pro: {
        maxProducts: 500,
        maxUsers: 25,
        maxOrders: 10000,
        maxTables: 100,
        analytics: true,
        api: true,
        whiteLabel: false
      },
      enterprise: {
        maxProducts: -1, // unlimited
        maxUsers: -1,
        maxOrders: -1,
        maxTables: -1,
        analytics: true,
        api: true,
        whiteLabel: true
      }
    };
    
    return features[plan] || features.trial;
  };

  const getRolePermissions = (role) => {
    const permissions = {
      owner: {
        all: true
      },
      admin: {
        products: true,
        orders: true,
        customers: true,
        staff: true,
        settings: true,
        analytics: true,
        billing: false
      },
      manager: {
        products: true,
        orders: true,
        customers: true,
        staff: false,
        settings: false,
        analytics: true,
        billing: false
      },
      staff: {
        products: false,
        orders: true,
        customers: false,
        staff: false,
        settings: false,
        analytics: false,
        billing: false
      }
    };
    
    return permissions[role] || {};
  };

  // Context value
  const value = {
    // State
    currentTenant,
    userTenants,
    loading,
    error,
    tenantData,
    permissions,
    
    // Actions
    selectTenant,
    createTenant,
    switchTenant,
    hasPermission,
    getTenantRef,
    
    // Helpers
    isOwner: currentTenant?.role === 'owner',
    isAdmin: ['owner', 'admin'].includes(currentTenant?.role),
    canManageProducts: hasPermission('products'),
    canManageOrders: hasPermission('orders'),
    canManageStaff: hasPermission('staff'),
    canViewAnalytics: hasPermission('analytics'),
    canManageBilling: hasPermission('billing')
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContext;