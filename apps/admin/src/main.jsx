/**
 * EATECH - Admin App Entry Point
 * Version: 14.0.0
 * Description: Main entry point for Admin Dashboard
 * Author: EATECH Development Team
 * Created: 2025-07-04
 * File Path: /apps/admin/src/main.jsx
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Create root and render app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);