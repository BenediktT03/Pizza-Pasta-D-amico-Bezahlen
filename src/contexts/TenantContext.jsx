/**
 * EATECH - Tenant Context Provider
 * Version: 5.0.0
 * Description: Multi-Tenant Context für subdomain-basiertes Routing und
 *              tenant-spezifische Konfiguration
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/contexts/TenantContext.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { database } from '../config/firebase';
import { logError } from '../utils/monitoring';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
const TenantContext = createContext(null);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Extrahiert Subdomain aus der aktuellen URL
 * @returns {string|null} Subdomain oder null
 */
const getSubdomain = () => {
    const hostname = window.location.hostname;
    
    // Localhost development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Check for subdomain in dev mode via URL param
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('tenant') || 'demo';
    }
    
    // Production subdomain extraction
    const parts = hostname.split('.');
    
    // master.eatech.ch oder tenant.eatech.ch
    if (parts.length >= 3 || (parts.length === 2 && !parts[0].includes('eatech'))) {
        return parts[0];
    }
    
    // Keine Subdomain = Hauptseite
    return null;
};

/**
 * Lädt Tenant-Theme und wendet es an
 * @param {Object} theme - Theme-Konfiguration
 */
const applyTenantTheme = (theme) => {
    if (!theme) return;
    
    const root = document.documentElement;
    
    // Apply CSS variables
    Object.entries(theme).forEach(([key, value]) => {
        if (key.startsWith('--')) {
            root.style.setProperty(key, value);
        }
    });
    
    // Apply theme class
    if (theme.mode) {
        root.setAttribute('data-theme', theme.mode);
    }
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================
export const TenantProvider = ({ children }) => {
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [features, setFeatures] = useState({});
    
    /**
     * Lädt Tenant-Daten aus Firebase
     */
    const loadTenant = useCallback(async (subdomain) => {
        try {
            setLoading(true);
            setError(null);
            
            // Master admin special case
            if (subdomain === 'master') {
                setTenant({
                    id: 'master',
                    name: 'Master Control',
                    type: 'master',
                    subdomain: 'master',
                    features: {
                        globalDashboard: true,
                        tenantManagement: true,
                        systemMonitoring: true,
                        billing: true
                    }
                });
                setLoading(false);
                return;
            }
            
            // Load tenant from database
            const tenantSnapshot = await database
                .ref('tenants')
                .orderByChild('subdomain')
                .equalTo(subdomain)
                .once('value');
                
            const tenantData = tenantSnapshot.val();
            
            if (!tenantData) {
                throw new Error('Tenant not found');
            }
            
            // Get first (and should be only) tenant
            const tenantId = Object.keys(tenantData)[0];
            const tenant = {
                id: tenantId,
                ...tenantData[tenantId]
            };
            
            // Validate tenant status
            if (tenant.status !== 'active') {
                throw new Error('Tenant is not active');
            }
            
            // Apply tenant theme
            if (tenant.theme) {
                applyTenantTheme(tenant.theme);
            }
            
            // Load tenant features
            const featuresSnapshot = await database
                .ref(`tenant_features/${tenantId}`)
                .once('value');
                
            setFeatures(featuresSnapshot.val() || {});
            setTenant(tenant);
            
            // Subscribe to real-time updates
            subscribeToTenantUpdates(tenantId);
            
        } catch (err) {
            logError('TenantContext.loadTenant', err);
            setError(err.message);
            
            // Redirect to main page on error
            if (subdomain && subdomain !== 'demo') {
                setTimeout(() => {
                    window.location.href = 'https://eatech.ch';
                }, 3000);
            }
        } finally {
            setLoading(false);
        }
    }, []);
    
    /**
     * Subscribes to real-time tenant updates
     */
    const subscribeToTenantUpdates = useCallback((tenantId) => {
        // Listen for tenant data changes
        const tenantRef = database.ref(`tenants/${tenantId}`);
        tenantRef.on('value', (snapshot) => {
            const updatedData = snapshot.val();
            if (updatedData) {
                setTenant(prev => ({
                    ...prev,
                    ...updatedData
                }));
                
                // Re-apply theme if changed
                if (updatedData.theme) {
                    applyTenantTheme(updatedData.theme);
                }
            }
        });
        
        // Listen for feature changes
        const featuresRef = database.ref(`tenant_features/${tenantId}`);
        featuresRef.on('value', (snapshot) => {
            setFeatures(snapshot.val() || {});
        });
        
        // Cleanup function
        return () => {
            tenantRef.off();
            featuresRef.off();
        };
    }, []);
    
    /**
     * Checks if a feature is enabled for the current tenant
     */
    const hasFeature = useCallback((featureName) => {
        if (!tenant) return false;
        
        // Master has all features
        if (tenant.type === 'master') return true;
        
        // Check tenant plan
        if (tenant.plan) {
            const planFeatures = {
                basic: ['orders', 'menu', 'basic_analytics'],
                professional: ['orders', 'menu', 'inventory', 'analytics', 'loyalty'],
                enterprise: ['all']
            };
            
            if (tenant.plan === 'enterprise' || planFeatures[tenant.plan]?.includes('all')) {
                return true;
            }
            
            if (planFeatures[tenant.plan]?.includes(featureName)) {
                return true;
            }
        }
        
        // Check individual features
        return features[featureName] === true;
    }, [tenant, features]);
    
    /**
     * Updates tenant settings
     */
    const updateTenantSettings = useCallback(async (updates) => {
        if (!tenant || tenant.type === 'master') return;
        
        try {
            await database.ref(`tenants/${tenant.id}`).update({
                ...updates,
                updatedAt: Date.now()
            });
            
            // If theme updated, apply immediately
            if (updates.theme) {
                applyTenantTheme(updates.theme);
            }
            
            return true;
        } catch (err) {
            logError('TenantContext.updateTenantSettings', err);
            throw err;
        }
    }, [tenant]);
    
    /**
     * Gets tenant-specific configuration
     */
    const getTenantConfig = useCallback((key, defaultValue = null) => {
        if (!tenant) return defaultValue;
        
        return tenant.config?.[key] || defaultValue;
    }, [tenant]);
    
    // ============================================================================
    // EFFECTS
    // ============================================================================
    
    // Initial load
    useEffect(() => {
        const subdomain = getSubdomain();
        
        if (subdomain) {
            loadTenant(subdomain);
        } else {
            // No subdomain = landing page
            setTenant({
                id: 'landing',
                name: 'EATECH',
                type: 'landing',
                subdomain: null
            });
            setLoading(false);
        }
    }, [loadTenant]);
    
    // ============================================================================
    // CONTEXT VALUE
    // ============================================================================
    const value = {
        tenant,
        loading,
        error,
        features,
        hasFeature,
        updateTenantSettings,
        getTenantConfig,
        isLandingPage: !tenant || tenant.type === 'landing',
        isMasterAdmin: tenant?.type === 'master',
        reload: () => loadTenant(getSubdomain())
    };
    
    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================
export const useTenant = () => {
    const context = useContext(TenantContext);
    
    if (!context) {
        throw new Error('useTenant must be used within TenantProvider');
    }
    
    return context;
};

// ============================================================================
// EXPORT
// ============================================================================
export default TenantContext;