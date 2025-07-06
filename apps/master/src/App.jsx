/**
 * EATECH Master App
 * Version: 2.0.0
 * Description: Hauptkomponente für die Master Control Application mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/master/src/App.jsx
 */

import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MasterAuthProvider } from './hooks/useMasterAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load all pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TenantControl = lazy(() => import('./pages/TenantControl/TenantControl'));
const SystemMetrics = lazy(() => import('./pages/SystemMetrics/SystemMetrics'));
const GlobalSettings = lazy(() => import('./pages/GlobalSettings/GlobalSettings'));
const RevenueTracking = lazy(() => import('./pages/RevenueTracking/RevenueTracking'));
const FeatureControl = lazy(() => import('./pages/FeatureControl/FeatureControl'));
const AlertCenter = lazy(() => import('./pages/AlertCenter/AlertCenter'));

// Lazy load layout
const MasterLayout = lazy(() => import('./layouts/MasterLayout'));

// Lazy load global styles
const loadGlobalStyles = () => import('./styles/global.css');

// Preload critical routes
const preloadCriticalRoutes = () => {
  // Preload dashboard as it's the most common landing page
  import('./pages/Dashboard');
  import('./layouts/MasterLayout');
};

function App() {
  useEffect(() => {
    // Load global styles
    loadGlobalStyles();
    
    // Preload critical routes after initial render
    const timer = setTimeout(preloadCriticalRoutes, 1000);
    
    // Setup performance monitoring
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            console.log(`Page load time: ${entry.loadEventEnd - entry.fetchStart}ms`);
          }
        });
      });
      observer.observe({ entryTypes: ['navigation'] });
    }
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <MasterAuthProvider>
          <Suspense fallback={<LoadingScreen fullScreen />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/master/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route
                path="/master/*"
                element={
                  <ProtectedRoute>
                    <MasterLayout>
                      <Suspense fallback={<LoadingScreen />}>
                        <Routes>
                          <Route path="dashboard" element={<Dashboard />} />
                          <Route path="tenants" element={<TenantControl />} />
                          <Route path="metrics" element={<SystemMetrics />} />
                          <Route path="revenue" element={<RevenueTracking />} />
                          <Route path="features" element={<FeatureControl />} />
                          <Route path="alerts" element={<AlertCenter />} />
                          <Route path="settings" element={<GlobalSettings />} />
                          <Route path="*" element={<Navigate to="/master/dashboard" replace />} />
                        </Routes>
                      </Suspense>
                    </MasterLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Default redirect */}
              <Route path="*" element={<Navigate to="/master/login" replace />} />
            </Routes>
          </Suspense>
        </MasterAuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;