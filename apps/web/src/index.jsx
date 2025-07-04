/**
 * EATECH - React Application Entry Point
 * Version: 5.0.0
 * Description: Haupteinstiegspunkt für die EATECH React-Anwendung
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/index.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

// Initialize Firebase
import './config/firebase';

// Import global styles
import './styles/globals.css';

// Import translations
import './i18n';

// ============================================================================
// ENVIRONMENT CHECK
// ============================================================================
if (process.env.NODE_ENV === 'development') {
    console.log('🔧 EATECH Development Mode');
    console.log('📊 Environment:', {
        firebase: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        version: process.env.REACT_APP_VERSION || '5.0.0',
        api: process.env.REACT_APP_API_URL
    });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
        // logErrorToService(event.reason);
    }
});

// ============================================================================
// RENDER APP
// ============================================================================
const container = document.getElementById('root');

if (!container) {
    throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(container);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// ============================================================================
// SERVICE WORKER
// ============================================================================
serviceWorkerRegistration.register({
    onSuccess: () => {
        console.log('✅ Service Worker registered successfully');
    },
    onUpdate: registration => {
        console.log('🔄 New content available, please refresh');
        // Notify user about update
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }
});

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================
reportWebVitals(metric => {
    if (process.env.NODE_ENV === 'production') {
        // Send to analytics
        console.log(metric);
        // Example: sendToAnalytics(metric);
    } else {
        console.log('📊 Web Vital:', metric);
    }
});

// ============================================================================
// HOT MODULE REPLACEMENT
// ============================================================================
if (import.meta.hot) {
    import.meta.hot.accept();
}