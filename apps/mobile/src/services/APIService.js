/**
 * EATECH - Mobile API Service
 * Version: 5.3.0
 * Description: Comprehensive Mobile API Service mit Lazy Loading & Smart Caching
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/mobile/src/services/APIService.js
 * 
 * Features: REST/GraphQL support, offline queueing, request caching, retry logic
 */

import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';

// Lazy loaded utilities
const httpUtils = () => import('../utils/httpUtils');
const cacheUtils = () => import('../utils/cacheUtils');
const validationUtils = () => import('../utils/validationUtils');
const encryptionUtils = () => import('../utils/encryptionUtils');
const compressionUtils = () => import('../utils/compressionUtils');

// Lazy loaded services
const authService = () => import('./AuthService');
const offlineService = () => import('./OfflineService');
const analyticsService = () => import('./AnalyticsService');
const errorHandlingService = () => import('./ErrorHandlingService');
const retryService = () => import('./RetryService');

// API Configuration
const API_CONFIG = {
  baseURL: __DEV__ 
    ? 'http://localhost:3000/api' 
    : 'https://api.eatech.ch',
  graphqlURL: __DEV__ 
    ? 'http://localhost:3000/graphql' 
    : 'https://api.eatech.ch/graphql',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheTimeout: 300000, // 5 minutes
  batchTimeout: 100, // 100ms for request batching
};

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
};

// Request Types
export const REQUEST_TYPES = {
  REST: 'rest',
  GRAPHQL: 'graphql',
  UPLOAD: 'upload',
  DOWNLOAD: 'download'
};

// Cache Strategies
export const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache_first',
  NETWORK_FIRST: 'network_first',
  CACHE_ONLY: 'cache_only',
  NETWORK_ONLY: 'network_only',
  STALE_WHILE_REVALIDATE: 'stale_while_revalidate'
};

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3
};

class APIService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      ...API_CONFIG,
      enableCaching: true,
      enableOfflineQueue: true,
      enableBatching: true,
      enableCompression: true,
      enableEncryption: true,
      enableAnalytics: true,
      defaultCacheStrategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      maxQueueSize: 1000,
      ...options
    };
    
    // State
    this.isOnline = true;
    this.requestQueue = [];
    this.pendingRequests = new Map();
    this.requestBatches = new Map();
    this.cache = new Map();
    this.interceptors = {
      request: [],
      response: []
    };
    this.isInitialized = false;
    
    // Lazy loaded services
    this.httpUtils = null;
    this.cacheUtils = null;
    this.validationUtils = null;
    this.encryptionUtils = null;
    this.compressionUtils = null;
    this.authService = null;
    this.offlineService = null;
    this.analyticsService = null;
    this.errorHandlingService = null;
    this.retryService = null;
    
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  async initialize() {
    try {
      await this.initializeLazyServices();
      await this.setupNetworkMonitoring();
      await this.loadPersistedCache();
      await this.setupInterceptors();
      
      this.isInitialized = true;
      this.emit('initialized');
      
    } catch (error) {
      console.error('Failed to initialize API service:', error);
      this.emit('error', error);
    }
  }

  async initializeLazyServices() {
    try {
      // Initialize utilities
      this.httpUtils = await httpUtils();
      this.cacheUtils = await cacheUtils();
      this.validationUtils = await validationUtils();
      this.encryptionUtils = await encryptionUtils();
      this.compressionUtils = await compressionUtils();
      
      // Initialize services
      const AuthService = await authService();
      this.authService = new AuthService.default();
      
      if (this.options.enableOfflineQueue) {
        const OfflineService = await offlineService();
        this.offlineService = new OfflineService.default();
      }
      
      if (this.options.enableAnalytics) {
        const AnalyticsService = await analyticsService();
        this.analyticsService = new AnalyticsService.default();
      }
      
      const ErrorHandlingService = await errorHandlingService();
      this.errorHandlingService = new ErrorHandlingService.default();
      
      const RetryService = await retryService();
      this.retryService = new RetryService.default({
        maxAttempts: this.options.retryAttempts,
        baseDelay: this.options.retryDelay
      });
      
    } catch (error) {
      console.error('Failed to initialize lazy services:', error);
      throw error;
    }
  }

  async setupNetworkMonitoring() {
    const networkState = await NetInfo.fetch();
    this.isOnline = networkState.isConnected && networkState.isInternetReachable;
    
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      if (!wasOnline && this.isOnline) {
        this.handleNetworkReconnect();
      } else if (wasOnline && !this.isOnline) {
        this.handleNetworkDisconnect();
      }
      
      this.emit('network_status_changed', {
        isOnline: this.isOnline,
        networkType: state.type,
        isInternetReachable: state.isInternetReachable
      });
    });
  }

  async loadPersistedCache() {
    if (!this.options.enableCaching) return;
    
    try {
      const cachedData = await AsyncStorage.getItem('@eatech:api_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.cache = new Map(parsed);
        
        // Clean expired entries
        this.cleanExpiredCache();
      }
    } catch (error) {
      console.error('Failed to load persisted cache:', error);
    }
  }

  async setupInterceptors() {
    // Request interceptors
    this.addRequestInterceptor(async (config) => {
      // Add authentication headers
      if (this.authService) {
        const authHeaders = await this.authService.getAuthHeaders();
        config.headers = { ...config.headers, ...authHeaders };
      }
      
      // Add device info
      config.headers['X-Device-Type'] = 'mobile';
      config.headers['X-App-Version'] = '3.0.0';
      config.headers['X-Platform'] = Platform.OS;
      
      return config;
    });
    
    // Response interceptors
    this.addResponseInterceptor(
      (response) => {
        // Track successful requests
        if (this.analyticsService) {
          this.analyticsService.trackAPISuccess(response.config);
        }
        return response;
      },
      (error) => {
        // Handle authentication errors
        if (error.response?.status === 401) {
          this.authService?.handleAuthError();
        }
        
        // Track failed requests
        if (this.analyticsService) {
          this.analyticsService.trackAPIError(error);
        }
        
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // CORE REQUEST METHODS
  // ============================================================================
  async request(config) {
    try {
      // Validate config
      if (this.validationUtils) {
        await this.validationUtils.validateRequestConfig(config);
      }
      
      // Normalize config
      const normalizedConfig = await this.normalizeConfig(config);
      
      // Apply request interceptors
      const interceptedConfig = await this.applyRequestInterceptors(normalizedConfig);
      
      // Check cache first if appropriate
      if (this.shouldCheckCache(interceptedConfig)) {
        const cachedResponse = await this.getCachedResponse(interceptedConfig);
        if (cachedResponse) {
          this.emit('cache_hit', interceptedConfig);
          return cachedResponse;
        }
      }
      
      // Queue request if offline
      if (!this.isOnline && this.options.enableOfflineQueue) {
        return await this.queueOfflineRequest(interceptedConfig);
      }
      
      // Batch request if appropriate
      if (this.shouldBatchRequest(interceptedConfig)) {
        return await this.batchRequest(interceptedConfig);
      }
      
      // Execute request
      const response = await this.executeRequest(interceptedConfig);
      
      // Cache response if appropriate
      if (this.shouldCacheResponse(interceptedConfig, response)) {
        await this.cacheResponse(interceptedConfig, response);
      }
      
      return response;
      
    } catch (error) {
      return await this.handleRequestError(config, error);
    }
  }

  async executeRequest(config) {
    const startTime = Date.now();
    
    try {
      // Create request ID for tracking
      const requestId = this.generateRequestId();
      config.requestId = requestId;
      
      // Add to pending requests
      this.pendingRequests.set(requestId, config);
      
      let response;
      
      switch (config.type) {
        case REQUEST_TYPES.GRAPHQL:
          response = await this.executeGraphQLRequest(config);
          break;
        case REQUEST_TYPES.UPLOAD:
          response = await this.executeUploadRequest(config);
          break;
        case REQUEST_TYPES.DOWNLOAD:
          response = await this.executeDownloadRequest(config);
          break;
        default:
          response = await this.executeRESTRequest(config);
      }
      
      // Apply response interceptors
      response = await this.applyResponseInterceptors(response);
      
      // Track timing
      const duration = Date.now() - startTime;
      this.emit('request_completed', {
        config,
        duration,
        success: true
      });
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.emit('request_failed', {
        config,
        duration,
        error
      });
      throw error;
    } finally {
      // Remove from pending requests
      if (config.requestId) {
        this.pendingRequests.delete(config.requestId);
      }
    }
  }

  async executeRESTRequest(config) {
    if (!this.httpUtils) {
      throw new Error('HTTP utilities not initialized');
    }
    
    const requestOptions = {
      method: config.method,
      url: this.buildURL(config.url),
      headers: config.headers,
      timeout: config.timeout || this.options.timeout,
      ...config.options
    };
    
    // Handle request body
    if (config.data) {
      if (this.options.enableCompression && this.compressionUtils) {
        requestOptions.data = await this.compressionUtils.compress(config.data);
        requestOptions.headers['Content-Encoding'] = 'gzip';
      } else {
        requestOptions.data = config.data;
      }
      
      if (this.options.enableEncryption && this.encryptionUtils && config.encrypt) {
        requestOptions.data = await this.encryptionUtils.encrypt(requestOptions.data);
        requestOptions.headers['X-Encrypted'] = 'true';
      }
    }
    
    return await this.httpUtils.request(requestOptions);
  }

  async executeGraphQLRequest(config) {
    const query = config.query;
    const variables = config.variables || {};
    
    const requestBody = {
      query,
      variables,
      operationName: config.operationName
    };
    
    const response = await this.executeRESTRequest({
      ...config,
      method: HTTP_METHODS.POST,
      url: this.options.graphqlURL,
      data: requestBody,
      headers: {
        ...config.headers,
        'Content-Type': 'application/json'
      }
    });
    
    // Handle GraphQL errors
    if (response.data.errors) {
      throw new Error(`GraphQL Error: ${response.data.errors[0].message}`);
    }
    
    return {
      ...response,
      data: response.data.data
    };
  }

  async executeUploadRequest(config) {
    const formData = new FormData();
    
    // Add files
    if (config.files) {
      config.files.forEach((file, index) => {
        formData.append(config.fileField || `file${index}`, file);
      });
    }
    
    // Add additional data
    if (config.data) {
      Object.keys(config.data).forEach(key => {
        formData.append(key, config.data[key]);
      });
    }
    
    return await this.executeRESTRequest({
      ...config,
      method: HTTP_METHODS.POST,
      data: formData,
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  async executeDownloadRequest(config) {
    const response = await this.executeRESTRequest({
      ...config,
      method: HTTP_METHODS.GET,
      responseType: 'blob'
    });
    
    // Handle file download
    if (config.saveToFile && response.data) {
      const fileUri = await this.saveFileToDevice(response.data, config.fileName);
      response.fileUri = fileUri;
    }
    
    return response;
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================
  async get(url, config = {}) {
    return this.request({
      method: HTTP_METHODS.GET,
      url,
      ...config
    });
  }

  async post(url, data, config = {}) {
    return this.request({
      method: HTTP_METHODS.POST,
      url,
      data,
      ...config
    });
  }

  async put(url, data, config = {}) {
    return this.request({
      method: HTTP_METHODS.PUT,
      url,
      data,
      ...config
    });
  }

  async patch(url, data, config = {}) {
    return this.request({
      method: HTTP_METHODS.PATCH,
      url,
      data,
      ...config
    });
  }

  async delete(url, config = {}) {
    return this.request({
      method: HTTP_METHODS.DELETE,
      url,
      ...config
    });
  }

  async graphql(query, variables = {}, config = {}) {
    return this.request({
      type: REQUEST_TYPES.GRAPHQL,
      query,
      variables,
      ...config
    });
  }

  async upload(url, files, data = {}, config = {}) {
    return this.request({
      type: REQUEST_TYPES.UPLOAD,
      url,
      files,
      data,
      ...config
    });
  }

  async download(url, fileName, config = {}) {
    return this.request({
      type: REQUEST_TYPES.DOWNLOAD,
      url,
      fileName,
      saveToFile: true,
      ...config
    });
  }

  // ============================================================================
  // CACHING
  // ============================================================================
  shouldCheckCache(config) {
    if (!this.options.enableCaching) return false;
    
    const strategy = config.cacheStrategy || this.options.defaultCacheStrategy;
    return strategy === CACHE_STRATEGIES.CACHE_FIRST || 
           strategy === CACHE_STRATEGIES.CACHE_ONLY ||
           strategy === CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  shouldCacheResponse(config, response) {
    if (!this.options.enableCaching) return false;
    if (config.method !== HTTP_METHODS.GET) return false;
    if (response.status < 200 || response.status >= 300) return false;
    
    return config.cache !== false;
  }

  async getCachedResponse(config) {
    const cacheKey = this.generateCacheKey(config);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    // Handle stale-while-revalidate
    if (config.cacheStrategy === CACHE_STRATEGIES.STALE_WHILE_REVALIDATE) {
      const isStale = Date.now() > cached.staleAt;
      if (isStale) {
        // Trigger background revalidation
        this.revalidateInBackground(config);
      }
    }
    
    return cached.response;
  }

  async cacheResponse(config, response) {
    const cacheKey = this.generateCacheKey(config);
    const cacheTTL = config.cacheTTL || this.options.cacheTimeout;
    const now = Date.now();
    
    const cacheEntry = {
      response,
      cachedAt: now,
      expiresAt: now + cacheTTL,
      staleAt: now + (cacheTTL * 0.8), // 80% of TTL
      size: JSON.stringify(response).length
    };
    
    this.cache.set(cacheKey, cacheEntry);
    
    // Enforce cache size limit
    await this.enforceCacheLimit();
    
    // Persist cache
    await this.persistCache();
  }

  async revalidateInBackground(config) {
    try {
      // Execute request without using cache
      const freshResponse = await this.executeRequest({
        ...config,
        cache: false,
        cacheStrategy: CACHE_STRATEGIES.NETWORK_ONLY
      });
      
      // Update cache
      await this.cacheResponse(config, freshResponse);
      
      this.emit('cache_revalidated', { config, response: freshResponse });
      
    } catch (error) {
      console.warn('Background revalidation failed:', error);
    }
  }

  generateCacheKey(config) {
    const keyData = {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.method === HTTP_METHODS.GET ? undefined : config.data
    };
    
    return this.cacheUtils?.generateKey(keyData) || 
           JSON.stringify(keyData).replace(/\s/g, '');
  }

  async enforceCacheLimit() {
    let totalSize = 0;
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      ...value
    }));
    
    // Calculate total size
    entries.forEach(entry => {
      totalSize += entry.size || 0;
    });
    
    // Remove oldest entries if over limit
    if (totalSize > this.options.maxCacheSize) {
      entries.sort((a, b) => a.cachedAt - b.cachedAt);
      
      while (totalSize > this.options.maxCacheSize * 0.8 && entries.length > 0) {
        const oldest = entries.shift();
        this.cache.delete(oldest.key);
        totalSize -= oldest.size || 0;
      }
    }
  }

  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  async persistCache() {
    try {
      const cacheData = Array.from(this.cache.entries());
      await AsyncStorage.setItem('@eatech:api_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }

  // ============================================================================
  // OFFLINE HANDLING
  // ============================================================================
  async queueOfflineRequest(config) {
    if (!this.offlineService) {
      throw new Error('Network unavailable and offline service not enabled');
    }
    
    const queuedRequest = {
      id: this.generateRequestId(),
      config,
      timestamp: Date.now(),
      priority: config.priority || PRIORITY_LEVELS.NORMAL
    };
    
    await this.offlineService.addToQueue(queuedRequest);
    
    this.emit('request_queued', queuedRequest);
    
    return {
      queued: true,
      id: queuedRequest.id,
      message: 'Request queued for when connection is restored'
    };
  }

  async handleNetworkReconnect() {
    this.emit('network_reconnected');
    
    if (this.offlineService) {
      try {
        await this.offlineService.processQueue();
      } catch (error) {
        console.error('Failed to process offline queue:', error);
      }
    }
  }

  handleNetworkDisconnect() {
    this.emit('network_disconnected');
    
    // Cancel pending requests that aren't critical
    for (const [id, config] of this.pendingRequests) {
      if (config.priority < PRIORITY_LEVELS.HIGH) {
        this.cancelRequest(id);
      }
    }
  }

  // ============================================================================
  // REQUEST BATCHING
  // ============================================================================
  shouldBatchRequest(config) {
    return this.options.enableBatching && 
           config.method === HTTP_METHODS.GET &&
           config.batch !== false;
  }

  async batchRequest(config) {
    const batchKey = this.generateBatchKey(config);
    
    if (!this.requestBatches.has(batchKey)) {
      this.requestBatches.set(batchKey, {
        requests: [],
        timer: null
      });
    }
    
    const batch = this.requestBatches.get(batchKey);
    
    return new Promise((resolve, reject) => {
      batch.requests.push({ config, resolve, reject });
      
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
      
      batch.timer = setTimeout(() => {
        this.executeBatch(batchKey);
      }, this.options.batchTimeout);
    });
  }

  async executeBatch(batchKey) {
    const batch = this.requestBatches.get(batchKey);
    if (!batch) return;
    
    this.requestBatches.delete(batchKey);
    
    try {
      // Execute all requests in parallel
      const promises = batch.requests.map(({ config }) => 
        this.executeRequest({ ...config, batch: false })
      );
      
      const responses = await Promise.allSettled(promises);
      
      // Resolve individual promises
      responses.forEach((result, index) => {
        const { resolve, reject } = batch.requests[index];
        
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
      
    } catch (error) {
      // Reject all promises if batch fails
      batch.requests.forEach(({ reject }) => reject(error));
    }
  }

  generateBatchKey(config) {
    return `${config.method}:${config.url.split('?')[0]}`;
  }

  // ============================================================================
  // ERROR HANDLING & RETRY
  // ============================================================================
  async handleRequestError(config, error) {
    if (this.errorHandlingService) {
      error = await this.errorHandlingService.processError(error, config);
    }
    
    // Check if request should be retried
    if (this.shouldRetry(config, error)) {
      try {
        return await this.retryService.retry(() => this.executeRequest(config));
      } catch (retryError) {
        this.emit('retry_failed', { config, error: retryError });
        throw retryError;
      }
    }
    
    this.emit('request_error', { config, error });
    throw error;
  }

  shouldRetry(config, error) {
    if (config.retry === false) return false;
    if (!this.retryService) return false;
    
    // Don't retry 4xx errors (except 429 - rate limit)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return error.response.status === 429;
    }
    
    // Retry network errors and 5xx errors
    return !error.response || error.response.status >= 500;
  }

  // ============================================================================
  // INTERCEPTORS
  // ============================================================================
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
  }

  addResponseInterceptor(onFulfilled, onRejected) {
    this.interceptors.response.push({ onFulfilled, onRejected });
  }

  async applyRequestInterceptors(config) {
    let processedConfig = config;
    
    for (const interceptor of this.interceptors.request) {
      try {
        processedConfig = await interceptor(processedConfig);
      } catch (error) {
        console.error('Request interceptor failed:', error);
      }
    }
    
    return processedConfig;
  }

  async applyResponseInterceptors(response) {
    let processedResponse = response;
    
    for (const interceptor of this.interceptors.response) {
      try {
        if (interceptor.onFulfilled) {
          processedResponse = await interceptor.onFulfilled(processedResponse);
        }
      } catch (error) {
        console.error('Response interceptor failed:', error);
        
        if (interceptor.onRejected) {
          return await interceptor.onRejected(error);
        }
        throw error;
      }
    }
    
    return processedResponse;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  buildURL(url) {
    if (url.startsWith('http')) return url;
    return `${this.options.baseURL}${url.startsWith('/') ? url : '/' + url}`;
  }

  async normalizeConfig(config) {
    return {
      method: HTTP_METHODS.GET,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.headers
      },
      type: REQUEST_TYPES.REST,
      priority: PRIORITY_LEVELS.NORMAL,
      ...config
    };
  }

  async saveFileToDevice(blob, fileName) {
    // Implementation would depend on file system access
    // This is a placeholder for the actual file saving logic
    return `file://device/downloads/${fileName}`;
  }

  cancelRequest(requestId) {
    const config = this.pendingRequests.get(requestId);
    if (config && config.cancelToken) {
      config.cancelToken.cancel('Request cancelled');
    }
    this.pendingRequests.delete(requestId);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  isOnlineMode() {
    return this.isOnline;
  }

  getCacheStats() {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
    
    return {
      entryCount: this.cache.size,
      totalSize,
      hitRate: this.cacheHitRate || 0
    };
  }

  getQueueStats() {
    return this.offlineService?.getQueueStats() || { size: 0 };
  }

  clearCache() {
    this.cache.clear();
    AsyncStorage.removeItem('@eatech:api_cache');
    this.emit('cache_cleared');
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================
  cleanup() {
    try {
      // Cancel pending requests
      for (const requestId of this.pendingRequests.keys()) {
        this.cancelRequest(requestId);
      }
      
      // Clear batches
      for (const batch of this.requestBatches.values()) {
        if (batch.timer) {
          clearTimeout(batch.timer);
        }
      }
      this.requestBatches.clear();
      
      // Persist final cache state
      this.persistCache();
      
      // Remove listeners
      this.removeAllListeners();
      
    } catch (error) {
      console.error('API service cleanup failed:', error);
    }
  }
}

export default APIService;