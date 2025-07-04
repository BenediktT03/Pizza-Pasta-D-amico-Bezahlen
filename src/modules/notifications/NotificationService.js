/**
 * EATECH - NOTIFICATION MANAGER
 * Version: 5.0.0
 * Description: Multi-Channel Notification System (Push, Email, SMS, WhatsApp)
 * Features: Real-time Updates, User Preferences, Delivery Tracking
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * 
 * 📍 Dateipfad: public/js/notification-manager.js
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
import { firebaseManager } from './firebase-config.js';
import { soundSystem } from './sound-system.js';
import { analyticsEngine } from './analytics/analytics-engine.js';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const NOTIFICATION_CONFIG = {
    version: '5.0.0',
    
    // Notification channels
    channels: {
        push: {
            enabled: true,
            priority: 1,
            realtime: true,
            requiresPermission: true
        },
        email: {
            enabled: true,
            priority: 2,
            realtime: false,
            rateLimit: 10 // per hour
        },
        sms: {
            enabled: true,
            priority: 3,
            realtime: true,
            cost: 0.10, // CHF per SMS
            maxLength: 160
        },
        whatsapp: {
            enabled: true,
            priority: 4,
            realtime: true,
            requiresOptIn: true
        },
        inApp: {
            enabled: true,
            priority: 5,
            realtime: true
        }
    },
    
    // Notification types and their channel preferences
    types: {
        orderConfirmation: {
            channels: ['push', 'email', 'sms'],
            priority: 'high',
            ttl: 86400 // 24 hours
        },
        orderReady: {
            channels: ['push', 'sms', 'inApp'],
            priority: 'urgent',
            ttl: 3600, // 1 hour
            sound: 'orderReady',
            vibrate: [200, 100, 200, 100, 200]
        },
        statusUpdate: {
            channels: ['push', 'inApp'],
            priority: 'normal',
            ttl: 7200 // 2 hours
        },
        promotion: {
            channels: ['push', 'email', 'whatsapp'],
            priority: 'low',
            ttl: 604800 // 7 days
        },
        reminder: {
            channels: ['push', 'sms'],
            priority: 'high',
            ttl: 3600
        },
        alert: {
            channels: ['push', 'sms', 'email'],
            priority: 'urgent',
            ttl: 1800 // 30 minutes
        }
    },
    
    // User preference defaults
    defaultPreferences: {
        push: true,
        email: true,
        sms: false,
        whatsapp: false,
        quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00'
        },
        language: 'de-CH'
    },
    
    // Rate limiting
    rateLimits: {
        global: 50, // per hour per user
        perChannel: {
            push: 20,
            email: 10,
            sms: 5,
            whatsapp: 15
        }
    }
};

// ============================================================================
// NOTIFICATION MANAGER CLASS
// ============================================================================
class NotificationManager {
    constructor() {
        this.permissions = {
            push: 'default',
            location: 'default'
        };
        this.fcmToken = null;
        this.userPreferences = {};
        this.notificationQueue = [];
        this.rateLimitCounters = new Map();
        this.isInitialized = false;
        
        this.init();
    }
    
    /**
     * Initialize notification system
     */
    async init() {
        console.log('🔔 Initializing EATECH Notification Manager...');
        
        try {
            // Check browser support
            if (!this.checkBrowserSupport()) {
                console.warn('Notifications not fully supported in this browser');
            }
            
            // Load user preferences
            await this.loadUserPreferences();
            
            // Initialize push notifications
            await this.initializePushNotifications();
            
            // Setup message listeners
            this.setupMessageListeners();
            
            // Process queued notifications
            await this.processQueuedNotifications();
            
            // Setup periodic tasks
            this.setupPeriodicTasks();
            
            this.isInitialized = true;
            console.log('✅ Notification Manager initialized');
            
        } catch (error) {
            console.error('❌ Notification initialization failed:', error);
        }
    }
    
    /**
     * Check browser support
     */
    checkBrowserSupport() {
        return 'Notification' in window && 
               'serviceWorker' in navigator && 
               'PushManager' in window;
    }
    
    /**
     * Initialize push notifications
     */
    async initializePushNotifications() {
        if (!('Notification' in window)) return;
        
        // Check current permission
        this.permissions.push = Notification.permission;
        
        // Initialize Firebase Messaging
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                
                // Get FCM token
                const messaging = firebase.messaging();
                messaging.useServiceWorker(registration);
                
                this.fcmToken = await messaging.getToken({
                    vapidKey: 'YOUR_VAPID_PUBLIC_KEY' // Replace with actual key
                });
                
                if (this.fcmToken) {
                    await this.saveFCMToken(this.fcmToken);
                }
                
                // Handle token refresh
                messaging.onTokenRefresh(async () => {
                    const newToken = await messaging.getToken();
                    await this.saveFCMToken(newToken);
                });
                
                // Handle foreground messages
                messaging.onMessage((payload) => {
                    this.handleForegroundMessage(payload);
                });
                
            } catch (error) {
                console.error('Push initialization error:', error);
            }
        }
    }
    
    /**
     * Request notification permission
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            throw new Error('Notifications not supported');
        }
        
        if (Notification.permission === 'granted') {
            return true;
        }
        
        if (Notification.permission === 'denied') {
            throw new Error('Notifications blocked by user');
        }
        
        // Request permission
        const permission = await Notification.requestPermission();
        this.permissions.push = permission;
        
        if (permission === 'granted') {
            // Initialize push after permission granted
            await this.initializePushNotifications();
            
            // Track permission granted
            analyticsEngine.track('notification_permission_granted');
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Send notification through multiple channels
     */
    async send(type, data, options = {}) {
        try {
            // Validate notification type
            const typeConfig = NOTIFICATION_CONFIG.types[type];
            if (!typeConfig) {
                throw new Error(`Unknown notification type: ${type}`);
            }
            
            // Check user preferences
            const preferences = await this.getUserPreferences(data.userId);
            
            // Check quiet hours
            if (this.isQuietHours(preferences)) {
                return this.queueNotification(type, data, options);
            }
            
            // Check rate limits
            if (!this.checkRateLimit(data.userId)) {
                console.warn('Rate limit exceeded for user:', data.userId);
                return null;
            }
            
            // Determine channels to use
            const channels = this.determineChannels(typeConfig, preferences, options);
            
            // Send through each channel
            const results = await Promise.allSettled(
                channels.map(channel => this.sendToChannel(channel, type, data, options))
            );
            
            // Track delivery
            const delivery = {
                id: this.generateNotificationId(),
                type,
                userId: data.userId,
                channels: channels,
                results: results.map((r, i) => ({
                    channel: channels[i],
                    status: r.status,
                    value: r.value || r.reason
                })),
                timestamp: Date.now()
            };
            
            await this.trackDelivery(delivery);
            
            return delivery;
            
        } catch (error) {
            console.error('Notification send error:', error);
            throw error;
        }
    }
    
    /**
     * Send to specific channel
     */
    async sendToChannel(channel, type, data, options) {
        switch (channel) {
            case 'push':
                return this.sendPushNotification(type, data, options);
                
            case 'email':
                return this.sendEmail(type, data, options);
                
            case 'sms':
                return this.sendSMS(type, data, options);
                
            case 'whatsapp':
                return this.sendWhatsApp(type, data, options);
                
            case 'inApp':
                return this.sendInAppNotification(type, data, options);
                
            default:
                throw new Error(`Unknown channel: ${channel}`);
        }
    }
    
    /**
     * Send push notification
     */
    async sendPushNotification(type, data, options) {
        // Check permission
        if (this.permissions.push !== 'granted') {
            throw new Error('Push notifications not permitted');
        }
        
        // Get notification content
        const content = this.getNotificationContent(type, data, 'push');
        
        // For foreground notifications
        if (document.hasFocus()) {
            return this.showLocalNotification(content);
        }
        
        // For background, send via FCM
        const payload = {
            notification: {
                title: content.title,
                body: content.body,
                icon: content.icon || '/images/logo-192.png',
                badge: content.badge || '/images/badge-72.png',
                click_action: content.clickAction || '/'
            },
            data: {
                type,
                ...data,
                timestamp: Date.now()
            },
            to: data.fcmToken || this.fcmToken
        };
        
        // Send via Firebase Cloud Messaging
        return fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Authorization': `key=${FCM_SERVER_KEY}`, // Server key
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    }
    
    /**
     * Show local notification
     */
    async showLocalNotification(content) {
        const notification = new Notification(content.title, {
            body: content.body,
            icon: content.icon || '/images/logo-192.png',
            badge: content.badge || '/images/badge-72.png',
            tag: content.tag || `notification-${Date.now()}`,
            requireInteraction: content.requireInteraction || false,
            silent: content.silent || false,
            vibrate: content.vibrate || [200],
            data: content.data,
            actions: content.actions || []
        });
        
        // Handle click
        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            
            if (content.clickAction) {
                window.location.href = content.clickAction;
            }
            
            notification.close();
        };
        
        // Auto close after TTL
        if (content.ttl) {
            setTimeout(() => notification.close(), content.ttl * 1000);
        }
        
        return notification;
    }
    
    /**
     * Send email notification
     */
    async sendEmail(type, data, options) {
        const emailData = {
            type: 'email',
            template: type,
            to: data.email,
            userId: data.userId,
            data: {
                ...data,
                language: data.language || 'de-CH'
            }
        };
        
        // Queue email job
        return firebaseManager.ref('queues/emails').push(emailData);
    }
    
    /**
     * Send SMS notification
     */
    async sendSMS(type, data, options) {
        // Check if user has SMS enabled
        const preferences = await this.getUserPreferences(data.userId);
        if (!preferences.sms) {
            throw new Error('SMS notifications disabled by user');
        }
        
        // Format phone number
        const phone = this.formatPhoneNumber(data.phone);
        
        // Get SMS content
        const content = this.getNotificationContent(type, data, 'sms');
        
        // Check message length
        if (content.body.length > NOTIFICATION_CONFIG.channels.sms.maxLength) {
            content.body = content.body.substring(0, 157) + '...';
        }
        
        const smsData = {
            type: 'sms',
            to: phone,
            message: content.body,
            userId: data.userId
        };
        
        // Queue SMS job
        return firebaseManager.ref('queues/sms').push(smsData);
    }
    
    /**
     * Send WhatsApp notification
     */
    async sendWhatsApp(type, data, options) {
        // Check opt-in status
        const optIn = await this.checkWhatsAppOptIn(data.userId);
        if (!optIn) {
            throw new Error('WhatsApp notifications not opted in');
        }
        
        // Get WhatsApp content
        const content = this.getNotificationContent(type, data, 'whatsapp');
        
        // Format for WhatsApp
        const whatsappData = {
            type: 'whatsapp',
            to: data.phone,
            template: type,
            parameters: content.parameters || [],
            language: data.language || 'de-CH',
            userId: data.userId
        };
        
        // Queue WhatsApp job
        return firebaseManager.ref('queues/whatsapp').push(whatsappData);
    }
    
    /**
     * Send in-app notification
     */
    async sendInAppNotification(type, data, options) {
        const content = this.getNotificationContent(type, data, 'inApp');
        
        // Create notification object
        const notification = {
            id: this.generateNotificationId(),
            type,
            title: content.title,
            body: content.body,
            icon: content.icon,
            priority: content.priority || 'normal',
            read: false,
            timestamp: Date.now(),
            data,
            actions: content.actions || []
        };
        
        // Save to user's notifications
        await firebaseManager.ref(`users/${data.userId}/notifications/${notification.id}`)
            .set(notification);
        
        // Show toast if user is online
        if (this.isUserOnline(data.userId)) {
            this.showInAppToast(notification);
        }
        
        // Update notification badge
        this.updateNotificationBadge(data.userId);
        
        return notification;
    }
    
    /**
     * Show in-app toast notification
     */
    showInAppToast(notification) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-icon">
                ${this.getNotificationIcon(notification.type)}
            </div>
            <div class="toast-content">
                <div class="toast-title">${notification.title}</div>
                <div class="toast-body">${notification.body}</div>
            </div>
            <button class="toast-close" aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        `;
        
        // Add styles if not already present
        this.injectToastStyles();
        
        // Add to container
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Play sound
        if (notification.type === 'orderReady') {
            soundSystem.play('orderReady');
        } else {
            soundSystem.play('notification');
        }
        
        // Handle click
        toast.addEventListener('click', (e) => {
            if (!e.target.closest('.toast-close')) {
                this.handleNotificationClick(notification);
            }
        });
        
        // Handle close
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.dismissToast(toast);
        });
        
        // Auto dismiss
        setTimeout(() => {
            this.dismissToast(toast);
        }, 8000);
    }
    
    /**
     * Get notification content
     */
    getNotificationContent(type, data, channel) {
        const templates = {
            orderConfirmation: {
                push: {
                    title: 'Bestellung bestätigt ✅',
                    body: `Ihre Bestellung #${data.orderNumber} wurde empfangen.`,
                    icon: '/images/icons/order-confirmed.png',
                    clickAction: `/track?order=${data.orderNumber}`
                },
                email: {
                    subject: `Bestellbestätigung #${data.orderNumber}`,
                    template: 'orderConfirmation'
                },
                sms: {
                    body: `EATECH: Bestellung #${data.orderNumber} erhalten. Bereit in ca. ${data.estimatedTime} Min. Verfolgen: ${data.trackingUrl}`
                },
                whatsapp: {
                    template: 'order_confirmation',
                    parameters: [data.orderNumber, data.estimatedTime]
                },
                inApp: {
                    title: 'Bestellung bestätigt',
                    body: `Bestellung #${data.orderNumber} wurde erfolgreich aufgegeben.`,
                    icon: '✅'
                }
            },
            
            orderReady: {
                push: {
                    title: '🎉 Bestellung bereit!',
                    body: `Bestellung #${data.orderNumber} wartet auf Sie!`,
                    icon: '/images/icons/order-ready.png',
                    requireInteraction: true,
                    vibrate: [200, 100, 200, 100, 200],
                    actions: [
                        { action: 'view', title: 'Anzeigen' },
                        { action: 'navigate', title: 'Navigation' }
                    ],
                    clickAction: `/track?order=${data.orderNumber}`
                },
                sms: {
                    body: `🎉 EATECH: Bestellung #${data.orderNumber} ist BEREIT! Bitte abholen.`
                },
                inApp: {
                    title: 'Bestellung bereit! 🎉',
                    body: `Ihre Bestellung #${data.orderNumber} ist fertig und wartet auf Sie.`,
                    icon: '🎉',
                    priority: 'high'
                }
            }
            // ... weitere Templates
        };
        
        const typeTemplates = templates[type];
        if (!typeTemplates || !typeTemplates[channel]) {
            console.warn(`No template found for ${type} on ${channel}`);
            return {
                title: 'EATECH Benachrichtigung',
                body: data.message || 'Sie haben eine neue Benachrichtigung'
            };
        }
        
        return typeTemplates[channel];
    }
    
    /**
     * Check rate limits
     */
    checkRateLimit(userId) {
        const key = `${userId}-${Math.floor(Date.now() / 3600000)}`; // Per hour
        const counter = this.rateLimitCounters.get(key) || 0;
        
        if (counter >= NOTIFICATION_CONFIG.rateLimits.global) {
            return false;
        }
        
        this.rateLimitCounters.set(key, counter + 1);
        
        // Clean old counters
        this.cleanRateLimitCounters();
        
        return true;
    }
    
    /**
     * Check if quiet hours
     */
    isQuietHours(preferences) {
        if (!preferences.quietHours?.enabled) return false;
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
        const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        
        if (startTime <= endTime) {
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            // Overnight quiet hours
            return currentTime >= startTime || currentTime <= endTime;
        }
    }
    
    /**
     * User preference management
     */
    async getUserPreferences(userId) {
        if (this.userPreferences[userId]) {
            return this.userPreferences[userId];
        }
        
        const snapshot = await firebaseManager.ref(`users/${userId}/notificationPreferences`)
            .once('value');
        
        const preferences = snapshot.val() || NOTIFICATION_CONFIG.defaultPreferences;
        this.userPreferences[userId] = preferences;
        
        return preferences;
    }
    
    async updateUserPreferences(userId, preferences) {
        await firebaseManager.ref(`users/${userId}/notificationPreferences`)
            .update(preferences);
        
        this.userPreferences[userId] = {
            ...this.userPreferences[userId],
            ...preferences
        };
        
        // Track preference changes
        analyticsEngine.track('notification_preferences_updated', {
            userId,
            preferences
        });
    }
    
    /**
     * Inject toast notification styles
     */
    injectToastStyles() {
        if (document.getElementById('notification-toast-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-toast-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                pointer-events: none;
            }
            
            .notification-toast {
                display: flex;
                align-items: center;
                gap: 1rem;
                background: var(--bg-card, #1A1A1A);
                color: var(--text-primary, #FFFFFF);
                padding: 1rem 1.5rem;
                border-radius: 0.75rem;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
                margin-bottom: 1rem;
                min-width: 320px;
                max-width: 420px;
                transform: translateX(440px);
                transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                pointer-events: all;
                cursor: pointer;
            }
            
            .notification-toast.show {
                transform: translateX(0);
            }
            
            .notification-toast.dismissing {
                transform: translateX(440px);
                opacity: 0;
            }
            
            .toast-icon {
                font-size: 1.5rem;
                flex-shrink: 0;
            }
            
            .toast-content {
                flex: 1;
            }
            
            .toast-title {
                font-weight: 600;
                margin-bottom: 0.25rem;
            }
            
            .toast-body {
                font-size: 0.875rem;
                color: var(--text-secondary, #B0B0B0);
            }
            
            .toast-close {
                background: none;
                border: none;
                color: var(--text-secondary, #B0B0B0);
                cursor: pointer;
                padding: 0.5rem;
                margin: -0.5rem -0.5rem -0.5rem 0.5rem;
                border-radius: 0.5rem;
                transition: all 0.2s ease;
            }
            
            .toast-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-primary, #FFFFFF);
            }
            
            .toast-close svg {
                display: block;
                fill: currentColor;
            }
            
            @media (max-width: 480px) {
                .notification-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                }
                
                .notification-toast {
                    min-width: auto;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Dismiss toast notification
     */
    dismissToast(toast) {
        toast.classList.add('dismissing');
        setTimeout(() => toast.remove(), 300);
    }
    
    /**
     * Generate unique notification ID
     */
    generateNotificationId() {
        return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        const icons = {
            orderConfirmation: '✅',
            orderReady: '🎉',
            statusUpdate: '📦',
            promotion: '🎁',
            reminder: '⏰',
            alert: '⚠️',
            info: 'ℹ️',
            success: '✅',
            error: '❌'
        };
        
        return icons[type] || '🔔';
    }
}

// ============================================================================
// NOTIFICATION PREFERENCES UI
// ============================================================================
class NotificationPreferencesUI {
    constructor(notificationManager) {
        this.manager = notificationManager;
    }
    
    render() {
        const container = document.createElement('div');
        container.className = 'notification-preferences';
        container.innerHTML = `
            <h3>Benachrichtigungseinstellungen</h3>
            
            <div class="preference-section">
                <h4>Kanäle</h4>
                
                <label class="preference-toggle">
                    <input type="checkbox" id="pref-push" checked>
                    <span class="toggle-slider"></span>
                    <span class="preference-label">
                        <i class="fas fa-bell"></i>
                        Push-Benachrichtigungen
                    </span>
                </label>
                
                <label class="preference-toggle">
                    <input type="checkbox" id="pref-email" checked>
                    <span class="toggle-slider"></span>
                    <span class="preference-label">
                        <i class="fas fa-envelope"></i>
                        E-Mail Benachrichtigungen
                    </span>
                </label>
                
                <label class="preference-toggle">
                    <input type="checkbox" id="pref-sms">
                    <span class="toggle-slider"></span>
                    <span class="preference-label">
                        <i class="fas fa-sms"></i>
                        SMS Benachrichtigungen
                        <small>Zusätzliche Kosten möglich</small>
                    </span>
                </label>
                
                <label class="preference-toggle">
                    <input type="checkbox" id="pref-whatsapp">
                    <span class="toggle-slider"></span>
                    <span class="preference-label">
                        <i class="fab fa-whatsapp"></i>
                        WhatsApp Benachrichtigungen
                    </span>
                </label>
            </div>
            
            <div class="preference-section">
                <h4>Ruhezeiten</h4>
                
                <label class="preference-toggle">
                    <input type="checkbox" id="pref-quiet-hours" checked>
                    <span class="toggle-slider"></span>
                    <span class="preference-label">
                        <i class="fas fa-moon"></i>
                        Ruhezeiten aktivieren
                    </span>
                </label>
                
                <div class="quiet-hours-config">
                    <div class="time-input">
                        <label>Von:</label>
                        <input type="time" id="quiet-start" value="22:00">
                    </div>
                    <div class="time-input">
                        <label>Bis:</label>
                        <input type="time" id="quiet-end" value="08:00">
                    </div>
                </div>
            </div>
            
            <div class="preference-section">
                <h4>Benachrichtigungstypen</h4>
                
                <div class="notification-types">
                    <label class="type-preference">
                        <input type="checkbox" name="type" value="orders" checked>
                        <span>Bestellungen</span>
                    </label>
                    <label class="type-preference">
                        <input type="checkbox" name="type" value="promotions" checked>
                        <span>Angebote & Aktionen</span>
                    </label>
                    <label class="type-preference">
                        <input type="checkbox" name="type" value="updates">
                        <span>System-Updates</span>
                    </label>
                </div>
            </div>
            
            <button class="btn-save-preferences">
                <i class="fas fa-save"></i>
                Einstellungen speichern
            </button>
        `;
        
        this.attachEventListeners(container);
        return container;
    }
    
    attachEventListeners(container) {
        // Save button
        container.querySelector('.btn-save-preferences').addEventListener('click', () => {
            this.savePreferences();
        });
        
        // Quiet hours toggle
        container.querySelector('#pref-quiet-hours').addEventListener('change', (e) => {
            const config = container.querySelector('.quiet-hours-config');
            config.style.display = e.target.checked ? 'flex' : 'none';
        });
        
        // Push notification permission
        container.querySelector('#pref-push').addEventListener('change', async (e) => {
            if (e.target.checked) {
                const granted = await this.manager.requestPermission();
                if (!granted) {
                    e.target.checked = false;
                    this.showMessage('Push-Benachrichtigungen wurden blockiert', 'error');
                }
            }
        });
    }
}

// ============================================================================
// EXPORT & INITIALIZATION
// ============================================================================

// Create singleton instance
const notificationManager = new NotificationManager();

// Export for use
export { notificationManager, NotificationPreferencesUI };

// Make available globally
if (typeof window !== 'undefined') {
    window.EATECH_NOTIFICATIONS = notificationManager;
}