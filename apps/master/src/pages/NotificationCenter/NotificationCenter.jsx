/**
 * EATECH - Notification Center
 * Version: 25.0.0
 * Description: Zentrale Notification-Verwaltung mit Multi-Channel Support,
 *              Smart Targeting, A/B Testing und Emergency Broadcast
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/pages/NotificationCenter/NotificationCenter.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  update,
  set,
  push,
  serverTimestamp,
  off,
  remove,
  query,
  orderByChild,
  limitToLast,
  startAt,
  endAt
} from 'firebase/database';
import {
  Bell,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Filter,
  Search,
  Settings,
  BarChart3,
  Zap,
  MessageSquare,
  Mail,
  Smartphone,
  Globe,
  Volume2,
  VolumeX,
  PauseCircle,
  PlayCircle,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  TestTube,
  RefreshCw,
  Download,
  Upload,
  Calendar,
  Target,
  TrendingUp,
  AlertTriangle,
  Shield,
  UserX,
  Languages,
  Activity,
  Gauge,
  Hash,
  Percent,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Info,
  HelpCircle,
  FileText,
  Code,
  Layers,
  Package,
  Megaphone,
  Radio,
  Wifi,
  WifiOff,
  BellOff,
  BellRing
} from 'lucide-react';
import styles from './NotificationCenter.module.css';

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144",
  measurementId: "G-N0KHWJG9KP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============================================================================
// CONSTANTS
// ============================================================================
const NOTIFICATION_TYPES = {
  emergency: { icon: '🚨', label: 'Notfall', priority: 10, channels: ['push', 'email', 'sms', 'inApp'] },
  order_ready: { icon: '✅', label: 'Bestellung bereit', priority: 8, channels: ['push', 'email', 'inApp'] },
  new_location: { icon: '📍', label: 'Neuer Standort', priority: 7, channels: ['push', 'email', 'inApp'] },
  special_offer: { icon: '🎉', label: 'Spezial-Angebot', priority: 6, channels: ['push', 'email', 'inApp'] },
  truck_arrived: { icon: '🚚', label: 'Truck angekommen', priority: 7, channels: ['push', 'email', 'inApp'] },
  opening_soon: { icon: '⏰', label: 'Öffnet bald', priority: 5, channels: ['push', 'email', 'inApp'] },
  coming_tomorrow: { icon: '🔜', label: 'Morgen da', priority: 4, channels: ['push', 'email', 'inApp'] },
  review_request: { icon: '⭐', label: 'Review-Anfrage', priority: 3, channels: ['push', 'email'] },
  level_up: { icon: '🏆', label: 'Level Up', priority: 5, channels: ['push', 'inApp'] },
  weather_alert: { icon: '❄️', label: 'Wetter-Warnung', priority: 6, channels: ['push', 'email', 'inApp'] },
  general_info: { icon: '📢', label: 'Allgemeine Info', priority: 2, channels: ['push', 'email', 'inApp'] }
};

const CHANNELS = {
  push: { icon: Smartphone, label: 'Push', color: '#FF6B6B' },
  email: { icon: Mail, label: 'E-Mail', color: '#4ECDC4' },
  sms: { icon: MessageSquare, label: 'SMS', color: '#FFD93D', vipOnly: true },
  inApp: { icon: Bell, label: 'In-App', color: '#6C5CE7' }
};

const LANGUAGES = {
  de: { label: 'Deutsch', flag: '🇩🇪' },
  fr: { label: 'Français', flag: '🇫🇷' },
  it: { label: 'Italiano', flag: '🇮🇹' },
  en: { label: 'English', flag: '🇬🇧' }
};

const TEST_GROUPS = {
  master: { label: 'Master Admins', icon: Shield, members: [] },
  admins: { label: 'Foodtruck Admins', icon: Users, members: [] },
  beta: { label: 'Beta Tester', icon: TestTube, members: [] },
  internal: { label: 'Internal Accounts', icon: Package, members: [] }
};

const EMERGENCY_TEMPLATES = {
  truck_breakdown: {
    icon: '🚨',
    title: 'Technische Probleme',
    template: '{truckName} hat technische Probleme - Bestellungen verzögert'
  },
  sold_out: {
    icon: '😔',
    title: 'Ausverkauft',
    template: '{truckName} ist für heute ausverkauft'
  },
  location_change: {
    icon: '📍',
    title: 'Standort-Änderung',
    template: '{truckName} musste Standort wechseln → {newLocation}'
  },
  weather_closure: {
    icon: '🌧️',
    title: 'Wetter-Schliessung',
    template: '{truckName} schliesst wegen Unwetter'
  },
  health_emergency: {
    icon: '🏥',
    title: 'Gesundheits-Notfall',
    template: 'WICHTIG: {truckName} - {details}'
  }
};

const OPTIMAL_SEND_TIMES = {
  office_worker: { lunch: '11:30', dinner: '17:30' },
  student: { lunch: '12:30', dinner: '19:00' },
  shift_worker: { varies: true, learn_from_orders: true },
  weekend: { brunch: '10:30', dinner: '18:30' }
};

// ============================================================================
// NOTIFICATION CENTER COMPONENT
// ============================================================================
const NotificationCenter = () => {
  // State Management
  const [activeView, setActiveView] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    channel: 'all',
    status: 'all',
    dateRange: 'today',
    search: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form States
  const [notificationForm, setNotificationForm] = useState({
    type: 'general_info',
    title: '',
    message: '',
    channels: ['push'],
    targeting: {
      all: false,
      favorites: false,
      userGroups: [],
      geoRadius: null,
      tenants: []
    },
    scheduling: {
      immediate: true,
      scheduledTime: null,
      optimalTime: false,
      timezone: 'Europe/Zurich'
    },
    languages: ['de'],
    autoTranslate: true,
    priority: 'normal',
    quietHoursOverride: false,
    tracking: {
      trackOpens: true,
      trackClicks: true,
      conversionGoal: null
    }
  });

  // A/B Test State
  const [abTest, setAbTest] = useState({
    enabled: false,
    variantA: { title: '', message: '' },
    variantB: { title: '', message: '' },
    splitRatio: 50,
    winnerCriteria: 'open_rate',
    autoSelectWinner: true,
    minSampleSize: 100
  });

  // ========================================================================
  // FIREBASE LISTENERS
  // ========================================================================
  useEffect(() => {
    const notificationsRef = ref(database, 'notifications');
    const analyticsRef = ref(database, 'notification_analytics');
    const templatesRef = ref(database, 'notification_templates');
    const campaignsRef = ref(database, 'notification_campaigns');

    // Load notifications (last 1000)
    const notificationsQuery = query(
      notificationsRef,
      orderByChild('timestamp'),
      limitToLast(1000)
    );

    const unsubscribeNotifications = onValue(notificationsQuery, (snapshot) => {
      const data = snapshot.val() || {};
      const notificationsList = Object.entries(data).map(([id, notification]) => ({
        id,
        ...notification
      })).reverse();
      setNotifications(notificationsList);
      setLoading(false);
    });

    // Load analytics
    const unsubscribeAnalytics = onValue(analyticsRef, (snapshot) => {
      const data = snapshot.val() || {};
      calculateAnalytics(data);
    });

    // Load templates
    const unsubscribeTemplates = onValue(templatesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const templatesList = Object.entries(data).map(([id, template]) => ({
        id,
        ...template
      }));
      setTemplates(templatesList);
    });

    // Load campaigns
    const unsubscribeCampaigns = onValue(campaignsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const campaignsList = Object.entries(data).map(([id, campaign]) => ({
        id,
        ...campaign
      }));
      setCampaigns(campaignsList);
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeAnalytics();
      unsubscribeTemplates();
      unsubscribeCampaigns();
    };
  }, []);

  // ========================================================================
  // ANALYTICS CALCULATIONS
  // ========================================================================
  const calculateAnalytics = (rawData) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    let stats = {
      total: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
      byChannel: {},
      byType: {},
      dailyStats: {},
      userEngagement: {},
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      topPerformers: [],
      failures: []
    };

    // Process each notification
    Object.values(rawData).forEach(notification => {
      stats.total++;
      
      // Channel stats
      notification.channels?.forEach(channel => {
        if (!stats.byChannel[channel]) {
          stats.byChannel[channel] = { sent: 0, delivered: 0, opened: 0, clicked: 0 };
        }
        stats.byChannel[channel].sent++;
        if (notification.delivered?.[channel]) stats.byChannel[channel].delivered++;
        if (notification.opened?.[channel]) stats.byChannel[channel].opened++;
        if (notification.clicked?.[channel]) stats.byChannel[channel].clicked++;
      });

      // Type stats
      if (!stats.byType[notification.type]) {
        stats.byType[notification.type] = { count: 0, opened: 0, clicked: 0 };
      }
      stats.byType[notification.type].count++;
    });

    // Calculate rates
    stats.deliveryRate = stats.total > 0 ? (stats.delivered / stats.sent * 100).toFixed(1) : 0;
    stats.openRate = stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(1) : 0;
    stats.clickRate = stats.opened > 0 ? (stats.clicked / stats.opened * 100).toFixed(1) : 0;

    setAnalytics(stats);
  };

  // ========================================================================
  // NOTIFICATION MANAGEMENT
  // ========================================================================
  const sendNotification = async () => {
    setSending(true);
    
    try {
      const notification = {
        ...notificationForm,
        id: push(ref(database, 'notifications')).key,
        timestamp: serverTimestamp(),
        sentBy: 'master@eatech.ch',
        status: 'sending',
        testMode: testMode,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          failed: 0
        }
      };

      // Apply A/B test if enabled
      if (abTest.enabled) {
        notification.abTest = {
          ...abTest,
          variantStats: {
            A: { sent: 0, opened: 0, clicked: 0 },
            B: { sent: 0, opened: 0, clicked: 0 }
          }
        };
      }

      // Save to Firebase
      await set(ref(database, `notifications/${notification.id}`), notification);

      // Process targeting and send
      await processNotificationTargeting(notification);

      alert('Notification erfolgreich gesendet!');
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Fehler beim Senden der Notification');
    } finally {
      setSending(false);
    }
  };

  const processNotificationTargeting = async (notification) => {
    // Get target users based on criteria
    const targetUsers = await getTargetUsers(notification.targeting);
    
    // Apply notification limits (max 3 per day)
    const filteredUsers = await applyNotificationLimits(targetUsers);
    
    // Calculate optimal send time if enabled
    if (notification.scheduling.optimalTime) {
      await scheduleOptimalDelivery(notification, filteredUsers);
    } else {
      await deliverNotification(notification, filteredUsers);
    }
  };

  const getTargetUsers = async (targeting) => {
    let users = [];
    
    if (targeting.all) {
      // Get all active users
      const usersSnapshot = await ref(database, 'users').once('value');
      users = Object.entries(usersSnapshot.val() || {}).map(([id, user]) => ({ id, ...user }));
    } else {
      // Complex targeting logic
      // TODO: Implement based on favorites, geo-location, user groups, etc.
    }
    
    return users;
  };

  const applyNotificationLimits = async (users) => {
    const today = new Date().toISOString().split('T')[0];
    const filteredUsers = [];
    
    for (const user of users) {
      const userNotificationsRef = ref(database, `user_notifications/${user.id}/${today}`);
      const snapshot = await userNotificationsRef.once('value');
      const dailyCount = snapshot.val()?.count || 0;
      
      if (dailyCount < 3 || user.vip) {
        filteredUsers.push(user);
      }
    }
    
    return filteredUsers;
  };

  const scheduleOptimalDelivery = async (notification, users) => {
    // Group users by optimal time
    const timeGroups = {};
    
    users.forEach(user => {
      const optimalTime = calculateOptimalTime(user);
      if (!timeGroups[optimalTime]) {
        timeGroups[optimalTime] = [];
      }
      timeGroups[optimalTime].push(user);
    });
    
    // Schedule delivery for each time group
    Object.entries(timeGroups).forEach(([time, groupUsers]) => {
      // TODO: Implement scheduling logic
    });
  };

  const calculateOptimalTime = (user) => {
    // Analyze user's order history and engagement patterns
    const userType = user.profile?.type || 'office_worker';
    const timePreference = user.lastOrderTime || OPTIMAL_SEND_TIMES[userType].lunch;
    return timePreference;
  };

  const deliverNotification = async (notification, users) => {
    const channelPriority = getChannelPriority(notification);
    
    for (const user of users) {
      for (const channel of channelPriority) {
        if (await sendViaChannel(notification, user, channel)) {
          break; // Successfully sent, no need for fallback
        }
      }
    }
  };

  const getChannelPriority = (notification) => {
    // Priority: Push → Email → In-App (SMS only for urgent+VIP)
    const priority = ['push', 'email', 'inApp'];
    
    if (notification.priority === 'urgent' && notification.channels.includes('sms')) {
      priority.push('sms');
    }
    
    return priority.filter(channel => notification.channels.includes(channel));
  };

  const sendViaChannel = async (notification, user, channel) => {
    try {
      switch (channel) {
        case 'push':
          // TODO: Implement push notification via FCM
          break;
        case 'email':
          // TODO: Implement email via SendGrid/AWS SES
          break;
        case 'sms':
          // TODO: Implement SMS via Twilio (VIP only)
          break;
        case 'inApp':
          // Save to user's in-app notifications
          await set(
            ref(database, `user_notifications/${user.id}/inbox/${notification.id}`),
            {
              ...notification,
              read: false,
              receivedAt: serverTimestamp()
            }
          );
          break;
      }
      return true;
    } catch (error) {
      console.error(`Failed to send via ${channel}:`, error);
      return false;
    }
  };

  // ========================================================================
  // EMERGENCY BROADCAST
  // ========================================================================
  const sendEmergencyBroadcast = async (template, params) => {
    const emergency = {
      ...notificationForm,
      type: 'emergency',
      priority: 'urgent',
      title: template.title,
      message: template.template.replace(/{(\w+)}/g, (match, key) => params[key] || match),
      channels: ['push', 'email', 'sms', 'inApp'],
      quietHoursOverride: true,
      targeting: { all: true }
    };

    await sendNotification(emergency);
    setShowEmergencyModal(false);
  };

  // ========================================================================
  // TEST MODE
  // ========================================================================
  const sendTestNotification = async (groups) => {
    const testUsers = [];
    
    groups.forEach(group => {
      if (TEST_GROUPS[group]?.members) {
        testUsers.push(...TEST_GROUPS[group].members);
      }
    });

    const testNotification = {
      ...notificationForm,
      title: `[TEST] ${notificationForm.title}`,
      testMode: true,
      targeting: { users: testUsers }
    };

    await sendNotification(testNotification);
    setShowTestModal(false);
  };

  // ========================================================================
  // UI HELPERS
  // ========================================================================
  const resetForm = () => {
    setNotificationForm({
      type: 'general_info',
      title: '',
      message: '',
      channels: ['push'],
      targeting: {
        all: false,
        favorites: false,
        userGroups: [],
        geoRadius: null,
        tenants: []
      },
      scheduling: {
        immediate: true,
        scheduledTime: null,
        optimalTime: false,
        timezone: 'Europe/Zurich'
      },
      languages: ['de'],
      autoTranslate: true,
      priority: 'normal',
      quietHoursOverride: false,
      tracking: {
        trackOpens: true,
        trackClicks: true,
        conversionGoal: null
      }
    });
    
    setAbTest({
      enabled: false,
      variantA: { title: '', message: '' },
      variantB: { title: '', message: '' },
      splitRatio: 50,
      winnerCriteria: 'open_rate',
      autoSelectWinner: true,
      minSampleSize: 100
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('de-CH');
  };

  const getNotificationIcon = (type) => {
    return NOTIFICATION_TYPES[type]?.icon || '📢';
  };

  const getStatusBadge = (status) => {
    const badges = {
      sending: { icon: Clock, color: '#FFD93D', label: 'Wird gesendet' },
      sent: { icon: CheckCircle, color: '#51CF66', label: 'Gesendet' },
      delivered: { icon: CheckCircle, color: '#51CF66', label: 'Zugestellt' },
      failed: { icon: XCircle, color: '#FF6B6B', label: 'Fehlgeschlagen' },
      scheduled: { icon: Calendar, color: '#339AF0', label: 'Geplant' }
    };
    
    return badges[status] || badges.sent;
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Lade Notification Center...</p>
      </div>
    );
  }

  return (
    <div className={styles.notificationCenter}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <Bell size={28} />
            Notification Center
          </h1>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{analytics.total || 0}</span>
              <span className={styles.statLabel}>Gesamt</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{analytics.openRate || 0}%</span>
              <span className={styles.statLabel}>Öffnungsrate</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{analytics.clickRate || 0}%</span>
              <span className={styles.statLabel}>Klickrate</span>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={`${styles.testButton} ${testMode ? styles.active : ''}`}
            onClick={() => setTestMode(!testMode)}
          >
            <TestTube size={18} />
            Test Mode
          </button>
          <button 
            className={styles.emergencyButton}
            onClick={() => setShowEmergencyModal(true)}
          >
            <AlertCircle size={18} />
            Emergency
          </button>
          <button 
            className={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
            Neue Notification
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeView === 'dashboard' ? styles.active : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          <Activity size={18} />
          Dashboard
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'notifications' ? styles.active : ''}`}
          onClick={() => setActiveView('notifications')}
        >
          <Bell size={18} />
          Notifications
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'templates' ? styles.active : ''}`}
          onClick={() => setActiveView('templates')}
        >
          <FileText size={18} />
          Templates
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'campaigns' ? styles.active : ''}`}
          onClick={() => setActiveView('campaigns')}
        >
          <Megaphone size={18} />
          Kampagnen
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'analytics' ? styles.active : ''}`}
          onClick={() => setActiveView('analytics')}
        >
          <BarChart3 size={18} />
          Analytics
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveView('settings')}
        >
          <Settings size={18} />
          Settings
        </button>
      </div>

      {/* Content Area */}
      <div className={styles.content}>
        {activeView === 'dashboard' && (
          <div className={styles.dashboard}>
            {/* Live Monitor */}
            <div className={styles.liveMonitor}>
              <h2>
                <Radio size={20} />
                Live Monitor
              </h2>
              <div className={styles.liveGrid}>
                {notifications.slice(0, 10).map(notification => (
                  <div key={notification.id} className={styles.liveItem}>
                    <div className={styles.liveIcon}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className={styles.liveContent}>
                      <div className={styles.liveTitle}>{notification.title}</div>
                      <div className={styles.liveMeta}>
                        {notification.channels.map(channel => (
                          <span key={channel} className={styles.channelBadge}>
                            {CHANNELS[channel].label}
                          </span>
                        ))}
                        <span className={styles.liveTime}>
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.liveStatus}>
                      {getStatusBadge(notification.status).icon && 
                        React.createElement(getStatusBadge(notification.status).icon, { size: 16 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel Health */}
            <div className={styles.channelHealth}>
              <h2>
                <Gauge size={20} />
                Channel Health
              </h2>
              <div className={styles.channelGrid}>
                {Object.entries(CHANNELS).map(([channel, config]) => (
                  <div key={channel} className={styles.channelCard}>
                    <div className={styles.channelHeader}>
                      <config.icon size={24} style={{ color: config.color }} />
                      <span>{config.label}</span>
                    </div>
                    <div className={styles.channelStats}>
                      <div className={styles.channelStat}>
                        <span className={styles.channelValue}>
                          {analytics.byChannel?.[channel]?.sent || 0}
                        </span>
                        <span className={styles.channelLabel}>Gesendet</span>
                      </div>
                      <div className={styles.channelStat}>
                        <span className={styles.channelValue}>
                          {analytics.byChannel?.[channel]?.delivered || 0}
                        </span>
                        <span className={styles.channelLabel}>Zugestellt</span>
                      </div>
                      <div className={styles.channelStat}>
                        <span className={styles.channelValue}>
                          {analytics.byChannel?.[channel]?.opened || 0}
                        </span>
                        <span className={styles.channelLabel}>Geöffnet</span>
                      </div>
                    </div>
                    <div className={styles.channelHealth}>
                      <div className={styles.healthBar}>
                        <div 
                          className={styles.healthFill}
                          style={{ 
                            width: `${analytics.byChannel?.[channel]?.deliveryRate || 0}%`,
                            backgroundColor: config.color
                          }}
                        />
                      </div>
                      <span className={styles.healthLabel}>
                        {analytics.byChannel?.[channel]?.deliveryRate || 0}% Delivery Rate
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.quickActions}>
              <h2>
                <Zap size={20} />
                Quick Actions
              </h2>
              <div className={styles.actionGrid}>
                <button className={styles.quickAction} onClick={() => {
                  setNotificationForm(prev => ({ ...prev, type: 'new_location' }));
                  setShowCreateModal(true);
                }}>
                  <MapPin size={24} />
                  <span>Neuer Standort</span>
                </button>
                <button className={styles.quickAction} onClick={() => {
                  setNotificationForm(prev => ({ ...prev, type: 'special_offer' }));
                  setShowCreateModal(true);
                }}>
                  <Tag size={24} />
                  <span>Spezial-Angebot</span>
                </button>
                <button className={styles.quickAction} onClick={() => {
                  setNotificationForm(prev => ({ ...prev, type: 'review_request' }));
                  setShowCreateModal(true);
                }}>
                  <Star size={24} />
                  <span>Review Request</span>
                </button>
                <button className={styles.quickAction} onClick={() => setShowTestModal(true)}>
                  <TestTube size={24} />
                  <span>Test Senden</span>
                </button>
              </div>
            </div>

            {/* Recent Failures */}
            {analytics.failures?.length > 0 && (
              <div className={styles.failures}>
                <h2>
                  <AlertTriangle size={20} />
                  Kürzliche Fehler
                </h2>
                <div className={styles.failureList}>
                  {analytics.failures.slice(0, 5).map(failure => (
                    <div key={failure.id} className={styles.failureItem}>
                      <div className={styles.failureIcon}>
                        <XCircle size={16} color="#FF6B6B" />
                      </div>
                      <div className={styles.failureContent}>
                        <div className={styles.failureTitle}>{failure.title}</div>
                        <div className={styles.failureError}>{failure.error}</div>
                      </div>
                      <div className={styles.failureTime}>
                        {formatTimestamp(failure.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'notifications' && (
          <div className={styles.notificationsList}>
            {/* Filters */}
            <div className={styles.filters}>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Suche..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="all">Alle Typen</option>
                {Object.entries(NOTIFICATION_TYPES).map(([type, config]) => (
                  <option key={type} value={type}>{config.label}</option>
                ))}
              </select>
              <select
                value={filters.channel}
                onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="all">Alle Kanäle</option>
                {Object.entries(CHANNELS).map(([channel, config]) => (
                  <option key={channel} value={channel}>{config.label}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="all">Alle Status</option>
                <option value="sending">Wird gesendet</option>
                <option value="sent">Gesendet</option>
                <option value="delivered">Zugestellt</option>
                <option value="failed">Fehlgeschlagen</option>
                <option value="scheduled">Geplant</option>
              </select>
            </div>

            {/* Notifications Table */}
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Titel</th>
                    <th>Kanäle</th>
                    <th>Zielgruppe</th>
                    <th>Status</th>
                    <th>Gesendet</th>
                    <th>Performance</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications
                    .filter(n => {
                      if (filters.search && !n.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
                      if (filters.type !== 'all' && n.type !== filters.type) return false;
                      if (filters.channel !== 'all' && !n.channels.includes(filters.channel)) return false;
                      if (filters.status !== 'all' && n.status !== filters.status) return false;
                      return true;
                    })
                    .map(notification => (
                      <tr key={notification.id}>
                        <td>
                          <span className={styles.typeIcon}>
                            {getNotificationIcon(notification.type)}
                          </span>
                        </td>
                        <td className={styles.titleCell}>
                          <div className={styles.notificationTitle}>{notification.title}</div>
                          <div className={styles.notificationMessage}>{notification.message}</div>
                        </td>
                        <td>
                          <div className={styles.channelList}>
                            {notification.channels.map(channel => (
                              <span key={channel} className={styles.channelTag}>
                                {CHANNELS[channel].label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {notification.targeting?.all && 'Alle'}
                          {notification.targeting?.favorites && 'Favoriten'}
                          {notification.targeting?.tenants?.length > 0 && 
                            `${notification.targeting.tenants.length} Trucks`}
                        </td>
                        <td>
                          <span 
                            className={styles.statusBadge}
                            style={{ backgroundColor: getStatusBadge(notification.status).color }}
                          >
                            {getStatusBadge(notification.status).label}
                          </span>
                        </td>
                        <td>{formatTimestamp(notification.timestamp)}</td>
                        <td>
                          <div className={styles.performance}>
                            <div className={styles.perfStat}>
                              <Eye size={14} />
                              {notification.stats?.opened || 0}
                            </div>
                            <div className={styles.perfStat}>
                              <MousePointer size={14} />
                              {notification.stats?.clicked || 0}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button 
                              className={styles.actionBtn}
                              onClick={() => setSelectedNotification(notification)}
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              className={styles.actionBtn}
                              onClick={() => {
                                setNotificationForm(notification);
                                setShowCreateModal(true);
                              }}
                            >
                              <Copy size={16} />
                            </button>
                            {notification.status === 'scheduled' && (
                              <button 
                                className={styles.actionBtn}
                                onClick={() => cancelNotification(notification.id)}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Other views (Templates, Campaigns, Analytics, Settings) would go here */}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>
                {notificationForm.id ? 'Notification bearbeiten' : 'Neue Notification'}
              </h2>
              <button 
                className={styles.closeButton}
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Type Selection */}
              <div className={styles.formSection}>
                <h3>Notification Type</h3>
                <div className={styles.typeGrid}>
                  {Object.entries(NOTIFICATION_TYPES).map(([type, config]) => (
                    <button
                      key={type}
                      className={`${styles.typeOption} ${notificationForm.type === type ? styles.selected : ''}`}
                      onClick={() => setNotificationForm(prev => ({ ...prev, type }))}
                    >
                      <span className={styles.typeIcon}>{config.icon}</span>
                      <span className={styles.typeLabel}>{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className={styles.formSection}>
                <h3>Inhalt</h3>
                <div className={styles.formGroup}>
                  <label>Titel</label>
                  <input
                    type="text"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Notification Titel..."
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Nachricht</label>
                  <textarea
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Notification Nachricht..."
                    rows={4}
                    className={styles.textarea}
                  />
                </div>
              </div>

              {/* Channels */}
              <div className={styles.formSection}>
                <h3>Kanäle</h3>
                <div className={styles.channelGrid}>
                  {Object.entries(CHANNELS).map(([channel, config]) => (
                    <label key={channel} className={styles.channelOption}>
                      <input
                        type="checkbox"
                        checked={notificationForm.channels.includes(channel)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNotificationForm(prev => ({
                              ...prev,
                              channels: [...prev.channels, channel]
                            }));
                          } else {
                            setNotificationForm(prev => ({
                              ...prev,
                              channels: prev.channels.filter(c => c !== channel)
                            }));
                          }
                        }}
                        disabled={config.vipOnly && !notificationForm.priority === 'urgent'}
                      />
                      <config.icon size={20} style={{ color: config.color }} />
                      <span>{config.label}</span>
                      {config.vipOnly && <span className={styles.vipBadge}>VIP</span>}
                    </label>
                  ))}
                </div>
              </div>

              {/* Targeting */}
              <div className={styles.formSection}>
                <h3>Zielgruppe</h3>
                <div className={styles.targetingOptions}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationForm.targeting.all}
                      onChange={(e) => setNotificationForm(prev => ({
                        ...prev,
                        targeting: { ...prev.targeting, all: e.target.checked }
                      }))}
                    />
                    Alle Benutzer
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationForm.targeting.favorites}
                      onChange={(e) => setNotificationForm(prev => ({
                        ...prev,
                        targeting: { ...prev.targeting, favorites: e.target.checked }
                      }))}
                    />
                    Nur Favoriten
                  </label>
                </div>
              </div>

              {/* Scheduling */}
              <div className={styles.formSection}>
                <h3>Zeitplanung</h3>
                <div className={styles.schedulingOptions}>
                  <label className={styles.radio}>
                    <input
                      type="radio"
                      checked={notificationForm.scheduling.immediate}
                      onChange={() => setNotificationForm(prev => ({
                        ...prev,
                        scheduling: { ...prev.scheduling, immediate: true, optimalTime: false }
                      }))}
                    />
                    Sofort senden
                  </label>
                  <label className={styles.radio}>
                    <input
                      type="radio"
                      checked={notificationForm.scheduling.optimalTime}
                      onChange={() => setNotificationForm(prev => ({
                        ...prev,
                        scheduling: { ...prev.scheduling, immediate: false, optimalTime: true }
                      }))}
                    />
                    Optimale Zeit (Smart Timing)
                  </label>
                </div>
              </div>

              {/* A/B Testing */}
              <div className={styles.formSection}>
                <h3>
                  A/B Testing
                  <button
                    className={styles.toggleButton}
                    onClick={() => setAbTest(prev => ({ ...prev, enabled: !prev.enabled }))}
                  >
                    {abTest.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </h3>
                {abTest.enabled && (
                  <div className={styles.abTestConfig}>
                    <div className={styles.variants}>
                      <div className={styles.variant}>
                        <h4>Variante A</h4>
                        <input
                          type="text"
                          placeholder="Titel A"
                          value={abTest.variantA.title}
                          onChange={(e) => setAbTest(prev => ({
                            ...prev,
                            variantA: { ...prev.variantA, title: e.target.value }
                          }))}
                          className={styles.input}
                        />
                        <textarea
                          placeholder="Nachricht A"
                          value={abTest.variantA.message}
                          onChange={(e) => setAbTest(prev => ({
                            ...prev,
                            variantA: { ...prev.variantA, message: e.target.value }
                          }))}
                          rows={3}
                          className={styles.textarea}
                        />
                      </div>
                      <div className={styles.variant}>
                        <h4>Variante B</h4>
                        <input
                          type="text"
                          placeholder="Titel B"
                          value={abTest.variantB.title}
                          onChange={(e) => setAbTest(prev => ({
                            ...prev,
                            variantB: { ...prev.variantB, title: e.target.value }
                          }))}
                          className={styles.input}
                        />
                        <textarea
                          placeholder="Nachricht B"
                          value={abTest.variantB.message}
                          onChange={(e) => setAbTest(prev => ({
                            ...prev,
                            variantB: { ...prev.variantB, message: e.target.value }
                          }))}
                          rows={3}
                          className={styles.textarea}
                        />
                      </div>
                    </div>
                    <div className={styles.abTestSettings}>
                      <div className={styles.splitRatio}>
                        <label>Split Ratio: {abTest.splitRatio}%</label>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={abTest.splitRatio}
                          onChange={(e) => setAbTest(prev => ({
                            ...prev,
                            splitRatio: parseInt(e.target.value)
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Languages */}
              <div className={styles.formSection}>
                <h3>Sprachen</h3>
                <div className={styles.languageOptions}>
                  {Object.entries(LANGUAGES).map(([lang, config]) => (
                    <label key={lang} className={styles.languageOption}>
                      <input
                        type="checkbox"
                        checked={notificationForm.languages.includes(lang)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNotificationForm(prev => ({
                              ...prev,
                              languages: [...prev.languages, lang]
                            }));
                          } else {
                            setNotificationForm(prev => ({
                              ...prev,
                              languages: prev.languages.filter(l => l !== lang)
                            }));
                          }
                        }}
                      />
                      <span>{config.flag}</span>
                      <span>{config.label}</span>
                    </label>
                  ))}
                </div>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={notificationForm.autoTranslate}
                    onChange={(e) => setNotificationForm(prev => ({
                      ...prev,
                      autoTranslate: e.target.checked
                    }))}
                  />
                  <Languages size={16} />
                  Automatisch übersetzen (Google Translate)
                </label>
              </div>

              {/* Advanced Options */}
              <div className={styles.formSection}>
                <h3>Erweiterte Optionen</h3>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={notificationForm.quietHoursOverride}
                    onChange={(e) => setNotificationForm(prev => ({
                      ...prev,
                      quietHoursOverride: e.target.checked
                    }))}
                  />
                  <BellOff size={16} />
                  Quiet Hours überschreiben (22:00-08:00)
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                Abbrechen
              </button>
              <button 
                className={styles.testSendButton}
                onClick={() => setShowTestModal(true)}
              >
                <TestTube size={16} />
                Test senden
              </button>
              <button 
                className={styles.sendButton}
                onClick={sendNotification}
                disabled={!notificationForm.title || !notificationForm.message || sending}
              >
                {sending ? (
                  <>
                    <RefreshCw size={16} className={styles.spinning} />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Senden
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.emergencyModal}>
            <div className={styles.modalHeader}>
              <h2>
                <AlertCircle size={24} color="#FF6B6B" />
                Emergency Broadcast
              </h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowEmergencyModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.emergencyGrid}>
                {Object.entries(EMERGENCY_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    className={styles.emergencyOption}
                    onClick={() => {
                      // Show parameter input modal
                      const params = {};
                      const matches = template.template.match(/{(\w+)}/g);
                      if (matches) {
                        matches.forEach(match => {
                          const param = match.replace(/{|}/g, '');
                          params[param] = prompt(`Bitte ${param} eingeben:`);
                        });
                      }
                      sendEmergencyBroadcast(template, params);
                    }}
                  >
                    <span className={styles.emergencyIcon}>{template.icon}</span>
                    <span className={styles.emergencyTitle}>{template.title}</span>
                    <span className={styles.emergencyTemplate}>{template.template}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.testModal}>
            <div className={styles.modalHeader}>
              <h2>
                <TestTube size={24} />
                Test Notification senden
              </h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowTestModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.testPreview}>
                <h3>Preview</h3>
                <div className={styles.previewBox}>
                  <div className={styles.previewTitle}>
                    {testMode ? '[TEST] ' : ''}{notificationForm.title || 'Titel...'}
                  </div>
                  <div className={styles.previewMessage}>
                    {notificationForm.message || 'Nachricht...'}
                  </div>
                </div>
              </div>
              <div className={styles.testGroups}>
                <h3>Test Groups</h3>
                {Object.entries(TEST_GROUPS).map(([group, config]) => (
                  <label key={group} className={styles.testGroup}>
                    <input type="checkbox" />
                    <config.icon size={20} />
                    <span>{config.label}</span>
                    <span className={styles.memberCount}>
                      ({config.members.length} Mitglieder)
                    </span>
                  </label>
                ))}
              </div>
              <button 
                className={styles.testSendButton}
                onClick={() => sendTestNotification(['master', 'internal'])}
              >
                <Send size={16} />
                Test an mich senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;