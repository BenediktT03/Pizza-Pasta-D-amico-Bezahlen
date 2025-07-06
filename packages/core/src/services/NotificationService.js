/**
 * EATECH - Notification Service
 * Version: 1.0.0
 * Description: Multi-Channel Notification System (Push, Email, SMS, In-App)
 * Features: Real-time Notifications, Scheduling, Templates, Analytics
 * 
 * Kapitel: Phase 4 - Advanced Features - Notification System
 */

import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  get, 
  onValue, 
  off,
  serverTimestamp 
} from 'firebase/database';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CONSTANTS
// ============================================================================
const NOTIFICATION_TYPES = {
  ORDER_NEW: 'order_new',
  ORDER_READY: 'order_ready',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_DELAYED: 'order_delayed',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  CUSTOMER_MESSAGE: 'customer_message',
  PROMOTION_ACTIVE: 'promotion_active',
  LOW_STOCK: 'low_stock',
  SYSTEM_ALERT: 'system_alert',
  CUSTOM: 'custom'
};

const CHANNELS = {
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
  IN_APP: 'in_app'
};

const PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

const DEFAULT_TEMPLATES = {
  [NOTIFICATION_TYPES.ORDER_NEW]: {
    title: 'Neue Bestellung!',
    body: 'Bestellung #{{orderNumber}} von {{customerName}}',
    icon: '/icons/order-new.png',
    color: '#10B981',
    sound: 'order-new.mp3',
    vibrate: [200, 100, 200],
    requireInteraction: true
  },
  [NOTIFICATION_TYPES.ORDER_READY]: {
    title: 'Bestellung bereit!',
    body: 'Bestellung #{{orderNumber}} ist abholbereit',
    icon: '/icons/order-ready.png',
    color: '#3B82F6',
    sound: 'order-ready.mp3',
    vibrate: [100, 50, 100, 50, 100]
  },
  [NOTIFICATION_TYPES.ORDER_CANCELLED]: {
    title: 'Bestellung storniert',
    body: 'Bestellung #{{orderNumber}} wurde storniert',
    icon: '/icons/order-cancelled.png',
    color: '#EF4444',
    sound: 'order-cancelled.mp3'
  },
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: {
    title: 'Zahlung erhalten',
    body: 'CHF {{amount}} für Bestellung #{{orderNumber}}',
    icon: '/icons/payment-success.png',
    color: '#10B981',
    sound: 'payment-success.mp3'
  },
  [NOTIFICATION_TYPES.LOW_STOCK]: {
    title: 'Niedriger Lagerbestand',
    body: '{{productName}} hat nur noch {{quantity}} Einheiten',
    icon: '/icons/low-stock.png',
    color: '#F59E0B',
    priority: PRIORITY.HIGH
  }
};

// ============================================================================
// NOTIFICATION SERVICE CLASS
// ============================================================================
export class NotificationService {
  constructor(firebaseApp) {
    this.db = getDatabase(firebaseApp);
    this.messaging = getMessaging(firebaseApp);
    this.functions = getFunctions(firebaseApp);
    
    this.fcmToken = null;
    this.userId = null;
    this.tenantId = null;
    this.preferences = {};
    this.listeners = new Map();
    this.notificationQueue = [];
    this.isInitialized = false;
    
    this.init();
  }
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  async init() {
    try {
      // Request notification permission
      await this.requestPermission();
      
      // Get FCM token
      await this.getFCMToken();
      
      // Setup message handler
      this.setupMessageHandler();
      
      // Load user preferences
      await this.loadPreferences();
      
      // Register service worker for background notifications
      await this.registerServiceWorker();
      
      this.isInitialized = true;
      console.log('NotificationService initialized');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }
  
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }
  
  async getFCMToken() {
    try {
      const currentToken = await getToken(this.messaging, {
        vapidKey: process.env.VITE_FIREBASE_VAPID_KEY
      });
      
      if (currentToken) {
        this.fcmToken = currentToken;
        await this.saveFCMToken(currentToken);
      } else {
        console.warn('No FCM token available');
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  }
  
  async saveFCMToken(token) {
    if (!this.userId || !this.tenantId) return;
    
    const tokenRef = ref(this.db, `users/${this.userId}/fcmTokens/${token}`);
    await set(tokenRef, {
      token,
      tenantId: this.tenantId,
      device: this.getDeviceInfo(),
      createdAt: serverTimestamp(),
      lastUsed: serverTimestamp()
    });
  }
  
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
  
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Messaging service worker registered');
        return registration;
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }
  
  setupMessageHandler() {
    onMessage(this.messaging, (payload) => {
      console.log('Message received:', payload);
      this.handleIncomingMessage(payload);
    });
  }
  
  handleIncomingMessage(payload) {
    const { notification, data } = payload;
    
    // Show notification if app is in foreground
    if (document.visibilityState === 'visible') {
      this.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        data: data,
        tag: data?.tag || 'eatech-notification'
      });
    }
    
    // Emit event for in-app handling
    this.emit('notification', { notification, data });
    
    // Track notification received
    this.trackNotificationEvent('received', data);
  }
  
  // ==========================================================================
  // USER & PREFERENCES
  // ==========================================================================
  setUser(userId) {
    this.userId = userId;
    this.loadPreferences();
  }
  
  setTenant(tenantId) {
    this.tenantId = tenantId;
  }
  
  async loadPreferences() {
    if (!this.userId) return;
    
    try {
      const prefsRef = ref(this.db, `users/${this.userId}/notificationPreferences`);
      const snapshot = await get(prefsRef);
      
      this.preferences = snapshot.val() || {
        channels: {
          [CHANNELS.PUSH]: true,
          [CHANNELS.EMAIL]: true,
          [CHANNELS.SMS]: false,
          [CHANNELS.IN_APP]: true
        },
        quiet: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        },
        types: Object.keys(NOTIFICATION_TYPES).reduce((acc, type) => {
          acc[type] = true;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }
  
  async updatePreferences(preferences) {
    if (!this.userId) return;
    
    this.preferences = { ...this.preferences, ...preferences };
    
    const prefsRef = ref(this.db, `users/${this.userId}/notificationPreferences`);
    await set(prefsRef, this.preferences);
  }
  
  // ==========================================================================
  // SENDING NOTIFICATIONS
  // ==========================================================================
  async sendNotification(options) {
    const {
      type = NOTIFICATION_TYPES.CUSTOM,
      userId,
      tenantId = this.tenantId,
      title,
      body,
      data = {},
      channels = [CHANNELS.PUSH, CHANNELS.IN_APP],
      priority = PRIORITY.NORMAL,
      scheduled = null,
      template = null
    } = options;
    
    // Validate required fields
    if (!userId || !tenantId) {
      throw new Error('userId and tenantId are required');
    }
    
    // Build notification object
    const notification = {
      id: uuidv4(),
      type,
      userId,
      tenantId,
      title: title || template?.title || DEFAULT_TEMPLATES[type]?.title,
      body: body || template?.body || DEFAULT_TEMPLATES[type]?.body,
      data: {
        ...DEFAULT_TEMPLATES[type]?.data,
        ...template?.data,
        ...data,
        notificationId: uuidv4(),
        type,
        timestamp: new Date().toISOString()
      },
      channels,
      priority,
      scheduled,
      status: 'pending',
      createdAt: serverTimestamp()
    };
    
    // Process template variables
    notification.title = this.processTemplate(notification.title, data);
    notification.body = this.processTemplate(notification.body, data);
    
    // Check quiet hours
    if (this.isQuietHours(userId)) {
      channels = channels.filter(ch => ch !== CHANNELS.PUSH);
    }
    
    // Send through each channel
    const results = await Promise.allSettled(
      channels.map(channel => this.sendThroughChannel(channel, notification))
    );
    
    // Save notification to database
    await this.saveNotification(notification);
    
    // Track notification sent
    this.trackNotificationEvent('sent', notification);
    
    return {
      notificationId: notification.id,
      results: results.map((r, i) => ({
        channel: channels[i],
        status: r.status,
        value: r.value,
        reason: r.reason
      }))
    };
  }
  
  async sendThroughChannel(channel, notification) {
    switch (channel) {
      case CHANNELS.PUSH:
        return this.sendPushNotification(notification);
      
      case CHANNELS.EMAIL:
        return this.sendEmailNotification(notification);
      
      case CHANNELS.SMS:
        return this.sendSMSNotification(notification);
      
      case CHANNELS.IN_APP:
        return this.sendInAppNotification(notification);
      
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }
  
  async sendPushNotification(notification) {
    if (!this.fcmToken) {
      throw new Error('No FCM token available');
    }
    
    const sendPush = httpsCallable(this.functions, 'sendPushNotification');
    
    const result = await sendPush({
      token: this.fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        icon: DEFAULT_TEMPLATES[notification.type]?.icon || '/icons/notification.png',
        badge: '/icons/badge.png',
        color: DEFAULT_TEMPLATES[notification.type]?.color,
        sound: DEFAULT_TEMPLATES[notification.type]?.sound,
        vibrate: DEFAULT_TEMPLATES[notification.type]?.vibrate,
        requireInteraction: DEFAULT_TEMPLATES[notification.type]?.requireInteraction || notification.priority === PRIORITY.HIGH,
        tag: `${notification.type}-${notification.data.notificationId}`,
        data: notification.data,
        actions: this.getNotificationActions(notification.type)
      }
    });
    
    return result.data;
  }
  
  async sendEmailNotification(notification) {
    const sendEmail = httpsCallable(this.functions, 'sendEmailNotification');
    
    // Get user email
    const userRef = ref(this.db, `users/${notification.userId}/profile`);
    const userSnapshot = await get(userRef);
    const userProfile = userSnapshot.val();
    
    if (!userProfile?.email) {
      throw new Error('User email not found');
    }
    
    const result = await sendEmail({
      to: userProfile.email,
      subject: notification.title,
      template: notification.type,
      data: {
        ...notification.data,
        userName: userProfile.name,
        body: notification.body
      }
    });
    
    return result.data;
  }
  
  async sendSMSNotification(notification) {
    const sendSMS = httpsCallable(this.functions, 'sendSMSNotification');
    
    // Get user phone
    const userRef = ref(this.db, `users/${notification.userId}/profile`);
    const userSnapshot = await get(userRef);
    const userProfile = userSnapshot.val();
    
    if (!userProfile?.phone) {
      throw new Error('User phone not found');
    }
    
    const result = await sendSMS({
      to: userProfile.phone,
      message: `${notification.title}\n${notification.body}`,
      data: notification.data
    });
    
    return result.data;
  }
  
  async sendInAppNotification(notification) {
    const notificationRef = ref(this.db, `notifications/${notification.userId}/${notification.id}`);
    
    await set(notificationRef, {
      ...notification,
      read: false,
      readAt: null
    });
    
    // Emit event for real-time update
    this.emit('inAppNotification', notification);
    
    return { success: true, notificationId: notification.id };
  }
  
  // ==========================================================================
  // BATCH NOTIFICATIONS
  // ==========================================================================
  async sendBatchNotification(options) {
    const {
      userIds = [],
      segments = [],
      filters = {},
      ...notificationOptions
    } = options;
    
    // Get target users
    let targetUsers = [...userIds];
    
    // Add users from segments
    if (segments.length > 0) {
      const segmentUsers = await this.getUsersFromSegments(segments);
      targetUsers = [...new Set([...targetUsers, ...segmentUsers])];
    }
    
    // Apply filters
    if (Object.keys(filters).length > 0) {
      targetUsers = await this.filterUsers(targetUsers, filters);
    }
    
    // Send to each user
    const results = await Promise.allSettled(
      targetUsers.map(userId => 
        this.sendNotification({
          ...notificationOptions,
          userId
        })
      )
    );
    
    return {
      total: targetUsers.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results
    };
  }
  
  async getUsersFromSegments(segments) {
    // This would query user segments from database
    // For now, return empty array
    return [];
  }
  
  async filterUsers(users, filters) {
    // Apply filters like last active, location, etc.
    // For now, return all users
    return users;
  }
  
  // ==========================================================================
  // NOTIFICATION MANAGEMENT
  // ==========================================================================
  async getNotifications(userId = this.userId, options = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const {
      limit = 50,
      unreadOnly = false,
      types = null
    } = options;
    
    const notificationsRef = ref(this.db, `notifications/${userId}`);
    const snapshot = await get(notificationsRef);
    
    let notifications = [];
    
    snapshot.forEach(child => {
      const notification = child.val();
      
      // Apply filters
      if (unreadOnly && notification.read) return;
      if (types && !types.includes(notification.type)) return;
      
      notifications.push({
        ...notification,
        id: child.key
      });
    });
    
    // Sort by date (newest first)
    notifications.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Apply limit
    if (limit) {
      notifications = notifications.slice(0, limit);
    }
    
    return notifications;
  }
  
  async markAsRead(notificationId, userId = this.userId) {
    if (!userId || !notificationId) {
      throw new Error('User ID and notification ID are required');
    }
    
    const notificationRef = ref(this.db, `notifications/${userId}/${notificationId}`);
    
    await set(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });
    
    // Track notification read
    this.trackNotificationEvent('read', { notificationId });
  }
  
  async markAllAsRead(userId = this.userId) {
    const notifications = await this.getNotifications(userId, { unreadOnly: true });
    
    await Promise.all(
      notifications.map(n => this.markAsRead(n.id, userId))
    );
  }
  
  async deleteNotification(notificationId, userId = this.userId) {
    if (!userId || !notificationId) {
      throw new Error('User ID and notification ID are required');
    }
    
    const notificationRef = ref(this.db, `notifications/${userId}/${notificationId}`);
    await set(notificationRef, null);
  }
  
  // ==========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================================================
  subscribeToNotifications(userId = this.userId, callback) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const notificationsRef = ref(this.db, `notifications/${userId}`);
    
    const listener = onValue(notificationsRef, (snapshot) => {
      const notifications = [];
      
      snapshot.forEach(child => {
        notifications.push({
          ...child.val(),
          id: child.key
        });
      });
      
      // Sort by date (newest first)
      notifications.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      callback(notifications);
    });
    
    this.listeners.set(`notifications_${userId}`, { ref: notificationsRef, listener });
    
    return () => this.unsubscribeFromNotifications(userId);
  }
  
  unsubscribeFromNotifications(userId = this.userId) {
    const key = `notifications_${userId}`;
    const subscription = this.listeners.get(key);
    
    if (subscription) {
      off(subscription.ref, 'value', subscription.listener);
      this.listeners.delete(key);
    }
  }
  
  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  processTemplate(template, data) {
    if (!template) return '';
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
  
  isQuietHours(userId) {
    const prefs = this.preferences;
    
    if (!prefs.quiet?.enabled) return false;
    
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    
    const { start, end } = prefs.quiet;
    
    if (start < end) {
      return currentTime >= start && currentTime < end;
    } else {
      return currentTime >= start || currentTime < end;
    }
  }
  
  getNotificationActions(type) {
    switch (type) {
      case NOTIFICATION_TYPES.ORDER_NEW:
        return [
          { action: 'view', title: 'Ansehen', icon: '/icons/eye.png' },
          { action: 'accept', title: 'Annehmen', icon: '/icons/check.png' }
        ];
      
      case NOTIFICATION_TYPES.ORDER_READY:
        return [
          { action: 'notify', title: 'Kunde benachrichtigen', icon: '/icons/bell.png' },
          { action: 'complete', title: 'Abgeschlossen', icon: '/icons/check.png' }
        ];
      
      default:
        return [];
    }
  }
  
  async saveNotification(notification) {
    const notificationRef = ref(this.db, `notificationHistory/${notification.tenantId}/${notification.id}`);
    await set(notificationRef, notification);
  }
  
  trackNotificationEvent(event, data) {
    // Would integrate with analytics service
    console.log('Notification event:', event, data);
  }
  
  showNotification(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    
    const notification = new Notification(title, {
      icon: '/icons/notification.png',
      badge: '/icons/badge.png',
      ...options
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Handle click
      if (options.data?.url) {
        window.location.href = options.data.url;
      }
    };
  }
  
  // ==========================================================================
  // EVENT EMITTER
  // ==========================================================================
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
  
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  destroy() {
    // Unsubscribe from all listeners
    this.listeners.forEach((subscription, key) => {
      if (subscription.ref && subscription.listener) {
        off(subscription.ref, 'value', subscription.listener);
      }
    });
    this.listeners.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================
let notificationInstance = null;

export function initializeNotifications(firebaseApp) {
  if (!notificationInstance) {
    notificationInstance = new NotificationService(firebaseApp);
  }
  return notificationInstance;
}

export function getNotifications() {
  if (!notificationInstance) {
    throw new Error('Notifications not initialized. Call initializeNotifications first.');
  }
  return notificationInstance;
}