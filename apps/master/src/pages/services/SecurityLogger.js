/**
 * EATECH Security Logger Service
 * Version: 1.0.0
 * 
 * Comprehensive security event logging for Master Control System
 * Features:
 * - Security event tracking
 * - Audit trail generation
 * - Real-time alerting
 * - Log aggregation
 * - Compliance reporting
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/services/SecurityLogger.js
 */

// Event severity levels
export const SecurityEventLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Event types
export const SecurityEventType = {
  LOGIN_ATTEMPT: 'login_attempt',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  SESSION_EXPIRED: 'session_expired',
  PERMISSION_DENIED: 'permission_denied',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  CONFIGURATION_CHANGE: 'configuration_change',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  BRUTE_FORCE_DETECTED: 'brute_force_detected',
  API_RATE_LIMIT: 'api_rate_limit',
  SYSTEM_ERROR: 'system_error'
};

class SecurityLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 10000;
    this.alertHandlers = new Map();
    this.batchSize = 50;
    this.batchTimeout = 5000; // 5 seconds
    this.pendingLogs = [];
    this.batchTimer = null;
  }

  /**
   * Log a security event
   */
  async logEvent({
    type,
    level = SecurityEventLevel.INFO,
    userId = null,
    message,
    details = {},
    ip = null,
    userAgent = null
  }) {
    const event = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type,
      level,
      userId,
      message,
      details,
      ip: ip || this.getClientIP(),
      userAgent: userAgent || navigator.userAgent,
      sessionId: this.getSessionId(),
      environment: this.getEnvironment()
    };

    // Add to local cache
    this.addToCache(event);

    // Add to pending batch
    this.pendingLogs.push(event);

    // Process batch if needed
    if (this.pendingLogs.length >= this.batchSize) {
      this.processBatch();
    } else {
      this.scheduleBatchProcess();
    }

    // Trigger alerts for critical events
    if (level === SecurityEventLevel.CRITICAL || level === SecurityEventLevel.ERROR) {
      this.triggerAlerts(event);
    }

    return event;
  }

  /**
   * Log login attempt
   */
  async logLoginAttempt(email, success, details = {}) {
    return this.logEvent({
      type: success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED,
      level: success ? SecurityEventLevel.INFO : SecurityEventLevel.WARNING,
      message: success ? `Successful login for ${email}` : `Failed login attempt for ${email}`,
      details: {
        email,
        success,
        ...details
      }
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(resource, action, userId, details = {}) {
    return this.logEvent({
      type: SecurityEventType.DATA_ACCESS,
      level: SecurityEventLevel.INFO,
      userId,
      message: `${action} on ${resource}`,
      details: {
        resource,
        action,
        ...details
      }
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(description, userId = null, details = {}) {
    return this.logEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      level: SecurityEventLevel.WARNING,
      userId,
      message: description,
      details
    });
  }

  /**
   * Log configuration change
   */
  async logConfigurationChange(setting, oldValue, newValue, userId, details = {}) {
    return this.logEvent({
      type: SecurityEventType.CONFIGURATION_CHANGE,
      level: SecurityEventLevel.WARNING,
      userId,
      message: `Configuration change: ${setting}`,
      details: {
        setting,
        oldValue,
        newValue,
        ...details
      }
    });
  }

  /**
   * Register alert handler
   */
  registerAlertHandler(name, handler) {
    this.alertHandlers.set(name, handler);
  }

  /**
   * Get security logs with filtering
   */
  getLogs({
    type = null,
    level = null,
    userId = null,
    startDate = null,
    endDate = null,
    limit = 100
  } = {}) {
    let filtered = [...this.logs];

    if (type) {
      filtered = filtered.filter(log => log.type === type);
    }

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (userId) {
      filtered = filtered.filter(log => log.userId === userId);
    }

    if (startDate) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter(log => new Date(log.timestamp) <= new Date(endDate));
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return filtered.slice(0, limit);
  }

  /**
   * Get security statistics
   */
  getStatistics(timeRange = '24h') {
    const now = new Date();
    const startTime = this.getStartTime(now, timeRange);
    
    const recentLogs = this.logs.filter(log => 
      new Date(log.timestamp) >= startTime
    );

    const stats = {
      total: recentLogs.length,
      byLevel: {},
      byType: {},
      topUsers: [],
      suspiciousIPs: []
    };

    // Count by level
    Object.values(SecurityEventLevel).forEach(level => {
      stats.byLevel[level] = recentLogs.filter(log => log.level === level).length;
    });

    // Count by type
    Object.values(SecurityEventType).forEach(type => {
      stats.byType[type] = recentLogs.filter(log => log.type === type).length;
    });

    // Top users by activity
    const userActivity = {};
    recentLogs.forEach(log => {
      if (log.userId) {
        userActivity[log.userId] = (userActivity[log.userId] || 0) + 1;
      }
    });
    
    stats.topUsers = Object.entries(userActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    // Suspicious IPs (multiple failed logins)
    const ipFailures = {};
    recentLogs
      .filter(log => log.type === SecurityEventType.LOGIN_FAILED)
      .forEach(log => {
        ipFailures[log.ip] = (ipFailures[log.ip] || 0) + 1;
      });
    
    stats.suspiciousIPs = Object.entries(ipFailures)
      .filter(([, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .map(([ip, count]) => ({ ip, count }));

    return stats;
  }

  /**
   * Export logs for compliance
   */
  exportLogs(format = 'json', filters = {}) {
    const logs = this.getLogs(filters);
    
    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        return this.convertToCSV(logs);
      
      case 'pdf':
        // Would integrate with PDF generation library
        console.log('PDF export not implemented');
        return null;
      
      default:
        return logs;
    }
  }

  /**
   * Clear old logs
   */
  clearOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoffDate
    );
    
    const removedCount = initialCount - this.logs.length;
    
    this.logEvent({
      type: SecurityEventType.SYSTEM_ERROR,
      level: SecurityEventLevel.INFO,
      message: `Cleared ${removedCount} old security logs`,
      details: { daysToKeep, removedCount }
    });
  }

  // Private methods
  generateEventId() {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getClientIP() {
    // In a real implementation, this would get the actual client IP
    return '127.0.0.1';
  }

  getSessionId() {
    return sessionStorage.getItem('sessionId') || 'no-session';
  }

  getEnvironment() {
    return process.env.NODE_ENV || 'development';
  }

  addToCache(event) {
    this.logs.push(event);
    
    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  scheduleBatchProcess() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.batchTimeout);
  }

  async processBatch() {
    if (this.pendingLogs.length === 0) return;
    
    const batch = [...this.pendingLogs];
    this.pendingLogs = [];
    
    try {
      // In production, this would send logs to a backend service
      await this.sendLogsToBackend(batch);
    } catch (error) {
      console.error('Failed to send security logs:', error);
      // Re-add failed logs to pending
      this.pendingLogs.unshift(...batch);
    }
  }

  async sendLogsToBackend(logs) {
    // Mock implementation
    console.log('Sending security logs to backend:', logs.length);
    return Promise.resolve();
  }

  triggerAlerts(event) {
    this.alertHandlers.forEach((handler, name) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Alert handler ${name} failed:`, error);
      }
    });
  }

  getStartTime(now, timeRange) {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const offset = ranges[timeRange] || ranges['24h'];
    return new Date(now.getTime() - offset);
  }

  convertToCSV(logs) {
    if (logs.length === 0) return '';
    
    const headers = Object.keys(logs[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = logs.map(log => 
      headers.map(header => {
        const value = log[header];
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
}

// Create singleton instance
const securityLogger = new SecurityLogger();

// Export instance and helper functions
export default securityLogger;

export const logSecurityEvent = (...args) => securityLogger.logEvent(...args);
export const logLoginAttempt = (...args) => securityLogger.logLoginAttempt(...args);
export const logDataAccess = (...args) => securityLogger.logDataAccess(...args);
export const logSuspiciousActivity = (...args) => securityLogger.logSuspiciousActivity(...args);
export const logConfigurationChange = (...args) => securityLogger.logConfigurationChange(...args);