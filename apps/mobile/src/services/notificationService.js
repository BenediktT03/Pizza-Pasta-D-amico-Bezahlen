/**
 * EATECH Mobile App - Notification Service
 * Version: 25.0.0
 * Description: Push Notification Service für die EATECH Admin App
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/services/notificationService.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config
import { EATECH_CONFIG } from '../config/constants';

// ============================================================================
// NOTIFICATION SERVICE CLASS
// ============================================================================
class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  async initialize() {
    try {
      // Check if device can receive notifications
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return false;
      }

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        }),
      });

      // Set up notification channels (Android)
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        return false;
      }

      // Get Expo push token
      const token = await this.getExpoPushToken();
      if (token) {
        await this.saveToken(token);
        console.log('Push token:', token);
      }

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // ============================================================================
  // ANDROID CHANNELS
  // ============================================================================
  async setupAndroidChannels() {
    const channels = Object.values(EATECH_CONFIG.NOTIFICATIONS.CHANNELS);
    
    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: channel.importance,
        vibrationPattern: channel.vibrate ? [0, 250, 250, 250] : null,
        sound: channel.sound,
        lightColor: EATECH_CONFIG.THEME.colors.primary,
        enableLights: true,
        enableVibrate: channel.vibrate,
        showBadge: true,
      });
    }
  }

  // ============================================================================
  // PERMISSIONS
  // ============================================================================
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            allowCriticalAlerts: true,
          },
        });
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  // ============================================================================
  // PUSH TOKEN
  // ============================================================================
  async getExpoPushToken() {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.error('Project ID not found');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  async saveToken(token) {
    try {
      await AsyncStorage.setItem('pushToken', token);
      // TODO: Send token to backend
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  // ============================================================================
  // NOTIFICATION SCHEDULING
  // ============================================================================
  async scheduleNotification({
    title,
    body,
    data = {},
    trigger = null,
    channelId = 'general',
  }) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          badge: 1,
          categoryIdentifier: data.category || 'default',
        },
        trigger: trigger || null, // null = immediate
        ...(Platform.OS === 'android' && { channelId }),
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // ============================================================================
  // NOTIFICATION TYPES
  // ============================================================================
  async notifyNewOrder(order) {
    return this.scheduleNotification({
      title: '🛍️ Neue Bestellung',
      body: `Bestellung #${order.id} - CHF ${order.total}`,
      data: {
        type: EATECH_CONFIG.NOTIFICATIONS.TYPES.NEW_ORDER,
        orderId: order.id,
        category: 'order',
      },
      channelId: EATECH_CONFIG.NOTIFICATIONS.CHANNELS.ORDERS.id,
    });
  }

  async notifyOrderUpdate(order, status) {
    const statusMessages = {
      preparing: 'wird zubereitet',
      ready: 'ist fertig',
      delivered: 'wurde ausgeliefert',
      cancelled: 'wurde storniert',
    };

    return this.scheduleNotification({
      title: '📦 Bestellungs-Update',
      body: `Bestellung #${order.id} ${statusMessages[status] || status}`,
      data: {
        type: EATECH_CONFIG.NOTIFICATIONS.TYPES.ORDER_UPDATE,
        orderId: order.id,
        status,
        category: 'order',
      },
      channelId: EATECH_CONFIG.NOTIFICATIONS.CHANNELS.ORDERS.id,
    });
  }

  async notifyLowInventory(product) {
    return this.scheduleNotification({
      title: '⚠️ Niedriger Lagerbestand',
      body: `${product.name} hat nur noch ${product.stock} Einheiten`,
      data: {
        type: EATECH_CONFIG.NOTIFICATIONS.TYPES.LOW_INVENTORY,
        productId: product.id,
        category: 'inventory',
      },
      channelId: EATECH_CONFIG.NOTIFICATIONS.CHANNELS.ALERTS.id,
    });
  }

  async notifyDailySummary(summary) {
    return this.scheduleNotification({
      title: '📊 Tägliche Zusammenfassung',
      body: `${summary.orders} Bestellungen • CHF ${summary.revenue} Umsatz`,
      data: {
        type: EATECH_CONFIG.NOTIFICATIONS.TYPES.DAILY_SUMMARY,
        date: summary.date,
        category: 'summary',
      },
      channelId: EATECH_CONFIG.NOTIFICATIONS.CHANNELS.GENERAL.id,
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
      },
    });
  }

  // ============================================================================
  // NOTIFICATION CATEGORIES (iOS)
  // ============================================================================
  async setupCategories() {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('order', [
        {
          identifier: 'accept',
          buttonTitle: 'Annehmen',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'reject',
          buttonTitle: 'Ablehnen',
          options: {
            isDestructive: true,
            isAuthenticationRequired: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('inventory', [
        {
          identifier: 'reorder',
          buttonTitle: 'Nachbestellen',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'ignore',
          buttonTitle: 'Ignorieren',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);
    }
  }

  // ============================================================================
  // BADGE MANAGEMENT
  // ============================================================================
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      
      // Update app icon badge on iOS
      if (Platform.OS === 'ios') {
        await Notifications.setBadgeCountAsync(count);
      }
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  async clearBadge() {
    await this.setBadgeCount(0);
  }

  // ============================================================================
  // NOTIFICATION MANAGEMENT
  // ============================================================================
  async getAllScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  async cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getPresentedNotifications() {
    if (Platform.OS === 'ios') {
      return await Notifications.getPresentedNotificationsAsync();
    }
    return [];
  }

  async dismissNotification(notificationId) {
    if (Platform.OS === 'ios') {
      await Notifications.dismissNotificationAsync(notificationId);
    }
  }

  async dismissAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  // ============================================================================
  // LISTENERS
  // ============================================================================
  setupListeners(handlers = {}) {
    // Notification received listener
    this.notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
        if (handlers.onNotificationReceived) {
          handlers.onNotificationReceived(notification);
        }
      }
    );

    // Notification response listener
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notification response:', response);
        if (handlers.onNotificationResponse) {
          handlers.onNotificationResponse(response);
        }
      }
    );

    return () => {
      this.removeListeners();
    };
  }

  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // ============================================================================
  // WATCH INTEGRATION
  // ============================================================================
  async sendToWatch(notification) {
    if (Platform.OS === 'ios') {
      // Implementation for WatchConnectivity
      // This would use react-native-watch-connectivity
      console.log('Sending notification to watch:', notification);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
const notificationService = new NotificationService();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
export const initializeNotifications = async () => {
  return await notificationService.initialize();
};

export const setupNotificationListeners = (handlers) => {
  return notificationService.setupListeners(handlers);
};

// ============================================================================
// EXPORT
// ============================================================================
export { notificationService };
export default notificationService;