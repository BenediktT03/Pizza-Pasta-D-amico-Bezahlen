import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/products', label: 'Produkte', icon: '📦' },
    { path: '/orders', label: 'Bestellungen', icon: '🛒' },
    { path: '/kitchen', label: 'Küche', icon: '👨‍🍳' },
    { path: '/customers', label: 'Kunden', icon: '👥' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
    { path: '/settings', label: 'Einstellungen', icon: '⚙️' }
  ];

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="logo">
          <h1>EATECH</h1>
        </div>
        <ul className="menu">
          {menuItems.map(item => (
            <li key={item.path}>
              <Link 
                to={item.path} 
                className={location.pathname === item.path ? 'active' : ''}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <button onClick={logout} className="logout-btn">Logout</button>
      </nav>
      <main className="content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
