/**
 * EATECH - Notification Routes
 * Version: 23.0.0
 * Description: Routing-Konfiguration für das Notification-Modul
 * File Path: /apps/admin/src/routes/NotificationRoutes.jsx
 */

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Lazy load notification components
const NotificationCenter = lazy(() => import('../pages/notifications/NotificationCenter'));
const NotificationTemplates = lazy(() => import('../pages/notifications/NotificationTemplates'));
const NotificationHistory = lazy(() => import('../pages/notifications/NotificationHistory'));
const NotificationSettings = lazy(() => import('../pages/notifications/NotificationSettings'));

// ============================================================================
// COMPONENT
// ============================================================================
const NotificationRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        {/* Default redirect */}
        <Route index element={<Navigate to="center" replace />} />
        
        {/* Notification Center */}
        <Route path="center" element={<NotificationCenter />} />
        
        {/* Notification Templates */}
        <Route path="templates" element={<NotificationTemplates />} />
        
        {/* Notification History */}
        <Route path="history" element={<NotificationHistory />} />
        
        {/* Notification Settings */}
        <Route path="settings" element={<NotificationSettings />} />
        
        {/* Notification Details */}
        <Route path=":id" element={<NotificationCenter />} />
        
        {/* Catch all - redirect to center */}
        <Route path="*" element={<Navigate to="center" replace />} />
      </Routes>
    </Suspense>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default NotificationRoutes;