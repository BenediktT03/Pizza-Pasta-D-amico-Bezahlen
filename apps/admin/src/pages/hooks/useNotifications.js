/**
 * EATECH - useNotifications Hook
 * Version: 23.0.0
 * Description: Custom Hook für Notification Management
 * File Path: /apps/admin/src/hooks/useNotifications.js
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../lib/firebase';
import { useTenant } from './useTenant';
import { useAuth } from './useAuth';

// ============================================================================
// CONSTANTS
// ============================================================================
const COLLECTION_NAME = 'notifications';
const NOTIFICATION_LOG_COLLECTION = 'notificationLogs';

// Initialize Firebase Functions
const functions = getFunctions();

// ============================================================================
// CUSTOM HOOK
// ============================================================================
export const useNotifications = () => {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const isMounted = useRef(true);
  
  // State
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Send Notification
  const sendNotification = useCallback(async ({
    channel,
    type,
    recipientType,
    recipients = [],
    title,
    message,
    data = {},
    priority = 'normal',
    scheduledFor = null
  }) => {
    if (!tenant?.id) {
      throw new Error('No tenant selected');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare notification data
      const notificationData = {
        tenantId: tenant.id,
        channel,
        type,
        recipientType,
        recipients,
        title,
        message,
        data,
        priority,
        scheduledFor,
        status: scheduledFor ? 'scheduled' : 'pending',
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
        sentAt: scheduledFor ? null : serverTimestamp()
      };
      
      // Add to database
      const notificationRef = await addDoc(collection(db, COLLECTION_NAME), notificationData);
      
      // If not scheduled, send immediately
      if (!scheduledFor) {
        const sendNotificationFn = httpsCallable(functions, 'sendNotification');
        const result = await sendNotificationFn({
          notificationId: notificationRef.id,
          ...notificationData
        });
        
        // Update status based on result
        await updateDoc(doc(db, COLLECTION_NAME, notificationRef.id), {
          status: result.data.success ? 'sent' : 'failed',
          result: result.data
        });
        
        // Log notification
        await logNotification({
          notificationId: notificationRef.id,
          ...notificationData,
          status: result.data.success ? 'sent' : 'failed',
          result: result.data
        });
      }
      
      return notificationRef.id;
    } catch (err) {
      console.error('Error sending notification:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, user?.uid]);
  
  // Send Push Notification
  const sendPushNotification = useCallback(async ({
    recipients,
    title,
    body,
    data = {},
    icon,
    badge,
    sound = 'default',
    priority = 'high'
  }) => {
    try {
      const sendPushFn = httpsCallable(functions, 'sendPushNotification');
      const result = await sendPushFn({
        recipients,
        notification: {
          title,
          body,
          icon,
          badge,
          sound
        },
        data,
        priority,
        tenantId: tenant?.id
      });
      
      return result.data;
    } catch (err) {
      console.error('Error sending push notification:', err);
      throw err;
    }
  }, [tenant?.id]);
  
  // Send Email Notification
  const sendEmailNotification = useCallback(async ({
    recipients,
    subject,
    html,
    text,
    attachments = [],
    templateId = null,
    templateData = {}
  }) => {
    try {
      const sendEmailFn = httpsCallable(functions, 'sendEmailNotification');
      const result = await sendEmailFn({
        recipients,
        subject,
        html,
        text,
        attachments,
        templateId,
        templateData,
        tenantId: tenant?.id
      });
      
      return result.data;
    } catch (err) {
      console.error('Error sending email notification:', err);
      throw err;
    }
  }, [tenant?.id]);
  
  // Send SMS Notification
  const sendSMSNotification = useCallback(async ({
    recipients,
    message,
    sender = null
  }) => {
    try {
      const sendSMSFn = httpsCallable(functions, 'sendSMSNotification');
      const result = await sendSMSFn({
        recipients,
        message,
        sender: sender || tenant?.notificationSettings?.smsSender,
        tenantId: tenant?.id
      });
      
      return result.data;
    } catch (err) {
      console.error('Error sending SMS notification:', err);
      throw err;
    }
  }, [tenant?.id, tenant?.notificationSettings?.smsSender]);
  
  // Get Notification History
  const getNotificationHistory = useCallback(async ({
    startDate = null,
    endDate = null,
    channel = null,
    status = null,
    limit: queryLimit = 100
  } = {}) => {
    if (!tenant?.id) return [];
    
    try {
      let q = query(
        collection(db, NOTIFICATION_LOG_COLLECTION),
        where('tenantId', '==', tenant.id),
        orderBy('sentAt', 'desc'),
        limit(queryLimit)
      );
      
      // Add filters if provided
      if (channel) {
        q = query(q, where('channel', '==', channel));
      }
      if (status) {
        q = query(q, where('status', '==', status));
      }
      
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return history;
    } catch (err) {
      console.error('Error getting notification history:', err);
      return [];
    }
  }, [tenant?.id]);
  
  // Get Notification Stats
  const getNotificationStats = useCallback(async () => {
    if (!tenant?.id) return null;
    
    try {
      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayQuery = query(
        collection(db, NOTIFICATION_LOG_COLLECTION),
        where('tenantId', '==', tenant.id),
        where('sentAt', '>=', today)
      );
      
      const todaySnapshot = await getDocs(todayQuery);
      const todayNotifications = todaySnapshot.docs.map(doc => doc.data());
      
      // Calculate stats
      const stats = {
        today: {
          total: todayNotifications.length,
          sent: todayNotifications.filter(n => n.status === 'sent').length,
          delivered: todayNotifications.filter(n => n.status === 'delivered').length,
          opened: todayNotifications.filter(n => n.status === 'opened').length,
          pending: todayNotifications.filter(n => n.status === 'pending').length,
          failed: todayNotifications.filter(n => n.status === 'failed').length
        }
      };
      
      // Channel-specific stats
      const channels = ['push', 'email', 'sms', 'in_app'];
      channels.forEach(channel => {
        const channelNotifications = todayNotifications.filter(n => n.channel === channel);
        stats[channel] = {
          sent: channelNotifications.filter(n => n.status === 'sent').length,
          delivered: channelNotifications.filter(n => n.status === 'delivered').length,
          opened: channelNotifications.filter(n => n.status === 'opened').length
        };
      });
      
      return stats;
    } catch (err) {
      console.error('Error getting notification stats:', err);
      return null;
    }
  }, [tenant?.id]);
  
  // Delete Notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await deleteDoc(doc(db, NOTIFICATION_LOG_COLLECTION, notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, []);
  
  // Update Notification Settings
  const updateNotificationSettings = useCallback(async (settings) => {
    if (!tenant?.id) {
      throw new Error('No tenant selected');
    }
    
    try {
      await updateDoc(doc(db, 'tenants', tenant.id), {
        notificationSettings: settings,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating notification settings:', err);
      throw err;
    }
  }, [tenant?.id]);
  
  // Log Notification
  const logNotification = async (notificationData) => {
    try {
      await addDoc(collection(db, NOTIFICATION_LOG_COLLECTION), {
        ...notificationData,
        loggedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error logging notification:', err);
    }
  };
  
  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!tenant?.id) return;
    
    const unsubscribe = onSnapshot(
      query(
        collection(db, COLLECTION_NAME),
        where('tenantId', '==', tenant.id),
        where('status', 'in', ['pending', 'scheduled']),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        if (isMounted.current) {
          setNotifications(notifications);
        }
      },
      (err) => {
        console.error('Error subscribing to notifications:', err);
      }
    );
    
    return () => unsubscribe();
  }, [tenant?.id]);
  
  // Load stats on mount
  useEffect(() => {
    if (tenant?.id) {
      getNotificationStats().then(stats => {
        if (isMounted.current) {
          setStats(stats);
        }
      });
    }
  }, [tenant?.id, getNotificationStats]);
  
  return {
    // State
    notifications,
    stats,
    loading,
    error,
    
    // Actions
    sendNotification,
    sendPushNotification,
    sendEmailNotification,
    sendSMSNotification,
    getNotificationHistory,
    getNotificationStats,
    deleteNotification,
    updateNotificationSettings
  };
};