import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'react-hot-toast'

// Stores
import { useAuthStore } from '@/stores/auth.store'
import { useThemeStore } from '@/stores/theme.store'

// Components
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { Layout } from '@/components/layout/Layout'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import { InstallPrompt } from '@/components/common/InstallPrompt'

// Lazy load pages for code splitting
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

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthStore()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/scan" replace />

  return <>{children}</>
}

const App: React.FC = () => {
  const { i18n } = useTranslation()
  const { theme, systemTheme } = useThemeStore()
  const { initialize: initAuth } = useAuthStore()

  // Initialize app
  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Apply theme
  useEffect(() => {
    const activeTheme = theme === 'system' ? systemTheme : theme
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(activeTheme)
  }, [theme, systemTheme])

  // Set language direction
  useEffect(() => {
    document.documentElement.lang = i18n.language
    document.documentElement.dir = i18n.dir()
  }, [i18n.language])

  return (
    <>
      {/* Global Components */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-background)',
            color: 'var(--color-text)',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-success)',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-error)',
              secondary: 'white',
            },
          },
        }}
      />
      <OfflineBanner />
      <InstallPrompt />

      {/* Routes */}
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="scan/:tableId" element={<ScanPage />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="menu" element={<MenuPage />} />
              <Route path="menu/:category" element={<MenuPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="order" element={<OrderPage />} />
              <Route path="order/:orderId" element={<OrderPage />} />
              <Route path="orders" element={<OrderHistoryPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="voice" element={<VoiceOrderPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>

      {/* Development Tools */}
      {import.meta.env.DEV && (
        <div className="dev-tools">
          <button
            onClick={() => {
              localStorage.clear()
              sessionStorage.clear()
              window.location.reload()
            }}
            className="dev-tools__button"
          >
            Clear Storage
          </button>
          <button
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                  registrations.forEach((registration) => registration.unregister())
                })
              }
            }}
            className="dev-tools__button"
          >
            Unregister SW
          </button>
        </div>
      )}
    </>
  )
}

export default App
