/**
 * EATECH - PreOrder Manager
 * Version: 25.0.0
 * Description: Vorbestellungs-Management mit Smart Scheduling,
 *              Wartezeit-Kalkulation und Recurring Orders
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/pages/PreOrderManager/PreOrderManager.jsx
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
  endAt,
  equalTo
} from 'firebase/database';
import {
  Clock,
  Calendar,
  Users,
  Truck,
  Package,
  Timer,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Filter,
  Search,
  Download,
  RefreshCw,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Zap,
  Coffee,
  Utensils,
  Star,
  Award,
  BarChart3,
  Activity,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  DollarSign,
  Percent,
  Hash,
  Info,
  Edit,
  Trash2,
  Copy,
  Bell,
  BellOff,
  Repeat,
  PlayCircle,
  PauseCircle,
  SkipForward,
  Gauge,
  Cpu,
  Smartphone,
  CreditCard,
  ShoppingCart,
  UserCheck,
  UserX,
  ChefHat,
  Soup,
  Pizza,
  Cookie
} from 'lucide-react';
import styles from './PreOrderManager.module.css';

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
const PREORDER_CONFIG = {
  normalUserAdvance: 60,      // 60 minutes (1 hour)
  premiumUserAdvance: 120,    // 120 minutes (2 hours)
  minPrepTime: 10,           // Minimum 10 minutes
  avgPrepTime: 15,           // Average 15 minutes per order
  bufferTime: 5,             // 5 minutes buffer
  peakHours: {
    lunch: { start: '11:30', end: '13:30', multiplier: 1.5 },
    dinner: { start: '18:00', end: '20:00', multiplier: 1.3 }
  },
  recurringDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  maxRecurringWeeks: 12      // Max 12 weeks for recurring orders
};

const ORDER_STATUS = {
  pending: { icon: Clock, color: '#FFD93D', label: 'Ausstehend' },
  confirmed: { icon: CheckCircle, color: '#339AF0', label: 'Bestätigt' },
  preparing: { icon: ChefHat, color: '#FF6B6B', label: 'In Zubereitung' },
  ready: { icon: Package, color: '#51CF66', label: 'Bereit' },
  delivered: { icon: CheckCircle, color: '#51CF66', label: 'Abgeholt' },
  cancelled: { icon: XCircle, color: '#868E96', label: 'Storniert' },
  noShow: { icon: UserX, color: '#FF6B6B', label: 'Nicht erschienen' }
};

const TIME_SLOTS = [
  { id: 'morning', label: 'Morgen', start: '08:00', end: '11:00', icon: Coffee },
  { id: 'lunch', label: 'Mittag', start: '11:00', end: '14:00', icon: Utensils },
  { id: 'afternoon', label: 'Nachmittag', start: '14:00', end: '17:00', icon: Coffee },
  { id: 'dinner', label: 'Abend', start: '17:00', end: '21:00', icon: Utensils }
];

const FOOD_CATEGORIES = {
  burger: { icon: '🍔', label: 'Burger', avgPrepTime: 12 },
  pizza: { icon: '🍕', label: 'Pizza', avgPrepTime: 15 },
  asian: { icon: '🥡', label: 'Asiatisch', avgPrepTime: 10 },
  mexican: { icon: '🌮', label: 'Mexikanisch', avgPrepTime: 8 },
  salad: { icon: '🥗', label: 'Salat', avgPrepTime: 5 },
  dessert: { icon: '🍰', label: 'Dessert', avgPrepTime: 3 }
};

// ============================================================================
// PREORDER MANAGER COMPONENT
// ============================================================================
const PreOrderManager = () => {
  // State Management
  const [activeView, setActiveView] = useState('dashboard');
  const [preorders, setPreorders] = useState([]);
  const [recurringOrders, setRecurringOrders] = useState([]);
  const [foodtrucks, setFoodtrucks] = useState([]);
  const [users, setUsers] = useState([]);
  const [queueStatus, setQueueStatus] = useState({});
  const [analytics, setAnalytics] = useState({
    totalPreorders: 0,
    activePreorders: 0,
    recurringActive: 0,
    avgWaitTime: 0,
    peakTimeOrders: 0,
    completionRate: 0,
    noShowRate: 0,
    popularTimeSlots: {},
    popularItems: {},
    userLevelBreakdown: {},
    revenueImpact: 0
  });
  const [filters, setFilters] = useState({
    dateRange: 'today',
    status: 'all',
    foodtruck: 'all',
    timeSlot: 'all',
    recurring: 'all',
    search: ''
  });
  const [selectedPreorder, setSelectedPreorder] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form States for Manual PreOrder
  const [manualPreorder, setManualPreorder] = useState({
    userId: '',
    foodtruckId: '',
    items: [],
    pickupTime: '',
    isRecurring: false,
    recurringDays: [],
    recurringWeeks: 4,
    notes: ''
  });

  // ========================================================================
  // FIREBASE LISTENERS
  // ========================================================================
  useEffect(() => {
    const preordersRef = ref(database, 'preorders');
    const recurringRef = ref(database, 'recurring_orders');
    const foodtrucksRef = ref(database, 'foodtrucks');
    const usersRef = ref(database, 'users');
    const queueRef = ref(database, 'order_queues');

    // Load preorders
    const preordersQuery = query(
      preordersRef,
      orderByChild('pickupTime'),
      limitToLast(1000)
    );

    const unsubscribePreorders = onValue(preordersQuery, (snapshot) => {
      const data = snapshot.val() || {};
      const preordersList = Object.entries(data).map(([id, order]) => ({
        id,
        ...order
      }));
      setPreorders(preordersList);
      calculateAnalytics(preordersList);
      setLoading(false);
    });

    // Load recurring orders
    const unsubscribeRecurring = onValue(recurringRef, (snapshot) => {
      const data = snapshot.val() || {};
      const recurringList = Object.entries(data).map(([id, order]) => ({
        id,
        ...order
      }));
      setRecurringOrders(recurringList);
    });

    // Load foodtrucks
    const unsubscribeFoodtrucks = onValue(foodtrucksRef, (snapshot) => {
      const data = snapshot.val() || {};
      const foodtrucksList = Object.entries(data).map(([id, truck]) => ({
        id,
        ...truck
      }));
      setFoodtrucks(foodtrucksList);
    });

    // Load users
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const usersList = Object.entries(data).map(([id, user]) => ({
        id,
        ...user,
        isPremium: user.level?.id === 'buddy' || 
                   user.level?.id === 'champion' || 
                   user.level?.id === 'maestro' || 
                   user.level?.id === 'nomad'
      }));
      setUsers(usersList);
    });

    // Load queue status
    const unsubscribeQueue = onValue(queueRef, (snapshot) => {
      const data = snapshot.val() || {};
      setQueueStatus(data);
    });

    return () => {
      unsubscribePreorders();
      unsubscribeRecurring();
      unsubscribeFoodtrucks();
      unsubscribeUsers();
      unsubscribeQueue();
    };
  }, []);

  // ========================================================================
  // WAIT TIME CALCULATION
  // ========================================================================
  const calculateWaitTime = useCallback((foodtruckId, pickupTime, orderItems = []) => {
    const truck = foodtrucks.find(f => f.id === foodtruckId);
    if (!truck) return PREORDER_CONFIG.avgPrepTime;

    // Get current queue for this truck
    const truckQueue = queueStatus[foodtruckId] || { activeOrders: 0, avgPrepTime: 15 };
    
    // Calculate base prep time based on items
    let basePrepTime = 0;
    orderItems.forEach(item => {
      const category = FOOD_CATEGORIES[item.category] || { avgPrepTime: 10 };
      basePrepTime += category.avgPrepTime * item.quantity;
    });

    // If no items specified, use average
    if (basePrepTime === 0) {
      basePrepTime = PREORDER_CONFIG.avgPrepTime;
    }

    // Check if pickup time is during peak hours
    const pickupHour = new Date(pickupTime).getHours();
    const pickupMinutes = new Date(pickupTime).getMinutes();
    const pickupTimeStr = `${pickupHour}:${pickupMinutes.toString().padStart(2, '0')}`;
    
    let peakMultiplier = 1;
    Object.values(PREORDER_CONFIG.peakHours).forEach(peak => {
      if (pickupTimeStr >= peak.start && pickupTimeStr <= peak.end) {
        peakMultiplier = peak.multiplier;
      }
    });

    // Calculate total wait time
    const queueTime = truckQueue.activeOrders * truckQueue.avgPrepTime;
    const totalPrepTime = basePrepTime * peakMultiplier;
    const bufferTime = PREORDER_CONFIG.bufferTime;

    // Chef can override wait times
    const customWaitTime = truck.settings?.customPrepTime;
    if (customWaitTime && truck.settings?.useCustomTimes) {
      return customWaitTime + bufferTime;
    }

    return Math.ceil(queueTime + totalPrepTime + bufferTime);
  }, [foodtrucks, queueStatus]);

  // ========================================================================
  // ANALYTICS CALCULATIONS
  // ========================================================================
  const calculateAnalytics = (preordersList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let stats = {
      totalPreorders: preordersList.length,
      activePreorders: 0,
      recurringActive: 0,
      avgWaitTime: 0,
      peakTimeOrders: 0,
      completionRate: 0,
      noShowRate: 0,
      popularTimeSlots: {},
      popularItems: {},
      userLevelBreakdown: { normal: 0, premium: 0 },
      revenueImpact: 0
    };

    let totalWaitTime = 0;
    let completedOrders = 0;
    let noShowOrders = 0;
    const itemCounts = {};
    const timeSlotCounts = {};

    preordersList.forEach(order => {
      // Active preorders
      if (['pending', 'confirmed', 'preparing'].includes(order.status)) {
        stats.activePreorders++;
      }

      // Recurring orders
      if (order.isRecurring) {
        stats.recurringActive++;
      }

      // Wait time
      if (order.actualWaitTime) {
        totalWaitTime += order.actualWaitTime;
      }

      // Peak time analysis
      const orderHour = new Date(order.pickupTime).getHours();
      const orderMinutes = new Date(order.pickupTime).getMinutes();
      const orderTimeStr = `${orderHour}:${orderMinutes.toString().padStart(2, '0')}`;
      
      Object.values(PREORDER_CONFIG.peakHours).forEach(peak => {
        if (orderTimeStr >= peak.start && orderTimeStr <= peak.end) {
          stats.peakTimeOrders++;
        }
      });

      // Completion rate
      if (order.status === 'delivered') {
        completedOrders++;
      }
      if (order.status === 'noShow') {
        noShowOrders++;
      }

      // Popular items
      order.items?.forEach(item => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = 0;
        }
        itemCounts[item.name] += item.quantity;
      });

      // Time slot analysis
      const timeSlot = TIME_SLOTS.find(slot => {
        const slotStart = parseInt(slot.start.split(':')[0]);
        const slotEnd = parseInt(slot.end.split(':')[0]);
        return orderHour >= slotStart && orderHour < slotEnd;
      });
      if (timeSlot) {
        if (!timeSlotCounts[timeSlot.id]) {
          timeSlotCounts[timeSlot.id] = 0;
        }
        timeSlotCounts[timeSlot.id]++;
      }

      // User level breakdown
      const user = users.find(u => u.id === order.userId);
      if (user?.isPremium) {
        stats.userLevelBreakdown.premium++;
      } else {
        stats.userLevelBreakdown.normal++;
      }

      // Revenue impact
      stats.revenueImpact += order.totalAmount || 0;
    });

    // Calculate final stats
    stats.avgWaitTime = stats.totalPreorders > 0 
      ? Math.round(totalWaitTime / stats.totalPreorders)
      : 0;

    stats.completionRate = stats.totalPreorders > 0
      ? ((completedOrders / stats.totalPreorders) * 100).toFixed(1)
      : 0;

    stats.noShowRate = stats.totalPreorders > 0
      ? ((noShowOrders / stats.totalPreorders) * 100).toFixed(1)
      : 0;

    // Sort popular items
    stats.popularItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    stats.popularTimeSlots = timeSlotCounts;

    setAnalytics(stats);
  };

  // ========================================================================
  // PREORDER MANAGEMENT
  // ========================================================================
  const createPreorder = async (orderData) => {
    try {
      const user = users.find(u => u.id === orderData.userId);
      const foodtruck = foodtrucks.find(f => f.id === orderData.foodtruckId);

      // Calculate earliest pickup time based on user level
      const now = new Date();
      const advanceMinutes = user?.isPremium 
        ? PREORDER_CONFIG.premiumUserAdvance 
        : PREORDER_CONFIG.normalUserAdvance;
      
      const earliestPickup = new Date(now.getTime() + advanceMinutes * 60 * 1000);

      // Validate pickup time
      const requestedPickup = new Date(orderData.pickupTime);
      if (requestedPickup < earliestPickup) {
        alert(`Abholzeit muss mindestens ${advanceMinutes} Minuten in der Zukunft liegen!`);
        return;
      }

      // Calculate wait time
      const estimatedWaitTime = calculateWaitTime(
        orderData.foodtruckId,
        orderData.pickupTime,
        orderData.items
      );

      const preorder = {
        ...orderData,
        status: 'pending',
        createdAt: serverTimestamp(),
        estimatedWaitTime,
        userLevel: user?.level?.name || 'Street Food Rookie',
        foodtruckName: foodtruck?.name,
        userName: user?.name
      };

      // Save preorder
      const preorderRef = push(ref(database, 'preorders'), preorder);

      // If recurring, create recurring order template
      if (orderData.isRecurring) {
        const recurringOrder = {
          ...orderData,
          preorderId: preorderRef.key,
          active: true,
          createdAt: serverTimestamp(),
          nextExecution: calculateNextRecurring(orderData.recurringDays[0])
        };
        
        await push(ref(database, 'recurring_orders'), recurringOrder);
      }

      // Update queue status
      await updateQueueStatus(orderData.foodtruckId, 1);

      alert('Vorbestellung erfolgreich erstellt!');
      setShowScheduleModal(false);
      resetManualPreorder();
    } catch (error) {
      console.error('Error creating preorder:', error);
      alert('Fehler beim Erstellen der Vorbestellung');
    }
  };

  const updatePreorderStatus = async (preorderId, newStatus) => {
    try {
      const preorder = preorders.find(p => p.id === preorderId);
      if (!preorder) return;

      await update(ref(database, `preorders/${preorderId}`), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === 'delivered' && { 
          actualWaitTime: calculateActualWaitTime(preorder) 
        })
      });

      // Update queue if order is completed
      if (['delivered', 'cancelled', 'noShow'].includes(newStatus)) {
        await updateQueueStatus(preorder.foodtruckId, -1);
      }

      // Send notification based on status
      if (newStatus === 'preparing') {
        // Notify user that order is being prepared
        await sendStatusNotification(preorder.userId, 'preparing', preorder);
      } else if (newStatus === 'ready') {
        // Notify user that order is ready
        await sendStatusNotification(preorder.userId, 'ready', preorder);
      }
    } catch (error) {
      console.error('Error updating preorder status:', error);
      alert('Fehler beim Aktualisieren des Status');
    }
  };

  const updateQueueStatus = async (foodtruckId, change) => {
    const currentQueue = queueStatus[foodtruckId] || { activeOrders: 0 };
    const newCount = Math.max(0, currentQueue.activeOrders + change);
    
    await update(ref(database, `order_queues/${foodtruckId}`), {
      activeOrders: newCount,
      lastUpdated: serverTimestamp()
    });
  };

  const calculateActualWaitTime = (preorder) => {
    const created = new Date(preorder.createdAt);
    const delivered = new Date();
    return Math.round((delivered - created) / 1000 / 60); // Minutes
  };

  const sendStatusNotification = async (userId, status, preorder) => {
    // This would integrate with NotificationCenter
    const notification = {
      type: 'order_status',
      userId,
      status,
      preorderId: preorder.id,
      foodtruckName: preorder.foodtruckName,
      channels: ['push', 'inApp']
    };
    
    await push(ref(database, 'notifications'), notification);
  };

  // ========================================================================
  // RECURRING ORDERS
  // ========================================================================
  const calculateNextRecurring = (dayOfWeek) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const todayDay = today.getDay();
    const targetDay = days.indexOf(dayOfWeek);
    
    let daysUntilNext = targetDay - todayDay;
    if (daysUntilNext <= 0) {
      daysUntilNext += 7;
    }
    
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntilNext);
    return nextDate.toISOString();
  };

  const toggleRecurringOrder = async (recurringId, active) => {
    try {
      await update(ref(database, `recurring_orders/${recurringId}`), {
        active,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling recurring order:', error);
    }
  };

  const processRecurringOrders = async () => {
    // This would run daily to create preorders from recurring templates
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    recurringOrders
      .filter(order => order.active && order.recurringDays.includes(today))
      .forEach(async (order) => {
        // Create today's preorder from template
        const todaysPreorder = {
          ...order,
          pickupTime: new Date(order.pickupTime).toISOString(),
          recurringId: order.id
        };
        
        delete todaysPreorder.id;
        delete todaysPreorder.nextExecution;
        
        await createPreorder(todaysPreorder);
      });
  };

  // ========================================================================
  // UI HELPERS
  // ========================================================================
  const resetManualPreorder = () => {
    setManualPreorder({
      userId: '',
      foodtruckId: '',
      items: [],
      pickupTime: '',
      isRecurring: false,
      recurringDays: [],
      recurringWeeks: 4,
      notes: ''
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('de-CH');
  };

  const formatPickupTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    const ranges = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      tomorrow: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      all: new Date(0)
    };
    return ranges[filters.dateRange] || ranges.today;
  };

  const filteredPreorders = useMemo(() => {
    const dateFilter = getDateRangeFilter();
    
    return preorders.filter(order => {
      const orderDate = new Date(order.pickupTime);
      
      if (filters.dateRange === 'today') {
        const today = new Date();
        if (orderDate.toDateString() !== today.toDateString()) return false;
      } else if (filters.dateRange === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (orderDate.toDateString() !== tomorrow.toDateString()) return false;
      } else if (filters.dateRange === 'week') {
        if (orderDate < dateFilter) return false;
      }
      
      if (filters.status !== 'all' && order.status !== filters.status) return false;
      if (filters.foodtruck !== 'all' && order.foodtruckId !== filters.foodtruck) return false;
      if (filters.recurring !== 'all') {
        const isRecurring = order.isRecurring ? 'yes' : 'no';
        if (isRecurring !== filters.recurring) return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesUser = order.userName?.toLowerCase().includes(searchLower);
        const matchesTruck = order.foodtruckName?.toLowerCase().includes(searchLower);
        const matchesItems = order.items?.some(item => 
          item.name?.toLowerCase().includes(searchLower)
        );
        if (!matchesUser && !matchesTruck && !matchesItems) return false;
      }
      
      return true;
    });
  }, [preorders, filters]);

  // ========================================================================
  // RENDER
  // ========================================================================
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Lade PreOrder Manager...</p>
      </div>
    );
  }

  return (
    <div className={styles.preorderManager}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <Timer size={28} />
            PreOrder Manager
          </h1>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{analytics.activePreorders}</span>
              <span className={styles.statLabel}>Aktive Vorbestellungen</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{analytics.avgWaitTime} Min</span>
              <span className={styles.statLabel}>⌀ Wartezeit</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{analytics.completionRate}%</span>
              <span className={styles.statLabel}>Erfolgsrate</span>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.queueButton}
            onClick={() => setShowQueueModal(true)}
          >
            <Gauge size={18} />
            Queue Status
          </button>
          <button 
            className={styles.createButton}
            onClick={() => setShowScheduleModal(true)}
          >
            <Plus size={18} />
            Neue Vorbestellung
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
          className={`${styles.tab} ${activeView === 'active' ? styles.active : ''}`}
          onClick={() => setActiveView('active')}
        >
          <Clock size={18} />
          Aktive Orders
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'recurring' ? styles.active : ''}`}
          onClick={() => setActiveView('recurring')}
        >
          <Repeat size={18} />
          Recurring
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'analytics' ? styles.active : ''}`}
          onClick={() => setActiveView('analytics')}
        >
          <BarChart3 size={18} />
          Analytics
        </button>
      </div>

      {/* Content Area */}
      <div className={styles.content}>
        {activeView === 'dashboard' && (
          <div className={styles.dashboard}>
            {/* Time Slot Overview */}
            <div className={styles.timeSlotOverview}>
              <h2>Zeitslot Übersicht</h2>
              <div className={styles.timeSlotGrid}>
                {TIME_SLOTS.map(slot => {
                  const slotOrders = filteredPreorders.filter(order => {
                    const orderHour = new Date(order.pickupTime).getHours();
                    const slotStart = parseInt(slot.start.split(':')[0]);
                    const slotEnd = parseInt(slot.end.split(':')[0]);
                    return orderHour >= slotStart && orderHour < slotEnd;
                  });

                  const slotPercentage = filteredPreorders.length > 0
                    ? ((slotOrders.length / filteredPreorders.length) * 100).toFixed(0)
                    : 0;

                  return (
                    <div key={slot.id} className={styles.timeSlotCard}>
                      <div className={styles.slotHeader}>
                        <slot.icon size={24} />
                        <span>{slot.label}</span>
                      </div>
                      <div className={styles.slotTime}>
                        {slot.start} - {slot.end}
                      </div>
                      <div className={styles.slotStats}>
                        <div className={styles.slotOrders}>
                          <span className={styles.slotCount}>{slotOrders.length}</span>
                          <span className={styles.slotLabel}>Bestellungen</span>
                        </div>
                        <div className={styles.slotPercentage}>
                          {slotPercentage}%
                        </div>
                      </div>
                      <div className={styles.slotBar}>
                        <div 
                          className={styles.slotBarFill}
                          style={{ width: `${slotPercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Queue Overview */}
            <div className={styles.queueOverview}>
              <h2>
                <Gauge size={20} />
                Live Queue Status
              </h2>
              <div className={styles.queueGrid}>
                {foodtrucks.map(truck => {
                  const queue = queueStatus[truck.id] || { activeOrders: 0 };
                  const avgWaitTime = calculateWaitTime(truck.id, new Date());
                  const isBusy = queue.activeOrders > 5;

                  return (
                    <div 
                      key={truck.id} 
                      className={`${styles.queueCard} ${isBusy ? styles.busy : ''}`}
                    >
                      <div className={styles.queueHeader}>
                        <Truck size={20} />
                        <span>{truck.name}</span>
                      </div>
                      <div className={styles.queueStats}>
                        <div className={styles.queueStat}>
                          <span className={styles.queueValue}>{queue.activeOrders}</span>
                          <span className={styles.queueLabel}>In Queue</span>
                        </div>
                        <div className={styles.queueStat}>
                          <span className={styles.queueValue}>{avgWaitTime} Min</span>
                          <span className={styles.queueLabel}>Wartezeit</span>
                        </div>
                      </div>
                      <div className={styles.queueIndicator}>
                        <div 
                          className={styles.queueLevel}
                          style={{ 
                            height: `${Math.min(queue.activeOrders * 10, 100)}%`,
                            backgroundColor: isBusy ? '#FF6B6B' : '#51CF66'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular Items */}
            <div className={styles.popularItems}>
              <h2>
                <TrendingUp size={20} />
                Beliebte Vorbestellungen
              </h2>
              <div className={styles.itemsList}>
                {Object.entries(analytics.popularItems).map(([item, count], index) => (
                  <div key={item} className={styles.popularItem}>
                    <div className={styles.itemRank}>#{index + 1}</div>
                    <div className={styles.itemName}>{item}</div>
                    <div className={styles.itemCount}>{count}x bestellt</div>
                    <div className={styles.itemBar}>
                      <div 
                        className={styles.itemBarFill}
                        style={{ 
                          width: `${(count / Object.values(analytics.popularItems)[0]) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Level Breakdown */}
            <div className={styles.userBreakdown}>
              <h2>
                <Users size={20} />
                Benutzer Level
              </h2>
              <div className={styles.levelCards}>
                <div className={styles.levelCard}>
                  <div className={styles.levelIcon}>
                    <Users size={32} />
                  </div>
                  <div className={styles.levelInfo}>
                    <div className={styles.levelCount}>
                      {analytics.userLevelBreakdown.normal}
                    </div>
                    <div className={styles.levelLabel}>Normal (1h)</div>
                  </div>
                </div>
                <div className={styles.levelCard}>
                  <div className={styles.levelIcon}>
                    <Award size={32} />
                  </div>
                  <div className={styles.levelInfo}>
                    <div className={styles.levelCount}>
                      {analytics.userLevelBreakdown.premium}
                    </div>
                    <div className={styles.levelLabel}>Premium (2h)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'active' && (
          <div className={styles.activeOrders}>
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
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="today">Heute</option>
                <option value="tomorrow">Morgen</option>
                <option value="week">Diese Woche</option>
                <option value="all">Alle</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="all">Alle Status</option>
                {Object.entries(ORDER_STATUS).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>

              <select
                value={filters.foodtruck}
                onChange={(e) => setFilters(prev => ({ ...prev, foodtruck: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="all">Alle Foodtrucks</option>
                {foodtrucks.map(truck => (
                  <option key={truck.id} value={truck.id}>{truck.name}</option>
                ))}
              </select>
            </div>

            {/* Orders Timeline */}
            <div className={styles.timeline}>
              {TIME_SLOTS.map(slot => {
                const slotOrders = filteredPreorders.filter(order => {
                  const orderHour = new Date(order.pickupTime).getHours();
                  const slotStart = parseInt(slot.start.split(':')[0]);
                  const slotEnd = parseInt(slot.end.split(':')[0]);
                  return orderHour >= slotStart && orderHour < slotEnd;
                }).sort((a, b) => new Date(a.pickupTime) - new Date(b.pickupTime));

                if (slotOrders.length === 0) return null;

                return (
                  <div key={slot.id} className={styles.timelineSection}>
                    <div className={styles.timelineHeader}>
                      <slot.icon size={20} />
                      <span>{slot.label}</span>
                      <span className={styles.slotTime}>({slot.start} - {slot.end})</span>
                      <span className={styles.orderCount}>{slotOrders.length} Orders</span>
                    </div>
                    
                    <div className={styles.orderCards}>
                      {slotOrders.map(order => {
                        const statusConfig = ORDER_STATUS[order.status];
                        const user = users.find(u => u.id === order.userId);
                        
                        return (
                          <div key={order.id} className={styles.orderCard}>
                            <div className={styles.orderHeader}>
                              <div className={styles.orderTime}>
                                <Clock size={16} />
                                {formatPickupTime(order.pickupTime)}
                              </div>
                              <div 
                                className={styles.orderStatus}
                                style={{ backgroundColor: statusConfig.color }}
                              >
                                <statusConfig.icon size={14} />
                                {statusConfig.label}
                              </div>
                            </div>
                            
                            <div className={styles.orderContent}>
                              <div className={styles.orderInfo}>
                                <div className={styles.customerInfo}>
                                  <UserCheck size={16} />
                                  <span>{order.userName}</span>
                                  {user?.isPremium && (
                                    <span className={styles.premiumBadge}>
                                      <Star size={12} />
                                      Premium
                                    </span>
                                  )}
                                </div>
                                <div className={styles.truckInfo}>
                                  <Truck size={16} />
                                  <span>{order.foodtruckName}</span>
                                </div>
                              </div>
                              
                              <div className={styles.orderItems}>
                                {order.items?.map((item, idx) => (
                                  <div key={idx} className={styles.orderItem}>
                                    <span className={styles.itemQuantity}>{item.quantity}x</span>
                                    <span className={styles.itemName}>{item.name}</span>
                                  </div>
                                ))}
                              </div>
                              
                              {order.notes && (
                                <div className={styles.orderNotes}>
                                  <Info size={14} />
                                  {order.notes}
                                </div>
                              )}
                              
                              {order.isRecurring && (
                                <div className={styles.recurringBadge}>
                                  <Repeat size={14} />
                                  Wiederkehrend
                                </div>
                              )}
                            </div>
                            
                            <div className={styles.orderActions}>
                              <select
                                value={order.status}
                                onChange={(e) => updatePreorderStatus(order.id, e.target.value)}
                                className={styles.statusSelect}
                              >
                                {Object.entries(ORDER_STATUS).map(([key, config]) => (
                                  <option key={key} value={key}>{config.label}</option>
                                ))}
                              </select>
                              
                              <button
                                className={styles.viewButton}
                                onClick={() => setSelectedPreorder(order)}
                              >
                                <Eye size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeView === 'recurring' && (
          <div className={styles.recurringOrders}>
            <div className={styles.recurringHeader}>
              <h2>Wiederkehrende Bestellungen</h2>
              <button 
                className={styles.processButton}
                onClick={processRecurringOrders}
              >
                <PlayCircle size={18} />
                Heute verarbeiten
              </button>
            </div>

            <div className={styles.recurringGrid}>
              {recurringOrders.map(order => {
                const user = users.find(u => u.id === order.userId);
                const foodtruck = foodtrucks.find(f => f.id === order.foodtruckId);

                return (
                  <div 
                    key={order.id} 
                    className={`${styles.recurringCard} ${!order.active ? styles.inactive : ''}`}
                  >
                    <div className={styles.recurringCardHeader}>
                      <div className={styles.recurringUser}>
                        <UserCheck size={20} />
                        <span>{user?.name}</span>
                      </div>
                      <button
                        className={styles.toggleButton}
                        onClick={() => toggleRecurringOrder(order.id, !order.active)}
                      >
                        {order.active ? (
                          <PauseCircle size={20} />
                        ) : (
                          <PlayCircle size={20} />
                        )}
                      </button>
                    </div>

                    <div className={styles.recurringDetails}>
                      <div className={styles.recurringTruck}>
                        <Truck size={16} />
                        {foodtruck?.name}
                      </div>
                      <div className={styles.recurringTime}>
                        <Clock size={16} />
                        {formatPickupTime(order.pickupTime)}
                      </div>
                    </div>

                    <div className={styles.recurringDays}>
                      {PREORDER_CONFIG.recurringDays.map(day => (
                        <span 
                          key={day}
                          className={`${styles.dayBadge} ${order.recurringDays.includes(day) ? styles.active : ''}`}
                        >
                          {day.substring(0, 2).toUpperCase()}
                        </span>
                      ))}
                    </div>

                    <div className={styles.recurringItems}>
                      {order.items?.map((item, idx) => (
                        <div key={idx} className={styles.recurringItem}>
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                    </div>

                    <div className={styles.recurringFooter}>
                      <span className={styles.recurringWeeks}>
                        {order.recurringWeeks} Wochen
                      </span>
                      <span className={styles.nextExecution}>
                        Nächste: {formatTimestamp(order.nextExecution)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeView === 'analytics' && (
          <div className={styles.analyticsView}>
            <div className={styles.analyticsGrid}>
              {/* Peak Times Analysis */}
              <div className={styles.analyticsCard}>
                <h3>
                  <Activity size={20} />
                  Peak Times
                </h3>
                <div className={styles.peakStats}>
                  <div className={styles.peakItem}>
                    <span className={styles.peakLabel}>Peak Orders</span>
                    <span className={styles.peakValue}>{analytics.peakTimeOrders}</span>
                  </div>
                  <div className={styles.peakItem}>
                    <span className={styles.peakLabel}>% of Total</span>
                    <span className={styles.peakValue}>
                      {analytics.totalPreorders > 0 
                        ? ((analytics.peakTimeOrders / analytics.totalPreorders) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
                <div className={styles.peakInfo}>
                  <Info size={14} />
                  Lunch: 11:30-13:30 (1.5x)
                  <br />
                  Dinner: 18:00-20:00 (1.3x)
                </div>
              </div>

              {/* Performance Metrics */}
              <div className={styles.analyticsCard}>
                <h3>
                  <TrendingUp size={20} />
                  Performance
                </h3>
                <div className={styles.performanceMetrics}>
                  <div className={styles.metric}>
                    <div className={styles.metricLabel}>Erfolgsrate</div>
                    <div className={styles.metricValue}>{analytics.completionRate}%</div>
                    <div className={styles.metricBar}>
                      <div 
                        className={styles.metricBarFill}
                        style={{ 
                          width: `${analytics.completionRate}%`,
                          backgroundColor: '#51CF66'
                        }}
                      />
                    </div>
                  </div>
                  <div className={styles.metric}>
                    <div className={styles.metricLabel}>No-Show Rate</div>
                    <div className={styles.metricValue}>{analytics.noShowRate}%</div>
                    <div className={styles.metricBar}>
                      <div 
                        className={styles.metricBarFill}
                        style={{ 
                          width: `${analytics.noShowRate}%`,
                          backgroundColor: '#FF6B6B'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Impact */}
              <div className={styles.analyticsCard}>
                <h3>
                  <DollarSign size={20} />
                  Revenue Impact
                </h3>
                <div className={styles.revenueStats}>
                  <div className={styles.revenueValue}>
                    CHF {analytics.revenueImpact.toFixed(2)}
                  </div>
                  <div className={styles.revenueLabel}>
                    aus Vorbestellungen
                  </div>
                  <div className={styles.revenueBreakdown}>
                    <div className={styles.revenueItem}>
                      <span>Aktive Orders:</span>
                      <span>{analytics.activePreorders}</span>
                    </div>
                    <div className={styles.revenueItem}>
                      <span>Recurring:</span>
                      <span>{analytics.recurringActive}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wait Time Distribution */}
            <div className={styles.waitTimeChart}>
              <h3>
                <Timer size={20} />
                Wartezeit-Verteilung
              </h3>
              <div className={styles.waitTimeGrid}>
                <div className={styles.waitTimeItem}>
                  <span className={styles.waitTimeRange}>0-10 Min</span>
                  <div className={styles.waitTimeBar}>
                    <div className={styles.waitTimeBarFill} style={{ width: '30%' }} />
                  </div>
                </div>
                <div className={styles.waitTimeItem}>
                  <span className={styles.waitTimeRange}>10-20 Min</span>
                  <div className={styles.waitTimeBar}>
                    <div className={styles.waitTimeBarFill} style={{ width: '50%' }} />
                  </div>
                </div>
                <div className={styles.waitTimeItem}>
                  <span className={styles.waitTimeRange}>20-30 Min</span>
                  <div className={styles.waitTimeBar}>
                    <div className={styles.waitTimeBarFill} style={{ width: '15%' }} />
                  </div>
                </div>
                <div className={styles.waitTimeItem}>
                  <span className={styles.waitTimeRange}>30+ Min</span>
                  <div className={styles.waitTimeBar}>
                    <div className={styles.waitTimeBarFill} style={{ width: '5%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create PreOrder Modal */}
      {showScheduleModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Neue Vorbestellung</h2>
              <button 
                className={styles.closeButton}
                onClick={() => {
                  setShowScheduleModal(false);
                  resetManualPreorder();
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formSection}>
                <h3>Kunde & Foodtruck</h3>
                <div className={styles.formRow}>
                  <select
                    value={manualPreorder.userId}
                    onChange={(e) => setManualPreorder(prev => ({ ...prev, userId: e.target.value }))}
                    className={styles.formSelect}
                  >
                    <option value="">Kunde wählen...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} {user.isPremium && '⭐'}
                      </option>
                    ))}
                  </select>

                  <select
                    value={manualPreorder.foodtruckId}
                    onChange={(e) => setManualPreorder(prev => ({ ...prev, foodtruckId: e.target.value }))}
                    className={styles.formSelect}
                  >
                    <option value="">Foodtruck wählen...</option>
                    {foodtrucks.map(truck => (
                      <option key={truck.id} value={truck.id}>{truck.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3>Abholzeit</h3>
                <input
                  type="datetime-local"
                  value={manualPreorder.pickupTime}
                  onChange={(e) => setManualPreorder(prev => ({ ...prev, pickupTime: e.target.value }))}
                  className={styles.formInput}
                  min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
                />
                {manualPreorder.userId && manualPreorder.foodtruckId && manualPreorder.pickupTime && (
                  <div className={styles.waitTimeEstimate}>
                    <Timer size={16} />
                    Geschätzte Wartezeit: {
                      calculateWaitTime(
                        manualPreorder.foodtruckId,
                        manualPreorder.pickupTime,
                        manualPreorder.items
                      )
                    } Minuten
                  </div>
                )}
              </div>

              <div className={styles.formSection}>
                <h3>Wiederkehrende Bestellung</h3>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={manualPreorder.isRecurring}
                    onChange={(e) => setManualPreorder(prev => ({ 
                      ...prev, 
                      isRecurring: e.target.checked 
                    }))}
                  />
                  <Repeat size={16} />
                  Als wiederkehrende Bestellung einrichten
                </label>

                {manualPreorder.isRecurring && (
                  <div className={styles.recurringConfig}>
                    <div className={styles.recurringDays}>
                      {PREORDER_CONFIG.recurringDays.map(day => (
                        <label key={day} className={styles.dayCheckbox}>
                          <input
                            type="checkbox"
                            checked={manualPreorder.recurringDays.includes(day)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setManualPreorder(prev => ({
                                  ...prev,
                                  recurringDays: [...prev.recurringDays, day]
                                }));
                              } else {
                                setManualPreorder(prev => ({
                                  ...prev,
                                  recurringDays: prev.recurringDays.filter(d => d !== day)
                                }));
                              }
                            }}
                          />
                          {day.substring(0, 3)}
                        </label>
                      ))}
                    </div>
                    
                    <div className={styles.recurringWeeks}>
                      <label>Anzahl Wochen:</label>
                      <input
                        type="number"
                        min="1"
                        max={PREORDER_CONFIG.maxRecurringWeeks}
                        value={manualPreorder.recurringWeeks}
                        onChange={(e) => setManualPreorder(prev => ({
                          ...prev,
                          recurringWeeks: parseInt(e.target.value)
                        }))}
                        className={styles.weeksInput}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.formSection}>
                <h3>Notizen</h3>
                <textarea
                  value={manualPreorder.notes}
                  onChange={(e) => setManualPreorder(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Besondere Wünsche oder Hinweise..."
                  className={styles.formTextarea}
                  rows={3}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => {
                  setShowScheduleModal(false);
                  resetManualPreorder();
                }}
              >
                Abbrechen
              </button>
              <button 
                className={styles.createButton}
                onClick={() => createPreorder(manualPreorder)}
                disabled={!manualPreorder.userId || !manualPreorder.foodtruckId || !manualPreorder.pickupTime}
              >
                <Plus size={16} />
                Vorbestellung erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue Status Modal */}
      {showQueueModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.queueModal}>
            <div className={styles.modalHeader}>
              <h2>
                <Gauge size={24} />
                Live Queue Status
              </h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowQueueModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.queueDetailGrid}>
                {foodtrucks.map(truck => {
                  const queue = queueStatus[truck.id] || { activeOrders: 0 };
                  const activeOrders = preorders.filter(o => 
                    o.foodtruckId === truck.id && 
                    ['pending', 'confirmed', 'preparing'].includes(o.status)
                  );

                  return (
                    <div key={truck.id} className={styles.queueDetailCard}>
                      <div className={styles.queueDetailHeader}>
                        <h3>{truck.name}</h3>
                        <span className={styles.queueStatus}>
                          {queue.activeOrders > 5 ? 'Busy' : 'Normal'}
                        </span>
                      </div>
                      
                      <div className={styles.queueMetrics}>
                        <div className={styles.queueMetric}>
                          <span className={styles.metricValue}>{queue.activeOrders}</span>
                          <span className={styles.metricLabel}>In Queue</span>
                        </div>
                        <div className={styles.queueMetric}>
                          <span className={styles.metricValue}>
                            {calculateWaitTime(truck.id, new Date())} Min
                          </span>
                          <span className={styles.metricLabel}>Wait Time</span>
                        </div>
                      </div>

                      <div className={styles.activeOrdersList}>
                        <h4>Aktive Bestellungen:</h4>
                        {activeOrders.slice(0, 5).map(order => (
                          <div key={order.id} className={styles.queueOrder}>
                            <span className={styles.queueOrderTime}>
                              {formatPickupTime(order.pickupTime)}
                            </span>
                            <span className={styles.queueOrderUser}>
                              {order.userName}
                            </span>
                            <span 
                              className={styles.queueOrderStatus}
                              style={{ color: ORDER_STATUS[order.status].color }}
                            >
                              {ORDER_STATUS[order.status].label}
                            </span>
                          </div>
                        ))}
                        {activeOrders.length > 5 && (
                          <div className={styles.moreOrders}>
                            +{activeOrders.length - 5} weitere...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreOrderManager;