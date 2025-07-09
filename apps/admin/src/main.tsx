import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from '@eatech/core/providers/AuthProvider';
import { ThemeProvider } from '@eatech/ui/providers/ThemeProvider';
import { FeatureFlagProvider } from '@eatech/core/providers/FeatureFlagProvider';
import { RealtimeProvider } from '@eatech/core/providers/RealtimeProvider';
import { TenantProvider } from '@eatech/core/providers/TenantProvider';
import { LocalizationProvider } from '@eatech/core/providers/LocalizationProvider';
import { register as registerServiceWorker } from './serviceWorkerRegistration';
import { initializeFirebase } from '@eatech/core/services/firebase';
import { initializeSentry } from '@eatech/core/services/monitoring/sentry';
import { initializeAnalytics } from '@eatech/core/services/analytics';
import App from './App';
import './styles/globals.css';
import '@eatech/ui/styles/base.css';

// Initialize Firebase
initializeFirebase();

// Initialize monitoring and analytics
if (import.meta.env.PROD) {
  initializeSentry({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_APP_ENV || 'production',
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  initializeAnalytics({
    plausibleDomain: import.meta.env.VITE_PLAUSIBLE_DOMAIN,
    plausibleApiHost: import.meta.env.VITE_PLAUSIBLE_API_HOST,
  });
}

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});

// Error Fallback Component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
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
        <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
          Etwas ist schiefgelaufen
        </h2>
        <p className="mt-2 text-sm text-center text-gray-600">
          {error.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Erneut versuchen
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Zur Startseite
          </button>
        </div>
        {import.meta.env.DEV && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-500">
              Technische Details
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

// Hide loading screen
const hideLoadingScreen = () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 300);
  }
};

// Root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Remove no-js class
rootElement.classList.remove('no-js');

// Create React root
const root = ReactDOM.createRoot(rootElement);

// Render app
root.render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Error boundary caught:', error, errorInfo);
        if (import.meta.env.PROD) {
          // Log to Sentry in production
          window.Sentry?.captureException(error, {
            contexts: { react: { componentStack: errorInfo.componentStack } },
          });
        }
      }}
    >
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <LocalizationProvider defaultLanguage="de">
            <ThemeProvider>
              <AuthProvider>
                <TenantProvider>
                  <FeatureFlagProvider>
                    <RealtimeProvider>
                      <App onLoad={hideLoadingScreen} />
                      <Toaster
                        position="top-right"
                        toastOptions={{
                          duration: 4000,
                          style: {
                            background: '#333',
                            color: '#fff',
                          },
                          success: {
                            iconTheme: {
                              primary: '#10B981',
                              secondary: '#fff',
                            },
                          },
                          error: {
                            iconTheme: {
                              primary: '#EF4444',
                              secondary: '#fff',
                            },
                          },
                        }}
                      />
                    </RealtimeProvider>
                  </FeatureFlagProvider>
                </TenantProvider>
              </AuthProvider>
            </ThemeProvider>
          </LocalizationProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for PWA
if (import.meta.env.PROD) {
  registerServiceWorker({
    onUpdate: (registration) => {
      const waitingServiceWorker = registration.waiting;

      if (waitingServiceWorker) {
        waitingServiceWorker.addEventListener('statechange', (event) => {
          if ((event.target as ServiceWorker).state === 'activated') {
            window.location.reload();
          }
        });
        waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
      }
    },
  });
}

// Hot Module Replacement
if (import.meta.env.DEV && import.meta.hot) {
  import.meta.hot.accept();
}

// Performance monitoring
if (import.meta.env.PROD && 'performance' in window) {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    // Log performance metrics
    console.log('Performance metrics:', {
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
    });
    
    // Send to analytics
    if (window.plausible) {
      window.plausible('Performance', {
        props: {
          loadTime: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
          domReady: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
        },
      });
    }
  });
}
