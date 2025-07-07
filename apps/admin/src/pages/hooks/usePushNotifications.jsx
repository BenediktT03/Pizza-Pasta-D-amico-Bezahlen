/**
 * EATECH - usePushNotifications Hook
 * Version: 23.0.0
 * Description: Custom Hook für Browser Push Notifications
 * File Path: /apps/admin/src/hooks/usePushNotifications.js
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

// ============================================================================
// CONSTANTS
// ============================================================================
const VAPID_KEY = process.env.VITE_FIREBASE_VAPID_KEY;

// ============================================================================
// CUSTOM HOOK
// ============================================================================
export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState(Notification.permission);
  const [token, setToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagingRef = useRef(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 
        'Notification' in window && 
        'serviceWorker' in navigator &&
        'PushManager' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        try {
          const { getMessaging } = await import('firebase/messaging');
          messagingRef.current = getMessaging();
        } catch (error) {
          console.error('Error initializing messaging:', error);
          setIsSupported(false);
        }
      }
    };
    
    checkSupport();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Push notifications are not supported');
      return 'unsupported';
    }

    try {
      setLoading(true);
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await getNotificationToken();
      }

      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'error';
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  // Get FCM token
  const getNotificationToken = useCallback(async () => {
    if (!messagingRef.current || !VAPID_KEY) {
      console.error('Messaging not initialized or VAPID key missing');
      return null;
    }

    try {
      const currentToken = await getToken(messagingRef.current, {
        vapidKey: VAPID_KEY
      });

      if (currentToken) {
        setToken(currentToken);
        
        // Save token to user profile if authenticated
        if (user?.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            fcmToken: currentToken,
            fcmTokenUpdatedAt: new Date().toISOString()
          });
        }
        
        return currentToken;
      }
    } catch (error) {
      console.error('Error getting notification token:', error);
      return null;
    }
  }, [user?.uid]);

  // Handle incoming messages when app is in foreground
  useEffect(() => {
    if (!messagingRef.current || permission !== 'granted') return;

    const unsubscribe = onMessage(messagingRef.current, (payload) => {
      console.log('Received foreground message:', payload);
      
      // Show notification using toast
      const { notification, data } = payload;
      
      if (notification) {
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <img
                    className="h-10 w-10 rounded-full"
                    src={notification.icon || '/icon-192x192.png'}
                    alt=""
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {notification.body}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  if (data?.link) {
                    window.open(data.link, '_blank');
                  }
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Öffnen
              </button>
            </div>
          </div>
        ), {
          duration: 6000,
          position: 'top-right'
        });
        
        // Play notification sound
        playNotificationSound();
      }
    });

    return unsubscribe;
  }, [permission]);

  // Show native notification
  const showNotification = useCallback(async (title, options = {}) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Cannot show notification');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: 'eatech-notification',
        requireInteraction: false,
        ...options
      });

      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        if (options.data?.link) {
          window.open(options.data.link, '_blank');
        }
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [isSupported, permission]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Could not play sound:', e));
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (topic) => {
    if (!token) {
      console.warn('No FCM token available');
      return false;
    }

    try {
      // Subscribe to topic via Cloud Function
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          token,
          topic
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      return false;
    }
  }, [token, user]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (topic) => {
    if (!token) {
      console.warn('No FCM token available');
      return false;
    }

    try {
      // Unsubscribe from topic via Cloud Function
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          token,
          topic
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      return false;
    }
  }, [token, user]);

  // Check if user has granted permission
  const hasPermission = permission === 'granted';

  // Re-check permission on focus
  useEffect(() => {
    const handleFocus = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return {
    // State
    permission,
    token,
    isSupported,
    hasPermission,
    loading,
    
    // Actions
    requestPermission,
    showNotification,
    subscribeToPush,
    unsubscribeFromPush,
    playNotificationSound
  };
};