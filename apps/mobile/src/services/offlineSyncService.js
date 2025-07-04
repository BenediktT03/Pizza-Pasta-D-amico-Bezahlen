/**
 * EATECH Mobile App - Offline Sync Service
 * Version: 25.0.0
 * Description: Offline-First Synchronisierung für die EATECH Admin App
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/services/offlineSyncService.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

// Config
import { EATECH_CONFIG } from '../config/constants';

// Utils
import { generateUUID, hashObject } from '../utils/helpers';

// ============================================================================
// CONSTANTS
// ============================================================================
const SYNC_TASK_NAME = 'EATECH_BACKGROUND_SYNC';
const OFFLINE_QUEUE_KEY = 'offline_queue';
const CACHE_PREFIX = 'cache_';
const SYNC_STATUS_KEY = 'sync_status';

// ============================================================================
// OFFLINE SYNC SERVICE
// ============================================================================
class OfflineSyncService {
  constructor() {
    this.isOnline = true;
    this.syncInProgress = false;
    this.queue = [];
    this.cacheDir = `${FileSystem.documentDirectory}offline_cache/`;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  async initialize() {
    try {
      // Create cache directory
      await this.ensureCacheDirectory();

      // Load offline queue
      await this.loadQueue();

      // Setup network listener
      this.setupNetworkListener();

      // Setup background sync
      await this.setupBackgroundSync();

      // Initial sync if online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        this.syncOfflineData();
      }

      console.log('Offline sync service initialized');
    } catch (error) {
      console.error('Error initializing offline sync:', error);
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================
  async ensureCacheDirectory() {
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
    }
  }

  async cacheData(key, data, ttl = EATECH_CONFIG.OFFLINE.CACHE_DURATION) {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl,
        hash: hashObject(data),
      };

      // Store in AsyncStorage for quick access
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheEntry));

      // Store in file system for larger data
      const filePath = `${this.cacheDir}${key}.json`;
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(cacheEntry));

      console.log(`Cached data for key: ${key}`);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  async getCachedData(key) {
    try {
      // Try AsyncStorage first
      let cacheEntry = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      
      // Fallback to file system
      if (!cacheEntry) {
        const filePath = `${this.cacheDir}${key}.json`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists) {
          cacheEntry = await FileSystem.readAsStringAsync(filePath);
        }
      }

      if (!cacheEntry) return null;

      const entry = JSON.parse(cacheEntry);
      
      // Check if cache is still valid
      const isExpired = Date.now() - entry.timestamp > entry.ttl;
      if (isExpired) {
        await this.removeCachedData(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  async removeCachedData(key) {
    try {
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);

      // Remove from file system
      const filePath = `${this.cacheDir}${key}.json`;
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch (error) {
      console.error('Error removing cached data:', error);
    }
  }

  async clearAllCache() {
    try {
      // Clear AsyncStorage cache
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);

      // Clear file system cache
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      await this.ensureCacheDirectory();

      console.log('All cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async getCacheSize() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) return 0;

      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${this.cacheDir}${file}`);
        totalSize += fileInfo.size || 0;
      }

      return totalSize;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================
  async loadQueue() {
    try {
      const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      this.queue = queueData ? JSON.parse(queueData) : [];
      console.log(`Loaded ${this.queue.length} items from offline queue`);
    } catch (error) {
      console.error('Error loading queue:', error);
      this.queue = [];
    }
  }

  async saveQueue() {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  async addToQueue(action) {
    try {
      // Check queue size limit
      if (this.queue.length >= EATECH_CONFIG.OFFLINE.MAX_QUEUE_SIZE) {
        console.warn('Offline queue is full, removing oldest item');
        this.queue.shift();
      }

      const queueItem = {
        id: generateUUID(),
        timestamp: Date.now(),
        action,
        retries: 0,
        status: 'pending',
      };

      this.queue.push(queueItem);
      await this.saveQueue();

      console.log('Added to offline queue:', queueItem.id);
      return queueItem.id;
    } catch (error) {
      console.error('Error adding to queue:', error);
      return null;
    }
  }

  async removeFromQueue(id) {
    this.queue = this.queue.filter(item => item.id !== id);
    await this.saveQueue();
  }

  async updateQueueItem(id, updates) {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue[index] = { ...this.queue[index], ...updates };
      await this.saveQueue();
    }
  }

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================
  async syncOfflineData() {
    if (this.syncInProgress || !this.isOnline) {
      console.log('Sync already in progress or offline');
      return;
    }

    this.syncInProgress = true;
    const syncStatus = {
      started: Date.now(),
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    try {
      console.log(`Starting sync of ${this.queue.length} items`);

      // Process queue items
      for (const item of [...this.queue]) {
        if (!this.isOnline) break;

        try {
          await this.processQueueItem(item);
          await this.removeFromQueue(item.id);
          syncStatus.succeeded++;
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
          
          item.retries++;
          item.lastError = error.message;
          
          if (item.retries >= 3) {
            item.status = 'failed';
            syncStatus.errors.push({
              id: item.id,
              error: error.message,
            });
          }
          
          await this.updateQueueItem(item.id, item);
          syncStatus.failed++;
        }
        
        syncStatus.processed++;
      }

      // Save sync status
      syncStatus.completed = Date.now();
      await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(syncStatus));

      console.log('Sync completed:', syncStatus);
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async processQueueItem(item) {
    const { action } = item;

    switch (action.type) {
      case 'CREATE_ORDER':
        return this.syncCreateOrder(action.payload);
      
      case 'UPDATE_ORDER':
        return this.syncUpdateOrder(action.payload);
      
      case 'UPDATE_INVENTORY':
        return this.syncUpdateInventory(action.payload);
      
      case 'UPDATE_PRODUCT':
        return this.syncUpdateProduct(action.payload);
      
      case 'UPDATE_SETTINGS':
        return this.syncUpdateSettings(action.payload);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // ============================================================================
  // SYNC HANDLERS
  // ============================================================================
  async syncCreateOrder(orderData) {
    // Implementation would call the actual API
    console.log('Syncing create order:', orderData);
    // return api.createOrder(orderData);
  }

  async syncUpdateOrder(updateData) {
    console.log('Syncing update order:', updateData);
    // return api.updateOrder(updateData.id, updateData.updates);
  }

  async syncUpdateInventory(inventoryData) {
    console.log('Syncing update inventory:', inventoryData);
    // return api.updateInventory(inventoryData);
  }

  async syncUpdateProduct(productData) {
    console.log('Syncing update product:', productData);
    // return api.updateProduct(productData.id, productData.updates);
  }

  async syncUpdateSettings(settingsData) {
    console.log('Syncing update settings:', settingsData);
    // return api.updateSettings(settingsData);
  }

  // ============================================================================
  // NETWORK MONITORING
  // ============================================================================
  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;

      console.log(`Network status: ${this.isOnline ? 'Online' : 'Offline'}`);

      // Trigger sync when coming back online
      if (wasOffline && this.isOnline) {
        console.log('Network restored, triggering sync');
        this.syncOfflineData();
      }
    });
  }

  // ============================================================================
  // BACKGROUND SYNC
  // ============================================================================
  async setupBackgroundSync() {
    if (Platform.OS === 'web') return;

    try {
      // Define the background fetch task
      TaskManager.defineTask(SYNC_TASK_NAME, async () => {
        try {
          const networkState = await NetInfo.fetch();
          
          if (networkState.isConnected) {
            await this.syncOfflineData();
            return BackgroundFetch.BackgroundFetchResult.NewData;
          }
          
          return BackgroundFetch.BackgroundFetchResult.NoData;
        } catch (error) {
          console.error('Background sync error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register background fetch task
      await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
        minimumInterval: EATECH_CONFIG.OFFLINE.SYNC_INTERVAL / 1000, // Convert to seconds
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background sync registered');
    } catch (error) {
      console.error('Error setting up background sync:', error);
    }
  }

  async unregisterBackgroundSync() {
    try {
      await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME);
      console.log('Background sync unregistered');
    } catch (error) {
      console.error('Error unregistering background sync:', error);
    }
  }

  // ============================================================================
  // STATUS & STATISTICS
  // ============================================================================
  async getSyncStatus() {
    try {
      const status = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      return status ? JSON.parse(status) : null;
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  getQueueStatus() {
    return {
      count: this.queue.length,
      pending: this.queue.filter(item => item.status === 'pending').length,
      failed: this.queue.filter(item => item.status === 'failed').length,
      oldest: this.queue.length > 0 ? new Date(this.queue[0].timestamp) : null,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
const offlineSyncService = new OfflineSyncService();

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================
export const initializeOfflineSync = async () => {
  return await offlineSyncService.initialize();
};

export const offlineCache = {
  set: (key, data, ttl) => offlineSyncService.cacheData(key, data, ttl),
  get: (key) => offlineSyncService.getCachedData(key),
  remove: (key) => offlineSyncService.removeCachedData(key),
  clear: () => offlineSyncService.clearAllCache(),
  getSize: () => offlineSyncService.getCacheSize(),
};

export const offlineQueue = {
  add: (action) => offlineSyncService.addToQueue(action),
  sync: () => offlineSyncService.syncOfflineData(),
  getStatus: () => offlineSyncService.getQueueStatus(),
};

// ============================================================================
// EXPORT
// ============================================================================
export { offlineSyncService };
export default offlineSyncService;