/**
 * EATECH - Billing Routes Integration
 * Version: 21.0.0
 * Description: Route-Konfiguration für das Billing System
 * File Path: /apps/admin/src/routes/billing.routes.jsx
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';

// Billing Components
import BillingDashboard from '../pages/billing/BillingDashboard';
import SubscriptionManager from '../pages/billing/components/SubscriptionManager';
import InvoiceGenerator from '../pages/billing/components/InvoiceGenerator';
import PaymentProcessor from '../pages/billing/components/PaymentProcessor';
import StripeWebhookHandler from '../pages/billing/components/StripeWebhookHandler';

// ============================================================================
// BILLING ROUTES
// ============================================================================
const BillingRoutes = () => {
  return (
    <Routes>
      {/* Main Billing Dashboard */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute requiredRole="admin">
            <BillingDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Subscriptions */}
      <Route 
        path="/subscriptions" 
        element={
          <ProtectedRoute requiredRole="admin">
            <BillingDashboard defaultTab="subscriptions" />
          </ProtectedRoute>
        } 
      />
      
      {/* Manage specific subscription */}
      <Route 
        path="/subscriptions/:subscriptionId" 
        element={
          <ProtectedRoute requiredRole="admin">
            <SubscriptionManager />
          </ProtectedRoute>
        } 
      />
      
      {/* Invoices */}
      <Route 
        path="/invoices" 
        element={
          <ProtectedRoute requiredRole="admin">
            <BillingDashboard defaultTab="invoices" />
          </ProtectedRoute>
        } 
      />
      
      {/* Create/View Invoice */}
      <Route 
        path="/invoices/new" 
        element={
          <ProtectedRoute requiredRole="admin">
            <InvoiceGenerator />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/invoices/:invoiceId" 
        element={
          <ProtectedRoute requiredRole="admin">
            <InvoiceGenerator />
          </ProtectedRoute>
        } 
      />
      
      {/* Payments */}
      <Route 
        path="/payments" 
        element={
          <ProtectedRoute requiredRole="admin">
            <PaymentProcessor />
          </ProtectedRoute>
        } 
      />
      
      {/* Payouts */}
      <Route 
        path="/payouts" 
        element={
          <ProtectedRoute requiredRole="admin">
            <BillingDashboard defaultTab="payouts" />
          </ProtectedRoute>
        } 
      />
      
      {/* Webhook Management */}
      <Route 
        path="/webhooks" 
        element={
          <ProtectedRoute requiredRole="admin">
            <StripeWebhookHandler />
          </ProtectedRoute>
        } 
      />
      
      {/* Settings */}
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute requiredRole="admin">
            <BillingDashboard defaultTab="settings" />
          </ProtectedRoute>
        } 
      />
      
      {/* Redirect to main billing page */}
      <Route path="*" element={<Navigate to="/admin/billing" replace />} />
    </Routes>
  );
};

export default BillingRoutes;