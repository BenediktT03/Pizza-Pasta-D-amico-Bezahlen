import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { 
  Tenant, 
  TenantSettings, 
  TenantLocation,
  TenantStatus,
  TenantPlan,
  UpdateTenantDto,
  TenantContext as ITenantContext
} from '../services/tenant/tenant.types';
import { tenantService } from '../services/tenant/tenant.service';
import { useAuth } from './useAuth';

// Tenant Context
const TenantContext = createContext<ITenantContext | undefined>(undefined);

/**
 * Tenant Provider Component
 */
export function TenantProvider({ 
  children,
  tenantId,
  domain
}: { 
  children: React.ReactNode;
  tenantId?: string;
  domain?: string;
}) {
  const { user, profile } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load tenant data
  const loadTenant = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let loadedTenant: Tenant | null = null;

      // Priority 1: Use provided tenant ID
      if (tenantId) {
        loadedTenant = await tenantService.getTenantById(tenantId);
      }
      // Priority 2: Use domain
      else if (domain) {
        loadedTenant = await tenantService.getTenantByDomain(domain);
      }
      // Priority 3: Extract from subdomain
      else if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const subdomain = extractSubdomain(host);
        
        if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
          loadedTenant = await tenantService.getTenantBySlug(subdomain);
        }
        // Priority 4: Try custom domain
        else if (!host.includes('eatech.ch') && !host.includes('localhost')) {
          loadedTenant = await tenantService.getTenantByDomain(host);
        }
      }
      // Priority 5: Use user's default tenant
      else if (profile?.tenantId) {
        loadedTenant = await tenantService.getTenantById(profile.tenantId);
      }

      if (loadedTenant) {
        // Verify tenant is active
        if (loadedTenant.status !== TenantStatus.ACTIVE && 
            loadedTenant.status !== TenantStatus.TRIAL) {
          throw new Error('Tenant is not active');
        }
        
        setTenant(loadedTenant);
      } else {
        throw new Error('Tenant not found');
      }
    } catch (err) {
      console.error('Error loading tenant:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, domain, profile]);

  // Update tenant settings
  const updateSettings = useCallback(async (
    settings: Partial<TenantSettings>
  ): Promise<void> => {
    if (!tenant) throw new Error('No tenant loaded');

    try {
      const updated = await tenantService.updateTenantSettings(tenant.id, settings);
      setTenant(updated);
    } catch (err) {
      console.error('Error updating tenant settings:', err);
      throw err;
    }
  }, [tenant]);

  // Add location
  const addLocation = useCallback(async (
    location: Omit<TenantLocation, 'id'>
  ): Promise<void> => {
    if (!tenant) throw new Error('No tenant loaded');

    try {
      const newLocation: TenantLocation = {
        ...location,
        id: generateId(),
      };

      const updated = await tenantService.updateTenant(tenant.id, {
        locations: [...tenant.locations, newLocation],
      });
      
      setTenant(updated);
    } catch (err) {
      console.error('Error adding location:', err);
      throw err;
    }
  }, [tenant]);

  // Update location
  const updateLocation = useCallback(async (
    locationId: string,
    data: Partial<TenantLocation>
  ): Promise<void> => {
    if (!tenant) throw new Error('No tenant loaded');

    try {
      const locations = tenant.locations.map(loc =>
        loc.id === locationId ? { ...loc, ...data } : loc
      );

      const updated = await tenantService.updateTenant(tenant.id, { locations });
      setTenant(updated);
    } catch (err) {
      console.error('Error updating location:', err);
      throw err;
    }
  }, [tenant]);

  // Remove location
  const removeLocation = useCallback(async (locationId: string): Promise<void> => {
    if (!tenant) throw new Error('No tenant loaded');

    // Prevent removing the last location
    if (tenant.locations.length <= 1) {
      throw new Error('Cannot remove the last location');
    }

    // Prevent removing primary location if it's the only one
    const location = tenant.locations.find(l => l.id === locationId);
    if (location?.isPrimary && tenant.locations.length > 1) {
      throw new Error('Cannot remove primary location. Set another location as primary first.');
    }

    try {
      const locations = tenant.locations.filter(loc => loc.id !== locationId);
      const updated = await tenantService.updateTenant(tenant.id, { locations });
      setTenant(updated);
    } catch (err) {
      console.error('Error removing location:', err);
      throw err;
    }
  }, [tenant]);

  // Add domain
  const addDomain = useCallback(async (domain: string): Promise<void> => {
    if (!tenant) throw new Error('No tenant loaded');

    try {
      const updated = await tenantService.addDomain(tenant.id, domain);
      setTenant(updated);
    } catch (err) {
      console.error('Error adding domain:', err);
      throw err;
    }
  }, [tenant]);

  // Remove domain
  const removeDomain = useCallback(async (domain: string): Promise<void> => {
    if (!tenant) throw new Error('No tenant loaded');

    // Prevent removing primary domain
    const domainObj = tenant.domains.find(d => d.domain === domain);
    if (domainObj?.isPrimary) {
      throw new Error('Cannot remove primary domain');
    }

    try {
      const domains = tenant.domains.filter(d => d.domain !== domain);
      const updated = await tenantService.updateTenant(tenant.id, { domains });
      setTenant(updated);
    } catch (err) {
      console.error('Error removing domain:', err);
      throw err;
    }
  }, [tenant]);

  // Set primary domain
  const setPrimaryDomain = useCallback(async (domain: string): Promise<void> => {
    if (!tenant) throw new Error('No tenant loaded');

    try {
      const domains = tenant.domains.map(d => ({
        ...d,
        isPrimary: d.domain === domain,
      }));

      const updated = await tenantService.updateTenant(tenant.id, { domains });
      setTenant(updated);
    } catch (err) {
      console.error('Error setting primary domain:', err);
      throw err;
    }
  }, [tenant]);

  // Verify domain
  const verifyDomain = useCallback(async (
    domain: string,
    token: string
  ): Promise<void> => {
    if (!tenant) throw new Error('No tenant loaded');

    try {
      // In a real implementation, this would verify DNS records
      const response = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          domain,
          token,
        }),
      });

      if (!response.ok) {
        throw new Error('Domain verification failed');
      }

      const domains = tenant.domains.map(d =>
        d.domain === domain
          ? { ...d, isVerified: true, verifiedAt: new Date() }
          : d
      );

      const updated = await tenantService.updateTenant(tenant.id, { domains });
      setTenant(updated);
    } catch (err) {
      console.error('Error verifying domain:', err);
      throw err;
    }
  }, [tenant]);

  // Load tenant on mount or when dependencies change
  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  const contextValue: ITenantContext = {
    tenant,
    isLoading,
    error,
    updateSettings,
    addLocation,
    updateLocation,
    removeLocation,
    addDomain,
    removeDomain,
    setPrimaryDomain,
    verifyDomain,
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to use tenant context
 */
export function useTenant() {
  const context = useContext(TenantContext);
  
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  
  return context;
}

/**
 * Hook to check tenant feature
 */
export function useTenantFeature(feature: keyof TenantSettings['features']): boolean {
  const { tenant } = useTenant();
  
  if (!tenant) return false;
  
  return tenant.settings.features[feature] || false;
}

/**
 * Hook to check tenant plan
 */
export function useTenantPlan(): {
  plan: TenantPlan | null;
  isStarter: boolean;
  isProfessional: boolean;
  isEnterprise: boolean;
  hasFeature: (feature: keyof TenantSettings['features']) => boolean;
} {
  const { tenant } = useTenant();
  
  return {
    plan: tenant?.plan || null,
    isStarter: tenant?.plan === TenantPlan.STARTER,
    isProfessional: tenant?.plan === TenantPlan.PROFESSIONAL,
    isEnterprise: tenant?.plan === TenantPlan.ENTERPRISE,
    hasFeature: (feature) => tenant?.settings.features[feature] || false,
  };
}

/**
 * Hook to get tenant locations
 */
export function useTenantLocations() {
  const { tenant } = useTenant();
  const [activeLocation, setActiveLocation] = useState<TenantLocation | null>(null);

  useEffect(() => {
    if (tenant && tenant.locations.length > 0) {
      // Set primary location as active by default
      const primary = tenant.locations.find(l => l.isPrimary);
      setActiveLocation(primary || tenant.locations[0]);
    }
  }, [tenant]);

  const locations = tenant?.locations || [];
  const primaryLocation = locations.find(l => l.isPrimary) || locations[0];

  return {
    locations,
    primaryLocation,
    activeLocation,
    setActiveLocation,
  };
}

/**
 * Hook for tenant subscription management
 */
export function useTenantSubscription() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upgradePlan = useCallback(async (newPlan: TenantPlan) => {
    if (!tenant) throw new Error('No tenant loaded');

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would handle Stripe subscription
      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          currentPlan: tenant.plan,
          newPlan,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upgrade plan');
      }

      // Update tenant plan
      await tenantService.updateTenantPlan(tenant.id, newPlan);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  const cancelSubscription = useCallback(async () => {
    if (!tenant) throw new Error('No tenant loaded');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // Update tenant
      await tenantService.updateTenant(tenant.id, {
        'subscription.cancelAtPeriodEnd': true,
      });
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  const reactivateSubscription = useCallback(async () => {
    if (!tenant) throw new Error('No tenant loaded');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription');
      }

      // Update tenant
      await tenantService.updateTenant(tenant.id, {
        'subscription.cancelAtPeriodEnd': false,
      });
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  const isTrialActive = tenant?.subscription.status === 'trialing';
  const daysUntilTrialEnd = tenant?.subscription.trialEndsAt
    ? Math.ceil(
        (tenant.subscription.trialEndsAt.toDate().getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
      )
    : 0;

  return {
    subscription: tenant?.subscription || null,
    isTrialActive,
    daysUntilTrialEnd,
    upgradePlan,
    cancelSubscription,
    reactivateSubscription,
    loading,
    error,
  };
}

/**
 * Hook for tenant statistics
 */
export function useTenantStats() {
  const { tenant } = useTenant();
  const [stats, setStats] = useState(tenant?.stats || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshStats = useCallback(async () => {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would fetch fresh stats
      const response = await fetch(`/api/tenants/${tenant.id}/stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const freshStats = await response.json();
      setStats(freshStats);

      // Update tenant with fresh stats
      await tenantService.updateTenant(tenant.id, {
        stats: freshStats,
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    if (tenant) {
      setStats(tenant.stats);
    }
  }, [tenant]);

  return {
    stats,
    refreshStats,
    loading,
    error,
  };
}

// Helper functions
function extractSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');
  
  if (parts.length >= 3) {
    // Remove port if present
    return parts[0].split(':')[0];
  }
  
  return null;
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
