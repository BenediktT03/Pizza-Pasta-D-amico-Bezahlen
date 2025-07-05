/**
 * EATECH - Master Data Hook
 * Version: 5.0.0
 * Description: Real-time data management for Master Control Panel
 * File Path: /src/modules/master/hooks/useMasterData.js
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { database } from '../../../config/firebase';
import { ref, onValue, off, get, set, update } from 'firebase/database';
import { calculateHealthScore } from '../utils/healthScoreCalculator';
import { analyzeTrends, forecastProvisions } from '../utils/trendAnalyzer';
import { getCantonByCoordinates, getNearestCity } from '../utils/swissMapData';

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useMasterData = () => {
  // State management
  const [tenants, setTenants] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [liveOrders, setLiveOrders] = useState([]);
  const [provisions, setProvisions] = useState(null);
  const [heatMapData, setHeatMapData] = useState({});
  const [anomalies, setAnomalies] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Refs for cleanup
  const listenersRef = useRef([]);
  const updateIntervalRef = useRef(null);
  
  // ============================================================================
  // REAL-TIME LISTENERS
  // ============================================================================
  
  useEffect(() => {
    setLoading(true);
    
    try {
      // 1. Listen to tenants
      const tenantsRef = ref(database, 'master/tenants');
      const tenantsListener = onValue(tenantsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const tenantsArray = Object.entries(data).map(([id, tenant]) => ({
            id,
            ...tenant,
            healthScore: null, // Will be calculated
            trends: null // Will be analyzed
          }));
          setTenants(tenantsArray);
          
          // Calculate health scores for each tenant
          calculateTenantHealth(tenantsArray);
        }
      });
      listenersRef.current.push({ ref: tenantsRef, listener: tenantsListener });
      
      // 2. Listen to global analytics
      const analyticsRef = ref(database, 'master/analytics');
      const analyticsListener = onValue(analyticsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAnalytics({
            ...data,
            provisionGrowth: calculateProvisionGrowth(data.provisionHistory || []),
            averageOrderValue: data.totalRevenue / data.totalOrders || 0
          });
        }
      });
      listenersRef.current.push({ ref: analyticsRef, listener: analyticsListener });
      
      // 3. Listen to live orders (last 100)
      const ordersRef = ref(database, 'master/liveOrders');
      const ordersListener = onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const ordersArray = Object.entries(data)
            .map(([id, order]) => ({ id, ...order }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);
          
          setLiveOrders(ordersArray);
          updateHeatMap(ordersArray);
        }
      });
      listenersRef.current.push({ ref: ordersRef, listener: ordersListener });
      
      // 4. Listen to provisions
      const provisionsRef = ref(database, 'master/provisions');
      const provisionsListener = onValue(provisionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setProvisions({
            today: data.today || 0,
            month: data.month || 0,
            year: data.year || 0,
            pending: data.pending || 0,
            history: data.history || []
          });
          
          // Generate forecast if we have enough history
          if (data.history && data.history.length > 30) {
            generateProvisionForecast(data.history);
          }
        }
      });
      listenersRef.current.push({ ref: provisionsRef, listener: provisionsListener });
      
      setLoading(false);
      
    } catch (err) {
      console.error('Error setting up listeners:', err);
      setError(err.message);
      setLoading(false);
    }
    
    // Setup periodic updates (every 5 minutes)
    updateIntervalRef.current = setInterval(() => {
      detectAnomalies();
      updateTrends();
    }, 5 * 60 * 1000);
    
    // Cleanup
    return () => {
      listenersRef.current.forEach(({ ref, listener }) => {
        off(ref, 'value', listener);
      });
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);
  
  // ============================================================================
  // CALCULATION FUNCTIONS
  // ============================================================================
  
  /**
   * Calculate health scores for all tenants
   */
  const calculateTenantHealth = useCallback(async (tenantsData) => {
    try {
      const healthPromises = tenantsData.map(async (tenant) => {
        // Fetch tenant metrics
        const metricsRef = ref(database, "tenants/${tenant.id}/metrics");
        const metricsSnapshot = await get(metricsRef);
        const metrics = metricsSnapshot.val();
        
        if (metrics) {
          const healthScore = calculateHealthScore(metrics);
          return { ...tenant, healthScore };
        }
        return tenant;
      });
      
      const tenantsWithHealth = await Promise.all(healthPromises);
      setTenants(tenantsWithHealth);
      
      // Check for anomalies in health scores
      const newAnomalies = tenantsWithHealth
        .filter(t => t.healthScore && t.healthScore.totalScore < 50)
        .map(t => ({
          type: 'health',
          tenantId: t.id,
          tenantName: t.name,
          score: t.healthScore.totalScore,
          issues: t.healthScore.issues,
          timestamp: new Date().toISOString()
        }));
      
      setAnomalies(prev => [...newAnomalies, ...prev].slice(0, 10));
      
    } catch (err) {
      console.error('Error calculating health scores:', err);
    }
  }, []);
  
  /**
   * Update heat map with live order data
   */
  const updateHeatMap = useCallback((orders) => {
    const heatData = {};
    
    orders.forEach(order => {
      if (order.location && order.location.lat && order.location.lng) {
        // Find canton
        const canton = getCantonByCoordinates(order.location.lat, order.location.lng);
        if (canton) {
          if (!heatData[canton.id]) {
            heatData[canton.id] = {
              orders: 0,
              revenue: 0,
              cities: {}
            };
          }
          
          heatData[canton.id].orders++;
          heatData[canton.id].revenue += order.total || 0;
          
          // Find nearest city
          const city = getNearestCity(order.location.lat, order.location.lng);
          if (city) {
            if (!heatData[canton.id].cities[city.id]) {
              heatData[canton.id].cities[city.id] = {
                name: city.name,
                orders: 0,
                revenue: 0
              };
            }
            heatData[canton.id].cities[city.id].orders++;
            heatData[canton.id].cities[city.id].revenue += order.total || 0;
          }
        }
      }
    });
    
    setHeatMapData(heatData);
  }, []);
  
  /**
   * Calculate provision growth
   */
  const calculateProvisionGrowth = (history) => {
    if (!history || history.length < 2) return 0;
    
    const today = history[history.length - 1]?.value || 0;
    const yesterday = history[history.length - 2]?.value || 0;
    
    if (yesterday === 0) return 0;
    return ((today - yesterday) / yesterday) * 100;
  };
  
  /**
   * Generate provision forecast
   */
  const generateProvisionForecast = useCallback(async (history) => {
    try {
      const forecastResult = forecastProvisions(history, 30);
      setForecast(forecastResult);
    } catch (err) {
      console.error('Error generating forecast:', err);
    }
  }, []);
  /**
   * Detect anomalies across all data
   */
  const detectAnomalies = useCallback(async () => {
    const newAnomalies = [];
    
    // Check each tenant for anomalies
    for (const tenant of tenants) {
      try {
        const ordersRef = ref(database, "tenants/${tenant.id}/orderHistory");
        const ordersSnapshot = await get(ordersRef);
        const orders = ordersSnapshot.val();
        
        if (orders) {
          const ordersArray = Object.values(orders);
          const trends = analyzeTrends({
            orders: ordersArray,
            revenue: ordersArray.map(o => ({ date: o.date, value: o.total })),
            provisions: ordersArray.map(o => ({ date: o.date, value: o.total * 0.03 }))
          });
          
          if (trends.anomalies && trends.anomalies.length > 0) {
            newAnomalies.push(...trends.anomalies.map(a => ({
              ...a,
              tenantId: tenant.id,
              tenantName: tenant.name
            })));
          }
        }
      } catch (err) {
        console.error("Error analyzing tenant ${tenant.id}:", err);
      }
    }
    
    setAnomalies(prev => [...newAnomalies, ...prev].slice(0, 20));
  }, [tenants]);
  
  /**
   * Update trends for all tenants
   */
  const updateTrends = useCallback(async () => {
    const updatedTenants = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const ordersRef = ref(database, "tenants/${tenant.id}/orderHistory");
          const ordersSnapshot = await get(ordersRef);
          const orders = ordersSnapshot.val();
          
          if (orders) {
            const ordersArray = Object.values(orders);
            const trends = analyzeTrends({
              orders: ordersArray,
              revenue: ordersArray.map(o => ({ date: o.date, value: o.total })),
              provisions: ordersArray.map(o => ({ date: o.date, value: o.total * 0.03 }))
            });
            
            return { ...tenant, trends };
          }
        } catch (err) {
          console.error("Error updating trends for ${tenant.id}:", err);
        }
        return tenant;
      })
    );
    
    setTenants(updatedTenants);
  }, [tenants]);
  
  // ============================================================================
  // ACTION FUNCTIONS
  // ============================================================================
  
  /**
   * Update tenant settings
   */
  const updateTenantSettings = useCallback(async (tenantId, settings) => {
    try {
      const tenantRef = ref(database, "master/tenants/${tenantId}");
      await update(tenantRef, settings);
      return { success: true };
    } catch (err) {
      console.error('Error updating tenant:', err);
      return { success: false, error: err.message };
    }
  }, []);
  
  /**
   * Toggle tenant feature
   */
  const toggleTenantFeature = useCallback(async (tenantId, feature, enabled) => {
    try {
      const featureRef = ref(database, "master/tenants/${tenantId}/features/${feature}");
      await set(featureRef, enabled);
      return { success: true };
    } catch (err) {
      console.error('Error toggling feature:', err);
      return { success: false, error: err.message };
    }
  }, []);
  
  /**
   * Extend trial period
   */
  const extendTrial = useCallback(async (tenantId, days) => {
    try {
      const tenantRef = ref(database, "master/tenants/${tenantId}/trial");
      const snapshot = await get(tenantRef);
      const trial = snapshot.val();
      
      if (trial) {
        const newEndDate = new Date(trial.endDate);
        newEndDate.setDate(newEndDate.getDate() + days);
        
        await update(tenantRef, {
          endDate: newEndDate.toISOString(),
          extended: true,
          extensionDays: (trial.extensionDays || 0) + days
        });
        
        return { success: true };
      }
    } catch (err) {
      console.error('Error extending trial:', err);
      return { success: false, error: err.message };
    }
  }, []);
  
  /**
   * Create new tenant
   */
  const createTenant = useCallback(async (tenantData) => {
    try {
      const tenantId = "tenant_${Date.now()}";
      const now = new Date();
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + 3); // 3 months trial
      
      const newTenant = {
        ...tenantData,
        createdAt: now.toISOString(),
        trial: {
          startDate: now.toISOString(),
          endDate: trialEnd.toISOString(),
          exempt: false
        },
        features: {
          basic_ordering: true,
          basic_menu: true,
          basic_analytics: true,
          analytics_pro: true, // All features during trial
          marketing_tools: true,
          loyalty_program: true,
          api_access: false
        },
        billing: {
          plan: 'trial',
          provisionRate: 0.03,
          currency: 'CHF'
        },
        status: 'active'
      };
      
      const tenantRef = ref(database, "master/tenants/${tenantId}");
      await set(tenantRef, newTenant);
      
      // Initialize tenant database structure
      await initializeTenantDatabase(tenantId);
      
      return { success: true, tenantId };
    } catch (err) {
      console.error('Error creating tenant:', err);
      return { success: false, error: err.message };
    }
  }, []);
  
  /**
   * Initialize tenant database structure
   */
  const initializeTenantDatabase = async (tenantId) => {
    const tenantRef = ref(database, "tenants/${tenantId}");
    await set(tenantRef, {
      settings: {
        branding: {
          primaryColor: '#FF6B6B',
          appName: 'Foodtruck Bestellsystem'
        },
        languages: ['de'],
        defaultLanguage: 'de'
      },
      foodtrucks: {},
      orders: {},
      customers: {},
      users: {},
      metrics: {
        paymentSuccess: 0.98,
        orderFrequency: 1.0,
        customerSatisfaction: 4.5,
        technicalIssues: 0.5,
        history: []
      }
    });
  };
  
  // ============================================================================
  // RETURN HOOK DATA
  // ============================================================================
  
  return {
    // State
    tenants,
    analytics,
    liveOrders,
    provisions,
    heatMapData,
    anomalies,
    forecast,
    loading,
    error,
    
    // Actions
    updateTenantSettings,
    toggleTenantFeature,
    extendTrial,
    createTenant,
    
    // Refresh functions
    refreshHealthScores: () => calculateTenantHealth(tenants),
    refreshAnomalies: detectAnomalies,
    refreshTrends: updateTrends
  };
};
