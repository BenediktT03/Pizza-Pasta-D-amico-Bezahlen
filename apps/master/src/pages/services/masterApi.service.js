/**
 * EATECH Master API Service
 * Version: 1.0.0
 * 
 * Centralized API service for Master Control System
 * Features:
 * - RESTful API communication
 * - Request/Response interceptors
 * - Error handling
 * - Request caching
 * - Retry logic
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/services/masterApi.service.js
 */

import { logSecurityEvent, SecurityEventType, SecurityEventLevel } from './SecurityLogger';

class MasterApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'https://api.eatech.ch/master/v1';
    this.timeout = 30000; // 30 seconds
    this.retryCount = 3;
    this.retryDelay = 1000; // 1 second
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  /**
   * Configure API service
   */
  configure(options = {}) {
    if (options.baseURL) this.baseURL = options.baseURL;
    if (options.timeout) this.timeout = options.timeout;
    if (options.retryCount) this.retryCount = options.retryCount;
    if (options.retryDelay) this.retryDelay = options.retryDelay;
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      headers = {},
      params = {},
      cache = false,
      retry = true,
      timeout = this.timeout
    } = options;

    // Build URL
    const url = this.buildURL(endpoint, params);
    
    // Check cache for GET requests
    if (method === 'GET' && cache) {
      const cachedResponse = this.getFromCache(url);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Build request configuration
    let config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Token': this.getAuthToken(),
        ...headers
      },
      signal: AbortSignal.timeout(timeout)
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.body = JSON.stringify(data);
    }

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    // Make request with retry logic
    let lastError;
    const maxRetries = retry ? this.retryCount : 1;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, config);
        
        // Apply response interceptors
        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          processedResponse = await interceptor(processedResponse);
        }

        // Handle response
        if (!processedResponse.ok) {
          throw new APIError(
            processedResponse.statusText,
            processedResponse.status,
            await processedResponse.text()
          );
        }

        const responseData = await processedResponse.json();

        // Cache successful GET responses
        if (method === 'GET' && cache) {
          this.addToCache(url, responseData);
        }

        // Log data access
        await logSecurityEvent({
          type: SecurityEventType.DATA_ACCESS,
          level: SecurityEventLevel.INFO,
          message: `API request: ${method} ${endpoint}`,
          details: { method, endpoint, status: processedResponse.status }
        });

        return responseData;
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          break;
        }

        // Wait before retry
        if (attempt < maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    // Log failed request
    await logSecurityEvent({
      type: SecurityEventType.SYSTEM_ERROR,
      level: SecurityEventLevel.ERROR,
      message: `API request failed: ${method} ${endpoint}`,
      details: { 
        method, 
        endpoint, 
        error: lastError.message,
        attempts: maxRetries
      }
    });

    throw lastError;
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', data });
  }

  /**
   * PUT request
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', data });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', data });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Tenant Management APIs
   */
  async getTenants(params = {}) {
    return this.get('/tenants', { params, cache: true });
  }

  async getTenant(tenantId) {
    return this.get(`/tenants/${tenantId}`, { cache: true });
  }

  async createTenant(data) {
    return this.post('/tenants', data);
  }

  async updateTenant(tenantId, data) {
    return this.put(`/tenants/${tenantId}`, data);
  }

  async deleteTenant(tenantId) {
    return this.delete(`/tenants/${tenantId}`);
  }

  async suspendTenant(tenantId, reason) {
    return this.post(`/tenants/${tenantId}/suspend`, { reason });
  }

  async activateTenant(tenantId) {
    return this.post(`/tenants/${tenantId}/activate`);
  }

  /**
   * Analytics APIs
   */
  async getSystemMetrics(timeRange = '24h') {
    return this.get('/analytics/system', { 
      params: { timeRange },
      cache: true 
    });
  }

  async getRevenueAnalytics(params = {}) {
    return this.get('/analytics/revenue', { params, cache: true });
  }

  async getUserAnalytics(params = {}) {
    return this.get('/analytics/users', { params, cache: true });
  }

  async getPerformanceMetrics() {
    return this.get('/analytics/performance', { cache: true });
  }

  /**
   * Billing APIs
   */
  async getBillingOverview(params = {}) {
    return this.get('/billing/overview', { params });
  }

  async getInvoices(params = {}) {
    return this.get('/billing/invoices', { params });
  }

  async createInvoice(data) {
    return this.post('/billing/invoices', data);
  }

  async sendInvoiceReminder(invoiceId) {
    return this.post(`/billing/invoices/${invoiceId}/remind`);
  }

  /**
   * Feature Control APIs
   */
  async getFeatures() {
    return this.get('/features', { cache: true });
  }

  async updateFeature(featureId, enabled) {
    return this.patch(`/features/${featureId}`, { enabled });
  }

  async getFeatureUsage(featureId) {
    return this.get(`/features/${featureId}/usage`);
  }

  /**
   * Security APIs
   */
  async getSecurityEvents(params = {}) {
    return this.get('/security/events', { params });
  }

  async getSecurityAlerts() {
    return this.get('/security/alerts');
  }

  async acknowledgeAlert(alertId) {
    return this.post(`/security/alerts/${alertId}/acknowledge`);
  }

  async blockIP(ip, reason) {
    return this.post('/security/block-ip', { ip, reason });
  }

  async unblockIP(ip) {
    return this.delete(`/security/block-ip/${ip}`);
  }

  /**
   * System APIs
   */
  async getSystemStatus() {
    return this.get('/system/status', { cache: true });
  }

  async getSystemSettings() {
    return this.get('/system/settings');
  }

  async updateSystemSettings(settings) {
    return this.put('/system/settings', settings);
  }

  async createBackup() {
    return this.post('/system/backup');
  }

  async restoreBackup(backupId) {
    return this.post(`/system/restore/${backupId}`);
  }

  /**
   * User Management APIs
   */
  async getMasterUsers() {
    return this.get('/users', { cache: true });
  }

  async createMasterUser(data) {
    return this.post('/users', data);
  }

  async updateMasterUser(userId, data) {
    return this.put(`/users/${userId}`, data);
  }

  async deleteMasterUser(userId) {
    return this.delete(`/users/${userId}`);
  }

  async resetUserPassword(userId) {
    return this.post(`/users/${userId}/reset-password`);
  }

  /**
   * Notification APIs
   */
  async getNotifications() {
    return this.get('/notifications');
  }

  async markNotificationRead(notificationId) {
    return this.put(`/notifications/${notificationId}/read`);
  }

  async sendNotification(data) {
    return this.post('/notifications/send', data);
  }

  // Helper methods
  buildURL(endpoint, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    
    return url.toString();
  }

  getAuthToken() {
    return sessionStorage.getItem('masterToken') || '';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  addToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

// Custom API Error class
class APIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}

// Create singleton instance
const masterApiService = new MasterApiService();

// Add default interceptors
masterApiService.addRequestInterceptor(async (config) => {
  // Add timestamp to headers
  config.headers['X-Request-Time'] = new Date().toISOString();
  return config;
});

masterApiService.addResponseInterceptor(async (response) => {
  // Log slow requests
  const requestTime = response.headers.get('X-Request-Time');
  if (requestTime) {
    const duration = Date.now() - new Date(requestTime).getTime();
    if (duration > 5000) {
      console.warn(`Slow API request: ${response.url} took ${duration}ms`);
    }
  }
  return response;
});

export default masterApiService;