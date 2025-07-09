/**
 * EATECH - Admin Layout Component
 * Version: 10.0.0
 * Description: Responsive Admin Dashboard Layout mit Voice Commerce Integration
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/components/Layout/AdminLayout.jsx
 *
 * Features: Collapsible sidebar, real-time notifications, breadcrumbs, theme switcher, VOICE COMMERCE
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Bell,
  Calendar,
  Gift,
  HelpCircle,
  Home,
  Menu,
  Mic, MicOff,
  Moon,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Sun,
  User,
  Users,
  Volume2, VolumeX // VOICE ICONS ADDED
} from 'lucide-react';
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

// Hooks & Contexts
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../hooks/useTheme';
import { useVoice } from '../../hooks/useVoice'; // VOICE HOOK ADDED

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
const VoiceCommandsModal = lazy(() => import('./VoiceCommandsModal')); // VOICE MODAL ADDED

// Lazy loaded services
const realtimeService = () => import('../../services/realtimeService');
const notificationService = () => import('../../services/notificationService');
const analyticsService = () => import('../../services/analyticsService');
const performanceService = () => import('../../services/performanceService');
const keyboardService = () => import('../../services/keyboardService');
const voiceService = () => import('../../services/voice/voiceService'); // VOICE SERVICE ADDED

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
    shortcut: '⌘ + D',
    voiceCommand: ['dashboard', 'home', 'hauptseite'] // VOICE COMMANDS ADDED
  },
  {
    id: 'orders',
    label: 'Orders',
    path: '/admin/orders',
    icon: ShoppingCart,
    badge: 'realtime',
    shortcut: '⌘ + O',
    voiceCommand: ['orders', 'bestellungen', 'bstellige'] // VOICE COMMANDS ADDED
  },
  {
    id: 'products',
    label: 'Products',
    path: '/admin/products',
    icon: Package,
    shortcut: '⌘ + P',
    voiceCommand: ['products', 'produkte', 'menu'],
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
    shortcut: '⌘ + U',
    voiceCommand: ['customers', 'kunden', 'chunde']
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/admin/analytics',
    icon: BarChart3,
    shortcut: '⌘ + A',
    voiceCommand: ['analytics', 'statistiken', 'statistike']
  },
  {
    id: 'events',
    label: 'Events',
    path: '/admin/events',
    icon: Calendar,
    shortcut: '⌘ + E',
    voiceCommand: ['events', 'veranstaltungen', 'events']
  },
  {
    id: 'staff',
    label: 'Staff',
    path: '/admin/staff',
    icon: User,
    shortcut: '⌘ + S',
    voiceCommand: ['staff', 'personal', 'mitarbeiter']
  },
  {
    id: 'reviews',
    label: 'Reviews',
    path: '/admin/reviews',
    icon: Star,
    badge: 'notification',
    voiceCommand: ['reviews', 'bewertungen', 'bewertige']
  },
  {
    id: 'promotions',
    label: 'Promotions',
    path: '/admin/promotions',
    icon: Gift,
    voiceCommand: ['promotions', 'aktionen', 'aktion']
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/admin/notifications',
    icon: Bell,
    voiceCommand: ['notifications', 'benachrichtigungen', 'nachricht']
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/admin/settings',
    icon: Settings,
    shortcut: '⌘ + ,',
    voiceCommand: ['settings', 'einstellungen', 'istellige']
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
  const [showVoiceCommands, setShowVoiceCommands] = useState(false); // VOICE STATE ADDED
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifications, setNotifications] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [realtimeBadges, setRealtimeBadges] = useState({});
  const [voiceEnabled, setVoiceEnabled] = useState(false); // VOICE STATE ADDED
  const [voiceOrders, setVoiceOrders] = useState([]); // VOICE ORDERS STATE ADDED

  // Hooks
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tenant, updateTenant } = useTenant();
  const { theme, toggleTheme, updateTheme } = useTheme();

  // VOICE HOOK INTEGRATION
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: voiceSupported
  } = useVoice();

  // Lazy loaded services refs
  const realtimeServiceRef = React.useRef(null);
  const notificationServiceRef = React.useRef(null);
  const analyticsServiceRef = React.useRef(null);
  const performanceServiceRef = React.useRef(null);
  const keyboardServiceRef = React.useRef(null);
  const voiceServiceRef = React.useRef(null); // VOICE SERVICE REF ADDED

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

        // INITIALIZE VOICE SERVICE
        if (voiceSupported) {
          const VoiceService = await voiceService();
          voiceServiceRef.current = new VoiceService.default({
            tenantId: tenant?.id,
            userId: user?.uid,
            language: tenant?.settings?.language || 'de-CH'
          });

          // Enable voice if user preference
          const voicePref = localStorage.getItem('voice_enabled');
          if (voicePref === 'true') {
            setVoiceEnabled(true);
          }
        }

        // Setup realtime subscriptions
        setupRealtimeSubscriptions();

        // Setup keyboard shortcuts
        setupKeyboardShortcuts();

        // Setup voice commands
        if (voiceSupported) {
          setupVoiceCommands();
        }

        // Track layout initialization
        if (analyticsServiceRef.current) {
          analyticsServiceRef.current.trackEvent('admin_layout_initialized', {
            tenant_id: tenant?.id,
            user_role: user?.role,
            theme: theme,
            voice_enabled: voiceSupported && voiceEnabled
          });
        }

      } catch (error) {
        console.error('Failed to initialize layout services:', error);
      }
    };

    initializeLazyServices();
  }, [tenant?.id, user?.uid, user?.role, theme, voiceSupported, voiceEnabled]);

  // ============================================================================
  // VOICE COMMAND SETUP
  // ============================================================================
  const setupVoiceCommands = useCallback(() => {
    if (!voiceServiceRef.current) return;

    // Register navigation commands
    NAVIGATION_ITEMS.forEach(item => {
      if (item.voiceCommand) {
        item.voiceCommand.forEach(command => {
          voiceServiceRef.current.registerCommand(command, () => {
            navigate(item.path);

            // Voice feedback
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(
                `Navigiere zu ${item.label}`
              );
              utterance.lang = 'de-CH';
              window.speechSynthesis.speak(utterance);
            }
          });
        });
      }
    });

    // Register action commands
    const actionCommands = {
      'neue bestellung': () => navigate('/admin/orders/new'),
      'nöi bstellig': () => navigate('/admin/orders/new'),
      'neues produkt': () => navigate('/admin/products/new'),
      'nöis produkt': () => navigate('/admin/products/new'),
      'suche': () => setShowSearchModal(true),
      'sueche': () => setShowSearchModal(true),
      'hilfe': () => setShowVoiceCommands(true),
      'hilf': () => setShowVoiceCommands(true),
      'logout': () => handleLogout(),
      'abmelden': () => handleLogout(),
      'abmelde': () => handleLogout()
    };

    Object.entries(actionCommands).forEach(([command, action]) => {
      voiceServiceRef.current.registerCommand(command, action);
    });

  }, [navigate, handleLogout]);

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

      // VOICE ORDER HANDLING
      if (data.channel === 'voice') {
        setVoiceOrders(prev => [...prev, data]);

        // Special notification for voice orders
        if (notificationServiceRef.current) {
          notificationServiceRef.current.showRealtimeNotification({
            type: 'voice_order',
            title: '🎤 Voice Order Received',
            message: `Voice order #${data.orderNumber} from ${data.customerName}`,
            action: () => navigate(`/admin/orders/${data.id}`),
            priority: 'high',
            sound: 'voice-order.mp3'
          });
        }

        // Voice announcement
        if (voiceEnabled && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(
            `Neue Sprachbestellung von ${data.customerName}`
          );
          utterance.lang = 'de-CH';
          window.speechSynthesis.speak(utterance);
        }
      } else {
        // Regular order notification
        if (notificationServiceRef.current) {
          notificationServiceRef.current.showRealtimeNotification({
            type: 'order',
            title: 'New Order Received',
            message: `Order #${data.orderNumber} from ${data.customerName}`,
            action: () => navigate(`/admin/orders/${data.id}`)
          });
        }
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

  }, [navigate, voiceEnabled]);

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
      'cmd+shift+v': () => handleVoiceToggle(), // VOICE SHORTCUT ADDED
      'esc': () => {
        setShowSearchModal(false);
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowKeyboardShortcuts(false);
        setShowVoiceCommands(false);
        if (isListening) stopListening();
      }
    };

    keyboardServiceRef.current.registerShortcuts(shortcuts);
  }, [navigate, showNotifications, toggleTheme, isListening, stopListening]);

  // ============================================================================
  // VOICE HANDLERS
  // ============================================================================
  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const toggleVoiceEnabled = useCallback(() => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    localStorage.setItem('voice_enabled', newState.toString());

    if (!newState && isListening) {
      stopListening();
    }

    // Track voice toggle
    if (analyticsServiceRef.current) {
      analyticsServiceRef.current.trackEvent('voice_toggled', {
        enabled: newState
      });
    }
  }, [voiceEnabled, isListening, stopListening]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    // Process voice transcript
    if (transcript && voiceServiceRef.current) {
      voiceServiceRef.current.processCommand(transcript);
    }
  }, [transcript]);

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
    setShowVoiceCommands(false);
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
           systemAlerts.filter(alert => !alert.dismissed).length +
           voiceOrders.length; // VOICE ORDERS ADDED TO COUNT
  }, [realtimeBadges, systemAlerts, voiceOrders]);

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
          session_duration: Date.now() - (user?.loginTime || Date.now()),
          voice_enabled: voiceEnabled
        });
      }

      // Stop voice if active
      if (isListening) {
        stopListening();
      }

      await logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate, user?.loginTime, voiceEnabled, isListening, stopListening]);

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
        {/* Voice Status Indicator - NEW */}
        {voiceSupported && (
          <div className="flex items-center gap-2">
            {/* Voice Enable Toggle */}
            <button
              onClick={toggleVoiceEnabled}
              className={`p-2 rounded-lg transition-colors ${
                voiceEnabled
                  ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                  : 'hover:bg-gray-100'
              }`}
              title={voiceEnabled ? 'Voice Enabled' : 'Voice Disabled'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>

            {/* Voice Listening Indicator */}
            {voiceEnabled && (
              <button
                onClick={handleVoiceToggle}
                className={`relative p-2 rounded-lg transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
                title={isListening ? 'Listening...' : 'Start Voice Command'}
              >
                {isListening ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <MicOff className="w-5 h-5" />
                )}
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
                )}
              </button>
            )}

            {/* Voice Commands Help */}
            {voiceEnabled && (
              <button
                onClick={() => setShowVoiceCommands(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Voice Commands Help"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Voice Orders Badge */}
        {voiceOrders.length > 0 && (
          <div className="relative">
            <button
              onClick={() => navigate('/admin/orders?filter=voice')}
              className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
              title={`${voiceOrders.length} Voice Orders`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {voiceOrders.length}
              </span>
            </button>
          </div>
        )}

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
      {/* Voice Transcript Display */}
      {isListening && transcript && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-purple-100 border border-purple-300 rounded-lg flex items-center gap-3"
        >
          <Mic className="w-5 h-5 text-purple-600 animate-pulse" />
          <span className="text-sm text-purple-800">
            {transcript || 'Listening...'}
          </span>
        </motion.div>
      )}

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
            voiceEnabled={voiceEnabled}
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
            voiceEnabled={voiceEnabled}
          />
        </Suspense>
      )}

      {showNotifications && (
        <Suspense fallback={null}>
          <NotificationCenter
            isOpen={showNotifications}
            notifications={notifications}
            systemAlerts={systemAlerts}
            voiceOrders={voiceOrders}
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
            voiceEnabled={voiceEnabled}
            onToggleVoice={toggleVoiceEnabled}
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
            shortcuts={[
              ...NAVIGATION_ITEMS.filter(item => item.shortcut),
              { label: 'Toggle Voice', shortcut: '⌘ + ⇧ + V', action: handleVoiceToggle }
            ]}
          />
        </Suspense>
      )}

      {/* Voice Commands Modal - NEW */}
      {showVoiceCommands && (
        <Suspense fallback={null}>
          <VoiceCommandsModal
            isOpen={showVoiceCommands}
            onClose={() => setShowVoiceCommands(false)}
            commands={NAVIGATION_ITEMS}
            currentLanguage={tenant?.settings?.language || 'de-CH'}
          />
        </Suspense>
      )}

      {/* Quick Actions FAB */}
      <Suspense fallback={null}>
        <QuickActions
          onNewOrder={() => navigate('/admin/orders/new')}
          onNewProduct={() => navigate('/admin/products/new')}
          onQuickStats={() => navigate('/admin/analytics')}
          voiceEnabled={voiceEnabled}
          onVoiceCommand={handleVoiceToggle}
        />
      </Suspense>
    </div>
  );
};

export default AdminLayout;
