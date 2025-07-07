/**
 * EATECH - Voice Settings Service
 * Version: 4.1.0
 * Description: Service for managing voice interface settings with cloud sync and persistence
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/services/VoiceSettingsService.js
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

// ============================================================================
// CONSTANTS
// ============================================================================

const COLLECTIONS = {
  USER_SETTINGS: 'userVoiceSettings',
  GLOBAL_SETTINGS: 'globalVoiceSettings',
  SETTINGS_TEMPLATES: 'voiceSettingsTemplates',
  USAGE_ANALYTICS: 'voiceUsageAnalytics'
};

const SETTINGS_VERSION = '4.1.0';

const SYNC_STRATEGIES = {
  IMMEDIATE: 'immediate',
  DEBOUNCED: 'debounced',
  MANUAL: 'manual',
  OFFLINE_FIRST: 'offline_first'
};

const ENCRYPTION_KEYS = {
  VOICE_PATTERNS: 'voice_patterns',
  CUSTOM_COMMANDS: 'custom_commands',
  PERSONAL_DATA: 'personal_data'
};

// ============================================================================
// VOICE SETTINGS SERVICE CLASS
// ============================================================================

class VoiceSettingsService {
  constructor() {
    this.cache = new Map();
    this.syncStrategy = SYNC_STRATEGIES.DEBOUNCED;
    this.encryptionEnabled = true;
    this.offlineMode = false;
    this.retryAttempts = 3;
    this.syncTimeout = 5000;
    
    // Debounced sync function
    this.debouncedSync = this.debounce(this.performSync.bind(this), 1000);
    
    // Event listeners
    this.listeners = new Map();
    this.unsubscribeCallbacks = new Map();
    
    // Statistics
    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      cacheHits: 0,
      cacheMisses: 0,
      encryptionOperations: 0
    };
    
    this.initialize();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async initialize() {
    try {
      // Check if we're in offline mode
      this.offlineMode = !navigator.onLine;
      
      // Set up online/offline listeners
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Initialize encryption if enabled
      if (this.encryptionEnabled) {
        await this.initializeEncryption();
      }
      
      console.log('VoiceSettingsService initialized');
    } catch (error) {
      console.error('Failed to initialize VoiceSettingsService:', error);
    }
  }
  
  async initializeEncryption() {
    // Initialize encryption for sensitive voice data
    try {
      if (window.crypto && window.crypto.subtle) {
        this.encryptionSupported = true;
        console.log('Encryption support enabled');
      } else {
        this.encryptionSupported = false;
        console.warn('Encryption not supported in this environment');
      }
    } catch (error) {
      console.error('Encryption initialization failed:', error);
      this.encryptionSupported = false;
    }
  }
  
  // ============================================================================
  // USER SETTINGS MANAGEMENT
  // ============================================================================
  
  async getUserSettings(userId, options = {}) {
    const { useCache = true, forceRefresh = false } = options;
    
    try {
      // Check cache first
      const cacheKey = `user_settings_${userId}`;
      if (useCache && !forceRefresh && this.cache.has(cacheKey)) {
        this.stats.cacheHits++;
        return this.cache.get(cacheKey);
      }
      
      this.stats.cacheMisses++;
      
      // If offline, return cached version or null
      if (this.offlineMode) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return cached;
        }
        throw new Error('No cached settings available in offline mode');
      }
      
      // Fetch from Firestore
      const docRef = doc(db, COLLECTIONS.USER_SETTINGS, userId);
      const docSnap = await this.withTimeout(getDoc(docRef), this.syncTimeout);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      let settingsData = docSnap.data();
      
      // Decrypt sensitive data if needed
      if (this.encryptionEnabled && settingsData.encrypted) {
        settingsData = await this.decryptSettings(settingsData);
      }
      
      // Validate and migrate if needed
      settingsData = await this.validateAndMigrate(settingsData);
      
      // Cache the result
      this.cache.set(cacheKey, settingsData);
      
      return settingsData;
      
    } catch (error) {
      console.error('Failed to get user settings:', error);
      this.stats.failedSyncs++;
      
      // Return cached version as fallback
      const cacheKey = `user_settings_${userId}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      throw error;
    }
  }
  
  async saveUserSettings(userId, settings, options = {}) {
    const { 
      syncStrategy = this.syncStrategy, 
      encrypt = this.encryptionEnabled,
      validate = true 
    } = options;
    
    try {
      // Validate settings if requested
      if (validate) {
        const validation = this.validateSettings(settings);
        if (!validation.isValid) {
          throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
        }
      }
      
      // Add metadata
      const settingsWithMetadata = {
        ...settings,
        version: SETTINGS_VERSION,
        userId,
        lastModified: new Date().toISOString(),
        deviceInfo: this.getDeviceInfo(),
        syncStrategy
      };
      
      // Cache immediately
      const cacheKey = `user_settings_${userId}`;
      this.cache.set(cacheKey, settingsWithMetadata);
      
      // Determine sync strategy
      switch (syncStrategy) {
        case SYNC_STRATEGIES.IMMEDIATE:
          await this.performSync(userId, settingsWithMetadata, { encrypt });
          break;
          
        case SYNC_STRATEGIES.DEBOUNCED:
          this.debouncedSync(userId, settingsWithMetadata, { encrypt });
          break;
          
        case SYNC_STRATEGIES.OFFLINE_FIRST:
          // Only sync when online
          if (!this.offlineMode) {
            await this.performSync(userId, settingsWithMetadata, { encrypt });
          }
          break;
          
        case SYNC_STRATEGIES.MANUAL:
          // Don't sync automatically
          break;
      }
      
      // Emit settings changed event
      this.emit('settingsChanged', { userId, settings: settingsWithMetadata });
      
      return true;
      
    } catch (error) {
      console.error('Failed to save user settings:', error);
      this.stats.failedSyncs++;
      throw error;
    }
  }
  
  async performSync(userId, settings, options = {}) {
    const { encrypt = this.encryptionEnabled, retryCount = 0 } = options;
    
    try {
      this.stats.totalSyncs++;
      
      let settingsToSync = { ...settings };
      
      // Encrypt sensitive data if enabled
      if (encrypt && this.encryptionSupported) {
        settingsToSync = await this.encryptSettings(settingsToSync);
      }
      
      // Add server timestamp
      settingsToSync.serverTimestamp = serverTimestamp();
      
      // Save to Firestore
      const docRef = doc(db, COLLECTIONS.USER_SETTINGS, userId);
      await this.withTimeout(setDoc(docRef, settingsToSync, { merge: true }), this.syncTimeout);
      
      this.stats.successfulSyncs++;
      console.log(`Settings synced successfully for user ${userId}`);
      
      // Emit sync success event
      this.emit('syncSuccess', { userId, settings: settingsToSync });
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.stats.failedSyncs++;
      
      // Retry logic
      if (retryCount < this.retryAttempts) {
        console.log(`Retrying sync (attempt ${retryCount + 1}/${this.retryAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.performSync(userId, settings, { ...options, retryCount: retryCount + 1 });
      }
      
      // Emit sync failure event
      this.emit('syncFailure', { userId, error: error.message });
      
      throw error;
    }
  }
  
  // ============================================================================
  // SETTINGS TEMPLATES
  // ============================================================================
  
  async getSettingsTemplates(category = null) {
    try {
      const cacheKey = `templates_${category || 'all'}`;
      
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      let q = collection(db, COLLECTIONS.SETTINGS_TEMPLATES);
      
      if (category) {
        q = query(q, where('category', '==', category));
      }
      
      const querySnapshot = await getDocs(q);
      const templates = [];
      
      querySnapshot.forEach((doc) => {
        templates.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Cache result
      this.cache.set(cacheKey, templates);
      
      return templates;
      
    } catch (error) {
      console.error('Failed to get settings templates:', error);
      return [];
    }
  }
  
  async saveSettingsTemplate(template) {
    try {
      const templateWithMetadata = {
        ...template,
        version: SETTINGS_VERSION,
        createdAt: new Date().toISOString(),
        deviceInfo: this.getDeviceInfo()
      };
      
      const docRef = doc(db, COLLECTIONS.SETTINGS_TEMPLATES, template.id);
      await setDoc(docRef, templateWithMetadata);
      
      // Clear templates cache
      this.clearTemplatesCache();
      
      return true;
      
    } catch (error) {
      console.error('Failed to save settings template:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // REAL-TIME SYNC
  // ============================================================================
  
  subscribeToUserSettings(userId, callback) {
    try {
      const docRef = doc(db, COLLECTIONS.USER_SETTINGS, userId);
      
      const unsubscribe = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          
          // Update cache
          const cacheKey = `user_settings_${userId}`;
          this.cache.set(cacheKey, data);
          
          // Call callback with decrypted data
          this.decryptSettings(data).then(decryptedData => {
            callback(decryptedData);
          }).catch(error => {
            console.error('Failed to decrypt real-time settings:', error);
            callback(data); // Fallback to raw data
          });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Real-time sync error:', error);
        this.emit('realtimeSyncError', { userId, error: error.message });
      });
      
      // Store unsubscribe function
      this.unsubscribeCallbacks.set(userId, unsubscribe);
      
      return unsubscribe;
      
    } catch (error) {
      console.error('Failed to subscribe to user settings:', error);
      throw error;
    }
  }
  
  unsubscribeFromUserSettings(userId) {
    const unsubscribe = this.unsubscribeCallbacks.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribeCallbacks.delete(userId);
    }
  }
  
  // ============================================================================
  // ENCRYPTION/DECRYPTION
  // ============================================================================
  
  async encryptSettings(settings) {
    if (!this.encryptionSupported) {
      return settings;
    }
    
    try {
      this.stats.encryptionOperations++;
      
      const settingsToEncrypt = { ...settings };
      const sensitiveFields = ['customCommands', 'voicePatterns', 'personalData'];
      
      for (const field of sensitiveFields) {
        if (settingsToEncrypt[field]) {
          settingsToEncrypt[field] = await this.encryptData(
            JSON.stringify(settingsToEncrypt[field])
          );
        }
      }
      
      settingsToEncrypt.encrypted = true;
      settingsToEncrypt.encryptionVersion = '1.0';
      
      return settingsToEncrypt;
      
    } catch (error) {
      console.error('Encryption failed:', error);
      return settings; // Return unencrypted as fallback
    }
  }
  
  async decryptSettings(settings) {
    if (!settings.encrypted || !this.encryptionSupported) {
      return settings;
    }
    
    try {
      this.stats.encryptionOperations++;
      
      const decryptedSettings = { ...settings };
      const sensitiveFields = ['customCommands', 'voicePatterns', 'personalData'];
      
      for (const field of sensitiveFields) {
        if (decryptedSettings[field] && typeof decryptedSettings[field] === 'string') {
          const decryptedData = await this.decryptData(decryptedSettings[field]);
          decryptedSettings[field] = JSON.parse(decryptedData);
        }
      }
      
      delete decryptedSettings.encrypted;
      delete decryptedSettings.encryptionVersion;
      
      return decryptedSettings;
      
    } catch (error) {
      console.error('Decryption failed:', error);
      return settings; // Return encrypted data as fallback
    }
  }
  
  async encryptData(data) {
    // Simple encryption implementation (in production, use a more robust solution)
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );
      
      // Convert to base64 for storage
      const keyData = await window.crypto.subtle.exportKey('raw', key);
      const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(keyData)));
      const ivBase64 = btoa(String.fromCharCode(...iv));
      const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
      
      return `${keyBase64}:${ivBase64}:${encryptedBase64}`;
      
    } catch (error) {
      console.error('Data encryption failed:', error);
      return data; // Return unencrypted as fallback
    }
  }
  
  async decryptData(encryptedData) {
    try {
      const [keyBase64, ivBase64, dataBase64] = encryptedData.split(':');
      
      if (!keyBase64 || !ivBase64 || !dataBase64) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Convert from base64
      const keyBuffer = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
      const encryptedBuffer = Uint8Array.from(atob(dataBase64), c => c.charCodeAt(0));
      
      // Import key
      const key = await window.crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // Decrypt
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedBuffer
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
      
    } catch (error) {
      console.error('Data decryption failed:', error);
      return encryptedData; // Return encrypted data as fallback
    }
  }
  
  // ============================================================================
  // VALIDATION & MIGRATION
  // ============================================================================
  
  validateSettings(settings) {
    const errors = [];
    
    // Check required fields
    if (!settings.language) {
      errors.push('Language is required');
    }
    
    // Validate language format
    if (settings.language && !/^[a-z]{2}(-[A-Z]{2})?$/.test(settings.language)) {
      errors.push('Invalid language format');
    }
    
    // Validate confidence threshold
    if (settings.recognition?.confidenceThreshold !== undefined) {
      const threshold = settings.recognition.confidenceThreshold;
      if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
        errors.push('Confidence threshold must be a number between 0 and 1');
      }
    }
    
    // Validate volume settings
    if (settings.tts?.volume !== undefined) {
      const volume = settings.tts.volume;
      if (typeof volume !== 'number' || volume < 0 || volume > 1) {
        errors.push('TTS volume must be a number between 0 and 1');
      }
    }
    
    // Validate rate settings
    if (settings.tts?.rate !== undefined) {
      const rate = settings.tts.rate;
      if (typeof rate !== 'number' || rate < 0.1 || rate > 3.0) {
        errors.push('TTS rate must be a number between 0.1 and 3.0');
      }
    }
    
    // Validate custom commands
    if (settings.advanced?.customCommands) {
      const commands = settings.advanced.customCommands;
      if (!Array.isArray(commands)) {
        errors.push('Custom commands must be an array');
      } else {
        commands.forEach((command, index) => {
          if (!command.pattern || !command.intent) {
            errors.push(`Custom command ${index} missing required fields`);
          }
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  async validateAndMigrate(settings) {
    try {
      // Check version and migrate if needed
      if (!settings.version || settings.version !== SETTINGS_VERSION) {
        settings = await this.migrateSettings(settings);
      }
      
      // Ensure all required fields exist with defaults
      settings = this.applyDefaults(settings);
      
      return settings;
      
    } catch (error) {
      console.error('Settings validation/migration failed:', error);
      return settings;
    }
  }
  
  async migrateSettings(settings) {
    console.log(`Migrating settings from version ${settings.version || 'unknown'} to ${SETTINGS_VERSION}`);
    
    // Migration logic based on version
    const currentVersion = settings.version || '1.0.0';
    
    if (this.compareVersions(currentVersion, '2.0.0') < 0) {
      // Migrate from 1.x to 2.x
      if (settings.voiceSettings) {
        settings.tts = settings.voiceSettings;
        delete settings.voiceSettings;
      }
    }
    
    if (this.compareVersions(currentVersion, '3.0.0') < 0) {
      // Migrate from 2.x to 3.x
      if (!settings.privacy) {
        settings.privacy = {
          saveTranscripts: false,
          shareAnalytics: true,
          localProcessing: false
        };
      }
    }
    
    if (this.compareVersions(currentVersion, '4.0.0') < 0) {
      // Migrate from 3.x to 4.x
      if (!settings.accessibility) {
        settings.accessibility = {
          highContrast: false,
          reducedMotion: false,
          screenReader: false
        };
      }
    }
    
    // Update version
    settings.version = SETTINGS_VERSION;
    settings.migratedAt = new Date().toISOString();
    
    return settings;
  }
  
  applyDefaults(settings) {
    // Ensure all sections exist with default values
    const defaults = {
      enabled: true,
      language: 'de-CH',
      dialect: 'de-CH-ZH',
      wakeWord: 'hey eatech',
      
      microphone: {
        deviceId: 'default',
        sensitivity: 0.7,
        noiseReduction: true,
        echoCancellation: true,
        autoGainControl: true
      },
      
      speaker: {
        deviceId: 'default',
        volume: 0.8,
        rate: 1.0,
        pitch: 1.0,
        voice: 'default'
      },
      
      recognition: {
        continuous: true,
        interimResults: true,
        maxAlternatives: 3,
        confidenceThreshold: 0.7,
        timeoutDuration: 5000
      },
      
      tts: {
        enabled: true,
        confirmations: true,
        errors: true,
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8
      },
      
      ui: {
        showWaveform: true,
        showTranscript: true,
        showConfidence: false,
        compactMode: false,
        animations: true
      },
      
      privacy: {
        saveTranscripts: false,
        shareAnalytics: true,
        localProcessing: false,
        dataRetention: 30
      },
      
      advanced: {
        customCommands: [],
        shortcuts: {},
        debugMode: false
      },
      
      stats: {
        totalCommands: 0,
        successfulCommands: 0,
        averageConfidence: 0
      }
    };
    
    return this.deepMerge(defaults, settings);
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }
  
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      onLine: navigator.onLine,
      timestamp: new Date().toISOString()
    };
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      )
    ]);
  }
  
  // ============================================================================
  // EVENT MANAGEMENT
  // ============================================================================
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
  
  // ============================================================================
  // NETWORK EVENT HANDLERS
  // ============================================================================
  
  handleOnline() {
    console.log('Network connection restored');
    this.offlineMode = false;
    this.emit('networkStatusChanged', { online: true });
    
    // Attempt to sync any pending changes
    this.syncPendingChanges();
  }
  
  handleOffline() {
    console.log('Network connection lost');
    this.offlineMode = true;
    this.emit('networkStatusChanged', { online: false });
  }
  
  async syncPendingChanges() {
    // In a real implementation, you would queue changes while offline
    // and sync them when connection is restored
    console.log('Syncing pending changes...');
  }
  
  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================
  
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
  
  clearTemplatesCache() {
    this.clearCache('templates_');
  }
  
  getCacheStats() {
    return {
      size: this.cache.size,
      hitRate: this.stats.cacheHits + this.stats.cacheMisses > 0 ?
        (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2) + '%' :
        '0%',
      hits: this.stats.cacheHits,
      misses: this.stats.cacheMisses
    };
  }
  
  // ============================================================================
  // ANALYTICS & STATISTICS
  // ============================================================================
  
  getStatistics() {
    return {
      ...this.stats,
      cache: this.getCacheStats(),
      syncRate: this.stats.totalSyncs > 0 ?
        (this.stats.successfulSyncs / this.stats.totalSyncs * 100).toFixed(2) + '%' :
        '0%'
    };
  }
  
  resetStatistics() {
    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      cacheHits: 0,
      cacheMisses: 0,
      encryptionOperations: 0
    };
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  destroy() {
    // Clear all subscriptions
    this.unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    this.unsubscribeCallbacks.clear();
    
    // Clear listeners
    this.listeners.clear();
    
    // Clear cache
    this.cache.clear();
    
    // Remove event listeners
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    console.log('VoiceSettingsService destroyed');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const voiceSettingsService = new VoiceSettingsService();

// ============================================================================
// EXPORTS
// ============================================================================

export { voiceSettingsService };
export default voiceSettingsService;

export {
  COLLECTIONS,
  SETTINGS_VERSION,
  SYNC_STRATEGIES,
  ENCRYPTION_KEYS
};