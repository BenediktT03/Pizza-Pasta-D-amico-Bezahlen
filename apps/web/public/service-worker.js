/**
 * EATECH V3.0 - Service Worker
 * Offline-First PWA Implementation für Schweizer Foodtrucks
 * Path: /apps/web/public/service-worker.js
 */

import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { BroadcastUpdatePlugin } from 'workbox-broadcast-update';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

// === CORE PWA CONFIGURATION ===
const CACHE_VERSION = 'v3.0.0';
const STATIC_CACHE = `eatech-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `eatech-dynamic-${CACHE_VERSION}`;
const API_CACHE = `eatech-api-${CACHE_VERSION}`;
const IMAGES_CACHE = `eatech-images-${CACHE_VERSION}`;
const OFFLINE_FALLBACK = '/offline.html';

// === WORKBOX SETUP ===
// Clean up old caches
cleanupOutdatedCaches();

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST || []);

// === OFFLINE-FIRST STRATEGIES ===

// 1. STATIC ASSETS - Cache First (30 days)
registerRoute(
  ({ request, url }) => {
    return (
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'font' ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/fonts/') ||
      url.pathname.startsWith('/_next/static/')
    );
  },
  new CacheFirst({
    cacheName: STATIC_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        maxEntries: 200,
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// 2. IMAGES - Stale While Revalidate mit CDN Optimization
registerRoute(
  ({ request, url }) => {
    return (
      request.destination === 'image' ||
      url.pathname.includes('/images/') ||
      url.hostname.includes('storage.eatech.ch') ||
      url.hostname.includes('cdn.eatech.ch')
    );
  },
  new StaleWhileRevalidate({
    cacheName: IMAGES_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        maxEntries: 150,
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      // WebP/AVIF Optimization
      {
        requestWillFetch: async ({ request }) => {
          const url = new URL(request.url);

          // Skip if already optimized
          if (url.searchParams.has('format')) {
            return request;
          }

          // Add format optimization based on browser support
          if (await supportsWebP()) {
            url.searchParams.set('format', 'webp');
            url.searchParams.set('quality', '85');
          }

          return new Request(url.href, {
            headers: request.headers,
            method: request.method,
            body: request.body,
          });
        },
      },
    ],
  })
);

// 3. API CALLS - Network First mit Background Sync
registerRoute(
  ({ url }) => {
    return (
      url.pathname.startsWith('/api/') ||
      url.hostname.includes('api.eatech.ch') ||
      url.hostname.includes('firestore.googleapis.com')
    );
  },
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 5 * 60, // 5 minutes
        maxEntries: 100,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new BackgroundSyncPlugin('api-queue', {
        maxRetentionTime: 24 * 60, // 24 hours
      }),
      new BroadcastUpdatePlugin(),
    ],
  })
);

// 4. MENU DATA - Network First mit längerer Cache Zeit
registerRoute(
  ({ url }) => {
    return (
      url.pathname.includes('/api/menu') ||
      url.pathname.includes('/api/products') ||
      url.pathname.includes('/api/tenants')
    );
  },
  new NetworkFirst({
    cacheName: 'eatech-menu-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 15 * 60, // 15 minutes
        maxEntries: 50,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new BroadcastUpdatePlugin({
        headersToCheck: ['etag', 'last-modified'],
      }),
    ],
  })
);

// 5. PAYMENT APIS - Network Only (Security)
registerRoute(
  ({ url }) => {
    return (
      url.pathname.includes('/api/payment') ||
      url.pathname.includes('/api/stripe') ||
      url.pathname.includes('/api/twint') ||
      url.hostname.includes('js.stripe.com')
    );
  },
  new NetworkOnly()
);

// 6. FIREBASE FUNCTIONS - Network First mit kurzer Cache Zeit
registerRoute(
  ({ url }) => {
    return url.hostname.includes('cloudfunctions.net');
  },
  new NetworkFirst({
    cacheName: 'firebase-functions-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 2 * 60, // 2 minutes
        maxEntries: 30,
      }),
    ],
  })
);

// === NAVIGATION FALLBACK ===
import { NavigationRoute } from 'workbox-routing';

const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigations',
    plugins: [
      {
        handlerDidError: async () => {
          return caches.match(OFFLINE_FALLBACK);
        },
      },
    ],
  })
);
registerRoute(navigationRoute);

// === BACKGROUND SYNC für Orders ===
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background Sync:', event.tag);

  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }

  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalyticsData());
  }

  if (event.tag === 'sync-voice-commands') {
    event.waitUntil(syncVoiceCommands());
  }
});

// === PUSH NOTIFICATIONS (Firebase Cloud Messaging) ===
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);

  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Neue Nachricht von EATECH',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    image: data.image,
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'eatech-notification',
    renotify: true,
    requireInteraction: data.priority === 'high',
    silent: data.silent || false,
    actions: getNotificationActions(data.type),
    data: {
      url: data.url || '/',
      orderId: data.orderId,
      tenantId: data.tenantId,
      timestamp: Date.now(),
      ...data.payload
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'EATECH',
      options
    )
  );
});

// === NOTIFICATION CLICK HANDLING ===
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event);

  event.notification.close();

  const { action, notification } = event;
  const { data } = notification;

  let targetUrl = data.url || '/';

  // Handle specific actions
  switch (action) {
    case 'view-order':
      targetUrl = `/orders/${data.orderId}`;
      break;
    case 'track-order':
      targetUrl = `/track/${data.orderId}`;
      break;
    case 'view-menu':
      targetUrl = `/menu?tenant=${data.tenantId}`;
      break;
    case 'call-restaurant':
      // Open phone dialer
      targetUrl = `tel:${data.phone}`;
      break;
    case 'dismiss':
      return; // Just close notification
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// === VOICE COMMERCE OFFLINE SUPPORT ===
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data && event.data.type === 'VOICE_COMMAND_OFFLINE') {
    // Store voice command for later sync
    storeVoiceCommand(event.data.payload);

    // Send back offline response
    event.ports[0].postMessage({
      type: 'VOICE_COMMAND_STORED',
      message: 'Sprachbefehl gespeichert. Wird synchronisiert wenn online.'
    });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CHECK_WEBP_SUPPORT') {
    event.ports[0].postMessage({
      type: 'WEBP_SUPPORT',
      supported: supportsWebP()
    });
  }
});

// === UTILITY FUNCTIONS ===

async function syncPendingOrders() {
  try {
    const db = await openDB('eatech-offline', 1);
    const tx = db.transaction('pendingOrders', 'readonly');
    const pendingOrders = await tx.objectStore('pendingOrders').getAll();

    for (const order of pendingOrders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(order.data),
        });

        if (response.ok) {
          // Remove from offline storage
          const deleteTx = db.transaction('pendingOrders', 'readwrite');
          await deleteTx.objectStore('pendingOrders').delete(order.id);

          // Notify user
          await self.registration.showNotification('Bestellung synchronisiert', {
            body: `Bestellung ${order.data.orderNumber} wurde erfolgreich übertragen.`,
            icon: '/icons/icon-192x192.png',
            tag: 'order-synced',
          });
        }
      } catch (error) {
        console.error('Failed to sync order:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncAnalyticsData() {
  try {
    const db = await openDB('eatech-offline', 1);
    const tx = db.transaction('analyticsEvents', 'readonly');
    const events = await tx.objectStore('analyticsEvents').getAll();

    if (events.length > 0) {
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });

      if (response.ok) {
        // Clear synced events
        const deleteTx = db.transaction('analyticsEvents', 'readwrite');
        await deleteTx.objectStore('analyticsEvents').clear();
      }
    }
  } catch (error) {
    console.error('Analytics sync failed:', error);
  }
}

async function syncVoiceCommands() {
  try {
    const db = await openDB('eatech-offline', 1);
    const tx = db.transaction('voiceCommands', 'readonly');
    const commands = await tx.objectStore('voiceCommands').getAll();

    for (const command of commands) {
      try {
        const response = await fetch('/api/voice/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command.data),
        });

        if (response.ok) {
          const deleteTx = db.transaction('voiceCommands', 'readwrite');
          await deleteTx.objectStore('voiceCommands').delete(command.id);
        }
      } catch (error) {
        console.error('Failed to sync voice command:', error);
      }
    }
  } catch (error) {
    console.error('Voice commands sync failed:', error);
  }
}

async function storeVoiceCommand(command) {
  try {
    const db = await openDB('eatech-offline', 1);
    const tx = db.transaction('voiceCommands', 'readwrite');
    await tx.objectStore('voiceCommands').add({
      id: generateId(),
      data: command,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to store voice command:', error);
  }
}

function getNotificationActions(type) {
  const baseActions = [
    {
      action: 'dismiss',
      title: 'Schliessen',
      icon: '/icons/close.png'
    }
  ];

  switch (type) {
    case 'order_confirmed':
    case 'order_ready':
      return [
        {
          action: 'view-order',
          title: 'Bestellung anzeigen',
          icon: '/icons/view.png'
        },
        {
          action: 'track-order',
          title: 'Verfolgen',
          icon: '/icons/track.png'
        },
        ...baseActions
      ];

    case 'new_menu':
      return [
        {
          action: 'view-menu',
          title: 'Menü anzeigen',
          icon: '/icons/menu.png'
        },
        ...baseActions
      ];

    case 'special_offer':
      return [
        {
          action: 'view-offer',
          title: 'Angebot ansehen',
          icon: '/icons/offer.png'
        },
        ...baseActions
      ];

    default:
      return baseActions;
  }
}

async function supportsWebP() {
  if (!self.createImageBitmap) return false;

  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

  try {
    const response = await fetch(webpData);
    const blob = await response.blob();
    await createImageBitmap(blob);
    return true;
  } catch {
    return false;
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// === INDEXEDDB HELPER ===
function openDB(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('pendingOrders')) {
        db.createObjectStore('pendingOrders', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('analyticsEvents')) {
        db.createObjectStore('analyticsEvents', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('voiceCommands')) {
        db.createObjectStore('voiceCommands', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' });
      }
    };
  });
}

// === INSTALLATION & ACTIVATION ===
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        OFFLINE_FALLBACK,
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/',
      ]);
    })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.includes('eatech') && !cacheName.includes(CACHE_VERSION)) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim(),
    ])
  );
});

// === ERROR HANDLING ===
self.addEventListener('error', (event) => {
  console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled promise rejection:', event.reason);
});

console.log('[ServiceWorker] EATECH V3.0 Service Worker loaded successfully!');
