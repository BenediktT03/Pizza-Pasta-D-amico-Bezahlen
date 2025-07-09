/**
 * EATECH Main Layout Component
 * 
 * Haupt-Layout-Wrapper für alle Seiten.
 * Features:
 * - Responsive Design
 * - PWA-optimiert
 * - Offline-Support Anzeige
 * - Theme-System Integration
 * - Accessibility Features
 * - Feature Flags
 */

import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import {
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';

// Core imports
import { useTheme } from '@eatech/core/hooks/useTheme';
import { useOnlineStatus } from '@eatech/core/hooks/useOnlineStatus';
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { useTruck } from '@eatech/core/hooks/useTruck';
import { useScrollPosition } from '@eatech/core/hooks/useScrollPosition';

// UI imports
import { Alert, Button, Container } from '@eatech/ui';

// Local components
import { Header } from '../common/Header';
import { Footer } from '../common/Footer';
import { CookieBanner } from '../common/CookieBanner';
import { PWAInstallPrompt } from '../common/PWAInstallPrompt';
import { MaintenanceBanner } from '../common/MaintenanceBanner';
import { UpdateNotification } from '../common/UpdateNotification';

// Services
import { analyticsService } from '../../services/analytics.service';

// Styles
import styles from './Layout.module.css';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { truckId } = useParams<{ truckId: string }>();
  const { theme } = useTheme();
  const isOnline = useOnlineStatus();
  const scrollPosition = useScrollPosition();
  
  // Feature Flags
  const { enabled: cookieBannerEnabled } = useFeatureFlag('cookie_banner');
  const { enabled: pwaPromptEnabled } = useFeatureFlag('pwa_install_prompt');
  const { enabled: maintenanceModeEnabled } = useFeatureFlag('maintenance_mode');
  const { enabled: scrollToTopEnabled } = useFeatureFlag('scroll_to_top');
  const { enabled: offlineIndicatorEnabled } = useFeatureFlag('offline_indicator');
  const { enabled: updateNotificationsEnabled } = useFeatureFlag('update_notifications');
  
  // State
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Get truck info if on truck-specific page
  const { truck } = useTruck(truckId);
  
  // Track page views
  useEffect(() => {
    analyticsService.trackPageView(location.pathname, {
      truckId,
      referrer: document.referrer
    });
  }, [location.pathname, truckId]);
  
  // Handle responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Handle scroll to top button visibility
  useEffect(() => {
    setShowScrollTop(scrollPosition > 300);
  }, [scrollPosition]);
  
  // Apply theme classes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.id);
    
    // Apply theme colors as CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    });
  }, [theme]);
  
  // Handle back to top
  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Check if it's a fullscreen page (no header/footer)
  const isFullscreenPage = [
    '/checkout',
    '/order/',
    '/kitchen',
    '/voice-order'
  ].some(path => location.pathname.includes(path));
  
  // Check if it's an embedded view
  const isEmbedded = new URLSearchParams(location.search).has('embedded');
  
  return (
    <div className={`${styles.layout} ${isMobile ? styles.mobile : ''}`}>
      {/* Skip to main content (accessibility) */}
      <a href="#main-content" className={styles.skipLink}>
        {t('layout.skipToContent')}
      </a>
      
      {/* Maintenance Banner */}
      {maintenanceModeEnabled && !isEmbedded && (
        <MaintenanceBanner />
      )}
      
      {/* Offline Indicator */}
      {offlineIndicatorEnabled && !isOnline && (
        <div className={styles.offlineIndicator}>
          <Alert variant="warning" size="sm">
            <WifiIcon className="w-4 h-4" />
            <span>{t('layout.offlineMode')}</span>
          </Alert>
        </div>
      )}
      
      {/* Header */}
      {!isFullscreenPage && !isEmbedded && (
        <Header truck={truck} />
      )}
      
      {/* Main Content */}
      <main 
        id="main-content"
        className={`${styles.main} ${isFullscreenPage ? styles.fullscreen : ''}`}
        role="main"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children || <Outlet />}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Footer */}
      {!isFullscreenPage && !isEmbedded && (
        <Footer truck={truck} />
      )}
      
      {/* Scroll to Top Button */}
      {scrollToTopEnabled && showScrollTop && (
        <motion.div
          className={styles.scrollToTop}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <Button
            variant="primary"
            size="sm"
            onClick={handleScrollToTop}
            aria-label={t('layout.scrollToTop')}
            className={styles.scrollButton}
          >
            <ArrowUpIcon className="w-5 h-5" />
          </Button>
        </motion.div>
      )}
      
      {/* Cookie Banner */}
      {cookieBannerEnabled && !isEmbedded && (
        <CookieBanner />
      )}
      
      {/* PWA Install Prompt */}
      {pwaPromptEnabled && !isEmbedded && (
        <PWAInstallPrompt />
      )}
      
      {/* Update Notifications */}
      {updateNotificationsEnabled && (
        <UpdateNotification />
      )}
      
      {/* Toast Notifications */}
      <Toaster
        position={isMobile ? 'bottom-center' : 'top-right'}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)'
          },
          success: {
            iconTheme: {
              primary: 'var(--color-success)',
              secondary: 'white'
            }
          },
          error: {
            iconTheme: {
              primary: 'var(--color-error)',
              secondary: 'white'
            }
          }
        }}
      />
      
      {/* Development Mode Indicator */}
      {import.meta.env.DEV && (
        <div className={styles.devIndicator}>
          <Badge variant="warning" size="sm">
            DEV MODE
          </Badge>
        </div>
      )}
    </div>
  );
};

// Sub-layouts for specific sections
export const AdminLayout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  
  return (
    <div className={styles.adminLayout}>
      <div className={styles.adminSidebar}>
        {/* Admin navigation would go here */}
      </div>
      <div className={styles.adminContent}>
        {children || <Outlet />}
      </div>
    </div>
  );
};

export const KitchenLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.kitchenLayout}>
      {children || <Outlet />}
    </div>
  );
};

export const MasterLayout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  return (
    <div className={`${styles.masterLayout} ${sidebarCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.masterSidebar}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={styles.collapseButton}
        >
          {sidebarCollapsed ? '→' : '←'}
        </Button>
        {/* Master admin navigation */}
      </div>
      <div className={styles.masterContent}>
        {children || <Outlet />}
      </div>
    </div>
  );
};

// Layout Context for nested components
interface LayoutContextValue {
  isFullscreen: boolean;
  isEmbedded: boolean;
  isMobile: boolean;
}

const LayoutContext = React.createContext<LayoutContextValue>({
  isFullscreen: false,
  isEmbedded: false,
  isMobile: false
});

export const useLayout = () => React.useContext(LayoutContext);

// Export default
export default Layout;