/**
 * EATECH - Offline Service
 * Version: 1.0.0
 * Description: Offline-First Service mit IndexedDB und Service Worker Integration
 * Features: Auto-Sync, Conflict Resolution, Queue Management
 * 
 * Kapitel: Phase 4 - Advanced Features - Offline Support
 */

import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CONSTANTS
// ============================================================================
const DB_NAME = 'eatech-offline-db';
const DB_VERSION = 1;
const SYNC_INTERVAL = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds

// ============================================================================
// INDEXEDDB SCHEMA
// ============================================================================
class EatechDatabase extends Dexie {
  constructor() {
    super(DB_NAME);
    
    this.version(DB_VERSION).stores({
      // Products with full menu data
      products: 'id, tenantId, categoryId, name, available, lastModified',
      
      // Categories for menu organization
      categories: 'id, tenantId, name, position, active',
      
      // Orders queue for offline orders
      ordersQueue: 'id, tenantId, status, createdAt, synced',
      
      // Cart items persist across sessions
      cartItems: 'id, tenantId, productId, sessionId, createdAt',
      
      // Sync queue for all offline actions
      syncQueue: 'id, tenantId, action, entity, timestamp, attempts, status',
      
      // Customer data cache
      customers: 'id, tenantId, email, phone, lastOrder',
      
      // Settings and config
      settings: 'key, tenantId, value, lastModified',
      
      // Analytics events to sync later
      analyticsQueue: 'id, event, data, timestamp, synced',
      
      // Media cache for images
      mediaCache: 'url, tenantId, data, contentType, expires'
    });
    
    // Define models
    this.products = this.table('products');
    this.categories = this.table('categories');
    this.ordersQueue = this.table('ordersQueue');
    this.cartItems = this.table('cartItems');
    this.syncQueue = this.table('syncQueue');
    this.customers = this.table('customers');
    this.settings = this.table('settings');
    this.analyticsQueue = this.table('analyticsQueue');
    this.mediaCache = this.table('mediaCache');
  }
}

// ============================================================================
// OFFLINE SERVICE CLASS
// ============================================================================
export class OfflineService {
  constructor() {
    this.db = new EatechDatabase();
    this.isOnline = navigator.onLine;
    this.syncTimer = null;
    this.currentTenantId = null;
    this.syncInProgress = false;
    this.listeners = new Map();
    
    this.init();
  }
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  async init() {
    try {
      // Open database
      await this.db.open();
      
      // Setup online/offline listeners
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Start sync if online
      if (this.isOnline) {
        this.startSync();
      }
      
      // Register service worker
      if ('serviceWorker' in navigator) {
        await this.registerServiceWorker();
      }
      
      console.log('OfflineService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OfflineService:', error);
      throw error;
    }
  }
  
  // ==========================================================================
  // SERVICE WORKER
  // ==========================================================================
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.notifyUpdate();
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
  
  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'BACKGROUND_SYNC':
        this.performSync();
        break;
      case 'CACHE_UPDATED':
        this.emit('cacheUpdated', data.payload);
        break;
      case 'SYNC_COMPLETE':
        this.emit('syncComplete', data.data);
        break;
      default:
        console.log('Unknown service worker message:', data);
    }
  }
  
  // ==========================================================================
  // ONLINE/OFFLINE HANDLING
  // ==========================================================================
  handleOnline() {
    this.isOnline = true;
    this.emit('statusChanged', { online: true });
    this.startSync();
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('EATECH', {
        body: 'Verbindung wiederhergestellt. Daten werden synchronisiert...',
        icon: '/images/logo-192.png'
      });
    }
  }
  
  handleOffline() {
    this.isOnline = false;
    this.emit('statusChanged', { online: false });
    this.stopSync();
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('EATECH', {
        body: 'Sie sind offline. Änderungen werden lokal gespeichert.',
        icon: '/images/logo-192.png'
      });
    }
  }
  
  // ==========================================================================
  // DATA MANAGEMENT
  // ==========================================================================
  async saveProduct(product) {
    try {
      const timestamp = new Date().toISOString();
      const productData = {
        ...product,
        lastModified: timestamp,
        tenantId: this.currentTenantId
      };
      
      await this.db.products.put(productData);
      
      // Queue for sync if offline
      if (!this.isOnline) {
        await this.queueAction('UPDATE_PRODUCT', 'products', product.id, productData);
      }
      
      return productData;
    } catch (error) {
      console.error('Failed to save product:', error);
      throw error;
    }
  }
  
  async getProducts(categoryId = null) {
    try {
      let query = this.db.products.where('tenantId').equals(this.currentTenantId);
      
      if (categoryId) {
        query = query.and(product => product.categoryId === categoryId);
      }
      
      return await query.toArray();
    } catch (error) {
      console.error('Failed to get products:', error);
      throw error;
    }
  }
  
  async saveOrder(order) {
    try {
      const orderData = {
        id: order.id || uuidv4(),
        ...order,
        tenantId: this.currentTenantId,
        createdAt: new Date().toISOString(),
        synced: false
      };
      
      await this.db.ordersQueue.put(orderData);
      
      // Try to sync immediately if online
      if (this.isOnline) {
        this.syncOrder(orderData.id);
      } else {
        // Request background sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('sync-orders');
        }
      }
      
      return orderData;
    } catch (error) {
      console.error('Failed to save order:', error);
      throw error;
    }
  }
  
  async getOrders(status = null) {
    try {
      let query = this.db.ordersQueue.where('tenantId').equals(this.currentTenantId);
      
      if (status) {
        query = query.and(order => order.status === status);
      }
      
      return await query.toArray();
    } catch (error) {
      console.error('Failed to get orders:', error);
      throw error;
    }
  }
  
  // ==========================================================================
  // SYNC QUEUE MANAGEMENT
  // ==========================================================================
  async queueAction(action, entity, entityId, data) {
    const queueItem = {
      id: uuidv4(),
      tenantId: this.currentTenantId,
      action,
      entity,
      entityId,
      data,
      timestamp: new Date().toISOString(),
      attempts: 0,
      status: 'pending'
    };
    
    await this.db.syncQueue.put(queueItem);
    return queueItem;
  }
  
  async processSyncQueue() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }
    
    this.syncInProgress = true;
    
    try {
      const pendingItems = await this.db.syncQueue
        .where('status').equals('pending')
        .and(item => item.attempts < MAX_RETRY_ATTEMPTS)
        .toArray();
      
      for (const item of pendingItems) {
        try {
          await this.processSyncItem(item);
          
          // Mark as completed
          item.status = 'completed';
          item.completedAt = new Date().toISOString();
          await this.db.syncQueue.put(item);
        } catch (error) {
          console.error('Failed to sync item:', item.id, error);
          
          // Increment attempts
          item.attempts++;
          item.lastError = error.message;
          
          if (item.attempts >= MAX_RETRY_ATTEMPTS) {
            item.status = 'failed';
          }
          
          await this.db.syncQueue.put(item);
        }
      }
      
      // Clean up old completed items
      await this.cleanupSyncQueue();
    } finally {
      this.syncInProgress = false;
    }
  }
  
  async processSyncItem(item) {
    const endpoint = `/api/${item.entity}`;
    const method = item.action.startsWith('DELETE') ? 'DELETE' : 
                   item.action.startsWith('CREATE') ? 'POST' : 'PUT';
    
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': item.tenantId
      },
      body: JSON.stringify(item.data)
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async cleanupSyncQueue() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days
    
    await this.db.syncQueue
      .where('status').equals('completed')
      .and(item => new Date(item.completedAt) < cutoffDate)
      .delete();
  }
  
  // ==========================================================================
  // SYNC MANAGEMENT
  // ==========================================================================
  startSync() {
    if (this.syncTimer) {
      return;
    }
    
    // Initial sync
    this.performSync();
    
    // Schedule periodic sync
    this.syncTimer = setInterval(() => {
      this.performSync();
    }, SYNC_INTERVAL);
  }
  
  stopSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
  
  async performSync() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }
    
    console.log('Starting sync...');
    
    try {
      // Sync queue items
      await this.processSyncQueue();
      
      // Sync orders
      await this.syncOrders();
      
      // Sync analytics
      await this.syncAnalytics();
      
      // Fetch latest data
      await this.fetchLatestData();
      
      this.emit('syncComplete', { timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Sync failed:', error);
      this.emit('syncError', { error: error.message });
    }
  }
  
  async syncOrders() {
    const unsyncedOrders = await this.db.ordersQueue
      .where('synced').equals(false)
      .toArray();
    
    for (const order of unsyncedOrders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': order.tenantId
          },
          body: JSON.stringify(order)
        });
        
        if (response.ok) {
          order.synced = true;
          order.syncedAt = new Date().toISOString();
          await this.db.ordersQueue.put(order);
        }
      } catch (error) {
        console.error('Failed to sync order:', order.id, error);
      }
    }
  }
  
  async syncAnalytics() {
    const events = await this.db.analyticsQueue
      .where('synced').equals(false)
      .toArray();
    
    if (events.length === 0) {
      return;
    }
    
    try {
      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.currentTenantId
        },
        body: JSON.stringify({ events })
      });
      
      if (response.ok) {
        // Mark all as synced
        await Promise.all(
          events.map(event => {
            event.synced = true;
            return this.db.analyticsQueue.put(event);
          })
        );
      }
    } catch (error) {
      console.error('Failed to sync analytics:', error);
    }
  }
  
  async fetchLatestData() {
    try {
      // Fetch latest menu data
      const menuResponse = await fetch('/api/menu', {
        headers: { 'X-Tenant-ID': this.currentTenantId }
      });
      
      if (menuResponse.ok) {
        const menuData = await menuResponse.json();
        
        // Update local database
        await this.db.transaction('rw', this.db.products, this.db.categories, async () => {
          // Clear old data
          await this.db.products.where('tenantId').equals(this.currentTenantId).delete();
          await this.db.categories.where('tenantId').equals(this.currentTenantId).delete();
          
          // Insert new data
          if (menuData.categories) {
            await this.db.categories.bulkPut(menuData.categories.map(cat => ({
              ...cat,
              tenantId: this.currentTenantId
            })));
          }
          
          if (menuData.products) {
            await this.db.products.bulkPut(menuData.products.map(prod => ({
              ...prod,
              tenantId: this.currentTenantId
            })));
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch latest data:', error);
    }
  }
  
  // ==========================================================================
  // CART MANAGEMENT
  // ==========================================================================
  async addToCart(productId, quantity = 1, modifiers = []) {
    const sessionId = this.getSessionId();
    const cartItem = {
      id: uuidv4(),
      tenantId: this.currentTenantId,
      productId,
      sessionId,
      quantity,
      modifiers,
      createdAt: new Date().toISOString()
    };
    
    await this.db.cartItems.put(cartItem);
    this.emit('cartUpdated', await this.getCart());
    
    return cartItem;
  }
  
  async updateCartItem(itemId, updates) {
    const item = await this.db.cartItems.get(itemId);
    
    if (!item) {
      throw new Error('Cart item not found');
    }
    
    const updatedItem = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.db.cartItems.put(updatedItem);
    this.emit('cartUpdated', await this.getCart());
    
    return updatedItem;
  }
  
  async removeFromCart(itemId) {
    await this.db.cartItems.delete(itemId);
    this.emit('cartUpdated', await this.getCart());
  }
  
  async getCart() {
    const sessionId = this.getSessionId();
    const items = await this.db.cartItems
      .where('sessionId').equals(sessionId)
      .toArray();
    
    // Enrich with product data
    const enrichedItems = await Promise.all(
      items.map(async item => {
        const product = await this.db.products.get(item.productId);
        return {
          ...item,
          product
        };
      })
    );
    
    return enrichedItems;
  }
  
  async clearCart() {
    const sessionId = this.getSessionId();
    await this.db.cartItems
      .where('sessionId').equals(sessionId)
      .delete();
    
    this.emit('cartUpdated', []);
  }
  
  // ==========================================================================
  // ANALYTICS
  // ==========================================================================
  async trackEvent(event, data = {}) {
    const analyticsEvent = {
      id: uuidv4(),
      event,
      data: {
        ...data,
        tenantId: this.currentTenantId,
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      synced: false
    };
    
    await this.db.analyticsQueue.put(analyticsEvent);
    
    // Try to sync if online
    if (this.isOnline) {
      this.syncAnalytics();
    }
  }
  
  // ==========================================================================
  // MEDIA CACHE
  // ==========================================================================
  async cacheImage(url, tenantId = null) {
    try {
      // Check if already cached
      const cached = await this.db.mediaCache.get(url);
      
      if (cached && cached.expires > new Date().getTime()) {
        return cached.data;
      }
      
      // Fetch and cache
      const response = await fetch(url);
      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);
      
      const cacheEntry = {
        url,
        tenantId: tenantId || this.currentTenantId,
        data: base64,
        contentType: response.headers.get('content-type'),
        expires: new Date().getTime() + (7 * 24 * 60 * 60 * 1000) // 7 days
      };
      
      await this.db.mediaCache.put(cacheEntry);
      
      return base64;
    } catch (error) {
      console.error('Failed to cache image:', url, error);
      return null;
    }
  }
  
  async getCachedImage(url) {
    const cached = await this.db.mediaCache.get(url);
    
    if (cached && cached.expires > new Date().getTime()) {
      return cached.data;
    }
    
    return null;
  }
  
  async clearExpiredCache() {
    const now = new Date().getTime();
    await this.db.mediaCache
      .where('expires').below(now)
      .delete();
  }
  
  // ==========================================================================
  // UTILITIES
  // ==========================================================================
  setTenant(tenantId) {
    this.currentTenantId = tenantId;
    localStorage.setItem('eatech-tenant-id', tenantId);
  }
  
  getTenant() {
    if (!this.currentTenantId) {
      this.currentTenantId = localStorage.getItem('eatech-tenant-id');
    }
    return this.currentTenantId;
  }
  
  getSessionId() {
    let sessionId = sessionStorage.getItem('eatech-session-id');
    
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('eatech-session-id', sessionId);
    }
    
    return sessionId;
  }
  
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  notifyUpdate() {
    this.emit('updateAvailable');
  }
  
  // ==========================================================================
  // EVENT EMITTER
  // ==========================================================================
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
  
  emit(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  async destroy() {
    this.stopSync();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
    await this.db.close();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================
export const offlineService = new OfflineService();