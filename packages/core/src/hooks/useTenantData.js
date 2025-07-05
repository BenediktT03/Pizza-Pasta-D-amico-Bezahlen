/**
 * EATECH - Multi-Tenant Data Hook
 * Provides easy access to tenant-scoped data in React components
 * File Path: /packages/@eatech/core/hooks/useTenantData.js
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTenant } from '../contexts/TenantContext';
import TenantService from '../services/TenantService';

/**
 * Hook for tenant-scoped data operations
 * @param {string} path - Database path within tenant scope
 * @param {Object} options - Configuration options
 * @returns {Object} Data state and operations
 */
export const useTenantData = (path, options = {}) => {
  const { currentTenant } = useTenant();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const unsubscribeRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // Configure options
  const {
    realtime = true,
    initialValue = null,
    transform = null,
    onError = null,
    deps = []
  } = options;

  // Set tenant in service
  useEffect(() => {
    if (currentTenant?.id) {
      TenantService.setCurrentTenant(currentTenant.id);
    }
  }, [currentTenant]);

  // Load data
  useEffect(() => {
    if (!currentTenant?.id || !path) {
      setData(initialValue);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (realtime) {
          // Subscribe to real-time updates
          unsubscribeRef.current = TenantService.subscribe(
            path,
            (newData) => {
              if (isMountedRef.current) {
                const transformedData = transform ? transform(newData) : newData;
                setData(transformedData);
                setLoading(false);
              }
            },
            {
              onError: (err) => {
                if (isMountedRef.current) {
                  setError(err);
                  setLoading(false);
                  if (onError) onError(err);
                }
              }
            }
          );
        } else {
          // One-time read
          const result = await TenantService.read(path);
          if (isMountedRef.current) {
            const transformedData = transform ? transform(result) : result;
            setData(transformedData);
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err);
          setLoading(false);
          if (onError) onError(err);
        }
      }
    };

    loadData();

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentTenant?.id, path, realtime, ...deps]);

  // Create operation
  const create = useCallback(async (newData) => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected');
    }

    setSaving(true);
    setError(null);

    try {
      const result = await TenantService.create(path, newData);
      if (!realtime) {
        setData(result);
      }
      return result;
    } catch (err) {
      setError(err);
      if (onError) onError(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentTenant?.id, path, realtime, onError]);

  // Update operation
  const update = useCallback(async (updates) => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected');
    }

    setSaving(true);
    setError(null);

    try {
      const result = await TenantService.update(path, updates);
      if (!realtime) {
        setData(prev => ({ ...prev, ...result }));
      }
      return result;
    } catch (err) {
      setError(err);
      if (onError) onError(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentTenant?.id, path, realtime, onError]);

  // Delete operation
  const remove = useCallback(async () => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected');
    }

    setSaving(true);
    setError(null);

    try {
      await TenantService.delete(path);
      if (!realtime) {
        setData(null);
      }
    } catch (err) {
      setError(err);
      if (onError) onError(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentTenant?.id, path, realtime, onError]);

  // Refresh data
  const refresh = useCallback(async () => {
    if (!currentTenant?.id || !path) return;

    setLoading(true);
    setError(null);

    try {
      const result = await TenantService.read(path);
      const transformedData = transform ? transform(result) : result;
      setData(transformedData);
    } catch (err) {
      setError(err);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, path, transform, onError]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    saving,
    create,
    update,
    remove,
    refresh,
    exists: data !== null,
    isEmpty: data === null || (typeof data === 'object' && Object.keys(data).length === 0)
  };
};

/**
 * Hook for tenant-scoped lists with filtering
 */
export const useTenantList = (path, options = {}) => {
  const { currentTenant } = useTenant();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const {
    orderBy = null,
    limit = null,
    filters = {},
    transform = null,
    realtime = true
  } = options;

  useEffect(() => {
    if (!currentTenant?.id || !path) {
      setItems([]);
      setLoading(false);
      return;
    }

    let unsubscribe;

    const loadItems = async () => {
      try {
        setLoading(true);
        setError(null);

        if (realtime) {
          unsubscribe = TenantService.subscribe(
            path,
            (data) => {
              if (!data) {
                setItems([]);
                setLoading(false);
                return;
              }

              let itemsList = Object.entries(data).map(([id, item]) => ({
                id,
                ...item
              }));

              // Apply filters
              if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                  itemsList = itemsList.filter(item => item[key] === value);
                });
              }

              // Apply ordering
              if (orderBy) {
                const [field, direction = 'asc'] = orderBy.split(':');
                itemsList.sort((a, b) => {
                  const aVal = a[field];
                  const bVal = b[field];
                  const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                  return direction === 'desc' ? -comparison : comparison;
                });
              }

              // Apply limit
              if (limit) {
                itemsList = itemsList.slice(0, limit);
              }

              // Apply transform
              if (transform) {
                itemsList = itemsList.map(transform);
              }

              setItems(itemsList);
              setLoading(false);
            },
            {
              onError: (err) => {
                setError(err);
                setLoading(false);
              }
            }
          );
        } else {
          // One-time read
          const result = await TenantService.list(path, {
            orderBy,
            limit,
            ...filters
          });

          let itemsList = result;
          
          // Apply transform
          if (transform) {
            itemsList = itemsList.map(transform);
          }

          setItems(itemsList);
          setLoading(false);
        }
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    loadItems();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentTenant?.id, path, orderBy, limit, JSON.stringify(filters), realtime]);

  // Add item
  const addItem = useCallback(async (itemData) => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected');
    }

    try {
      const result = await TenantService.create(path, itemData);
      if (!realtime) {
        setItems(prev => [...prev, result]);
      }
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [currentTenant?.id, path, realtime]);

  // Update item
  const updateItem = useCallback(async (itemId, updates) => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected');
    }

    try {
      const itemPath = `${path}/${itemId}`;
      const result = await TenantService.update(itemPath, updates);
      
      if (!realtime) {
        setItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, ...result } : item
        ));
      }
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [currentTenant?.id, path, realtime]);

  // Remove item
  const removeItem = useCallback(async (itemId) => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected');
    }

    try {
      const itemPath = `${path}/${itemId}`;
      await TenantService.delete(itemPath);
      
      if (!realtime) {
        setItems(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [currentTenant?.id, path, realtime]);

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    removeItem,
    refresh: () => window.location.reload(), // Simple refresh
    count: items.length,
    isEmpty: items.length === 0
  };
};

/**
 * Hook for tenant statistics
 */
export const useTenantStats = () => {
  const { currentTenant } = useTenant();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentTenant?.id) {
      setStats(null);
      setLoading(false);
      return;
    }

    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        TenantService.setCurrentTenant(currentTenant.id);
        const tenantStats = await TenantService.getTenantStats();
        
        setStats(tenantStats);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [currentTenant?.id]);

  return { stats, loading, error };
};

/**
 * Hook for tenant quota checking
 */
export const useTenantQuota = (type) => {
  const { currentTenant } = useTenant();
  const [canAdd, setCanAdd] = useState(true);
  const [quota, setQuota] = useState(null);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (!currentTenant?.id || !type) {
      return;
    }

    const checkQuota = async () => {
      try {
        TenantService.setCurrentTenant(currentTenant.id);
        const allowed = await TenantService.checkQuota(type);
        setCanAdd(allowed);

        // Get current usage
        const stats = await TenantService.getTenantStats();
        setUsage(stats[type] || 0);

        // Get quota from tenant features
        const features = currentTenant.features || {};
        const quotaKey = `max${type.charAt(0).toUpperCase() + type.slice(1)}`;
        setQuota(features[quotaKey] || -1);
      } catch (err) {
        console.error('Error checking quota:', err);
        setCanAdd(false);
      }
    };

    checkQuota();
  }, [currentTenant, type]);

  return {
    canAdd,
    quota,
    usage,
    remaining: quota === -1 ? -1 : Math.max(0, quota - usage),
    percentage: quota === -1 ? 0 : Math.round((usage / quota) * 100)
  };
};

export default useTenantData;