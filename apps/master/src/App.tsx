import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoadingScreen } from './components/common/LoadingScreen';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './features/dashboard/Dashboard';
import { TenantList } from './features/tenants/TenantList';
import { TenantDetails } from './features/tenants/TenantDetails';
import { BillingOverview } from './features/billing/BillingOverview';
import { SystemHealth } from './features/monitoring/SystemHealth';
import { PlatformAnalytics } from './features/analytics/PlatformAnalytics';
import { SupportTickets } from './features/support/SupportTickets';
import { FeatureFlags } from './features/features/FeatureFlags';
import { Deployments } from './features/deployment/Deployments';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function App() {
  const { checkAuth, loading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        
        {/* Tenants */}
        <Route path="tenants">
          <Route index element={<TenantList />} />
          <Route path=":tenantId" element={<TenantDetails />} />
        </Route>

        {/* Billing */}
        <Route path="billing" element={<BillingOverview />} />

        {/* Monitoring */}
        <Route path="monitoring" element={<SystemHealth />} />

        {/* Analytics */}
        <Route path="analytics" element={<PlatformAnalytics />} />

        {/* Support */}
        <Route path="support" element={<SupportTickets />} />

        {/* Features */}
        <Route path="features" element={<FeatureFlags />} />

        {/* Deployments */}
        <Route path="deployments" element={<Deployments />} />

        {/* Settings */}
        <Route path="settings/*" element={<Settings />} />
      </Route>

      {/* 404 Page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
