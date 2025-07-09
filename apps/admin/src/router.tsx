import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'

// Components
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Lazy load pages
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage'))
const MenuPage = lazy(() => import('@/features/menu/MenuPage'))
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage'))
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'))
const StaffPage = lazy(() => import('@/features/staff/StaffPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const EventsPage = lazy(() => import('@/features/events/EventsPage'))
const MarketingPage = lazy(() => import('@/features/marketing/MarketingPage'))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))
const SupportPage = lazy(() => import('@/features/support/SupportPage'))
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const NotFoundPage = lazy(() => import('@/features/errors/NotFoundPage'))

// Route configuration
export const routes = [
  {
    path: '/login',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'orders',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <OrdersPage />
              </Suspense>
            ),
          },
          {
            path: 'orders/:orderId',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <OrdersPage />
              </Suspense>
            ),
          },
          {
            path: 'menu',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <MenuPage />
              </Suspense>
            ),
          },
          {
            path: 'inventory',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <InventoryPage />
              </Suspense>
            ),
          },
          {
            path: 'customers',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <CustomersPage />
              </Suspense>
            ),
          },
          {
            path: 'analytics',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <AnalyticsPage />
              </Suspense>
            ),
          },
          {
            path: 'staff',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <StaffPage />
              </Suspense>
            ),
          },
          {
            path: 'events',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <EventsPage />
              </Suspense>
            ),
          },
          {
            path: 'marketing',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <MarketingPage />
              </Suspense>
            ),
          },
          {
            path: 'reports',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <ReportsPage />
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <SettingsPage />
              </Suspense>
            ),
          },
          {
            path: 'support',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <SupportPage />
              </Suspense>
            ),
          },
          {
            path: '*',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <NotFoundPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]

// Create router
export const router = createBrowserRouter(routes, {
  future: {
    v7_normalizeFormMethod: true,
  },
})

// Router Provider Component
export const Router: React.FC = () => {
  return <RouterProvider router={router} />
}

// Route metadata for SEO
export const routeMeta = {
  '/': {
    title: 'Dashboard - EATECH Admin',
    description: 'Manage your foodtruck business',
  },
  '/orders': {
    title: 'Orders - EATECH Admin',
    description: 'Manage and track customer orders',
  },
  '/menu': {
    title: 'Menu Management - EATECH Admin',
    description: 'Manage your menu items and categories',
  },
  '/inventory': {
    title: 'Inventory - EATECH Admin',
    description: 'Track and manage inventory levels',
  },
  '/customers': {
    title: 'Customers - EATECH Admin',
    description: 'Customer management and insights',
  },
  '/analytics': {
    title: 'Analytics - EATECH Admin',
    description: 'Business analytics and insights',
  },
  '/staff': {
    title: 'Staff - EATECH Admin',
    description: 'Manage staff and permissions',
  },
  '/settings': {
    title: 'Settings - EATECH Admin',
    description: 'Configure your business settings',
  },
}
