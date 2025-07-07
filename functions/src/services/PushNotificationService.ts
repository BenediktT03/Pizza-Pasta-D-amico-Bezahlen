/**
 * EATECH - Push Notification Service
 * Version: 1.0.0
 * Description: Firebase Cloud Messaging Service für Push Notifications
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/services/PushNotificationService.ts
 * 
 * Features:
 * - Multi-platform push notifications (iOS, Android, Web)
 * - Topic-based notifications
 * - Rich notifications with images
 * - Notification scheduling
 * - Delivery tracking
 * - Batch notifications
 * - Localization support
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { 
  Message, 
  MulticastMessage, 
  Notification,
  AndroidConfig,
  ApnsConfig,
  WebpushConfig,
  TopicMessage
} from 'firebase-admin/messaging';
import { NotificationData, NotificationType } from '../types/notification.types';
import { logger } from '../utils/logger';
import { format } from 'date-fns';
import { de, fr, it, enUS } from 'date-fns/locale';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PushNotificationOptions {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
  badge?: number;
  priority?: 'high' | 'normal';
  ttl?: number;
  analyticsLabel?: string;
  localizationKey?: string;
  localizationArgs?: string[];
}

interface NotificationTemplate {
  titleKey: string;
  bodyKey: string;
  defaultTitle: string;
  defaultBody: string;
  sound?: string;
  priority?: 'high' | 'normal';
}

interface DeliveryReport {
  successCount: number;
  failureCount: number;
  failedTokens: string[];
  messageId?: string;
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TTL = 86400; // 24 hours in seconds
const MAX_BATCH_SIZE = 500; // FCM limit
const DEFAULT_SOUND = 'default';
const DEFAULT_BADGE = 1;

const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  order_new: {
    titleKey: 'notification.order.new.title',
    bodyKey: 'notification.order.new.body',
    defaultTitle: 'Neue Bestellung!',
    defaultBody: 'Bestellung #{orderNumber} von {customerName}',
    sound: 'order_new.wav',
    priority: 'high'
  },
  order_ready: {
    titleKey: 'notification.order.ready.title',
    bodyKey: 'notification.order.ready.body',
    defaultTitle: 'Bestellung bereit!',
    defaultBody: 'Ihre Bestellung #{orderNumber} ist bereit zur Abholung',
    sound: 'order_ready.wav',
    priority: 'high'
  },
  order_cancelled: {
    titleKey: 'notification.order.cancelled.title',
    bodyKey: 'notification.order.cancelled.body',
    defaultTitle: 'Bestellung storniert',
    defaultBody: 'Bestellung #{orderNumber} wurde storniert',
    priority: 'normal'
  },
  order_delayed: {
    titleKey: 'notification.order.delayed.title',
    bodyKey: 'notification.order.delayed.body',
    defaultTitle: 'Bestellung verzögert',
    defaultBody: 'Ihre Bestellung #{orderNumber} verzögert sich um {delayMinutes} Minuten',
    priority: 'high'
  },
  payment_received: {
    titleKey: 'notification.payment.received.title',
    bodyKey: 'notification.payment.received.body',
    defaultTitle: 'Zahlung erhalten',
    defaultBody: 'Zahlung von CHF {amount} erhalten',
    priority: 'normal'
  },
  payment_failed: {
    titleKey: 'notification.payment.failed.title',
    bodyKey: 'notification.payment.failed.body',
    defaultTitle: 'Zahlung fehlgeschlagen',
    defaultBody: 'Zahlung konnte nicht verarbeitet werden',
    priority: 'high'
  },
  low_stock: {
    titleKey: 'notification.stock.low.title',
    bodyKey: 'notification.stock.low.body',
    defaultTitle: 'Niedriger Lagerbestand',
    defaultBody: '{productName} ist fast ausverkauft',
    priority: 'normal'
  },
  promotion_active: {
    titleKey: 'notification.promotion.active.title',
    bodyKey: 'notification.promotion.active.body',
    defaultTitle: 'Neue Aktion!',
    defaultBody: '{promotionName} ist jetzt aktiv',
    priority: 'normal'
  },
  system_alert: {
    titleKey: 'notification.system.alert.title',
    bodyKey: 'notification.system.alert.body',
    defaultTitle: 'System-Benachrichtigung',
    defaultBody: '{message}',
    priority: 'high'
  }
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export default class PushNotificationService {
  private messaging: admin.messaging.Messaging;
  private db: admin.database.Database;

  constructor() {
    this.messaging = admin.messaging();
    this.db = admin.database();
  }

  /**
   * Send push notification to a single device
   */
  async sendToDevice(
    token: string,
    type: NotificationType,
    data: NotificationData,
    options?: Partial<PushNotificationOptions>
  ): Promise<DeliveryReport> {
    try {
      const template = NOTIFICATION_TEMPLATES[type];
      const notification = this.buildNotification(template, data, options);
      const message: Message = {
        token,
        notification,
        data: this.prepareData(data),
        android: this.getAndroidConfig(template, options),
        apns: this.getApnsConfig(template, options),
        webpush: this.getWebpushConfig(template, options),
        fcmOptions: {
          analyticsLabel: options?.analyticsLabel || type
        }
      };

      const response = await this.messaging.send(message);
      
      await this.logDelivery(token, type, 'success', response);
      
      return {
        successCount: 1,
        failureCount: 0,
        failedTokens: [],
        messageId: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      await this.logDelivery(token, type, 'failed', error.message);
      
      return {
        successCount: 0,
        failureCount: 1,
        failedTokens: [token],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToMultipleDevices(
    tokens: string[],
    type: NotificationType,
    data: NotificationData,
    options?: Partial<PushNotificationOptions>
  ): Promise<DeliveryReport> {
    const batches = this.createBatches(tokens, MAX_BATCH_SIZE);
    const results: DeliveryReport[] = [];

    for (const batch of batches) {
      const result = await this.sendBatch(batch, type, data, options);
      results.push(result);
    }

    return this.aggregateResults(results);
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    type: NotificationType,
    data: NotificationData,
    options?: Partial<PushNotificationOptions>
  ): Promise<string> {
    try {
      const template = NOTIFICATION_TEMPLATES[type];
      const notification = this.buildNotification(template, data, options);
      
      const message: TopicMessage = {
        topic,
        notification,
        data: this.prepareData(data),
        android: this.getAndroidConfig(template, options),
        apns: this.getApnsConfig(template, options),
        webpush: this.getWebpushConfig(template, options)
      };

      const response = await this.messaging.send(message);
      logger.info(`Notification sent to topic ${topic}: ${response}`);
      
      return response;
    } catch (error) {
      logger.error(`Failed to send notification to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe devices to topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      logger.info(`Subscribed ${response.successCount} devices to topic ${topic}`);
      
      if (response.failureCount > 0) {
        logger.warn(`Failed to subscribe ${response.failureCount} devices to topic ${topic}`);
      }
    } catch (error) {
      logger.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe devices from topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      logger.info(`Unsubscribed ${response.successCount} devices from topic ${topic}`);
    } catch (error) {
      logger.error(`Failed to unsubscribe from topic ${topic}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Build notification object
   */
  private buildNotification(
    template: NotificationTemplate,
    data: NotificationData,
    options?: Partial<PushNotificationOptions>
  ): Notification {
    const title = options?.title || this.interpolateTemplate(template.defaultTitle, data);
    const body = options?.body || this.interpolateTemplate(template.defaultBody, data);

    return {
      title,
      body,
      ...(options?.imageUrl && { imageUrl: options.imageUrl })
    };
  }

  /**
   * Prepare data for FCM
   */
  private prepareData(data: NotificationData): Record<string, string> {
    const flatData: Record<string, string> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        flatData[key] = value;
      } else {
        flatData[key] = JSON.stringify(value);
      }
    });

    flatData.timestamp = new Date().toISOString();
    
    return flatData;
  }

  /**
   * Get Android-specific configuration
   */
  private getAndroidConfig(
    template: NotificationTemplate,
    options?: Partial<PushNotificationOptions>
  ): AndroidConfig {
    return {
      priority: options?.priority || template.priority || 'normal',
      ttl: (options?.ttl || DEFAULT_TTL) * 1000, // Convert to milliseconds
      notification: {
        sound: options?.sound || template.sound || DEFAULT_SOUND,
        defaultSound: true,
        defaultVibrateTimings: true,
        tag: template.titleKey,
        color: '#3B82F6', // EATECH brand color
        icon: 'ic_notification',
        channelId: 'eatech_notifications'
      }
    };
  }

  /**
   * Get iOS-specific configuration
   */
  private getApnsConfig(
    template: NotificationTemplate,
    options?: Partial<PushNotificationOptions>
  ): ApnsConfig {
    return {
      headers: {
        'apns-priority': options?.priority === 'high' ? '10' : '5',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + (options?.ttl || DEFAULT_TTL))
      },
      payload: {
        aps: {
          alert: {
            'title-loc-key': template.titleKey,
            'loc-key': template.bodyKey
          },
          badge: options?.badge || DEFAULT_BADGE,
          sound: options?.sound || template.sound || DEFAULT_SOUND,
          'mutable-content': 1,
          'thread-id': template.titleKey
        }
      }
    };
  }

  /**
   * Get Web Push configuration
   */
  private getWebpushConfig(
    template: NotificationTemplate,
    options?: Partial<PushNotificationOptions>
  ): WebpushConfig {
    return {
      headers: {
        TTL: String(options?.ttl || DEFAULT_TTL),
        Urgency: options?.priority || template.priority || 'normal'
      },
      notification: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        requireInteraction: options?.priority === 'high',
        actions: this.getNotificationActions(template)
      }
    };
  }

  /**
   * Get notification actions based on type
   */
  private getNotificationActions(template: NotificationTemplate): any[] {
    // Define actions based on notification type
    switch (template.titleKey) {
      case 'notification.order.new.title':
        return [
          { action: 'accept', title: 'Annehmen', icon: '/icons/accept.png' },
          { action: 'reject', title: 'Ablehnen', icon: '/icons/reject.png' }
        ];
      case 'notification.order.ready.title':
        return [
          { action: 'view', title: 'Anzeigen', icon: '/icons/view.png' }
        ];
      default:
        return [];
    }
  }

  /**
   * Send batch of notifications
   */
  private async sendBatch(
    tokens: string[],
    type: NotificationType,
    data: NotificationData,
    options?: Partial<PushNotificationOptions>
  ): Promise<DeliveryReport> {
    try {
      const template = NOTIFICATION_TEMPLATES[type];
      const notification = this.buildNotification(template, data, options);
      
      const message: MulticastMessage = {
        tokens,
        notification,
        data: this.prepareData(data),
        android: this.getAndroidConfig(template, options),
        apns: this.getApnsConfig(template, options),
        webpush: this.getWebpushConfig(template, options)
      };

      const response = await this.messaging.sendEachForMulticast(message);
      
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          logger.warn(`Failed to send to token ${tokens[idx]}: ${resp.error?.message}`);
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to send batch notifications:', error);
      return {
        successCount: 0,
        failureCount: tokens.length,
        failedTokens: tokens,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Aggregate multiple delivery reports
   */
  private aggregateResults(results: DeliveryReport[]): DeliveryReport {
    return results.reduce((acc, result) => ({
      successCount: acc.successCount + result.successCount,
      failureCount: acc.failureCount + result.failureCount,
      failedTokens: [...acc.failedTokens, ...result.failedTokens],
      timestamp: result.timestamp
    }), {
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Interpolate template with data
   */
  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Log delivery status
   */
  private async logDelivery(
    token: string,
    type: NotificationType,
    status: 'success' | 'failed',
    details: string
  ): Promise<void> {
    try {
      await this.db.ref(`notification_logs/${type}/${status}`).push({
        token,
        details,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
    } catch (error) {
      logger.error('Failed to log delivery:', error);
    }
  }

  // ============================================================================
  // SPECIALIZED NOTIFICATION METHODS
  // ============================================================================

  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(token: string, data: NotificationData): Promise<DeliveryReport> {
    return this.sendToDevice(token, 'order_new', data, {
      imageUrl: data.restaurantLogo as string,
      analyticsLabel: 'order_confirmation'
    });
  }

  /**
   * Send order ready notification
   */
  async sendOrderReady(token: string, data: NotificationData): Promise<DeliveryReport> {
    return this.sendToDevice(token, 'order_ready', data, {
      priority: 'high',
      sound: 'order_ready.wav',
      analyticsLabel: 'order_ready'
    });
  }

  /**
   * Send delay notification
   */
  async sendDelayNotification(token: string, data: NotificationData): Promise<DeliveryReport> {
    return this.sendToDevice(token, 'order_delayed', data, {
      priority: 'high',
      analyticsLabel: 'order_delayed'
    });
  }

  /**
   * Send promotional notification
   */
  async sendPromotionalNotification(
    tokens: string[],
    promotion: {
      title: string;
      description: string;
      imageUrl?: string;
      code?: string;
    }
  ): Promise<DeliveryReport> {
    const data: NotificationData = {
      promotionName: promotion.title,
      promotionCode: promotion.code || '',
      type: 'promotion'
    };

    return this.sendToMultipleDevices(tokens, 'promotion_active', data, {
      title: promotion.title,
      body: promotion.description,
      imageUrl: promotion.imageUrl,
      analyticsLabel: 'promotion_notification'
    });
  }

  /**
   * Send status update notification
   */
  async sendStatusUpdate(
    token: string,
    data: {
      orderId: string;
      orderNumber: string;
      status: string;
      message: string;
    }
  ): Promise<DeliveryReport> {
    const notificationData: NotificationData = {
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      status: data.status,
      type: 'status_update'
    };

    return this.sendToDevice(token, 'system_alert', notificationData, {
      title: 'Bestellstatus Update',
      body: data.message,
      priority: 'high',
      analyticsLabel: 'status_update'
    });
  }
}