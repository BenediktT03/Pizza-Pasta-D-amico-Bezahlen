// Permission system for EATECH Admin

// Permission types
export type Permission = 
  // Dashboard
  | 'dashboard.view'
  | 'dashboard.widgets.customize'
  
  // Orders
  | 'orders.view'
  | 'orders.create'
  | 'orders.update'
  | 'orders.cancel'
  | 'orders.refund'
  | 'orders.export'
  
  // Menu
  | 'menu.view'
  | 'menu.create'
  | 'menu.update'
  | 'menu.delete'
  | 'menu.categories.manage'
  | 'menu.modifiers.manage'
  | 'menu.pricing.update'
  
  // Inventory
  | 'inventory.view'
  | 'inventory.update'
  | 'inventory.alerts.manage'
  | 'inventory.suppliers.manage'
  | 'inventory.reports.view'
  
  // Customers
  | 'customers.view'
  | 'customers.update'
  | 'customers.delete'
  | 'customers.export'
  | 'customers.communications.send'
  
  // Analytics
  | 'analytics.view'
  | 'analytics.export'
  | 'analytics.custom_reports.create'
  
  // Staff
  | 'staff.view'
  | 'staff.create'
  | 'staff.update'
  | 'staff.delete'
  | 'staff.permissions.manage'
  | 'staff.schedules.manage'
  
  // Events
  | 'events.view'
  | 'events.create'
  | 'events.update'
  | 'events.delete'
  | 'events.bookings.manage'
  
  // Marketing
  | 'marketing.campaigns.view'
  | 'marketing.campaigns.create'
  | 'marketing.campaigns.update'
  | 'marketing.campaigns.delete'
  | 'marketing.loyalty.manage'
  | 'marketing.promotions.manage'
  
  // Finance
  | 'finance.revenue.view'
  | 'finance.payments.view'
  | 'finance.payments.process'
  | 'finance.reports.view'
  | 'finance.reports.export'
  | 'finance.forecasting.view'
  
  // Settings
  | 'settings.general.view'
  | 'settings.general.update'
  | 'settings.business.update'
  | 'settings.payment.update'
  | 'settings.notifications.update'
  | 'settings.integrations.manage'
  | 'settings.security.manage'
  
  // System
  | 'system.admin'
  | 'system.logs.view'
  | 'system.audit.view'
  | 'system.backup.manage'
  | 'system.tenant.manage'

// Role definitions
export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isSystem: boolean
}

export const systemRoles: Role[] = [
  {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Vollzugriff auf alle Funktionen und Tenants',
    permissions: ['system.admin'], // Has all permissions implicitly
    isSystem: true,
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Vollzugriff auf alle Geschäftsfunktionen',
    permissions: [
      // Dashboard
      'dashboard.view',
      'dashboard.widgets.customize',
      
      // Orders - full access
      'orders.view',
      'orders.create',
      'orders.update',
      'orders.cancel',
      'orders.refund',
      'orders.export',
      
      // Menu - full access
      'menu.view',
      'menu.create',
      'menu.update',
      'menu.delete',
      'menu.categories.manage',
      'menu.modifiers.manage',
      'menu.pricing.update',
      
      // Inventory - full access
      'inventory.view',
      'inventory.update',
      'inventory.alerts.manage',
      'inventory.suppliers.manage',
      'inventory.reports.view',
      
      // Customers - full access
      'customers.view',
      'customers.update',
      'customers.delete',
      'customers.export',
      'customers.communications.send',
      
      // Analytics - full access
      'analytics.view',
      'analytics.export',
      'analytics.custom_reports.create',
      
      // Staff - full access
      'staff.view',
      'staff.create',
      'staff.update',
      'staff.delete',
      'staff.permissions.manage',
      'staff.schedules.manage',
      
      // Events - full access
      'events.view',
      'events.create',
      'events.update',
      'events.delete',
      'events.bookings.manage',
      
      // Marketing - full access
      'marketing.campaigns.view',
      'marketing.campaigns.create',
      'marketing.campaigns.update',
      'marketing.campaigns.delete',
      'marketing.loyalty.manage',
      'marketing.promotions.manage',
      
      // Finance - full access
      'finance.revenue.view',
      'finance.payments.view',
      'finance.payments.process',
      'finance.reports.view',
      'finance.reports.export',
      'finance.forecasting.view',
      
      // Settings - full access
      'settings.general.view',
      'settings.general.update',
      'settings.business.update',
      'settings.payment.update',
      'settings.notifications.update',
      'settings.integrations.manage',
      'settings.security.manage',
      
      // System - limited
      'system.logs.view',
      'system.audit.view',
      'system.backup.manage',
    ],
    isSystem: true,
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Verwaltung des täglichen Betriebs',
    permissions: [
      // Dashboard
      'dashboard.view',
      
      // Orders - full access
      'orders.view',
      'orders.create',
      'orders.update',
      'orders.cancel',
      'orders.export',
      
      // Menu - view and update
      'menu.view',
      'menu.update',
      'menu.pricing.update',
      
      // Inventory - full access
      'inventory.view',
      'inventory.update',
      'inventory.alerts.manage',
      'inventory.reports.view',
      
      // Customers - view and communicate
      'customers.view',
      'customers.communications.send',
      
      // Analytics - view only
      'analytics.view',
      'analytics.export',
      
      // Staff - view and schedule
      'staff.view',
      'staff.schedules.manage',
      
      // Events - manage
      'events.view',
      'events.create',
      'events.update',
      'events.bookings.manage',
      
      // Marketing - limited
      'marketing.campaigns.view',
      'marketing.promotions.manage',
      
      // Finance - view only
      'finance.revenue.view',
      'finance.reports.view',
      
      // Settings - view only
      'settings.general.view',
    ],
    isSystem: true,
  },
  {
    id: 'staff',
    name: 'Mitarbeiter',
    description: 'Grundlegende Bestellungs- und Menüverwaltung',
    permissions: [
      // Dashboard
      'dashboard.view',
      
      // Orders - basic operations
      'orders.view',
      'orders.create',
      'orders.update',
      
      // Menu - view only
      'menu.view',
      
      // Inventory - view only
      'inventory.view',
      
      // Customers - view only
      'customers.view',
    ],
    isSystem: true,
  },
  {
    id: 'kitchen',
    name: 'Küche',
    description: 'Zugriff auf Bestellungen und Lager',
    permissions: [
      // Dashboard
      'dashboard.view',
      
      // Orders - view and update
      'orders.view',
      'orders.update',
      
      // Inventory - view and update
      'inventory.view',
      'inventory.update',
    ],
    isSystem: true,
  },
  {
    id: 'cashier',
    name: 'Kasse',
    description: 'Bestellungen und Zahlungen verwalten',
    permissions: [
      // Dashboard
      'dashboard.view',
      
      // Orders - full operations
      'orders.view',
      'orders.create',
      'orders.update',
      'orders.cancel',
      
      // Menu - view only
      'menu.view',
      
      // Customers - view only
      'customers.view',
      
      // Finance - process payments
      'finance.payments.view',
      'finance.payments.process',
    ],
    isSystem: true,
  },
]

// Permission groups for UI organization
export const permissionGroups = {
  dashboard: {
    label: 'Dashboard',
    permissions: ['dashboard.view', 'dashboard.widgets.customize'],
  },
  orders: {
    label: 'Bestellungen',
    permissions: [
      'orders.view',
      'orders.create',
      'orders.update',
      'orders.cancel',
      'orders.refund',
      'orders.export',
    ],
  },
  menu: {
    label: 'Speisekarte',
    permissions: [
      'menu.view',
      'menu.create',
      'menu.update',
      'menu.delete',
      'menu.categories.manage',
      'menu.modifiers.manage',
      'menu.pricing.update',
    ],
  },
  inventory: {
    label: 'Lager',
    permissions: [
      'inventory.view',
      'inventory.update',
      'inventory.alerts.manage',
      'inventory.suppliers.manage',
      'inventory.reports.view',
    ],
  },
  customers: {
    label: 'Kunden',
    permissions: [
      'customers.view',
      'customers.update',
      'customers.delete',
      'customers.export',
      'customers.communications.send',
    ],
  },
  analytics: {
    label: 'Analytics',
    permissions: [
      'analytics.view',
      'analytics.export',
      'analytics.custom_reports.create',
    ],
  },
  staff: {
    label: 'Personal',
    permissions: [
      'staff.view',
      'staff.create',
      'staff.update',
      'staff.delete',
      'staff.permissions.manage',
      'staff.schedules.manage',
    ],
  },
  marketing: {
    label: 'Marketing',
    permissions: [
      'marketing.campaigns.view',
      'marketing.campaigns.create',
      'marketing.campaigns.update',
      'marketing.campaigns.delete',
      'marketing.loyalty.manage',
      'marketing.promotions.manage',
    ],
  },
  finance: {
    label: 'Finanzen',
    permissions: [
      'finance.revenue.view',
      'finance.payments.view',
      'finance.payments.process',
      'finance.reports.view',
      'finance.reports.export',
      'finance.forecasting.view',
    ],
  },
  settings: {
    label: 'Einstellungen',
    permissions: [
      'settings.general.view',
      'settings.general.update',
      'settings.business.update',
      'settings.payment.update',
      'settings.notifications.update',
      'settings.integrations.manage',
      'settings.security.manage',
    ],
  },
  system: {
    label: 'System',
    permissions: [
      'system.admin',
      'system.logs.view',
      'system.audit.view',
      'system.backup.manage',
      'system.tenant.manage',
    ],
  },
}

// Helper functions
export const hasPermission = (
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean => {
  // Super admin has all permissions
  if (userPermissions.includes('system.admin')) {
    return true
  }
  
  return userPermissions.includes(requiredPermission)
}

export const hasAnyPermission = (
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean => {
  // Super admin has all permissions
  if (userPermissions.includes('system.admin')) {
    return true
  }
  
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  )
}

export const hasAllPermissions = (
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean => {
  // Super admin has all permissions
  if (userPermissions.includes('system.admin')) {
    return true
  }
  
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  )
}

export const getRoleById = (roleId: string): Role | undefined => {
  return systemRoles.find(role => role.id === roleId)
}

export const getPermissionLabel = (permission: Permission): string => {
  const labels: Record<Permission, string> = {
    // Dashboard
    'dashboard.view': 'Dashboard anzeigen',
    'dashboard.widgets.customize': 'Dashboard anpassen',
    
    // Orders
    'orders.view': 'Bestellungen anzeigen',
    'orders.create': 'Bestellungen erstellen',
    'orders.update': 'Bestellungen bearbeiten',
    'orders.cancel': 'Bestellungen stornieren',
    'orders.refund': 'Rückerstattungen durchführen',
    'orders.export': 'Bestellungen exportieren',
    
    // Menu
    'menu.view': 'Speisekarte anzeigen',
    'menu.create': 'Produkte erstellen',
    'menu.update': 'Produkte bearbeiten',
    'menu.delete': 'Produkte löschen',
    'menu.categories.manage': 'Kategorien verwalten',
    'menu.modifiers.manage': 'Modifikatoren verwalten',
    'menu.pricing.update': 'Preise aktualisieren',
    
    // Inventory
    'inventory.view': 'Lager anzeigen',
    'inventory.update': 'Lager aktualisieren',
    'inventory.alerts.manage': 'Lagerwarnungen verwalten',
    'inventory.suppliers.manage': 'Lieferanten verwalten',
    'inventory.reports.view': 'Lagerberichte anzeigen',
    
    // Customers
    'customers.view': 'Kunden anzeigen',
    'customers.update': 'Kunden bearbeiten',
    'customers.delete': 'Kunden löschen',
    'customers.export': 'Kunden exportieren',
    'customers.communications.send': 'Nachrichten senden',
    
    // Analytics
    'analytics.view': 'Analytics anzeigen',
    'analytics.export': 'Analytics exportieren',
    'analytics.custom_reports.create': 'Berichte erstellen',
    
    // Staff
    'staff.view': 'Personal anzeigen',
    'staff.create': 'Personal hinzufügen',
    'staff.update': 'Personal bearbeiten',
    'staff.delete': 'Personal entfernen',
    'staff.permissions.manage': 'Berechtigungen verwalten',
    'staff.schedules.manage': 'Dienstpläne verwalten',
    
    // Events
    'events.view': 'Events anzeigen',
    'events.create': 'Events erstellen',
    'events.update': 'Events bearbeiten',
    'events.delete': 'Events löschen',
    'events.bookings.manage': 'Buchungen verwalten',
    
    // Marketing
    'marketing.campaigns.view': 'Kampagnen anzeigen',
    'marketing.campaigns.create': 'Kampagnen erstellen',
    'marketing.campaigns.update': 'Kampagnen bearbeiten',
    'marketing.campaigns.delete': 'Kampagnen löschen',
    'marketing.loyalty.manage': 'Treueprogramm verwalten',
    'marketing.promotions.manage': 'Aktionen verwalten',
    
    // Finance
    'finance.revenue.view': 'Umsatz anzeigen',
    'finance.payments.view': 'Zahlungen anzeigen',
    'finance.payments.process': 'Zahlungen verarbeiten',
    'finance.reports.view': 'Berichte anzeigen',
    'finance.reports.export': 'Berichte exportieren',
    'finance.forecasting.view': 'Prognosen anzeigen',
    
    // Settings
    'settings.general.view': 'Einstellungen anzeigen',
    'settings.general.update': 'Einstellungen ändern',
    'settings.business.update': 'Geschäftsdaten ändern',
    'settings.payment.update': 'Zahlungseinstellungen ändern',
    'settings.notifications.update': 'Benachrichtigungen ändern',
    'settings.integrations.manage': 'Integrationen verwalten',
    'settings.security.manage': 'Sicherheit verwalten',
    
    // System
    'system.admin': 'Systemadministrator',
    'system.logs.view': 'Systemlogs anzeigen',
    'system.audit.view': 'Audit-Log anzeigen',
    'system.backup.manage': 'Backups verwalten',
    'system.tenant.manage': 'Mandanten verwalten',
  }
  
  return labels[permission] || permission
}
