// /apps/mobile/src/utils/storage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Types
export interface StorageOptions {
  secure?: boolean;
  ttl?: number; // Time to live in seconds
  encrypt?: boolean;
  compress?: boolean;
}

export interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
  encrypted?: boolean;
  compressed?: boolean;
}

export interface StorageStats {
  totalKeys: number;
  totalSize: number; // Approximate size in bytes
  secureKeys: number;
  expiredKeys: number;
}

// Configuration
const STORAGE_CONFIG = {
  keyPrefix: 'eatech_',
  secureKeyPrefix: 'eatech_secure_',
  defaultTTL: 30 * 24 * 60 * 60, // 30 days in seconds
  compressionThreshold: 1024, // Compress data larger than 1KB
  maxRetries: 3,
  retryDelay: 100, // ms
};

// Encryption key for additional security (in production, this should be more secure)
const ENCRYPTION_KEY = 'eatech_app_encryption_key_2025';

class StorageService {
  private cache: Map<string, StorageItem> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  // Initialize storage service
  private async initialize(): Promise<void> {
    try {
      // Clean up expired items on initialization
      await this.cleanupExpiredItems();

      this.isInitialized = true;
      console.log('Storage service initialized');
    } catch (error) {
      console.error('Error initializing storage service:', error);
    }
  }

  // Generate full key with prefix
  private getFullKey(key: string, secure: boolean = false): string {
    const prefix = secure ? STORAGE_CONFIG.secureKeyPrefix : STORAGE_CONFIG.keyPrefix;
    return `${prefix}${key}`;
  }

  // Check if item has expired
  private isExpired(item: StorageItem): boolean {
    if (!item.ttl) return false;

    const now = Date.now();
    const expirationTime = item.timestamp + (item.ttl * 1000);
    return now > expirationTime;
  }

  // Compress data using simple compression
  private compress(data: string): string {
    try {
      // Simple compression - in production, use a proper compression library
      return btoa(data);
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
      return data;
    }
  }

  // Decompress data
  private decompress(data: string): string {
    try {
      return atob(data);
    } catch (error) {
      console.warn('Decompression failed, returning as-is:', error);
      return data;
    }
  }

  // Simple encryption (in production, use a proper encryption library)
  private encrypt(data: string): string {
    try {
      // Simple XOR encryption for demo purposes
      let encrypted = '';
      for (let i = 0; i < data.length; i++) {
        const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
        const dataChar = data.charCodeAt(i);
        encrypted += String.fromCharCode(dataChar ^ keyChar);
      }
      return btoa(encrypted);
    } catch (error) {
      console.warn('Encryption failed, storing unencrypted:', error);
      return data;
    }
  }

  // Simple decryption
  private decrypt(encryptedData: string): string {
    try {
      const data = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < data.length; i++) {
        const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
        const dataChar = data.charCodeAt(i);
        decrypted += String.fromCharCode(dataChar ^ keyChar);
      }
      return decrypted;
    } catch (error) {
      console.warn('Decryption failed, returning as-is:', error);
      return encryptedData;
    }
  }

  // Retry wrapper for storage operations
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = STORAGE_CONFIG.maxRetries
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve =>
          setTimeout(resolve, STORAGE_CONFIG.retryDelay * Math.pow(2, attempt))
        );
      }
    }

    throw new Error('All retry attempts failed');
  }

  // Store data
  public async set<T>(
    key: string,
    value: T,
    options: StorageOptions = {}
  ): Promise<void> {
    try {
      const {
        secure = false,
        ttl,
        encrypt = false,
        compress = false
      } = options;

      const fullKey = this.getFullKey(key, secure);

      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        ttl,
        encrypted: encrypt,
        compressed: compress
      };

      let serializedData = JSON.stringify(item);

      // Apply encryption if requested
      if (encrypt) {
        serializedData = this.encrypt(serializedData);
      }

      // Apply compression if requested or data is large
      if (compress || serializedData.length > STORAGE_CONFIG.compressionThreshold) {
        serializedData = this.compress(serializedData);
        item.compressed = true;
      }

      // Store using appropriate storage method
      await this.withRetry(async () => {
        if (secure && Platform.OS !== 'web') {
          await SecureStore.setItemAsync(fullKey, serializedData);
        } else {
          await AsyncStorage.setItem(fullKey, serializedData);
        }
      });

      // Update cache
      this.cache.set(fullKey, item);

    } catch (error) {
      console.error(`Error storing key "${key}":`, error);
      throw new Error(`Failed to store ${key}: ${error}`);
    }
  }

  // Retrieve data
  public async get<T = any>(
    key: string,
    options: Pick<StorageOptions, 'secure'> = {}
  ): Promise<T | null> {
    try {
      const { secure = false } = options;
      const fullKey = this.getFullKey(key, secure);

      // Check cache first
      const cachedItem = this.cache.get(fullKey);
      if (cachedItem && !this.isExpired(cachedItem)) {
        return cachedItem.value as T;
      }

      // Retrieve from storage
      const serializedData = await this.withRetry(async () => {
        if (secure && Platform.OS !== 'web') {
          return await SecureStore.getItemAsync(fullKey);
        } else {
          return await AsyncStorage.getItem(fullKey);
        }
      });

      if (!serializedData) {
        return null;
      }

      let data = serializedData;

      // Parse the data to check for compression/encryption flags
      let item: StorageItem<T>;

      try {
        // First, try to parse as JSON to get metadata
        const parsedData = JSON.parse(data);

        // If it has our structure, it's a StorageItem
        if (parsedData && typeof parsedData === 'object' && 'value' in parsedData) {
          item = parsedData;
        } else {
          // Legacy data without our wrapper
          item = {
            value: parsedData,
            timestamp: Date.now(),
          };
        }
      } catch {
        // If JSON parsing fails, it might be compressed or encrypted
        // Try decompression first
        try {
          const decompressed = this.decompress(data);
          item = JSON.parse(decompressed);
        } catch {
          // Try decryption
          try {
            const decrypted = this.decrypt(data);
            item = JSON.parse(decrypted);
          } catch {
            // If all else fails, treat as raw string
            item = {
              value: data as any,
              timestamp: Date.now(),
            };
          }
        }
      }

      // Check if item has expired
      if (this.isExpired(item)) {
        await this.remove(key, options);
        return null;
      }

      // Handle compressed data
      if (item.compressed && typeof item.value === 'string') {
        try {
          const decompressed = this.decompress(item.value);
          item.value = JSON.parse(decompressed);
        } catch (error) {
          console.warn('Failed to decompress data:', error);
        }
      }

      // Handle encrypted data
      if (item.encrypted && typeof item.value === 'string') {
        try {
          const decrypted = this.decrypt(item.value);
          item.value = JSON.parse(decrypted);
        } catch (error) {
          console.warn('Failed to decrypt data:', error);
        }
      }

      // Update cache
      this.cache.set(fullKey, item);

      return item.value as T;

    } catch (error) {
      console.error(`Error retrieving key "${key}":`, error);
      return null;
    }
  }

  // Remove data
  public async remove(
    key: string,
    options: Pick<StorageOptions, 'secure'> = {}
  ): Promise<void> {
    try {
      const { secure = false } = options;
      const fullKey = this.getFullKey(key, secure);

      await this.withRetry(async () => {
        if (secure && Platform.OS !== 'web') {
          await SecureStore.deleteItemAsync(fullKey);
        } else {
          await AsyncStorage.removeItem(fullKey);
        }
      });

      // Remove from cache
      this.cache.delete(fullKey);

    } catch (error) {
      console.error(`Error removing key "${key}":`, error);
      throw new Error(`Failed to remove ${key}: ${error}`);
    }
  }

  // Remove multiple keys
  public async multiRemove(
    keys: string[],
    options: Pick<StorageOptions, 'secure'> = {}
  ): Promise<void> {
    try {
      const { secure = false } = options;
      const fullKeys = keys.map(key => this.getFullKey(key, secure));

      if (secure && Platform.OS !== 'web') {
        // SecureStore doesn't have multiRemove, so remove one by one
        for (const fullKey of fullKeys) {
          await SecureStore.deleteItemAsync(fullKey);
          this.cache.delete(fullKey);
        }
      } else {
        await AsyncStorage.multiRemove(fullKeys);
        fullKeys.forEach(fullKey => this.cache.delete(fullKey));
      }

    } catch (error) {
      console.error('Error removing multiple keys:', error);
      throw new Error(`Failed to remove keys: ${error}`);
    }
  }

  // Get multiple values
  public async multiGet<T = any>(
    keys: string[],
    options: Pick<StorageOptions, 'secure'> = {}
  ): Promise<Record<string, T | null>> {
    try {
      const result: Record<string, T | null> = {};

      // For secure storage or when we need individual processing, get one by one
      for (const key of keys) {
        result[key] = await this.get<T>(key, options);
      }

      return result;

    } catch (error) {
      console.error('Error getting multiple keys:', error);
      throw new Error(`Failed to get keys: ${error}`);
    }
  }

  // Set multiple values
  public async multiSet(
    keyValuePairs: Array<[string, any]>,
    options: StorageOptions = {}
  ): Promise<void> {
    try {
      // Set one by one to handle options properly
      for (const [key, value] of keyValuePairs) {
        await this.set(key, value, options);
      }

    } catch (error) {
      console.error('Error setting multiple keys:', error);
      throw new Error(`Failed to set keys: ${error}`);
    }
  }

  // Check if key exists
  public async has(
    key: string,
    options: Pick<StorageOptions, 'secure'> = {}
  ): Promise<boolean> {
    try {
      const value = await this.get(key, options);
      return value !== null;
    } catch (error) {
      console.error(`Error checking key "${key}":`, error);
      return false;
    }
  }

  // Get all keys
  public async getAllKeys(secure: boolean = false): Promise<string[]> {
    try {
      const prefix = secure ? STORAGE_CONFIG.secureKeyPrefix : STORAGE_CONFIG.keyPrefix;

      let allKeys: string[];

      if (secure && Platform.OS !== 'web') {
        // SecureStore doesn't have getAllKeys, return cached keys
        allKeys = Array.from(this.cache.keys()).filter(key => key.startsWith(prefix));
      } else {
        allKeys = await AsyncStorage.getAllKeys();
      }

      // Filter by prefix and remove prefix
      return allKeys
        .filter(key => key.startsWith(prefix))
        .map(key => key.substring(prefix.length));

    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  // Clear all data
  public async clear(secure: boolean = false): Promise<void> {
    try {
      if (secure && Platform.OS !== 'web') {
        // Clear secure storage by removing individual keys
        const keys = await this.getAllKeys(true);
        for (const key of keys) {
          await this.remove(key, { secure: true });
        }
      } else {
        // Clear regular storage
        const allKeys = await AsyncStorage.getAllKeys();
        const keysToRemove = allKeys.filter(key =>
          key.startsWith(STORAGE_CONFIG.keyPrefix)
        );

        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
        }
      }

      // Clear cache
      const prefix = secure ? STORAGE_CONFIG.secureKeyPrefix : STORAGE_CONFIG.keyPrefix;
      Array.from(this.cache.keys())
        .filter(key => key.startsWith(prefix))
        .forEach(key => this.cache.delete(key));

    } catch (error) {
      console.error('Error clearing storage:', error);
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }

  // Clear all data (both regular and secure)
  public async clearAll(): Promise<void> {
    await Promise.all([
      this.clear(false),
      this.clear(true)
    ]);
  }

  // Clean up expired items
  public async cleanupExpiredItems(): Promise<number> {
    try {
      let cleanedCount = 0;

      // Get all keys
      const [regularKeys, secureKeys] = await Promise.all([
        this.getAllKeys(false),
        this.getAllKeys(true)
      ]);

      // Check regular storage
      for (const key of regularKeys) {
        const item = await this.get(key);
        if (item === null) {
          cleanedCount++;
        }
      }

      // Check secure storage
      for (const key of secureKeys) {
        const item = await this.get(key, { secure: true });
        if (item === null) {
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired items`);
      return cleanedCount;

    } catch (error) {
      console.error('Error cleaning up expired items:', error);
      return 0;
    }
  }

  // Get storage statistics
  public async getStats(): Promise<StorageStats> {
    try {
      const [regularKeys, secureKeys] = await Promise.all([
        this.getAllKeys(false),
        this.getAllKeys(true)
      ]);

      let totalSize = 0;
      let expiredKeys = 0;

      // Calculate size and count expired items
      for (const key of regularKeys) {
        const fullKey = this.getFullKey(key);
        const data = await AsyncStorage.getItem(fullKey);
        if (data) {
          totalSize += data.length;

          // Check if expired
          try {
            const item = JSON.parse(data);
            if (this.isExpired(item)) {
              expiredKeys++;
            }
          } catch {
            // Ignore parsing errors for size calculation
          }
        }
      }

      return {
        totalKeys: regularKeys.length + secureKeys.length,
        totalSize,
        secureKeys: secureKeys.length,
        expiredKeys
      };

    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalKeys: 0,
        totalSize: 0,
        secureKeys: 0,
        expiredKeys: 0
      };
    }
  }

  // Export data (for backup purposes)
  public async exportData(): Promise<Record<string, any>> {
    try {
      const keys = await this.getAllKeys(false);
      const data: Record<string, any> = {};

      for (const key of keys) {
        const value = await this.get(key);
        if (value !== null) {
          data[key] = value;
        }
      }

      return data;

    } catch (error) {
      console.error('Error exporting data:', error);
      return {};
    }
  }

  // Import data (for restore purposes)
  public async importData(data: Record<string, any>): Promise<void> {
    try {
      const keyValuePairs: Array<[string, any]> = Object.entries(data);
      await this.multiSet(keyValuePairs);

    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error(`Failed to import data: ${error}`);
    }
  }

  // Check if storage service is ready
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// Create singleton instance
const storageService = new StorageService();

// Export convenience functions
export const storage = {
  set: <T>(key: string, value: T, options?: StorageOptions) =>
    storageService.set(key, value, options),

  get: <T = any>(key: string, options?: Pick<StorageOptions, 'secure'>) =>
    storageService.get<T>(key, options),

  remove: (key: string, options?: Pick<StorageOptions, 'secure'>) =>
    storageService.remove(key, options),

  multiRemove: (keys: string[], options?: Pick<StorageOptions, 'secure'>) =>
    storageService.multiRemove(keys, options),

  multiGet: <T = any>(keys: string[], options?: Pick<StorageOptions, 'secure'>) =>
    storageService.multiGet<T>(keys, options),

  multiSet: (keyValuePairs: Array<[string, any]>, options?: StorageOptions) =>
    storageService.multiSet(keyValuePairs, options),

  has: (key: string, options?: Pick<StorageOptions, 'secure'>) =>
    storageService.has(key, options),

  getAllKeys: (secure?: boolean) =>
    storageService.getAllKeys(secure),

  clear: (secure?: boolean) =>
    storageService.clear(secure),

  clearAll: () =>
    storageService.clearAll(),

  cleanupExpiredItems: () =>
    storageService.cleanupExpiredItems(),

  getStats: () =>
    storageService.getStats(),

  exportData: () =>
    storageService.exportData(),

  importData: (data: Record<string, any>) =>
    storageService.importData(data),

  isReady: () =>
    storageService.isReady()
};

// Export types
export type { StorageItem, StorageStats };

export default storage;
