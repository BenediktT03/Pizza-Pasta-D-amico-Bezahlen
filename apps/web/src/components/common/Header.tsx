/**
 * EATECH Header Component
 * 
 * Haupt-Navigation und Header für alle Seiten.
 * Features:
 * - Responsive Navigation
 * - Multi-Language Switcher
 * - Cart Badge
 * - User Menu
 * - Truck-spezifisches Branding
 * - PWA-optimiert
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBagIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  LanguageIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  TruckIcon,
  HeartIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { ShoppingBagIcon as ShoppingBagSolid } from '@heroicons/react/24/solid';

// Core imports
import { useAuth } from '@eatech/core/hooks/useAuth';
import { useCart } from '@eatech/core/hooks/useCart';
import { useTheme } from '@eatech/core/hooks/useTheme';
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { useTruck } from '@eatech/core/hooks/useTruck';
import { Truck } from '@eatech/types';

// UI imports
import {
  Button,
  IconButton,
  Badge,
  Dropdown,
  Avatar,
  Drawer,
  Container,
  Logo,
  Tooltip
} from '@eatech/ui';

// Services
import { analyticsService } from '../../services/analytics.service';

// Styles
import styles from './Header.module.css';

interface HeaderProps {
  truck?: Truck | null;
}

export const Header: React.FC<HeaderProps> = ({ truck }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const { theme, setTheme, availableThemes } = useTheme();
  
  // Feature Flags
  const { enabled: cartEnabled } = useFeatureFlag('shopping_cart');
  const { enabled: userAccountEnabled } = useFeatureFlag('user_accounts');
  const { enabled: multiLanguageEnabled } = useFeatureFlag('multi_language');
  const { enabled: darkModeEnabled } = useFeatureFlag('dark_mode');
  const { enabled: notificationsEnabled } = useFeatureFlag('notifications');
  const { enabled: favoritesEnabled } = useFeatureFlag('favorites_system');
  const { enabled: locationDisplayEnabled } = useFeatureFlag('location_display');
  
  // State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Available languages
  const languages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ];
  
  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  
  // Handle language change
  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    analyticsService.trackEvent('language_changed', { 
      from: i18n.language, 
      to: langCode 
    });
  };
  
  // Handle theme change
  const handleThemeChange = (themeId: string) => {
    const newTheme = availableThemes.find(t => t.id === themeId);
    if (newTheme) {
      setTheme(newTheme);
      analyticsService.trackEvent('theme_changed', { theme: themeId });
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  
  // Navigation items
  const navigationItems = [
    {
      label: t('nav.menu'),
      path: truck ? `/truck/${truck.id}/menu` : '/menu',
      icon: <TruckIcon className="w-5 h-5" />,
      show: true
    },
    {
      label: t('nav.locations'),
      path: '/locations',
      icon: <MapPinIcon className="w-5 h-5" />,
      show: locationDisplayEnabled
    },
    {
      label: t('nav.favorites'),
      path: '/favorites',
      icon: <HeartIcon className="w-5 h-5" />,
      show: favoritesEnabled && isAuthenticated
    }
  ];
  
  return (
    <>
      <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
        <Container>
          <div className={styles.headerContent}>
            {/* Logo */}
            <div className={styles.logo}>
              {truck?.logo ? (
                <Link to={`/truck/${truck.id}`} className={styles.truckLogo}>
                  <img src={truck.logo} alt={truck.name} />
                  <span className={styles.truckName}>{truck.name}</span>
                </Link>
              ) : (
                <Link to="/" className={styles.mainLogo}>
                  <Logo />
                  <span className={styles.logoText}>EATECH</span>
                </Link>
              )}
            </div>
            
            {/* Desktop Navigation */}
            <nav className={styles.desktopNav}>
              <ul className={styles.navList}>
                {navigationItems.filter(item => item.show).map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`${styles.navLink} ${
                        location.pathname === item.path ? styles.active : ''
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            
            {/* Actions */}
            <div className={styles.actions}>
              {/* Language Switcher */}
              {multiLanguageEnabled && (
                <Dropdown
                  trigger={
                    <IconButton variant="ghost" size="sm">
                      <LanguageIcon className="w-5 h-5" />
                    </IconButton>
                  }
                >
                  {languages.map((lang) => (
                    <Dropdown.Item
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      active={i18n.language === lang.code}
                    >
                      <span className={styles.flag}>{lang.flag}</span>
                      {lang.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown>
              )}
              
              {/* Theme Switcher */}
              {darkModeEnabled && (
                <Dropdown
                  trigger={
                    <IconButton variant="ghost" size="sm">
                      {theme.id === 'dark' ? (
                        <MoonIcon className="w-5 h-5" />
                      ) : (
                        <SunIcon className="w-5 h-5" />
                      )}
                    </IconButton>
                  }
                >
                  <Dropdown.Item
                    onClick={() => handleThemeChange('light')}
                    active={theme.id === 'light'}
                  >
                    <SunIcon className="w-4 h-4" />
                    {t('theme.light')}
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => handleThemeChange('dark')}
                    active={theme.id === 'dark'}
                  >
                    <MoonIcon className="w-4 h-4" />
                    {t('theme.dark')}
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => handleThemeChange('auto')}
                    active={theme.id === 'auto'}
                  >
                    <ComputerDesktopIcon className="w-4 h-4" />
                    {t('theme.auto')}
                  </Dropdown.Item>
                </Dropdown>
              )}
              
              {/* Notifications */}
              {notificationsEnabled && isAuthenticated && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/notifications')}
                  className={styles.notificationButton}
                >
                  <BellIcon className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <Badge
                      variant="danger"
                      size="xs"
                      className={styles.notificationBadge}
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </IconButton>
              )}
              
              {/* Cart */}
              {cartEnabled && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/cart')}
                  className={styles.cartButton}
                >
                  {totalItems > 0 ? (
                    <ShoppingBagSolid className="w-5 h-5" />
                  ) : (
                    <ShoppingBagIcon className="w-5 h-5" />
                  )}
                  {totalItems > 0 && (
                    <Badge
                      variant="primary"
                      size="xs"
                      className={styles.cartBadge}
                    >
                      {totalItems}
                    </Badge>
                  )}
                </IconButton>
              )}
              
              {/* User Menu */}
              {userAccountEnabled && (
                <>
                  {isAuthenticated ? (
                    <Dropdown
                      trigger={
                        <Button variant="ghost" size="sm" className={styles.userButton}>
                          <Avatar
                            src={user?.photoURL}
                            name={user?.displayName || user?.email}
                            size="sm"
                          />
                          <span className={styles.userName}>
                            {user?.displayName || t('nav.account')}
                          </span>
                          <ChevronDownIcon className="w-4 h-4" />
                        </Button>
                      }
                      align="end"
                    >
                      <Dropdown.Item onClick={() => navigate('/account')}>
                        <UserIcon className="w-4 h-4" />
                        {t('nav.myAccount')}
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => navigate('/orders')}>
                        <ClockIcon className="w-4 h-4" />
                        {t('nav.orderHistory')}
                      </Dropdown.Item>
                      {favoritesEnabled && (
                        <Dropdown.Item onClick={() => navigate('/favorites')}>
                          <HeartIcon className="w-4 h-4" />
                          {t('nav.favorites')}
                        </Dropdown.Item>
                      )}
                      <Dropdown.Item onClick={() => navigate('/settings')}>
                        <Cog6ToothIcon className="w-4 h-4" />
                        {t('nav.settings')}
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={handleLogout}>
                        <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                        {t('nav.logout')}
                      </Dropdown.Item>
                    </Dropdown>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/login')}
                    >
                      {t('nav.login')}
                    </Button>
                  )}
                </>
              )}
              
              {/* Mobile Menu Toggle */}
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(true)}
                className={styles.mobileMenuToggle}
              >
                <Bars3Icon className="w-6 h-6" />
              </IconButton>
            </div>
          </div>
        </Container>
        
        {/* Truck Info Bar */}
        {truck && locationDisplayEnabled && truck.currentLocation && (
          <div className={styles.truckInfoBar}>
            <Container>
              <div className={styles.truckInfo}>
                <div className={styles.location}>
                  <MapPinIcon className="w-4 h-4" />
                  <span>{truck.currentLocation.address}</span>
                </div>
                {truck.currentLocation.openNow && (
                  <div className={styles.openStatus}>
                    <div className={styles.openBadge}>
                      <span className={styles.openDot} />
                      {t('header.openNow')}
                    </div>
                    <span className={styles.hours}>
                      {truck.currentLocation.openUntil}
                    </span>
                  </div>
                )}
                {truck.phone && (
                  <a href={`tel:${truck.phone}`} className={styles.phone}>
                    <PhoneIcon className="w-4 h-4" />
                    <span>{truck.phone}</span>
                  </a>
                )}
              </div>
            </Container>
          </div>
        )}
      </header>
      
      {/* Mobile Menu Drawer */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        side="right"
        className={styles.mobileDrawer}
      >
        <div className={styles.mobileMenu}>
          {/* Mobile Menu Header */}
          <div className={styles.mobileMenuHeader}>
            <Logo />
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <XMarkIcon className="w-6 h-6" />
            </IconButton>
          </div>
          
          {/* User Info */}
          {isAuthenticated && userAccountEnabled && (
            <div className={styles.mobileUserInfo}>
              <Avatar
                src={user?.photoURL}
                name={user?.displayName || user?.email}
                size="lg"
              />
              <div>
                <p className={styles.mobileUserName}>
                  {user?.displayName || t('nav.guest')}
                </p>
                <p className={styles.mobileUserEmail}>{user?.email}</p>
              </div>
            </div>
          )}
          
          {/* Mobile Navigation */}
          <nav className={styles.mobileNav}>
            <ul>
              {navigationItems.filter(item => item.show).map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`${styles.mobileNavLink} ${
                      location.pathname === item.path ? styles.active : ''
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
              
              {/* Additional mobile items */}
              {isAuthenticated && userAccountEnabled && (
                <>
                  <li>
                    <Link to="/account" className={styles.mobileNavLink}>
                      <UserIcon className="w-5 h-5" />
                      <span>{t('nav.myAccount')}</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/orders" className={styles.mobileNavLink}>
                      <ClockIcon className="w-5 h-5" />
                      <span>{t('nav.orderHistory')}</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
          
          {/* Mobile Actions */}
          <div className={styles.mobileActions}>
            {/* Language Selector */}
            {multiLanguageEnabled && (
              <div className={styles.mobileLanguages}>
                <p className={styles.mobileActionLabel}>{t('nav.language')}</p>
                <div className={styles.languageGrid}>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`${styles.languageButton} ${
                        i18n.language === lang.code ? styles.active : ''
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Theme Selector */}
            {darkModeEnabled && (
              <div className={styles.mobileTheme}>
                <p className={styles.mobileActionLabel}>{t('nav.theme')}</p>
                <div className={styles.themeButtons}>
                  <IconButton
                    variant={theme.id === 'light' ? 'primary' : 'ghost'}
                    onClick={() => handleThemeChange('light')}
                  >
                    <SunIcon className="w-5 h-5" />
                  </IconButton>
                  <IconButton
                    variant={theme.id === 'dark' ? 'primary' : 'ghost'}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <MoonIcon className="w-5 h-5" />
                  </IconButton>
                  <IconButton
                    variant={theme.id === 'auto' ? 'primary' : 'ghost'}
                    onClick={() => handleThemeChange('auto')}
                  >
                    <ComputerDesktopIcon className="w-5 h-5" />
                  </IconButton>
                </div>
              </div>
            )}
            
            {/* Auth Actions */}
            {userAccountEnabled && (
              <div className={styles.mobileAuth}>
                {isAuthenticated ? (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleLogout}
                    startIcon={<ArrowLeftOnRectangleIcon className="w-5 h-5" />}
                  >
                    {t('nav.logout')}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => navigate('/login')}
                  >
                    {t('nav.login')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
};

// Export
export default Header;