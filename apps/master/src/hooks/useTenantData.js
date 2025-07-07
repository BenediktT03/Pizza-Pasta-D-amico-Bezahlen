/**
 * EATECH Tenant Data Management Hook
 * Version: 1.0.0
 * 
 * React hook for managing tenant data and operations
 * Features:
 * - Tenant CRUD operations
 * - Real-time tenant status
 * - Tenant analytics
 * - Bulk operations
 * - Search and filtering
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/hooks/useTenantData.js
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import masterApiService from '../services/masterApi.service';
import aiService from '../services/ai.service';

export const useTenantData = (options = {}) => {
  const {
    autoLoad = true,
    pageSize = 20,
    enableRealtime = true,
    includeAnalytics = false
  } = options;

  // State
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    plan: 'all',
    city: 'all'
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load tenants
  const loadTenants = useCallback(async (page = currentPage) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: pageSize,
        search: searchTerm,
        sortBy,
        sortOrder,
        ...filters
      };

      const response = await masterApiService.getTenants(params);
      
      setTenants(response.data);
      setTotalCount(response.total);
      setCurrentPage(page);

      // Load analytics for each tenant if enabled
      if (includeAnalytics && response.data.length > 0) {
        await loadTenantAnalytics(response.data);
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, filters, sortBy, sortOrder, includeAnalytics]);

  // Load tenant analytics
  const loadTenantAnalytics = async (tenantList) => {
    const analyticsPromises = tenantList.map(async (tenant) => {
      try {
        const [revenue, metrics] = await Promise.all([
          masterApiService.getRevenueAnalytics({ tenantId: tenant.id, period: 'month' }),
          masterApiService.getUserAnalytics({ tenantId: tenant.id })
        ]);

        return {
          tenantId: tenant.id,
          revenue: revenue.total,
          revenueGrowth: revenue.growth,
          activeUsers: metrics.activeUsers,
          orderCount: metrics.totalOrders
        };
      } catch (err) {
        console.error(`Failed to load analytics for tenant ${tenant.id}:`, err);
        return null;
      }
    });

    const analytics = await Promise.all(analyticsPromises);
    
    // Merge analytics with tenant data
    setTenants(prev => prev.map(tenant => {
      const tenantAnalytics = analytics.find(a => a?.tenantId === tenant.id);
      return tenantAnalytics ? { ...tenant, analytics: tenantAnalytics } : tenant;
    }));
  };

  // Initial load
  useEffect(() => {
    if (autoLoad) {
      loadTenants(1);
    }
  }, [autoLoad]); // Only run on mount

  // Reload when filters change
  useEffect(() => {
    if (!autoLoad) return;
    
    const delayTimer = setTimeout(() => {
      loadTenants(1);
    }, 300); // Debounce search

    return () => clearTimeout(delayTimer);
  }, [searchTerm, filters, sortBy, sortOrder]);

  // Get single tenant
  const getTenant = useCallback(async (tenantId) => {
    setIsLoading(true);
    setError(null);

    try {
      const tenant = await masterApiService.getTenant(tenantId);
      setSelectedTenant(tenant);
      
      // Load detailed analytics
      if (includeAnalytics) {
        const [revenue, users, predictions] = await Promise.all([
          masterApiService.getRevenueAnalytics({ tenantId, period: 'year' }),
          masterApiService.getUserAnalytics({ tenantId }),
          aiService.predictDemand(tenantId, { horizon: 30 })
        ]);

        setSelectedTenant(prev => ({
          ...prev,
          analytics: {
            revenue,
            users,
            predictions
          }
        }));
      }

      return tenant;
    } catch (err) {
      console.error('Failed to load tenant:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [includeAnalytics]);

  // Create tenant
  const createTenant = useCallback(async (tenantData) => {
    setIsLoading(true);
    setError(null);

    try {
      const newTenant = await masterApiService.createTenant(tenantData);
      
      // Refresh list
      await loadTenants(currentPage);
      
      return { success: true, tenant: newTenant };
    } catch (err) {
      console.error('Failed to create tenant:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, loadTenants]);

  // Update tenant
  const updateTenant = useCallback(async (tenantId, updates) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedTenant = await masterApiService.updateTenant(tenantId, updates);
      
      // Update in local state
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? updatedTenant : t
      ));
      
      if (selectedTenant?.id === tenantId) {
        setSelectedTenant(updatedTenant);
      }

      return { success: true, tenant: updatedTenant };
    } catch (err) {
      console.error('Failed to update tenant:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenant]);

  // Delete tenant
  const deleteTenant = useCallback(async (tenantId) => {
    setIsLoading(true);
    setError(null);

    try {
      await masterApiService.deleteTenant(tenantId);
      
      // Remove from local state
      setTenants(prev => prev.filter(t => t.id !== tenantId));
      
      if (selectedTenant?.id === tenantId) {
        setSelectedTenant(null);
      }

      // Adjust total count
      setTotalCount(prev => Math.max(0, prev - 1));

      return { success: true };
    } catch (err) {
      console.error('Failed to delete tenant:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenant]);

  // Suspend tenant
  const suspendTenant = useCallback(async (tenantId, reason) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await masterApiService.suspendTenant(tenantId, reason);
      
      // Update local state
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, status: 'suspended' } : t
      ));

      return { success: true, result };
    } catch (err) {
      console.error('Failed to suspend tenant:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Activate tenant
  const activateTenant = useCallback(async (tenantId) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await masterApiService.activateTenant(tenantId);
      
      // Update local state
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, status: 'active' } : t
      ));

      return { success: true, result };
    } catch (err) {
      console.error('Failed to activate tenant:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bulk operations
  const bulkUpdate = useCallback(async (tenantIds, updates) => {
    setIsLoading(true);
    setError(null);

    try {
      const promises = tenantIds.map(id => 
        masterApiService.updateTenant(id, updates)
      );
      
      const results = await Promise.allSettled(promises);
      
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Reload list
      await loadTenants(currentPage);

      return {
        success: failed === 0,
        succeeded,
        failed,
        total: tenantIds.length
      };
    } catch (err) {
      console.error('Bulk update failed:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, loadTenants]);

  // Computed values
  const totalPages = useMemo(() => 
    Math.ceil(totalCount / pageSize), 
    [totalCount, pageSize]
  );

  const hasNextPage = useMemo(() => 
    currentPage < totalPages, 
    [currentPage, totalPages]
  );

  const hasPrevPage = useMemo(() => 
    currentPage > 1, 
    [currentPage]
  );

  const filteredTenants = useMemo(() => {
    return tenants.filter(tenant => {
      // Apply client-side filtering if needed
      return true; // Server already filtered
    });
  }, [tenants]);

  // Statistics
  const statistics = useMemo(() => {
    return {
      total: totalCount,
      active: tenants.filter(t => t.status === 'active').length,
      suspended: tenants.filter(t => t.status === 'suspended').length,
      trial: tenants.filter(t => t.status === 'trial').length,
      revenue: tenants.reduce((sum, t) => sum + (t.analytics?.revenue || 0), 0),
      avgRevenue: tenants.length > 0 
        ? tenants.reduce((sum, t) => sum + (t.analytics?.revenue || 0), 0) / tenants.length 
        : 0
    };
  }, [tenants, totalCount]);

  return {
    // Data
    tenants: filteredTenants,
    selectedTenant,
    totalCount,
    statistics,

    // Pagination
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pageSize,

    // State
    isLoading,
    error,

    // Filters
    searchTerm,
    filters,
    sortBy,
    sortOrder,

    // Actions
    loadTenants,
    getTenant,
    createTenant,
    updateTenant,
    deleteTenant,
    suspendTenant,
    activateTenant,
    bulkUpdate,

    // Setters
    setSearchTerm,
    setFilters: (newFilters) => setFilters(prev => ({ ...prev, ...newFilters })),
    setSortBy,
    setSortOrder,
    setCurrentPage,
    setSelectedTenant
  };
};

// Hook for single tenant
export const useTenant = (tenantId, options = {}) => {
  const [tenant, setTenant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tenantId) {
      setTenant(null);
      setIsLoading(false);
      return;
    }

    const loadTenant = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await masterApiService.getTenant(tenantId);
        setTenant(data);
      } catch (err) {
        console.error('Failed to load tenant:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenant();
  }, [tenantId]);

  const updateTenant = useCallback(async (updates) => {
    if (!tenantId) return { success: false, error: 'No tenant ID' };

    setIsLoading(true);
    setError(null);

    try {
      const updated = await masterApiService.updateTenant(tenantId, updates);
      setTenant(updated);
      return { success: true, tenant: updated };
    } catch (err) {
      console.error('Failed to update tenant:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  return {
    tenant,
    isLoading,
    error,
    updateTenant
  };
};