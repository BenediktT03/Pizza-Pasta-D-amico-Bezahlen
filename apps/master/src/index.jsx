/**
 * EATECH Master App Entry Point
 * Version: 3.0.0
 * 
 * Main entry point for the Master Control System
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/index.jsx
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Import Polyfills if needed
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Performance monitoring
if (process.env.NODE_ENV === 'production') {
  // Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}

// Service Worker Registration
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        console.log('SW registered:', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              if (window.confirm('Neue Version verfügbar! Jetzt aktualisieren?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch(error => {
        console.error('SW registration failed:', error);
      });
  });
}

// Error logging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(event.error);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(event.reason);
  }
});

// Check browser compatibility
const checkBrowserCompatibility = () => {
  const missingFeatures = [];
  
  if (!window.Promise) missingFeatures.push('Promise');
  if (!window.fetch) missingFeatures.push('Fetch API');
  if (!window.IntersectionObserver) missingFeatures.push('IntersectionObserver');
  if (!window.ResizeObserver) missingFeatures.push('ResizeObserver');
  
  if (missingFeatures.length > 0) {
    console.warn('Missing browser features:', missingFeatures);
    // Show compatibility warning
    const warning = document.createElement('div');
    warning.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #fef3c7; color: #92400e; padding: 1rem; text-align: center; z-index: 9999;';
    warning.textContent = 'Ihr Browser ist möglicherweise nicht vollständig kompatibel. Bitte aktualisieren Sie auf die neueste Version.';
    document.body.appendChild(warning);
  }
};

// Initialize app
const initializeApp = () => {
  // Check compatibility
  checkBrowserCompatibility();
  
  // Get root element
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  // Create React root
  const root = ReactDOM.createRoot(rootElement);
  
  // Render app
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // Log app info
  console.log(
    `%c🚀 EATECH Master Control v${process.env.REACT_APP_VERSION || '3.0.0'}`,
    'color: #667eea; font-size: 20px; font-weight: bold;'
  );
  console.log(
    `%c🔧 Environment: ${process.env.NODE_ENV}`,
    'color: #94a3b8; font-size: 14px;'
  );
  console.log(
    `%c📅 Build: ${new Date().toISOString()}`,
    'color: #94a3b8; font-size: 14px;'
  );
};

// Start the app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}