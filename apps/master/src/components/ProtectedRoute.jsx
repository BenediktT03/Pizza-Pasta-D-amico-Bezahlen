import React from 'react';
import { useMasterAuth } from '../hooks/useMasterAuth';
import LoadingScreen from './common/LoadingScreen';

const ProtectedRoute = ({ children, requiredRole = null, onUnauthorized }) => {
  const { user, isLoading, isAuthenticated } = useMasterAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen fullScreen message="Authentifizierung wird überprüft..." />;
  }

  // Handle unauthenticated users
  if (!isAuthenticated) {
    if (onUnauthorized) {
      onUnauthorized();
    }
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#cbd5e1',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '800',
          marginBottom: '1rem',
          color: '#f1f5f9'
        }}>
          Nicht authentifiziert
        </h1>
        <p style={{
          fontSize: '1.125rem',
          marginBottom: '2rem'
        }}>
          Bitte melden Sie sich an, um fortzufahren.
        </p>
        <button
          onClick={() => window.location.href = '/master/login'}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Zur Anmeldung
        </button>
      </div>
    );
  }

  // Check role requirements if specified
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#cbd5e1',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '800',
          marginBottom: '1rem',
          color: '#f1f5f9'
        }}>
          Zugriff verweigert
        </h1>
        <p style={{
          fontSize: '1.125rem',
          marginBottom: '2rem'
        }}>
          Sie haben nicht die erforderlichen Berechtigungen für diese Seite.
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Zurück
        </button>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
};

export default ProtectedRoute;