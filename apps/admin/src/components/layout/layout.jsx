/**
 * EATECH - Layout Component with Theme Switcher
 * File Path: /apps/admin/src/components/layout/Layout.jsx
 */

import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  ChefHat, 
  Users, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Bell,
  User
} from 'lucide-react';
import { ThemeSwitcher } from '../theme-system/ThemeSystem';
import styles from './Layout.module.css';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const navigation = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/products', icon: Package, label: 'Produkte' },
    { path: '/orders', icon: ShoppingCart, label: 'Bestellungen' },
    { path: '/kitchen', icon: ChefHat, label: 'Küche' },
    { path: '/customers', icon: Users, label: 'Kunden' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Einstellungen' }
  ];
  
  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.logo}>EATECH</h2>
          <button 
            className={styles.toggleButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className={styles.navigation}>
          {navigation.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={20} />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
      
      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>Demo Restaurant</h1>
          </div>
          
          <div className={styles.headerRight}>
            <button className={styles.headerButton}>
              <Bell size={20} />
            </button>
            <button className={styles.headerButton}>
              <User size={20} />
            </button>
          </div>
        </header>
        
        {/* Page Content */}
        <main className={styles.content}>
          <Outlet />
        </main>
        
        {/* Theme Switcher */}
        <div className={styles.themeSwitcherContainer}>
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
};

export default Layout;