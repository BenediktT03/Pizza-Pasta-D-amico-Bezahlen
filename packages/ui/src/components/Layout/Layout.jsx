/**
 * EATECH - Layout Component
 * Version: 5.0.0
 * Description: Haupt-Layout-Komponente mit responsive Navigation,
 *              Theme-Support und Role-based Navigation
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/components/common/Layout.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Menu, 
    X, 
    Home, 
    ShoppingCart, 
    Package, 
    Users, 
    BarChart3, 
    Settings,
    LogOut,
    Bell,
    Search,
    Moon,
    Sun,
    Globe,
    ChefHat,
    ClipboardList,
    TrendingUp,
    CreditCard,
    Gift,
    HelpCircle,
    User
} from 'lucide-react';

// Contexts
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCart } from '../../contexts/CartContext';
import { useNotifications } from '../../contexts/NotificationContext';

// Components
import NotificationDropdown from './NotificationDropdown';
import UserMenu from './UserMenu';
import LanguageSelector from './LanguageSelector';
import CartPreview from './CartPreview';

// Styles
import styles from './Layout.module.css';

// ============================================================================
// NAVIGATION CONFIGURATION
// ============================================================================
const navigationConfig = {
    customer: [
        { path: '/', label: 'Menü', icon: Home },
        { path: '/account/orders', label: 'Bestellungen', icon: ClipboardList },
        { path: '/account/profile', label: 'Profil', icon: User }
    ],
    staff: [
        { path: '/staff', label: 'Bestellungen', icon: ClipboardList },
        { path: '/staff/kitchen', label: 'Küche', icon: ChefHat }
    ],
    admin: [
        { path: '/admin', label: 'Dashboard', icon: Home },
        { path: '/admin/orders', label: 'Bestellungen', icon: ClipboardList },
        { path: '/admin/products', label: 'Produkte', icon: Package },
        { path: '/admin/inventory', label: 'Inventar', icon: Package, feature: 'inventory' },
        { path: '/admin/customers', label: 'Kunden', icon: Users },
        { path: '/admin/discounts', label: 'Rabatte', icon: Gift },
        { path: '/admin/loyalty', label: 'Treueprogramm', icon: Gift, feature: 'loyalty' },
        { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/admin/settings', label: 'Einstellungen', icon: Settings }
    ],
    master: [
        { path: '/', label: 'Dashboard', icon: Home },
        { path: '/tenants', label: 'Tenants', icon: Users },
        { path: '/analytics', label: 'Analytics', icon: TrendingUp },
        { path: '/system', label: 'System', icon: Settings },
        { path: '/billing', label: 'Billing', icon: CreditCard }
    ]
};

// ============================================================================
// COMPONENT
// ============================================================================
const Layout = ({ variant = 'default' }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, hasRole } = useAuth();
    const { tenant, hasFeature, isMasterAdmin } = useTenant();
    const { theme, toggleTheme } = useTheme();
    const { cartItems, cartCount } = useCart();
    const { unreadCount } = useNotifications();
    
    // State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    // Get navigation items based on user role
    const getNavigationItems = useCallback(() => {
        if (isMasterAdmin) return navigationConfig.master;
        
        let items = [];
        
        // Add role-specific items
        if (hasRole('admin')) {
            items = navigationConfig.admin;
        } else if (hasRole('staff')) {
            items = navigationConfig.staff;
        } else {
            items = navigationConfig.customer;
        }
        
        // Filter by features
        return items.filter(item => !item.feature || hasFeature(item.feature));
    }, [hasRole, hasFeature, isMasterAdmin]);
    
    const navigationItems = getNavigationItems();
    
    // Handle responsive
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(false);
            }
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // Close sidebar on navigation
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location]);
    
    // Handle logout
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };
    
    // Check if path is active
    const isActivePath = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };
    
    // ============================================================================
    // RENDER HELPERS
    // ============================================================================
    
    const renderLogo = () => (
        <Link to="/" className={styles.logo}>
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {tenant?.logo ? (
                    <img src={tenant.logo} alt={tenant.name} className={styles.logoImage} />
                ) : (
                    <h1 className={styles.logoText}>
                        {tenant?.name || 'EATECH'}
                    </h1>
                )}
            </motion.div>
        </Link>
    );
    
    const renderNavigation = () => (
        <nav className={styles.navigation}>
            <ul className={styles.navList}>
                {navigationItems.map(item => {
                    const Icon = item.icon;
                    const isActive = isActivePath(item.path);
                    
                    return (
                        <li key={item.path}>
                            <Link
                                to={item.path}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        className={styles.activeIndicator}
                                        layoutId="activeNav"
                                        transition={{ type: 'spring', stiffness: 300 }}
                                    />
                                )}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
    
    const renderHeader = () => (
        <header className={styles.header}>
            <div className={styles.headerLeft}>
                {isMobile && (
                    <button
                        className={styles.menuButton}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        aria-label="Toggle menu"
                    >
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                )}
                {renderLogo()}
            </div>
            
            <div className={styles.headerCenter}>
                {!isMobile && variant !== 'staff' && (
                    <div className={styles.searchBar}>
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Suchen..."
                            className={styles.searchInput}
                        />
                    </div>
                )}
            </div>
            
            <div className={styles.headerRight}>
                {/* Language Selector */}
                {!isMasterAdmin && <LanguageSelector />}
                
                {/* Theme Toggle */}
                <button
                    className={styles.iconButton}
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                
                {/* Cart (Customer only) */}
                {!hasRole('admin') && !hasRole('staff') && !isMasterAdmin && (
                    <div className={styles.cartButton}>
                        <ShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span className={styles.cartBadge}>{cartCount}</span>
                        )}
                        <CartPreview />
                    </div>
                )}
                
                {/* Notifications */}
                <div className={styles.notificationButton}>
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className={styles.notificationBadge}>{unreadCount}</span>
                    )}
                    <NotificationDropdown />
                </div>
                
                {/* User Menu */}
                {user ? (
                    <UserMenu onLogout={handleLogout} />
                ) : (
                    <Link to="/login" className={styles.loginButton}>
                        Anmelden
                    </Link>
                )}
            </div>
        </header>
    );
    
    const renderSidebar = () => (
        <AnimatePresence>
            {(isSidebarOpen || !isMobile) && (
                <>
                    {isMobile && (
                        <motion.div
                            className={styles.overlay}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}
                    <motion.aside
                        className={styles.sidebar}
                        initial={isMobile ? { x: -300 } : false}
                        animate={{ x: 0 }}
                        exit={isMobile ? { x: -300 } : false}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        {isMobile && (
                            <div className={styles.sidebarHeader}>
                                {renderLogo()}
                                <button
                                    className={styles.closeButton}
                                    onClick={() => setIsSidebarOpen(false)}
                                    aria-label="Close sidebar"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        )}
                        
                        {renderNavigation()}
                        
                        <div className={styles.sidebarFooter}>
                            {/* Help */}
                            <Link to="/help" className={styles.helpLink}>
                                <HelpCircle size={20} />
                                <span>Hilfe & Support</span>
                            </Link>
                            
                            {/* Logout */}
                            {user && (
                                <button
                                    className={styles.logoutButton}
                                    onClick={handleLogout}
                                >
                                    <LogOut size={20} />
                                    <span>Abmelden</span>
                                </button>
                            )}
                            
                            {/* Version */}
                            <div className={styles.version}>
                                v{process.env.REACT_APP_VERSION || '5.0.0'}
                            </div>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
    
    // ============================================================================
    // MAIN RENDER
    // ============================================================================
    
    // Different layouts for different variants
    if (variant === 'fullscreen') {
        return <Outlet />;
    }
    
    if (variant === 'minimal') {
        return (
            <div className={styles.minimalLayout}>
                {renderHeader()}
                <main className={styles.minimalContent}>
                    <Outlet />
                </main>
            </div>
        );
    }
    
    // Default layout with sidebar
    return (
        <div className={`${styles.layout} ${theme}`}>
            {renderHeader()}
            <div className={styles.container}>
                {renderSidebar()}
                <main className={styles.content}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

// ============================================================================
// EXPORT
// ============================================================================
export default Layout;