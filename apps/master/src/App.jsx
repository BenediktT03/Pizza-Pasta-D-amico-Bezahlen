/**
 * EATECH Master App
 * Version: 1.0.0
 * 
 * Hauptkomponente für die Master Control Application
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/App.jsx
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MasterAuthProvider } from './hooks/useMasterAuth';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TenantControl from './pages/TenantControl/TenantControl';
import SystemMetrics from './pages/SystemMetrics/SystemMetrics';
import GlobalSettings from './pages/GlobalSettings/GlobalSettings';
import RevenueTracking from './pages/RevenueTracking/RevenueTracking';
import FeatureControl from './pages/FeatureControl/FeatureControl';
import AlertCenter from './pages/AlertCenter/AlertCenter';

// Layout
import MasterLayout from './layouts/MasterLayout';

// Styles
import './styles/global.css';

function App() {
  return (
    <Router>
      <MasterAuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/master/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route
            path="/master/*"
            element={
              <ProtectedRoute>
                <MasterLayout>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="tenants" element={<TenantControl />} />
                    <Route path="metrics" element={<SystemMetrics />} />
                    <Route path="revenue" element={<RevenueTracking />} />
                    <Route path="features" element={<FeatureControl />} />
                    <Route path="alerts" element={<AlertCenter />} />
                    <Route path="settings" element={<GlobalSettings />} />
                    <Route path="*" element={<Navigate to="/master/dashboard" replace />} />
                  </Routes>
                </MasterLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/master/login" replace />} />
        </Routes>
      </MasterAuthProvider>
    </Router>
  );
}

export default App;