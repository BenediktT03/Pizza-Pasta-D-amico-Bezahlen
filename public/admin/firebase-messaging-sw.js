/**
 * EATECH - Firebase Messaging Service Worker
 * Version: 23.0.0
 * Description: Service Worker für Push Notifications mit Firebase Cloud Messaging
 * File Path: /apps/admin/public/firebase-messaging-sw.js
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  // Extract notification data
  const { title, body, icon, badge, image, data } = payload.notification || {};
  
  // Default options
  const notificationOptions = {
    body: body || 'Sie haben eine neue Nachricht',
    icon: icon || '/icon-192x192.png',
    badge: badge || '/icon-192x192.png',
    image: image,
    vibrate: [200, 100, 200],
    tag: 'eatech-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      ...payload.data,
      click_action: data?.click_action || '/',
      timestamp: new Date().toISOString()
    },
    actions: []
  };
  
  // Add actions based on notification type
  if (data?.type === 'order_ready') {
    notificationOptions.actions = [
      {
        action: 'view',
        title: 'Ansehen',
        icon: '/icons/eye.png'
      },
      {
        action: 'directions',
        title: 'Route',
        icon: '/icons/map.png'
      }
    ];
  } else if (data?.type === 'order_new') {
    notificationOptions.actions = [
      {
        action: 'accept',
        title: 'Annehmen',
        icon: '/icons/check.png'
      },
      {
        action: 'view',
        title: 'Details',
        icon: '/icons/eye.png'
      }
    ];
  }
  
  // Show notification
  return self.registration.showNotification(
    title || 'EATECH Benachrichtigung',
    notificationOptions
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();
  
  let url = '/';
  
  // Handle action clicks
  if (event.action === 'view') {
    url = event.notification.data.click_action || '/admin/orders';
  } else if (event.action === 'directions') {
    // Open maps with directions
    const address = event.notification.data.address;
    if (address) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
  } else if (event.action === 'accept') {
    // Handle order acceptance
    url = event.notification.data.click_action || '/admin/orders';
  } else {
    // Default click action
    url = event.notification.data.click_action || '/';
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'notification-click',
            data: event.notification.data,
            action: event.action
          });
          return client.navigate(url);
        }
      }
      
      // If app is not open, open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event);
  
  // Track notification dismissal
  if (event.notification.data && event.notification.data.id) {
    // Send dismissal event to analytics
    fetch('/api/notifications/dismissed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: event.notification.data.id,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Failed to track dismissal:', err));
  }
});

// Periodic sync for scheduled notifications
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    console.log('[firebase-messaging-sw.js] Checking for scheduled notifications');
    
    event.waitUntil(
      fetch('/api/notifications/scheduled')
        .then(response => response.json())
        .then(notifications => {
          // Process scheduled notifications
          notifications.forEach(notification => {
            if (new Date(notification.scheduledFor) <= new Date()) {
              self.registration.showNotification(
                notification.title,
                {
                  body: notification.body,
                  icon: '/icon-192x192.png',
                  data: notification.data
                }
              );
            }
          });
        })
        .catch(err => console.error('Failed to check notifications:', err))
    );
  }
});

// Update cache for offline support
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  event.waitUntil(clients.claim());
});