import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { useAuth } from '@eatech/core/hooks/useAuth';
import {
  HomeIcon,
  ShoppingCartIcon,
  CubeIcon,
  ChartBarIcon,
  CogIcon,
  UsersIcon,
  ClipboardListIcon,
  TagIcon,
  LocationMarkerIcon,
  UserGroupIcon,
  DocumentReportIcon,
  BellIcon,
  ColorSwatchIcon,
  LinkIcon,
  TicketIcon,
  BookOpenIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  BeakerIcon,
  XIcon
} from '@heroicons/react/outline';
import { motion } from 'framer-motion';
import { Logo } from '@eatech/ui/components/Logo';

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  requiresFeature?: string;
  requiresRole?: string[];
  children?: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, isMobile }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  
  // Feature flags
  const features = {
    haccp: useFeatureFlag('haccp_compliance'),
    locations: useFeatureFlag('location_management'),
    customers: useFeatureFlag('customer_insights'),
    reports: useFeatureFlag('advanced_reports'),
    notifications: useFeatureFlag('notification_center'),
    branding: useFeatureFlag('branding_customization'),
    integrations: useFeatureFlag('third_party_integrations'),
    support: useFeatureFlag('support_tickets'),
    recipes: useFeatureFlag('recipe_management'),
  };
  
  // Navigation items
  const navigation: NavItem[] = [
    {
      name: t('nav.dashboard'),
      href: '/',
      icon: HomeIcon,
    },
    {
      name: t('nav.orders'),
      href: '/orders',
      icon: ShoppingCartIcon,
      badge: '3', // Active orders count
    },
    {
      name: t('nav.products'),
      href: '/products',
      icon: CubeIcon,
    },
    {
      name: t('nav.inventory'),
      href: '/inventory',
      icon: ClipboardListIcon,
    },
    {
      name: t('nav.analytics'),
      href: '/analytics',
      icon: ChartBarIcon,
    },
    {
      name: t('nav.promotions'),
      href: '/promotions',
      icon: TagIcon,
    },
    // Conditional navigation items
    ...(features.haccp.enabled ? [{
      name: t('nav.haccp'),
      href: '/haccp',
      icon: ShieldCheckIcon,
      badge: '!', // Alert indicator
    }] : []),
    ...(features.locations.enabled ? [{
      name: t('nav.locations'),
      href: '/locations',
      icon: LocationMarkerIcon,
    }] : []),
    ...(features.customers.enabled ? [{
      name: t('nav.customers'),
      href: '/customers',
      icon: UserGroupIcon,
    }] : []),
    ...(features.reports.enabled ? [{
      name: t('nav.reports'),
      href: '/reports',
      icon: DocumentReportIcon,
    }] : []),
    ...(features.recipes.enabled ? [{
      name: t('nav.recipes'),
      href: '/recipes',
      icon: BookOpenIcon,
    }] : []),
  ];
  
  // Settings section
  const settingsNavigation: NavItem[] = [
    {
      name: t('nav.payment'),
      href: '/payment',
      icon: CreditCardIcon,
    },
    ...(features.notifications.enabled ? [{
      name: t('nav.notifications'),
      href: '/notifications',
      icon: BellIcon,
    }] : []),
    ...(features.branding.enabled ? [{
      name: t('nav.branding'),
      href: '/branding',
      icon: ColorSwatchIcon,
    }] : []),
    ...(features.integrations.enabled ? [{
      name: t('nav.integrations'),
      href: '/integrations',
      icon: LinkIcon,
    }] : []),
    ...(features.support.enabled ? [{
      name: t('nav.support'),
      href: '/support',
      icon: TicketIcon,
      badge: '2', // Open tickets
    }] : []),
    ...(user?.role === 'owner' ? [{
      name: t('nav.staff'),
      href: '/staff',
      icon: UsersIcon,
    }] : []),
    {
      name: t('nav.settings'),
      href: '/settings',
      icon: CogIcon,
    },
  ];
  
  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };
  
  return (
    <aside className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
        <div className="flex items-center">
          <Logo className="h-8 w-auto" variant="white" />
          <span className="ml-3 text-xl font-semibold">Admin</span>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <XIcon className="h-6 w-6" />
          </button>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                group flex items-center px-2 py-2 text-sm font-medium rounded-md
                transition-colors duration-150 ease-in-out
                ${active
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
              onClick={isMobile ? onClose : undefined}
            >
              <Icon
                className={`
                  mr-3 flex-shrink-0 h-5 w-5
                  ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
                `}
              />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span
                  className={`
                    ml-auto inline-block py-0.5 px-2 text-xs rounded-full
                    ${item.badge === '!'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 group-hover:bg-gray-700'
                    }
                  `}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
        
        {/* Settings section */}
        <div className="pt-6">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t('nav.settingsSection')}
          </p>
          <div className="mt-2 space-y-1">
            {settingsNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    transition-colors duration-150 ease-in-out
                    ${active
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                  onClick={isMobile ? onClose : undefined}
                >
                  <Icon
                    className={`
                      mr-3 flex-shrink-0 h-5 w-5
                      ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
                    `}
                  />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span
                      className={`
                        ml-auto inline-block py-0.5 px-2 text-xs rounded-full
                        ${item.badge === '!'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-800 text-gray-300 group-hover:bg-gray-700'
                        }
                      `}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
      
      {/* Footer */}
      <div className="flex-shrink-0 flex border-t border-gray-800 p-4">
        <div className="flex-shrink-0 w-full">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-white">
                {t('common.needHelp')}
              </p>
              <p className="text-xs text-gray-400">
                {t('common.contactSupport')}
              </p>
            </div>
          </div>
          <div className="mt-3 flex space-x-2">
            <a
              href="https://docs.eatech.ch"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gray-800 text-white text-xs rounded-md px-3 py-2 hover:bg-gray-700 text-center"
            >
              {t('common.docs')}
            </a>
            <a
              href="mailto:support@eatech.ch"
              className="flex-1 bg-gray-800 text-white text-xs rounded-md px-3 py-2 hover:bg-gray-700 text-center"
            >
              {t('common.email')}
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
};
