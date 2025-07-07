// /apps/mobile/src/services/push.service.ts

import * as Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { apiService } from './api.service';

// Types
interface PushToken {
  token: string;
  type: 'expo' | 'fcm' | 'apns';
  deviceId: string;
  platform: string;
  appVersion: string;
  createdAt: string;
}

interface NotificationData {
  orderId?: string;
  tenantId?: string;
  type: 'order_update' | 'promotion' | 'system' | 'marketing';
  action?: string;
  url?: string;
  [key: string]: any;
}

interface NotificationContent {
  title: string;
  body: string;
  data?: NotificationData;
  sound?: boolean;
  badge?: number;
  priority?: 'low' | 'normal' | 'high';
  categoryId?: string;
}

interface ScheduledNotification {
  id: string;
  content: NotificationContent;
  trigger: {
    type: 'time' | 'location' | 'calendar';
    date?: Date;
    repeats?: boolean;
    interval?: number;
  };
}

interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  newsletter: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
}

// Notification categories for iOS
const NOTIFICATION_CATEGORIES = [
  {
    identifier: 'ORDER_UPDATE',
    actions: [
      {
        identifier: 'VIEW_ORDER',
        title: 'Bestellung anzeigen',
        options: { opensAppToForeground: true }
      },
      {
        identifier: 'TRACK_ORDER',
        title: 'Verfolgen',
        options: { opensAppToForeground: true }
      }
    ],
    options: { allowInCarPlay: true }
  },
  {
    identifier: 'PROMOTION',
    actions: [
      {
        identifier: 'VIEW_OFFER',
        title: 'Angebot anzeigen',
        options: { opensAppToForeground: true }
      },
      {
        identifier: 'DISMISS',
        title: 'Ignorieren',
        options: { opensAppToForeground: false }
      }
    ]
  },
  {
    identifier: 'ORDER_READY',
    actions: [
      {
        identifier: 'ON_MY_WAY',
        title: 'Bin unterwegs',
        options: { opensAppToForeground: false }
      },
      {
        identifier: 'VIEW_PICKUP_CODE',
        title: 'Abholcode anzeigen',
        options: { opensAppToForeground: true }
      }
    ],
    options: { allowInCarPlay: true }
  }
];

class PushService {
  private pushToken: string | null = null;
  private isInitialized: boolean = false;
  private notificationSettings: NotificationSettings = {
    orderUpdates: true,
    promotions: true,
    newsletter: false,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  };
  private subscribedTopics: Set<string> = new Set();
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();

  constructor() {
    this.loadSettings();
  }

  // Initialize push notifications
  public async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return true;

      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const shouldShow = await this.shouldShowNotification(notification);

          return {
            shouldShowAlert: shouldShow,
            shouldPlaySound: shouldShow && this.notificationSettings.soundEnabled,
            shouldSetBadge: true,
          };
        },
      });

      // Set notification categories (iOS)
      if (Platform.OS === 'ios') {
        await Notifications.setNotificationCategoryAsync(
          NOTIFICATION_CATEGORIES[0].identifier,
          NOTIFICATION_CATEGORIES[0].actions,
          NOTIFICATION_CATEGORIES[0].options
        );

        await Notifications.setNotificationCategoryAsync(
          NOTIFICATION_CATEGORIES[1].identifier,
          NOTIFICATION_CATEGORIES[1].actions
        );

        await Notifications.setNotificationCategoryAsync(
          NOTIFICATION_CATEGORIES[2].identifier,
          NOTIFICATION_CATEGORIES[2].actions,
          NOTIFICATION_CATEGORIES[2].options
        );
      }

      // Register for push notifications
      const token = await this.registerForPushNotifications();

      if (token) {
        this.pushToken = token;
        await this.registerTokenWithServer(token);
        this.isInitialized = true;

        console.log('Push notifications initialized successfully');
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  // Register for push notifications and get token
  private async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: true,
            allowCriticalAlerts: false,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      console.log('Expo push token:', tokenData.data);

      // Store token locally
      await storage.set('expoPushToken', tokenData.data);

      return tokenData.data;

    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Register token with server
  private async registerTokenWithServer(token: string): Promise<void> {
    try {
      const deviceId = Constants.deviceId || 'unknown';
      const appVersion = Constants.expoConfig?.version || '1.0.0';

      const tokenData: PushToken = {
        token,
        type: 'expo',
        deviceId,
        platform: Platform.OS,
        appVersion,
        createdAt: new Date().toISOString(),
      };

      await apiService.post('/push/register', tokenData);

      // Subscribe to default topics
      await this.subscribeToDefaultTopics();

    } catch (error) {
      console.error('Error registering token with server:', error);
    }
  }

  // Subscribe to default topics
  private async subscribeToDefaultTopics(): Promise<void> {
    try {
      const defaultTopics = ['system_updates', 'app_updates'];

      for (const topic of defaultTopics) {
        await this.subscribeToTopic(topic);
      }

    } catch (error) {
      console.error('Error subscribing to default topics:', error);
    }
  }

  // Subscribe to topic
  public async subscribeToTopic(topic: string): Promise<void> {
    try {
      if (!this.pushToken) {
        console.warn('No push token available for topic subscription');
        return;
      }

      await apiService.post('/push/subscribe', {
        token: this.pushToken,
        topic,
      });

      this.subscribedTopics.add(topic);
      await storage.set('subscribedTopics', Array.from(this.subscribedTopics));

      console.log('Subscribed to topic:', topic);

    } catch (error) {
      console.error('Error subscribing to topic:', error);
    }
  }

  // Unsubscribe from topic
  public async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      if (!this.pushToken) return;

      await apiService.post('/push/unsubscribe', {
        token: this.pushToken,
        topic,
      });

      this.subscribedTopics.delete(topic);
      await storage.set('subscribedTopics', Array.from(this.subscribedTopics));

      console.log('Unsubscribed from topic:', topic);

    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
    }
  }

  // Subscribe to order updates
  public async subscribeToOrderUpdates(orderId: string, callback?: (data: any) => void): Promise<void> {
    const topic = `order_${orderId}`;
    await this.subscribeToTopic(topic);

    // Set up local callback if provided
    if (callback) {
      // Store callback for handling notifications
      // In a real implementation, you'd use event emitters or a similar pattern
    }
  }

  // Unsubscribe from order updates
  public async unsubscribeFromOrderUpdates(orderId: string): Promise<void> {
    const topic = `order_${orderId}`;
    await this.unsubscribeFromTopic(topic);
  }

  // Subscribe to tenant updates
  public async subscribeToTenantUpdates(tenantId: string): Promise<void> {
    const topic = `tenant_${tenantId}`;
    await this.subscribeToTopic(topic);
  }

  // Unsubscribe from tenant updates
  public async unsubscribeFromTenantUpdates(tenantId: string): Promise<void> {
    const topic = `tenant_${tenantId}`;
    await this.unsubscribeFromTopic(topic);
  }

  // Unsubscribe from all topics
  public async unsubscribeFromAll(): Promise<void> {
    try {
      if (!this.pushToken) return;

      await apiService.post('/push/unsubscribe-all', {
        token: this.pushToken,
      });

      this.subscribedTopics.clear();
      await storage.remove('subscribedTopics');

      console.log('Unsubscribed from all topics');

    } catch (error) {
      console.error('Error unsubscribing from all topics:', error);
    }
  }

  // Show local notification
  public async showLocalNotification(content: NotificationContent): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data || {},
          sound: content.sound !== false,
          badge: content.badge,
          priority: this.mapPriority(content.priority || 'normal'),
          categoryIdentifier: content.categoryId,
        },
        trigger: null, // Show immediately
      });

      return notificationId;

    } catch (error) {
      console.error('Error showing local notification:', error);
      throw error;
    }
  }

  // Schedule local notification
  public async scheduleLocalNotification(
    content: NotificationContent,
    trigger: { date: Date; repeats?: boolean }
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data || {},
          sound: content.sound !== false,
          badge: content.badge,
        },
        trigger: {
          date: trigger.date,
          repeats: trigger.repeats || false,
        },
      });

      // Store scheduled notification
      const scheduledNotification: ScheduledNotification = {
        id: notificationId,
        content,
        trigger: {
          type: 'time',
          date: trigger.date,
          repeats: trigger.repeats,
        },
      };

      this.scheduledNotifications.set(notificationId, scheduledNotification);
      await this.saveScheduledNotifications();

      return notificationId;

    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  // Cancel scheduled notification
  public async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);

      this.scheduledNotifications.delete(notificationId);
      await this.saveScheduledNotifications();

    } catch (error) {
      console.error('Error canceling scheduled notification:', error);
    }
  }

  // Cancel all scheduled notifications
  public async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      this.scheduledNotifications.clear();
      await this.saveScheduledNotifications();

    } catch (error) {
      console.error('Error canceling all scheduled notifications:', error);
    }
  }

  // Get badge count
  public async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  // Set badge count
  public async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // Clear badge
  public async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  // Update notification settings
  public async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    this.notificationSettings = {
      ...this.notificationSettings,
      ...settings,
    };

    await storage.set('notificationSettings', this.notificationSettings);

    // Update server-side preferences
    try {
      await apiService.patch('/user/notification-preferences', {
        orderUpdates: this.notificationSettings.orderUpdates,
        promotions: this.notificationSettings.promotions,
        newsletter: this.notificationSettings.newsletter,
      });
    } catch (error) {
      console.error('Error updating server notification preferences:', error);
    }
  }

  // Get current settings
  public getSettings(): NotificationSettings {
    return { ...this.notificationSettings };
  }

  // Check if should show notification (respects quiet hours)
  private async shouldShowNotification(notification: Notifications.Notification): Promise<boolean> {
    // Always show order updates
    const data = notification.request.content.data as NotificationData;
    if (data?.type === 'order_update') {
      return this.notificationSettings.orderUpdates;
    }

    // Check quiet hours
    if (this.notificationSettings.quietHoursEnabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const quietStart = this.notificationSettings.quietHoursStart;
      const quietEnd = this.notificationSettings.quietHoursEnd;

      // Handle cases where quiet hours span midnight
      if (quietStart > quietEnd) {
        if (currentTime >= quietStart || currentTime <= quietEnd) {
          return false;
        }
      } else if (currentTime >= quietStart && currentTime <= quietEnd) {
        return false;
      }
    }

    // Check type-specific settings
    switch (data?.type) {
      case 'promotion':
        return this.notificationSettings.promotions;
      case 'marketing':
        return this.notificationSettings.newsletter;
      default:
        return true;
    }
  }

  // Load settings from storage
  private async loadSettings(): Promise<void> {
    try {
      const settings = await storage.get('notificationSettings');
      if (settings) {
        this.notificationSettings = { ...this.notificationSettings, ...settings };
      }

      const topics = await storage.get('subscribedTopics');
      if (Array.isArray(topics)) {
        this.subscribedTopics = new Set(topics);
      }

      const scheduled = await storage.get('scheduledNotifications');
      if (scheduled) {
        this.scheduledNotifications = new Map(Object.entries(scheduled));
      }

    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  // Save scheduled notifications to storage
  private async saveScheduledNotifications(): Promise<void> {
    try {
      const scheduled = Object.fromEntries(this.scheduledNotifications);
      await storage.set('scheduledNotifications', scheduled);
    } catch (error) {
      console.error('Error saving scheduled notifications:', error);
    }
  }

  // Map priority to platform-specific values
  private mapPriority(priority: 'low' | 'normal' | 'high'): any {
    if (Platform.OS === 'ios') {
      switch (priority) {
        case 'low': return 'low';
        case 'high': return 'high';
        default: return 'normal';
      }
    } else {
      // Android
      switch (priority) {
        case 'low': return 'min';
        case 'high': return 'max';
        default: return 'default';
      }
    }
  }

  // Get push token
  public getPushToken(): string | null {
    return this.pushToken;
  }

  // Check if initialized
  public isReady(): boolean {
    return this.isInitialized && !!this.pushToken;
  }

  // Handle notification response (when user taps notification)
  public async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      const { notification, actionIdentifier } = response;
      const data = notification.request.content.data as NotificationData;

      console.log('Notification response:', { actionIdentifier, data });

      // Handle action-specific logic
      switch (actionIdentifier) {
        case 'VIEW_ORDER':
        case 'TRACK_ORDER':
          if (data.orderId) {
            // Navigate to order tracking
            // This would be handled by the navigation service
          }
          break;

        case 'VIEW_OFFER':
          if (data.tenantId) {
            // Navigate to restaurant
          }
          break;

        case 'ON_MY_WAY':
          if (data.orderId) {
            // Update order status to "customer_on_way"
            await apiService.patch(`/orders/${data.orderId}/customer-status`, {
              status: 'on_way'
            });
          }
          break;

        case 'VIEW_PICKUP_CODE':
          if (data.orderId) {
            // Navigate to order tracking with focus on pickup code
          }
          break;

        default:
          // Default action - open app
          if (data.url) {
            // Handle deep link
          } else if (data.orderId) {
            // Navigate to order tracking
          } else if (data.tenantId) {
            // Navigate to restaurant
          }
          break;
      }

    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }

  // Cleanup - call when user logs out
  public async cleanup(): Promise<void> {
    try {
      await this.unsubscribeFromAll();
      await this.cancelAllScheduledNotifications();

      this.pushToken = null;
      this.isInitialized = false;
      this.subscribedTopics.clear();
      this.scheduledNotifications.clear();

      await storage.multiRemove([
        'expoPushToken',
        'subscribedTopics',
        'scheduledNotifications'
      ]);

    } catch (error) {
      console.error('Error during push service cleanup:', error);
    }
  }
}

// Create and export singleton instance
export const pushService = new PushService();

// Export types
export type {
  NotificationContent, NotificationData, NotificationSettings, PushToken, ScheduledNotification
};

export default pushService;
