/**
 * EATECH - App Routes Configuration
 * Version: 5.0.0
 * Description: Zentrale Routing-Konfiguration mit Protected Routes,
 *              Lazy Loading und Role-based Access Control
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/routes/index.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

// Components
import LoadingScreen from '../components/common/LoadingScreen';
import Layout from '../components/common/Layout';
import NotFound from '../components/common/NotFound';
import ProtectedRoute from './ProtectedRoute';

// Lazy load pages for better performance
// Public Pages
const LandingPage = lazy(() => import('../pages/LandingPage'));
const CustomerMenu = lazy(() => import('../pages/customer/CustomerMenu'));
const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const OrderStatus = lazy(() => import('../pages/customer/OrderStatus'));

// Customer Pages
const CustomerDashboard = lazy(() => import('../pages/customer/Dashboard'));
const OrderHistory = lazy(() => import('../pages/customer/OrderHistory'));
const Profile = lazy(() => import('../pages/customer/Profile'));
const Checkout = lazy(() => import('../pages/customer/Checkout'));

// Staff Pages
const KitchenDisplay = lazy(() => import('../pages/staff/KitchenDisplay'));
const OrderQueue = lazy(() => import('../pages/staff/OrderQueue'));

// Admin Pages
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const InventoryDashboard = lazy(() => import('../components/inventory/InventoryDashboard'));
const OrderManagement = lazy(() => import('../pages/admin/OrderManagement'));
const ProductManagement = lazy(() => import('../pages/admin/ProductManagement'));
const CategoryManagement = lazy(() => import('../pages/admin/CategoryManagement'));
const CustomerManagement = lazy(() => import('../pages/admin/CustomerManagement'));
const DiscountManager = lazy(() => import('../pages/admin/DiscountManager'));
const LoyaltyProgram = lazy(() => import('../pages/admin/LoyaltyProgram'));
const Analytics = lazy(() => import('../pages/admin/Analytics'));
const Reports = lazy(() => import('../pages/admin/Reports'));
const Settings = lazy(() => import('../pages/admin/Settings'));

// Master Admin Pages
const MasterDashboard = lazy(() => import('../pages/master/Dashboard'));
const TenantManager = lazy(() => import('../pages/master/TenantManager'));
const GlobalAnalytics = lazy(() => import('../pages/master/GlobalAnalytics'));
const SystemHealth = lazy(() => import('../pages/master/SystemHealth'));
const BillingManager = lazy(() => import('../pages/master/BillingManager'));

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================
const AppRoutes = () => {
    const { tenant, isLandingPage, isMasterAdmin } = useTenant();
    const { isAuthenticated } = useAuth();
    
    // Show landing page if no tenant
    if (isLandingPage) {
        return (
            <Suspense fallback={<LoadingScreen />}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        );
    }
    
    // Master admin routes
    if (isMasterAdmin) {
        return (
            <Suspense fallback={<LoadingScreen />}>
                <Routes>
                    {/* Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    
                    {/* Protected Master Routes */}
                    <Route element={<ProtectedRoute requireAuth={true} requireRole="master" />}>
                        <Route element={<Layout />}>
                            <Route path="/" element={<MasterDashboard />} />
                            <Route path="/tenants" element={<TenantManager />} />
                            <Route path="/analytics" element={<GlobalAnalytics />} />
                            <Route path="/system" element={<SystemHealth />} />
                            <Route path="/billing" element={<BillingManager />} />
                        </Route>
                    </Route>
                    
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        );
    }
    
    // Regular tenant routes
    return (
        <Suspense fallback={<LoadingScreen />}>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<CustomerMenu />} />
                <Route path="/menu" element={<CustomerMenu />} />
                <Route path="/order-status/:orderId" element={<OrderStatus />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                
                {/* Customer Protected Routes */}
                <Route element={<ProtectedRoute requireAuth={true} />}>
                    <Route element={<Layout />}>
                        <Route path="/account" element={<CustomerDashboard />} />
                        <Route path="/account/orders" element={<OrderHistory />} />
                        <Route path="/account/profile" element={<Profile />} />
                        <Route path="/checkout" element={<Checkout />} />
                    </Route>
                </Route>
                
                {/* Staff Protected Routes */}
                <Route element={<ProtectedRoute requireAuth={true} requireRole="staff" />}>
                    <Route element={<Layout variant="staff" />}>
                        <Route path="/staff" element={<OrderQueue />} />
                        <Route path="/staff/kitchen" element={<KitchenDisplay />} />
                    </Route>
                </Route>
                
                {/* Admin Protected Routes */}
                <Route element={<ProtectedRoute requireAuth={true} requireRole="admin" />}>
                    <Route element={<Layout variant="admin" />}>
                        {/* Dashboard */}
                        <Route path="/admin" element={<AdminDashboard />} />
                        
                        {/* Order Management */}
                        <Route path="/admin/orders" element={<OrderManagement />} />
                        
                        {/* Product Management */}
                        <Route path="/admin/products" element={<ProductManagement />} />
                        <Route path="/admin/categories" element={<CategoryManagement />} />
                        
                        {/* Inventory (if feature enabled) */}
                        {tenant?.features?.inventory && (
                            <Route path="/admin/inventory" element={<InventoryDashboard />} />
                        )}
                        
                        {/* Customer Management */}
                        <Route path="/admin/customers" element={<CustomerManagement />} />
                        
                        {/* Marketing */}
                        <Route path="/admin/discounts" element={<DiscountManager />} />
                        {tenant?.features?.loyalty && (
                            <Route path="/admin/loyalty" element={<LoyaltyProgram />} />
                        )}
                        
                        {/* Analytics & Reports */}
                        <Route path="/admin/analytics" element={<Analytics />} />
                        <Route path="/admin/reports" element={<Reports />} />
                        
                        {/* Settings */}
                        <Route path="/admin/settings/*" element={<Settings />} />
                    </Route>
                </Route>
                
                {/* 404 */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
};

// ============================================================================
// EXPORT
// ============================================================================
export default AppRoutes;