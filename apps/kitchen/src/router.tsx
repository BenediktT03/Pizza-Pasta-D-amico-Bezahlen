// Kitchen Display App Router
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingScreen } from './components/LoadingScreen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/Login'));
const KitchenDashboard = lazy(() => import('./pages/Dashboard'));
const OrderDisplay = lazy(() => import('./features/orders/OrderDisplay'));
const OrderQueue = lazy(() => import('./features/orders/OrderQueue'));
const QuickInventoryUpdate = lazy(() => import('./features/inventory/QuickUpdate'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

export const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard */}
          <Route path="/dashboard" element={<KitchenDashboard />} />
          
          {/* Orders */}
          <Route path="/orders" element={<OrderDisplay />} />
          <Route path="/queue" element={<OrderQueue />} />
          
          {/* Inventory */}
          <Route path="/inventory" element={<QuickInventoryUpdate />} />
          
          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
        </Route>
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
