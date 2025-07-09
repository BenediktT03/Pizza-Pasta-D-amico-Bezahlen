import {
  LayoutDashboard,
  ShoppingCart,
  MenuSquare,
  Package,
  Users,
  BarChart3,
  UserCheck,
  Calendar,
  Megaphone,
  FileText,
  Settings,
  HelpCircle,
  DollarSign,
  MapPin,
  Bell,
  Shield,
  Zap,
  Database,
  Globe,
  Truck,
  Clock,
  TrendingUp,
  Heart,
  Tag,
  CreditCard,
  MessageSquare,
  Radio,
  Printer,
  Wifi,
  WifiOff,
  LucideIcon,
} from 'lucide-react'

export interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
  badge?: number | string
  badgeColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  children?: NavigationItem[]
  permissions?: string[]
  feature?: string
}

export interface NavigationSection {
  id: string
  label: string
  items: NavigationItem[]
}

export const navigationSections: NavigationSection[] = [
  {
    id: 'main',
    label: 'Hauptmenü',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/',
      },
      {
        id: 'orders',
        label: 'Bestellungen',
        icon: ShoppingCart,
        path: '/orders',
        badge: 'live',
        badgeColor: 'success',
      },
      {
        id: 'menu',
        label: 'Speisekarte',
        icon: MenuSquare,
        path: '/menu',
      },
      {
        id: 'inventory',
        label: 'Lager',
        icon: Package,
        path: '/inventory',
        feature: 'inventory',
      },
    ],
  },
  {
    id: 'business',
    label: 'Geschäft',
    items: [
      {
        id: 'customers',
        label: 'Kunden',
        icon: Users,
        path: '/customers',
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        path: '/analytics',
        feature: 'analytics',
      },
      {
        id: 'staff',
        label: 'Personal',
        icon: UserCheck,
        path: '/staff',
        permissions: ['admin', 'manager'],
      },
      {
        id: 'events',
        label: 'Events',
        icon: Calendar,
        path: '/events',
        feature: 'events',
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      {
        id: 'marketing',
        label: 'Kampagnen',
        icon: Megaphone,
        path: '/marketing',
      },
      {
        id: 'loyalty',
        label: 'Treueprogramm',
        icon: Heart,
        path: '/loyalty',
        feature: 'loyalty',
      },
      {
        id: 'promotions',
        label: 'Aktionen',
        icon: Tag,
        path: '/promotions',
      },
      {
        id: 'feedback',
        label: 'Feedback',
        icon: MessageSquare,
        path: '/feedback',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Betrieb',
    items: [
      {
        id: 'locations',
        label: 'Standorte',
        icon: MapPin,
        path: '/locations',
        feature: 'multi_location',
      },
      {
        id: 'delivery',
        label: 'Lieferung',
        icon: Truck,
        path: '/delivery',
      },
      {
        id: 'schedule',
        label: 'Zeitplan',
        icon: Clock,
        path: '/schedule',
      },
      {
        id: 'equipment',
        label: 'Ausstattung',
        icon: Printer,
        path: '/equipment',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finanzen',
    items: [
      {
        id: 'revenue',
        label: 'Umsatz',
        icon: DollarSign,
        path: '/revenue',
        permissions: ['admin', 'manager'],
      },
      {
        id: 'payments',
        label: 'Zahlungen',
        icon: CreditCard,
        path: '/payments',
      },
      {
        id: 'reports',
        label: 'Berichte',
        icon: FileText,
        path: '/reports',
        permissions: ['admin', 'manager'],
      },
      {
        id: 'forecasting',
        label: 'Prognosen',
        icon: TrendingUp,
        path: '/forecasting',
        feature: 'ai_pricing',
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'settings',
        label: 'Einstellungen',
        icon: Settings,
        path: '/settings',
      },
      {
        id: 'integrations',
        label: 'Integrationen',
        icon: Zap,
        path: '/integrations',
      },
      {
        id: 'security',
        label: 'Sicherheit',
        icon: Shield,
        path: '/security',
        permissions: ['admin'],
      },
      {
        id: 'notifications',
        label: 'Benachrichtigungen',
        icon: Bell,
        path: '/notifications',
      },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      {
        id: 'help',
        label: 'Hilfe',
        icon: HelpCircle,
        path: '/help',
      },
      {
        id: 'updates',
        label: 'Updates',
        icon: Radio,
        path: '/updates',
        badge: 'neu',
        badgeColor: 'primary',
      },
      {
        id: 'status',
        label: 'System Status',
        icon: Wifi,
        path: '/status',
      },
      {
        id: 'offline',
        label: 'Offline Modus',
        icon: WifiOff,
        path: '/offline',
      },
    ],
  },
]

// Quick actions for the dashboard
export const quickActions = [
  {
    id: 'new-order',
    label: 'Neue Bestellung',
    icon: ShoppingCart,
    action: 'createOrder',
    color: 'primary',
  },
  {
    id: 'add-product',
    label: 'Produkt hinzufügen',
    icon: MenuSquare,
    action: 'addProduct',
    color: 'secondary',
  },
  {
    id: 'view-analytics',
    label: 'Analytics',
    icon: BarChart3,
    action: 'viewAnalytics',
    color: 'info',
  },
  {
    id: 'manage-inventory',
    label: 'Lager prüfen',
    icon: Package,
    action: 'checkInventory',
    color: 'warning',
  },
]

// Dashboard widgets configuration
export const dashboardWidgets = [
  {
    id: 'revenue-today',
    type: 'metric',
    title: 'Umsatz heute',
    icon: DollarSign,
    color: 'success',
    size: 'small',
  },
  {
    id: 'orders-today',
    type: 'metric',
    title: 'Bestellungen heute',
    icon: ShoppingCart,
    color: 'primary',
    size: 'small',
  },
  {
    id: 'active-customers',
    type: 'metric',
    title: 'Aktive Kunden',
    icon: Users,
    color: 'info',
    size: 'small',
  },
  {
    id: 'avg-order-value',
    type: 'metric',
    title: 'Ø Bestellwert',
    icon: TrendingUp,
    color: 'secondary',
    size: 'small',
  },
  {
    id: 'live-orders',
    type: 'live-orders',
    title: 'Live Bestellungen',
    size: 'large',
  },
  {
    id: 'revenue-chart',
    type: 'chart',
    title: 'Umsatzverlauf',
    chartType: 'line',
    size: 'medium',
  },
  {
    id: 'popular-items',
    type: 'list',
    title: 'Beliebte Artikel',
    size: 'medium',
  },
  {
    id: 'inventory-alerts',
    type: 'alerts',
    title: 'Lager-Warnungen',
    size: 'small',
  },
]

// Permission levels
export const permissionLevels = {
  admin: ['all'],
  manager: ['dashboard', 'orders', 'menu', 'inventory', 'customers', 'analytics', 'staff', 'reports'],
  staff: ['dashboard', 'orders', 'menu', 'inventory'],
  viewer: ['dashboard', 'analytics'],
}

// Feature flags
export const featureFlags = {
  inventory: import.meta.env.VITE_FEATURE_INVENTORY === 'true',
  analytics: import.meta.env.VITE_FEATURE_ANALYTICS === 'true',
  ai_pricing: import.meta.env.VITE_FEATURE_AI_PRICING === 'true',
  voice_orders: import.meta.env.VITE_FEATURE_VOICE_ORDERS === 'true',
  multi_location: import.meta.env.VITE_FEATURE_MULTI_LOCATION === 'true',
  loyalty: import.meta.env.VITE_FEATURE_LOYALTY === 'true',
  events: import.meta.env.VITE_FEATURE_EVENTS === 'true',
}

// Get filtered navigation based on permissions and features
export const getFilteredNavigation = (
  userPermissions: string[] = [],
  userRole: keyof typeof permissionLevels = 'staff'
): NavigationSection[] => {
  const allowedPaths = permissionLevels[userRole] || []

  return navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Check feature flags
      if (item.feature && !featureFlags[item.feature as keyof typeof featureFlags]) {
        return false
      }

      // Check permissions
      if (item.permissions) {
        const hasPermission = item.permissions.some(perm => 
          userPermissions.includes(perm) || userRole === 'admin'
        )
        if (!hasPermission) return false
      }

      // Check allowed paths for role
      if (!allowedPaths.includes('all') && !allowedPaths.includes(item.id)) {
        return false
      }

      return true
    }),
  })).filter(section => section.items.length > 0)
}
