import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'

// Components
import { Layout } from '@/components/layout/Layout'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

// Lazy load pages
const HomePage = lazy(() => import('@/features/home/HomePage'))
const MenuPage = lazy(() => import('@/features/menu/MenuPage'))
const CartPage = lazy(() => import('@/features/cart/CartPage'))
const OrderPage = lazy(() => import('@/features/order/OrderPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const VoiceOrderPage = lazy(() => import('@/features/voice/VoiceOrderPage'))
const ScanPage = lazy(() => import('@/features/scan/ScanPage'))
const OrderHistoryPage = lazy(() => import('@/features/orders/OrderHistoryPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const NotFoundPage = lazy(() => import('@/features/errors/NotFoundPage'))
const OfflinePage = lazy(() => import('@/features/errors/OfflinePage'))

// Route configuration
export const routes = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'scan',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ScanPage />
          </Suspense>
        ),
      },
      {
        path: 'scan/:tableId',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ScanPage />
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
        path: 'menu/:category',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <MenuPage />
          </Suspense>
        ),
      },
      {
        path: 'cart',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <CartPage />
          </Suspense>
        ),
      },
      {
        path: 'order',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <OrderPage />
          </Suspense>
        ),
      },
      {
        path: 'order/:orderId',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <OrderPage />
          </Suspense>
        ),
      },
      {
        path: 'orders',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <OrderHistoryPage />
          </Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ProfilePage />
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
        path: 'voice',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <VoiceOrderPage />
          </Suspense>
        ),
      },
      {
        path: 'offline',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <OfflinePage />
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
    title: 'EATECH - Smart Foodtruck Ordering',
    description: 'Order from your favorite foodtruck with voice and QR code',
  },
  '/menu': {
    title: 'Menu - EATECH',
    description: 'Browse our delicious menu and place your order',
  },
  '/cart': {
    title: 'Cart - EATECH',
    description: 'Review your order before checkout',
  },
  '/orders': {
    title: 'Order History - EATECH',
    description: 'View your past orders and reorder favorites',
  },
  '/profile': {
    title: 'Profile - EATECH',
    description: 'Manage your account and preferences',
  },
  '/voice': {
    title: 'Voice Order - EATECH',
    description: 'Order using voice commands in your preferred language',
  },
}
