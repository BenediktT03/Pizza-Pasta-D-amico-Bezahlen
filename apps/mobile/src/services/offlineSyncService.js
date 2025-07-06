/**
 * EATECH - Offline Service
 * Version: 5.2.0
 * Description: Comprehensive Offline Management mit Smart Sync & Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/mobile/src/services/OfflineService.js
 * 
 * Features: Smart caching, offline queue, sync strategies, conflict resolution
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import { EventEmitter } from 'events';

// Lazy loaded utilities
const storageUtils = () => import('../utils/StorageUtils');
const networkUtils = () => import('../utils/NetworkUtils');
const encryptionUtils = () => import('../utils/EncryptionUtils');
const compressionUtils = () => import('../utils/CompressionUtils');
const validationUtils = () => import('../utils/ValidationUtils');

// Lazy loaded services
const apiService = () => import('./APIService');
const authService = () => import('./AuthService');
const cacheService = () => import('./CacheService');
const syncService = () => import('./SyncService');
const analyticsService = () => import('./AnalyticsService');

// Storage keys
const STORAGE_KEYS = {
  OFFLINE_QUEUE: '@eatech:offline_queue',
  CACHED_DATA: '@eatech:cached_data',
  SYNC_METADATA: '@eatech:sync_metadata',
  OFFLINE_CONFIG: '@eatech:offline_config',
  CONFLICT_RESOLUTION: '@eatech:conflict_resolution'
};

// Sync strategies
export const SYNC_STRATEGIES = {
  IMMEDIATE: 'immediate',           // Sync as soon as online
  SCHEDULED: 'scheduled',           // Sync at specific intervals
  MANUAL: 'manual',                // User-triggered sync
  INTELLIGENT: 'intelligent',      // AI-driven sync optimization
  BACKGROUND: 'background'          // Background sync when app inactive
};

// Conflict resolution strategies
export const CONFLICT_RESOLUTION = {
  CLIENT_WINS: 'client_wins',       // Local changes override server
  SERVER_WINS: 'server_wins',       // Server changes override local
  MERGE: 'merge',                   // Attempt to merge changes
  USER_CHOICE: 'user_choice',       // Let user decide
  TIMESTAMP: 'timestamp'            // Latest timestamp wins
};

// Data priorities
export const DATA_PRIORITIES = {
  CRITICAL: 1,    // User orders, payments
  HIGH: 2,        // Menu updates, user preferences
  MEDIUM: 3,      // Analytics, reviews
  LOW: 4          // Cache warming, preloading
};

class OfflineService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxQueueSize: 1000,
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      syncStrategy: SYNC_STRATEGIES.INTELLIGENT,
      conflictResolution: CONFLICT_RESOLUTION.TIMESTAMP,
      enableEncryption: true,
      enableCompression: true,
      syncInterval: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 2000,
      batchSize: 10,
      ...options
    };
    
    // State
    this.isOnline = true;
    this.isInitialized = false;
    this.isSyncing = false;
    this.offlineQueue = [];
    this.cachedData = new Map();
    this.syncMetadata = new Map();
    this.pendingOperations = new Map();
    this.lastSyncTime = null;
    this.networkSubscription = null;
    this.syncInterval = null;
    
    // Lazy loaded services
    this.apiService = null;
    this.authService = null;
    this.cacheService = null;
    this.syncService = null;
    this.analyticsService = null;
    this.storageUtils = null;
    this.networkUtils = null;
    this.encryptionUtils = null;
    this.compressionUtils = null;
    this.validationUtils = null;
    
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  async initialize() {
    try {
      await this.initializeLazyServices();
      await this.loadPersistedData();
      await this.setupNetworkMonitoring();
      await this.setupSyncStrategy();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      // Track analytics
      if (this.analyticsService) {
        this.analyticsService.trackEvent('offline_service_initialized', {
          queue_size: this.offlineQueue.length,
          cache_size: this.cachedData.size,
          sync_strategy: this.options.syncStrategy
        });
      }
      
    } catch (error) {
      console.error('Failed to initialize offline service:', error);
      this.emit('initialization_error', error);
    }
  }

  async initializeLazyServices() {
    try {
      // Initialize utilities
      this.storageUtils = await storageUtils();
      this.networkUtils = await networkUtils();
      this.encryptionUtils = await encryptionUtils();
      this.compressionUtils = await compressionUtils();
      this.validationUtils = await validationUtils();
      
      // Initialize services
      const APIService = await apiService();
      this.apiService = new APIService.default();
      
      const AuthService = await authService();
      this.authService = new AuthService.default();
      
      const CacheService = await cacheService();
      this.cacheService = new CacheService.default('offline_cache');
      
      const SyncService = await syncService();
      this.syncService = new SyncService.default();
      
      const AnalyticsService = await analyticsService();
      this.analyticsService = new AnalyticsService.default();
      
    } catch (error) {
      console.error('Failed to initialize lazy services:', error);
      throw error;
    }
  }

  async loadPersistedData() {
    try {
      // Load offline queue
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
      }
      
      // Load cached data
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_DATA);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.cachedData = new Map(parsed);
      }
      
      // Load sync metadata
      const syncMetadata = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_METADATA);
      if (syncMetadata) {
        const parsed = JSON.parse(syncMetadata);
        this.syncMetadata = new Map(parsed);
        this.lastSyncTime = parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null;
      }
      
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  }

  async setupNetworkMonitoring() {
    this.networkSubscription = NetInfo.addEventListener(state => {
      this.handleNetworkChange(state);
    });
    
    // Get initial network state
    const networkState = await NetInfo.fetch();
    this.handleNetworkChange(networkState);
  }

  async setupSyncStrategy() {
    switch (this.options.syncStrategy) {
      case SYNC_STRATEGIES.SCHEDULED:
        this.setupScheduledSync();
        break;
      case SYNC_STRATEGIES.INTELLIGENT:
        this.setupIntelligentSync();
        break;
      case SYNC_STRATEGIES.BACKGROUND:
        this.setupBackgroundSync();
        break;
      default:
        // IMMEDIATE and MANUAL don't need setup
        break;
    }
  }

  // ============================================================================
  // NETWORK MONITORING
  // ============================================================================
  handleNetworkChange(networkState) {
    const wasOnline = this.isOnline;
    this.isOnline = networkState.isConnected && networkState.isInternetReachable;
    
    if (!wasOnline && this.isOnline) {
      this.handleGoingOnline();
    } else if (wasOnline && !this.isOnline) {
      this.handleGoingOffline();
    }
    
    this.emit('network_state_changed', {
      isOnline: this.isOnline,
      networkState: networkState
    });
  }

  async handleGoingOnline() {
    this.emit('went_online');
    
    // Start sync based on strategy
    if (this.options.syncStrategy === SYNC_STRATEGIES.IMMEDIATE) {
      await this.syncOfflineQueue();
    }
    
    // Track analytics
    if (this.analyticsService) {
      this.analyticsService.trackEvent('network_online', {
        queue_size: this.offlineQueue.length,
        offline_duration: this.getOfflineDuration()
      });
    }
  }

  handleGoingOffline() {
    this.emit('went_offline');
    
    // Cancel ongoing sync
    this.cancelSync();
    
    // Track analytics
    if (this.analyticsService) {
      this.analyticsService.trackEvent('network_offline', {
        last_sync: this.lastSyncTime?.toISOString()
      });
    }
  }

  // ============================================================================
  // OFFLINE QUEUE MANAGEMENT
  // ============================================================================
  async addToOfflineQueue(operation) {
    try {
      const queueItem = {
        id: this.generateOperationId(),
        operation: operation,
        timestamp: new Date().toISOString(),
        priority: operation.priority || DATA_PRIORITIES.MEDIUM,
        attempts: 0,
        maxAttempts: this.options.retryAttempts,
        data: operation.data,
        metadata: {
          userAgent: 'EATECH Mobile',
          version: '3.0.0',
          platform: 'react-native'
        }
      };
      
      // Encrypt sensitive data if enabled
      if (this.options.enableEncryption && this.encryptionUtils) {
        queueItem.data = await this.encryptionUtils.encrypt(queueItem.data);
        queueItem.encrypted = true;
      }
      
      // Compress data if enabled
      if (this.options.enableCompression && this.compressionUtils) {
        queueItem.data = await this.compressionUtils.compress(queueItem.data);
        queueItem.compressed = true;
      }
      
      // Add to queue with priority sorting
      this.offlineQueue.push(queueItem);
      this.sortQueueByPriority();
      
      // Enforce queue size limit
      if (this.offlineQueue.length > this.options.maxQueueSize) {
        // Remove oldest, lowest priority items
        this.offlineQueue = this.offlineQueue
          .sort((a, b) => a.priority - b.priority || new Date(a.timestamp) - new Date(b.timestamp))
          .slice(-this.options.maxQueueSize);
      }
      
      // Persist queue
      await this.persistOfflineQueue();
      
      this.emit('operation_queued', queueItem);
      
      // Attempt immediate sync if online
      if (this.isOnline && this.options.syncStrategy === SYNC_STRATEGIES.IMMEDIATE) {
        this.syncOfflineQueue();
      }
      
      return queueItem.id;
    } catch (error) {
      console.error('Failed to add operation to offline queue:', error);
      throw error;
    }
  }

  async removeFromOfflineQueue(operationId) {
    const index = this.offlineQueue.findIndex(item => item.id === operationId);
    
    if (index !== -1) {
      const removed = this.offlineQueue.splice(index, 1)[0];
      await this.persistOfflineQueue();
      this.emit('operation_removed', removed);
      return removed;
    }
    
    return null;
  }

  sortQueueByPriority() {
    this.offlineQueue.sort((a, b) => {
      // Sort by priority first (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then by timestamp (older first)
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
  }

  async persistOfflineQueue() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_QUEUE,
        JSON.stringify(this.offlineQueue)
      );
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }

  // ============================================================================
  // CACHING
  // ============================================================================
  async cacheData(key, data, options = {}) {
    try {
      const cacheItem = {
        data: data,
        timestamp: new Date().toISOString(),
        ttl: options.ttl || 3600000, // 1 hour default
        priority: options.priority || DATA_PRIORITIES.MEDIUM,
        version: options.version || 1,
        checksum: await this.generateChecksum(data)
      };
      
      // Encrypt if enabled
      if (this.options.enableEncryption && this.encryptionUtils) {
        cacheItem.data = await this.encryptionUtils.encrypt(cacheItem.data);
        cacheItem.encrypted = true;
      }
      
      // Compress if enabled
      if (this.options.enableCompression && this.compressionUtils) {
        cacheItem.data = await this.compressionUtils.compress(cacheItem.data);
        cacheItem.compressed = true;
      }
      
      this.cachedData.set(key, cacheItem);
      
      // Enforce cache size limit
      await this.enforceCacheLimit();
      
      // Persist cache
      await this.persistCachedData();
      
      this.emit('data_cached', { key, size: JSON.stringify(data).length });
      
    } catch (error) {
      console.error('Failed to cache data:', error);
      throw error;
    }
  }

  async getCachedData(key) {
    try {
      const cacheItem = this.cachedData.get(key);
      
      if (!cacheItem) {
        return null;
      }
      
      // Check TTL
      const age = Date.now() - new Date(cacheItem.timestamp).getTime();
      if (age > cacheItem.ttl) {
        this.cachedData.delete(key);
        await this.persistCachedData();
        return null;
      }
      
      let data = cacheItem.data;
      
      // Decompress if needed
      if (cacheItem.compressed && this.compressionUtils) {
        data = await this.compressionUtils.decompress(data);
      }
      
      // Decrypt if needed
      if (cacheItem.encrypted && this.encryptionUtils) {
        data = await this.encryptionUtils.decrypt(data);
      }
      
      // Validate checksum
      if (cacheItem.checksum) {
        const currentChecksum = await this.generateChecksum(data);
        if (currentChecksum !== cacheItem.checksum) {
          console.warn('Cache data checksum mismatch, removing:', key);
          this.cachedData.delete(key);
          await this.persistCachedData();
          return null;
        }
      }
      
      this.emit('cache_hit', { key });
      return data;
      
    } catch (error) {
      console.error('Failed to get cached data:', error);
      this.cachedData.delete(key);
      return null;
    }
  }

  async invalidateCache(pattern) {
    const keysToRemove = [];
    
    for (const [key] of this.cachedData) {
      if (pattern instanceof RegExp) {
        if (pattern.test(key)) {
          keysToRemove.push(key);
        }
      } else if (typeof pattern === 'string') {
        if (key.includes(pattern)) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      this.cachedData.delete(key);
    });
    
    if (keysToRemove.length > 0) {
      await this.persistCachedData();
      this.emit('cache_invalidated', { keys: keysToRemove });
    }
  }

  async enforceCacheLimit() {
    const currentSize = this.calculateCacheSize();
    
    if (currentSize > this.options.maxCacheSize) {
      // Remove items starting with lowest priority and oldest timestamp
      const sortedEntries = Array.from(this.cachedData.entries())
        .sort(([, a], [, b]) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority; // Higher priority number = lower priority
          }
          return new Date(a.timestamp) - new Date(b.timestamp); // Older first
        });
      
      while (this.calculateCacheSize() > this.options.maxCacheSize * 0.8) {
        if (sortedEntries.length === 0) break;
        
        const [key] = sortedEntries.shift();
        this.cachedData.delete(key);
      }
    }
  }

  calculateCacheSize() {
    let size = 0;
    for (const [, item] of this.cachedData) {
      size += JSON.stringify(item).length;
    }
    return size;
  }

  async persistCachedData() {
    try {
      const serializable = Array.from(this.cachedData.entries());
      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHED_DATA,
        JSON.stringify(serializable)
      );
    } catch (error) {
      console.error('Failed to persist cached data:', error);
    }
  }

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================
  async syncOfflineQueue() {
    if (this.isSyncing || !this.isOnline || this.offlineQueue.length === 0) {
      return;
    }
    
    this.isSyncing = true;
    this.emit('sync_started', { queue_size: this.offlineQueue.length });
    
    try {
      const batches = this.createSyncBatches();
      
      for (const batch of batches) {
        await this.processBatch(batch);
      }
      
      this.lastSyncTime = new Date();
      await this.persistSyncMetadata();
      
      this.emit('sync_completed', {
        operations_synced: this.offlineQueue.length,
        duration: Date.now() - this.lastSyncTime.getTime()
      });
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.emit('sync_failed', error);
    } finally {
      this.isSyncing = false;
    }
  }

  createSyncBatches() {
    const batches = [];
    const sortedQueue = [...this.offlineQueue].sort((a, b) => a.priority - b.priority);
    
    for (let i = 0; i < sortedQueue.length; i += this.options.batchSize) {
      batches.push(sortedQueue.slice(i, i + this.options.batchSize));
    }
    
    return batches;
  }

  async processBatch(batch) {
    const promises = batch.map(item => this.processQueueItem(item));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const item = batch[index];
      
      if (result.status === 'fulfilled') {
        this.removeFromOfflineQueue(item.id);
        this.emit('operation_synced', item);
      } else {
        this.handleSyncFailure(item, result.reason);
      }
    });
  }

  async processQueueItem(item) {
    try {
      item.attempts++;
      
      let data = item.data;
      
      // Decrypt if needed
      if (item.encrypted && this.encryptionUtils) {
        data = await this.encryptionUtils.decrypt(data);
      }
      
      // Decompress if needed
      if (item.compressed && this.compressionUtils) {
        data = await this.compressionUtils.decompress(data);
      }
      
      // Validate data
      if (this.validationUtils) {
        await this.validationUtils.validate(data, item.operation.schema);
      }
      
      // Execute operation
      const result = await this.executeOperation(item.operation, data);
      
      // Handle conflicts if any
      if (result.conflict) {
        await this.handleConflict(item, result);
      }
      
      return result;
      
    } catch (error) {
      console.error(`Failed to process queue item ${item.id}:`, error);
      throw error;
    }
  }

  async executeOperation(operation, data) {
    const { method, endpoint, headers = {} } = operation;
    
    // Add authentication headers
    if (this.authService) {
      const authHeaders = await this.authService.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }
    
    // Execute API call
    return await this.apiService.request({
      method,
      url: endpoint,
      data,
      headers,
      timeout: 30000
    });
  }

  async handleSyncFailure(item, error) {
    if (item.attempts >= item.maxAttempts) {
      // Move to dead letter queue
      this.emit('operation_failed', { item, error });
      await this.removeFromOfflineQueue(item.id);
    } else {
      // Schedule retry with exponential backoff
      const delay = this.options.retryDelay * Math.pow(2, item.attempts - 1);
      setTimeout(() => {
        this.emit('operation_retry', { item, delay });
      }, delay);
    }
  }

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================
  async handleConflict(item, result) {
    const strategy = this.options.conflictResolution;
    
    switch (strategy) {
      case CONFLICT_RESOLUTION.CLIENT_WINS:
        return await this.resolveClientWins(item, result);
      
      case CONFLICT_RESOLUTION.SERVER_WINS:
        return await this.resolveServerWins(item, result);
      
      case CONFLICT_RESOLUTION.MERGE:
        return await this.resolveMerge(item, result);
      
      case CONFLICT_RESOLUTION.TIMESTAMP:
        return await this.resolveTimestamp(item, result);
      
      case CONFLICT_RESOLUTION.USER_CHOICE:
        return await this.resolveUserChoice(item, result);
      
      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }
  }

  async resolveClientWins(item, result) {
    // Force push client data
    return await this.executeOperation({
      ...item.operation,
      force: true
    }, item.data);
  }

  async resolveServerWins(item, result) {
    // Accept server version and discard local changes
    await this.cacheData(item.operation.cacheKey, result.serverData);
    return result;
  }

  async resolveMerge(item, result) {
    // Attempt to merge local and server data
    const mergedData = await this.mergeData(item.data, result.serverData);
    return await this.executeOperation(item.operation, mergedData);
  }

  async resolveTimestamp(item, result) {
    const clientTime = new Date(item.timestamp);
    const serverTime = new Date(result.serverTimestamp);
    
    if (clientTime > serverTime) {
      return await this.resolveClientWins(item, result);
    } else {
      return await this.resolveServerWins(item, result);
    }
  }

  async resolveUserChoice(item, result) {
    // Emit event for UI to handle
    this.emit('conflict_requires_resolution', {
      item,
      result,
      resolve: (choice) => {
        switch (choice) {
          case 'client':
            return this.resolveClientWins(item, result);
          case 'server':
            return this.resolveServerWins(item, result);
          case 'merge':
            return this.resolveMerge(item, result);
        }
      }
    });
  }

  // ============================================================================
  // SYNC STRATEGIES
  // ============================================================================
  setupScheduledSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncOfflineQueue();
      }
    }, this.options.syncInterval);
  }

  setupIntelligentSync() {
    // AI-driven sync based on network conditions, battery, user behavior
    // Implementation would analyze patterns and optimize sync timing
    this.setupScheduledSync(); // Fallback to scheduled for now
  }

  setupBackgroundSync() {
    // Setup background task for syncing
    // Implementation would depend on React Native background tasks
    this.setupScheduledSync(); // Fallback to scheduled for now
  }

  cancelSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isSyncing = false;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async generateChecksum(data) {
    // Simple checksum implementation
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  async mergeData(localData, serverData) {
    // Basic merge implementation - would need to be more sophisticated
    return { ...serverData, ...localData };
  }

  getOfflineDuration() {
    return this.lastSyncTime ? Date.now() - this.lastSyncTime.getTime() : 0;
  }

  async persistSyncMetadata() {
    try {
      const metadata = {
        lastSyncTime: this.lastSyncTime?.toISOString(),
        syncMetadata: Array.from(this.syncMetadata.entries())
      };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_METADATA,
        JSON.stringify(metadata)
      );
    } catch (error) {
      console.error('Failed to persist sync metadata:', error);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  async executeOfflineOperation(operation) {
    if (this.isOnline) {
      try {
        return await this.executeOperation(operation, operation.data);
      } catch (error) {
        // If online execution fails, queue for later
        return await this.addToOfflineQueue(operation);
      }
    } else {
      return await this.addToOfflineQueue(operation);
    }
  }

  async forcSync() {
    if (this.isOnline) {
      return await this.syncOfflineQueue();
    }
    throw new Error('Cannot sync while offline');
  }

  getQueueSize() {
    return this.offlineQueue.length;
  }

  getCacheSize() {
    return this.cachedData.size;
  }

  isOnlineMode() {
    return this.isOnline;
  }

  isSyncInProgress() {
    return this.isSyncing;
  }

  getLastSyncTime() {
    return this.lastSyncTime;
  }

  async clearOfflineData() {
    this.offlineQueue = [];
    this.cachedData.clear();
    this.syncMetadata.clear();
    
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE),
      AsyncStorage.removeItem(STORAGE_KEYS.CACHED_DATA),
      AsyncStorage.removeItem(STORAGE_KEYS.SYNC_METADATA)
    ]);
    
    this.emit('offline_data_cleared');
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================
  async cleanup() {
    try {
      this.cancelSync();
      
      if (this.networkSubscription) {
        this.networkSubscription();
      }
      
      await this.persistOfflineQueue();
      await this.persistCachedData();
      await this.persistSyncMetadata();
      
      this.removeAllListeners();
      
    } catch (error) {
      console.error('Failed to cleanup offline service:', error);
    }
  }
}

export default OfflineService;