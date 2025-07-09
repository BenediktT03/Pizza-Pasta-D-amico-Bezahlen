// EATECH Service Worker v3.0.0
// Aggressive caching for offline-first PWA

const CACHE_VERSION = 'v3.0.0';
const CACHE_PREFIX = 'eatech-';

// Cache names
const CACHES = {
  STATIC: `${CACHE_PREFIX}static-${CACHE_VERSION}`,
  DYNAMIC: `${CACHE_PREFIX}dynamic-${CACHE_VERSION}`,
  IMAGES: `${CACHE_PREFIX}images-${CACHE_VERSION}`,
  API: `${CACHE_PREFIX}api-${CACHE_VERSION}`,
  OFFLINE: `${CACHE_PREFIX}offline-${CACHE_VERSION}`
};

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add your static assets here
];

// API routes to cache
const API_ROUTES = [
  '/api/menu',
  '/api/products',
  '/api/categories',
  '/api/tenant/info'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    (async () => {
      try {
        // Cache static assets
        const staticCache = await caches.open(CACHES.STATIC);
        await staticCache.addAll(STATIC_ASSETS);

        // Cache offline page
        const offlineCache = await caches.open(CACHES.OFFLINE);
        await offlineCache.add('/offline.html');

        // Skip waiting to activate immediately
        await self.skipWaiting();
        console.log('[Service Worker] Installation complete');
      } catch (error) {
        console.error('[Service Worker] Installation failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => {
        return name.startsWith(CACHE_PREFIX) && !Object.values(CACHES).includes(name);
      });

      await Promise.all(oldCaches.map(name => caches.delete(name)));

      // Take control of all clients
      await self.clients.claim();
      console.log('[Service Worker] Activation complete');
    })()
  );
});

// Fetch event - implement caching strategies
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

  // Handle different types of requests with appropriate strategies
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleStaticRequest(request));
  }
});

// Image handling - Stale While Revalidate with optimization
async function handleImageRequest(request) {
  const cache = await caches.open(CACHES.IMAGES);
  const cachedResponse = await cache.match(request);

  // Return cached version immediately if available
  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request, cache);
    return cachedResponse;
  }

  try {
    // Try to fetch with image optimization
    const response = await fetchWithOptimization(request);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[Service Worker] Image fetch failed:', error);
    // Return a placeholder image if available
    return cache.match('/images/placeholder.jpg') || new Response('', { status: 404 });
  }
}

// API handling - Network First with timeout
async function handleApiRequest(request) {
  const cache = await caches.open(CACHES.API);

  try {
    // Try network with timeout
    const networkResponse = await fetchWithTimeout(request, 3000);

    if (networkResponse.ok) {
      // Update cache with fresh data
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[Service Worker] Network request failed, falling back to cache');
  }

  // Fall back to cache
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Return offline API response
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'Die Daten sind im Offline-Modus nicht verfügbar'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Navigation handling - Network First with offline fallback
async function handleNavigationRequest(request) {
  try {
    // Try to fetch from network
    const response = await fetchWithTimeout(request, 5000);

    if (response.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(CACHES.DYNAMIC);
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.log('[Service Worker] Navigation request failed');
  }

  // Try cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Return offline page
  const offlineCache = await caches.open(CACHES.OFFLINE);
  return offlineCache.match('/offline.html') || new Response('Offline', { status: 503 });
}

// Static assets - Cache First
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHES.STATIC);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[Service Worker] Static asset fetch failed:', error);
    return new Response('', { status: 404 });
  }
}

// Helper: Fetch with timeout
function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

// Helper: Fetch with image optimization
async function fetchWithOptimization(request) {
  const url = new URL(request.url);

  // Add image optimization parameters if using CDN
  if (url.hostname.includes('cdn.eatech.ch') || url.hostname.includes('cloudflare')) {
    // Add responsive image parameters
    const width = url.searchParams.get('w') || 'auto';
    const quality = url.searchParams.get('q') || '85';
    const format = supportsWebP() ? 'webp' : 'auto';

    url.searchParams.set('w', width);
    url.searchParams.set('q', quality);
    url.searchParams.set('f', format);
    url.searchParams.set('fit', 'cover');

    return fetch(url.toString(), {
      ...request,
      mode: 'cors'
    });
  }

  return fetch(request);
}

// Helper: Fetch and cache in background
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response);
    }
  } catch (error) {
    // Silent fail - this is background update
  }
}

// Helper: Check WebP support
function supportsWebP() {
  // Simple check - in production, use more robust detection
  return true;
}

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered');

  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

// Sync offline orders
async function syncOfflineOrders() {
  try {
    // Get offline orders from IndexedDB
    const db = await openDB();
    const tx = db.transaction('offline-orders', 'readonly');
    const orders = await tx.objectStore('offline-orders').getAll();

    // Sync each order
    for (const order of orders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order)
        });

        if (response.ok) {
          // Remove synced order from IndexedDB
          const deleteTx = db.transaction('offline-orders', 'readwrite');
          await deleteTx.objectStore('offline-orders').delete(order.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync order:', error);
      }
    }

    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        message: 'Offline-Bestellungen wurden synchronisiert'
      });
    });
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'EATECH Benachrichtigung';
  const options = {
    body: data.body || 'Sie haben eine neue Benachrichtigung',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'eatech-notification',
    requireInteraction: data.requireInteraction || false,
    data: data.payload || {},
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  // Handle action clicks
  if (event.action) {
    switch (event.action) {
      case 'view-order':
        event.waitUntil(
          clients.openWindow(`/orders/${event.notification.data.orderId}`)
        );
        break;
      case 'dismiss':
        // Just close the notification
        break;
      default:
        // Open the app
        event.waitUntil(clients.openWindow('/'));
    }
  } else {
    // Open the app when notification body is clicked
    event.waitUntil(clients.openWindow('/'));
  }
});

// Message handling for client communication
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(event.data.urls));
      break;
  }
});

// Helper: Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[Service Worker] All caches cleared');
}

// Helper: Cache specific URLs
async function cacheUrls(urls) {
  const cache = await caches.open(CACHES.DYNAMIC);
  await cache.addAll(urls);
  console.log('[Service Worker] URLs cached:', urls);
}

// Helper: Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eatech-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-orders')) {
        db.createObjectStore('offline-orders', { keyPath: 'id' });
      }
    };
  });
}

console.log('[Service Worker] Loaded successfully');
