/**
 * EATECH - Service Worker
 * Version: 1.0.0
 * Description: Service Worker für Offline-Funktionalität und Caching
 * Features: Cache-First Strategy, Background Sync, Push Notifications
 * 
 * Kapitel: Phase 4 - Advanced Features - Offline Support
 */

// ============================================================================
// CONSTANTS
// ============================================================================
const CACHE_NAME = 'eatech-v1.0.0';
const DYNAMIC_CACHE = 'eatech-dynamic-v1.0.0';
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/app.css',
  '/js/app.js',
  '/images/logo-192.png',
  '/images/logo-512.png',
  '/manifest.json'
];

// API routes that should work offline
const OFFLINE_API_ROUTES = [
  '/api/menu',
  '/api/categories',
  '/api/products',
  '/api/settings'
];

// ============================================================================
// INSTALL EVENT
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache assets:', error);
      })
  );
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// ============================================================================
// FETCH EVENT
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// ============================================================================
// REQUEST HANDLERS
// ============================================================================
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API route should work offline
  const isOfflineRoute = OFFLINE_API_ROUTES.some(route => 
    url.pathname.startsWith(route)
  );
  
  if (isOfflineRoute) {
    // Try network first, fall back to cache
    try {
      const response = await fetch(request);
      
      if (response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, response.clone());
      }
      
      return response;
    } catch (error) {
      console.log('[SW] Network failed, trying cache:', url.pathname);
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Return offline data
      return new Response(
        JSON.stringify({ 
          offline: true, 
          message: 'Offline-Daten werden verwendet' 
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
  }
  
  // For other API routes, network only
  return fetch(request);
}

async function handleStaticRequest(request) {
  // Try cache first for static assets
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    event.waitUntil(updateCache(request));
    return cachedResponse;
  }
  
  // Try network
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Network failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    // Return 404 for other requests
    return new Response('Not found', { status: 404 });
  }
}

async function updateCache(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, response);
    }
  } catch (error) {
    console.log('[SW] Background update failed:', error);
  }
}

// ============================================================================
// SYNC EVENT
// ============================================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  } else if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncOfflineOrders() {
  try {
    // Get offline orders from IndexedDB
    const db = await openDB();
    const tx = db.transaction('ordersQueue', 'readonly');
    const orders = await tx.objectStore('ordersQueue').getAll();
    
    // Send each order to server
    for (const order of orders) {
      if (!order.synced) {
        try {
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
          });
          
          if (response.ok) {
            // Mark as synced
            const updateTx = db.transaction('ordersQueue', 'readwrite');
            await updateTx.objectStore('ordersQueue').put({
              ...order,
              synced: true,
              syncedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('[SW] Failed to sync order:', order.id, error);
        }
      }
    }
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { entity: 'orders' }
      });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

async function syncAnalytics() {
  try {
    const db = await openDB();
    const tx = db.transaction('analyticsQueue', 'readonly');
    const events = await tx.objectStore('analyticsQueue').getAll();
    
    if (events.length > 0) {
      await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
      
      // Clear synced events
      const clearTx = db.transaction('analyticsQueue', 'readwrite');
      await clearTx.objectStore('analyticsQueue').clear();
    }
  } catch (error) {
    console.error('[SW] Analytics sync failed:', error);
  }
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'Sie haben eine neue Bestellung!',
    icon: '/images/logo-192.png',
    badge: '/images/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'order-notification',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Ansehen', icon: '/images/eye.png' },
      { action: 'accept', title: 'Annehmen', icon: '/images/check.png' }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      Object.assign(options, {
        body: data.body || options.body,
        tag: data.tag || options.tag,
        data: data
      });
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('EATECH', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  let url = '/';
  
  if (event.action === 'view') {
    url = `/orders/${event.notification.data?.orderId || ''}`;
  } else if (event.action === 'accept') {
    url = `/orders/${event.notification.data?.orderId || ''}/accept`;
  }
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eatech-offline-db', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});