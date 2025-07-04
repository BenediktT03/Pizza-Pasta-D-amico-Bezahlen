/**
 * EATECH Mobile App - Quick Actions Service
 * Version: 25.0.0
 * Description: Quick Actions (3D Touch) Service für die EATECH Admin App
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/services/quickActionsService.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import * as QuickActions from 'expo-quick-actions';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config
import { EATECH_CONFIG } from '../config/constants';

// ============================================================================
// QUICK ACTIONS SERVICE
// ============================================================================
class QuickActionsService {
  constructor() {
    this.isSupported = Platform.OS === 'ios' || Platform.Version >= 25; // Android 7.1+
  }

  // ============================================================================
  // SETUP
  // ============================================================================
  async setupQuickActions() {
    if (!this.isSupported) {
      console.log('Quick Actions not supported on this device');
      return;
    }

    try {
      // Get current store status for dynamic action
      const storeStatus = await this.getStoreStatus();
      
      // Define quick actions
      const actions = [
        {
          type: 'toggle_store',
          title: storeStatus ? 'Foodtruck schließen' : 'Foodtruck öffnen',
          subtitle: 'Status schnell ändern',
          icon: Platform.OS === 'ios' ? 'store' : 'ic_store',
          userInfo: {
            url: '/admin/settings',
            action: 'toggle_store_status',
          },
        },
        {
          type: 'new_order',
          title: 'Neue Bestellung',
          subtitle: 'Bestellung erfassen',
          icon: Platform.OS === 'ios' ? 'compose' : 'ic_add_shopping_cart',
          userInfo: {
            url: '/admin/orders/new',
            action: 'create_order',
          },
        },
        {
          type: 'daily_revenue',
          title: 'Tagesumsatz',
          subtitle: 'Heutige Einnahmen',
          icon: Platform.OS === 'ios' ? 'money.fill' : 'ic_attach_money',
          userInfo: {
            url: '/admin/analytics?view=today',
            action: 'view_revenue',
          },
        },
        {
          type: 'inventory_update',
          title: 'Inventar Update',
          subtitle: 'Lagerbestand anpassen',
          icon: Platform.OS === 'ios' ? 'cube.box.fill' : 'ic_inventory',
          userInfo: {
            url: '/admin/inventory',
            action: 'update_inventory',
          },
        },
      ];

      // Set quick actions
      await QuickActions.setItems(actions);
      
      console.log('Quick Actions configured successfully');
    } catch (error) {
      console.error('Error setting up quick actions:', error);
    }
  }

  // ============================================================================
  // DYNAMIC UPDATES
  // ============================================================================
  async updateStoreStatusAction(isOpen) {
    if (!this.isSupported) return;

    try {
      const actions = await QuickActions.getItems();
      const toggleAction = actions.find(a => a.type === 'toggle_store');
      
      if (toggleAction) {
        toggleAction.title = isOpen ? 'Foodtruck schließen' : 'Foodtruck öffnen';
        await QuickActions.setItems(actions);
      }
    } catch (error) {
      console.error('Error updating store status action:', error);
    }
  }

  async updateOrderCountBadge(count) {
    if (!this.isSupported) return;

    try {
      const actions = await QuickActions.getItems();
      const orderAction = actions.find(a => a.type === 'new_order');
      
      if (orderAction && Platform.OS === 'ios') {
        // iOS supports badges on quick actions
        orderAction.badge = count > 0 ? count.toString() : null;
        await QuickActions.setItems(actions);
      }
    } catch (error) {
      console.error('Error updating order count badge:', error);
    }
  }

  async updateDailyRevenueSubtitle(revenue) {
    if (!this.isSupported) return;

    try {
      const actions = await QuickActions.getItems();
      const revenueAction = actions.find(a => a.type === 'daily_revenue');
      
      if (revenueAction) {
        revenueAction.subtitle = `CHF ${revenue.toFixed(2)}`;
        await QuickActions.setItems(actions);
      }
    } catch (error) {
      console.error('Error updating revenue subtitle:', error);
    }
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================
  setupActionHandler(handler) {
    if (!this.isSupported) return;

    return QuickActions.addListener((action) => {
      console.log('Quick Action triggered:', action);
      
      // Call the provided handler
      if (handler) {
        handler(action);
      }
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================
  async getStoreStatus() {
    try {
      const status = await AsyncStorage.getItem('storeStatus');
      return status === 'open';
    } catch (error) {
      console.error('Error getting store status:', error);
      return false;
    }
  }

  async setStoreStatus(isOpen) {
    try {
      await AsyncStorage.setItem('storeStatus', isOpen ? 'open' : 'closed');
      await this.updateStoreStatusAction(isOpen);
    } catch (error) {
      console.error('Error setting store status:', error);
    }
  }

  // ============================================================================
  // CLEAR ACTIONS
  // ============================================================================
  async clearAllActions() {
    if (!this.isSupported) return;

    try {
      await QuickActions.setItems([]);
      console.log('All quick actions cleared');
    } catch (error) {
      console.error('Error clearing quick actions:', error);
    }
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================
  async trackActionUsage(actionType) {
    try {
      // Get usage stats
      const statsKey = `quickAction_${actionType}_usage`;
      const currentCount = await AsyncStorage.getItem(statsKey);
      const newCount = (parseInt(currentCount || '0') + 1).toString();
      
      await AsyncStorage.setItem(statsKey, newCount);
      
      // Track last used
      await AsyncStorage.setItem(
        `quickAction_${actionType}_lastUsed`,
        new Date().toISOString()
      );
      
      console.log(`Quick action ${actionType} used ${newCount} times`);
    } catch (error) {
      console.error('Error tracking action usage:', error);
    }
  }

  async getActionStats() {
    const actionTypes = ['toggle_store', 'new_order', 'daily_revenue', 'inventory_update'];
    const stats = {};

    for (const type of actionTypes) {
      try {
        const usage = await AsyncStorage.getItem(`quickAction_${type}_usage`);
        const lastUsed = await AsyncStorage.getItem(`quickAction_${type}_lastUsed`);
        
        stats[type] = {
          usage: parseInt(usage || '0'),
          lastUsed: lastUsed || null,
        };
      } catch (error) {
        console.error(`Error getting stats for ${type}:`, error);
      }
    }

    return stats;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
const quickActionsService = new QuickActionsService();

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================
export const setupQuickActions = async () => {
  return await quickActionsService.setupQuickActions();
};

export const updateQuickActions = {
  storeStatus: (isOpen) => quickActionsService.updateStoreStatusAction(isOpen),
  orderCount: (count) => quickActionsService.updateOrderCountBadge(count),
  revenue: (amount) => quickActionsService.updateDailyRevenueSubtitle(amount),
};

export const trackQuickActionUsage = (actionType) => {
  return quickActionsService.trackActionUsage(actionType);
};

// ============================================================================
// EXPORT
// ============================================================================
export { quickActionsService };
export default quickActionsService;