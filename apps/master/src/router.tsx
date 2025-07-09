import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

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

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'tenants',
        children: [
          {
            index: true,
            element: <TenantList />,
          },
          {
            path: ':tenantId',
            element: <TenantDetails />,
          },
        ],
      },
      {
        path: 'billing',
        element: <BillingOverview />,
      },
      {
        path: 'monitoring',
        element: <SystemHealth />,
      },
      {
        path: 'analytics',
        element: <PlatformAnalytics />,
      },
      {
        path: 'support',
        element: <SupportTickets />,
      },
      {
        path: 'features',
        element: <FeatureFlags />,
      },
      {
        path: 'deployments',
        element: <Deployments />,
      },
      {
        path: 'settings/*',
        element: <Settings />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

// Route configuration for navigation
export const routes = [
  {
    path: '/',
    name: 'Dashboard',
    icon: 'LayoutDashboard',
  },
  {
    path: '/tenants',
    name: 'Tenants',
    icon: 'Building2',
    children: [
      {
        path: '/tenants',
        name: 'All Tenants',
        icon: 'List',
      },
      {
        path: '/tenants/new',
        name: 'Add Tenant',
        icon: 'Plus',
      },
    ],
  },
  {
    path: '/billing',
    name: 'Billing',
    icon: 'CreditCard',
  },
  {
    path: '/monitoring',
    name: 'Monitoring',
    icon: 'Activity',
  },
  {
    path: '/analytics',
    name: 'Analytics',
    icon: 'BarChart3',
  },
  {
    path: '/support',
    name: 'Support',
    icon: 'Headphones',
  },
  {
    path: '/features',
    name: 'Features',
    icon: 'ToggleLeft',
  },
  {
    path: '/deployments',
    name: 'Deployments',
    icon: 'Rocket',
  },
  {
    path: '/settings',
    name: 'Settings',
    icon: 'Settings',
  },
];
