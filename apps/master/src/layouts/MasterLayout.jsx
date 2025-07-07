import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Home,
  Users,
  Settings,
  Shield,
  Activity,
  DollarSign,
  BarChart3,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Search,
  Moon,
  Sun,
  HelpCircle,
  ChevronRight,
  Zap,
  Database,
  Key
} from 'lucide-react';
import { useMasterAuth } from '../hooks/useMasterAuth';
import styles from './MasterLayout.module.css';

const MasterLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeNotifications, setActiveNotifications] = useState(3);
  const [expandedMenuItems, setExpandedMenuItems] = useState({});

  const { user, logout } = useMasterAuth();

  // Navigation items with sub-items
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/master',
      badge: null
    },
    {
      id: 'tenants',
      label: 'Tenants',
      icon: Users,
      path: '/master/tenants',
      badge: '127',
      subItems: [
        { label: 'Übersicht', path: '/master/tenants' },
        { label: 'Verwaltung', path: '/master/tenants/management' },
        { label: 'Onboarding', path: '/master/tenants/onboarding' },
        { label: 'Aktivität', path: '/master/tenants/activity' }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/master/analytics',
      badge: null,
      subItems: [
        { label: 'System Metriken', path: '/master/analytics/system' },
        { label: 'Umsatz Analyse', path: '/master/analytics/revenue' },
        { label: 'Nutzer Statistiken', path: '/master/analytics/users' },
        { label: 'Performance', path: '/master/analytics/performance' }
      ]
    },
    {
      id: 'billing',
      label: 'Abrechnung',
      icon: DollarSign,
      path: '/master/billing',
      badge: '5',
      badgeType: 'warning'
    },
    {
      id: 'features',
      label: 'Feature Control',
      icon: Zap,
      path: '/master/features',
      badge: null
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      path: '/master/security',
      badge: '2',
      badgeType: 'danger',
      subItems: [
        { label: 'Audit Log', path: '/master/security/audit' },
        { label: 'Benutzer', path: '/master/security/users' },
        { label: 'Berechtigungen', path: '/master/security/permissions' },
        { label: 'Einstellungen', path: '/master/security/settings' }
      ]
    },
    {
      id: 'system',
      label: 'System',
      icon: Database,
      path: '/master/system',
      badge: null,
      subItems: [
        { label: 'Einstellungen', path: '/master/system/settings' },
        { label: 'Monitoring', path: '/master/system/monitoring' },
        { label: 'Backups', path: '/master/system/backups' },
        { label: 'Logs', path: '/master/system/logs' }
      ]
    }
  ];

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Toggle submenu
  const toggleSubmenu = (itemId) => {
    setExpandedMenuItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Handle navigation
  const handleNavigation = (path) => {
    window.location.href = path;
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    window.location.href = '/master/login';
  };

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('light-theme');
  };

  return (
    <div className={`${styles.layout} ${isDarkMode ? styles.dark : styles.light}`}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : styles.closed}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoText}>EATECH</span>
            <span className={styles.logoSub}>MASTER</span>
          </div>
          <button
            className={styles.sidebarToggle}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className={styles.navigation}>
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isExpanded = expandedMenuItems[item.id];
            const hasSubItems = item.subItems && item.subItems.length > 0;

            return (
              <div key={item.id} className={styles.navItemContainer}>
                <div
                  className={styles.navItem}
                  onClick={() => hasSubItems ? toggleSubmenu(item.id) : handleNavigation(item.path)}
                >
                  <div className={styles.navItemContent}>
                    <Icon size={20} />
                    {isSidebarOpen && (
                      <>
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className={`${styles.badge} ${styles[item.badgeType || 'default']}`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {isSidebarOpen && hasSubItems && (
                    <ChevronRight
                      size={16}
                      className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}
                    />
                  )}
                </div>

                {isSidebarOpen && hasSubItems && isExpanded && (
                  <div className={styles.subItems}>
                    {item.subItems.map((subItem, index) => (
                      <div
                        key={index}
                        className={styles.subItem}
                        onClick={() => handleNavigation(subItem.path)}
                      >
                        {subItem.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.helpButton}>
            <HelpCircle size={20} />
            {isSidebarOpen && <span>Hilfe & Support</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Top Bar */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            {isMobile && (
              <button
                className={styles.mobileMenuToggle}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Menu size={24} />
              </button>
            )}
            <div className={styles.searchBar}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Suche..."
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.topBarRight}>
            <button className={styles.themeToggle} onClick={toggleTheme}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button className={styles.notificationButton}>
              <Bell size={20} />
              {activeNotifications > 0 && (
                <span className={styles.notificationBadge}>{activeNotifications}</span>
              )}
            </button>

            <div className={styles.userMenu}>
              <button
                className={styles.userMenuButton}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className={styles.userAvatar}>
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'MA'}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user?.name || 'Master Admin'}</span>
                  <span className={styles.userRole}>{user?.role || 'Administrator'}</span>
                </div>
                <ChevronDown size={16} />
              </button>

              {showUserMenu && (
                <div className={styles.userDropdown}>
                  <a href="/master/profile" className={styles.dropdownItem}>
                    <User size={16} />
                    <span>Mein Profil</span>
                  </a>
                  <a href="/master/settings" className={styles.dropdownItem}>
                    <Settings size={16} />
                    <span>Einstellungen</span>
                  </a>
                  <div className={styles.dropdownDivider}></div>
                  <button
                    className={styles.dropdownItem}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Abmelden</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={styles.pageContent}>
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default MasterLayout;