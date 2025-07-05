/**
 * EATECH - useRealtime Hook
 * Version: 30.0.0
 * Description: Custom Hook für Realtime Festival-Daten via Firebase
 * File Path: /src/hooks/useRealtime.js
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getDatabase, 
  ref, 
  onValue, 
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  off,
  query,
  orderByChild,
  limitToLast,
  startAt,
  endAt
} from 'firebase/database';

// ============================================================================
// REALTIME HOOK
// ============================================================================
export const useRealtime = (channel, options = {}) => {
  const [metrics, setMetrics] = useState(null);
  const [vendorStatus, setVendorStatus] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [liveTransactions, setLiveTransactions] = useState([]);
  const [queueUpdates, setQueueUpdates] = useState({});
  const [connected, setConnected] = useState(false);
  
  const db = getDatabase();
  const listeners = useRef({});
  const metricsBuffer = useRef([]);
  const updateTimer = useRef(null);
  
  // Optionen
  const {
    updateInterval = 1000, // Batch updates every second
    maxAlerts = 50,
    transactionLimit = 100,
    enableMetrics = true,
    enableVendorStatus = true,
    enableAlerts = true,
    enableTransactions = true,
    enableQueues = true
  } = options;
  
  // Batch Update Function
  const processBatchUpdates = useCallback(() => {
    if (metricsBuffer.current.length > 0) {
      const aggregated = metricsBuffer.current.reduce((acc, update) => {
        Object.keys(update).forEach(key => {
          if (typeof update[key] === 'number') {
            acc[key] = (acc[key] || 0) + update[key];
          } else {
            acc[key] = update[key];
          }
        });
        return acc;
      }, {});
      
      setMetrics(prev => ({
        ...prev,
        ...aggregated,
        lastUpdate: Date.now()
      }));
      
      metricsBuffer.current = [];
    }
  }, []);
  
  // Setup Realtime Listeners
  useEffect(() => {
    if (!channel) return;
    
    // Connection State
    const connectedRef = ref(db, '.info/connected');
    listeners.current.connected = onValue(connectedRef, (snapshot) => {
      setConnected(snapshot.val() === true);
    });
    
    // Metrics Stream
    if (enableMetrics) {
      const metricsRef = ref(db, `realtime/${channel}/metrics`);
      listeners.current.metrics = onValue(metricsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          metricsBuffer.current.push(data);
        }
      });
    }
    
    // Vendor Status Updates
    if (enableVendorStatus) {
      const vendorRef = ref(db, `realtime/${channel}/vendors`);
      
      listeners.current.vendorAdded = onChildAdded(vendorRef, (snapshot) => {
        const vendorId = snapshot.key;
        const data = snapshot.val();
        setVendorStatus(prev => ({
          ...prev,
          [vendorId]: data
        }));
      });
      
      listeners.current.vendorChanged = onChildChanged(vendorRef, (snapshot) => {
        const vendorId = snapshot.key;
        const data = snapshot.val();
        setVendorStatus(prev => ({
          ...prev,
          [vendorId]: { ...prev[vendorId], ...data }
        }));
      });
      
      listeners.current.vendorRemoved = onChildRemoved(vendorRef, (snapshot) => {
        const vendorId = snapshot.key;
        setVendorStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[vendorId];
          return newStatus;
        });
      });
    }
    
    // Alerts Stream
    if (enableAlerts) {
      const alertsQuery = query(
        ref(db, `realtime/${channel}/alerts`),
        orderByChild('timestamp'),
        limitToLast(maxAlerts)
      );
      
      listeners.current.alerts = onValue(alertsQuery, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const alertsList = Object.entries(data)
            .map(([id, alert]) => ({ id, ...alert }))
            .sort((a, b) => b.timestamp - a.timestamp);
          setAlerts(alertsList);
        }
      });
    }
    
    // Live Transactions
    if (enableTransactions) {
      const transQuery = query(
        ref(db, `realtime/${channel}/transactions`),
        orderByChild('timestamp'),
        limitToLast(transactionLimit)
      );
      
      listeners.current.transactions = onValue(transQuery, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const transList = Object.entries(data)
            .map(([id, trans]) => ({ id, ...trans }))
            .sort((a, b) => b.timestamp - a.timestamp);
          setLiveTransactions(transList);
        }
      });
    }
    
    // Queue Updates
    if (enableQueues) {
      const queueRef = ref(db, `realtime/${channel}/queues`);
      
      listeners.current.queueUpdates = onValue(queueRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setQueueUpdates(data);
        }
      });
    }
    
    // Start batch update timer
    updateTimer.current = setInterval(processBatchUpdates, updateInterval);
    
    // Cleanup
    return () => {
      Object.values(listeners.current).forEach(listener => {
        if (typeof listener === 'function') {
          off(listener);
        }
      });
      
      if (updateTimer.current) {
        clearInterval(updateTimer.current);
      }
      
      listeners.current = {};
    };
  }, [
    channel, 
    db, 
    updateInterval, 
    maxAlerts, 
    transactionLimit,
    enableMetrics,
    enableVendorStatus,
    enableAlerts,
    enableTransactions,
    enableQueues,
    processBatchUpdates
  ]);
  
  // Calculate derived metrics
  const derivedMetrics = useCallback(() => {
    if (!metrics || !liveTransactions.length) return {};
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;
    
    // Transactions per minute
    const recentTransactions = liveTransactions.filter(
      t => t.timestamp > oneMinuteAgo
    );
    
    // Moving averages
    const last5MinTransactions = liveTransactions.filter(
      t => t.timestamp > fiveMinutesAgo
    );
    
    const transactionsPerMinute = recentTransactions.length;
    const avgTransactionValue = last5MinTransactions.length > 0
      ? last5MinTransactions.reduce((sum, t) => sum + t.amount, 0) / last5MinTransactions.length
      : 0;
    
    // Revenue trend (compare last minute to previous minute)
    const twoMinutesAgo = now - 120000;
    const prevMinuteTransactions = liveTransactions.filter(
      t => t.timestamp > twoMinutesAgo && t.timestamp <= oneMinuteAgo
    );
    
    const currentRevenue = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const previousRevenue = prevMinuteTransactions.reduce((sum, t) => sum + t.amount, 0);
    const revenueChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;
    
    return {
      transactionsPerMinute,
      avgTransactionValue,
      revenueChange,
      currentRevenue,
      activeVendorsCount: Object.values(vendorStatus).filter(v => v.isActive).length,
      criticalAlertsCount: alerts.filter(a => a.severity === 'critical').length
    };
  }, [metrics, liveTransactions, vendorStatus, alerts]);
  
  // Get queue heatmap data
  const getQueueHeatmap = useCallback(() => {
    if (!queueUpdates || Object.keys(queueUpdates).length === 0) {
      return { data: [], maxWait: 0 };
    }
    
    const heatmapData = Object.entries(queueUpdates).map(([vendorId, queue]) => ({
      vendorId,
      x: queue.position?.x || 0,
      y: queue.position?.y || 0,
      waitTime: queue.avgWaitTime || 0,
      queueLength: queue.length || 0,
      intensity: Math.min(queue.avgWaitTime / 30, 1) // 30 min max for full intensity
    }));
    
    const maxWait = Math.max(...heatmapData.map(d => d.waitTime));
    
    return { data: heatmapData, maxWait };
  }, [queueUpdates]);
  
  // Send alert
  const sendAlert = useCallback(async (alert) => {
    if (!channel) return;
    
    try {
      const alertRef = ref(db, `realtime/${channel}/alerts`);
      await push(alertRef, {
        ...alert,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  }, [channel, db]);
  
  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const derived = derivedMetrics();
    const queueData = getQueueHeatmap();
    
    return {
      status: connected ? 'connected' : 'disconnected',
      metrics: {
        ...metrics,
        ...derived
      },
      vendorsSummary: {
        total: Object.keys(vendorStatus).length,
        active: derived.activeVendorsCount,
        withIssues: Object.values(vendorStatus).filter(v => v.hasIssues).length
      },
      queuesSummary: {
        avgWaitTime: queueData.maxWait,
        vendorsWithQueues: queueData.data.filter(q => q.queueLength > 0).length
      },
      alertsSummary: {
        total: alerts.length,
        critical: derived.criticalAlertsCount,
        unresolved: alerts.filter(a => !a.resolved).length
      }
    };
  }, [connected, metrics, vendorStatus, alerts, derivedMetrics, getQueueHeatmap]);
  
  return {
    // Connection state
    connected,
    
    // Raw data
    metrics: { ...metrics, ...derivedMetrics() },
    vendorStatus,
    alerts,
    liveTransactions,
    queueUpdates,
    
    // Computed data
    queueHeatmap: getQueueHeatmap(),
    performanceSummary: getPerformanceSummary(),
    
    // Actions
    sendAlert
  };
};

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

// Festival-specific realtime hook
export const useFestivalRealtime = (festivalId) => {
  return useRealtime(`festival-${festivalId}`, {
    enableMetrics: true,
    enableVendorStatus: true,
    enableAlerts: true,
    enableTransactions: true,
    enableQueues: true,
    updateInterval: 500 // Faster updates for festivals
  });
};

// Wallet-specific realtime hook
export const useWalletRealtime = (festivalId) => {
  return useRealtime(`wallet-${festivalId}`, {
    enableMetrics: true,
    enableVendorStatus: false,
    enableAlerts: true,
    enableTransactions: true,
    enableQueues: false,
    transactionLimit: 200 // More transactions for wallet
  });
};

// Vendor-specific realtime hook
export const useVendorRealtime = (vendorId) => {
  return useRealtime(`vendor-${vendorId}`, {
    enableMetrics: true,
    enableVendorStatus: false,
    enableAlerts: true,
    enableTransactions: true,
    enableQueues: true,
    updateInterval: 2000 // Less frequent for individual vendors
  });
};