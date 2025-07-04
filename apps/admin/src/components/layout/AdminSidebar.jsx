/**
 * EATECH - Admin Sidebar Navigation Update
 * Version: 21.0.0
 * Description: Fügt Billing-Navigation zum Admin-Sidebar hinzu
 * File Path: /apps/admin/src/components/layout/AdminSidebar.jsx (UPDATE)
 */

// Füge diese Imports hinzu:
import { 
  // ... andere imports
  CreditCard, 
  DollarSign,
  FileText,
  Webhook
} from 'lucide-react';

// Update die menuItems Array:
const menuItems = [
  // ... andere Items
  
  {
    id: 'billing',
    label: 'Billing & Finanzen',
    icon: CreditCard,
    badge: 'NEU',
    submenu: [
      {
        id: 'billing-overview',
        label: 'Übersicht',
        path: '/admin/billing',
        icon: DollarSign
      },
      {
        id: 'billing-subscriptions',
        label: 'Abonnements',
        path: '/admin/billing/subscriptions',
        icon: CreditCard
      },
      {
        id: 'billing-invoices',
        label: 'Rechnungen',
        path: '/admin/billing/invoices',
        icon: FileText
      },
      {
        id: 'billing-webhooks',
        label: 'Webhooks',
        path: '/admin/billing/webhooks',
        icon: Webhook
      }
    ]
  },
  
  // ... andere Items
];