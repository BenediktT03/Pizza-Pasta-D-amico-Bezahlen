/**
 * EATECH - Layout Component
 * Version: 6.0.0
 * Description: Haupt-Layout-Komponente mit Lazy Loading für alle Sub-Komponenten
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /packages/ui/src/components/Layout/Layout.jsx
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Menu, X, Home, ShoppingCart, Package, Users, BarChart3, 
    Settings, LogOut, Bell, Search, Moon, Sun, Globe, ChefHat,
    ClipboardList, TrendingUp, CreditCard, Gift, HelpCircle, User,
    ChevronLeft, ChevronRight, Maximize2, Minimize2
} from 'lucide-react';

// Lazy load heavy components
const NotificationDropdown = lazy(() => import('./NotificationDropdown'));
const UserMenu = lazy(() => import('./UserMenu'));
const LanguageSelector = lazy(() => import('./LanguageSelector'));
const CartPreview = lazy(() => import('./CartPreview'));
const SearchModal = lazy(() => import('./SearchModal'));
const ThemeCustomizer = lazy(() => import('./ThemeCustomizer'));
const NavigationMenu = lazy(() => import('./NavigationMenu'));
const BreadcrumbNav = lazy(() => import('./BreadcrumbNav'));

// Lazy load contexts
const AuthContext = lazy(() => import('../../contexts/AuthContext').then(mod => ({ default: mod.useAuth })));
const TenantContext = lazy(() => import('../../contexts/TenantContext').then(mod => ({ default: mod.useTenant })));
const ThemeContext = lazy(() => import('../../contexts/ThemeContext').then(mod => ({ default: mod.useTheme })));
const CartContext = lazy(() => import('../../contexts/CartContext').then(mod => ({ default: mod.useCart })));
const NotificationContext = lazy(() => import('../../contexts/NotificationContext').then(mod => ({ default: mod.useNotifications })));

// Loading components
const NavSkeleton = () => (
    <div className="animate-pulse">
        <div className="h-16 bg-gray-200 dark:bg-gray-800"></div>
    </div>
);

const SidebarSkeleton = () => (
    <div className="animate-pulse w-64 h-full bg-gray-100 dark:bg-gray-900">
        <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
            ))}
        </div>
    </div>
);

// Styles
import styles from './Layout.module.css';

// Navigation items configuration
const getNavigationItems = (role) => {
    const baseItems = [
        {
            id: 'home',
            label: 'Dashboard',
            icon: Home,
            path: '/dashboard',
            roles: ['customer', 'staff', 'admin', 'owner']
        },
        {
            id: 'menu',
            label: 'Menü',
            icon: ChefHat,
            path: '/menu',
            roles: ['customer']
        },
        {
            id: 'orders',
            label: 'Bestellungen',
            icon: ClipboardList,
            path: '/orders',
            roles: ['customer', 'staff', 'admin', 'owner']
        },
        {
            id: 'products',
            label: 'Produkte',
            icon: Package,
            path: '/products',
            roles: ['admin', 'owner']
        },
        {
            id: 'customers',
            label: 'Kunden',
            icon: Users,
            path: '/customers',
            roles: ['admin', 'owner']
        },
        {
            id: 'analytics',
            label: 'Analytics',
            icon: BarChart3,
            path: '/analytics',
            roles: ['admin', 'owner']
        },
        {
            id: 'billing',
            label: 'Abrechnung',
            icon: CreditCard,
            path: '/billing',
            roles: ['admin', 'owner']
        },
        {
            id: 'loyalty',
            label: 'Treueprogramm',
            icon: Gift,
            path: '/loyalty',
            roles: ['admin', 'owner']
        },
        {
            id: 'settings',
            label: 'Einstellungen',
            icon: Settings,
            path: '/settings',
            roles: ['staff', 'admin', 'owner']
        }
    ];

    return baseItems.filter(item => item.roles.includes(role));
};

// Layout component
const Layout = ({ variant = 'default', children }) => {
    // State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
    const [contexts, setContexts] = useState({});

    // Hooks
    const navigate = useNavigate();
    const location = useLocation();

    // Load contexts
    useEffect(() => {
        const loadContexts = async () => {
            const [authMod, tenantMod, themeMod, cartMod, notificationMod] = await Promise.all([
                import('../../contexts/AuthContext'),
                import('../../contexts/TenantContext'),
                import('../../contexts/ThemeContext'),
                import('../../contexts/CartContext'),
                import('../../contexts/NotificationContext')
            ]);

            setContexts({
                useAuth: authMod.useAuth,
                useTenant: tenantMod.useTenant,
                useTheme: themeMod.useTheme,
                useCart: cartMod.useCart,
                useNotifications: notificationMod.useNotifications
            });
        };
        loadContexts();
    }, []);

    // Use contexts if loaded
    const auth = contexts.useAuth ? contexts.useAuth() : { user: null, logout: () => {} };
    const tenant = contexts.useTenant ? contexts.useTenant() : { tenant: null };
    const theme = contexts.useTheme ? contexts.useTheme() : { theme: 'light', toggleTheme: () => {} };
    const cart = contexts.useCart ? contexts.useCart() : { itemCount: 0 };
    const notifications = contexts.useNotifications ? contexts.useNotifications() : { unreadCount: 0 };

    const { user, logout } = auth;
    const { theme: currentTheme, toggleTheme } = theme;
    const { itemCount } = cart;
    const { unreadCount } = notifications;

    // Get navigation items based on user role
    const navigationItems = user ? getNavigationItems(user.role) : [];

    // Responsive sidebar
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location]);

    // Fullscreen mode
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setFullscreen(true);
        } else {
            document.exitFullscreen();
            setFullscreen(false);
        }
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
            // Ctrl/Cmd + B for sidebar toggle
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                setSidebarOpen(prev => !prev);
            }
            // Escape to close modals
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setMobileMenuOpen(false);
                setShowThemeCustomizer(false);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    // Handle logout
    const handleLogout = useCallback(async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }, [logout, navigate]);

    // Render navigation item
    const renderNavItem = (item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
            <Link
                key={item.id}
                to={item.path}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
                <Icon size={20} className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
                {item.badge && (
                    <span className={styles.navBadge}>{item.badge}</span>
                )}
            </Link>
        );
    };

    // Render header
    const renderHeader = () => (
        <header className={`${styles.header} ${!sidebarOpen ? styles.expanded : ''}`}>
            <div className={styles.headerLeft}>
                {/* Mobile menu toggle */}
                <button
                    className={styles.mobileMenuToggle}
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Sidebar toggle (desktop) */}
                <button
                    className={styles.sidebarToggle}
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Toggle sidebar"
                >
                    {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>

                {/* Breadcrumb */}
                <Suspense fallback={<div className={styles.breadcrumbSkeleton} />}>
                    <BreadcrumbNav />
                </Suspense>
            </div>

            <div className={styles.headerRight}>
                {/* Search */}
                <button
                    className={styles.headerButton}
                    onClick={() => setSearchOpen(true)}
                    aria-label="Search"
                >
                    <Search size={20} />
                </button>

                {/* Theme toggle */}
                <button
                    className={styles.headerButton}
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                >
                    {currentTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Language selector */}
                <Suspense fallback={<div className={styles.iconSkeleton} />}>
                    <LanguageSelector />
                </Suspense>

                {/* Fullscreen toggle */}
                <button
                    className={styles.headerButton}
                    onClick={toggleFullscreen}
                    aria-label="Toggle fullscreen"
                >
                    {fullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>

                {/* Cart (for customers) */}
                {user?.role === 'customer' && (
                    <Suspense fallback={<div className={styles.iconSkeleton} />}>
                        <CartPreview itemCount={itemCount} />
                    </Suspense>
                )}

                {/* Notifications */}
                <Suspense fallback={<div className={styles.iconSkeleton} />}>
                    <NotificationDropdown unreadCount={unreadCount} />
                </Suspense>

                {/* User menu */}
                <Suspense fallback={<div className={styles.iconSkeleton} />}>
                    <UserMenu user={user} onLogout={handleLogout} />
                </Suspense>
            </div>
        </header>
    );

    // Render sidebar
    const renderSidebar = () => (
        <AnimatePresence>
            {(sidebarOpen || mobileMenuOpen) && (
                <motion.aside
                    initial={{ x: -300 }}
                    animate={{ x: 0 }}
                    exit={{ x: -300 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={`${styles.sidebar} ${mobileMenuOpen ? styles.mobile : ''}`}
                >
                    {/* Logo */}
                    <div className={styles.logo}>
                        <Link to="/" className={styles.logoLink}>
                            <span className={styles.logoIcon}>🍴</span>
                            <span className={styles.logoText}>EATECH</span>
                        </Link>
                    </div>

                    {/* Tenant info */}
                    {tenant?.tenant && (
                        <div className={styles.tenantInfo}>
                            <h3 className={styles.tenantName}>{tenant.tenant.name}</h3>
                            <p className={styles.tenantPlan}>{tenant.tenant.plan} Plan</p>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className={styles.navigation}>
                        {navigationItems.map(renderNavItem)}
                    </nav>

                    {/* Bottom actions */}
                    <div className={styles.sidebarBottom}>
                        <button
                            className={styles.navItem}
                            onClick={() => setShowThemeCustomizer(true)}
                        >
                            <Settings size={20} className={styles.navIcon} />
                            <span className={styles.navLabel}>Theme anpassen</span>
                        </button>

                        <button
                            className={`${styles.navItem} ${styles.logoutButton}`}
                            onClick={handleLogout}
                        >
                            <LogOut size={20} className={styles.navIcon} />
                            <span className={styles.navLabel}>Abmelden</span>
                        </button>
                    </div>

                    {/* Version info */}
                    <div className={styles.versionInfo}>
                        <span>Version 3.0.0</span>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );

    // Mobile menu overlay
    const renderMobileOverlay = () => (
        <AnimatePresence>
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={styles.mobileOverlay}
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
        </AnimatePresence>
    );

    // Main content
    const renderContent = () => (
        <main className={`${styles.main} ${!sidebarOpen ? styles.expanded : ''}`}>
            <div className={styles.mainContent}>
                {children || <Outlet />}
            </div>
        </main>
    );

    // Render modals
    const renderModals = () => (
        <>
            {/* Search Modal */}
            {searchOpen && (
                <Suspense fallback={<div className={styles.modalLoading} />}>
                    <SearchModal
                        isOpen={searchOpen}
                        onClose={() => setSearchOpen(false)}
                    />
                </Suspense>
            )}

            {/* Theme Customizer */}
            {showThemeCustomizer && (
                <Suspense fallback={<div className={styles.modalLoading} />}>
                    <ThemeCustomizer
                        isOpen={showThemeCustomizer}
                        onClose={() => setShowThemeCustomizer(false)}
                    />
                </Suspense>
            )}
        </>
    );

    // Layout variants
    if (variant === 'minimal') {
        return (
            <div className={styles.minimalLayout}>
                {renderHeader()}
                {renderContent()}
                {renderModals()}
            </div>
        );
    }

    if (variant === 'fullwidth') {
        return (
            <div className={styles.fullwidthLayout}>
                {renderContent()}
                {renderModals()}
            </div>
        );
    }

    // Default layout
    return (
        <div className={`${styles.layout} ${currentTheme === 'dark' ? styles.dark : ''}`}>
            <Suspense fallback={<NavSkeleton />}>
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

export default Layout;