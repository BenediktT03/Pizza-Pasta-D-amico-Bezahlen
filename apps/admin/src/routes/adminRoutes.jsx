/**
 * EATECH - Admin Routes Configuration
 * Version: 24.0.0
 * Description: Zentrale Routing-Konfiguration für Admin Dashboard
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/routes/adminRoutes.jsx
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout
import AdminLayout from '../layouts/AdminLayout';

// Dashboard
import Dashboard from '../pages/Dashboard/Dashboard';

// Products
import ProductList from '../pages/Products/ProductList';
import ProductEdit from '../pages/Products/ProductEdit';

// Orders
import OrderList from '../pages/Orders/OrderList';
import OrderDetail from '../pages/Orders/OrderDetail';

// Customers
import CustomerList from '../pages/Customers/CustomerList';
import CustomerDetail from '../pages/Customers/CustomerDetail';

// Kitchen
import KitchenDisplay from '../pages/Kitchen/KitchenDisplay';

// Analytics
import Analytics from '../pages/Analytics/Analytics';
import SalesAnalytics from '../pages/Analytics/SalesAnalytics';
import CustomerAnalytics from '../pages/Analytics/CustomerAnalytics';
import ProductAnalytics from '../pages/Analytics/ProductAnalytics';

// Billing
import BillingDashboard from '../pages/billing/BillingDashboard';
import Invoices from '../pages/billing/Invoices';
import Subscriptions from '../pages/billing/Subscriptions';

// Loyalty
import LoyaltyProgram from '../pages/loyalty/LoyaltyProgram';
import LoyaltyMembers from '../pages/loyalty/LoyaltyMembers';
import LoyaltyRewards from '../pages/loyalty/LoyaltyRewards';

// Discounts
import DiscountManager from '../pages/discounts/DiscountManager';
import DiscountEdit from '../pages/discounts/DiscountEdit';

// Settings
import Settings from '../pages/Settings/Settings';
import GeneralSettings from '../pages/Settings/GeneralSettings';
import PaymentSettings from '../pages/Settings/PaymentSettings';
import DeliverySettings from '../pages/Settings/DeliverySettings';
import NotificationSettings from '../pages/Settings/NotificationSettings';

// Reports
import ReportGenerator from '../pages/reports/ReportGenerator';
import ReportHistory from '../pages/reports/ReportHistory';
import ScheduledReports from '../pages/reports/ScheduledReports';

// Notifications
import NotificationCenter from '../pages/notifications/NotificationCenter';
import NotificationTemplates from '../pages/notifications/NotificationTemplates';

// Email Templates (NEU!)
import { 
  EmailTemplatesList, 
  EmailTemplateEditor, 
  EmailTemplatePreview 
} from '../pages/email-templates';

// Master Admin
import MasterDashboard from '../pages/master/MasterDashboard';
import TenantManagement from '../pages/master/TenantManagement';
import SystemMetrics from '../pages/master/SystemMetrics';
import BillingOverview from '../pages/master/BillingOverview';
import GlobalSettings from '../pages/master/GlobalSettings';

// Auth
import Login from '../pages/auth/Login';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

const AdminRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes (ohne Layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin Routes (mit Layout) */}
      <Route element={<AdminLayout />}>
        {/* Dashboard */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Products */}
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductEdit />} />
        <Route path="products/edit/:id" element={<ProductEdit />} />

        {/* Orders */}
        <Route path="orders" element={<OrderList />} />
        <Route path="orders/:id" element={<OrderDetail />} />

        {/* Customers */}
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/:id" element={<CustomerDetail />} />

        {/* Kitchen Display */}
        <Route path="kitchen" element={<KitchenDisplay />} />

        {/* Analytics */}
        <Route path="analytics" element={<Analytics />} />
        <Route path="analytics/sales" element={<SalesAnalytics />} />
        <Route path="analytics/customers" element={<CustomerAnalytics />} />
        <Route path="analytics/products" element={<ProductAnalytics />} />

        {/* Billing */}
        <Route path="billing" element={<BillingDashboard />} />
        <Route path="billing/invoices" element={<Invoices />} />
        <Route path="billing/subscriptions" element={<Subscriptions />} />

        {/* Loyalty Program */}
        <Route path="loyalty" element={<LoyaltyProgram />} />
        <Route path="loyalty/members" element={<LoyaltyMembers />} />
        <Route path="loyalty/rewards" element={<LoyaltyRewards />} />

        {/* Discounts */}
        <Route path="discounts" element={<DiscountManager />} />
        <Route path="discounts/new" element={<DiscountEdit />} />
        <Route path="discounts/edit/:id" element={<DiscountEdit />} />

        {/* Reports */}
        <Route path="reports" element={<ReportGenerator />} />
        <Route path="reports/history" element={<ReportHistory />} />
        <Route path="reports/scheduled" element={<ScheduledReports />} />

        {/* Notifications */}
        <Route path="notifications" element={<NotificationCenter />} />
        <Route path="notifications/templates" element={<NotificationTemplates />} />

        {/* Email Templates - NEU! */}
        <Route path="email-templates" element={<EmailTemplatesList />} />
        <Route path="email-templates/new" element={<EmailTemplateEditor />} />
        <Route path="email-templates/edit/:id" element={<EmailTemplateEditor />} />
        <Route path="email-templates/preview/:id" element={<EmailTemplatePreview />} />

        {/* Settings */}
        <Route path="settings" element={<Settings />} />
        <Route path="settings/general" element={<GeneralSettings />} />
        <Route path="settings/payment" element={<PaymentSettings />} />
        <Route path="settings/delivery" element={<DeliverySettings />} />
        <Route path="settings/notifications" element={<NotificationSettings />} />

        {/* Master Admin */}
        <Route path="master" element={<MasterDashboard />} />
        <Route path="master/tenants" element={<TenantManagement />} />
        <Route path="master/tenants/:id" element={<TenantManagement />} />
        <Route path="master/metrics" element={<SystemMetrics />} />
        <Route path="master/billing" element={<BillingOverview />} />
        <Route path="master/settings" element={<GlobalSettings />} />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes;