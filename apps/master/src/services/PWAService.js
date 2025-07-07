/**
 * EATECH - PWA Service
 * Version: 4.8.0
 * Description: Progressive Web App Service mit Offline-Features und Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/web/src/services/PWAService.js
 * 
 * Features: Service Worker, caching strategies, push notifications, app updates
 */

import { EventEmitter } from 'events';

// Lazy loaded modules
const cacheManager = () => import('../utils/cacheManager');
const notificationManager = () => import('../utils/notificationManager');
const updateManager = () => import('../utils/updateManager');
const backgroundSync = () => import('../utils/backgroundSync');
const offlineQueue = () => import('../utils/offlineQueue');

// Lazy loaded strategies
const cacheFirstStrategy = () => import('../strategies/cacheFirstStrategy');
const networkFirstStrategy = () => import('../strategies/networkFirstStrategy');
const staleWhileRevalidateStrategy = () => import('../strategies/staleWhileRevalidateStrategy');

/**
 * PWA Configuration
 */
const PWA_CONFIG = {
  serviceWorkerPath: '/sw.js',
  cacheName: 'eatech-v1',
  offlinePagePath: '/offline.html',
  updateCheckInterval: 30000, // 30 seconds
  maxRetries: 3,
  enableBackgroundSync: true,
  enablePushNotifications: true,
  enableAppShortcuts: true,
  enableWebShare: true
};

/**
 * Cache Strategies
 */
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

/**
 * Resource Types
 */
const RESOURCE_TYPES = {
  STATIC: 'static',
  API: 'api',
  IMAGES: 'images',
  FONTS: 'fonts',
  DOCUMENTS: 'documents'
};

/**
 * Main PWA Service Class
 */
class PWAService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = { ...PWA_CONFIG, ...config };
    this.isInitialized = false;
    this.isOnline = navigator.onLine;
    this.serviceWorkerRegistration = null;
    this.updateAvailable = false;
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.pushSubscription = null;
    
    // Bind methods
    this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
    this.handleBeforeInstallPrompt = this.handleBeforeInstallPrompt.bind(this);
    this.handleAppInstalled = this.handleAppInstalled.bind(this);
  }

  /**
   * Initialize PWA Service
   */
  async initialize() {
    try {
      console.log('Initializing PWA Service...');
      
      // Check PWA support
      this.checkPWASupport();
      
      // Register service worker
      await this.registerServiceWorker();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize managers
      await this.initializeManagers();
      
      // Check for updates
      this.startUpdateCheck();
      
      // Setup install prompt
      this.setupInstallPrompt();
      
      // Initialize push notifications
      if (this.config.enablePushNotifications) {
        await this.initializePushNotifications();
      }
      
      // Setup app shortcuts
      if (this.config.enableAppShortcuts) {
        this.setupAppShortcuts();
      }
      
      this.isInitialized = true;
      console.log('PWA Service initialized successfully');
      
      this.emit('initialized');
      
    } catch (error) {
      console.error('PWA Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check PWA support
   */
  checkPWASupport() {
    const support = {
      serviceWorker: 'serviceWorker' in navigator,
      pushNotifications: 'PushManager' in window,
      notifications: 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      webShare: 'share' in navigator
    };
    
    console.log('PWA Support:', support);
    return support;
  }

  /**
   * Register Service Worker
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }
    
    try {
      const registration = await navigator.serviceWorker.register(
        this.config.serviceWorkerPath,
        { scope: '/' }
      );
      
      this.serviceWorkerRegistration = registration;
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.updateAvailable = true;
            this.emit('update_available');
          }
        });
      });
      
      console.log('Service Worker registered successfully');
      this.emit('service_worker_registered', registration);
      
      return registration;
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Online/Offline status
    window.addEventListener('online', this.handleOnlineStatus);
    window.addEventListener('offline', this.handleOnlineStatus);
    
    // Install prompt
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.handleAppInstalled);
    
    // Service Worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });
    }
    
    // Page visibility
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });
  }

  /**
   * Initialize managers
   */
  async initializeManagers() {
    try {
      // Cache Manager
      const { default: CacheManager } = await cacheManager();
      this.cacheManager = new CacheManager(this.config.cacheName);
      await this.cacheManager.initialize();
      
      // Update Manager
      const { default: UpdateManager } = await updateManager();
      this.updateManager = new UpdateManager(this.serviceWorkerRegistration);
      
      // Background Sync
      if (this.config.enableBackgroundSync) {
        const { default: BackgroundSync } = await backgroundSync();
        this.backgroundSync = new BackgroundSync();
        await this.backgroundSync.initialize();
      }
      
      // Offline Queue
      const { default: OfflineQueue } = await offlineQueue();
      this.offlineQueue = new OfflineQueue();
      await this.offlineQueue.initialize();
      
    } catch (error) {
      console.error('Error initializing managers:', error);
    }
  }

  /**
   * Handle online/offline status
   */
  handleOnlineStatus() {
    const wasOnline = this.isOnline;
    this.isOnline = navigator.onLine;
    
    if (this.isOnline && !wasOnline) {
      console.log('App is now online');
      this.emit('online');
      this.processOfflineQueue();
    } else if (!this.isOnline && wasOnline) {
      console.log('App is now offline');
      this.emit('offline');
    }
  }

  /**
   * Process offline queue when back online
   */
  async processOfflineQueue() {
    if (this.offlineQueue) {
      try {
        await this.offlineQueue.processQueue();
        this.emit('offline_queue_processed');
      } catch (error) {
        console.error('Error processing offline queue:', error);
      }
    }
  }

  /**
   * Handle install prompt
   */
  handleBeforeInstallPrompt(event) {
    event.preventDefault();
    this.deferredPrompt = event;
    this.emit('install_prompt_available');
  }

  /**
   * Handle app installed
   */
  handleAppInstalled() {
    this.isInstalled = true;
    this.deferredPrompt = null;
    this.emit('app_installed');
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      throw new Error('Install prompt not available');
    }
    
    try {
      const result = await this.deferredPrompt.prompt();
      this.emit('install_prompt_result', result);
      
      if (result.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      this.deferredPrompt = null;
      return result;
      
    } catch (error) {
      console.error('Error showing install prompt:', error);
      throw error;
    }
  }

  /**
   * Initialize push notifications
   */
  async initializePushNotifications() {
    try {
      const { default: NotificationManager } = await notificationManager();
      this.notificationManager = new NotificationManager();
      
      const permission = await this.notificationManager.requestPermission();
      
      if (permission === 'granted' && this.serviceWorkerRegistration) {
        this.pushSubscription = await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY)
        });
        
        console.log('Push subscription created:', this.pushSubscription);
        this.emit('push_subscription_created', this.pushSubscription);
      }
      
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Send push notification
   */
  async sendNotification(title, options = {}) {
    if (!this.notificationManager) {
      await this.initializePushNotifications();
    }
    
    try {
      return await this.notificationManager.show(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Setup app shortcuts
   */
  setupAppShortcuts() {
    if ('shortcuts' in navigator) {
      const shortcuts = [
        {
          name: 'Neue Bestellung',
          short_name: 'Bestellen',
          description: 'Schnell eine neue Bestellung aufgeben',
          url: '/order',
          icons: [{ src: '/icons/order.png', sizes: '96x96' }]
        },
        {
          name: 'Menü anzeigen',
          short_name: 'Menü',
          description: 'Speisekarte anzeigen',
          url: '/menu',
          icons: [{ src: '/icons/menu.png', sizes: '96x96' }]
        }
      ];
      
      // This would be handled by the manifest.json in a real implementation
      console.log('App shortcuts configured:', shortcuts);
    }
  }

  /**
   * Cache resources with strategy
   */
  async cacheResources(resources, strategy = CACHE_STRATEGIES.CACHE_FIRST) {
    if (!this.cacheManager) {
      throw new Error('Cache manager not initialized');
    }
    
    try {
      let strategyHandler;
      
      switch (strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
          const { default: CacheFirstStrategy } = await cacheFirstStrategy();
          strategyHandler = new CacheFirstStrategy();
          break;
          
        case CACHE_STRATEGIES.NETWORK_FIRST:
          const { default: NetworkFirstStrategy } = await networkFirstStrategy();
          strategyHandler = new NetworkFirstStrategy();
          break;
          
        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
          const { default: StaleWhileRevalidateStrategy } = await staleWhileRevalidateStrategy();
          strategyHandler = new StaleWhileRevalidateStrategy();
          break;
          
        default:
          throw new Error(`Unknown cache strategy: ${strategy}`);
      }
      
      await this.cacheManager.cacheResources(resources, strategyHandler);
      this.emit('resources_cached', { resources, strategy });
      
    } catch (error) {
      console.error('Error caching resources:', error);
      throw error;
    }
  }

  /**
   * Precache critical resources
   */
  async precacheResources() {
    const criticalResources = [
      '/',
      '/manifest.json',
      '/offline.html',
      '/static/css/main.css',
      '/static/js/main.js',
      '/icons/icon-192x192.png'
    ];
    
    try {
      await this.cacheResources(criticalResources, CACHE_STRATEGIES.CACHE_FIRST);
      console.log('Critical resources precached');
    } catch (error) {
      console.error('Error precaching resources:', error);
    }
  }

  /**
   * Handle Service Worker messages
   */
  handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'CACHE_UPDATED':
        this.emit('cache_updated', data);
        break;
        
      case 'OFFLINE_FALLBACK':
        this.emit('offline_fallback', data);
        break;
        
      case 'BACKGROUND_SYNC':
        this.emit('background_sync', data);
        break;
        
      default:
        console.log('Unknown service worker message:', type, data);
    }
  }

  /**
   * Start update check
   */
  startUpdateCheck() {
    setInterval(() => {
      this.checkForUpdates();
    }, this.config.updateCheckInterval);
  }

  /**
   * Check for updates
   */
  async checkForUpdates() {
    if (!this.serviceWorkerRegistration) return;
    
    try {
      await this.serviceWorkerRegistration.update();
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  /**
   * Apply update
   */
  async applyUpdate() {
    if (!this.updateAvailable) {
      throw new Error('No update available');
    }
    
    try {
      if (this.serviceWorkerRegistration?.waiting) {
        this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload to activate new service worker
        window.location.reload();
      }
    } catch (error) {
      console.error('Error applying update:', error);
      throw error;
    }
  }

  /**
   * Add to offline queue
   */
  async addToOfflineQueue(request) {
    if (this.offlineQueue) {
      try {
        await this.offlineQueue.add(request);
        this.emit('request_queued', request);
      } catch (error) {
        console.error('Error adding to offline queue:', error);
      }
    }
  }

  /**
   * Share content using Web Share API
   */
  async share(data) {
    if (!this.config.enableWebShare || !navigator.share) {
      throw new Error('Web Share API not supported');
    }
    
    try {
      await navigator.share({
        title: data.title || 'EATECH',
        text: data.text || 'Entdecken Sie die besten Foodtrucks',
        url: data.url || window.location.href
      });
      
      this.emit('content_shared', data);
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing content:', error);
        throw error;
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (!this.cacheManager) {
      return null;
    }
    
    try {
      return await this.cacheManager.getStats();
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Clear cache
   */
  async clearCache() {
    if (!this.cacheManager) {
      throw new Error('Cache manager not initialized');
    }
    
    try {
      await this.cacheManager.clear();
      this.emit('cache_cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Get installation status
   */
  getInstallationStatus() {
    return {
      isInstalled: this.isInstalled,
      canInstall: !!this.deferredPrompt,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches
    };
  }

  /**
   * Get network status
   */
  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      effectiveType: navigator.connection?.effectiveType,
      downlink: navigator.connection?.downlink,
      rtt: navigator.connection?.rtt
    };
  }

  /**
   * Utility: Convert VAPID key
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  /**
   * Destroy PWA Service
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('online', this.handleOnlineStatus);
    window.removeEventListener('offline', this.handleOnlineStatus);
    window.removeEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', this.handleAppInstalled);
    
    // Clear intervals
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }
    
    // Remove all event listeners
    this.removeAllListeners();
    
    this.isInitialized = false;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create and initialize PWA Service
 */
export const createPWAService = async (config = {}) => {
  const pwaService = new PWAService(config);
  await pwaService.initialize();
  return pwaService;
};

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let pwaServiceInstance = null;

export const getPWAService = async (config = {}) => {
  if (!pwaServiceInstance) {
    pwaServiceInstance = await createPWAService(config);
  }
  return pwaServiceInstance;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default PWAService;
export { CACHE_STRATEGIES, RESOURCE_TYPES, PWA_CONFIG };