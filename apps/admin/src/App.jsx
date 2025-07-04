/**
 * EATECH - Admin App Root Component
 * Version: 14.0.0
 * Description: Root component with routing and providers
 * Author: EATECH Development Team
 * Created: 2025-07-04
 * File Path: /apps/admin/src/App.jsx
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider } from '@eatech/core/contexts/TenantContext';
import { AuthProvider } from '@eatech/auth';
import Dashboard from './pages/Dashboard/Dashboard';
import './App.css';

// ============================================================================
// APP COMPONENT
// ============================================================================

function App() {
  return (
    <Router>
      <AuthProvider>
        <TenantProvider>
          <div className="app">
            <Routes>
              {/* Dashboard Route */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Other routes will be added here */}
              <Route path="/orders" element={<div>Orders Page (Coming Soon)</div>} />
              <Route path="/products" element={<div>Products Page (Coming Soon)</div>} />
              <Route path="/customers" element={<div>Customers Page (Coming Soon)</div>} />
              <Route path="/analytics" element={<div>Analytics Page (Coming Soon)</div>} />
              <Route path="/settings" element={<div>Settings Page (Coming Soon)</div>} />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </TenantProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;