/**
 * EATECH - Monitoring Utilities
 * Version: 5.0.0
 * Description: Monitoring, Logging und Performance-Tracking Utilities
 *              mit Firebase Integration und Error Reporting
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/utils/monitoring.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import { analytics, performance as fbPerformance, database, logEvent } from '../config/firebase';

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    enableConsoleInProduction: false,
    logToFirebase: true,
    performanceThresholds: {
        pageLoad: 3000, // ms
        apiCall: 1000, // ms
        rendering: 100, // ms
        interaction: 100 // ms
    },
    errorSampling: {
        development: 1.0, // 100%
        production: 0.1 // 10%
    }
};

// Environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// ============================================================================
// LOGGING SYSTEM
// ============================================================================

/**
 * Log Levels
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
};

/**
 * Main Logger Class
 */
class Logger {
    constructor() {
        this.queue = [];
        this.batchTimeout = null;
        this.batchSize = 50;
        this.batchDelay = 5000; // 5 seconds
    }
    
    /**
     * Logs a message with specified level
     * @param {number} level - Log level
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    log(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            url: window.location.href,
            userAgent: navigator.userAgent,
            sessionId: this.getSessionId()
        };
        
        // Console output
        if (isDevelopment || CONFIG.enableConsoleInProduction) {
            this.consoleLog(level, message, data);
        }
        
        // Firebase logging
        if (CONFIG.logToFirebase && shouldSample()) {
            this.queueLog(logEntry);
        }
        
        // Analytics event for errors
        if (level >= LogLevel.ERROR && analytics) {
            logEvent(analytics, 'app_error', {
                error_message: message,
                error_level: this.getLevelName(level)
            });
        }
    }
    
    /**
     * Console log with styling
     */
    consoleLog(level, message, data) {
        const styles = {
            [LogLevel.DEBUG]: 'color: #888',
            [LogLevel.INFO]: 'color: #2196F3',
            [LogLevel.WARN]: 'color: #FF9800',
            [LogLevel.ERROR]: 'color: #F44336',
            [LogLevel.FATAL]: 'color: #F44336; font-weight: bold'
        };
        
        const prefix = `[${this.getLevelName(level)}] ${new Date().toLocaleTimeString()}`;
        
        switch (level) {
            case LogLevel.DEBUG:
                console.log(`%c${prefix}`, styles[level], message, data);
                break;
            case LogLevel.INFO:
                console.info(`%c${prefix}`, styles[level], message, data);
                break;
            case LogLevel.WARN:
                console.warn(`%c${prefix}`, styles[level], message, data);
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(`%c${prefix}`, styles[level], message, data);
                break;
        }
    }
    
    /**
     * Queue log for batch upload
     */
    queueLog(logEntry) {
        this.queue.push(logEntry);
        
        if (this.queue.length >= this.batchSize) {
            this.flushLogs();
        } else {
            this.scheduleBatch();
        }
    }
    
    /**
     * Schedule batch upload
     */
    scheduleBatch() {
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        this.batchTimeout = setTimeout(() => {
            this.flushLogs();
        }, this.batchDelay);
    }
    
    /**
     * Flush logs to Firebase
     */
    async flushLogs() {
        if (this.queue.length === 0) return;
        
        const logs = [...this.queue];
        this.queue = [];
        
        try {
            const batch = {};
            logs.forEach(log => {
                const key = database.ref('logs').push().key;
                batch[`logs/${key}`] = log;
            });
            
            await database.ref().update(batch);
        } catch (error) {
            console.error('Failed to upload logs:', error);
            // Re-queue failed logs
            this.queue.unshift(...logs);
        }
    }
    
    /**
     * Get level name
     */
    getLevelName(level) {
        const names = {
            [LogLevel.DEBUG]: 'DEBUG',
            [LogLevel.INFO]: 'INFO',
            [LogLevel.WARN]: 'WARN',
            [LogLevel.ERROR]: 'ERROR',
            [LogLevel.FATAL]: 'FATAL'
        };
        return names[level] || 'UNKNOWN';
    }
    
    /**
     * Get or create session ID
     */
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = sessionStorage.getItem('eatech_session_id') || 
                            `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('eatech_session_id', this.sessionId);
        }
        return this.sessionId;
    }
}

// Create logger instance
const logger = new Logger();

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

export const logDebug = (message, data) => logger.log(LogLevel.DEBUG, message, data);
export const logInfo = (message, data) => logger.log(LogLevel.INFO, message, data);
export const logWarn = (message, data) => logger.log(LogLevel.WARN, message, data);
export const logError = (message, data) => logger.log(LogLevel.ERROR, message, data);
export const logFatal = (message, data) => logger.log(LogLevel.FATAL, message, data);

/**
 * Enhanced error logging with stack trace
 * @param {string} context - Error context
 * @param {Error} error - Error object
 * @param {Object} additionalData - Additional data
 */
export const logException = (context, error, additionalData = {}) => {
    const errorData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        context,
        ...additionalData
    };
    
    logger.log(LogLevel.ERROR, `Exception in ${context}`, errorData);
    
    // Report to error tracking service in production
    if (isProduction && window.Sentry) {
        window.Sentry.captureException(error, {
            contexts: { custom: additionalData },
            tags: { context }
        });
    }
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Performance Monitor Class
 */
class PerformanceMonitor {
    constructor() {
        this.traces = new Map();
        this.metrics = new Map();
    }
    
    /**
     * Start a performance trace
     * @param {string} name - Trace name
     * @param {Object} attributes - Custom attributes
     * @returns {Object} Trace handle
     */
    startTrace(name, attributes = {}) {
        const trace = {
            name,
            startTime: performance.now(),
            attributes,
            metrics: {},
            id: `${name}_${Date.now()}`
        };
        
        this.traces.set(trace.id, trace);
        
        // Firebase Performance trace
        if (fbPerformance) {
            try {
                const fbTrace = fbPerformance.trace(name);
                fbTrace.start();
                
                // Add attributes
                Object.entries(attributes).forEach(([key, value]) => {
                    fbTrace.putAttribute(key, String(value));
                });
                
                trace.fbTrace = fbTrace;
            } catch (error) {
                logError('Failed to start Firebase trace', { name, error });
            }
        }
        
        return {
            id: trace.id,
            stop: () => this.stopTrace(trace.id),
            putMetric: (metric, value) => this.putMetric(trace.id, metric, value),
            putAttribute: (attr, value) => this.putAttribute(trace.id, attr, value)
        };
    }
    
    /**
     * Stop a performance trace
     * @param {string} traceId - Trace ID
     */
    stopTrace(traceId) {
        const trace = this.traces.get(traceId);
        if (!trace) return;
        
        const duration = performance.now() - trace.startTime;
        trace.duration = duration;
        
        // Stop Firebase trace
        if (trace.fbTrace) {
            try {
                trace.fbTrace.putMetric('duration', Math.round(duration));
                trace.fbTrace.stop();
            } catch (error) {
                logError('Failed to stop Firebase trace', { traceId, error });
            }
        }
        
        // Check thresholds
        this.checkPerformanceThresholds(trace);
        
        // Log to analytics
        if (analytics) {
            logEvent(analytics, 'performance_trace', {
                trace_name: trace.name,
                duration: Math.round(duration),
                ...trace.attributes
            });
        }
        
        // Clean up
        this.traces.delete(traceId);
        
        return duration;
    }
    
    /**
     * Add metric to trace
     */
    putMetric(traceId, metric, value) {
        const trace = this.traces.get(traceId);
        if (!trace) return;
        
        trace.metrics[metric] = value;
        
        if (trace.fbTrace) {
            try {
                trace.fbTrace.putMetric(metric, value);
            } catch (error) {
                logError('Failed to put metric', { traceId, metric, error });
            }
        }
    }
    
    /**
     * Add attribute to trace
     */
    putAttribute(traceId, attr, value) {
        const trace = this.traces.get(traceId);
        if (!trace) return;
        
        trace.attributes[attr] = value;
        
        if (trace.fbTrace) {
            try {
                trace.fbTrace.putAttribute(attr, String(value));
            } catch (error) {
                logError('Failed to put attribute', { traceId, attr, error });
            }
        }
    }
    
    /**
     * Check performance thresholds
     */
    checkPerformanceThresholds(trace) {
        const thresholds = CONFIG.performanceThresholds;
        let threshold = thresholds.apiCall;
        
        if (trace.name.includes('page')) {
            threshold = thresholds.pageLoad;
        } else if (trace.name.includes('render')) {
            threshold = thresholds.rendering;
        } else if (trace.name.includes('interaction')) {
            threshold = thresholds.interaction;
        }
        
        if (trace.duration > threshold) {
            logWarn(`Performance threshold exceeded for ${trace.name}`, {
                duration: trace.duration,
                threshold,
                attributes: trace.attributes
            });
        }
    }
    
    /**
     * Measure component render time
     */
    measureRender(componentName, callback) {
        const trace = this.startTrace(`render_${componentName}`);
        
        try {
            const result = callback();
            trace.stop();
            return result;
        } catch (error) {
            trace.stop();
            throw error;
        }
    }
    
    /**
     * Measure async operation
     */
    async measureAsync(operationName, asyncCallback) {
        const trace = this.startTrace(operationName);
        
        try {
            const result = await asyncCallback();
            trace.stop();
            return result;
        } catch (error) {
            trace.putAttribute('error', 'true');
            trace.stop();
            throw error;
        }
    }
}

// Create performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// PERFORMANCE FUNCTIONS
// ============================================================================

export const startTrace = (name, attributes) => performanceMonitor.startTrace(name, attributes);
export const measureRender = (componentName, callback) => performanceMonitor.measureRender(componentName, callback);
export const measureAsync = (operationName, asyncCallback) => performanceMonitor.measureAsync(operationName, asyncCallback);

/**
 * Log performance metrics
 * @param {string} metric - Metric name
 * @param {number} value - Metric value
 * @param {Object} metadata - Additional metadata
 */
export const logPerformance = (metric, value, metadata = {}) => {
    logInfo(`Performance: ${metric}`, {
        value,
        unit: 'ms',
        ...metadata
    });
    
    if (analytics) {
        logEvent(analytics, 'performance_metric', {
            metric_name: metric,
            value: Math.round(value),
            ...metadata
        });
    }
};

// ============================================================================
// WEB VITALS MONITORING
// ============================================================================

/**
 * Report Web Vitals
 * @param {Object} metric - Web Vital metric
 */
export const reportWebVital = (metric) => {
    const { name, value, rating } = metric;
    
    logInfo(`Web Vital: ${name}`, {
        value,
        rating,
        id: metric.id
    });
    
    if (analytics) {
        logEvent(analytics, 'web_vitals', {
            metric_name: name,
            metric_value: Math.round(value),
            metric_rating: rating
        });
    }
    
    // Alert on poor metrics
    if (rating === 'poor') {
        logWarn(`Poor Web Vital: ${name}`, { value, rating });
    }
};

// ============================================================================
// USER INTERACTION TRACKING
// ============================================================================

/**
 * Track user interaction
 * @param {string} action - Action name
 * @param {string} category - Action category
 * @param {Object} data - Additional data
 */
export const trackInteraction = (action, category, data = {}) => {
    logDebug(`User Interaction: ${category}/${action}`, data);
    
    if (analytics) {
        logEvent(analytics, 'user_interaction', {
            action,
            category,
            ...data
        });
    }
};

/**
 * Track page view
 * @param {string} pageName - Page name
 * @param {Object} properties - Page properties
 */
export const trackPageView = (pageName, properties = {}) => {
    logInfo(`Page View: ${pageName}`, properties);
    
    if (analytics) {
        logEvent(analytics, 'page_view', {
            page_title: pageName,
            page_path: window.location.pathname,
            ...properties
        });
    }
};

// ============================================================================
// ERROR BOUNDARY REPORTING
// ============================================================================

/**
 * Report React Error Boundary catch
 * @param {Error} error - Caught error
 * @param {Object} errorInfo - React error info
 */
export const reportErrorBoundary = (error, errorInfo) => {
    logFatal('React Error Boundary triggered', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        stack: error.stack
    });
    
    if (isProduction && window.Sentry) {
        window.Sentry.withScope(scope => {
            scope.setContext('errorBoundary', errorInfo);
            window.Sentry.captureException(error);
        });
    }
};

// ============================================================================
// NETWORK MONITORING
// ============================================================================

/**
 * Monitor API calls
 * @param {string} endpoint - API endpoint
 * @param {Function} apiCall - API call function
 * @returns {Promise} API response
 */
export const monitorApiCall = async (endpoint, apiCall) => {
    const trace = startTrace('api_call', { endpoint });
    
    try {
        const response = await apiCall();
        
        trace.putMetric('status', response.status || 200);
        trace.putMetric('size', JSON.stringify(response).length);
        trace.stop();
        
        return response;
    } catch (error) {
        trace.putAttribute('error', 'true');
        trace.putMetric('status', error.response?.status || 0);
        trace.stop();
        
        logError(`API call failed: ${endpoint}`, {
            error: error.message,
            status: error.response?.status
        });
        
        throw error;
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if should sample for logging
 */
function shouldSample() {
    const rate = isDevelopment 
        ? CONFIG.errorSampling.development 
        : CONFIG.errorSampling.production;
    
    return Math.random() < rate;
}

/**
 * Flush all pending logs
 */
export const flushLogs = () => {
    logger.flushLogs();
};

// Auto-flush on page unload
window.addEventListener('beforeunload', () => {
    flushLogs();
});

// ============================================================================
// EXPORT
// ============================================================================
export default {
    // Log levels
    LogLevel,
    
    // Logging
    logDebug,
    logInfo,
    logWarn,
    logError,
    logFatal,
    logException,
    
    // Performance
    startTrace,
    measureRender,
    measureAsync,
    logPerformance,
    reportWebVital,
    
    // Tracking
    trackInteraction,
    trackPageView,
    
    // Error reporting
    reportErrorBoundary,
    
    // Network
    monitorApiCall,
    
    // Utilities
    flushLogs
};