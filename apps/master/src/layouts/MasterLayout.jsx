/**
 * EATECH Master Layout
 * Version: 1.0.0
 * 
 * Layout-Wrapper für alle Master Control Seiten
 * Features: Sidebar, Header, Notifications
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/layouts/MasterLayout.jsx
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useMasterAuth } from '../hooks/useMasterAuth';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  DollarSign,
  ToggleLeft,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Search,
  Moon,
  Sun,
  Terminal,
  AlertTriangle,
  CheckCircle,
  Info,
  X
} from 'lucide-react';
import styles from './MasterLayout.module.css';

const MasterLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'alert',
      title: 'Server Auslastung hoch',
      message: 'Server ZRH-1 bei 85% CPU',
      time: '5 min',
      unread: true
    },
    {
      id: 2,
      type: 'success',
      title: 'Neuer Enterprise Kunde',
      message: 'Restaurant Seeblick hat Enterprise Plan aktiviert',
      time: '1h',
      unread: true
    }
  ]);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useMasterAuth();

  // Navigation Items
  const navItems = [
    {
      path: '/master/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      path: '/master/tenants',
      label: 'Tenant Control',
      icon: Users,
      badge: '127'
    },
    {
      path: '/master/metrics',
      label: 'System Metrics',
      icon: Activity,
      badge: null
    },
    {
      path: '/master/revenue',
      label: 'Revenue Tracking',
      icon: DollarSign,
      badge: 'CHF 125k'
    },
    {
      path: '/master/features',
      label: 'Feature Control',
      icon: ToggleLeft,
      badge: null
    },
    {
      path: '/master/alerts',
      label: 'Alert Center',
      icon: Bell,
      badge: notifications.filter(n => n.unread).length || null
    },
    {
      path: '/master/settings',
      label: 'Global Settings',
      icon: Settings,
      badge: null
    }
  ];

  // Dark Mode Toggle
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Handle Logout
  const handleLogout = async () => {
    if (window.confirm('Wirklich ausloggen?')) {
      await logout();
    }
  };

  // Quick Command Palette (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('masterSearch')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, unread: false } : n)
    );
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert': return <AlertTriangle className={styles.alertIcon} />;
      case 'success': return <CheckCircle className={styles.successIcon} />;
      case 'info': return <Info className={styles.infoIcon} />;
      default: return <Bell />;
    }
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <Shield className={styles.logoIcon} />
            {!collapsed && <span>Master Control</span>}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={styles.collapseButton}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${
                location.pathname === item.path ? styles.active : ''
              }`}
              title={collapsed ? item.label : ''}
            >
              <item.icon className={styles.navIcon} />
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={styles.badge}>{item.badge}</span>
                  )}
                </>
              )}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
            title={collapsed ? 'Logout' : ''}
          >
            <LogOut />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.searchContainer}>
              <Search className={styles.searchIcon} />
              <input
                id="masterSearch"
                type="text"
                placeholder="Quick search... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.headerRight}>
            {/* Terminal Button */}
            <button
              className={styles.headerButton}
              title="Command Line"
              onClick={() => alert('Terminal coming soon!')}
            >
              <Terminal />
            </button>

            {/* Dark Mode Toggle */}
            <button
              className={styles.headerButton}
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? <Sun /> : <Moon />}
            </button>

            {/* Notifications */}
            <div className={styles.notificationContainer}>
              <button
                className={`${styles.headerButton} ${styles.notificationButton}`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell />
                {notifications.filter(n => n.unread).length > 0 && (
                  <span className={styles.notificationDot} />
                )}
              </button>

              {showNotifications && (
                <div className={styles.notificationDropdown}>
                  <div className={styles.notificationHeader}>
                    <h3>Benachrichtigungen</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className={styles.closeButton}
                    >
                      <X />
                    </button>
                  </div>
                  
                  <div className={styles.notificationList}>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`${styles.notificationItem} ${
                          notification.unread ? styles.unread : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        {getNotificationIcon(notification.type)}
                        <div className={styles.notificationContent}>
                          <h4>{notification.title}</h4>
                          <p>{notification.message}</p>
                          <span className={styles.notificationTime}>
                            {notification.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className={styles.notificationFooter}>
                    <Link to="/master/alerts">Alle anzeigen</Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className={styles.userInfo}>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user?.email}</span>
                <span className={styles.userRole}>Master Admin</span>
              </div>
              <div className={styles.userAvatar}>
                <Shield />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={styles.pageContent}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MasterLayout;