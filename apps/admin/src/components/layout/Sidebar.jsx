/**
 * EATECH - Advanced Sidebar Menu Component
 * File Path: /apps/admin/src/components/layout/Sidebar.jsx
 */

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Menu, X, ChevronDown, ChevronRight, Star, 
  Home, Package, ShoppingCart, ChefHat, Users, 
  BarChart3, Settings, Gift, Truck, Calendar,
  CreditCard, Bell, Shield, Globe, Palette,
  MessageSquare, FileText, Mail, Smartphone,
  Wifi, MapPin, Clock, DollarSign, Percent,
  Heart, Coffee, Pizza, Utensils, Cookie,
  Wine, Soup, Sandwich
} from 'lucide-react';
import './Sidebar.css';

// Menu Structure with Emojis
const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    emoji: '🏠',
    path: '/',
    description: 'Übersicht & Statistiken'
  },
  {
    id: 'orders',
    label: 'Bestellverwaltung',
    icon: ShoppingCart,
    emoji: '🛒',
    group: true,
    children: [
      { id: 'orders-active', label: 'Aktive Bestellungen', emoji: '📋', path: '/orders/active' },
      { id: 'orders-history', label: 'Bestellverlauf', emoji: '📚', path: '/orders/history' },
      { id: 'orders-pos', label: 'POS Terminal', emoji: '💳', path: '/orders/pos' }
    ]
  },
  {
    id: 'kitchen',
    label: 'Küchen-Management',
    icon: ChefHat,
    emoji: '👨‍🍳',
    group: true,
    children: [
      { id: 'kitchen-display', label: 'Kitchen Display', emoji: '📺', path: '/kitchen/display' },
      { id: 'kitchen-queue', label: 'Warteschlange', emoji: '⏱️', path: '/kitchen/queue' },
      { id: 'kitchen-recipes', label: 'Rezepte', emoji: '📖', path: '/kitchen/recipes' }
    ]
  },
  {
    id: 'products',
    label: 'Produkt-Management',
    icon: Package,
    emoji: '📦',
    group: true,
    children: [
      { id: 'products-list', label: 'Produktkatalog', emoji: '🍔', path: '/products' },
      { id: 'products-categories', label: 'Kategorien', emoji: '🗂️', path: '/products/categories' },
      { id: 'products-modifiers', label: 'Extras & Optionen', emoji: '➕', path: '/products/modifiers' },
      { id: 'products-inventory', label: 'Lagerbestand', emoji: '📊', path: '/products/inventory' }
    ]
  },
  {
    id: 'menu',
    label: 'Menü-Design',
    icon: Utensils,
    emoji: '🍽️',
    group: true,
    children: [
      { id: 'menu-builder', label: 'Menü Builder', emoji: '🎨', path: '/menu/builder' },
      { id: 'menu-qr', label: 'QR-Code Menü', emoji: '📱', path: '/menu/qr' },
      { id: 'menu-daily', label: 'Tagesmenü', emoji: '📅', path: '/menu/daily' }
    ]
  },
  {
    id: 'customers',
    label: 'Kunden',
    icon: Users,
    emoji: '👥',
    group: true,
    children: [
      { id: 'customers-list', label: 'Kundenliste', emoji: '📋', path: '/customers' },
      { id: 'customers-loyalty', label: 'Treueprogramm', emoji: '⭐', path: '/customers/loyalty' },
      { id: 'customers-reviews', label: 'Bewertungen', emoji: '💬', path: '/customers/reviews' }
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Gift,
    emoji: '🎁',
    group: true,
    children: [
      { id: 'marketing-campaigns', label: 'Kampagnen', emoji: '📢', path: '/marketing/campaigns' },
      { id: 'marketing-discounts', label: 'Rabatte & Coupons', emoji: '🎟️', path: '/marketing/discounts' },
      { id: 'marketing-notifications', label: 'Push Benachrichtigungen', emoji: '🔔', path: '/marketing/notifications' }
    ]
  },
  {
    id: 'delivery',
    label: 'Lieferung',
    icon: Truck,
    emoji: '🚚',
    group: true,
    children: [
      { id: 'delivery-zones', label: 'Lieferzonen', emoji: '🗺️', path: '/delivery/zones' },
      { id: 'delivery-drivers', label: 'Fahrer-Management', emoji: '🚗', path: '/delivery/drivers' },
      { id: 'delivery-tracking', label: 'Live Tracking', emoji: '📍', path: '/delivery/tracking' }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    emoji: '📊',
    group: true,
    children: [
      { id: 'analytics-sales', label: 'Umsatzanalyse', emoji: '💰', path: '/analytics/sales' },
      { id: 'analytics-products', label: 'Produktanalyse', emoji: '📈', path: '/analytics/products' },
      { id: 'analytics-customers', label: 'Kundenanalyse', emoji: '👤', path: '/analytics/customers' },
      { id: 'analytics-ai', label: 'AI Insights', emoji: '🤖', path: '/analytics/ai' }
    ]
  },
  {
    id: 'finance',
    label: 'Finanzen',
    icon: DollarSign,
    emoji: '💰',
    group: true,
    children: [
      { id: 'finance-reports', label: 'Finanzberichte', emoji: '📊', path: '/finance/reports' },
      { id: 'finance-payments', label: 'Zahlungen', emoji: '💳', path: '/finance/payments' },
      { id: 'finance-taxes', label: 'Steuern', emoji: '🧾', path: '/finance/taxes' }
    ]
  },
  {
    id: 'settings',
    label: 'Einstellungen',
    icon: Settings,
    emoji: '⚙️',
    group: true,
    children: [
      { id: 'settings-general', label: 'Allgemein', emoji: '🔧', path: '/settings/general' },
      { id: 'settings-opening-hours', label: 'Öffnungszeiten', emoji: '🕐', path: '/settings/hours' },
      { id: 'settings-payments', label: 'Zahlungsmethoden', emoji: '💳', path: '/settings/payments' },
      { id: 'settings-integrations', label: 'Integrationen', emoji: '🔌', path: '/settings/integrations' },
      { id: 'settings-team', label: 'Team & Berechtigungen', emoji: '👨‍💼', path: '/settings/team' },
      { id: 'settings-theme', label: 'Design & Themes', emoji: '🎨', path: '/settings/theme' }
    ]
  }
];

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('eatech-favorites');
    return saved ? JSON.parse(saved) : ['dashboard', 'orders-active', 'products-list'];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();

  // Toggle sidebar
  const toggleSidebar = () => setIsOpen(!isOpen);

  // Toggle group expansion
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Toggle favorite
  const toggleFavorite = (itemId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setFavorites(prev => {
      const newFavorites = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      
      localStorage.setItem('eatech-favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  // Filter menu items based on search
  const filterMenuItems = (items, search) => {
    if (!search) return items;
    
    return items.filter(item => {
      const matchesSearch = item.label.toLowerCase().includes(search.toLowerCase()) ||
                          item.description?.toLowerCase().includes(search.toLowerCase());
      
      if (item.children) {
        const hasMatchingChildren = item.children.some(child => 
          child.label.toLowerCase().includes(search.toLowerCase())
        );
        return matchesSearch || hasMatchingChildren;
      }
      
      return matchesSearch;
    });
  };

  const filteredItems = filterMenuItems(menuItems, searchTerm);

  // Get favorite items
  const getFavoriteItems = () => {
    const items = [];
    menuItems.forEach(item => {
      if (favorites.includes(item.id)) {
        items.push(item);
      }
      if (item.children) {
        item.children.forEach(child => {
          if (favorites.includes(child.id)) {
            items.push({ ...child, parent: item.label });
          }
        });
      }
    });
    return items;
  };

  // Add/remove body class for layout adjustment
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isOpen]);

  return (
    <>
      {/* Toggle Button */}
      <button 
        className={`sidebar-toggle ${!isOpen ? 'closed' : ''}`}
        onClick={toggleSidebar}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            <span className="sidebar-logo">🚀</span>
            EATECH Admin
          </h2>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <input
            type="text"
            placeholder="Funktion suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Favorites Section */}
        {!searchTerm && favorites.length > 0 && (
          <div className="sidebar-section">
            <h3 className="section-title">⭐ Favoriten</h3>
            <div className="favorites-grid">
              {getFavoriteItems().map(item => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) => `favorite-item ${isActive ? 'active' : ''}`}
                >
                  <span className="favorite-emoji">{item.emoji}</span>
                  <span className="favorite-label">{item.label}</span>
                  {item.parent && <span className="favorite-parent">{item.parent}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav className="sidebar-nav">
          {filteredItems.map((item) => (
            <div key={item.id} className="nav-item-wrapper">
              {item.group ? (
                <>
                  <button
                    className={`nav-group ${expandedGroups.includes(item.id) ? 'expanded' : ''}`}
                    onClick={() => toggleGroup(item.id)}
                  >
                    <div className="nav-group-left">
                      <span className="nav-emoji">{item.emoji}</span>
                      <span className="nav-label">{item.label}</span>
                    </div>
                    <div className="nav-group-right">
                      <button
                        className={`favorite-btn ${favorites.includes(item.id) ? 'active' : ''}`}
                        onClick={(e) => toggleFavorite(item.id, e)}
                      >
                        <Star size={14} />
                      </button>
                      {expandedGroups.includes(item.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>
                  
                  {expandedGroups.includes(item.id) && (
                    <div className="nav-children">
                      {item.children.map(child => (
                        <NavLink
                          key={child.id}
                          to={child.path}
                          className={({ isActive }) => `nav-child ${isActive ? 'active' : ''}`}
                        >
                          <span className="child-emoji">{child.emoji}</span>
                          <span className="child-label">{child.label}</span>
                          <button
                            className={`favorite-btn ${favorites.includes(child.id) ? 'active' : ''}`}
                            onClick={(e) => toggleFavorite(child.id, e)}
                          >
                            <Star size={12} />
                          </button>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-item-left">
                    <span className="nav-emoji">{item.emoji}</span>
                    <span className="nav-label">{item.label}</span>
                  </div>
                  <button
                    className={`favorite-btn ${favorites.includes(item.id) ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(item.id, e)}
                  >
                    <Star size={14} />
                  </button>
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="footer-info">
            <span className="footer-emoji">🍕</span>
            <div>
              <p className="footer-restaurant">Demo Restaurant</p>
              <p className="footer-plan">Premium Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}
    </>
  );
};

export default Sidebar;