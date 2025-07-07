/**
 * EATECH System Monitoring Service
 * Version: 1.0.0
 * 
 * Real-time system monitoring and alerting service
 * Features:
 * - Performance metrics collection
 * - Health checks
 * - Alert management
 * - Resource usage tracking
 * - Error tracking
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/services/monitoring.service.js
 */

import { logSecurityEvent, SecurityEventType, SecurityEventLevel } from './SecurityLogger';

class MonitoringService {
  constructor() {
    this.metrics = {
      cpu: [],
      memory: [],
      disk: [],
      network: [],
      responseTime: [],
      errorRate: [],
      activeUsers: [],
      requestsPerMinute: []
    };
    
    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      disk: { warning: 85, critical: 95 },
      responseTime: { warning: 1000, critical: 3000 }, // ms
      errorRate: { warning: 5, critical: 10 } // percentage
    };
    
    this.alerts = [];
    this.alertHandlers = new Map();
    this.healthChecks = new Map();
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.metricsRetentionHours = 24;
  }

  /**
   * Start monitoring
   */
  start(intervalSeconds = 60) {
    if (this.isMonitoring) {
      console.warn('Monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.collectMetrics(); // Initial collection
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.runHealthChecks();
      this.checkThresholds();
      this.cleanOldMetrics();
    }, intervalSeconds * 1000);

    console.log(`Monitoring started with ${intervalSeconds}s interval`);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('Monitoring stopped');
  }

  /**
   * Collect system metrics
   */
  async collectMetrics() {
    const timestamp = new Date();
    
    try {
      // Simulate metric collection (in production, these would come from real sources)
      const metrics = await this.fetchSystemMetrics();
      
      // Store metrics with timestamp
      Object.keys(metrics).forEach(key => {
        if (this.metrics[key]) {
          this.metrics[key].push({
            value: metrics[key],
            timestamp
          });
        }
      });

      // Trigger real-time updates
      this.notifyMetricUpdate(metrics);
    } catch (error) {
      console.error('Failed to collect metrics:', error);
      this.createAlert('metric_collection_failed', 'error', {
        error: error.message
      });
    }
  }

  /**
   * Fetch system metrics (mock implementation)
   */
  async fetchSystemMetrics() {
    // In production, this would fetch real metrics from monitoring agents
    return {
      cpu: Math.random() * 100,
      memory: 60 + Math.random() * 35,
      disk: 40 + Math.random() * 50,
      network: Math.random() * 1000, // Mbps
      responseTime: 100 + Math.random() * 500, // ms
      errorRate: Math.random() * 5, // percentage
      activeUsers: Math.floor(100 + Math.random() * 500),
      requestsPerMinute: Math.floor(1000 + Math.random() * 5000)
    };
  }

  /**
   * Register health check
   */
  registerHealthCheck(name, checkFunction, intervalSeconds = 30) {
    this.healthChecks.set(name, {
      check: checkFunction,
      interval: intervalSeconds,
      lastRun: null,
      lastResult: null,
      timer: null
    });

    // Start health check
    this.startHealthCheck(name);
  }

  /**
   * Start individual health check
   */
  startHealthCheck(name) {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) return;

    // Run immediately
    this.runSingleHealthCheck(name);

    // Schedule periodic runs
    healthCheck.timer = setInterval(() => {
      this.runSingleHealthCheck(name);
    }, healthCheck.interval * 1000);
  }

  /**
   * Run single health check
   */
  async runSingleHealthCheck(name) {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) return;

    try {
      const result = await healthCheck.check();
      healthCheck.lastRun = new Date();
      healthCheck.lastResult = result;

      if (!result.healthy) {
        this.createAlert(`health_check_${name}`, 'warning', {
          check: name,
          message: result.message,
          details: result.details
        });
      }
    } catch (error) {
      console.error(`Health check ${name} failed:`, error);
      healthCheck.lastResult = {
        healthy: false,
        message: error.message
      };
      
      this.createAlert(`health_check_${name}_error`, 'error', {
        check: name,
        error: error.message
      });
    }
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const promises = Array.from(this.healthChecks.keys()).map(name => 
      this.runSingleHealthCheck(name)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Check metric thresholds
   */
  checkThresholds() {
    Object.keys(this.thresholds).forEach(metric => {
      const latestValue = this.getLatestMetric(metric);
      if (latestValue === null) return;

      const threshold = this.thresholds[metric];
      
      if (latestValue >= threshold.critical) {
        this.createAlert(`${metric}_critical`, 'critical', {
          metric,
          value: latestValue,
          threshold: threshold.critical
        });
      } else if (latestValue >= threshold.warning) {
        this.createAlert(`${metric}_warning`, 'warning', {
          metric,
          value: latestValue,
          threshold: threshold.warning
        });
      }
    });
  }

  /**
   * Create alert
   */
  createAlert(type, severity, details = {}) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message: this.getAlertMessage(type, details),
      details,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
    
    // Log security event for critical alerts
    if (severity === 'critical' || severity === 'error') {
      logSecurityEvent({
        type: SecurityEventType.SYSTEM_ERROR,
        level: SecurityEventLevel.ERROR,
        message: alert.message,
        details: alert.details
      });
    }

    // Trigger alert handlers
    this.notifyAlert(alert);
    
    // Keep only recent alerts (last 1000)
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    return alert;
  }

  /**
   * Get alert message
   */
  getAlertMessage(type, details) {
    const messages = {
      cpu_critical: `CPU usage critical: ${details.value?.toFixed(1)}%`,
      cpu_warning: `CPU usage high: ${details.value?.toFixed(1)}%`,
      memory_critical: `Memory usage critical: ${details.value?.toFixed(1)}%`,
      memory_warning: `Memory usage high: ${details.value?.toFixed(1)}%`,
      disk_critical: `Disk space critical: ${details.value?.toFixed(1)}% used`,
      disk_warning: `Disk space low: ${details.value?.toFixed(1)}% used`,
      responseTime_critical: `Response time critical: ${details.value?.toFixed(0)}ms`,
      responseTime_warning: `Response time high: ${details.value?.toFixed(0)}ms`,
      errorRate_critical: `Error rate critical: ${details.value?.toFixed(1)}%`,
      errorRate_warning: `Error rate high: ${details.value?.toFixed(1)}%`,
      health_check_database: `Database health check failed: ${details.message}`,
      health_check_api: `API health check failed: ${details.message}`,
      metric_collection_failed: `Failed to collect system metrics: ${details.error}`
    };

    return messages[type] || `System alert: ${type}`;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
    }
  }

  /**
   * Get latest metric value
   */
  getLatestMetric(metricName) {
    const metricData = this.metrics[metricName];
    if (!metricData || metricData.length === 0) return null;
    
    return metricData[metricData.length - 1].value;
  }

  /**
   * Get metric history
   */
  getMetricHistory(metricName, duration = '1h') {
    const metricData = this.metrics[metricName];
    if (!metricData) return [];

    const now = new Date();
    const durationMs = this.parseDuration(duration);
    const startTime = new Date(now.getTime() - durationMs);

    return metricData.filter(point => 
      point.timestamp >= startTime
    );
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    const status = {
      healthy: true,
      metrics: {},
      healthChecks: {},
      activeAlerts: [],
      summary: ''
    };

    // Check metrics
    Object.keys(this.thresholds).forEach(metric => {
      const value = this.getLatestMetric(metric);
      const threshold = this.thresholds[metric];
      
      status.metrics[metric] = {
        value,
        status: value === null ? 'unknown' :
                value >= threshold.critical ? 'critical' :
                value >= threshold.warning ? 'warning' : 'healthy'
      };

      if (status.metrics[metric].status === 'critical') {
        status.healthy = false;
      }
    });

    // Check health checks
    this.healthChecks.forEach((check, name) => {
      status.healthChecks[name] = {
        lastRun: check.lastRun,
        healthy: check.lastResult?.healthy ?? null,
        message: check.lastResult?.message
      };

      if (check.lastResult && !check.lastResult.healthy) {
        status.healthy = false;
      }
    });

    // Get active alerts
    status.activeAlerts = this.alerts.filter(alert => 
      !alert.acknowledged && 
      (alert.severity === 'critical' || alert.severity === 'error')
    );

    // Generate summary
    if (status.healthy) {
      status.summary = 'All systems operational';
    } else {
      const issues = [];
      if (status.activeAlerts.length > 0) {
        issues.push(`${status.activeAlerts.length} active alerts`);
      }
      
      const unhealthyChecks = Object.values(status.healthChecks)
        .filter(check => check.healthy === false).length;
      if (unhealthyChecks > 0) {
        issues.push(`${unhealthyChecks} failed health checks`);
      }
      
      status.summary = `System issues detected: ${issues.join(', ')}`;
    }

    return status;
  }

  /**
   * Register alert handler
   */
  registerAlertHandler(name, handler) {
    this.alertHandlers.set(name, handler);
  }

  /**
   * Notify alert handlers
   */
  notifyAlert(alert) {
    this.alertHandlers.forEach((handler, name) => {
      try {
        handler(alert);
      } catch (error) {
        console.error(`Alert handler ${name} failed:`, error);
      }
    });
  }

  /**
   * Notify metric update handlers
   */
  notifyMetricUpdate(metrics) {
    // This would trigger real-time updates to connected clients
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('metricsUpdate', { 
        detail: metrics 
      }));
    }
  }

  /**
   * Clean old metrics
   */
  cleanOldMetrics() {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - this.metricsRetentionHours);

    Object.keys(this.metrics).forEach(metric => {
      this.metrics[metric] = this.metrics[metric].filter(point =>
        point.timestamp > cutoffTime
      );
    });
  }

  /**
   * Parse duration string
   */
  parseDuration(duration) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  /**
   * Export metrics
   */
  exportMetrics(format = 'json') {
    const data = {
      timestamp: new Date(),
      metrics: this.metrics,
      alerts: this.alerts,
      status: this.getSystemStatus()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        // Simplified CSV export
        const csv = ['Timestamp,Metric,Value'];
        Object.entries(this.metrics).forEach(([metric, values]) => {
          values.forEach(point => {
            csv.push(`${point.timestamp.toISOString()},${metric},${point.value}`);
          });
        });
        return csv.join('\n');
      
      default:
        return data;
    }
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

// Register default health checks
monitoringService.registerHealthCheck('database', async () => {
  // Mock database health check
  const isHealthy = Math.random() > 0.1; // 90% healthy
  return {
    healthy: isHealthy,
    message: isHealthy ? 'Database connection OK' : 'Database connection failed',
    details: {
      responseTime: Math.random() * 100,
      connections: Math.floor(Math.random() * 50)
    }
  };
});

monitoringService.registerHealthCheck('api', async () => {
  // Mock API health check
  const isHealthy = Math.random() > 0.05; // 95% healthy
  return {
    healthy: isHealthy,
    message: isHealthy ? 'API responding normally' : 'API response timeout',
    details: {
      endpoint: '/health',
      statusCode: isHealthy ? 200 : 503
    }
  };
});

export default monitoringService;