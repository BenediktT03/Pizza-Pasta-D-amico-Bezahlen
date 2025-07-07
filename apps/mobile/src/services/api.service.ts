// /apps/mobile/src/services/api.service.ts

import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

// Types
interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasNext?: boolean;
  };
}

interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: any;
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  offline?: boolean;
}

interface QueuedRequest {
  id: string;
  url: string;
  config: RequestConfig;
  timestamp: number;
  priority: number;
}

// Configuration
const API_CONFIG = {
  baseURL: __DEV__
    ? 'http://localhost:3001/api'  // Development
    : 'https://api.eatech.ch/api', // Production
  timeout: 10000,
  retries: 3,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  maxQueueSize: 100,
  enableLogging: __DEV__,
};

class ApiService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private requestQueue: QueuedRequest[] = [];
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private isOnline: boolean = true;
  private authToken: string | null = null;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': `EATECH-Mobile/${Platform.OS}/${Platform.Version}`,
    };

    this.initializeNetworkListener();
    this.loadAuthToken();
  }

  // Initialize network status monitoring
  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (API_CONFIG.enableLogging) {
        console.log('Network status:', this.isOnline ? 'Online' : 'Offline');
      }

      // Process queued requests when coming back online
      if (wasOffline && this.isOnline) {
        this.processRequestQueue();
      }
    });
  }

  // Load authentication token from storage
  private async loadAuthToken() {
    try {
      const token = await storage.get('authToken');
      if (token) {
        this.setAuthToken(token);
      }
    } catch (error) {
      console.error('Error loading auth token:', error);
    }
  }

  // Set authentication token
  public setAuthToken(token: string | null) {
    this.authToken = token;

    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  // Generate cache key
  private getCacheKey(url: string, config: RequestConfig): string {
    const method = config.method || 'GET';
    const body = config.body ? JSON.stringify(config.body) : '';
    return `${method}:${url}:${body}`;
  }

  // Check cache
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Set cache
  private setCache(key: string, data: any, ttl: number = API_CONFIG.cacheTimeout) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup old cache entries
    if (this.cache.size > 100) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }

  // Add request to queue for offline processing
  private addToQueue(url: string, config: RequestConfig, priority: number = 1) {
    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random()}`,
      url,
      config,
      timestamp: Date.now(),
      priority
    };

    this.requestQueue.push(request);

    // Sort by priority and timestamp
    this.requestQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Older first
    });

    // Limit queue size
    if (this.requestQueue.length > API_CONFIG.maxQueueSize) {
      this.requestQueue = this.requestQueue.slice(0, API_CONFIG.maxQueueSize);
    }

    // Save to storage
    storage.set('apiRequestQueue', this.requestQueue);
  }

  // Process queued requests when online
  private async processRequestQueue() {
    if (!this.isOnline || this.requestQueue.length === 0) return;

    if (API_CONFIG.enableLogging) {
      console.log(`Processing ${this.requestQueue.length} queued requests`);
    }

    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const request of queue) {
      try {
        await this.makeRequest(request.url, request.config);
        if (API_CONFIG.enableLogging) {
          console.log('Processed queued request:', request.url);
        }
      } catch (error) {
        console.error('Failed to process queued request:', request.url, error);

        // Re-queue critical requests
        if (request.priority >= 3) {
          this.addToQueue(request.url, request.config, request.priority - 1);
        }
      }
    }

    // Update storage
    storage.set('apiRequestQueue', this.requestQueue);
  }

  // Load queued requests from storage
  public async loadQueueFromStorage() {
    try {
      const queue = await storage.get('apiRequestQueue');
      if (Array.isArray(queue)) {
        this.requestQueue = queue;
      }
    } catch (error) {
      console.error('Error loading request queue:', error);
    }
  }

  // Make HTTP request with retries and caching
  private async makeRequest<T>(url: string, config: RequestConfig = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = API_CONFIG.timeout,
      retries = API_CONFIG.retries,
      cache = method === 'GET',
      offline = false
    } = config;

    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    const cacheKey = this.getCacheKey(fullUrl, config);

    // Check cache for GET requests
    if (cache && method === 'GET') {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        if (API_CONFIG.enableLogging) {
          console.log('Cache hit:', url);
        }
        return cached;
      }
    }

    // Handle offline requests
    if (!this.isOnline && !offline) {
      if (method !== 'GET') {
        this.addToQueue(url, config, method === 'POST' ? 3 : 2);
      }
      throw new ApiError('No internet connection', 'NETWORK_ERROR', 0, { offline: true });
    }

    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    const requestBody = body ? JSON.stringify(body) : undefined;

    if (API_CONFIG.enableLogging) {
      console.log(`API Request: ${method} ${fullUrl}`, {
        headers: requestHeaders,
        body: requestBody,
      });
    }

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          method,
          headers: requestHeaders,
          body: requestBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle HTTP errors
        if (!response.ok) {
          const errorData = await response.text();
          let parsedError;

          try {
            parsedError = JSON.parse(errorData);
          } catch {
            parsedError = { message: errorData || response.statusText };
          }

          // Handle specific error codes
          if (response.status === 401) {
            // Unauthorized - clear token and redirect to login
            this.setAuthToken(null);
            await storage.remove('authToken');
            await storage.remove('user');
            throw new ApiError('Authentication required', 'UNAUTHORIZED', 401, parsedError);
          }

          if (response.status === 403) {
            throw new ApiError('Access forbidden', 'FORBIDDEN', 403, parsedError);
          }

          if (response.status === 404) {
            throw new ApiError('Resource not found', 'NOT_FOUND', 404, parsedError);
          }

          if (response.status >= 500) {
            throw new ApiError('Server error', 'SERVER_ERROR', response.status, parsedError);
          }

          throw new ApiError(
            parsedError.message || 'Request failed',
            parsedError.code || 'REQUEST_FAILED',
            response.status,
            parsedError
          );
        }

        const responseData = await response.json();

        if (API_CONFIG.enableLogging) {
          console.log(`API Response: ${method} ${fullUrl}`, responseData);
        }

        // Cache successful GET requests
        if (cache && method === 'GET' && response.ok) {
          this.setCache(cacheKey, responseData);
        }

        return responseData;

      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout', 'TIMEOUT', 0, { timeout });
        }

        if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
          throw error;
        }

        // Log retry attempt
        if (attempt < retries) {
          if (API_CONFIG.enableLogging) {
            console.log(`Request failed, retrying (${attempt + 1}/${retries + 1}):`, error.message);
          }

          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    throw new ApiError(
      lastError?.message || 'Request failed after retries',
      'REQUEST_FAILED',
      0,
      { originalError: lastError, retries }
    );
  }

  // Public API methods

  // GET request
  public async get<T>(url: string, params?: Record<string, any>, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    let fullUrl = url;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    return this.makeRequest<T>(fullUrl, { ...config, method: 'GET' });
  }

  // POST request
  public async post<T>(url: string, data?: any, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return this.makeRequest<T>(url, { ...config, method: 'POST', body: data });
  }

  // PUT request
  public async put<T>(url: string, data?: any, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return this.makeRequest<T>(url, { ...config, method: 'PUT', body: data });
  }

  // PATCH request
  public async patch<T>(url: string, data?: any, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return this.makeRequest<T>(url, { ...config, method: 'PATCH', body: data });
  }

  // DELETE request
  public async delete<T>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.makeRequest<T>(url, { ...config, method: 'DELETE' });
  }

  // Upload file
  public async upload<T>(url: string, file: any, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();

    // Add file
    formData.append('file', file);

    // Add additional data
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers = {
      ...this.defaultHeaders,
      'Content-Type': 'multipart/form-data',
    };

    return this.makeRequest<T>(url, {
      method: 'POST',
      headers,
      body: formData,
      cache: false,
    });
  }

  // Clear cache
  public clearCache(pattern?: string) {
    if (pattern) {
      const regex = new RegExp(pattern);
      Array.from(this.cache.keys()).forEach(key => {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      });
    } else {
      this.cache.clear();
    }
  }

  // Get cache size
  public getCacheSize(): number {
    return this.cache.size;
  }

  // Get queue size
  public getQueueSize(): number {
    return this.requestQueue.length;
  }

  // Check if online
  public isConnected(): boolean {
    return this.isOnline;
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health', undefined, { cache: false, timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // Logout - clear tokens and cache
  public async logout() {
    this.setAuthToken(null);
    await storage.multiRemove(['authToken', 'user', 'refreshToken']);
    this.clearCache();
    this.requestQueue = [];
    await storage.remove('apiRequestQueue');
  }
}

// Custom error class
class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: any;

  constructor(message: string, code: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Export types
export type { ApiError as ApiErrorType, ApiResponse, RequestConfig };

// Initialize queue loading when module is imported
apiService.loadQueueFromStorage();

export default apiService;
