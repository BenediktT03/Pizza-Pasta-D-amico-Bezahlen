/**
 * EATECH V3.0 - PWA Utilities
 * Swiss Performance Standards & Offline-First Implementation
 * Path: /apps/web/src/utils/pwa.utils.ts
 */

import { toast } from 'react-hot-toast';

// ==================== TYPES & INTERFACES ====================

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface ServiceWorkerMessage {
  type: string;
  payload?: any;
  timestamp: number;
}

export interface OfflineData {
  orders: any[];
  analytics: any[];
  voiceCommands: any[];
  lastSync: number;
}

export interface ConnectionStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface PWACapabilities {
  serviceWorker: boolean;
  pushManager: boolean;
  backgroundSync: boolean;
  webShare: boolean;
  geolocation: boolean;
  speechRecognition: boolean;
  payments: boolean;
  installation: boolean;
}

export interface VoiceCommand {
  id: string;
  text: string;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  timestamp: number;
  offline: boolean;
}

export interface AnalyticsEvent {
  id: string;
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
  offline: boolean;
}

export interface PWAMetrics {
  installationRate: number;
  offlineUsage: number;
  backgroundSyncSuccess: number;
  voiceCommandsOffline: number;
  notificationEngagement: number;
}

// ==================== PWA INSTALLATION MANAGER ====================

export class PWAInstallManager {
  private deferredPrompt: PWAInstallPrompt | null = null;
  private installCallbacks: Array<(installed: boolean) => void> = [];

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.notifyInstallAvailable();
    });

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.notifyInstalled();
      this.trackEvent('pwa_installed');
    });

    // Check if already installed
    if (this.isInstalled()) {
      this.trackEvent('pwa_already_installed');
    }
  }

  public isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  public isInstalled(): boolean {
    // Check various PWA installation indicators
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  public async install(): Promise<boolean> {
    if (!this.deferredPrompt) {
      throw new Error('Installation prompt not available');
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      this.trackEvent('pwa_install_prompt_result', { outcome });

      if (outcome === 'accepted') {
        toast.success('App wird installiert...', {
          icon: '📱',
          duration: 3000,
        });
        return true;
      } else {
        toast('Installation abgebrochen', {
          icon: 'ℹ️',
          duration: 2000,
        });
        return false;
      }
    } catch (error) {
      console.error('Installation failed:', error);
      this.trackEvent('pwa_install_error', { error: error.message });
      toast.error('Installation fehlgeschlagen');
      return false;
    }
  }

  public onInstallAvailable(callback: () => void): void {
    this.installCallbacks.push(callback);
  }

  private notifyInstallAvailable(): void {
    this.installCallbacks.forEach(callback => callback(false));
  }

  private notifyInstalled(): void {
    this.installCallbacks.forEach(callback => callback(true));
  }

  private trackEvent(event: string, properties: Record<string, any> = {}): void {
    // Track to analytics
    if (window.plausible) {
      window.plausible(event, { props: properties });
    }
  }
}

// ==================== SERVICE WORKER MANAGER ====================

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private messageCallbacks: Map<string, Array<(data: any) => void>> = new Map();

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      console.log('[PWA] Service Worker registered:', this.registration);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        this.handleServiceWorkerUpdate();
      });

      // Listen for messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });

      // Check for updates
      this.checkForUpdates();

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }

  private handleServiceWorkerUpdate(): void {
    const newWorker = this.registration?.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New version available
        toast((t) => (
          <div className="flex items-center gap-3">
            <span>Neue Version verfügbar!</span>
            <button
              className="bg-orange-500 text-white px-3 py-1 rounded text-sm"
              onClick={() => {
                this.activateUpdate();
                toast.dismiss(t.id);
              }}
            >
              Aktualisieren
            </button>
          </div>
        ), {
          duration: 10000,
          icon: '🔄',
        });
      }
    });
  }

  public async activateUpdate(): Promise<void> {
    if (!this.registration) return;

    const newWorker = this.registration.waiting;
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  public async checkForUpdates(): Promise<void> {
    if (this.registration) {
      try {
        await this.registration.update();
      } catch (error) {
        console.error('[PWA] Update check failed:', error);
      }
    }
  }

  public postMessage(message: ServiceWorkerMessage): void {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        ...message,
        timestamp: Date.now(),
      });
    }
  }

  public onMessage(type: string, callback: (data: any) => void): void {
    if (!this.messageCallbacks.has(type)) {
      this.messageCallbacks.set(type, []);
    }
    this.messageCallbacks.get(type)?.push(callback);
  }

  private handleMessage(data: any): void {
    const callbacks = this.messageCallbacks.get(data.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  public isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }
}

// ==================== OFFLINE STORAGE MANAGER ====================

export class OfflineStorageManager {
  private dbName = 'eatech-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return;
    }

    try {
      this.db = await this.openDatabase();
    } catch (error) {
      console.error('[PWA] Failed to initialize offline storage:', error);
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Orders store
        if (!db.objectStoreNames.contains('pendingOrders')) {
          const ordersStore = db.createObjectStore('pendingOrders', { keyPath: 'id' });
          ordersStore.createIndex('timestamp', 'timestamp');
          ordersStore.createIndex('tenantId', 'tenantId');
        }

        // Analytics store
        if (!db.objectStoreNames.contains('analyticsEvents')) {
          const analyticsStore = db.createObjectStore('analyticsEvents', {
            keyPath: 'id',
            autoIncrement: true
          });
          analyticsStore.createIndex('timestamp', 'timestamp');
          analyticsStore.createIndex('event', 'event');
        }

        // Voice commands store
        if (!db.objectStoreNames.contains('voiceCommands')) {
          const voiceStore = db.createObjectStore('voiceCommands', { keyPath: 'id' });
          voiceStore.createIndex('timestamp', 'timestamp');
          voiceStore.createIndex('intent', 'intent');
        }

        // Cached data store
        if (!db.objectStoreNames.contains('offlineData')) {
          db.createObjectStore('offlineData', { keyPath: 'key' });
        }
      };
    });
  }

  public async storeOrder(order: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['pendingOrders'], 'readwrite');
    const store = transaction.objectStore('pendingOrders');

    await store.add({
      id: this.generateId(),
      data: order,
      timestamp: Date.now(),
      tenantId: order.tenantId,
    });
  }

  public async getPendingOrders(): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['pendingOrders'], 'readonly');
    const store = transaction.objectStore('pendingOrders');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async removeOrder(orderId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['pendingOrders'], 'readwrite');
    const store = transaction.objectStore('pendingOrders');
    await store.delete(orderId);
  }

  public async storeVoiceCommand(command: VoiceCommand): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['voiceCommands'], 'readwrite');
    const store = transaction.objectStore('voiceCommands');
    await store.add(command);
  }

  public async storeAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['analyticsEvents'], 'readwrite');
    const store = transaction.objectStore('analyticsEvents');
    await store.add(event);
  }

  public async cacheData(key: string, data: any): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');

    await store.put({
      key,
      data,
      timestamp: Date.now(),
    });
  }

  public async getCachedData(key: string): Promise<any> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['offlineData'], 'readonly');
    const store = transaction.objectStore('offlineData');

    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => resolve(null);
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// ==================== CONNECTION MONITOR ====================

export class ConnectionMonitor {
  private callbacks: Array<(status: ConnectionStatus) => void> = [];
  private currentStatus: ConnectionStatus = { online: navigator.onLine };

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    // Basic online/offline events
    window.addEventListener('online', () => this.updateStatus());
    window.addEventListener('offline', () => this.updateStatus());

    // Network Information API (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => this.updateStatus());
    }

    // Initial status
    this.updateStatus();
  }

  private updateStatus(): void {
    const connection = (navigator as any).connection;

    this.currentStatus = {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };

    this.notifyCallbacks();
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.currentStatus));
  }

  public onChange(callback: (status: ConnectionStatus) => void): () => void {
    this.callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  public getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  public isOnline(): boolean {
    return this.currentStatus.online;
  }

  public isSlowConnection(): boolean {
    return this.currentStatus.effectiveType === 'slow-2g' ||
           this.currentStatus.effectiveType === '2g';
  }
}

// ==================== PUSH NOTIFICATIONS MANAGER ====================

export class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;

  constructor(registration: ServiceWorkerRegistration | null = null) {
    this.registration = registration;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      toast.success('Benachrichtigungen aktiviert! 🔔');
      this.trackEvent('notifications_enabled');
    } else if (permission === 'denied') {
      toast.error('Benachrichtigungen deaktiviert');
      this.trackEvent('notifications_denied');
    }

    return permission;
  }

  public async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration || !('pushManager' in this.registration)) {
      throw new Error('Push notifications not supported');
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        ),
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      this.trackEvent('push_subscription_created');
      return subscription;

    } catch (error) {
      console.error('Push subscription failed:', error);
      this.trackEvent('push_subscription_failed', { error: error.message });
      throw error;
    }
  }

  public async unsubscribe(): Promise<boolean> {
    if (!this.registration) return false;

    const subscription = await this.registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await this.removeSubscriptionFromServer(subscription);
      this.trackEvent('push_subscription_removed');
      return true;
    }
    return false;
  }

  public async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) return null;
    return await this.registration.pushManager.getSubscription();
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }),
    });
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
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

  private trackEvent(event: string, properties: Record<string, any> = {}): void {
    if (window.plausible) {
      window.plausible(event, { props: properties });
    }
  }
}

// ==================== PWA CAPABILITIES DETECTOR ====================

export class PWACapabilitiesDetector {
  public static detect(): PWACapabilities {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      webShare: 'share' in navigator,
      geolocation: 'geolocation' in navigator,
      speechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
      payments: 'PaymentRequest' in window,
      installation: 'BeforeInstallPromptEvent' in window,
    };
  }

  public static getUnsupportedFeatures(): string[] {
    const capabilities = this.detect();
    const unsupported: string[] = [];

    Object.entries(capabilities).forEach(([feature, supported]) => {
      if (!supported) {
        unsupported.push(feature);
      }
    });

    return unsupported;
  }

  public static isFullySupported(): boolean {
    const capabilities = this.detect();
    return Object.values(capabilities).every(supported => supported);
  }
}

// ==================== MAIN PWA MANAGER ====================

export class EATECHPWAManager {
  public install: PWAInstallManager;
  public serviceWorker: ServiceWorkerManager;
  public storage: OfflineStorageManager;
  public connection: ConnectionMonitor;
  public notifications: PushNotificationManager;

  private initialized = false;

  constructor() {
    this.install = new PWAInstallManager();
    this.serviceWorker = new ServiceWorkerManager();
    this.storage = new OfflineStorageManager();
    this.connection = new ConnectionMonitor();
    this.notifications = new PushNotificationManager();
  }

  public async init(): Promise<void> {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    try {
      // Initialize all managers
      await Promise.all([
        this.storage.init(),
        // Other async initializations
      ]);

      // Setup event listeners
      this.setupEventListeners();

      // Track PWA capabilities
      this.trackCapabilities();

      this.initialized = true;
      console.log('[PWA] EATECH PWA Manager initialized successfully');

    } catch (error) {
      console.error('[PWA] Initialization failed:', error);
    }
  }

  private setupEventListeners(): void {
    // Connection changes
    this.connection.onChange((status) => {
      if (status.online) {
        toast.success('Verbindung wiederhergestellt! 🌐', {
          duration: 2000,
        });
        this.syncOfflineData();
      } else {
        toast('Offline-Modus aktiviert 📴', {
          duration: 3000,
          icon: 'ℹ️',
        });
      }
    });

    // Service Worker messages
    this.serviceWorker.onMessage('CACHE_UPDATED', () => {
      toast('Inhalte aktualisiert 🔄', { duration: 2000 });
    });

    this.serviceWorker.onMessage('BACKGROUND_SYNC_SUCCESS', (data) => {
      toast.success(`${data.count} Aktionen synchronisiert ✅`);
    });
  }

  private async syncOfflineData(): Promise<void> {
    try {
      // Trigger background sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          if ('sync' in registration) {
            return Promise.all([
              registration.sync.register('sync-orders'),
              registration.sync.register('sync-analytics'),
              registration.sync.register('sync-voice-commands'),
            ]);
          }
        });
      }
    } catch (error) {
      console.error('[PWA] Sync failed:', error);
    }
  }

  private trackCapabilities(): void {
    const capabilities = PWACapabilitiesDetector.detect();
    const unsupported = PWACapabilitiesDetector.getUnsupportedFeatures();

    // Track to analytics
    if (window.plausible) {
      window.plausible('PWA Capabilities', {
        props: {
          ...capabilities,
          unsupported_count: unsupported.length,
          fully_supported: unsupported.length === 0,
        },
      });
    }
  }

  public getMetrics(): PWAMetrics {
    // This would typically come from analytics
    return {
      installationRate: 0,
      offlineUsage: 0,
      backgroundSyncSuccess: 0,
      voiceCommandsOffline: 0,
      notificationEngagement: 0,
    };
  }
}

// ==================== REACT HOOKS ====================

import { useState, useEffect, useCallback } from 'react';

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const manager = new PWAInstallManager();

    setIsInstalled(manager.isInstalled());
    setIsInstallable(manager.isInstallable());

    const unsubscribe = manager.onInstallAvailable(() => {
      setIsInstallable(true);
    });

    return unsubscribe;
  }, []);

  const install = useCallback(async () => {
    const manager = new PWAInstallManager();
    const success = await manager.install();
    if (success) {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    return success;
  }, []);

  return { isInstallable, isInstalled, install };
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({ online: true });

  useEffect(() => {
    const monitor = new ConnectionMonitor();
    setStatus(monitor.getStatus());

    const unsubscribe = monitor.onChange(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

export function useOfflineStorage() {
  const [storage] = useState(() => new OfflineStorageManager());

  const storeOrder = useCallback(async (order: any) => {
    await storage.storeOrder(order);
  }, [storage]);

  const storeVoiceCommand = useCallback(async (command: VoiceCommand) => {
    await storage.storeVoiceCommand(command);
  }, [storage]);

  const cacheData = useCallback(async (key: string, data: any) => {
    await storage.cacheData(key, data);
  }, [storage]);

  const getCachedData = useCallback(async (key: string) => {
    return await storage.getCachedData(key);
  }, [storage]);

  return {
    storeOrder,
    storeVoiceCommand,
    cacheData,
    getCachedData,
  };
}

// ==================== SINGLETON INSTANCE ====================

let pwaManagerInstance: EATECHPWAManager | null = null;

export function getPWAManager(): EATECHPWAManager {
  if (!pwaManagerInstance) {
    pwaManagerInstance = new EATECHPWAManager();
  }
  return pwaManagerInstance;
}

// ==================== UTILS EXPORT ====================

export const PWAUtils = {
  // Quick access functions
  isOnline: () => navigator.onLine,
  isInstalled: () => new PWAInstallManager().isInstalled(),
  getCapabilities: () => PWACapabilitiesDetector.detect(),

  // Swiss-specific utilities
  formatSwissPhone: (phone: string) => {
    return phone.replace(/^(\+41|0041)/, '0').replace(/\s/g, '');
  },

  validateSwissPostalCode: (code: string) => {
    return /^[1-9]\d{3}$/.test(code);
  },

  // Performance utilities
  measureTTFB: () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigation.responseStart - navigation.requestStart;
  },

  measureFCP: () => {
    const paint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint');
    return paint?.startTime || 0;
  },
};

// Global type extensions
declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, any> }) => void;
  }
}

export default getPWAManager;
