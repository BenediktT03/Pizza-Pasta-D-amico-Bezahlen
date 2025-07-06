/**
 * EATECH - Master Admin Layout
 * Version: 6.0.0
 * Description: Layout-Wrapper für Master Admin Bereich mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/layouts/MasterLayout.jsx
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, X, Building2, BarChart3, Activity, DollarSign,
  Settings, LogOut, ChevronDown, Shield, Bell, Search,
  Sun, Moon, HelpCircle, User, ChevronLeft, ChevronRight,
  Globe, Zap, Server, Users, TrendingUp, AlertTriangle,
  Clock, Calendar, Mail, Phone, ExternalLink
} from 'lucide-react';

// Lazy load heavy components
const NotificationDropdown = lazy(() => import('../components/master/NotificationDropdown'));
const UserDropdown = lazy(() => import('../components/master/UserDropdown'));
const SearchCommand = lazy(() => import('../components/master/SearchCommand'));
const SystemStatus = lazy(() => import('../components/master/SystemStatus'));
const QuickStats = lazy(() => import('../components/master/QuickStats'));
const ThemeCustomizer = lazy(() => import('../components/master/ThemeCustomizer'));
const HelpCenter = lazy(() => import('../components/master/HelpCenter'));

// Lazy load hooks
const useAuth = lazy(() => import('../hooks/useAuth').then(mod => ({ default: mod.useAuth })));
const useTheme = lazy(() => import('../hooks/useTheme').then(mod => ({ default: mod.useTheme })));
const useSystemMetrics = lazy(() => import('../hooks/useSystemMetrics').then(mod => ({ default: mod.useSystemMetrics })));

// Lazy load services
const toast = lazy(() => import('react-hot-toast'));

// Loading components
const HeaderSkeleton = () => (
  <div className="h-16 bg-gray-900 border-b border-gray-800 animate-pulse">
    <div className="h-full px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-32 h-8 bg-gray-800 rounded"></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-800 rounded"></div>
        <div className="w-8 h-8 bg-gray-800 rounded"></div>
        <div className="w-8 h-8 bg-gray-800 rounded"></div>
      </div>
    </div>
  </div>
);

const SidebarSkeleton = () => (
  <div className="w-64 h-full bg-gray-900 border-r border-gray-800 animate-pulse">
    <div className="p-4 space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-800 rounded"></div>
      ))}
    </div>
  </div>
);

// Styles
import styles from './MasterLayout.module.css';

// Constants
const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/master',
    exact: true
  },
  {
    id: 'tenants',
    label: 'Tenants',
    icon: Building2,
    path: '/master/tenants',
    badge: null
  },
  {
    id: 'metrics',
    label: 'System Metrics',
    icon: Activity,
    path: '/master/metrics'
  },
  {
    id: 'revenue',
    label: 'Revenue',
    icon: DollarSign,
    path: '/master/revenue'
  },
  {
    id: 'features',
    label: 'Features',
    icon: Zap,
    path: '/master/features'
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    path: '/master/users'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/master/settings'
  }
];

// Main Component
const MasterLayout = () => {
  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [systemStatus, setSystemStatus] = useState('operational');
  const [hooks, setHooks] = useState({});
  const [services, setServices] = useState({});

  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();

  // Load hooks and services
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        // Load hooks
        const [authMod, themeMod, metricsMod] = await Promise.all([
          import('../hooks/useAuth'),
          import('../hooks/useTheme'),
          import('../hooks/useSystemMetrics')
        ]);

        // Load services
        const toastMod = await import('react-hot-toast');

        setHooks({
          useAuth: authMod.useAuth,
          useTheme: themeMod.useTheme,
          useSystemMetrics: metricsMod.useSystemMetrics
        });

        setServices({
          toast: toastMod.default
        });
      } catch (error) {
        console.error('Failed to load dependencies:', error);
      }
    };
    loadDependencies();
  }, []);

  // Use hooks if loaded
  const auth = hooks.useAuth ? hooks.useAuth() : { user: null, logout: () => {} };
  const theme = hooks.useTheme ? hooks.useTheme() : { theme: 'dark', setTheme: () => {} };
  const metrics = hooks.useSystemMetrics ? hooks.useSystemMetrics() : { metrics: null };

  const { user, logout } = auth;
  const { theme: currentTheme, setTheme } = theme;

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
        setSidebarCollapsed(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Cmd/Ctrl + \ for sidebar toggle
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
      // ? for help
      if (e.key === '?' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        setShowHelp(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/master/login');
      if (services.toast) {
        services.toast.success('Erfolgreich abgemeldet');
      }
    } catch (error) {
      console.error('Logout error:', error);
      if (services.toast) {
        services.toast.error('Fehler beim Abmelden');
      }
    }
  }, [logout, navigate, services.toast]);

  // Check for system alerts
  useEffect(() => {
    const checkSystemStatus = async () => {
      // Simulate system status check
      if (metrics?.metrics?.system?.errorRate > 5) {
        setSystemStatus('degraded');
      } else if (metrics?.metrics?.system?.uptime < 99) {
        setSystemStatus('maintenance');
      } else {
        setSystemStatus('operational');
      }
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [metrics]);

  // Render navigation item
  const renderNavItem = (item) => {
    const isActive = item.exact 
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path);
    const Icon = item.icon;

    return (
      <NavLink
        key={item.id}
        to={item.path}
        end={item.exact}
        className={({ isActive }) => `
          ${styles.navItem} 
          ${isActive ? styles.active : ''} 
          ${sidebarCollapsed ? styles.collapsed : ''}
        `}
      >
        <Icon size={20} className={styles.navIcon} />
        {!sidebarCollapsed && (
          <>
            <span className={styles.navLabel}>{item.label}</span>
            {item.badge && (
              <span className={styles.navBadge}>{item.badge}</span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  // Render header
  const renderHeader = () => (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        {/* Mobile menu toggle */}
        <button
          className={styles.mobileMenuToggle}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo */}
        <div className={styles.logo}>
          <Shield size={24} className={styles.logoIcon} />
          <span className={styles.logoText}>EATECH Master</span>
        </div>

        {/* Quick stats */}
        {window.innerWidth > 768 && (
          <Suspense fallback={<div className={styles.statsSkeleton} />}>
            <QuickStats metrics={metrics?.metrics} />
          </Suspense>
        )}
      </div>

      <div className={styles.headerRight}>
        {/* Search */}
        <button
          className={styles.headerButton}
          onClick={() => setSearchOpen(true)}
          title="Suche (⌘K)"
        >
          <Search size={20} />
        </button>

        {/* Theme toggle */}
        <button
          className={styles.headerButton}
          onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
          title="Theme wechseln"
        >
          {currentTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Help */}
        <button
          className={styles.headerButton}
          onClick={() => setShowHelp(true)}
          title="Hilfe (?)"
        >
          <HelpCircle size={20} />
        </button>

        {/* System Status */}
        <Suspense fallback={<div className={styles.statusSkeleton} />}>
          <SystemStatus status={systemStatus} />
        </Suspense>

        {/* Notifications */}
        <Suspense fallback={<div className={styles.iconSkeleton} />}>
          <NotificationDropdown />
        </Suspense>

        {/* User menu */}
        <Suspense fallback={<div className={styles.avatarSkeleton} />}>
          <UserDropdown user={user} onLogout={handleLogout} />
        </Suspense>
      </div>
    </header>
  );

  // Render sidebar
  const renderSidebar = () => (
    <aside 
      className={`
        ${styles.sidebar} 
        ${!sidebarOpen ? styles.hidden : ''}
        ${sidebarCollapsed ? styles.collapsed : ''}
        ${mobileMenuOpen ? styles.mobileOpen : ''}
      `}
    >
      {/* Sidebar header */}
      <div className={styles.sidebarHeader}>
        <button
          className={styles.collapseButton}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Sidebar erweitern' : 'Sidebar minimieren'}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.navigation}>
        {NAVIGATION_ITEMS.map(renderNavItem)}
      </nav>

      {/* Sidebar footer */}
      <div className={styles.sidebarFooter}>
        {/* System info */}
        {!sidebarCollapsed && (
          <div className={styles.systemInfo}>
            <div className={styles.systemInfoItem}>
              <Server size={16} />
              <span>Region: EU-West</span>
            </div>
            <div className={styles.systemInfoItem}>
              <Clock size={16} />
              <span>Uptime: {metrics?.metrics?.system?.uptime || 0}%</span>
            </div>
          </div>
        )}

        {/* User section */}
        <div className={styles.userSection}>
          <div className={styles.userAvatar}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <User size={20} />
            )}
          </div>
          {!sidebarCollapsed && (
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.name || 'Master Admin'}</div>
              <div className={styles.userRole}>System Administrator</div>
            </div>
          )}
          <button
            className={styles.logoutButton}
            onClick={handleLogout}
            title="Abmelden"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Version */}
        {!sidebarCollapsed && (
          <div className={styles.version}>
            Version 5.0.0
          </div>
        )}
      </div>
    </aside>
  );

  // Mobile overlay
  const renderMobileOverlay = () => (
    mobileMenuOpen && (
      <div 
        className={styles.mobileOverlay}
        onClick={() => setMobileMenuOpen(false)}
      />
    )
  );

  // Main content
  const renderContent = () => (
    <main className={`
      ${styles.main} 
      ${!sidebarOpen || sidebarCollapsed ? styles.expanded : ''}
    `}>
      <div className={styles.mainContent}>
        <Outlet />
      </div>
    </main>
  );

  // Modals
  const renderModals = () => (
    <>
      {/* Search Command Palette */}
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchCommand
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
          />
        </Suspense>
      )}

      {/* Theme Customizer */}
      {showThemeCustomizer && (
        <Suspense fallback={null}>
          <ThemeCustomizer
            isOpen={showThemeCustomizer}
            onClose={() => setShowThemeCustomizer(false)}
            currentTheme={currentTheme}
            onThemeChange={setTheme}
          />
        </Suspense>
      )}

      {/* Help Center */}
      {showHelp && (
        <Suspense fallback={null}>
          <HelpCenter
            isOpen={showHelp}
            onClose={() => setShowHelp(false)}
          />
        </Suspense>
      )}
    </>
  );

  return (
    <div className={`${styles.layout} ${styles[currentTheme]}`}>
      <Suspense fallback={<HeaderSkeleton />}>
        {renderHeader()}
      </Suspense>
      
      <div className={styles.body}>
        <Suspense fallback={<SidebarSkeleton />}>
          {renderSidebar()}
        </Suspense>
        {renderMobileOverlay()}
        {renderContent()}
      </div>
      
      {renderModals()}
    </div>
  );
};

export default MasterLayout;