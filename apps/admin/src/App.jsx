/**
 * EATECH - Admin App Main Component
 * File Path: /apps/admin/src/App.jsx
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          {/* Weitere Routes hier */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;