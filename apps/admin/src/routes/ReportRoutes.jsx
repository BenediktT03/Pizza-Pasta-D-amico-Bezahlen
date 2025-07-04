/**
 * EATECH - Report Routes
 * Version: 23.0.0
 * Description: Routing-Konfiguration für das Report-Modul
 * File Path: /apps/admin/src/routes/ReportRoutes.jsx
 */

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Lazy load report components
const ReportGenerator = lazy(() => import('../pages/reports/ReportGenerator'));
const ReportTemplates = lazy(() => import('../pages/reports/ReportTemplates'));
const ScheduledReports = lazy(() => import('../pages/reports/ScheduledReports'));
const ReportHistory = lazy(() => import('../pages/reports/ReportHistory'));

// ============================================================================
// COMPONENT
// ============================================================================
const ReportRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        {/* Default redirect */}
        <Route index element={<Navigate to="generate" replace />} />
        
        {/* Report Generator */}
        <Route path="generate" element={<ReportGenerator />} />
        
        {/* Report Templates */}
        <Route path="templates" element={<ReportTemplates />} />
        
        {/* Scheduled Reports */}
        <Route path="scheduled" element={<ScheduledReports />} />
        <Route path="scheduled/:id" element={<ScheduledReports />} />
        
        {/* Report History */}
        <Route path="history" element={<ReportHistory />} />
        
        {/* Catch all - redirect to generator */}
        <Route path="*" element={<Navigate to="generate" replace />} />
      </Routes>
    </Suspense>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default ReportRoutes;