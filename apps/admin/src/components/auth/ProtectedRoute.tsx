import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@eatech/core/hooks/useAuth';
import { LoadingScreen } from '@eatech/ui/components/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = '/login',
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirements if specified
  if (requiredRole && requiredRole.length > 0) {
    const userRole = user?.role || 'staff';
    if (!requiredRole.includes(userRole)) {
      // Redirect to dashboard if user doesn't have required role
      return <Navigate to="/" replace />;
    }
  }

  // Check if user is blocked or suspended
  if (user?.status === 'blocked' || user?.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Konto gesperrt
          </h2>
          <p className="text-gray-600 mb-6">
            Ihr Konto wurde vorübergehend gesperrt. Bitte kontaktieren Sie den Support für weitere Informationen.
          </p>
          <a
            href="mailto:support@eatech.ch"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Support kontaktieren
          </a>
        </div>
      </div>
    );
  }

  // Check if email is verified (if required)
  if (user && !user.emailVerified && process.env.REACT_APP_REQUIRE_EMAIL_VERIFICATION === 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            E-Mail-Bestätigung erforderlich
          </h2>
          <p className="text-gray-600 mb-6">
            Bitte bestätigen Sie Ihre E-Mail-Adresse, um fortzufahren. Wir haben Ihnen eine Bestätigungs-E-Mail an <strong>{user.email}</strong> gesendet.
          </p>
          <button
            onClick={() => user.sendEmailVerification()}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            E-Mail erneut senden
          </button>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
};
