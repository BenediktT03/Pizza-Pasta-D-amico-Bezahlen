/**
 * EATECH - SERVICE WORKER
 * Version: 5.0.0
 * Description: Progressive Web App mit Offline-First Strategie
 * Features: Background Sync, Push Notifications, Intelligent Caching
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * 
 * 📍 Dateipfad: public/service-worker.js
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const SW_VERSION = '5.0.0';
const CACHE_PREFIX = 'eatech-';
const CACHE_NAMES = {
    static: `${CACHE_PREFIX}static-v${SW_VERSION}`,
    dynamic: `${CACHE_PREFIX}dynamic-v${SW_VERSION}`,
    images: `${CACHE_PREFIX}images-v${SW_VERSION}`,
    api: `${CACHE_PREFIX}api-v${SW_VERSION}`
};

// Critical assets that must be cached
const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/css/style.css',
    '/css/themes.css',
    '/js/app.js',
    '/js/order-management.js',
    '/js/payment-manager.js',
    '/js/voice-commands.js',
    '/manifest.json',
    '/images/logo-192.png',
    '/images/logo-512.png',
    '/sounds/notification.mp3',
    '/sounds/order-ready.mp3'
];

// Network-first routes
const NETWORK_FIRST_ROUTES = [
    '/api/',
    '/orders',
    '/checkout',
    'firebaseio.com',
    'stripe.com'
];

// Cache-first routes
const CACHE_FIRST_ROUTES = [
    '/images/',
    '/sounds/',
    '/fonts/',
    '/css/',
    '/js/'
];

// ============================================================================
// SERVICE WORKER LIFECYCLE
// ============================================================================

/**
 * Install Event - Cache critical assets
 */
self.addEventListener('install', (event) => {
    console.log(`[SW v${SW_VERSION}] Installing...`);
    
    event.waitUntil(
        caches.open(CACHE_NAMES.static)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log(`[SW v${SW_VERSION}] Install complete`);
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Install failed:', error);
            })
    );
});

/**
 * Activate Event - Clean old caches
 */
self.addEventListener('activate', (event) => {
    console.log(`[SW v${SW_VERSION}] Activating...`);
    
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName.startsWith(CACHE_PREFIX) && 
                            !Object.values(CACHE_NAMES).includes(cacheName)) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            self.clients.claim()
        ]).then(() => {
            console.log(`[SW v${SW_VERSION}] Activated`);
        })
    );
});

/**
 * Fetch Event - Intelligent request handling
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-HTTP(S) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Determine strategy based on request
    if (shouldUseNetworkFirst(url.pathname)) {
        event.respondWith(networkFirst(request));
    } else if (shouldUseCacheFirst(url.pathname)) {
        event.respondWith(cacheFirst(request));
    } else if (request.destination === 'image') {
        event.respondWith(lazyCache(request, CACHE_NAMES.images));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

/**
 * Network First Strategy - For dynamic content
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetchWithTimeout(request, 5000);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAMES.dynamic);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fallback to offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/offline.html');
        }
        
        throw error;
    }
}

/**
 * Cache First Strategy - For static assets
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAMES.static);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Return offline fallback for navigation
        if (request.mode === 'navigate') {
            return caches.match('/offline.html');
        }
        throw error;
    }
}

/**
 * Stale While Revalidate - Best of both worlds
 */
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            const cache = caches.open(CACHE_NAMES.dynamic);
            cache.then(c => c.put(request, networkResponse.clone()));
        }
        return networkResponse;
    }).catch(() => {
        // Silent fail for background update
    });
    
    return cachedResponse || fetchPromise;
}

/**
 * Lazy Cache - Cache images on demand
 */
async function lazyCache(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        // Only cache successful image responses
        if (networkResponse.ok && 
            networkResponse.headers.get('content-type')?.includes('image')) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Return placeholder image
        return caches.match('/images/placeholder.png');
    }
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

/**
 * Sync Event - Handle offline orders
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Sync event:', event.tag);
    
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncOfflineOrders());
    } else if (event.tag.startsWith('sync-order-')) {
        const orderId = event.tag.replace('sync-order-', '');
        event.waitUntil(syncSingleOrder(orderId));
    }
});

/**
 * Sync offline orders to server
 */
async function syncOfflineOrders() {
    try {
        // Get offline orders from IndexedDB
        const orders = await getOfflineOrders();
        
        console.log(`[SW] Syncing ${orders.length} offline orders`);
        
        for (const order of orders) {
            try {
                // Attempt to sync order
                const response = await fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Offline-Sync': 'true'
                    },
                    body: JSON.stringify(order)
                });
                
                if (response.ok) {
                    // Remove from offline queue
                    await removeOfflineOrder(order.localId);
                    
                    // Notify user of successful sync
                    await self.registration.showNotification('Bestellung synchronisiert', {
                        body: `Bestellung #${order.orderNumber} wurde erfolgreich übertragen`,
                        icon: '/images/logo-192.png',
                        badge: '/images/badge-72.png',
                        tag: `order-synced-${order.localId}`,
                        vibrate: [200, 100, 200]
                    });
                }
            } catch (error) {
                console.error(`[SW] Failed to sync order ${order.localId}:`, error);
            }
        }
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

/**
 * Push Event - Handle push notifications
 */
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');
    
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (error) {
        console.error('[SW] Invalid push data:', error);
    }
    
    const options = {
        title: data.title || 'EATECH Benachrichtigung',
        body: data.body || 'Sie haben eine neue Benachrichtigung',
        icon: data.icon || '/images/logo-192.png',
        badge: '/images/badge-72.png',
        vibrate: data.vibrate || [200, 100, 200],
        tag: data.tag || `notification-${Date.now()}`,
        data: data.data || {},
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || []
    };
    
    // Special handling for order ready notifications
    if (data.type === 'order-ready') {
        options.title = '🎉 Bestellung bereit!';
        options.body = `Bestellung #${data.orderNumber} ist bereit zur Abholung`;
        options.requireInteraction = true;
        options.actions = [
            { action: 'view', title: 'Anzeigen', icon: '/images/icon-view.png' },
            { action: 'dismiss', title: 'OK', icon: '/images/icon-check.png' }
        ];
        
        // Play sound
        playNotificationSound('order-ready');
    }
    
    event.waitUntil(
        self.registration.showNotification(options.title, options)
    );
});

/**
 * Notification Click - Handle notification interactions
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    
    event.notification.close();
    
    const data = event.notification.data;
    let targetUrl = '/';
    
    // Handle different actions
    switch (event.action) {
        case 'view':
            targetUrl = data.url || `/track?order=${data.orderNumber}`;
            break;
        case 'dismiss':
            // Just close notification
            return;
        default:
            // Click on notification body
            targetUrl = data.url || '/';
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Focus existing window if open
                for (const client of clientList) {
                    if (client.url.includes(self.registration.scope) && 'focus' in client) {
                        client.focus();
                        return client.navigate(targetUrl);
                    }
                }
                
                // Open new window if none found
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Message Event - Handle messages from clients
 */
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_URLS':
            event.waitUntil(
                cacheUrls(payload.urls, payload.cacheName || CACHE_NAMES.dynamic)
            );
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(clearCache(payload.cacheName));
            break;
            
        case 'SYNC_ORDER':
            event.waitUntil(
                self.registration.sync.register(`sync-order-${payload.orderId}`)
            );
            break;
            
        case 'CHECK_UPDATE':
            event.waitUntil(checkForUpdates());
            break;
    }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch with timeout
 */
function fetchWithTimeout(request, timeout = 5000) {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

/**
 * Should use network-first strategy
 */
function shouldUseNetworkFirst(pathname) {
    return NETWORK_FIRST_ROUTES.some(route => pathname.includes(route));
}

/**
 * Should use cache-first strategy
 */
function shouldUseCacheFirst(pathname) {
    return CACHE_FIRST_ROUTES.some(route => pathname.includes(route));
}

/**
 * Cache multiple URLs
 */
async function cacheUrls(urls, cacheName) {
    const cache = await caches.open(cacheName);
    return cache.addAll(urls);
}

/**
 * Clear specific cache
 */
async function clearCache(cacheName) {
    if (cacheName) {
        return caches.delete(cacheName);
    }
    
    // Clear all caches
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(name => caches.delete(name))
    );
}

/**
 * Play notification sound
 */
async function playNotificationSound(soundName) {
    try {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
            client.postMessage({
                type: 'PLAY_SOUND',
                sound: soundName
            });
        });
    } catch (error) {
        console.error('[SW] Error playing sound:', error);
    }
}

/**
 * Check for service worker updates
 */
async function checkForUpdates() {
    try {
        const registration = await self.registration.update();
        
        if (registration.waiting) {
            // Notify clients about available update
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach(client => {
                client.postMessage({
                    type: 'SW_UPDATE_AVAILABLE',
                    version: SW_VERSION
                });
            });
        }
    } catch (error) {
        console.error('[SW] Update check failed:', error);
    }
}

// ============================================================================
// INDEXEDDB OPERATIONS
// ============================================================================

/**
 * Get offline orders from IndexedDB
 */
async function getOfflineOrders() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('EatechOfflineDB', 1);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['orders'], 'readonly');
            const store = transaction.objectStore('orders');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
                resolve(getAllRequest.result || []);
            };
            
            getAllRequest.onerror = () => {
                reject(getAllRequest.error);
            };
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * Remove synced order from IndexedDB
 */
async function removeOfflineOrder(localId) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('EatechOfflineDB', 1);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['orders'], 'readwrite');
            const store = transaction.objectStore('orders');
            const deleteRequest = store.delete(localId);
            
            deleteRequest.onsuccess = () => {
                resolve();
            };
            
            deleteRequest.onerror = () => {
                reject(deleteRequest.error);
            };
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// ============================================================================
// PERIODIC BACKGROUND SYNC (if supported)
// ============================================================================

/**
 * Periodic sync for analytics and updates
 */
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'analytics-sync') {
        event.waitUntil(syncAnalytics());
    } else if (event.tag === 'content-update') {
        event.waitUntil(updateContent());
    }
});

/**
 * Sync analytics data
 */
async function syncAnalytics() {
    try {
        // Get queued analytics events
        const events = await getQueuedAnalytics();
        
        if (events.length > 0) {
            await fetch('/api/analytics/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events })
            });
            
            // Clear synced events
            await clearAnalyticsQueue();
        }
    } catch (error) {
        console.error('[SW] Analytics sync failed:', error);
    }
}

/**
 * Update cached content
 */
async function updateContent() {
    try {
        // Update critical assets
        const cache = await caches.open(CACHE_NAMES.static);
        
        for (const url of STATIC_ASSETS) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                }
            } catch (error) {
                // Silent fail for individual assets
            }
        }
        
        console.log('[SW] Content updated');
    } catch (error) {
        console.error('[SW] Content update failed:', error);
    }
}

// Log service worker version
console.log(`[SW] EATECH Service Worker v${SW_VERSION} loaded`);