import { initializeApp, getApps } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getAnalytics } from 'firebase/analytics'
import { getPerformance } from 'firebase/performance'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app, 'europe-west6') // Swiss region

// Initialize Analytics and Performance only in production
let analytics = null
let performance = null
let messaging = null

if (import.meta.env.PROD && typeof window !== 'undefined') {
  analytics = getAnalytics(app)
  performance = getPerformance(app)
  
  // Initialize messaging for push notifications
  if ('Notification' in window && 'serviceWorker' in navigator) {
    messaging = getMessaging(app)
  }
}

// Connect to emulators in development
if (import.meta.env.DEV) {
  // Check if emulators are already connected
  // @ts-ignore
  if (!auth._canInitEmulator) {
    console.log('🔧 Connecting to Firebase emulators...')
    
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, 'localhost', 8080)
    connectStorageEmulator(storage, 'localhost', 9199)
    connectFunctionsEmulator(functions, 'localhost', 5001)
  }
}

// Helper functions for push notifications
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export const getMessagingToken = async (): Promise<string | null> => {
  if (!messaging) return null

  try {
    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    })
    
    if (currentToken) {
      console.log('FCM Token:', currentToken)
      return currentToken
    } else {
      console.log('No registration token available.')
      return null
    }
  } catch (err) {
    console.error('An error occurred while retrieving token:', err)
    return null
  }
}

// Listen for messages when app is in foreground
if (messaging) {
  onMessage(messaging, (payload) => {
    console.log('Message received:', payload)
    
    // Show notification
    if (Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'EATECH', {
        body: payload.notification?.body,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: payload.messageId,
        data: payload.data,
      })
    }
  })
}

// Export initialized app
export { app, analytics, performance, messaging }

// Tenant configuration
export const getTenantId = (): string => {
  // Get tenant ID from URL, localStorage, or default
  const urlParams = new URLSearchParams(window.location.search)
  const tenantFromUrl = urlParams.get('tenant')
  
  if (tenantFromUrl) {
    localStorage.setItem('tenantId', tenantFromUrl)
    return tenantFromUrl
  }
  
  return localStorage.getItem('tenantId') || 'default'
}

// Multi-tenant path helper
export const getTenantPath = (path: string): string => {
  const tenantId = getTenantId()
  return `tenants/${tenantId}/${path}`
}

export default app
