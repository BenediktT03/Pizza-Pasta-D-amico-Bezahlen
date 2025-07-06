/**
 * EATECH - Performance Monitor
 * Version: 7.3.0
 * Description: Comprehensive Performance Monitoring mit Lazy Loading und Real-time Tracking
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /packages/core/src/utils/performanceMonitor.js
 * 
 * Features: Core Web Vitals, User timing, Resource monitoring, Memory tracking
 */

import { EventEmitter } from 'events';

// Lazy loaded analyzers
const vitalAnalyzer = () => import('../analyzers/vitalAnalyzer');
const resourceAnalyzer = () => import('../analyzers/resourceAnalyzer');
const memoryAnalyzer = () => import('../analyzers/memoryAnalyzer');
const networkAnalyzer = () => import('../analyzers/networkAnalyzer');
const renderAnalyzer = () => import('../analyzers/renderAnalyzer');

// Lazy loaded reporters
const analyticsReporter = () => import('../reporters/analyticsReporter');
const consoleReporter = () => import('../reporters/consoleReporter');
const remoteReporter = () => import('../reporters/remoteReporter');

// Lazy loaded utilities
const metricsCalculator = () => import('./metricsCalculator');
const performanceStorage = () => import('./performanceStorage');
const budgetChecker = () => import('./budgetChecker');

/**
 * Performance Metric Types
 */
export const METRIC_TYPES = {
  // Core Web Vitals
  LCP: 'largest-contentful-paint',
  FID: 'first-input-delay',
  CLS: 'cumulative-layout-shift',
  
  // Loading Metrics
  FCP: 'first-contentful-paint',
  TTFB: 'time-to-first-byte',
  DOMContentLoaded: 'dom-content-loaded',
  LoadComplete: 'load-complete',
  
  // Interactivity Metrics
  TTI: 'time-to-interactive',
  TBT: 'total-blocking-time',
  FMP: 'first-meaningful-paint',
  
  // Custom Metrics
  API_RESPONSE_TIME: 'api-response-time',
  COMPONENT_RENDER_TIME: 'component-render-time',
  USER_JOURNEY_TIME: 'user-journey-time',
  ERROR_RATE: 'error-rate',
  
  // Resource Metrics
  RESOURCE_LOAD_TIME: 'resource-load-time',
  BUNDLE_SIZE: 'bundle-size',
  CACHE_HIT_RATE: 'cache-hit-rate'
};

/**
 * Performance Thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  [METRIC_TYPES.LCP]: { good: 2500, poor: 4000 },
  [METRIC_TYPES.FID]: { good: 100, poor: 300 },
  [METRIC_TYPES.CLS]: { good: 0.1, poor: 0.25 },
  [METRIC_TYPES.FCP]: { good: 1800, poor: 3000 },
  [METRIC_TYPES.TTFB]: { good: 800, poor: 1800 },
  [METRIC_TYPES.TTI]: { good: 3800, poor: 7300 },
  [METRIC_TYPES.TBT]: { good: 200, poor: 600 }
};

/**
 * Budget Configuration
 */
export const PERFORMANCE_BUDGETS = {
  javascript: { max: 400, unit: 'KB' },
  css: { max: 100, unit: 'KB' },
  images: { max: 1000, unit: 'KB' },
  fonts: { max: 200, unit: 'KB' },
  total: { max: 2000, unit: 'KB' },
  requests: { max: 50, unit: 'count' }
};

/**
 * Main Performance Monitor Class
 */
class PerformanceMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      enableCoreWebVitals: true,
      enableResourceMonitoring: true,
      enableMemoryMonitoring: true,
      enableNetworkMonitoring: true,
      enableUserTiming: true,
      enableErrorTracking: true,
      enableBudgetChecking: true,
      sampleRate: 1.0,
      reportingInterval: 30000, // 30 seconds
      maxMetricsStorage: 1000,
      enableRealTimeReporting: true,
      thresholds: PERFORMANCE_THRESHOLDS,
      budgets: PERFORMANCE_BUDGETS,
      ...config
    };
    
    this.metrics = new Map();
    this.observers = new Map();
    this.timers = new Map();
    this.isInitialized = false;
    this.sessionId = this.generateSessionId();
    this.pageLoadStartTime = performance.now();
    
    // Bind methods
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
  }

  /**
   * Initialize Performance Monitor
   */
  async initialize() {
    try {
      console.log('Initializing Performance Monitor...');
      
      // Check browser support
      this.checkBrowserSupport();
      
      // Initialize core components
      await this.initializeAnalyzers();
      await this.initializeReporters();
      await this.initializeStorage();
      
      // Start monitoring
      if (this.config.enableCoreWebVitals) {
        this.startCoreWebVitalsMonitoring();
      }
      
      if (this.config.enableResourceMonitoring) {
        this.startResourceMonitoring();
      }
      
      if (this.config.enableMemoryMonitoring) {
        this.startMemoryMonitoring();
      }
      
      if (this.config.enableNetworkMonitoring) {
        this.startNetworkMonitoring();
      }
      
      if (this.config.enableUserTiming) {
        this.startUserTimingMonitoring();
      }
      
      if (this.config.enableErrorTracking) {
        this.startErrorTracking();
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start reporting
      if (this.config.enableRealTimeReporting) {
        this.startReporting();
      }
      
      // Check budgets
      if (this.config.enableBudgetChecking) {
        await this.checkBudgets();
      }
      
      this.isInitialized = true;
      console.log('Performance Monitor initialized successfully');
      
      this.emit('initialized');
      
    } catch (error) {
      console.error('Performance Monitor initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check browser support
   */
  checkBrowserSupport() {
    const support = {
      performanceObserver: 'PerformanceObserver' in window,
      performanceTiming: 'performance' in window && 'timing' in performance,
      performanceNavigation: 'performance' in window && 'navigation' in performance,
      userTiming: 'performance' in window && 'mark' in performance,
      resourceTiming: 'performance' in window && 'getEntriesByType' in performance,
      memoryInfo: 'memory' in performance,
      networkInformation: 'connection' in navigator
    };
    
    console.log('Performance API Support:', support);
    return support;
  }

  /**
   * Initialize analyzers
   */
  async initializeAnalyzers() {
    try {
      // Vital Analyzer
      const { default: VitalAnalyzer } = await vitalAnalyzer();
      this.vitalAnalyzer = new VitalAnalyzer(this.config.thresholds);
      
      // Resource Analyzer
      const { default: ResourceAnalyzer } = await resourceAnalyzer();
      this.resourceAnalyzer = new ResourceAnalyzer();
      
      // Memory Analyzer
      const { default: MemoryAnalyzer } = await memoryAnalyzer();
      this.memoryAnalyzer = new MemoryAnalyzer();
      
      // Network Analyzer
      const { default: NetworkAnalyzer } = await networkAnalyzer();
      this.networkAnalyzer = new NetworkAnalyzer();
      
      // Render Analyzer
      const { default: RenderAnalyzer } = await renderAnalyzer();
      this.renderAnalyzer = new RenderAnalyzer();
      
    } catch (error) {
      console.error('Error initializing analyzers:', error);
      throw error;
    }
  }

  /**
   * Initialize reporters
   */
  async initializeReporters() {
    try {
      this.reporters = [];
      
      // Console Reporter
      const { default: ConsoleReporter } = await consoleReporter();
      this.reporters.push(new ConsoleReporter());
      
      // Analytics Reporter
      if (this.config.analyticsEndpoint) {
        const { default: AnalyticsReporter } = await analyticsReporter();
        this.reporters.push(new AnalyticsReporter(this.config.analyticsEndpoint));
      }
      
      // Remote Reporter
      if (this.config.reportingEndpoint) {
        const { default: RemoteReporter } = await remoteReporter();
        this.reporters.push(new RemoteReporter(this.config.reportingEndpoint));
      }
      
    } catch (error) {
      console.error('Error initializing reporters:', error);
    }
  }

  /**
   * Initialize storage
   */
  async initializeStorage() {
    try {
      const { default: PerformanceStorage } = await performanceStorage();
      this.storage = new PerformanceStorage(this.config.maxMetricsStorage);
      await this.storage.initialize();
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  /**
   * Start Core Web Vitals monitoring
   */
  startCoreWebVitalsMonitoring() {
    try {
      // Largest Contentful Paint (LCP)
      this.observeMetric('largest-contentful-paint', (entries) => {
        const lastEntry = entries[entries.length - 1];
        this.recordMetric(METRIC_TYPES.LCP, lastEntry.startTime, {
          element: lastEntry.element?.tagName,
          url: lastEntry.url,
          size: lastEntry.size
        });
      });

      // First Input Delay (FID)
      this.observeMetric('first-input', (entries) => {
        entries.forEach(entry => {
          this.recordMetric(METRIC_TYPES.FID, entry.processingStart - entry.startTime, {
            eventType: entry.name,
            target: entry.target?.tagName
          });
        });
      });

      // Cumulative Layout Shift (CLS)
      this.observeMetric('layout-shift', (entries) => {
        let clsValue = 0;
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        if (clsValue > 0) {
          this.recordMetric(METRIC_TYPES.CLS, clsValue);
        }
      });

      // First Contentful Paint (FCP)
      this.observeMetric('paint', (entries) => {
        entries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric(METRIC_TYPES.FCP, entry.startTime);
          }
        });
      });

    } catch (error) {
      console.error('Error starting Core Web Vitals monitoring:', error);
    }
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring() {
    try {
      this.observeMetric('resource', (entries) => {
        entries.forEach(entry => {
          const resourceType = this.getResourceType(entry.name);
          
          this.recordMetric(METRIC_TYPES.RESOURCE_LOAD_TIME, entry.duration, {
            name: entry.name,
            type: resourceType,
            size: entry.transferSize,
            cached: entry.transferSize === 0 && entry.decodedBodySize > 0
          });
        });
      });

      this.observeMetric('navigation', (entries) => {
        entries.forEach(entry => {
          this.recordMetric(METRIC_TYPES.TTFB, entry.responseStart - entry.requestStart);
          this.recordMetric(METRIC_TYPES.DOMContentLoaded, entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart);
          this.recordMetric(METRIC_TYPES.LoadComplete, entry.loadEventEnd - entry.loadEventStart);
        });
      });

    } catch (error) {
      console.error('Error starting resource monitoring:', error);
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (!('memory' in performance)) {
      console.warn('Memory monitoring not supported');
      return;
    }

    try {
      const checkMemory = () => {
        const memInfo = performance.memory;
        
        this.recordMetric('memory-used', memInfo.usedJSHeapSize, {
          total: memInfo.totalJSHeapSize,
          limit: memInfo.jsHeapSizeLimit,
          utilization: (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100
        });
      };

      // Check memory every 10 seconds
      setInterval(checkMemory, 10000);
      checkMemory(); // Initial check

    } catch (error) {
      console.error('Error starting memory monitoring:', error);
    }
  }

  /**
   * Start network monitoring
   */
  startNetworkMonitoring() {
    if (!('connection' in navigator)) {
      console.warn('Network monitoring not supported');
      return;
    }

    try {
      const connection = navigator.connection;
      
      const recordNetworkInfo = () => {
        this.recordMetric('network-info', 0, {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      };

      connection.addEventListener('change', recordNetworkInfo);
      recordNetworkInfo(); // Initial recording

    } catch (error) {
      console.error('Error starting network monitoring:', error);
    }
  }

  /**
   * Start user timing monitoring
   */
  startUserTimingMonitoring() {
    try {
      this.observeMetric('measure', (entries) => {
        entries.forEach(entry => {
          this.recordMetric(METRIC_TYPES.USER_JOURNEY_TIME, entry.duration, {
            name: entry.name,
            detail: entry.detail
          });
        });
      });

    } catch (error) {
      console.error('Error starting user timing monitoring:', error);
    }
  }

  /**
   * Start error tracking
   */
  startErrorTracking() {
    try {
      let errorCount = 0;
      
      window.addEventListener('error', (event) => {
        errorCount++;
        this.recordMetric(METRIC_TYPES.ERROR_RATE, errorCount, {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        errorCount++;
        this.recordMetric(METRIC_TYPES.ERROR_RATE, errorCount, {
          reason: event.reason?.toString()
        });
      });

    } catch (error) {
      console.error('Error starting error tracking:', error);
    }
  }

  /**
   * Observe performance metric
   */
  observeMetric(type, callback) {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        if (Math.random() > this.config.sampleRate) return;
        callback(list.getEntries());
      });

      observer.observe({ type, buffered: true });
      this.observers.set(type, observer);

    } catch (error) {
      console.error(`Error observing ${type}:`, error);
    }
  }

  /**
   * Record metric
   */
  recordMetric(type, value, metadata = {}) {
    const metric = {
      type,
      value,
      timestamp: performance.now(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata
    };

    this.metrics.set(`${type}-${Date.now()}`, metric);
    
    // Store in persistent storage
    if (this.storage) {
      this.storage.store(metric);
    }

    // Analyze metric
    this.analyzeMetric(metric);
    
    this.emit('metric_recorded', metric);
  }

  /**
   * Analyze metric
   */
  async analyzeMetric(metric) {
    try {
      const threshold = this.config.thresholds[metric.type];
      
      if (threshold && this.vitalAnalyzer) {
        const analysis = await this.vitalAnalyzer.analyze(metric, threshold);
        
        if (analysis.isAlert) {
          this.emit('performance_alert', {
            metric,
            analysis,
            severity: analysis.severity
          });
        }
      }

    } catch (error) {
      console.error('Error analyzing metric:', error);
    }
  }

  /**
   * Start custom timer
   */
  startTimer(name) {
    if ('mark' in performance) {
      performance.mark(`${name}-start`);
    }
    
    this.timers.set(name, performance.now());
  }

  /**
   * End custom timer
   */
  endTimer(name, metadata = {}) {
    const startTime = this.timers.get(name);
    
    if (startTime !== undefined) {
      const duration = performance.now() - startTime;
      
      if ('mark' in performance && 'measure' in performance) {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      }
      
      this.recordMetric(METRIC_TYPES.COMPONENT_RENDER_TIME, duration, {
        name,
        ...metadata
      });
      
      this.timers.delete(name);
      return duration;
    }
    
    return null;
  }

  /**
   * Measure API response time
   */
  async measureAPICall(url, requestInit = {}) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, requestInit);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordMetric(METRIC_TYPES.API_RESPONSE_TIME, duration, {
        url,
        method: requestInit.method || 'GET',
        status: response.status,
        ok: response.ok
      });
      
      return response;
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordMetric(METRIC_TYPES.API_RESPONSE_TIME, duration, {
        url,
        method: requestInit.method || 'GET',
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.emit('session_paused');
    } else {
      this.emit('session_resumed');
    }
  }

  /**
   * Handle before unload
   */
  handleBeforeUnload() {
    this.emit('session_ending');
    this.sendFinalReport();
  }

  /**
   * Start reporting
   */
  startReporting() {
    setInterval(() => {
      this.generateReport();
    }, this.config.reportingInterval);
  }

  /**
   * Generate performance report
   */
  async generateReport() {
    try {
      const { default: MetricsCalculator } = await metricsCalculator();
      const calculator = new MetricsCalculator();
      
      const metrics = Array.from(this.metrics.values());
      const report = await calculator.generateReport(metrics, {
        sessionId: this.sessionId,
        timeframe: this.config.reportingInterval,
        thresholds: this.config.thresholds
      });
      
      // Send to reporters
      this.reporters.forEach(reporter => {
        reporter.send(report);
      });
      
      this.emit('report_generated', report);
      
    } catch (error) {
      console.error('Error generating report:', error);
    }
  }

  /**
   * Send final report
   */
  sendFinalReport() {
    // Use sendBeacon for reliable delivery
    if ('sendBeacon' in navigator && this.config.reportingEndpoint) {
      const finalReport = {
        sessionId: this.sessionId,
        metrics: Array.from(this.metrics.values()),
        timestamp: Date.now(),
        type: 'session_end'
      };
      
      navigator.sendBeacon(
        this.config.reportingEndpoint,
        JSON.stringify(finalReport)
      );
    }
  }

  /**
   * Check performance budgets
   */
  async checkBudgets() {
    try {
      const { default: BudgetChecker } = await budgetChecker();
      const checker = new BudgetChecker(this.config.budgets);
      
      const resourceEntries = performance.getEntriesByType('resource');
      const violations = await checker.check(resourceEntries);
      
      if (violations.length > 0) {
        this.emit('budget_violations', violations);
        console.warn('Performance budget violations:', violations);
      }
      
    } catch (error) {
      console.error('Error checking budgets:', error);
    }
  }

  /**
   * Get resource type from URL
   */
  getResourceType(url) {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'css';
    if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * Get current metrics
   */
  getMetrics(type = null) {
    const allMetrics = Array.from(this.metrics.values());
    
    if (type) {
      return allMetrics.filter(metric => metric.type === type);
    }
    
    return allMetrics;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const metrics = this.getMetrics();
    const summary = {};
    
    // Group by type and calculate averages
    Object.values(METRIC_TYPES).forEach(type => {
      const typeMetrics = metrics.filter(m => m.type === type);
      
      if (typeMetrics.length > 0) {
        const values = typeMetrics.map(m => m.value);
        summary[type] = {
          count: values.length,
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          latest: typeMetrics[typeMetrics.length - 1].value
        };
      }
    });
    
    return summary;
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics.clear();
    if (this.storage) {
      this.storage.clear();
    }
    this.emit('metrics_cleared');
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy performance monitor
   */
  destroy() {
    // Stop all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // Clear timers
    this.timers.clear();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    // Clear metrics
    this.clearMetrics();
    
    // Remove all event listeners
    this.removeAllListeners();
    
    this.isInitialized = false;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create and initialize performance monitor
 */
export const createPerformanceMonitor = async (config = {}) => {
  const monitor = new PerformanceMonitor(config);
  await monitor.initialize();
  return monitor;
};

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let performanceMonitorInstance = null;

export const getPerformanceMonitor = async (config = {}) => {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = await createPerformanceMonitor(config);
  }
  return performanceMonitorInstance;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default PerformanceMonitor;
export { METRIC_TYPES, PERFORMANCE_THRESHOLDS, PERFORMANCE_BUDGETS };