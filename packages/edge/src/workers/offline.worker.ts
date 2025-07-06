/**
 * EATECH - Offline Worker
 * Version: 5.7.0
 * Description: Edge Computing Offline Worker mit Lazy Loading und Background Sync
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /packages/edge/src/workers/offline.worker.ts
 * 
 * Features: Service Worker, caching strategies, background sync, mesh networking
 */

// Lazy loaded modules
const cacheStrategies = () => import('../strategies/cacheStrategies');
const syncManager = () => import('../sync/syncManager');
const meshNetwork = () => import('../mesh/meshNetwork');
const dataCompression = () => import('../utils/dataCompression');
const conflictResolution = () => import('../utils/conflictResolution');

// Worker types
interface CacheStrategy {
  name: string;
  match: (request: Request) => boolean;
  handle: (request: Request) => Promise<Response>;
}

interface SyncTask {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
  priority: number;
}

interface OfflineData {
  orders: Map<string, any>;
  inventory: Map<string, any>;
  customers: Map<string, any>;
  settings: Map<string, any>;
}

/**
 * Configuration
 */
const WORKER_CONFIG = {
  cacheName: 'eatech-offline-v1',
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  maxRetries: 3,
  syncInterval: 30000, // 30 seconds
  compressionThreshold: 1024, // 1KB
  meshDiscoveryInterval: 60000, // 1 minute
  conflictResolutionStrategy: 'last-write-wins'
};

/**
 * Cache strategies configuration
 */
const CACHE_ROUTES = [
  {
    pattern: /\/api\/menu/,
    strategy: 'cacheFirst',
    ttl: 3600000 // 1 hour
  },
  {
    pattern: /\/api\/orders/,
    strategy: 'networkFirst',
    ttl: 300000 // 5 minutes
  },
  {
    pattern: /\/api\/inventory/,
    strategy: 'staleWhileRevalidate',
    ttl: 1800000 // 30 minutes
  },
  {
    pattern: /\.(js|css|png|jpg|svg)$/,
    strategy: 'cacheFirst',
    ttl: 86400000 // 24 hours
  }
];

/**
 * Global state
 */
let isInitialized = false;
let offlineData: OfflineData = {
  orders: new Map(),
  inventory: new Map(),
  customers: new Map(),
  settings: new Map()
};
let syncQueue: SyncTask[] = [];
let cacheStrategiesMap: Map<string, CacheStrategy> = new Map();
let meshNetworkInstance: any = null;
let syncManagerInstance: any = null;

/**
 * Service Worker Event Handlers
 */

// Install event
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('Offline Worker installing...');
  
  event.waitUntil(
    initializeWorker().then(() => {
      console.log('Offline Worker installed successfully');
      // Skip waiting to activate immediately
      return (self as any).skipWaiting();
    })
  );
});

// Activate event
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('Offline Worker activating...');
  
  event.waitUntil(
    Promise.all([
      cleanOldCaches(),
      (self as any).clients.claim() // Take control of all clients
    ]).then(() => {
      console.log('Offline Worker activated successfully');
      startBackgroundTasks();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event: FetchEvent) => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(handleFetch(event.request));
});

// Background sync event
self.addEventListener('sync', (event: any) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'offline-sync') {
    event.waitUntil(processSyncQueue());
  }
});

// Message event
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  handleMessage(event);
});

/**
 * Worker initialization
 */
async function initializeWorker(): Promise<void> {
  try {
    // Initialize cache strategies
    await initializeCacheStrategies();
    
    // Initialize sync manager
    await initializeSyncManager();
    
    // Initialize mesh networking
    await initializeMeshNetwork();
    
    // Load offline data
    await loadOfflineData();
    
    // Precache critical resources
    await precacheResources();
    
    isInitialized = true;
    
  } catch (error) {
    console.error('Worker initialization failed:', error);
    throw error;
  }
}

/**
 * Initialize cache strategies
 */
async function initializeCacheStrategies(): Promise<void> {
  try {
    const { cacheFirst, networkFirst, staleWhileRevalidate } = await cacheStrategies();
    
    cacheStrategiesMap.set('cacheFirst', cacheFirst);
    cacheStrategiesMap.set('networkFirst', networkFirst);
    cacheStrategiesMap.set('staleWhileRevalidate', staleWhileRevalidate);
    
    console.log('Cache strategies initialized');
    
  } catch (error) {
    console.error('Error initializing cache strategies:', error);
    throw error;
  }
}

/**
 * Initialize sync manager
 */
async function initializeSyncManager(): Promise<void> {
  try {
    const { default: SyncManager } = await syncManager();
    syncManagerInstance = new SyncManager({
      maxRetries: WORKER_CONFIG.maxRetries,
      retryDelay: 5000,
      batchSize: 10
    });
    
    await syncManagerInstance.initialize();
    console.log('Sync manager initialized');
    
  } catch (error) {
    console.error('Error initializing sync manager:', error);
  }
}

/**
 * Initialize mesh networking
 */
async function initializeMeshNetwork(): Promise<void> {
  try {
    const { default: MeshNetwork } = await meshNetwork();
    meshNetworkInstance = new MeshNetwork({
      discoveryInterval: WORKER_CONFIG.meshDiscoveryInterval,
      maxPeers: 5
    });
    
    await meshNetworkInstance.initialize();
    console.log('Mesh network initialized');
    
  } catch (error) {
    console.error('Error initializing mesh network:', error);
  }
}

/**
 * Load offline data from IndexedDB
 */
async function loadOfflineData(): Promise<void> {
  try {
    const db = await openDatabase();
    
    // Load orders
    const orders = await getDataFromStore(db, 'orders');
    orders.forEach((order: any) => {
      offlineData.orders.set(order.id, order);
    });
    
    // Load inventory
    const inventory = await getDataFromStore(db, 'inventory');
    inventory.forEach((item: any) => {
      offlineData.inventory.set(item.id, item);
    });
    
    // Load customers
    const customers = await getDataFromStore(db, 'customers');
    customers.forEach((customer: any) => {
      offlineData.customers.set(customer.id, customer);
    });
    
    console.log('Offline data loaded:', {
      orders: offlineData.orders.size,
      inventory: offlineData.inventory.size,
      customers: offlineData.customers.size
    });
    
  } catch (error) {
    console.error('Error loading offline data:', error);
  }
}

/**
 * Precache critical resources
 */
async function precacheResources(): Promise<void> {
  try {
    const cache = await caches.open(WORKER_CONFIG.cacheName);
    
    const criticalResources = [
      '/',
      '/offline.html',
      '/manifest.json',
      '/api/menu',
      '/api/settings'
    ];
    
    await cache.addAll(criticalResources);
    console.log('Critical resources precached');
    
  } catch (error) {
    console.error('Error precaching resources:', error);
  }
}

/**
 * Handle fetch requests
 */
async function handleFetch(request: Request): Promise<Response> {
  try {
    // Find matching cache strategy
    const strategy = findCacheStrategy(request);
    
    if (strategy) {
      return await strategy.handle(request);
    }
    
    // Default: try network first, then cache
    try {
      const networkResponse = await fetch(request);
      
      // Cache successful responses
      if (networkResponse.ok) {
        await cacheResponse(request, networkResponse.clone());
      }
      
      return networkResponse;
      
    } catch (networkError) {
      // Network failed, try cache
      const cachedResponse = await getCachedResponse(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If it's an API request, queue for sync and return offline response
      if (request.url.includes('/api/')) {
        await queueForSync(request);
        return createOfflineResponse(request);
      }
      
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/offline.html') || new Response('Offline');
      }
      
      throw networkError;
    }
    
  } catch (error) {
    console.error('Error handling fetch:', error);
    return new Response('Error', { status: 500 });
  }
}

/**
 * Find cache strategy for request
 */
function findCacheStrategy(request: Request): CacheStrategy | null {
  for (const route of CACHE_ROUTES) {
    if (route.pattern.test(request.url)) {
      return cacheStrategiesMap.get(route.strategy) || null;
    }
  }
  return null;
}

/**
 * Cache response
 */
async function cacheResponse(request: Request, response: Response): Promise<void> {
  try {
    const cache = await caches.open(WORKER_CONFIG.cacheName);
    
    // Check cache size before adding
    const cacheSize = await getCacheSize();
    if (cacheSize > WORKER_CONFIG.maxCacheSize) {
      await cleanOldCacheEntries();
    }
    
    await cache.put(request, response);
    
  } catch (error) {
    console.error('Error caching response:', error);
  }
}

/**
 * Get cached response
 */
async function getCachedResponse(request: Request): Promise<Response | undefined> {
  try {
    const cache = await caches.open(WORKER_CONFIG.cacheName);
    return await cache.match(request);
  } catch (error) {
    console.error('Error getting cached response:', error);
    return undefined;
  }
}

/**
 * Queue request for background sync
 */
async function queueForSync(request: Request): Promise<void> {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : undefined
    };
    
    const syncTask: SyncTask = {
      id: generateTaskId(),
      type: 'api_request',
      data: requestData,
      timestamp: Date.now(),
      retries: 0,
      priority: getPriority(request)
    };
    
    syncQueue.push(syncTask);
    await persistSyncQueue();
    
    // Register background sync
    if ('serviceWorker' in self && 'sync' in (self as any).registration) {
      await (self as any).registration.sync.register('offline-sync');
    }
    
  } catch (error) {
    console.error('Error queuing for sync:', error);
  }
}

/**
 * Create offline response
 */
function createOfflineResponse(request: Request): Response {
  const url = new URL(request.url);
  
  // Try to serve from offline data
  if (url.pathname.includes('/api/orders')) {
    const orders = Array.from(offlineData.orders.values());
    return new Response(JSON.stringify(orders), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (url.pathname.includes('/api/inventory')) {
    const inventory = Array.from(offlineData.inventory.values());
    return new Response(JSON.stringify(inventory), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Default offline response
  return new Response(
    JSON.stringify({ 
      error: 'Offline', 
      message: 'This request will be synced when online' 
    }),
    { 
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Process sync queue
 */
async function processSyncQueue(): Promise<void> {
  if (!syncManagerInstance) return;
  
  try {
    console.log(`Processing ${syncQueue.length} sync tasks`);
    
    // Sort by priority and timestamp
    syncQueue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });
    
    const results = await syncManagerInstance.processBatch(syncQueue);
    
    // Remove successful tasks
    syncQueue = syncQueue.filter((task, index) => !results[index].success);
    
    // Increment retry count for failed tasks
    syncQueue.forEach(task => task.retries++);
    
    // Remove tasks that exceeded max retries
    syncQueue = syncQueue.filter(task => task.retries < WORKER_CONFIG.maxRetries);
    
    await persistSyncQueue();
    
    // Notify clients about sync completion
    await notifyClients('sync_completed', {
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      remaining: syncQueue.length
    });
    
  } catch (error) {
    console.error('Error processing sync queue:', error);
  }
}

/**
 * Handle messages from main thread
 */
async function handleMessage(event: ExtendableMessageEvent): Promise<void> {
  const { type, data } = event.data;
  
  switch (type) {
    case 'STORE_OFFLINE_DATA':
      await storeOfflineData(data);
      event.ports[0]?.postMessage({ success: true });
      break;
      
    case 'GET_OFFLINE_DATA':
      const offlineDataArray = {
        orders: Array.from(offlineData.orders.values()),
        inventory: Array.from(offlineData.inventory.values()),
        customers: Array.from(offlineData.customers.values())
      };
      event.ports[0]?.postMessage({ data: offlineDataArray });
      break;
      
    case 'FORCE_SYNC':
      await processSyncQueue();
      event.ports[0]?.postMessage({ success: true });
      break;
      
    case 'CLEAR_CACHE':
      await clearAllCaches();
      event.ports[0]?.postMessage({ success: true });
      break;
      
    case 'GET_CACHE_STATUS':
      const cacheStatus = await getCacheStatus();
      event.ports[0]?.postMessage({ status: cacheStatus });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
}

/**
 * Store offline data
 */
async function storeOfflineData(data: any): Promise<void> {
  try {
    const { default: DataCompression } = await dataCompression();
    const compressor = new DataCompression();
    
    // Compress large data
    const compressedData = await compressor.compress(data);
    
    // Store in IndexedDB
    const db = await openDatabase();
    
    if (data.orders) {
      await storeDataInStore(db, 'orders', data.orders);
      data.orders.forEach((order: any) => {
        offlineData.orders.set(order.id, order);
      });
    }
    
    if (data.inventory) {
      await storeDataInStore(db, 'inventory', data.inventory);
      data.inventory.forEach((item: any) => {
        offlineData.inventory.set(item.id, item);
      });
    }
    
    if (data.customers) {
      await storeDataInStore(db, 'customers', data.customers);
      data.customers.forEach((customer: any) => {
        offlineData.customers.set(customer.id, customer);
      });
    }
    
    console.log('Offline data stored successfully');
    
  } catch (error) {
    console.error('Error storing offline data:', error);
    throw error;
  }
}

/**
 * Start background tasks
 */
function startBackgroundTasks(): void {
  // Periodic sync
  setInterval(() => {
    if (syncQueue.length > 0) {
      processSyncQueue();
    }
  }, WORKER_CONFIG.syncInterval);
  
  // Mesh network discovery
  if (meshNetworkInstance) {
    setInterval(() => {
      meshNetworkInstance.discoverPeers();
    }, WORKER_CONFIG.meshDiscoveryInterval);
  }
  
  // Cache cleanup
  setInterval(() => {
    cleanOldCacheEntries();
  }, 3600000); // 1 hour
}

/**
 * Utility functions
 */

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getPriority(request: Request): number {
  if (request.url.includes('/orders')) return 3; // High priority
  if (request.url.includes('/inventory')) return 2; // Medium priority
  return 1; // Low priority
}

async function persistSyncQueue(): Promise<void> {
  try {
    const db = await openDatabase();
    await storeDataInStore(db, 'syncQueue', [{ id: 'queue', tasks: syncQueue }]);
  } catch (error) {
    console.error('Error persisting sync queue:', error);
  }
}

async function getCacheSize(): Promise<number> {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const arrayBuffer = await response.arrayBuffer();
          totalSize += arrayBuffer.byteLength;
        }
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Error calculating cache size:', error);
    return 0;
  }
}

async function cleanOldCaches(): Promise<void> {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = [WORKER_CONFIG.cacheName];
    
    await Promise.all(
      cacheNames.map(cacheName => {
        if (!currentCaches.includes(cacheName)) {
          return caches.delete(cacheName);
        }
      })
    );
    
    console.log('Old caches cleaned');
  } catch (error) {
    console.error('Error cleaning old caches:', error);
  }
}

async function cleanOldCacheEntries(): Promise<void> {
  try {
    const cache = await caches.open(WORKER_CONFIG.cacheName);
    const requests = await cache.keys();
    
    // Remove oldest entries if cache is too large
    if (requests.length > 100) {
      const oldRequests = requests.slice(0, 20);
      await Promise.all(
        oldRequests.map(request => cache.delete(request))
      );
    }
  } catch (error) {
    console.error('Error cleaning old cache entries:', error);
  }
}

async function clearAllCaches(): Promise<void> {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('All caches cleared');
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}

async function getCacheStatus(): Promise<any> {
  try {
    const cacheSize = await getCacheSize();
    const cacheNames = await caches.keys();
    
    return {
      size: cacheSize,
      count: cacheNames.length,
      syncQueueLength: syncQueue.length,
      isOnline: navigator.onLine
    };
  } catch (error) {
    console.error('Error getting cache status:', error);
    return null;
  }
}

async function notifyClients(type: string, data: any): Promise<void> {
  try {
    const clients = await (self as any).clients.matchAll();
    
    clients.forEach((client: any) => {
      client.postMessage({ type, data });
    });
  } catch (error) {
    console.error('Error notifying clients:', error);
  }
}

/**
 * IndexedDB helpers
 */

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eatech-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as any).result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('inventory')) {
        db.createObjectStore('inventory', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
    };
  });
}

function getDataFromStore(db: IDBDatabase, storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function storeDataInStore(db: IDBDatabase, storeName: string, data: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Clear existing data
    store.clear();
    
    // Add new data
    data.forEach(item => store.add(item));
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export {};