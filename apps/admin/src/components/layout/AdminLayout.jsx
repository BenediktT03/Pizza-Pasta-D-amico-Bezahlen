/**
 * EATECH - Admin Layout Component
 * Version: 9.2.0
 * Description: Responsive Admin Dashboard Layout mit Lazy Loading & Real-time Features
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/components/Layout/AdminLayout.jsx
 * 
 * Features: Collapsible sidebar, real-time notifications, breadcrumbs, theme switcher
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Search, Bell, Settings, User, LogOut, 
  Home, Package, ShoppingCart, Users, BarChart3,
  Calendar, MapPin, Star, Gift, MessageSquare,
  CreditCard, Truck, Clock, TrendingUp, AlertCircle,
  ChevronRight, ChevronLeft, Maximize2, Minimize2,
  Moon, Sun, Palette, Globe, Shield, Zap, Wifi,
  WifiOff, RefreshCw, Download, Upload, HelpCircle
} from 'lucide-react';

// Hooks & Contexts
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../hooks/useTheme';

// Lazy loaded components
const Sidebar = lazy(() => import('./Sidebar'));
const Header = lazy(() => import('./Header'));
const NotificationCenter = lazy(() => import('./NotificationCenter'));
const QuickActions = lazy(() => import('./QuickActions'));
const BreadcrumbNav = lazy(() => import('./BreadcrumbNav'));
const SearchModal = lazy(() => import('./SearchModal'));
const UserMenu = lazy(() => import('./UserMenu'));
const ThemeCustomizer = lazy(() => import('./ThemeCustomizer'));
const NetworkStatus = lazy(() => import('./NetworkStatus'));
const SystemAlerts = lazy(() => import('./SystemAlerts'));
const PerformanceMonitor = lazy(() => import('./PerformanceMonitor'));
const KeyboardShortcuts = lazy(() => import('./KeyboardShortcuts'));

// Lazy loaded services
const realtimeService = () => import('../../services/realtimeService');
const notificationService = () => import('../../services/notificationService');
const analyticsService = () => import('../../services/analyticsService');
const performanceService = () => import('../../services/performanceService');
const keyboardService = () => import('../../services/keyboardService');

// Loading component
const LayoutSkeleton = () => (
  <div className="min-h-screen bg-gray-50 animate-pulse">
    <div className="h-16 bg-white border-b border-gray-200"></div>
    <div className="flex">
      <div className="w-64 h-screen bg-white border-r border-gray-200"></div>
      <div className="flex-1 p-6">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

// Navigation items configuration
const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/admin',
    icon: Home,
    badge: null,
    shortcut: '⌘ + D'
  },
  {
    id: 'orders',
    label: 'Orders',
    path: '/admin/orders',
    icon: ShoppingCart,
    badge: 'realtime',
    shortcut: '⌘ + O'
  },
  {
    id: 'products',
    label: 'Products',
    path: '/admin/products',
    icon: Package,
    shortcut: '⌘ + P',
    children: [
      { id: 'products-list', label: 'All Products', path: '/admin/products' },
      { id: 'products-categories', label: 'Categories', path: '/admin/categories' },
      { id: 'products-inventory', label: 'Inventory', path: '/admin/inventory' }
    ]
  },
  {
    id: 'customers',
    label: 'Customers',
    path: '/admin/customers',
    icon: Users,
    shortcut: '⌘ + U'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/admin/analytics',
    icon: BarChart3,
    shortcut: '⌘ + A'
  },
  {
    id: 'events',
    label: 'Events',
    path: '/admin/events',
    icon: Calendar,
    shortcut: '⌘ + E'
  },
  {
    id: 'staff',
    label: 'Staff',
    path: '/admin/staff',
    icon: User,
    shortcut: '⌘ + S'
  },
  {
    id: 'reviews',
    label: 'Reviews',
    path: '/admin/reviews',
    icon: Star,
    badge: 'notification'
  },
  {
    id: 'promotions',
    label: 'Promotions',
    path: '/admin/promotions',
    icon: Gift
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/admin/notifications',
    icon: Bell
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/admin/settings',
    icon: Settings,
    shortcut: '⌘ + ,'
  }
];

const AdminLayout = ({ children }) => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifications, setNotifications] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [realtimeBadges, setRealtimeBadges] = useState({});

  // Hooks
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tenant, updateTenant } = useTenant();
  const { theme, toggleTheme, updateTheme } = useTheme();

  // Lazy loaded services refs
  const realtimeServiceRef = React.useRef(null);
  const notificationServiceRef = React.useRef(null);
  const analyticsServiceRef = React.useRef(null);
  const performanceServiceRef = React.useRef(null);
  const keyboardServiceRef = React.useRef(null);

  // ============================================================================
  // LAZY LOADING SETUP
  // ============================================================================
  useEffect(() => {
    const initializeLazyServices = async () => {
      try {
        // Initialize realtime service
        const RealtimeService = await realtimeService();
        realtimeServiceRef.current = new RealtimeService.default({
          tenantId: tenant?.id,
          userId: user?.uid
        });

        // Initialize notification service
        const NotificationService = await notificationService();
        notificationServiceRef.current = new NotificationService.default();

        // Initialize analytics service
        const AnalyticsService = await analyticsService();
        analyticsServiceRef.current = new AnalyticsService.default();

        // Initialize performance service
        const PerformanceService = await performanceService();
        performanceServiceRef.current = new PerformanceService.default();

        // Initialize keyboard service
        const KeyboardService = await keyboardService();
        keyboardServiceRef.current = new KeyboardService.default();

        // Setup realtime subscriptions
        setupRealtimeSubscriptions();

        // Setup keyboard shortcuts
        setupKeyboardShortcuts();

        // Track layout initialization
        if (analyticsServiceRef.current) {
          analyticsServiceRef.current.trackEvent('admin_layout_initialized', {
            tenant_id: tenant?.id,
            user_role: user?.role,
            theme: theme
          });
        }

      } catch (error) {
        console.error('Failed to initialize layout services:', error);
      }
    };

    initializeLazyServices();
  }, [tenant?.id, user?.uid, user?.role, theme]);

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!realtimeServiceRef.current) return;

    // Subscribe to new orders
    realtimeServiceRef.current.subscribe('orders', (data) => {
      setRealtimeBadges(prev => ({
        ...prev,
        orders: (prev.orders || 0) + 1
      }));

      // Show notification for new orders
      if (notificationServiceRef.current) {
        notificationServiceRef.current.showRealtimeNotification({
          type: 'order',
          title: 'New Order Received',
          message: `Order #${data.orderNumber} from ${data.customerName}`,
          action: () => navigate(`/admin/orders/${data.id}`)
        });
      }
    });

    // Subscribe to reviews
    realtimeServiceRef.current.subscribe('reviews', (data) => {
      setRealtimeBadges(prev => ({
        ...prev,
        reviews: (prev.reviews || 0) + 1
      }));

      if (data.rating <= 3) {
        // Alert for low ratings
        setSystemAlerts(prev => [...prev, {
          id: `review_${data.id}`,
          type: 'warning',
          title: 'Low Rating Alert',
          message: `Received ${data.rating}⭐ review. Immediate attention needed.`,
          timestamp: new Date().toISOString()
        }]);
      }
    });

    // Subscribe to system alerts
    realtimeServiceRef.current.subscribe('system', (data) => {
      setSystemAlerts(prev => [...prev, {
        ...data,
        timestamp: new Date().toISOString()
      }]);
    });

    // Subscribe to notifications
    realtimeServiceRef.current.subscribe('notifications', (data) => {
      setNotifications(prev => [data, ...prev].slice(0, 50));
    });

  }, [navigate]);

  const setupKeyboardShortcuts = useCallback(() => {
    if (!keyboardServiceRef.current) return;

    const shortcuts = {
      'cmd+d': () => navigate('/admin'),
      'cmd+o': () => navigate('/admin/orders'),
      'cmd+p': () => navigate('/admin/products'),
      'cmd+u': () => navigate('/admin/customers'),
      'cmd+a': () => navigate('/admin/analytics'),
      'cmd+e': () => navigate('/admin/events'),
      'cmd+s': () => navigate('/admin/staff'),
      'cmd+,': () => navigate('/admin/settings'),
      'cmd+k': () => setShowSearchModal(true),
      'cmd+/': () => setShowKeyboardShortcuts(true),
      'cmd+shift+n': () => setShowNotifications(!showNotifications),
      'cmd+shift+t': () => toggleTheme(),
      'esc': () => {
        setShowSearchModal(false);
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowKeyboardShortcuts(false);
      }
    };

    keyboardServiceRef.current.registerShortcuts(shortcuts);
  }, [navigate, showNotifications, toggleTheme]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    // Network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Performance monitoring
    if (performanceServiceRef.current) {
      const interval = setInterval(() => {
        const metrics = performanceServiceRef.current.getMetrics();
        setPerformanceData(metrics);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    // Auto-collapse sidebar on mobile
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
        setShowMobileSidebar(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Close modals when route changes
    setShowSearchModal(false);
    setShowNotifications(false);
    setShowUserMenu(false);
    setShowMobileSidebar(false);
  }, [location.pathname]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const currentNavItem = useMemo(() => {
    return NAVIGATION_ITEMS.find(item => 
      location.pathname === item.path || 
      location.pathname.startsWith(item.path + '/')
    );
  }, [location.pathname]);

  const breadcrumbs = useMemo(() => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Admin', path: '/admin' }];

    paths.slice(1).forEach((path, index) => {
      const fullPath = '/' + paths.slice(0, index + 2).join('/');
      const navItem = NAVIGATION_ITEMS.find(item => item.path === fullPath);
      
      breadcrumbs.push({
        label: navItem?.label || path.charAt(0).toUpperCase() + path.slice(1),
        path: fullPath
      });
    });

    return breadcrumbs;
  }, [location.pathname]);

  const totalNotificationCount = useMemo(() => {
    return Object.values(realtimeBadges).reduce((sum, count) => sum + count, 0) + 
           systemAlerts.filter(alert => !alert.dismissed).length;
  }, [realtimeBadges, systemAlerts]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleSidebarToggle = useCallback(() => {
    if (window.innerWidth < 1024) {
      setShowMobileSidebar(!showMobileSidebar);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  }, [sidebarCollapsed, showMobileSidebar]);

  const handleNavigate = useCallback((path) => {
    navigate(path);
    
    // Clear badge for navigated item
    const navItem = NAVIGATION_ITEMS.find(item => item.path === path);
    if (navItem && realtimeBadges[navItem.id]) {
      setRealtimeBadges(prev => ({
        ...prev,
        [navItem.id]: 0
      }));
    }
  }, [navigate, realtimeBadges]);

  const handleLogout = useCallback(async () => {
    try {
      // Track logout event
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('admin_logout', {
          session_duration: Date.now() - (user?.loginTime || Date.now())
        });
      }

      await logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate, user?.loginTime]);

  const dismissAlert = useCallback((alertId) => {
    setSystemAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, dismissed: true }
          : alert
      )
    );
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderTopBar = () => (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 relative z-20">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSidebarToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden lg:block">
          <Suspense fallback={<div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>}>
            <BreadcrumbNav breadcrumbs={breadcrumbs} />
          </Suspense>
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={() => setShowSearchModal(true)}
          className="w-full px-4 py-2 bg-gray-100 rounded-lg text-left text-gray-500 hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-gray-300 px-2 py-1 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Network Status */}
        <div className="hidden sm:block">
          <Suspense fallback={null}>
            <NetworkStatus isOnline={isOnline} />
          </Suspense>
        </div>

        {/* Performance Monitor */}
        {performanceData && (
          <Suspense fallback={null}>
            <PerformanceMonitor data={performanceData} />
          </Suspense>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
          {totalNotificationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {totalNotificationCount > 99 ? '99+' : totalNotificationCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <img
            src={user?.photoURL || '/default-avatar.jpg'}
            alt={user?.displayName || 'User'}
            className="w-6 h-6 rounded-full"
          />
          <span className="hidden sm:inline text-sm font-medium">
            {user?.displayName || 'Admin'}
          </span>
        </button>
      </div>
    </header>
  );

  const renderMainContent = () => (
    <main className="flex-1 p-4 lg:p-6 overflow-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {children || <Outlet />}
        </motion.div>
      </AnimatePresence>
    </main>
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className={`min-h-screen bg-gray-50 ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Top Bar */}
      {renderTopBar()}

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Suspense fallback={<div className="w-64 bg-white border-r border-gray-200 animate-pulse"></div>}>
          <Sidebar
            items={NAVIGATION_ITEMS}
            collapsed={sidebarCollapsed}
            showMobile={showMobileSidebar}
            currentPath={location.pathname}
            badges={realtimeBadges}
            onNavigate={handleNavigate}
            onToggle={handleSidebarToggle}
            onCloseMobile={() => setShowMobileSidebar(false)}
          />
        </Suspense>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* System Alerts */}
          {systemAlerts.filter(alert => !alert.dismissed).length > 0 && (
            <Suspense fallback={null}>
              <SystemAlerts
                alerts={systemAlerts.filter(alert => !alert.dismissed)}
                onDismiss={dismissAlert}
              />
            </Suspense>
          )}

          {/* Page Content */}
          {renderMainContent()}
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileSidebar(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Lazy Loaded Modals */}
      {showSearchModal && (
        <Suspense fallback={null}>
          <SearchModal
            isOpen={showSearchModal}
            onClose={() => setShowSearchModal(false)}
            onNavigate={handleNavigate}
          />
        </Suspense>
      )}

      {showNotifications && (
        <Suspense fallback={null}>
          <NotificationCenter
            isOpen={showNotifications}
            notifications={notifications}
            systemAlerts={systemAlerts}
            onClose={() => setShowNotifications(false)}
            onDismissAlert={dismissAlert}
          />
        </Suspense>
      )}

      {showUserMenu && (
        <Suspense fallback={null}>
          <UserMenu
            isOpen={showUserMenu}
            user={user}
            tenant={tenant}
            onClose={() => setShowUserMenu(false)}
            onLogout={handleLogout}
            onSettings={() => navigate('/admin/settings')}
            onThemeCustomizer={() => setShowThemeCustomizer(true)}
          />
        </Suspense>
      )}

      {showThemeCustomizer && (
        <Suspense fallback={null}>
          <ThemeCustomizer
            isOpen={showThemeCustomizer}
            onClose={() => setShowThemeCustomizer(false)}
            currentTheme={theme}
            onThemeChange={updateTheme}
          />
        </Suspense>
      )}

      {showKeyboardShortcuts && (
        <Suspense fallback={null}>
          <KeyboardShortcuts
            isOpen={showKeyboardShortcuts}
            onClose={() => setShowKeyboardShortcuts(false)}
            shortcuts={NAVIGATION_ITEMS.filter(item => item.shortcut)}
          />
        </Suspense>
      )}

      {/* Quick Actions FAB */}
      <Suspense fallback={null}>
        <QuickActions
          onNewOrder={() => navigate('/admin/orders/new')}
          onNewProduct={() => navigate('/admin/products/new')}
          onQuickStats={() => navigate('/admin/analytics')}
        />
      </Suspense>
    </div>
  );
};

export default AdminLayout;