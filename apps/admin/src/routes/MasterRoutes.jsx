/**
 * EATECH - Master Admin Routes
 * Version: 5.0.0
 * Description: Routing-Konfiguration für Master Admin Bereich
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/routes/MasterRoutes.jsx
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  MasterDashboard, 
  TenantManagement, 
  SystemMetrics, 
  BillingOverview, 
  GlobalSettings 
} from '../pages/master';
import ProtectedRoute from './ProtectedRoute';
import MasterLayout from '../layouts/MasterLayout';

// ============================================================================
// MASTER ROUTES COMPONENT
// ============================================================================

const MasterRoutes = () => {
  return (
    <Routes>
      {/* Master Admin Protected Routes */}
      <Route element={<ProtectedRoute requiredRole="master" />}>
        <Route element={<MasterLayout />}>
          {/* Dashboard */}
          <Route index element={<MasterDashboard />} />
          
          {/* Tenant Management */}
          <Route path="tenants" element={<MasterDashboard />} />
          <Route path="tenant/:tenantId" element={<TenantManagement />} />
          <Route path="tenant/:tenantId/edit" element={<TenantManagement />} />
          
          {/* System Monitoring */}
          <Route path="metrics" element={<SystemMetrics />} />
          
          {/* Billing */}
          <Route path="billing" element={<BillingOverview />} />
          
          {/* Settings */}
          <Route path="settings" element={<GlobalSettings />} />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/master" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default MasterRoutes;