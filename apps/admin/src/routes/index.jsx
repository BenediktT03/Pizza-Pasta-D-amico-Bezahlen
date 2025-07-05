import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoadingScreen from '@components/common/LoadingScreen';

// Lazy load all pages
const Dashboard = lazy(() => import('@pages/dashboard'));
const Products = lazy(() => import('@pages/products'));
const Orders = lazy(() => import('@pages/orders'));
const Kitchen = lazy(() => import('@pages/kitchen'));
const Customers = lazy(() => import('@pages/customers'));
const Loyalty = lazy(() => import('@pages/loyalty'));
const Analytics = lazy(() => import('@pages/analytics'));
const Billing = lazy(() => import('@pages/billing'));
const Reports = lazy(() => import('@pages/reports'));
const Notifications = lazy(() => import('@pages/notifications'));
const Settings = lazy(() => import('@pages/settings'));
const Login = lazy(() => import('@pages/auth/Login'));
const Register = lazy(() => import('@pages/auth/Register'));
const ForgotPassword = lazy(() => import('@pages/auth/ForgotPassword'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/kitchen" element={<Kitchen />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/loyalty" element={<Loyalty />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        
        {/* 404 - Redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
