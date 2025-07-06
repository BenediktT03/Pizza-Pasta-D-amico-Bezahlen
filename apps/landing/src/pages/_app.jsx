/**
 * EATECH - Landing Page App
 * Version: 2.0.0
 * Description: Next.js App Component für die Landing Page mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/landing/src/pages/_app.jsx
 */

import React, { useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { AnimatePresence, motion } from 'framer-motion';

// Lazy load global styles
const loadGlobalStyles = () => import('../styles/globals.css');

// Lazy load analytics
const Analytics = lazy(() => import('../components/Analytics'));
const CookieBanner = lazy(() => import('../components/CookieBanner'));

// Loading fallback
const PageLoading = () => (
  <div className="page-loading">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="loading-container"
    >
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
      <p className="loading-text">Lade EATECH...</p>
    </motion.div>
    <style jsx>{`
      .page-loading {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        z-index: 9999;
      }
      .loading-container {
        text-align: center;
      }
      .loading-spinner {
        display: inline-block;
        width: 50px;
        height: 50px;
        margin-bottom: 16px;
      }
      .spinner {
        width: 100%;
        height: 100%;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #ff6b6b;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .loading-text {
        font-size: 16px;
        color: #666;
        margin: 0;
      }
    `}</style>
  </div>
);

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20
  },
  in: {
    opacity: 1,
    y: 0
  },
  out: {
    opacity: 0,
    y: -20
  }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4
};

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Load global styles
  useEffect(() => {
    loadGlobalStyles();
  }, []);

  // Preload critical routes after initial load
  useEffect(() => {
    const preloadCriticalRoutes = async () => {
      // Preload frequently accessed pages
      const routes = [
        () => import('../pages/features'),
        () => import('../pages/pricing'),
        () => import('../pages/contact')
      ];
      
      // Stagger preloading to avoid blocking
      for (const route of routes) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route().catch(() => {}); // Silently fail if route doesn't exist
      }
    };

    // Start preloading after 2 seconds
    const timer = setTimeout(preloadCriticalRoutes, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Performance monitoring
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            // Log performance metrics
            if (entry.entryType === 'navigation') {
              console.log('Page Performance:', {
                path: router.pathname,
                loadTime: entry.loadEventEnd - entry.fetchStart,
                domContentLoaded: entry.domContentLoadedEventEnd - entry.fetchStart,
                firstPaint: entry.responseEnd - entry.fetchStart
              });
            }
          });
        });
        
        observer.observe({ entryTypes: ['navigation', 'resource'] });
        
        return () => observer.disconnect();
      } catch (e) {
        console.warn('Performance monitoring not available');
      }
    }
  }, [router.pathname]);

  // Handle route change loading state
  const [isChanging, setIsChanging] = React.useState(false);

  useEffect(() => {
    const handleStart = () => setIsChanging(true);
    const handleComplete = () => setIsChanging(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#ff6b6b" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* Default meta tags */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="EATECH" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </Head>

      <AnimatePresence mode="wait">
        {isChanging ? (
          <PageLoading key="loading" />
        ) : (
          <motion.div
            key={router.pathname}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{ minHeight: '100vh' }}
          >
            <Suspense fallback={<PageLoading />}>
              <Component {...pageProps} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lazy loaded components */}
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
      
      <Suspense fallback={null}>
        <CookieBanner />
      </Suspense>

      {/* Performance hint for critical resources */}
      <Head>
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </Head>
    </>
  );
}

export default MyApp;