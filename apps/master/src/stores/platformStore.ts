// Platform Store for Master Admin - Global State Management
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  PlatformMetrics, 
  LiveMetrics,
  TenantPerformance 
} from '../services/analyticsService';
import { 
  SystemHealth,
  SystemAlert,
  SystemError 
} from '../services/monitoringService';
import { Tenant } from '../services/tenantService';

interface PlatformState {
  // Metrics
  metrics: PlatformMetrics | null;
  liveMetrics: LiveMetrics | null;
  
  // System Health
  systemHealth: SystemHealth | null;
  systemAlerts: SystemAlert[];
  systemErrors: SystemError[];
  
  // Tenants
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  tenantFilter: {
    status: 'all' | 'active' | 'inactive' | 'trial';
    search: string;
    sortBy: 'name' | 'createdAt' | 'revenue' | 'lastOrder';
    sortOrder: 'asc' | 'desc';
  };
  
  // UI State
  isLoading: boolean;
  error: string | null;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  
  // Actions
  setMetrics: (metrics: PlatformMetrics) => void;
  setLiveMetrics: (metrics: LiveMetrics) => void;
  setSystemHealth: (health: SystemHealth) => void;
  setSystemAlerts: (alerts: SystemAlert[]) => void;
  addSystemAlert: (alert: SystemAlert) => void;
  removeSystemAlert: (alertId: string) => void;
  setSystemErrors: (errors: SystemError[]) => void;
  setTenants: (tenants: Tenant[]) => void;
  setSelectedTenant: (tenant: Tenant | null) => void;
  updateTenantFilter: (filter: Partial<PlatformState['tenantFilter']>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  reset: () => void;
}

const initialState = {
  metrics: null,
  liveMetrics: null,
  systemHealth: null,
  systemAlerts: [],
  systemErrors: [],
  tenants: [],
  selectedTenant: null,
  tenantFilter: {
    status: 'all' as const,
    search: '',
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const
  },
  isLoading: false,
  error: null,
  sidebarCollapsed: false,
  theme: 'light' as const
};

export const usePlatformStore = create<PlatformState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Metrics actions
        setMetrics: (metrics) => set({ metrics }),
        setLiveMetrics: (liveMetrics) => set({ liveMetrics }),

        // System health actions
        setSystemHealth: (systemHealth) => set({ systemHealth }),
        setSystemAlerts: (systemAlerts) => set({ systemAlerts }),
        addSystemAlert: (alert) => set((state) => ({
          systemAlerts: [alert, ...state.systemAlerts]
        })),
        removeSystemAlert: (alertId) => set((state) => ({
          systemAlerts: state.systemAlerts.filter(a => a.id !== alertId)
        })),
        setSystemErrors: (systemErrors) => set({ systemErrors }),

        // Tenant actions
        setTenants: (tenants) => set({ tenants }),
        setSelectedTenant: (selectedTenant) => set({ selectedTenant }),
        updateTenantFilter: (filter) => set((state) => ({
          tenantFilter: { ...state.tenantFilter, ...filter }
        })),

        // UI actions
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        toggleSidebar: () => set((state) => ({ 
          sidebarCollapsed: !state.sidebarCollapsed 
        })),
        setTheme: (theme) => set({ theme }),

        // Reset
        reset: () => set(initialState)
      }),
      {
        name: 'eatech-platform-store',
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
          tenantFilter: state.tenantFilter
        })
      }
    )
  )
);

// Computed selectors
export const useFilteredTenants = () => {
  const { tenants, tenantFilter } = usePlatformStore();
  
  let filtered = [...tenants];
  
  // Status filter
  if (tenantFilter.status !== 'all') {
    switch (tenantFilter.status) {
      case 'active':
        filtered = filtered.filter(t => t.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(t => !t.isActive);
        break;
      case 'trial':
        filtered = filtered.filter(t => t.trial_ends_at > new Date());
        break;
    }
  }
  
  // Search filter
  if (tenantFilter.search) {
    const search = tenantFilter.search.toLowerCase();
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(search) ||
      t.email.toLowerCase().includes(search) ||
      t.phone.includes(tenantFilter.search)
    );
  }
  
  // Sort
  filtered.sort((a, b) => {
    let comparison = 0;
    
    switch (tenantFilter.sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'revenue':
        comparison = (a.analytics?.totalRevenue || 0) - (b.analytics?.totalRevenue || 0);
        break;
      case 'lastOrder':
        const aTime = a.analytics?.lastOrderAt?.getTime() || 0;
        const bTime = b.analytics?.lastOrderAt?.getTime() || 0;
        comparison = aTime - bTime;
        break;
    }
    
    return tenantFilter.sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return filtered;
};

// Critical alerts selector
export const useCriticalAlerts = () => {
  const { systemAlerts } = usePlatformStore();
  return systemAlerts.filter(a => a.severity === 'critical' && !a.acknowledged);
};

// System status selector
export const useSystemStatus = () => {
  const { systemHealth, systemAlerts, systemErrors } = usePlatformStore();
  
  const criticalAlerts = systemAlerts.filter(a => a.severity === 'critical' && !a.acknowledged);
  const unresolvedErrors = systemErrors.filter(e => !e.resolved && e.severity === 'critical');
  
  if (systemHealth?.overall === 'critical' || criticalAlerts.length > 0 || unresolvedErrors.length > 0) {
    return 'critical';
  }
  
  if (systemHealth?.overall === 'degraded' || systemErrors.filter(e => !e.resolved).length > 0) {
    return 'degraded';
  }
  
  return 'healthy';
};
