import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@eatech/core/hooks/useAuth';
import { useTenant } from '@eatech/core/hooks/useTenant';
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { useRealtime } from '../../hooks/useRealtime';
import { useTranslation } from 'react-i18next';
import { 
  MenuIcon, 
  XIcon, 
  BellIcon, 
  UserIcon,
  LogOutIcon,
  SettingsIcon,
  HelpCircleIcon,
  ChevronDownIcon,
  SearchIcon,
  SunIcon,
  MoonIcon,
  LanguageIcon,
  ShieldCheckIcon
} from '@heroicons/react/outline';
import { Badge } from '@eatech/ui/components/Badge';
import { Avatar } from '@eatech/ui/components/Avatar';
import { Dropdown } from '@eatech/ui/components/Dropdown';
import { Sidebar } from './Sidebar';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { SearchCommand } from '../search/SearchCommand';
import { QuickActions } from '../quick-actions/QuickActions';
import { SystemStatus } from '../system/SystemStatus';
import toast from 'react-hot-toast';

export const AdminLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const { tenant } = useTenant();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Feature flags
  const { enabled: notificationsEnabled } = useFeatureFlag('notifications');
  const { enabled: searchEnabled } = useFeatureFlag('global_search');
  const { enabled: quickActionsEnabled } = useFeatureFlag('quick_actions');
  const { enabled: systemStatusEnabled } = useFeatureFlag('system_status');
  const { enabled: darkModeEnabled } = useFeatureFlag('dark_mode');
  
  // Realtime data
  const { unreadNotifications, activeOrders, systemAlerts } = useRealtime();
  
  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme') as 'light' | 'dark';
    if (savedTheme && darkModeEnabled) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, [darkModeEnabled]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && searchEnabled) {
        e.preventDefault();
        setSearchOpen(true);
      }
      
      // Cmd/Ctrl + B for sidebar toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      
      // Esc to close panels
      if (e.key === 'Escape') {
        setNotificationPanelOpen(false);
        setSearchOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchEnabled]);
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success(t('auth.signedOut'));
    } catch (error) {
      toast.error(t('auth.signOutError'));
    }
  };
  
  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('admin-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };
  
  // Change language
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('admin-language', lang);
    toast.success(t('settings.languageChanged'));
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 1024) && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`${
              mobileMenuOpen ? 'fixed' : 'hidden lg:flex'
            } w-64 lg:w-72 h-full z-30 lg:relative`}
          >
            <Sidebar
              onClose={() => {
                setSidebarOpen(false);
                setMobileMenuOpen(false);
              }}
              isMobile={window.innerWidth < 1024}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-20">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left side */}
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setSidebarOpen(!sidebarOpen);
                    setMobileMenuOpen(!mobileMenuOpen);
                  }}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary lg:hidden"
                >
                  {mobileMenuOpen ? (
                    <XIcon className="h-6 w-6" />
                  ) : (
                    <MenuIcon className="h-6 w-6" />
                  )}
                </button>
                
                {/* Tenant name and status */}
                <div className="ml-4 flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {tenant?.name || 'Food Truck'}
                  </h1>
                  {tenant?.isActive && (
                    <Badge variant="success" className="ml-2">
                      {t('common.active')}
                    </Badge>
                  )}
                  {tenant?.trialEndsAt && new Date(tenant.trialEndsAt) > new Date() && (
                    <Badge variant="warning" className="ml-2">
                      {t('billing.trial')}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Right side */}
              <div className="flex items-center space-x-4">
                {/* Quick actions */}
                {quickActionsEnabled && <QuickActions />}
                
                {/* Search */}
                {searchEnabled && (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <SearchIcon className="h-5 w-5" />
                  </button>
                )}
                
                {/* Dark mode toggle */}
                {darkModeEnabled && (
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {theme === 'light' ? (
                      <MoonIcon className="h-5 w-5" />
                    ) : (
                      <SunIcon className="h-5 w-5" />
                    )}
                  </button>
                )}
                
                {/* Language selector */}
                <Dropdown
                  trigger={
                    <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <LanguageIcon className="h-5 w-5" />
                    </button>
                  }
                >
                  <Dropdown.Item onClick={() => changeLanguage('de')}>
                    🇩🇪 Deutsch
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => changeLanguage('fr')}>
                    🇫🇷 Français
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => changeLanguage('it')}>
                    🇮🇹 Italiano
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => changeLanguage('en')}>
                    🇬🇧 English
                  </Dropdown.Item>
                </Dropdown>
                
                {/* Notifications */}
                {notificationsEnabled && (
                  <button
                    onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                  >
                    <BellIcon className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                    )}
                  </button>
                )}
                
                {/* System status */}
                {systemStatusEnabled && <SystemStatus alerts={systemAlerts} />}
                
                {/* User menu */}
                <Dropdown
                  trigger={
                    <button className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                      <Avatar
                        src={user?.photoURL}
                        alt={user?.displayName || user?.email}
                        size="sm"
                      />
                      <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-400" />
                    </button>
                  }
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.displayName || user?.email}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user?.role === 'owner' ? t('roles.owner') : t('roles.staff')}
                    </p>
                  </div>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    icon={<UserIcon className="h-4 w-4" />}
                    onClick={() => navigate('/settings/profile')}
                  >
                    {t('nav.profile')}
                  </Dropdown.Item>
                  <Dropdown.Item
                    icon={<SettingsIcon className="h-4 w-4" />}
                    onClick={() => navigate('/settings')}
                  >
                    {t('nav.settings')}
                  </Dropdown.Item>
                  <Dropdown.Item
                    icon={<ShieldCheckIcon className="h-4 w-4" />}
                    onClick={() => navigate('/settings/security')}
                  >
                    {t('nav.security')}
                  </Dropdown.Item>
                  <Dropdown.Item
                    icon={<HelpCircleIcon className="h-4 w-4" />}
                    onClick={() => window.open('https://docs.eatech.ch', '_blank')}
                  >
                    {t('nav.help')}
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    icon={<LogOutIcon className="h-4 w-4" />}
                    onClick={handleSignOut}
                    variant="danger"
                  >
                    {t('auth.signOut')}
                  </Dropdown.Item>
                </Dropdown>
              </div>
            </div>
          </div>
          
          {/* Active orders bar */}
          {activeOrders > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-100 dark:border-yellow-900/50 px-4 py-2">
              <div className="flex items-center text-sm text-yellow-800 dark:text-yellow-200">
                <div className="flex-shrink-0">
                  <Badge variant="warning">{activeOrders}</Badge>
                </div>
                <p className="ml-2">
                  {t('orders.activeOrders', { count: activeOrders })}
                </p>
                <button
                  onClick={() => navigate('/orders?status=active')}
                  className="ml-auto text-yellow-600 hover:text-yellow-500 font-medium"
                >
                  {t('common.viewAll')}
                </button>
              </div>
            </div>
          )}
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="py-6">
            <div className="mx-auto px-4 sm:px-6 md:px-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
      
      {/* Notification Panel */}
      {notificationsEnabled && (
        <NotificationPanel
          isOpen={notificationPanelOpen}
          onClose={() => setNotificationPanelOpen(false)}
        />
      )}
      
      {/* Search Command Palette */}
      {searchEnabled && (
        <SearchCommand
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      )}
      
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => {
            setSidebarOpen(false);
            setMobileMenuOpen(false);
          }}
        />
      )}
    </div>
  );
};
