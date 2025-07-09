import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@eatech/core/hooks/useAuth';
import { useTenant } from '@eatech/core/hooks/useTenant';
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { LoadingScreen } from '@eatech/ui/components/LoadingScreen';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const OrderManagement = lazy(() => import('./features/orders/OrderManagement'));
const ProductCatalog = lazy(() => import('./features/products/ProductCatalog'));
const Analytics = lazy(() => import('./features/analytics/Analytics'));
const Settings = lazy(() => import('./features/settings/Settings'));
const StaffManagement = lazy(() => import('./features/staff/StaffManagement'));
const InventoryControl = lazy(() => import('./features/inventory/InventoryControl'));
const Promotions = lazy(() => import('./features/promotions/Promotions'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Maintenance = lazy(() => import('./pages/Maintenance'));

// Feature-specific pages (only loaded if feature is enabled)
const HACCPDashboard = lazy(() => import('./features/haccp/HACCPDashboard'));
const PaymentSettings = lazy(() => import('./features/payment/PaymentSettings'));
const LocationManagement = lazy(() => import('./features/locations/LocationManagement'));
const CustomerInsights = lazy(() => import('./features/customers/CustomerInsights'));
const ReportsCenter = lazy(() => import('./features/reports/ReportsCenter'));
const NotificationCenter = lazy(() => import('./features/notifications/NotificationCenter'));
const BrandingStudio = lazy(() => import('./features/branding/BrandingStudio'));
const IntegrationHub = lazy(() => import('./features/integrations/IntegrationHub'));
const TicketSystem = lazy(() => import('./features/support/TicketSystem'));
const RecipeManager = lazy(() => import('./features/recipes/RecipeManager'));

interface AppProps {
  onLoad?: () => void;
}

const App: React.FC<AppProps> = ({ onLoad }) => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { tenant, loading: tenantLoading, hasCompletedOnboarding } = useTenant();
  const { enabled: maintenanceMode } = useFeatureFlag('maintenance_mode');
  const location = useLocation();
  const { i18n } = useTranslation();

  // Feature flags for conditional routes
  const features = {
    haccp: useFeatureFlag('haccp_compliance'),
    locations: useFeatureFlag('location_management'),
    customers: useFeatureFlag('customer_insights'),
    reports: useFeatureFlag('advanced_reports'),
    notifications: useFeatureFlag('notification_center'),
    branding: useFeatureFlag('branding_customization'),
    integrations: useFeatureFlag('third_party_integrations'),
    support: useFeatureFlag('support_tickets'),
    recipes: useFeatureFlag('recipe_management'),
  };

  // Set language based on user preference
  useEffect(() => {
    if (user?.language && i18n.language !== user.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user, i18n]);

  // Call onLoad when app is ready
  useEffect(() => {
    if (!authLoading && !tenantLoading && onLoad) {
      onLoad();
    }
  }, [authLoading, tenantLoading, onLoad]);

  // Show loading screen while checking auth
  if (authLoading || tenantLoading) {
    return <LoadingScreen />;
  }

  // Show maintenance page if enabled
  if (maintenanceMode && !user?.role?.includes('admin')) {
    return <Maintenance />;
  }

  // Redirect to onboarding if not completed
  if (isAuthenticated && !hasCompletedOnboarding && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Onboarding flow */}
          <Route
            path="/onboarding/*"
            element={
              <ProtectedRoute>
                <OnboardingFlow />
              </ProtectedRoute>
            }
          />
          
          {/* Protected admin routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<Dashboard />} />
            
            {/* Core features */}
            <Route path="orders/*" element={<OrderManagement />} />
            <Route path="products/*" element={<ProductCatalog />} />
            <Route path="analytics/*" element={<Analytics />} />
            <Route path="inventory/*" element={<InventoryControl />} />
            <Route path="promotions/*" element={<Promotions />} />
            <Route path="settings/*" element={<Settings />} />
            
            {/* Conditional features based on feature flags */}
            {features.haccp.enabled && (
              <Route path="haccp/*" element={<HACCPDashboard />} />
            )}
            
            {features.locations.enabled && (
              <Route path="locations/*" element={<LocationManagement />} />
            )}
            
            {features.customers.enabled && (
              <Route path="customers/*" element={<CustomerInsights />} />
            )}
            
            {features.reports.enabled && (
              <Route path="reports/*" element={<ReportsCenter />} />
            )}
            
            {features.notifications.enabled && (
              <Route path="notifications/*" element={<NotificationCenter />} />
            )}
            
            {features.branding.enabled && (
              <Route path="branding/*" element={<BrandingStudio />} />
            )}
            
            {features.integrations.enabled && (
              <Route path="integrations/*" element={<IntegrationHub />} />
            )}
            
            {features.support.enabled && (
              <Route path="support/*" element={<TicketSystem />} />
            )}
            
            {features.recipes.enabled && (
              <Route path="recipes/*" element={<RecipeManager />} />
            )}
            
            {/* Payment settings (always available but features vary) */}
            <Route path="payment/*" element={<PaymentSettings />} />
            
            {/* Staff management (if role permits) */}
            {user?.role === 'owner' && (
              <Route path="staff/*" element={<StaffManagement />} />
            )}
          </Route>
          
          {/* 404 page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

export default App;
