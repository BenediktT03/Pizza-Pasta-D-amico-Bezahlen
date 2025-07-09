import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

class FeatureFlagManager {
  constructor() {
    this.flags = new Map();
    this.listeners = new Map();
    this.tenantOverrides = new Map();
    this.initialized = false;
    this.unsubscribers = [];
  }

  async init(tenantId = null) {
    try {
      // Load global flags
      const globalDoc = await getDoc(doc(db, 'featureFlags', 'global'));
      if (globalDoc.exists()) {
        const globalFlags = globalDoc.data();
        Object.entries(globalFlags).forEach(([key, value]) => {
          this.flags.set(key, value);
        });
      } else {
        // Initialize with default flags if document doesn't exist
        await this.initializeDefaultFlags();
      }

      // Load tenant-specific overrides
      if (tenantId) {
        const tenantDoc = await getDoc(doc(db, 'featureFlags', tenantId));
        if (tenantDoc.exists()) {
          this.tenantOverrides.set(tenantId, tenantDoc.data());
        }
      }

      // Setup real-time updates
      this.setupRealtimeUpdates(tenantId);

      this.initialized = true;
      this.notifyListeners();
    } catch (error) {
      console.error('Error initializing feature flags:', error);
      // Use default flags on error
      this.setDefaultFlags();
      this.initialized = true;
    }
  }

  async initializeDefaultFlags() {
    const defaultFlags = {
      // Core Features
      multiTenant: true,
      pwa: true,
      offlineMode: true,

      // AI Features
      voiceCommerce: false,
      aiPricing: false,
      emergencyAI: false,
      demandForecasting: false,
      intelligentWaitTimes: false,

      // Event Features
      eventManagement: true,
      multiDayEvents: false,
      festivalAnalytics: false,
      locationIntelligence: false,

      // Advanced Features
      blockchain: false,
      edgeComputing: false,
      arMenuPreview: false,

      // Analytics
      advancedAnalytics: true,
      heatmaps: false,
      abTesting: false,

      // Payment & Financial
      cryptoPayments: false,
      dynamicPricing: false,
      subscriptionModel: false,

      // Operational
      kitchenDisplay: true,
      inventoryManagement: true,
      staffManagement: true,

      // Marketing
      loyaltyProgram: true,
      referralSystem: false,
      socialFeatures: false,

      // Experimental
      meshNetworking: false,
      quantumEncryption: false,
      holographicDisplay: false
    };

    await setDoc(doc(db, 'featureFlags', 'global'), defaultFlags);

    Object.entries(defaultFlags).forEach(([key, value]) => {
      this.flags.set(key, value);
    });
  }

  setDefaultFlags() {
    // Fallback flags when Firebase is unavailable
    const essentialFlags = {
      multiTenant: true,
      pwa: true,
      offlineMode: true,
      kitchenDisplay: true,
      inventoryManagement: true,
      staffManagement: true,
      loyaltyProgram: true,
      advancedAnalytics: true,
      eventManagement: true
    };

    Object.entries(essentialFlags).forEach(([key, value]) => {
      this.flags.set(key, value);
    });
  }

  setupRealtimeUpdates(tenantId = null) {
    // Listen for global flag changes
    const globalUnsubscribe = onSnapshot(
      doc(db, 'featureFlags', 'global'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          Object.entries(data).forEach(([key, value]) => {
            const oldValue = this.flags.get(key);
            if (oldValue !== value) {
              this.flags.set(key, value);
              this.notifyListeners(key, value, oldValue);
            }
          });
        }
      },
      (error) => {
        console.error('Error listening to global feature flags:', error);
      }
    );

    this.unsubscribers.push(globalUnsubscribe);

    // Listen for tenant-specific flag changes
    if (tenantId) {
      const tenantUnsubscribe = onSnapshot(
        doc(db, 'featureFlags', tenantId),
        (doc) => {
          if (doc.exists()) {
            const oldOverrides = this.tenantOverrides.get(tenantId) || {};
            const newOverrides = doc.data();
            this.tenantOverrides.set(tenantId, newOverrides);

            // Notify about changed overrides
            Object.keys({ ...oldOverrides, ...newOverrides }).forEach(key => {
              if (oldOverrides[key] !== newOverrides[key]) {
                this.notifyListeners(key, this.isEnabled(key, tenantId), oldOverrides[key]);
              }
            });
          }
        },
        (error) => {
          console.error('Error listening to tenant feature flags:', error);
        }
      );

      this.unsubscribers.push(tenantUnsubscribe);
    }
  }

  isEnabled(flagName, tenantId = null) {
    // Check if initialized
    if (!this.initialized) {
      console.warn('Feature flags not initialized, using defaults');
      return false;
    }

    // Check tenant override first
    if (tenantId && this.tenantOverrides.has(tenantId)) {
      const overrides = this.tenantOverrides.get(tenantId);
      if (overrides && overrides[flagName] !== undefined) {
        return overrides[flagName];
      }
    }

    // Fall back to global flag
    return this.flags.get(flagName) || false;
  }

  async setFlag(flagName, value, tenantId = null) {
    try {
      const docRef = doc(db, 'featureFlags', tenantId || 'global');

      // Check if document exists
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Update existing document
        await updateDoc(docRef, {
          [flagName]: value,
          [`metadata.${flagName}.updatedAt`]: new Date().toISOString(),
          [`metadata.${flagName}.updatedBy`]: 'system' // In production, get from auth
        });
      } else {
        // Create new document
        await setDoc(docRef, {
          [flagName]: value,
          metadata: {
            [flagName]: {
              updatedAt: new Date().toISOString(),
              updatedBy: 'system'
            }
          }
        });
      }

      // Update local cache immediately
      if (tenantId) {
        const overrides = this.tenantOverrides.get(tenantId) || {};
        overrides[flagName] = value;
        this.tenantOverrides.set(tenantId, overrides);
      } else {
        this.flags.set(flagName, value);
      }

      this.notifyListeners(flagName, value);
    } catch (error) {
      console.error('Error setting feature flag:', error);
      throw error;
    }
  }

  async bulkSetFlags(flags, tenantId = null) {
    try {
      const docRef = doc(db, 'featureFlags', tenantId || 'global');
      const updates = { ...flags };

      // Add metadata for each flag
      Object.keys(flags).forEach(flagName => {
        updates[`metadata.${flagName}.updatedAt`] = new Date().toISOString();
        updates[`metadata.${flagName}.updatedBy`] = 'system';
      });

      await updateDoc(docRef, updates);

      // Update local cache
      if (tenantId) {
        const overrides = this.tenantOverrides.get(tenantId) || {};
        Object.assign(overrides, flags);
        this.tenantOverrides.set(tenantId, overrides);
      } else {
        Object.entries(flags).forEach(([key, value]) => {
          this.flags.set(key, value);
        });
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Error bulk setting feature flags:', error);
      throw error;
    }
  }

  getAllFlags(tenantId = null) {
    const globalFlags = Object.fromEntries(this.flags);

    if (tenantId && this.tenantOverrides.has(tenantId)) {
      return { ...globalFlags, ...this.tenantOverrides.get(tenantId) };
    }

    return globalFlags;
  }

  subscribe(callback) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, callback);

    // Return unsubscribe function
    return () => this.listeners.delete(id);
  }

  notifyListeners(flagName = null, newValue = null, oldValue = null) {
    this.listeners.forEach(callback => {
      try {
        callback({
          flagName,
          newValue,
          oldValue,
          allFlags: this.getAllFlags()
        });
      } catch (error) {
        console.error('Error in feature flag listener:', error);
      }
    });
  }

  async waitForInitialization(timeout = 5000) {
    const startTime = Date.now();

    while (!this.initialized) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Feature flags initialization timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  cleanup() {
    // Unsubscribe from all listeners
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    // Clear all data
    this.flags.clear();
    this.listeners.clear();
    this.tenantOverrides.clear();
    this.initialized = false;
  }
}

// Create singleton instance
export const featureFlags = new FeatureFlagManager();

// React Hook for feature flags
export const useFeatureFlag = (flagName, tenantId = null) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial check
    const checkFlag = async () => {
      await featureFlags.waitForInitialization();
      setIsEnabled(featureFlags.isEnabled(flagName, tenantId));
      setIsLoading(false);
    };

    checkFlag();

    // Subscribe to changes
    const unsubscribe = featureFlags.subscribe(({ flagName: changedFlag }) => {
      if (changedFlag === flagName || changedFlag === null) {
        setIsEnabled(featureFlags.isEnabled(flagName, tenantId));
      }
    });

    return unsubscribe;
  }, [flagName, tenantId]);

  return { isEnabled, isLoading };
};

// Utility to check multiple flags at once
export const useFeatureFlags = (flagNames, tenantId = null) => {
  const [flags, setFlags] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFlags = async () => {
      await featureFlags.waitForInitialization();
      const flagStates = {};
      flagNames.forEach(flagName => {
        flagStates[flagName] = featureFlags.isEnabled(flagName, tenantId);
      });
      setFlags(flagStates);
      setIsLoading(false);
    };

    checkFlags();

    const unsubscribe = featureFlags.subscribe(() => {
      const flagStates = {};
      flagNames.forEach(flagName => {
        flagStates[flagName] = featureFlags.isEnabled(flagName, tenantId);
      });
      setFlags(flagStates);
    });

    return unsubscribe;
  }, [flagNames, tenantId]);

  return { flags, isLoading };
};
