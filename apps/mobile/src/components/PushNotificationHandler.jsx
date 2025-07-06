/**
 * EATECH - Push Notification Handler
 * Version: 5.1.0
 * Description: Comprehensive Push Notification Management mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/mobile/src/components/PushNotificationHandler.jsx
 * 
 * Features: Push tokens, notification categories, deep linking, badge management
 */

import React, { useEffect, useCallback, useRef, useState, lazy, Suspense } from 'react';
import { Platform, Alert, AppState, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as TaskManager from 'expo-task-manager';
import { useNavigation } from '@react-navigation/native';

// Lazy loaded components
const NotificationBanner = lazy(() => import('./NotificationBanner'));
const NotificationModal = lazy(() => import('./NotificationModal'));
const InAppNotification = lazy(() => import('./InAppNotification'));
const NotificationSettings = lazy(() => import('./NotificationSettings'));

// Lazy loaded services
const notificationService = () => import('../services/NotificationService');
const analyticsService = () => import('../services/AnalyticsService');
const authService = () => import('../services/AuthService');
const orderService = () => import('../services/OrderService');
const deepLinkingService = () => import('../services/DeepLinkingService');

// Task manager for background notifications
const BACKGROUND_NOTIFICATION_TASK = 'background-notification';

// Notification categories
const NOTIFICATION_CATEGORIES = {
  ORDER_STATUS: 'order_status',
  PROMOTION: 'promotion',
  LOCATION: 'location',
  REMINDER: 'reminder',
  SYSTEM: 'system',
  CHAT: 'chat'
};

// Notification actions
const NOTIFICATION_ACTIONS = {
  VIEW_ORDER: 'VIEW_ORDER',
  CALL_RESTAURANT: 'CALL_RESTAURANT',
  NAVIGATE: 'NAVIGATE',
  REPLY: 'REPLY',
  DISMISS: 'DISMISS',
  SNOOZE: 'SNOOZE'
};

const PushNotificationHandler = ({
  children,
  onNotificationReceived,
  onNotificationResponse,
  enableBadge = true,
  enableSound = true,
  enableVibration = true,
  autoRegister = true
}) => {
  // ============================================================================
  // STATE & REFS
  // ============================================================================
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [showInAppNotification, setShowInAppNotification] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const navigation = useNavigation();
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const backgroundSubscription = useRef(null);
  const notificationServiceRef = useRef(null);
  const analyticsServiceRef = useRef(null);

  // ============================================================================
  // LAZY LOADING SETUP
  // ============================================================================
  useEffect(() => {
    const initializeLazyServices = async () => {
      try {
        // Initialize notification service
        if (!notificationServiceRef.current) {
          const NotificationService = await notificationService();
          notificationServiceRef.current = new NotificationService.default({
            categories: NOTIFICATION_CATEGORIES,
            actions: NOTIFICATION_ACTIONS
          });
        }

        // Initialize analytics service
        if (!analyticsServiceRef.current) {
          const AnalyticsService = await analyticsService();
          analyticsServiceRef.current = new AnalyticsService.default();
        }
      } catch (error) {
        console.error('Failed to initialize notification services:', error);
      }
    };

    initializeLazyServices();
  }, []);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  useEffect(() => {
    if (autoRegister && !isInitialized) {
      initializeNotifications();
    }

    return () => {
      cleanup();
    };
  }, [autoRegister, isInitialized]);

  const initializeNotifications = async () => {
    try {
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const shouldShow = await shouldShowNotification(notification);
          
          return {
            shouldShowAlert: shouldShow && enableSound,
            shouldPlaySound: shouldShow && enableSound,
            shouldSetBadge: enableBadge,
          };
        },
      });

      // Configure notification categories
      await configureNotificationCategories();

      // Register for push notifications
      await registerForPushNotificationsAsync();

      // Setup listeners
      setupNotificationListeners();

      // Setup background task
      setupBackgroundTask();

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const shouldShowNotification = async (notification) => {
    const appState = AppState.currentState;
    
    // Don't show if app is active and it's not a priority notification
    if (appState === 'active') {
      const priority = notification.request.content.data?.priority;
      return priority === 'high' || priority === 'urgent';
    }
    
    return true;
  };

  // ============================================================================
  // PERMISSION & REGISTRATION
  // ============================================================================
  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        enableVibrate: enableVibration,
        enableLights: true,
        showBadge: enableBadge,
      });

      // Create order status channel
      await Notifications.setNotificationChannelAsync('order_status', {
        name: 'Bestellstatus',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Benachrichtigungen über Ihren Bestellstatus',
        sound: 'order_update.wav',
        enableVibrate: enableVibration,
      });

      // Create promotion channel
      await Notifications.setNotificationChannelAsync('promotions', {
        name: 'Aktionen',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Spezialangebote und Rabatte',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        setNotificationPermission('denied');
        handlePermissionDenied();
        return;
      }
      
      setNotificationPermission('granted');
      
      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
        setExpoPushToken(token);
        
        // Register token with backend
        await registerTokenWithBackend(token);
        
        // Track analytics
        if (analyticsServiceRef.current) {
          analyticsServiceRef.current.trackEvent('push_token_registered', {
            token: token.substring(0, 10) + '...',
            platform: Platform.OS
          });
        }
      } catch (error) {
        console.error('Failed to get push token:', error);
      }
    } else {
      Alert.alert('Push Notifications benötigen ein physisches Gerät');
    }

    return token;
  };

  const registerTokenWithBackend = async (token) => {
    try {
      const AuthService = await authService();
      const user = await AuthService.getCurrentUser();
      
      if (user && notificationServiceRef.current) {
        await notificationServiceRef.current.registerPushToken({
          userId: user.uid,
          token: token,
          platform: Platform.OS,
          deviceInfo: {
            model: Device.modelName,
            osVersion: Device.osVersion,
            appVersion: '3.0.0'
          }
        });
      }
    } catch (error) {
      console.error('Failed to register token with backend:', error);
    }
  };

  const handlePermissionDenied = () => {
    Alert.alert(
      'Push-Benachrichtigungen deaktiviert',
      'Sie verpassen wichtige Updates zu Ihren Bestellungen. Möchten Sie die Einstellungen öffnen?',
      [
        { text: 'Später', style: 'cancel' },
        { text: 'Einstellungen', onPress: () => Linking.openSettings() }
      ]
    );
  };

  // ============================================================================
  // NOTIFICATION CATEGORIES & ACTIONS
  // ============================================================================
  const configureNotificationCategories = async () => {
    try {
      await Notifications.setNotificationCategoryAsync('order_status', [
        {
          identifier: NOTIFICATION_ACTIONS.VIEW_ORDER,
          buttonTitle: 'Bestellung anzeigen',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: NOTIFICATION_ACTIONS.CALL_RESTAURANT,
          buttonTitle: 'Anrufen',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('promotion', [
        {
          identifier: NOTIFICATION_ACTIONS.VIEW_ORDER,
          buttonTitle: 'Angebot ansehen',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: NOTIFICATION_ACTIONS.DISMISS,
          buttonTitle: 'Ausblenden',
          options: {
            opensAppToForeground: false,
            isDestructive: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('location', [
        {
          identifier: NOTIFICATION_ACTIONS.NAVIGATE,
          buttonTitle: 'Navigation',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: NOTIFICATION_ACTIONS.VIEW_ORDER,
          buttonTitle: 'Menü ansehen',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to configure notification categories:', error);
    }
  };

  // ============================================================================
  // LISTENERS
  // ============================================================================
  const setupNotificationListeners = () => {
    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener(
      handleNotificationReceived
    );

    // Notification response listener
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // Background app state listener
    backgroundSubscription.current = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
  };

  const handleNotificationReceived = useCallback(async (notification) => {
    setNotification(notification);
    setCurrentNotification(notification);
    
    // Update badge count
    if (enableBadge) {
      const newBadgeCount = badgeCount + 1;
      setBadgeCount(newBadgeCount);
      await Notifications.setBadgeCountAsync(newBadgeCount);
    }
    
    // Show in-app notification if app is active
    if (AppState.currentState === 'active') {
      setShowInAppNotification(true);
    }
    
    // Track analytics
    if (analyticsServiceRef.current) {
      analyticsServiceRef.current.trackEvent('notification_received', {
        category: notification.request.content.categoryIdentifier,
        title: notification.request.content.title,
        foreground: AppState.currentState === 'active'
      });
    }
    
    // Call parent callback
    onNotificationReceived?.(notification);
  }, [badgeCount, enableBadge, onNotificationReceived]);

  const handleNotificationResponse = useCallback(async (response) => {
    const { notification, actionIdentifier } = response;
    const data = notification.request.content.data;
    
    try {
      switch (actionIdentifier) {
        case NOTIFICATION_ACTIONS.VIEW_ORDER:
          await handleViewOrderAction(data);
          break;
          
        case NOTIFICATION_ACTIONS.CALL_RESTAURANT:
          await handleCallRestaurantAction(data);
          break;
          
        case NOTIFICATION_ACTIONS.NAVIGATE:
          await handleNavigateAction(data);
          break;
          
        case NOTIFICATION_ACTIONS.REPLY:
          await handleReplyAction(data);
          break;
          
        case NOTIFICATION_ACTIONS.SNOOZE:
          await handleSnoozeAction(notification);
          break;
          
        default:
          // Default tap action
          await handleDefaultNotificationTap(data);
          break;
      }
      
      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('notification_action', {
          action: actionIdentifier,
          category: notification.request.content.categoryIdentifier
        });
      }
      
      // Call parent callback
      onNotificationResponse?.(response);
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }, [onNotificationResponse]);

  const handleAppStateChange = useCallback(async (nextAppState) => {
    if (nextAppState === 'active') {
      // Clear badge when app becomes active
      if (enableBadge) {
        setBadgeCount(0);
        await Notifications.setBadgeCountAsync(0);
      }
      
      // Hide in-app notifications
      setShowInAppNotification(false);
    }
  }, [enableBadge]);

  // ============================================================================
  // NOTIFICATION ACTIONS
  // ============================================================================
  const handleViewOrderAction = async (data) => {
    if (data?.orderId) {
      navigation.navigate('OrderDetails', { orderId: data.orderId });
    } else if (data?.url) {
      await handleDeepLink(data.url);
    }
  };

  const handleCallRestaurantAction = async (data) => {
    if (data?.phone) {
      Linking.openURL(`tel:${data.phone}`);
    }
  };

  const handleNavigateAction = async (data) => {
    if (data?.coordinates) {
      const url = Platform.select({
        ios: `maps:${data.coordinates.latitude},${data.coordinates.longitude}`,
        android: `geo:${data.coordinates.latitude},${data.coordinates.longitude}`
      });
      Linking.openURL(url);
    }
  };

  const handleReplyAction = async (data) => {
    // Open chat or reply interface
    navigation.navigate('Chat', { conversationId: data?.conversationId });
  };

  const handleSnoozeAction = async (notification) => {
    // Schedule notification to be shown again in 10 minutes
    await Notifications.scheduleNotificationAsync({
      content: notification.request.content,
      trigger: {
        seconds: 600, // 10 minutes
      },
    });
  };

  const handleDefaultNotificationTap = async (data) => {
    if (data?.url) {
      await handleDeepLink(data.url);
    } else if (data?.screen) {
      navigation.navigate(data.screen, data?.params || {});
    } else {
      // Default navigation to orders
      navigation.navigate('Orders');
    }
  };

  const handleDeepLink = async (url) => {
    try {
      const DeepLinkingService = await deepLinkingService();
      await DeepLinkingService.handleDeepLink(url, navigation);
    } catch (error) {
      console.error('Failed to handle deep link:', error);
      Linking.openURL(url);
    }
  };

  // ============================================================================
  // BACKGROUND TASK
  // ============================================================================
  const setupBackgroundTask = () => {
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
      if (error) {
        console.error('Background notification task error:', error);
        return;
      }
      
      if (data) {
        // Handle background notification processing
        console.log('Background notification received:', data);
      }
    });
  };

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================
  const sendLocalNotification = useCallback(async (content, trigger = null) => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data || {},
          categoryIdentifier: content.category || NOTIFICATION_CATEGORIES.SYSTEM,
          ...content
        },
        trigger: trigger || null,
      });
      
      return notificationId;
    } catch (error) {
      console.error('Failed to send local notification:', error);
      throw error;
    }
  }, []);

  const cancelNotification = useCallback(async (notificationId) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }, []);

  const cancelAllNotifications = useCallback(async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (enableBadge) {
        setBadgeCount(0);
        await Notifications.setBadgeCountAsync(0);
      }
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }, [enableBadge]);

  // ============================================================================
  // CLEANUP
  // ============================================================================
  const cleanup = () => {
    if (notificationListener.current) {
      Notifications.removeNotificationSubscription(notificationListener.current);
    }
    
    if (responseListener.current) {
      Notifications.removeNotificationSubscription(responseListener.current);
    }
    
    if (backgroundSubscription.current) {
      backgroundSubscription.current.remove();
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const contextValue = {
    expoPushToken,
    notificationPermission,
    badgeCount,
    sendLocalNotification,
    cancelNotification,
    cancelAllNotifications,
    registerForPushNotifications: registerForPushNotificationsAsync,
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      {children}
      
      {/* In-App Notification */}
      {showInAppNotification && currentNotification && (
        <Suspense fallback={null}>
          <InAppNotification
            notification={currentNotification}
            onDismiss={() => setShowInAppNotification(false)}
            onTap={() => {
              setShowInAppNotification(false);
              handleDefaultNotificationTap(currentNotification.request.content.data);
            }}
          />
        </Suspense>
      )}
      
      {/* Notification Modal */}
      {showNotificationModal && currentNotification && (
        <Suspense fallback={null}>
          <NotificationModal
            notification={currentNotification}
            onClose={() => setShowNotificationModal(false)}
          />
        </Suspense>
      )}
    </>
  );
};

export default PushNotificationHandler;