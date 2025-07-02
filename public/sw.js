// FlowBite Pro Service Worker
// Version 1.0.0

const CACHE_NAME = 'flowbite-v1';
const DYNAMIC_CACHE = 'flowbite-dynamic-v1';

// Dateien die immer gecached werden sollen
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/success.html',
  '/track.html',
  '/admin.html',
  '/admin-dashboard.html',
  '/admin-orders.html',
  '/admin-products.html',
  '/404.html',
  '/css/style.css',
  '/css/admin-style.css',
  '/js/multilingual.js',
  '/offline.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// Install Event
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => console.error('[SW] Cache error:', err))
  );
});

// Activate Event
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event - Network First Strategy für API, Cache First für Assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Firebase API Calls - Network First
  if (url.href.includes('firebaseio.com') || url.href.includes('firebase')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone response für Cache
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback auf Cache wenn offline
          return caches.match(request);
        })
    );
    return;
  }

  // Stripe/Payment APIs - Immer Network Only
  if (url.href.includes('stripe.com') || url.href.includes('payment')) {
    event.respondWith(fetch(request));
    return;
  }

  // Static Assets - Cache First
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(fetchResponse => {
        return caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    }).catch(() => {
      // Offline Fallback
      if (request.destination === 'document') {
        return caches.match('/offline.html');
      }
    })
  );
});

// Background Sync für Offline-Bestellungen
self.addEventListener('sync', event => {
  console.log('[SW] Background Sync triggered');
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

// Push Notifications
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Neue Benachrichtigung von FlowBite',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.orderId || 1
    },
    actions: [
      {
        action: 'view',
        title: 'Anzeigen',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Schließen',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FlowBite Pro', options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/track.html?order=' + event.notification.data.primaryKey)
    );
  }
});

// Offline Order Queue
const syncOfflineOrders = async () => {
  try {
    const cache = await caches.open('offline-orders');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const orderData = await response.json();
      
      // Versuche Order zu senden
      try {
        const result = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        
        if (result.ok) {
          // Erfolgreich gesendet - aus Cache löschen
          await cache.delete(request);
          
          // Notification an User
          await self.registration.showNotification('Bestellung übertragen', {
            body: 'Ihre Offline-Bestellung wurde erfolgreich übertragen!',
            icon: '/icons/icon-192x192.png'
          });
        }
      } catch (error) {
        console.log('[SW] Sync failed, will retry later');
      }
    }
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
};

// Message Handler für Skip Waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});