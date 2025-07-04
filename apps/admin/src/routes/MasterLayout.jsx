/**
 * EATECH - Master Admin Layout
 * Version: 5.0.0
 * Description: Layout-Wrapper für Master Admin Bereich
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/layouts/MasterLayout.jsx
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Menu, X, Building2, BarChart3, Activity, DollarSign,
  Settings, LogOut, ChevronDown, Shield, Bell, Search,
  Sun, Moon, HelpCircle, User
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import styles from './MasterLayout.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/master'
  },
  {
    id: 'tenants',
    label: 'Tenants',
    icon: Building2,
    path: '/master/tenants'
  },
  {
    id: 'metrics',
    label: 'System Metrics',
    icon: Activity,
    path: '/master/metrics'
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: DollarSign,
    path: '/master/billing'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/master/settings'
  }
];

// ============================================================================
// COMPONENTS
// ============================================================================

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const notifications = [
    {
      id: 1,
      title: 'Neuer Tenant registriert',
      message: 'Pizza Palace hat sich angemeldet',
      time: 'vor 5 Minuten',
      type: 'info'
    },
    {
      id: 2,
      title: 'Zahlung fehlgeschlagen',
      message: 'Burger Express - Karte abgelaufen',
      time: 'vor 1 Stunde',
      type: 'warning'
    },
    {
      id: 3,
      title: 'System Update verfügbar',
      message: 'Version 5.1.0 kann installiert werden',
      time: 'vor 2 Stunden',
      type: 'update'
    }
  ];
  
  return (
    <div className={styles.notificationDropdown}>
      <button 
        className={styles.notificationButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        <span className={styles.notificationBadge}>3</span>
      </button>
      
      {isOpen && (
        <>
          <div 
            className={styles.overlay} 
            onClick={() => setIsOpen(false)} 
          />
          <div className={styles.notificationMenu}>
            <div className={styles.notificationHeader}>
              <h3>Benachrichtigungen</h3>
              <button className={styles.markAllRead}>
                Alle als gelesen markieren
              </button>
            </div>
            <div className={styles.notificationList}>
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`${styles.notificationItem} ${styles[notification.type]}`}
                >
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
              <button className={styles.viewAllButton}>
                Alle Benachrichtigungen anzeigen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const UserDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Erfolgreich abgemeldet');
    } catch (error) {
      toast.error('Fehler beim Abmelden');
    }
  };
  
  return (
    <div className={styles.userDropdown}>
      <button 
        className={styles.userButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.userAvatar}>
          <User size={20} />
        </div>
        <span className={styles.userName}>Master Admin</span>
        <ChevronDown size={16} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className={styles.overlay} 
            onClick={() => setIsOpen(false)} 
          />
          <div className={styles.userMenu}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                <User size={24} />
              </div>
              <div>
                <div className={styles.userFullName}>
                  {user?.displayName || 'Master Administrator'}
                </div>
                <div className={styles.userEmail}>
                  {user?.email || 'master@eatech.ch'}
                </div>
              </div>
            </div>
            
            <div className={styles.menuDivider} />
            
            <button className={styles.menuItem}>
              <User size={16} />
              Profil
            </button>
            <button className={styles.menuItem}>
              <Settings size={16} />
              Einstellungen
            </button>
            <button className={styles.menuItem}>
              <HelpCircle size={16} />
              Hilfe
            </button>
            
            <div className={styles.menuDivider} />
            
            <button 
              className={`${styles.menuItem} ${styles.logoutItem}`}
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Abmelden
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MasterLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleDarkMode = () => setDarkMode(!darkMode);
  
  return (
    <div className={`${styles.layout} ${darkMode ? styles.dark : styles.light}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button 
            className={styles.menuButton}
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className={styles.logo}>
            <Shield className={styles.logoIcon} />
            <span>EATECH Master</span>
          </div>
        </div>
        
        <div className={styles.headerCenter}>
          <div className={styles.searchBar}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Suche nach Tenants, Einstellungen..." 
            />
          </div>
        </div>
        
        <div className={styles.headerRight}>
          <button 
            className={styles.themeToggle}
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <NotificationDropdown />
          <UserDropdown />
        </div>
      </header>
      
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''}`}>
        <nav className={styles.navigation}>
          {NAVIGATION_ITEMS.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => 
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              end={item.path === '/master'}
            >
              <item.icon size={20} className={styles.navIcon} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        
        {sidebarOpen && (
          <div className={styles.sidebarFooter}>
            <div className={styles.systemStatus}>
              <div className={styles.statusIndicator} />
              <div className={styles.statusText}>
                <span className={styles.statusLabel}>System Status</span>
                <span className={styles.statusValue}>Operational</span>
              </div>
            </div>
            
            <div className={styles.version}>
              Version 5.0.0
            </div>
          </div>
        )}
      </aside>
      
      {/* Main Content */}
      <main className={`${styles.main} ${!sidebarOpen ? styles.expanded : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default MasterLayout;