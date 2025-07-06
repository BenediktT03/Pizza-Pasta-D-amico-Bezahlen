/**
 * EATECH Master Protected Route Component
 * Version: 1.0.0
 * 
 * Schützt Master-Routen vor unautorisierten Zugriffen
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/components/ProtectedRoute.jsx
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMasterAuth } from '../hooks/useMasterAuth';
import { Loader } from 'lucide-react';
import styles from './ProtectedRoute.module.css';

const ProtectedRoute = ({ children, requireMaster = true }) => {
  const { user, loading, isMaster } = useMasterAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader className={styles.spinner} />
        <p>Verifiziere Zugriffsberechtigung...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/master/login" state={{ from: location }} replace />;
  }

  // Not a master admin
  if (requireMaster && !isMaster) {
    return (
      <div className={styles.unauthorizedContainer}>
        <h1>403 - Zugriff verweigert</h1>
        <p>Sie haben keine Berechtigung für diesen Bereich.</p>
        <button onClick={() => window.location.href = '/'}>
          Zurück zur Hauptseite
        </button>
      </div>
    );
  }

  // Authorized - render children
  return children;
};

export default ProtectedRoute;