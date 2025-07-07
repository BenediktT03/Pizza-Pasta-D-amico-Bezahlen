/**
 * EATECH - Performance Monitor Hook
 * Version: 4.3.0
 * Description: Advanced performance monitoring for voice interface and app performance
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/hooks/usePerformanceMonitor.js
 * 
 * Features:
 * - Real-time performance metrics collection
 * - Voice-specific performance tracking
 * - Memory usage monitoring
 * - Network latency measurement
 * - Component render time tracking
 * - User interaction analytics
 * - Battery and device optimization
 * - Automated performance alerts
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

// ============================================================================
// CONSTANTS & THRESHOLDS
// ============================================================================

const PERFORMANCE_THRESHOLDS = {
  // Voice Performance
  voice: {
    recognitionLatency: 200, // ms
    processingTime: 500,     // ms
    synthesisLatency: 300,   // ms
    confidenceMin: 0.7,      // minimum confidence
    errorRate: 0.05          // 5% max error rate
  },
  
  // Application Performance
  app: {
    renderTime: 16,          // ms (60fps)
    loadTime: 3000,          // ms
    interactionDelay: 100,   // ms
    memoryUsage: 100,        // MB
    bundleSize: 2            // MB
  },
  
  // Network Performance
  network: {
    latency: 200,            // ms
    bandwidth: 1,            // Mbps
    packetLoss: 0.01,        // 1% max
    connectionStability: 0.95 // 95% uptime
  },
  
  // Device Performance
  device: {
    batteryLow: 0.2,         // 20%
    thermalThrottling: 0.8,  // 80% thermal state
    memoryPressure: 0.85,    // 85% memory usage
    cpuUsage: 0.9            // 90% CPU usage
  }
};

const METRIC_TYPES = {
  VOICE_RECOGNITION: 'voice_recognition',
  VOICE_SYNTHESIS: 'voice_synthesis',
  VOICE_PROCESSING: 'voice_processing',
  COMPONENT_RENDER: 'component_render',
  API_REQUEST: 'api_request',
  USER_INTERACTION: 'user_interaction',
  PAGE_LOAD: 'page_load',
  MEMORY_USAGE: 'memory_usage',
  NETWORK_LATENCY: 'network_latency',
  ERROR_RATE: 'error_rate'
};

const STORAGE_KEYS = {
  METRICS: 'eatech_performance_metrics',
  ALERTS: 'eatech_performance_alerts',
  CONFIG: 'eatech_performance_config'
};

const DEFAULT_CONFIG = {
  enabled: true,
  voiceMonitoring: true,
  memoryMonitoring: true,
  networkMonitoring: true,
  componentMonitoring: false, // Can be heavy
  alertsEnabled: true,
  dataRetention: 7, // days
  samplingRate: 1.0, // 100% sampling
  batchSize: 50,
  uploadInterval: 30000, // 30 seconds
  debugMode: false
};

// ============================================================================
// PERFORMANCE MONITOR HOOK
// ============================================================================

export const usePerformanceMonitor = (config = {}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const { user } = useAuth();
  const { tenant } = useTenant();
  
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  // Refs for performance optimization
  const metricsRef = useRef({});
  const timersRef = useRef({});
  const observersRef = useRef({});
  const batchRef = useRef([]);
  const uploadTimerRef = useRef(null);
  
  // ============================================================================
  // DEVICE & BROWSER CAPABILITIES
  // ============================================================================
  
  const capabilities = useMemo(() => ({
    performanceAPI: 'performance' in window,
    performanceObserver: 'PerformanceObserver' in window,
    memoryAPI: 'memory' in performance,
    connectionAPI: 'connection' in navigator,
    batteryAPI: 'getBattery' in navigator,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    maxTouchPoints: navigator.maxTouchPoints || 0
  }), []);
  
  // ============================================================================
  // CORE MEASUREMENT FUNCTIONS
  // ============================================================================
  
  const startMeasurement = useCallback((name, type = METRIC_TYPES.USER_INTERACTION, metadata = {}) => {
    if (!mergedConfig.enabled) return null;
    
    const measurementId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const measurement = {
      id: measurementId,
      name,
      type,
      startTime: performance.now(),
      startTimestamp: Date.now(),
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: user?.id,
        tenantId: tenant?.id
      }
    };
    
    timersRef.current[measurementId] = measurement;
    
    // Start performance mark if available
    if (capabilities.performanceAPI) {
      try {
        performance.mark(`${name}-start`);
      } catch (error) {
        console.warn('Performance mark failed:', error);
      }
    }
    
    return measurementId;
  }, [mergedConfig.enabled, capabilities.performanceAPI, user, tenant]);
  
  const endMeasurement = useCallback((measurementId, result = {}, error = null) => {
    if (!measurementId || !timersRef.current[measurementId]) {
      return null;
    }
    
    const measurement = timersRef.current[measurementId];
    const endTime = performance.now();
    const duration = endTime - measurement.startTime;
    
    const completedMeasurement = {
      ...measurement,
      endTime,
      endTimestamp: Date.now(),
      duration,
      result,
      error,
      success: !error
    };
    
    // End performance mark and measure
    if (capabilities.performanceAPI) {
      try {
        performance.mark(`${measurement.name}-end`);
        performance.measure(
          measurement.name,
          `${measurement.name}-start`,
          `${measurement.name}-end`
        );
      } catch (error) {
        console.warn('Performance measure failed:', error);
      }
    }
    
    // Store measurement
    addMetric(completedMeasurement);
    
    // Check for performance issues
    checkThresholds(completedMeasurement);
    
    // Cleanup
    delete timersRef.current[measurementId];
    
    return completedMeasurement;
  }, [capabilities.performanceAPI]);
  
  const addMetric = useCallback((metric) => {
    const timestamp = metric.endTimestamp || Date.now();
    const key = `${metric.type}_${new Date(timestamp).toISOString().split('T')[0]}`;
    
    setMetrics(current => {
      const updated = { ...current };
      
      if (!updated[key]) {
        updated[key] = {
          type: metric.type,
          date: new Date(timestamp).toISOString().split('T')[0],
          measurements: [],
          stats: {
            count: 0,
            totalDuration: 0,
            avgDuration: 0,
            minDuration: Infinity,
            maxDuration: 0,
            successRate: 0,
            errorCount: 0
          }
        };
      }
      
      // Add measurement
      updated[key].measurements.push(metric);
      
      // Update statistics
      const stats = updated[key].stats;
      stats.count++;
      stats.totalDuration += metric.duration || 0;
      stats.avgDuration = stats.totalDuration / stats.count;
      stats.minDuration = Math.min(stats.minDuration, metric.duration || 0);
      stats.maxDuration = Math.max(stats.maxDuration, metric.duration || 0);
      
      if (metric.success) {
        stats.successRate = updated[key].measurements.filter(m => m.success).length / stats.count;
      } else {
        stats.errorCount++;
      }
      
      // Store in ref for performance
      metricsRef.current = updated;
      
      // Add to batch for upload
      addToBatch(metric);
      
      return updated;
    });
  }, []);
  
  const addToBatch = useCallback((metric) => {
    if (!mergedConfig.enabled) return;
    
    // Sample based on sampling rate
    if (Math.random() > mergedConfig.samplingRate) return;
    
    batchRef.current.push({
      ...metric,
      sessionId: getSessionId(),
      deviceInfo: getDeviceInfo()
    });
    
    // Upload batch if full
    if (batchRef.current.length >= mergedConfig.batchSize) {
      uploadBatch();
    }
  }, [mergedConfig.enabled, mergedConfig.samplingRate, mergedConfig.batchSize]);
  
  // ============================================================================
  // SPECIALIZED MEASUREMENT FUNCTIONS
  // ============================================================================
  
  const measureVoiceRecognition = useCallback((transcript, confidence, error = null) => {
    const measurementId = startMeasurement(
      'voice_recognition',
      METRIC_TYPES.VOICE_RECOGNITION,
      { transcript: transcript?.substring(0, 100), confidence }
    );
    
    return endMeasurement(measurementId, { transcript, confidence }, error);
  }, [startMeasurement, endMeasurement]);
  
  const measureVoiceSynthesis = useCallback((text, voiceOptions = {}, error = null) => {
    const measurementId = startMeasurement(
      'voice_synthesis',
      METRIC_TYPES.VOICE_SYNTHESIS,
      { textLength: text?.length, ...voiceOptions }
    );
    
    return endMeasurement(measurementId, { textLength: text?.length }, error);
  }, [startMeasurement, endMeasurement]);
  
  const measureComponentRender = useCallback((componentName, renderCount = 1) => {
    if (!mergedConfig.componentMonitoring) return null;
    
    const measurementId = startMeasurement(
      `component_${componentName}`,
      METRIC_TYPES.COMPONENT_RENDER,
      { componentName, renderCount }
    );
    
    // Use requestAnimationFrame to measure actual render time
    requestAnimationFrame(() => {
      endMeasurement(measurementId, { renderCount });
    });
    
    return measurementId;
  }, [mergedConfig.componentMonitoring, startMeasurement, endMeasurement]);
  
  const measureAPIRequest = useCallback(async (url, options = {}) => {
    const measurementId = startMeasurement(
      'api_request',
      METRIC_TYPES.API_REQUEST,
      { url, method: options.method || 'GET' }
    );
    
    try {
      const startTime = performance.now();
      const response = await fetch(url, options);
      const endTime = performance.now();
      
      const result = {
        status: response.status,
        statusText: response.statusText,
        duration: endTime - startTime,
        responseSize: response.headers.get('content-length') || 0
      };
      
      endMeasurement(measurementId, result, response.ok ? null : new Error(`HTTP ${response.status}`));
      
      return response;
    } catch (error) {
      endMeasurement(measurementId, null, error);
      throw error;
    }
  }, [startMeasurement, endMeasurement]);
  
  // ============================================================================
  // SYSTEM MONITORING
  // ============================================================================
  
  const measureMemoryUsage = useCallback(() => {
    if (!capabilities.memoryAPI || !mergedConfig.memoryMonitoring) return null;
    
    try {
      const memoryInfo = performance.memory;
      
      const measurement = {
        id: `memory_${Date.now()}`,
        name: 'memory_usage',
        type: METRIC_TYPES.MEMORY_USAGE,
        timestamp: Date.now(),
        duration: 0,
        result: {
          used: memoryInfo.usedJSHeapSize,
          total: memoryInfo.totalJSHeapSize,
          limit: memoryInfo.jsHeapSizeLimit,
          percentage: (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100
        },
        success: true
      };
      
      addMetric(measurement);
      
      // Check for memory pressure
      if (measurement.result.percentage > PERFORMANCE_THRESHOLDS.device.memoryPressure * 100) {
        createAlert({
          type: 'memory_pressure',
          severity: 'warning',
          message: `High memory usage: ${measurement.result.percentage.toFixed(1)}%`,
          data: measurement.result
        });
      }
      
      return measurement;
    } catch (error) {
      console.error('Failed to measure memory usage:', error);
      return null;
    }
  }, [capabilities.memoryAPI, mergedConfig.memoryMonitoring, addMetric]);
  
  const measureNetworkLatency = useCallback(async () => {
    if (!mergedConfig.networkMonitoring) return null;
    
    try {
      const startTime = performance.now();
      
      // Use a small ping to measure latency
      await fetch('/api/ping', { 
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'cors'
      });
      
      const latency = performance.now() - startTime;
      
      const measurement = {
        id: `network_${Date.now()}`,
        name: 'network_latency',
        type: METRIC_TYPES.NETWORK_LATENCY,
        timestamp: Date.now(),
        duration: latency,
        result: { latency },
        success: true
      };
      
      addMetric(measurement);
      
      // Check network performance
      if (latency > PERFORMANCE_THRESHOLDS.network.latency) {
        createAlert({
          type: 'high_latency',
          severity: 'warning',
          message: `High network latency: ${latency.toFixed(0)}ms`,
          data: { latency }
        });
      }
      
      return measurement;
    } catch (error) {
      const measurement = {
        id: `network_${Date.now()}`,
        name: 'network_latency',
        type: METRIC_TYPES.NETWORK_LATENCY,
        timestamp: Date.now(),
        duration: 0,
        result: null,
        error: error.message,
        success: false
      };
      
      addMetric(measurement);
      
      createAlert({
        type: 'network_error',
        severity: 'error',
        message: 'Network connectivity issue',
        data: { error: error.message }
      });
      
      return measurement;
    }
  }, [mergedConfig.networkMonitoring, addMetric]);
  
  // ============================================================================
  // PERFORMANCE ANALYSIS
  // ============================================================================
  
  const calculatePerformanceScore = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayMetrics = Object.values(metricsRef.current).filter(m => m.date === today);
    
    if (todayMetrics.length === 0) return null;
    
    let totalScore = 0;
    let weights = 0;
    
    // Voice performance (40% weight)
    const voiceMetrics = todayMetrics.filter(m => m.type.startsWith('voice_'));
    if (voiceMetrics.length > 0) {
      const avgVoiceScore = voiceMetrics.reduce((sum, m) => {
        let score = 100;
        
        // Penalize high latency
        if (m.stats.avgDuration > PERFORMANCE_THRESHOLDS.voice.recognitionLatency) {
          score -= Math.min(50, (m.stats.avgDuration - PERFORMANCE_THRESHOLDS.voice.recognitionLatency) / 10);
        }
        
        // Penalize low success rate
        score *= m.stats.successRate;
        
        return sum + Math.max(0, score);
      }, 0) / voiceMetrics.length;
      
      totalScore += avgVoiceScore * 0.4;
      weights += 0.4;
    }
    
    // Application performance (30% weight)
    const appMetrics = todayMetrics.filter(m => 
      m.type === METRIC_TYPES.COMPONENT_RENDER || 
      m.type === METRIC_TYPES.USER_INTERACTION
    );
    
    if (appMetrics.length > 0) {
      const avgAppScore = appMetrics.reduce((sum, m) => {
        let score = 100;
        
        if (m.stats.avgDuration > PERFORMANCE_THRESHOLDS.app.renderTime) {
          score -= Math.min(50, (m.stats.avgDuration - PERFORMANCE_THRESHOLDS.app.renderTime) * 2);
        }
        
        score *= m.stats.successRate;
        
        return sum + Math.max(0, score);
      }, 0) / appMetrics.length;
      
      totalScore += avgAppScore * 0.3;
      weights += 0.3;
    }
    
    // Network performance (20% weight)
    const networkMetrics = todayMetrics.filter(m => 
      m.type === METRIC_TYPES.NETWORK_LATENCY || 
      m.type === METRIC_TYPES.API_REQUEST
    );
    
    if (networkMetrics.length > 0) {
      const avgNetworkScore = networkMetrics.reduce((sum, m) => {
        let score = 100;
        
        if (m.stats.avgDuration > PERFORMANCE_THRESHOLDS.network.latency) {
          score -= Math.min(50, (m.stats.avgDuration - PERFORMANCE_THRESHOLDS.network.latency) / 5);
        }
        
        score *= m.stats.successRate;
        
        return sum + Math.max(0, score);
      }, 0) / networkMetrics.length;
      
      totalScore += avgNetworkScore * 0.2;
      weights += 0.2;
    }
    
    // Memory performance (10% weight)
    const memoryMetrics = todayMetrics.filter(m => m.type === METRIC_TYPES.MEMORY_USAGE);
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1];
      const memoryUsagePercent = latestMemory.result?.percentage || 0;
      
      let memoryScore = 100;
      if (memoryUsagePercent > 70) {
        memoryScore -= (memoryUsagePercent - 70) * 2;
      }
      
      totalScore += Math.max(0, memoryScore) * 0.1;
      weights += 0.1;
    }
    
    const finalScore = weights > 0 ? Math.round(totalScore / weights) : null;
    
    setPerformanceScore(finalScore);
    return finalScore;
  }, []);
  
  const generateRecommendations = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayMetrics = Object.values(metricsRef.current).filter(m => m.date === today);
    const newRecommendations = [];
    
    // Voice performance recommendations
    const voiceMetrics = todayMetrics.filter(m => m.type.startsWith('voice_'));
    voiceMetrics.forEach(metric => {
      if (metric.stats.avgDuration > PERFORMANCE_THRESHOLDS.voice.recognitionLatency) {
        newRecommendations.push({
          type: 'voice_optimization',
          priority: 'high',
          title: 'Optimize Voice Recognition',
          description: `Voice recognition is taking ${metric.stats.avgDuration.toFixed(0)}ms on average. Consider reducing audio quality or using a faster language model.`,
          action: 'Lower audio sample rate or switch to a lighter language model'
        });
      }
      
      if (metric.stats.successRate < 0.9) {
        newRecommendations.push({
          type: 'voice_reliability',
          priority: 'medium',
          title: 'Improve Voice Recognition Accuracy',
          description: `Voice commands are only ${(metric.stats.successRate * 100).toFixed(1)}% successful. Consider microphone calibration or noise reduction.`,
          action: 'Calibrate microphone settings or enable noise reduction'
        });
      }
    });
    
    // Memory recommendations
    const memoryMetrics = todayMetrics.filter(m => m.type === METRIC_TYPES.MEMORY_USAGE);
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1];
      const memoryUsagePercent = latestMemory.result?.percentage || 0;
      
      if (memoryUsagePercent > 80) {
        newRecommendations.push({
          type: 'memory_optimization',
          priority: 'high',
          title: 'High Memory Usage',
          description: `Application is using ${memoryUsagePercent.toFixed(1)}% of available memory. Consider clearing cache or reducing concurrent operations.`,
          action: 'Clear voice command cache or reduce batch sizes'
        });
      }
    }
    
    // Network recommendations
    const networkMetrics = todayMetrics.filter(m => m.type === METRIC_TYPES.NETWORK_LATENCY);
    if (networkMetrics.length > 0) {
      const avgLatency = networkMetrics.reduce((sum, m) => sum + m.stats.avgDuration, 0) / networkMetrics.length;
      
      if (avgLatency > PERFORMANCE_THRESHOLDS.network.latency) {
        newRecommendations.push({
          type: 'network_optimization',
          priority: 'medium',
          title: 'Slow Network Performance',
          description: `Network latency is ${avgLatency.toFixed(0)}ms on average. Consider enabling offline mode or reducing data usage.`,
          action: 'Enable offline voice processing or compress voice data'
        });
      }
    }
    
    setRecommendations(newRecommendations);
    return newRecommendations;
  }, []);
  
  // ============================================================================
  // THRESHOLD MONITORING & ALERTS
  // ============================================================================
  
  const checkThresholds = useCallback((measurement) => {
    if (!mergedConfig.alertsEnabled) return;
    
    const alerts = [];
    
    // Voice-specific thresholds
    if (measurement.type === METRIC_TYPES.VOICE_RECOGNITION) {
      if (measurement.duration > PERFORMANCE_THRESHOLDS.voice.recognitionLatency) {
        alerts.push({
          type: 'voice_latency',
          severity: measurement.duration > PERFORMANCE_THRESHOLDS.voice.recognitionLatency * 2 ? 'error' : 'warning',
          message: `Voice recognition took ${measurement.duration.toFixed(0)}ms`,
          data: measurement
        });
      }
      
      if (measurement.result?.confidence < PERFORMANCE_THRESHOLDS.voice.confidenceMin) {
        alerts.push({
          type: 'voice_confidence',
          severity: 'warning',
          message: `Low voice recognition confidence: ${(measurement.result.confidence * 100).toFixed(1)}%`,
          data: measurement
        });
      }
    }
    
    // Component render thresholds
    if (measurement.type === METRIC_TYPES.COMPONENT_RENDER) {
      if (measurement.duration > PERFORMANCE_THRESHOLDS.app.renderTime) {
        alerts.push({
          type: 'slow_render',
          severity: 'warning',
          message: `Component ${measurement.metadata.componentName} rendered in ${measurement.duration.toFixed(1)}ms`,
          data: measurement
        });
      }
    }
    
    // API request thresholds
    if (measurement.type === METRIC_TYPES.API_REQUEST) {
      if (measurement.duration > PERFORMANCE_THRESHOLDS.network.latency) {
        alerts.push({
          type: 'slow_api',
          severity: 'warning',
          message: `API request to ${measurement.metadata.url} took ${measurement.duration.toFixed(0)}ms`,
          data: measurement
        });
      }
    }
    
    // Create alerts
    alerts.forEach(createAlert);
  }, [mergedConfig.alertsEnabled]);
  
  const createAlert = useCallback((alert) => {
    const newAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...alert
    };
    
    setAlerts(current => [newAlert, ...current.slice(0, 99)]); // Keep last 100 alerts
    
    // Store alerts in localStorage
    try {
      const storedAlerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS) || '[]');
      storedAlerts.unshift(newAlert);
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(storedAlerts.slice(0, 100)));
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
    
    // Log to console in debug mode
    if (mergedConfig.debugMode) {
      console.warn('Performance Alert:', newAlert);
    }
    
    return newAlert;
  }, [mergedConfig.debugMode]);
  
  // ============================================================================
  // DATA MANAGEMENT
  // ============================================================================
  
  const uploadBatch = useCallback(async () => {
    if (batchRef.current.length === 0 || !user) return;
    
    const batch = [...batchRef.current];
    batchRef.current = [];
    
    try {
      await fetch('/api/performance-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          metrics: batch,
          sessionId: getSessionId(),
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to upload performance metrics:', error);
      // Re-add to batch for retry
      batchRef.current.unshift(...batch);
    }
  }, [user]);
  
  const getMetrics = useCallback((type = null, days = 1) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filtered = Object.values(metricsRef.current).filter(metric => {
      const metricDate = new Date(metric.date);
      return metricDate >= cutoffDate && (!type || metric.type === type);
    });
    
    return filtered;
  }, []);
  
  const clearOldMetrics = useCallback(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - mergedConfig.dataRetention);
    
    setMetrics(current => {
      const filtered = {};
      Object.entries(current).forEach(([key, metric]) => {
        const metricDate = new Date(metric.date);
        if (metricDate >= cutoffDate) {
          filtered[key] = metric;
        }
      });
      metricsRef.current = filtered;
      return filtered;
    });
    
    // Clear old alerts
    setAlerts(current => 
      current.filter(alert => 
        Date.now() - alert.timestamp < (mergedConfig.dataRetention * 24 * 60 * 60 * 1000)
      )
    );
  }, [mergedConfig.dataRetention]);
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const getSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem('eatech_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('eatech_session_id', sessionId);
    }
    return sessionId;
  }, []);
  
  const getDeviceInfo = useCallback(() => ({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : null,
    screen: {
      width: screen.width,
      height: screen.height,
      pixelRatio: window.devicePixelRatio
    }
  }), []);
  
  // ============================================================================
  // INITIALIZATION & CLEANUP
  // ============================================================================
  
  useEffect(() => {
    if (!mergedConfig.enabled) return;
    
    setIsMonitoring(true);
    
    // Load stored metrics
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.METRICS);
      if (stored) {
        const parsedMetrics = JSON.parse(stored);
        setMetrics(parsedMetrics);
        metricsRef.current = parsedMetrics;
      }
    } catch (error) {
      console.error('Failed to load stored metrics:', error);
    }
    
    // Load stored alerts
    try {
      const storedAlerts = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (storedAlerts) {
        setAlerts(JSON.parse(storedAlerts));
      }
    } catch (error) {
      console.error('Failed to load stored alerts:', error);
    }
    
    // Set up periodic tasks
    const performanceInterval = setInterval(() => {
      if (mergedConfig.memoryMonitoring) {
        measureMemoryUsage();
      }
      
      if (mergedConfig.networkMonitoring) {
        measureNetworkLatency();
      }
      
      calculatePerformanceScore();
      generateRecommendations();
    }, 30000); // Every 30 seconds
    
    const cleanupInterval = setInterval(() => {
      clearOldMetrics();
    }, 60000 * 60); // Every hour
    
    // Set up upload timer
    if (mergedConfig.uploadInterval > 0) {
      uploadTimerRef.current = setInterval(() => {
        uploadBatch();
      }, mergedConfig.uploadInterval);
    }
    
    // Set up Performance Observer if available
    if (capabilities.performanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const measurement = {
              id: `perf_${Date.now()}`,
              name: entry.name,
              type: METRIC_TYPES.USER_INTERACTION,
              timestamp: Date.now(),
              duration: entry.duration,
              result: {
                entryType: entry.entryType,
                startTime: entry.startTime
              },
              success: true
            };
            
            addMetric(measurement);
          });
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        observersRef.current.performance = observer;
      } catch (error) {
        console.warn('Failed to set up PerformanceObserver:', error);
      }
    }
    
    return () => {
      setIsMonitoring(false);
      clearInterval(performanceInterval);
      clearInterval(cleanupInterval);
      
      if (uploadTimerRef.current) {
        clearInterval(uploadTimerRef.current);
      }
      
      // Disconnect observers
      Object.values(observersRef.current).forEach(observer => {
        if (observer && typeof observer.disconnect === 'function') {
          observer.disconnect();
        }
      });
      
      // Final upload
      uploadBatch();
      
      // Store current metrics
      try {
        localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(metricsRef.current));
      } catch (error) {
        console.error('Failed to store metrics on cleanup:', error);
      }
    };
  }, [mergedConfig, capabilities, measureMemoryUsage, measureNetworkLatency, calculatePerformanceScore, generateRecommendations, clearOldMetrics, uploadBatch, addMetric]);
  
  // ============================================================================
  // RETURN API
  // ============================================================================
  
  return {
    // State
    metrics,
    alerts,
    isMonitoring,
    performanceScore,
    recommendations,
    capabilities,
    
    // Core measurement functions
    startMeasurement,
    endMeasurement,
    addMetric,
    
    // Specialized measurements
    measureVoiceRecognition,
    measureVoiceSynthesis,
    measureComponentRender,
    measureAPIRequest,
    measureMemoryUsage,
    measureNetworkLatency,
    
    // Analysis
    calculatePerformanceScore,
    generateRecommendations,
    getMetrics,
    
    // Data management
    clearOldMetrics,
    uploadBatch,
    
    // Configuration
    config: mergedConfig,
    
    // Utilities
    createAlert,
    getSessionId,
    getDeviceInfo
  };
};

export default usePerformanceMonitor;