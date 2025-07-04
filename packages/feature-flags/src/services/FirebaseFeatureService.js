/**
 * EATECH - Firebase Feature Service
 * Version: 13.0.0
 * Description: Realtime Feature Flag Management mit Firebase
 * Author: EATECH Development Team
 * Created: 2025-01-04
 * File Path: /packages/feature-flags/src/services/FirebaseFeatureService.js
 */

import { 
    getDatabase, 
    ref, 
    onValue, 
    set, 
    update,
    push,
    serverTimestamp,
    off
} from 'firebase/database';

// ============================================================================
// FEATURE SERVICE CLASS
// ============================================================================

export class FirebaseFeatureService {
    constructor(tenantId = null) {
        this.db = getDatabase();
        this.tenantId = tenantId;
        this.listeners = new Map();
        this.cache = new Map();
        this.callbacks = new Map();
    }

    // ========================================================================
    // FEATURE FLAG METHODS
    // ========================================================================

    /**
     * Get all feature flags with realtime updates
     */
    subscribeToFeatures(callback) {
        const featuresRef = ref(this.db, 'features');
        
        const unsubscribe = onValue(featuresRef, (snapshot) => {
            const features = snapshot.val() || {};
            
            // Transform to expected format
            const transformedFeatures = {};
            Object.entries(features).forEach(([key, feature]) => {
                transformedFeatures[key] = {
                    ...feature,
                    id: key,
                    // Apply tenant overrides if available
                    enabled: this.getTenantOverride(key, feature)
                };
            });
            
            this.cache.set('features', transformedFeatures);
            callback(transformedFeatures);
        }, (error) => {
            console.error('Error fetching features:', error);
            callback({}, error);
        });

        // Store listener for cleanup
        this.listeners.set('features', { ref: featuresRef, callback: unsubscribe });
        
        return () => this.unsubscribe('features');
    }

    /**
     * Update a single feature flag
     */
    async updateFeature(featureKey, updates) {
        try {
            const featureRef = ref(this.db, `features/${featureKey}`);
            
            const updateData = {
                ...updates,
                lastModified: serverTimestamp(),
                modifiedBy: this.getCurrentUser()
            };
            
            await update(featureRef, updateData);
            
            // Log the change
            await this.logFeatureChange(featureKey, updates);
            
            return { success: true };
        } catch (error) {
            console.error('Error updating feature:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Bulk update features
     */
    async bulkUpdateFeatures(featureUpdates) {
        try {
            const updates = {};
            const timestamp = serverTimestamp();
            const user = this.getCurrentUser();
            
            Object.entries(featureUpdates).forEach(([key, value]) => {
                updates[`features/${key}`] = {
                    ...value,
                    lastModified: timestamp,
                    modifiedBy: user
                };
            });
            
            await update(ref(this.db), updates);
            
            // Log all changes
            await Promise.all(
                Object.entries(featureUpdates).map(([key, value]) => 
                    this.logFeatureChange(key, value)
                )
            );
            
            return { success: true };
        } catch (error) {
            console.error('Error bulk updating features:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================================================
    // TENANT OVERRIDE METHODS
    // ========================================================================

    /**
     * Get tenant-specific overrides
     */
    getTenantOverride(featureKey, feature) {
        if (!this.tenantId) return feature.enabled;
        
        const tenantOverrides = feature.tenantOverrides || {};
        return tenantOverrides[this.tenantId] !== undefined 
            ? tenantOverrides[this.tenantId] 
            : feature.enabled;
    }

    /**
     * Update tenant-specific feature override
     */
    async updateTenantOverride(tenantId, featureKey, enabled) {
        try {
            const overrideRef = ref(this.db, `features/${featureKey}/tenantOverrides/${tenantId}`);
            await set(overrideRef, enabled);
            
            // Log tenant override
            await this.logTenantOverride(tenantId, featureKey, enabled);
            
            return { success: true };
        } catch (error) {
            console.error('Error updating tenant override:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Bulk update tenant overrides
     */
    async bulkUpdateTenantOverrides(tenantId, overrides) {
        try {
            const updates = {};
            
            Object.entries(overrides).forEach(([featureKey, enabled]) => {
                updates[`features/${featureKey}/tenantOverrides/${tenantId}`] = enabled;
            });
            
            await update(ref(this.db), updates);
            
            return { success: true };
        } catch (error) {
            console.error('Error bulk updating tenant overrides:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================================================
    // TENANT MANAGEMENT
    // ========================================================================

    /**
     * Subscribe to tenant list
     */
    subscribeToTenants(callback) {
        const tenantsRef = ref(this.db, 'tenants');
        
        const unsubscribe = onValue(tenantsRef, (snapshot) => {
            const tenants = snapshot.val() || {};
            
            // Transform to array with computed properties
            const tenantList = Object.entries(tenants).map(([id, tenant]) => ({
                id,
                ...tenant,
                activeFeatures: this.countActiveFeaturesForTenant(id),
                customOverrides: this.countCustomOverridesForTenant(id)
            }));
            
            callback(tenantList);
        }, (error) => {
            console.error('Error fetching tenants:', error);
            callback([], error);
        });

        this.listeners.set('tenants', { ref: tenantsRef, callback: unsubscribe });
        
        return () => this.unsubscribe('tenants');
    }

    /**
     * Create new tenant
     */
    async createTenant(tenantData) {
        try {
            const tenantsRef = ref(this.db, 'tenants');
            const newTenantRef = push(tenantsRef);
            
            await set(newTenantRef, {
                ...tenantData,
                created: serverTimestamp(),
                createdBy: this.getCurrentUser()
            });
            
            return { success: true, id: newTenantRef.key };
        } catch (error) {
            console.error('Error creating tenant:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================================================
    // ANALYTICS & LOGGING
    // ========================================================================

    /**
     * Log feature change for audit trail
     */
    async logFeatureChange(featureKey, changes) {
        try {
            const logsRef = ref(this.db, 'featureLogs');
            const newLogRef = push(logsRef);
            
            await set(newLogRef, {
                featureKey,
                changes,
                timestamp: serverTimestamp(),
                user: this.getCurrentUser(),
                tenantId: this.tenantId
            });
        } catch (error) {
            console.error('Error logging feature change:', error);
        }
    }

    /**
     * Log tenant override change
     */
    async logTenantOverride(tenantId, featureKey, enabled) {
        try {
            const logsRef = ref(this.db, 'tenantOverrideLogs');
            const newLogRef = push(logsRef);
            
            await set(newLogRef, {
                tenantId,
                featureKey,
                enabled,
                timestamp: serverTimestamp(),
                user: this.getCurrentUser()
            });
        } catch (error) {
            console.error('Error logging tenant override:', error);
        }
    }

    /**
     * Get feature usage statistics
     */
    async getFeatureStats(featureKey) {
        // This would connect to your analytics service
        // For now, return mock data
        return {
            totalUses: Math.floor(Math.random() * 10000),
            uniqueUsers: Math.floor(Math.random() * 1000),
            avgUsagePerDay: Math.floor(Math.random() * 100),
            trend: Math.random() > 0.5 ? 'up' : 'down'
        };
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Count active features for a tenant
     */
    countActiveFeaturesForTenant(tenantId) {
        const features = this.cache.get('features') || {};
        let count = 0;
        
        Object.values(features).forEach(feature => {
            const enabled = feature.tenantOverrides?.[tenantId] !== undefined
                ? feature.tenantOverrides[tenantId]
                : feature.enabled;
            if (enabled) count++;
        });
        
        return count;
    }

    /**
     * Count custom overrides for a tenant
     */
    countCustomOverridesForTenant(tenantId) {
        const features = this.cache.get('features') || {};
        let count = 0;
        
        Object.values(features).forEach(feature => {
            if (feature.tenantOverrides?.[tenantId] !== undefined) {
                count++;
            }
        });
        
        return count;
    }

    /**
     * Get current user (would come from auth context)
     */
    getCurrentUser() {
        // TODO: Get from auth context
        return 'current-user@eatech.ch';
    }

    /**
     * Unsubscribe from a listener
     */
    unsubscribe(key) {
        const listener = this.listeners.get(key);
        if (listener) {
            off(listener.ref, 'value', listener.callback);
            this.listeners.delete(key);
        }
    }

    /**
     * Cleanup all listeners
     */
    cleanup() {
        this.listeners.forEach((listener, key) => {
            this.unsubscribe(key);
        });
        this.cache.clear();
        this.callbacks.clear();
    }

    // ========================================================================
    // EXPORT/IMPORT
    // ========================================================================

    /**
     * Export features configuration
     */
    async exportFeatures(featureKeys = null) {
        const features = this.cache.get('features') || {};
        
        const exportData = {
            version: '13.0.0',
            exportDate: new Date().toISOString(),
            exportedBy: this.getCurrentUser(),
            features: featureKeys 
                ? Object.fromEntries(
                    Object.entries(features).filter(([key]) => featureKeys.includes(key))
                  )
                : features
        };
        
        return exportData;
    }

    /**
     * Import features configuration
     */
    async importFeatures(importData) {
        try {
            const { features } = importData;
            const updates = {};
            const timestamp = serverTimestamp();
            const user = this.getCurrentUser();
            
            Object.entries(features).forEach(([key, feature]) => {
                updates[`features/${key}`] = {
                    ...feature,
                    lastModified: timestamp,
                    modifiedBy: user,
                    importedAt: timestamp
                };
            });
            
            await update(ref(this.db), updates);
            
            return { success: true, imported: Object.keys(features).length };
        } catch (error) {
            console.error('Error importing features:', error);
            return { success: false, error: error.message };
        }
    }
}

// ============================================================================
// REACT HOOK
// ============================================================================

export function useFirebaseFeatures(tenantId = null) {
    const [features, setFeatures] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const serviceRef = useRef(null);

    useEffect(() => {
        // Create service instance
        serviceRef.current = new FirebaseFeatureService(tenantId);
        
        // Subscribe to features
        const unsubscribe = serviceRef.current.subscribeToFeatures((data, err) => {
            if (err) {
                setError(err);
                setLoading(false);
                return;
            }
            
            setFeatures(data);
            setError(null);
            setLoading(false);
        });
        
        // Cleanup
        return () => {
            unsubscribe();
            if (serviceRef.current) {
                serviceRef.current.cleanup();
            }
        };
    }, [tenantId]);

    const updateFeature = useCallback(async (featureKey, updates) => {
        if (!serviceRef.current) return { success: false };
        return await serviceRef.current.updateFeature(featureKey, updates);
    }, []);

    const updateTenantOverride = useCallback(async (tenantId, featureKey, enabled) => {
        if (!serviceRef.current) return { success: false };
        return await serviceRef.current.updateTenantOverride(tenantId, featureKey, enabled);
    }, []);

    return {
        features,
        loading,
        error,
        updateFeature,
        updateTenantOverride,
        service: serviceRef.current
    };
}

// Helper to convert between Firebase keys and display keys
const convertKey = {
    toFirebase: (key) => key.replace(/\./g, '_'),
    fromFirebase: (key) => key.replace(/_/g, '.')
};

// In der subscribeToFeatures Methode:
const transformedFeatures = {};
Object.entries(features).forEach(([firebaseKey, feature]) => {
    const displayKey = feature.id || convertKey.fromFirebase(firebaseKey);
    transformedFeatures[displayKey] = {
        ...feature,
        id: displayKey,
        enabled: this.getTenantOverride(firebaseKey, feature)
    };
});

// ============================================================================
// EXPORT
// ============================================================================

export default FirebaseFeatureService;