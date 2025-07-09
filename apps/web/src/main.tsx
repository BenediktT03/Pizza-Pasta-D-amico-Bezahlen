import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import './styles/globals.css'

// Initialize services
import './config/firebase'
import './services/monitoring'
import { registerServiceWorker } from './services/pwa'

// i18n
import './services/i18n'

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 2,
    },
  },
})

// Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Send to error monitoring service
    if (window.Sentry) {
      window.Sentry.captureException(error)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Oops! Something went wrong.</h1>
          <p>We're sorry for the inconvenience. Please refresh the page.</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      )
    }

    return this.props.children
  }
}

// Check if app is running in standalone mode (PWA)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
if (isStandalone) {
  document.documentElement.classList.add('pwa-standalone')
}

// Initialize app
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerServiceWorker()
}

// Handle app install prompt
let deferredPrompt: any
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  // Show install button or banner
  const installBanner = document.getElementById('install-banner')
  if (installBanner) {
    installBanner.style.display = 'block'
  }
})

// Export for use in other components
export { deferredPrompt }

// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.accept()
}
