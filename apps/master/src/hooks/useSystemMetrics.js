/**
 * EATECH System Metrics Hook
 * Version: 1.0.0
 * 
 * React hook for real-time system metrics monitoring
 * Features:
 * - Real-time metric updates
 * - Historical data access
 * - Alert management
 * - Performance optimization
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/hooks/useSystemMetrics.js
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import monitoringService from '../services/monitoring.service';
import masterApiService from '../services/masterApi.service';

export const useSystemMetrics = (options = {}) => {
  const {
    refreshInterval = 60000, // 1 minute default
    metrics = ['cpu', 'memory', 'disk', 'network', 'responseTime', 'errorRate'],
    enableRealtime = true,
    historyDuration = '1h'
  } = options;

  // State
  const [currentMetrics, setCurrentMetrics] = useState({});
  const [metricHistory, setMetricHistory] = useState({});
  const [systemStatus, setSystemStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Refs
  const refreshTimerRef = useRef(null);
  const eventListenerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Initialize monitoring
  useEffect(() => {
    isMountedRef.current = true;
    
    // Start monitoring if not already running
    if (!monitoringService.isMonitoring) {
      monitoringService.start(refreshInterval / 1000);
    }

    // Initial data fetch
    fetchMetrics();
    fetchSystemStatus();

    // Setup refresh interval
    if (refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        fetchMetrics();
        fetchSystemStatus();
      }, refreshInterval);
    }

    // Setup real-time updates
    if (enableRealtime) {
      setupRealtimeUpdates();
    }

    // Cleanup
    return () => {
      isMountedRef.current = false;
      
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }

      if (eventListenerRef.current) {
        window.removeEventListener('metricsUpdate', eventListenerRef.current);
      }
    };
  }, [refreshInterval, enableRealtime]);

  // Fetch current metrics
  const fetchMetrics = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      // Get latest metrics from monitoring service
      const latest = {};
      const history = {};

      metrics.forEach(metric => {
        latest[metric] = monitoringService.getLatestMetric(metric);
        history[metric] = monitoringService.getMetricHistory(metric, historyDuration);
      });

      setCurrentMetrics(latest);
      setMetricHistory(history);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(err.message);
    }
  }, [metrics, historyDuration]);

  // Fetch system status
  const fetchSystemStatus = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const status = monitoringService.getSystemStatus();
      setSystemStatus(status);
      setAlerts(status.activeAlerts || []);
      
      if (isLoading) {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch system status:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [isLoading]);

  // Setup real-time updates
  const setupRealtimeUpdates = useCallback(() => {
    eventListenerRef.current = (event) => {
      if (!isMountedRef.current) return;

      const updatedMetrics = event.detail;
      
      // Update current metrics
      setCurrentMetrics(prev => ({
        ...prev,
        ...updatedMetrics
      }));

      // Update history
      const timestamp = new Date();
      setMetricHistory(prev => {
        const updated = { ...prev };
        
        Object.keys(updatedMetrics).forEach(metric => {
          if (metrics.includes(metric)) {
            if (!updated[metric]) {
              updated[metric] = [];
            }
            
            updated[metric].push({
              value: updatedMetrics[metric],
              timestamp
            });

            // Trim history to duration
            const cutoffTime = new Date(timestamp.getTime() - parseDuration(historyDuration));
            updated[metric] = updated[metric].filter(point => 
              point.timestamp > cutoffTime
            );
          }
        });

        return updated;
      });

      setLastUpdate(timestamp);
    };

    window.addEventListener('metricsUpdate', eventListenerRef.current);
  }, [metrics, historyDuration]);

  // Get metric statistics
  const getMetricStats = useCallback((metric) => {
    const history = metricHistory[metric] || [];
    
    if (history.length === 0) {
      return {
        current: null,
        min: null,
        max: null,
        avg: null,
        trend: 'stable'
      };
    }

    const values = history.map(point => point.value);
    const current = currentMetrics[metric];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Calculate trend
    let trend = 'stable';
    if (history.length >= 2) {
      const recent = history.slice(-5).map(p => p.value);
      const older = history.slice(-10, -5).map(p => p.value);
      
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
        
        if (recentAvg > olderAvg * 1.1) {
          trend = 'increasing';
        } else if (recentAvg < olderAvg * 0.9) {
          trend = 'decreasing';
        }
      }
    }

    return {
      current,
      min,
      max,
      avg,
      trend
    };
  }, [currentMetrics, metricHistory]);

  // Get metric health status
  const getMetricHealth = useCallback((metric) => {
    const value = currentMetrics[metric];
    if (value === null || value === undefined) return 'unknown';

    const thresholds = monitoringService.thresholds[metric];
    if (!thresholds) return 'unknown';

    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'healthy';
  }, [currentMetrics]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId) => {
    monitoringService.acknowledgeAlert(alertId);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  // Export metrics
  const exportMetrics = useCallback((format = 'json') => {
    return monitoringService.exportMetrics(format);
  }, []);

  // Force refresh
  const refresh = useCallback(() => {
    fetchMetrics();
    fetchSystemStatus();
  }, [fetchMetrics, fetchSystemStatus]);

  // Helper function to parse duration
  const parseDuration = (duration) => {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1 hour

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  };

  return {
    // Current state
    currentMetrics,
    metricHistory,
    systemStatus,
    alerts,
    isLoading,
    error,
    lastUpdate,

    // Methods
    getMetricStats,
    getMetricHealth,
    acknowledgeAlert,
    exportMetrics,
    refresh,

    // Computed values
    isHealthy: systemStatus?.healthy ?? true,
    summary: systemStatus?.summary ?? 'System status unknown'
  };
};

// Hook for specific metric
export const useMetric = (metricName, options = {}) => {
  const { currentMetrics, metricHistory, getMetricStats, getMetricHealth } = useSystemMetrics({
    ...options,
    metrics: [metricName]
  });

  return {
    value: currentMetrics[metricName],
    history: metricHistory[metricName] || [],
    stats: getMetricStats(metricName),
    health: getMetricHealth(metricName)
  };
};

// Hook for system health
export const useSystemHealth = (options = {}) => {
  const { systemStatus, alerts, isLoading, error, acknowledgeAlert } = useSystemMetrics(options);

  return {
    status: systemStatus,
    alerts,
    isLoading,
    error,
    acknowledgeAlert,
    isHealthy: systemStatus?.healthy ?? true,
    summary: systemStatus?.summary ?? 'System status unknown'
  };
};