/**
 * EATECH Mobile App - Constants Configuration
 * Version: 25.0.0
 * Description: Zentrale Konfiguration für die EATECH Admin Mobile App
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/config/constants.js
 */

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================
const ENV = {
  DEV: 'development',
  STAGING: 'staging',
  PROD: 'production',
};

const CURRENT_ENV = process.env.NODE_ENV || ENV.DEV;

// ============================================================================
// API ENDPOINTS
// ============================================================================
const API_ENDPOINTS = {
  development: {
    WEB_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:5001',
    FIREBASE_URL: 'https://eatech-dev.firebaseapp.com',
  },
  staging: {
    WEB_URL: 'https://staging.eatech.ch',
    API_URL: 'https://api-staging.eatech.ch',
    FIREBASE_URL: 'https://eatech-staging.firebaseapp.com',
  },
  production: {
    WEB_URL: 'https://app.eatech.ch',
    API_URL: 'https://api.eatech.ch',
    FIREBASE_URL: 'https://eatech-prod.firebaseapp.com',
  },
};

// ============================================================================
// MAIN CONFIGURATION
// ============================================================================
export const EATECH_CONFIG = {
  // App Info
  APP_NAME: 'EATECH Admin',
  APP_VERSION: '25.0.0',
  
  // URLs
  WEB_URL: API_ENDPOINTS[CURRENT_ENV].WEB_URL,
  API_URL: API_ENDPOINTS[CURRENT_ENV].API_URL,
  FIREBASE_URL: API_ENDPOINTS[CURRENT_ENV].FIREBASE_URL,
  
  // WebView Configuration
  WEBVIEW_CONFIG: {
    // Injected JavaScript for native bridge
    INJECTED_JS: `
      // Create native bridge
      window.EATECH_NATIVE = {
        isApp: true,
        platform: '${Platform.OS}',
        version: '25.0.0',
        
        // Native functions
        showNotification: (title, body, data) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'NOTIFICATION',
            payload: { title, body, data }
          }));
        },
        
        vibrate: (pattern) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'VIBRATE',
            payload: { pattern }
          }));
        },
        
        setQuickActions: (actions) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SET_QUICK_ACTIONS',
            payload: { actions }
          }));
        },
        
        setBadgeCount: (count) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SET_BADGE',
            payload: { count }
          }));
        },
        
        biometricAuth: () => {
          return new Promise((resolve) => {
            window.EATECH_NATIVE._biometricResolve = resolve;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'BIOMETRIC_AUTH'
            }));
          });
        },
        
        // Storage bridge for offline
        storage: {
          setItem: (key, value) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'STORAGE_SET',
              payload: { key, value }
            }));
          },
          
          getItem: (key) => {
            return new Promise((resolve) => {
              window.EATECH_NATIVE._storageResolves = window.EATECH_NATIVE._storageResolves || {};
              window.EATECH_NATIVE._storageResolves[key] = resolve;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'STORAGE_GET',
                payload: { key }
              }));
            });
          }
        }
      };
      
      // Override console for debugging
      const originalLog = console.log;
      console.log = (...args) => {
        originalLog(...args);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'CONSOLE_LOG',
          payload: { message: args.join(' ') }
        }));
      };
      
      true; // Required for injection
    `,
    
    // User Agent
    USER_AGENT: 'EATECH-Admin-App/25.0.0',
    
    // Allowed URLs
    ALLOWED_URLS: [
      API_ENDPOINTS[CURRENT_ENV].WEB_URL,
      API_ENDPOINTS[CURRENT_ENV].API_URL,
      'https://js.stripe.com',
      'https://checkout.stripe.com',
    ],
  },
  
  // Offline Configuration
  OFFLINE: {
    // Cache duration in milliseconds
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    
    // Endpoints to cache
    CACHED_ENDPOINTS: [
      '/api/products',
      '/api/categories',
      '/api/settings',
      '/api/customers',
      '/api/inventory',
    ],
    
    // Maximum offline queue size
    MAX_QUEUE_SIZE: 100,
    
    // Sync interval in milliseconds
    SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
  },
  
  // Quick Actions
  QUICK_ACTIONS: [
    {
      type: 'toggle_store',
      title: 'Öffnen/Schließen',
      subtitle: 'Foodtruck Status ändern',
      icon: 'store',
      userInfo: { url: '/admin/settings' },
    },
    {
      type: 'new_order',
      title: 'Neue Bestellung',
      subtitle: 'Bestellung erfassen',
      icon: 'compose',
      userInfo: { url: '/admin/orders/new' },
    },
    {
      type: 'daily_revenue',
      title: 'Tagesumsatz',
      subtitle: 'Heutige Einnahmen',
      icon: 'analytics',
      userInfo: { url: '/admin/analytics' },
    },
    {
      type: 'inventory_update',
      title: 'Inventar Update',
      subtitle: 'Lagerbestand anpassen',
      icon: 'inventory',
      userInfo: { url: '/admin/inventory' },
    },
  ],
  
  // Notification Settings
  NOTIFICATIONS: {
    // Notification channels
    CHANNELS: {
      ORDERS: {
        id: 'orders',
        name: 'Bestellungen',
        importance: 5,
        sound: 'order_notification.wav',
        vibrate: true,
      },
      ALERTS: {
        id: 'alerts',
        name: 'Warnungen',
        importance: 4,
        sound: 'alert_notification.wav',
        vibrate: true,
      },
      GENERAL: {
        id: 'general',
        name: 'Allgemein',
        importance: 3,
        sound: 'default',
        vibrate: false,
      },
    },
    
    // Notification types
    TYPES: {
      NEW_ORDER: 'new_order',
      ORDER_UPDATE: 'order_update',
      LOW_INVENTORY: 'low_inventory',
      DAILY_SUMMARY: 'daily_summary',
      SYSTEM_ALERT: 'system_alert',
    },
  },
  
  // Widget Configuration
  WIDGET: {
    // Update interval in minutes
    UPDATE_INTERVAL: 15,
    
    // Widget types
    TYPES: {
      SUMMARY: 'summary_widget',
      ORDERS: 'orders_widget',
      REVENUE: 'revenue_widget',
    },
  },
  
  // Apple Watch Configuration
  WATCH: {
    // Complication types
    COMPLICATIONS: {
      ORDERS_COUNT: 'orders_count',
      REVENUE_TODAY: 'revenue_today',
      STORE_STATUS: 'store_status',
    },
    
    // Update interval in minutes
    UPDATE_INTERVAL: 5,
  },
  
  // Security
  SECURITY: {
    // Session timeout in milliseconds
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    
    // Biometric authentication
    BIOMETRIC: {
      enabled: true,
      fallbackToPasscode: true,
      title: 'EATECH Admin Login',
      subtitle: 'Authentifizieren Sie sich für den Zugriff',
      cancelLabel: 'Abbrechen',
    },
  },
  
  // Performance
  PERFORMANCE: {
    // Image optimization
    IMAGE_QUALITY: 0.8,
    MAX_IMAGE_SIZE: 1920,
    
    // Cache settings
    CACHE_SIZE_LIMIT: 100 * 1024 * 1024, // 100 MB
    
    // Request timeout
    REQUEST_TIMEOUT: 30000, // 30 seconds
  },
};

// ============================================================================
// THEME CONFIGURATION
// ============================================================================
export const THEME = {
  colors: {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    success: '#95E1D3',
    warning: '#F38181',
    error: '#FC5185',
    info: '#3FC1C9',
    
    background: '#0A0A0A',
    surface: '#1A1A1A',
    card: '#2A2A2A',
    
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textDisabled: '#666666',
    
    border: '#333333',
    divider: '#444444',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    body1: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    body2: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
  },
  
  animation: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
};

// ============================================================================
// EXPORT ALL
// ============================================================================
export default {
  EATECH_CONFIG,
  THEME,
  ENV,
  CURRENT_ENV,
};