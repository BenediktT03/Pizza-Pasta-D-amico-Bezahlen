/**
 * EATECH - Protected Route Component
 * Version: 5.0.0
 * Description: Route Guard für geschützte Bereiche mit Role-based Access Control
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/routes/ProtectedRoute.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import LoadingScreen from '../components/common/LoadingScreen';
import AccessDenied from '../components/common/AccessDenied';

// ============================================================================
// COMPONENT
// ============================================================================
const ProtectedRoute = ({ 
    requireAuth = true, 
    requireRole = null,
    requirePermission = null,
    redirectTo = '/login'
}) => {
    const location = useLocation();
    const { user, loading: authLoading, hasRole, hasPermission } = useAuth();
    const { tenant, loading: tenantLoading } = useTenant();
    
    // Show loading while checking auth/tenant
    if (authLoading || tenantLoading) {
        return <LoadingScreen />;
    }
    
    // Check authentication
    if (requireAuth && !user) {
        // Redirect to login with return URL
        return (
            <Navigate 
                to={redirectTo} 
                state={{ from: location.pathname }} 
                replace 
            />
        );
    }
    
    // Check role requirement
    if (requireRole && !hasRole(requireRole)) {
        return <AccessDenied requiredRole={requireRole} />;
    }
    
    // Check permission requirement
    if (requirePermission && !hasPermission(requirePermission)) {
        return <AccessDenied requiredPermission={requirePermission} />;
    }
    
    // Check tenant-specific access
    if (tenant?.status === 'suspended') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center p-8">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Account Suspended
                    </h1>
                    <p className="text-gray-400 mb-8">
                        This account has been temporarily suspended. 
                        Please contact support for assistance.
                    </p>
                    <a 
                        href="mailto:support@eatech.ch"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Contact Support
                    </a>
                </div>
            </div>
        );
    }
    
    // All checks passed, render child routes
    return <Outlet />;
};

// ============================================================================
// EXPORT
// ============================================================================
export default ProtectedRoute;