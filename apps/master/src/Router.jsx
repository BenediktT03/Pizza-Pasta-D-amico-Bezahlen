import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MasterLayout from './layouts/MasterLayout';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TenantList = lazy(() => import('./pages/TenantManagement/TenantList'));
const TenantDetail = lazy(() => import('./pages/TenantManagement/TenantDetail'));
const TenantOnboarding = lazy(() => import('./pages/TenantManagement/TenantOnboarding'));
const FeatureControl = lazy(() => import('./pages/FeatureControl/FeatureControl'));
const PlatformMetrics = lazy(() => import('./pages/SystemAnalytics/PlatformMetrics'));
const RevenueAnalysis = lazy(() => import('./pages/SystemAnalytics/RevenueAnalysis'));
const UsageStatistics = lazy(() => import('./pages/SystemAnalytics/UsageStatistics'));

// Monitoring Pages
const SystemHealth = lazy(() => import('./pages/Monitoring/SystemHealth'));
const ErrorTracking = lazy(() => import('./pages/Monitoring/ErrorTracking'));
const PerformanceMetrics = lazy(() => import('./pages/Monitoring/PerformanceMetrics'));
const AlertManager = lazy(() => import('./pages/Monitoring/AlertManager'));

// AI Training Pages
const ModelManagement = lazy(() => import('./pages/AITraining/ModelManagement'));
const TrainingPipeline = lazy(() => import('./pages/AITraining/TrainingPipeline'));
const ExperimentTracking = lazy(() => import('./pages/AITraining/ExperimentTracking'));

// Support Pages
const TicketList = lazy(() => import('./pages/Support/TicketList'));
const TicketDetail = lazy(() => import('./pages/Support/TicketDetail'));

// Auth Pages
const Login = lazy(() => import('./pages/Auth/Login'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));

// Error Pages
const NotFound = lazy(() => import('./pages/Error/NotFound'));
const ServerError = lazy(() => import('./pages/Error/ServerError'));

// Loading fallback component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  }}>
    <LoadingSpinner size="large" />
  </div>
);

const Router = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MasterLayout />}>
              {/* Dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Tenant Management */}
              <Route path="/tenants">
                <Route index element={<TenantList />} />
                <Route path=":tenantId" element={<TenantDetail />} />
                <Route path="new" element={<TenantOnboarding />} />
              </Route>

              {/* Feature Control */}
              <Route path="/feature-control" element={<FeatureControl />} />

              {/* System Analytics */}
              <Route path="/analytics">
                <Route index element={<Navigate to="/analytics/platform" replace />} />
                <Route path="platform" element={<PlatformMetrics />} />
                <Route path="revenue" element={<RevenueAnalysis />} />
                <Route path="usage" element={<UsageStatistics />} />
              </Route>

              {/* System Monitoring */}
              <Route path="/monitoring">
                <Route index element={<Navigate to="/monitoring/health" replace />} />
                <Route path="health" element={<SystemHealth />} />
                <Route path="errors" element={<ErrorTracking />} />
                <Route path="performance" element={<PerformanceMetrics />} />
                <Route path="alerts" element={<AlertManager />} />
              </Route>

              {/* AI Training */}
              <Route path="/ai-training">
                <Route index element={<Navigate to="/ai-training/models" replace />} />
                <Route path="models" element={<ModelManagement />} />
                <Route path="pipeline" element={<TrainingPipeline />} />
                <Route path="experiments" element={<ExperimentTracking />} />
              </Route>

              {/* Support */}
              <Route path="/support">
                <Route index element={<TicketList />} />
                <Route path=":ticketId" element={<TicketDetail />} />
              </Route>

              {/* Settings (if needed) */}
              <Route path="/settings">
                <Route index element={<div>Settings Page (To be implemented)</div>} />
              </Route>
            </Route>
          </Route>

          {/* Error Routes */}
          <Route path="/error" element={<ServerError />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default Router;

// Route configuration for navigation
export const routeConfig = {
  dashboard: {
    path: '/dashboard',
    title: 'Dashboard',
    icon: 'Home'
  },
  tenants: {
    path: '/tenants',
    title: 'Tenants',
    icon: 'Building',
    children: {
      list: { path: '/tenants', title: 'Alle Tenants' },
      new: { path: '/tenants/new', title: 'Neuer Tenant' }
    }
  },
  featureControl: {
    path: '/feature-control',
    title: 'Feature Control',
    icon: 'ToggleLeft'
  },
  analytics: {
    path: '/analytics',
    title: 'Analytics',
    icon: 'TrendingUp',
    children: {
      platform: { path: '/analytics/platform', title: 'Platform Metrics' },
      revenue: { path: '/analytics/revenue', title: 'Revenue Analysis' },
      usage: { path: '/analytics/usage', title: 'Usage Statistics' }
    }
  },
  monitoring: {
    path: '/monitoring',
    title: 'Monitoring',
    icon: 'Activity',
    children: {
      health: { path: '/monitoring/health', title: 'System Health' },
      errors: { path: '/monitoring/errors', title: 'Error Tracking' },
      performance: { path: '/monitoring/performance', title: 'Performance' },
      alerts: { path: '/monitoring/alerts', title: 'Alert Manager' }
    }
  },
  aiTraining: {
    path: '/ai-training',
    title: 'AI Training',
    icon: 'Brain',
    children: {
      models: { path: '/ai-training/models', title: 'Model Management' },
      pipeline: { path: '/ai-training/pipeline', title: 'Training Pipeline' },
      experiments: { path: '/ai-training/experiments', title: 'Experiments' }
    }
  },
  support: {
    path: '/support',
    title: 'Support',
    icon: 'HelpCircle'
  },
  settings: {
    path: '/settings',
    title: 'Settings',
    icon: 'Settings'
  }
};
