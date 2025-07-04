/**
 * EATECH - Main App Component
 * Version: 5.0.0
 * Description: Hauptkomponente der EATECH React-Anwendung mit Routing,
 *              Theming, Multi-Tenant Support und globalen Providers
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/App.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { VoiceCommandProvider } from './contexts/VoiceCommandContext';

// Routes
import AppRoutes from './routes';

// Components
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingScreen from './components/common/LoadingScreen';
import OfflineIndicator from './components/common/OfflineIndicator';
import CookieConsent from './components/common/CookieConsent';
import UpdateNotification from './components/common/UpdateNotification';

// Hooks
import { useServiceWorker } from './hooks/useServiceWorker';
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
import { useOfflineSync } from './hooks/useOfflineSync';

// Styles
import './styles/globals.css';
import './styles/themes.css';
import './styles/animations.css';

// Lazy load heavy components
const AnalyticsProvider = lazy(() => import('./contexts/AnalyticsContext'));

// ============================================================================
// APP COMPONENT
// ============================================================================
const App = () => {
    // Service Worker Registration
    const { updateAvailable, updateApp } = useServiceWorker();
    
    // Performance Monitoring
    usePerformanceMonitoring();
    
    // Offline Sync
    useOfflineSync();
    
    // Initialize App
    useEffect(() => {
        // Remove loading screen
        const loader = document.getElementById('initial-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 300);
        }
        
        // Log app version
        console.log(`🚀 EATECH v${process.env.REACT_APP_VERSION || '5.0.0'} initialized`);
        
        // Check for updates every 30 minutes
        const updateInterval = setInterval(() => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg) reg.update();
                });
            }
        }, 30 * 60 * 1000);
        
        return () => clearInterval(updateInterval);
    }, []);
    
    return (
        <ErrorBoundary>
            <HelmetProvider>
                <BrowserRouter>
                    <TenantProvider>
                        <AuthProvider>
                            <ThemeProvider>
                                <NotificationProvider>
                                    <CartProvider>
                                        <VoiceCommandProvider>
                                            <Suspense fallback={<LoadingScreen />}>
                                                <AnalyticsProvider>
                                                    {/* Main App */}
                                                    <div className="app-container">
                                                        {/* Global Components */}
                                                        <OfflineIndicator />
                                                        {updateAvailable && (
                                                            <UpdateNotification onUpdate={updateApp} />
                                                        )}
                                                        
                                                        {/* Routes */}
                                                        <AppRoutes />
                                                        
                                                        {/* Global UI Elements */}
                                                        <Toaster
                                                            position="top-right"
                                                            toastOptions={{
                                                                duration: 4000,
                                                                style: {
                                                                    background: 'var(--theme-bg-card)',
                                                                    color: 'var(--theme-text)',
                                                                    border: '1px solid var(--theme-border)',
                                                                    borderRadius: '12px',
                                                                    backdropFilter: 'blur(10px)',
                                                                },
                                                                success: {
                                                                    iconTheme: {
                                                                        primary: 'var(--theme-success)',
                                                                        secondary: 'var(--theme-bg-card)',
                                                                    },
                                                                },
                                                                error: {
                                                                    iconTheme: {
                                                                        primary: 'var(--theme-error)',
                                                                        secondary: 'var(--theme-bg-card)',
                                                                    },
                                                                },
                                                            }}
                                                        />
                                                        
                                                        <CookieConsent />
                                                    </div>
                                                </AnalyticsProvider>
                                            </Suspense>
                                        </VoiceCommandProvider>
                                    </CartProvider>
                                </NotificationProvider>
                            </ThemeProvider>
                        </AuthProvider>
                    </TenantProvider>
                </BrowserRouter>
            </HelmetProvider>
        </ErrorBoundary>
    );
};

// ============================================================================
// EXPORT
// ============================================================================
export default App;