/**
 * EATECH Master Store
 * Version: 1.0.0
 * 
 * Zentrales State Management mit Zustand
 * Features:
 * - Global state für Master Control
 * - Persist middleware für localStorage
 * - Devtools integration
 * - TypeScript ready
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /apps/master/src/store/index.js
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// INITIAL STATES
// ============================================================================
const initialAuthState = {
  user: null,
  isAuthenticated: false,
  token: null,
  permissions: [],
  lastLogin: null,
  sessionExpiry: null
};

const initialSystemState = {
  status: 'operational', // operational, degraded, maintenance, outage
  metrics: {
    cpu: 0,
    memory: 0,
    activeUsers: 0,
    requestsPerMinute: 0,
    responseTime: 0,
    errorRate: 0
  },
  alerts: [],
  services: {},
  lastUpdate: null
};

const initialTenantState = {
  tenants: [],
  selectedTenant: null,
  filters: {
    status: 'all',
    plan: 'all',
    search: ''
  },
  stats: {
    total: 0,
    active: 0,
    trial: 0,
    suspended: 0
  },
  loading: false,
  error: null
};

const initialUIState = {
  theme: 'dark',
  sidebarCollapsed: false,
  language: 'de',
  notifications: [],
  modals: {
    tenantDetails: false,
    systemSettings: false,
    alertDetails: false
  },
  tables: {
    tenantsPerPage: 20,
    alertsPerPage: 10,
    logsPerPage: 50
  }
};

const initialAnalyticsState = {
  dateRange: 'last7days',
  compareMode: false,
  metrics: {
    revenue: { current: 0, previous: 0, trend: 0 },
    orders: { current: 0, previous: 0, trend: 0 },
    users: { current: 0, previous: 0, trend: 0 },
    conversion: { current: 0, previous: 0, trend: 0 }
  },
  charts: {},
  loading: false
};

const initialFeatureState = {
  features: {},
  globalFlags: {},
  experiments: [],
  overrides: {},
  changelog: []
};

// ============================================================================
// STORE SLICES
// ============================================================================

/**
 * Auth Store Slice
 */
const createAuthSlice = (set, get) => ({
  ...initialAuthState,
  
  login: (userData) => set((state) => {
    state.user = userData.user;
    state.token = userData.token;
    state.permissions = userData.permissions || [];
    state.isAuthenticated = true;
    state.lastLogin = new Date().toISOString();
    state.sessionExpiry = new Date(Date.now() + (userData.expiresIn || 3600000)).toISOString();
  }),
  
  logout: () => set((state) => {
    Object.assign(state, initialAuthState);
  }),
  
  updateSession: () => set((state) => {
    if (state.sessionExpiry) {
      const now = new Date();
      const expiry = new Date(state.sessionExpiry);
      if (now >= expiry) {
        Object.assign(state, initialAuthState);
      }
    }
  }),
  
  hasPermission: (permission) => {
    const { permissions, user } = get();
    return user?.role === 'superadmin' || permissions.includes(permission);
  }
});

/**
 * System Store Slice
 */
const createSystemSlice = (set, get) => ({
  ...initialSystemState,
  
  updateSystemStatus: (status) => set((state) => {
    state.status = status;
    state.lastUpdate = new Date().toISOString();
  }),
  
  updateMetrics: (metrics) => set((state) => {
    Object.assign(state.metrics, metrics);
    state.lastUpdate = new Date().toISOString();
  }),
  
  addAlert: (alert) => set((state) => {
    state.alerts.unshift({
      ...alert,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      acknowledged: false
    });
    
    // Keep only last 100 alerts
    if (state.alerts.length > 100) {
      state.alerts = state.alerts.slice(0, 100);
    }
  }),
  
  acknowledgeAlert: (alertId) => set((state) => {
    const alert = state.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
    }
  }),
  
  dismissAlert: (alertId) => set((state) => {
    state.alerts = state.alerts.filter(a => a.id !== alertId);
  }),
  
  updateServiceStatus: (serviceId, status) => set((state) => {
    state.services[serviceId] = {
      ...state.services[serviceId],
      status,
      lastCheck: new Date().toISOString()
    };
  })
});

/**
 * Tenant Store Slice
 */
const createTenantSlice = (set, get) => ({
  ...initialTenantState,
  
  setTenants: (tenants) => set((state) => {
    state.tenants = tenants;
    state.stats = {
      total: tenants.length,
      active: tenants.filter(t => t.status === 'active').length,
      trial: tenants.filter(t => t.status === 'trial').length,
      suspended: tenants.filter(t => t.status === 'suspended').length
    };
  }),
  
  selectTenant: (tenantId) => set((state) => {
    state.selectedTenant = state.tenants.find(t => t.id === tenantId) || null;
  }),
  
  updateTenant: (tenantId, updates) => set((state) => {
    const index = state.tenants.findIndex(t => t.id === tenantId);
    if (index !== -1) {
      state.tenants[index] = { ...state.tenants[index], ...updates };
      if (state.selectedTenant?.id === tenantId) {
        state.selectedTenant = { ...state.selectedTenant, ...updates };
      }
    }
  }),
  
  setFilter: (filterType, value) => set((state) => {
    state.filters[filterType] = value;
  }),
  
  setLoading: (loading) => set((state) => {
    state.loading = loading;
  }),
  
  setError: (error) => set((state) => {
    state.error = error;
  }),
  
  getFilteredTenants: () => {
    const { tenants, filters } = get();
    return tenants.filter(tenant => {
      if (filters.status !== 'all' && tenant.status !== filters.status) return false;
      if (filters.plan !== 'all' && tenant.plan !== filters.plan) return false;
      if (filters.search && !tenant.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }
});

/**
 * UI Store Slice
 */
const createUISlice = (set, get) => ({
  ...initialUIState,
  
  toggleTheme: () => set((state) => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
  }),
  
  toggleSidebar: () => set((state) => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
  }),
  
  setLanguage: (language) => set((state) => {
    state.language = language;
  }),
  
  addNotification: (notification) => set((state) => {
    state.notifications.unshift({
      ...notification,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false
    });
    
    // Keep only last 50 notifications
    if (state.notifications.length > 50) {
      state.notifications = state.notifications.slice(0, 50);
    }
  }),
  
  markNotificationRead: (notificationId) => set((state) => {
    const notification = state.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }),
  
  clearNotifications: () => set((state) => {
    state.notifications = [];
  }),
  
  openModal: (modalName) => set((state) => {
    state.modals[modalName] = true;
  }),
  
  closeModal: (modalName) => set((state) => {
    state.modals[modalName] = false;
  }),
  
  setTablePerPage: (tableName, perPage) => set((state) => {
    state.tables[tableName] = perPage;
  })
});

/**
 * Analytics Store Slice
 */
const createAnalyticsSlice = (set, get) => ({
  ...initialAnalyticsState,
  
  setDateRange: (dateRange) => set((state) => {
    state.dateRange = dateRange;
  }),
  
  toggleCompareMode: () => set((state) => {
    state.compareMode = !state.compareMode;
  }),
  
  updateMetrics: (metrics) => set((state) => {
    Object.assign(state.metrics, metrics);
  }),
  
  setChartData: (chartName, data) => set((state) => {
    state.charts[chartName] = data;
  }),
  
  setLoading: (loading) => set((state) => {
    state.loading = loading;
  })
});

/**
 * Feature Store Slice
 */
const createFeatureSlice = (set, get) => ({
  ...initialFeatureState,
  
  setFeatures: (features) => set((state) => {
    state.features = features;
  }),
  
  updateFeature: (featureId, updates) => set((state) => {
    if (state.features[featureId]) {
      state.features[featureId] = { ...state.features[featureId], ...updates };
    }
  }),
  
  setGlobalFlag: (flag, value) => set((state) => {
    state.globalFlags[flag] = value;
  }),
  
  addOverride: (tenantId, featureId, value) => set((state) => {
    if (!state.overrides[tenantId]) {
      state.overrides[tenantId] = {};
    }
    state.overrides[tenantId][featureId] = value;
  }),
  
  removeOverride: (tenantId, featureId) => set((state) => {
    if (state.overrides[tenantId]) {
      delete state.overrides[tenantId][featureId];
    }
  }),
  
  addChangelogEntry: (entry) => set((state) => {
    state.changelog.unshift({
      ...entry,
      id: Date.now(),
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 entries
    if (state.changelog.length > 100) {
      state.changelog = state.changelog.slice(0, 100);
    }
  }),
  
  isFeatureEnabled: (featureId, tenantId = null) => {
    const { features, globalFlags, overrides } = get();
    
    // Check global flag first
    if (globalFlags[featureId] === false) return false;
    
    // Check tenant override
    if (tenantId && overrides[tenantId]?.[featureId] !== undefined) {
      return overrides[tenantId][featureId];
    }
    
    // Check feature default
    return features[featureId]?.enabled || false;
  }
});

// ============================================================================
// MAIN STORE
// ============================================================================
const useMasterStore = create(
  subscribeWithSelector(
    devtools(
      persist(
        immer((set, get) => ({
          // Auth
          auth: createAuthSlice(
            (fn) => set((state) => { fn(state.auth); }),
            () => get().auth
          ),
          
          // System
          system: createSystemSlice(
            (fn) => set((state) => { fn(state.system); }),
            () => get().system
          ),
          
          // Tenants
          tenants: createTenantSlice(
            (fn) => set((state) => { fn(state.tenants); }),
            () => get().tenants
          ),
          
          // UI
          ui: createUISlice(
            (fn) => set((state) => { fn(state.ui); }),
            () => get().ui
          ),
          
          // Analytics
          analytics: createAnalyticsSlice(
            (fn) => set((state) => { fn(state.analytics); }),
            () => get().analytics
          ),
          
          // Features
          features: createFeatureSlice(
            (fn) => set((state) => { fn(state.features); }),
            () => get().features
          ),
          
          // Global Actions
          reset: () => set((state) => {
            state.auth = initialAuthState;
            state.system = initialSystemState;
            state.tenants = initialTenantState;
            state.ui = { ...initialUIState, theme: state.ui.theme }; // Keep theme
            state.analytics = initialAnalyticsState;
            state.features = initialFeatureState;
          })
        })),
        {
          name: 'eatech-master-store',
          partialize: (state) => ({
            auth: {
              user: state.auth.user,
              token: state.auth.token,
              permissions: state.auth.permissions,
              sessionExpiry: state.auth.sessionExpiry
            },
            ui: {
              theme: state.ui.theme,
              language: state.ui.language,
              sidebarCollapsed: state.ui.sidebarCollapsed,
              tables: state.ui.tables
            }
          })
        }
      ),
      {
        name: 'EATECH Master Store'
      }
    )
  )
);

// ============================================================================
// SELECTORS
// ============================================================================
export const useAuth = () => useMasterStore((state) => state.auth);
export const useSystem = () => useMasterStore((state) => state.system);
export const useTenants = () => useMasterStore((state) => state.tenants);
export const useUI = () => useMasterStore((state) => state.ui);
export const useAnalytics = () => useMasterStore((state) => state.analytics);
export const useFeatures = () => useMasterStore((state) => state.features);

// Specific selectors
export const useUser = () => useMasterStore((state) => state.auth.user);
export const useIsAuthenticated = () => useMasterStore((state) => state.auth.isAuthenticated);
export const useSystemStatus = () => useMasterStore((state) => state.system.status);
export const useAlerts = () => useMasterStore((state) => state.system.alerts);
export const useSelectedTenant = () => useMasterStore((state) => state.tenants.selectedTenant);
export const useTheme = () => useMasterStore((state) => state.ui.theme);
export const useNotifications = () => useMasterStore((state) => state.ui.notifications);

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

// Auto logout on session expiry
useMasterStore.subscribe(
  (state) => state.auth.sessionExpiry,
  (sessionExpiry) => {
    if (sessionExpiry) {
      const checkExpiry = () => {
        const now = new Date();
        const expiry = new Date(sessionExpiry);
        if (now >= expiry) {
          useMasterStore.getState().auth.logout();
        }
      };
      
      // Check immediately and every minute
      checkExpiry();
      const interval = setInterval(checkExpiry, 60000);
      
      // Cleanup
      return () => clearInterval(interval);
    }
  }
);

// Theme persistence
useMasterStore.subscribe(
  (state) => state.ui.theme,
  (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  }
);

export default useMasterStore;