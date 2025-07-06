/**
 * EATECH - Calendar Manager for Foodtruck Location Planning
 * Version: 25.0.0
 * Description: 30-Tage Standortplanung mit Echtzeit-Updates,
 *              Favoriten-Benachrichtigungen und Vorbestellungen
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/pages/CalendarManager/CalendarManager.jsx
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
  remove
} from 'firebase/database';
import { 
  Calendar,
  MapPin,
  Clock,
  Users,
  Bell,
  BellOff,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info,
  Truck,
  Navigation,
  Timer,
  Copy,
  Share2,
  Eye,
  EyeOff,
  Coffee,
  Utensils,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Heart,
  Star,
  TrendingUp,
  Package,
  DollarSign,
  Filter,
  Search,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Globe,
  Lock,
  Unlock,
  UserPlus,
  Mail,
  MessageSquare,
  Phone,
  ExternalLink,
  Zap,
  Battery,
  BatteryLow,
  Signal,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import styles from './CalendarManager.module.css';

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
const DAYS_OF_WEEK = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const TIME_SLOTS = [
  { id: 'morning', label: 'Morgen', time: '08:00 - 12:00', icon: Coffee },
  { id: 'lunch', label: 'Mittag', time: '12:00 - 14:00', icon: Utensils },
  { id: 'afternoon', label: 'Nachmittag', time: '14:00 - 18:00', icon: Sun },
  { id: 'evening', label: 'Abend', time: '18:00 - 22:00', icon: Cloud }
];

const LOCATION_TYPES = {
  public: { label: 'Öffentlicher Platz', icon: MapPin, color: '#10b981' },
  event: { label: 'Event/Festival', icon: Zap, color: '#f59e0b' },
  private: { label: 'Privat (Catering)', icon: Lock, color: '#8b5cf6' },
  market: { label: 'Markt', icon: Package, color: '#3b82f6' },
  office: { label: 'Bürogebiet', icon: Globe, color: '#6366f1' }
};

const QUICK_LOCATIONS = [
  { id: 'bahnhofplatz-zh', name: 'Bahnhofplatz Zürich', canton: 'ZH', type: 'public' },
  { id: 'bundesplatz-be', name: 'Bundesplatz Bern', canton: 'BE', type: 'public' },
  { id: 'barfuesserplatz-bs', name: 'Barfüsserplatz Basel', canton: 'BS', type: 'public' },
  { id: 'place-neuve-ge', name: 'Place Neuve Genève', canton: 'GE', type: 'public' },
  { id: 'piazza-grande-ti', name: 'Piazza Grande Lugano', canton: 'TI', type: 'public' }
];

const WEATHER_CONDITIONS = {
  sunny: { label: 'Sonnig', icon: Sun, impact: 1.2 },
  cloudy: { label: 'Bewölkt', icon: Cloud, impact: 1.0 },
  rainy: { label: 'Regen', icon: CloudRain, impact: 0.7 },
  windy: { label: 'Windig', icon: Wind, impact: 0.8 }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const CalendarManager = () => {
  // State Management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month | week | day
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastSync, setLastSync] = useState(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [slotFilter, setSlotFilter] = useState('all');
  
  // Current View Range
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  
  // ========================================================================
  // FIREBASE SUBSCRIPTIONS
  // ========================================================================
  useEffect(() => {
    // Load tenants
    const tenantsRef = ref(database, 'tenants');
    const unsubscribeTenants = onValue(tenantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const tenantList = Object.entries(data).map(([id, tenant]) => ({
          id,
          ...tenant.info,
          stats: tenant.stats || {}
        }));
        setTenants(tenantList.filter(t => t.status === 'active'));
      }
    });

    // Load schedules
    const schedulesRef = ref(database, 'schedules');
    const unsubscribeSchedules = onValue(schedulesRef, (snapshot) => {
      if (snapshot.exists()) {
        setSchedules(snapshot.val());
      } else {
        setSchedules({});
      }
      setLastSync(new Date());
      setLoading(false);
    }, (error) => {
      console.error('Error loading schedules:', error);
      setError('Fehler beim Laden der Kalender-Daten');
      setLoading(false);
    });

    // Cleanup
    return () => {
      off(tenantsRef);
      off(schedulesRef);
    };
  }, []);

  // ========================================================================
  // CALENDAR HELPERS
  // ========================================================================
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        isPast: true
      });
    }
    
    // Current month days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      date.setHours(0, 0, 0, 0);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today,
        isFuture: date > today
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        isFuture: true
      });
    }
    
    return days;
  };

  const getSchedulesForDate = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    const daySchedules = [];
    
    Object.entries(schedules).forEach(([tenantId, tenantSchedules]) => {
      if (tenantSchedules[dateKey]) {
        const tenant = tenants.find(t => t.id === tenantId);
        if (tenant) {
          Object.entries(tenantSchedules[dateKey]).forEach(([scheduleId, schedule]) => {
            daySchedules.push({
              id: scheduleId,
              tenantId,
              tenantName: tenant.name,
              tenantType: tenant.type,
              ...schedule
            });
          });
        }
      }
    });
    
    return daySchedules.sort((a, b) => {
      const slotOrder = ['morning', 'lunch', 'afternoon', 'evening'];
      return slotOrder.indexOf(a.timeSlot) - slotOrder.indexOf(b.timeSlot);
    });
  };

  const getWeekDays = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    
    return week;
  };

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================
  const calendarDays = useMemo(() => {
    return getDaysInMonth(selectedDate);
  }, [selectedDate]);

  const monthScheduleStats = useMemo(() => {
    const stats = {
      totalSchedules: 0,
      uniqueLocations: new Set(),
      topTenant: null,
      busyDays: [],
      revenue: 0
    };

    calendarDays.forEach(day => {
      if (day.isCurrentMonth && !day.isPast) {
        const daySchedules = getSchedulesForDate(day.date);
        stats.totalSchedules += daySchedules.length;
        
        daySchedules.forEach(schedule => {
          stats.uniqueLocations.add(schedule.location?.name || 'Unknown');
          stats.revenue += schedule.estimatedRevenue || 0;
        });
        
        if (daySchedules.length >= 4) {
          stats.busyDays.push(day.date);
        }
      }
    });

    // Find top tenant
    const tenantCounts = {};
    Object.entries(schedules).forEach(([tenantId, tenantSchedules]) => {
      Object.keys(tenantSchedules).forEach(dateKey => {
        const date = new Date(dateKey);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          tenantCounts[tenantId] = (tenantCounts[tenantId] || 0) + 1;
        }
      });
    });

    const topTenantId = Object.entries(tenantCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    stats.topTenant = tenants.find(t => t.id === topTenantId);

    return stats;
  }, [calendarDays, schedules, tenants, currentMonth, currentYear]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  const handleAddSchedule = useCallback((date, tenant = null) => {
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      alert('Sie können keine Termine in der Vergangenheit planen');
      return;
    }
    
    // Check if more than 30 days in future
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    
    if (date > maxDate) {
      alert('Sie können maximal 30 Tage im Voraus planen');
      return;
    }

    setEditingSchedule({
      date: date.toISOString().split('T')[0],
      tenantId: tenant?.id || '',
      timeSlot: 'lunch',
      location: {
        name: '',
        address: '',
        canton: '',
        coordinates: null,
        type: 'public'
      },
      isPublic: true,
      allowPreOrders: true,
      maxPreOrders: 50,
      estimatedRevenue: 0,
      notes: '',
      weather: 'sunny',
      notifyFavorites: true,
      specialOffer: ''
    });
    
    setShowAddModal(true);
  }, []);

  const handleSaveSchedule = useCallback(async () => {
    if (!editingSchedule.tenantId || !editingSchedule.location.name) {
      alert('Bitte wählen Sie einen Foodtruck und einen Standort');
      return;
    }

    setSaving(true);
    
    try {
      const dateKey = editingSchedule.date;
      const tenantId = editingSchedule.tenantId;
      
      // Generate schedule ID
      const scheduleId = editingSchedule.id || `schedule_${Date.now()}`;
      
      // Prepare schedule data
      const scheduleData = {
        ...editingSchedule,
        id: scheduleId,
        createdAt: editingSchedule.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'master@eatech.ch'
      };
      
      // Save to database
      const schedulePath = `schedules/${tenantId}/${dateKey}/${scheduleId}`;
      await set(ref(database, schedulePath), scheduleData);
      
      // Send notifications to favorites if enabled
      if (scheduleData.notifyFavorites && !editingSchedule.id) {
        await sendFavoriteNotifications(tenantId, scheduleData);
      }
      
      // Log the action
      const logRef = push(ref(database, 'logs/scheduleChanges'));
      await set(ref(database, `logs/scheduleChanges/${logRef.key}`), {
        action: editingSchedule.id ? 'updated' : 'created',
        scheduleId,
        tenantId,
        date: dateKey,
        timestamp: serverTimestamp(),
        user: 'master@eatech.ch'
      });
      
      setShowAddModal(false);
      setEditingSchedule(null);
      
      alert('Termin erfolgreich gespeichert');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Fehler beim Speichern des Termins');
    } finally {
      setSaving(false);
    }
  }, [editingSchedule]);

  const handleDeleteSchedule = useCallback(async (schedule) => {
    if (!confirm(`Möchten Sie den Termin für ${schedule.tenantName} am ${new Date(schedule.date).toLocaleDateString()} wirklich löschen?`)) {
      return;
    }

    try {
      const schedulePath = `schedules/${schedule.tenantId}/${schedule.date}/${schedule.id}`;
      await remove(ref(database, schedulePath));
      
      // Log deletion
      const logRef = push(ref(database, 'logs/scheduleChanges'));
      await set(ref(database, `logs/scheduleChanges/${logRef.key}`), {
        action: 'deleted',
        scheduleId: schedule.id,
        tenantId: schedule.tenantId,
        date: schedule.date,
        timestamp: serverTimestamp(),
        user: 'master@eatech.ch'
      });
      
      alert('Termin erfolgreich gelöscht');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Fehler beim Löschen des Termins');
    }
  }, []);

  const handleCopySchedule = useCallback((schedule) => {
    setEditingSchedule({
      ...schedule,
      id: null,
      date: selectedDate.toISOString().split('T')[0],
      createdAt: null
    });
    setShowAddModal(true);
  }, [selectedDate]);

  const sendFavoriteNotifications = async (tenantId, schedule) => {
    // This would integrate with your notification service
    const notificationData = {
      tenantId,
      type: 'new_location',
      title: `${tenants.find(t => t.id === tenantId)?.name} kommt zu ${schedule.location.name}!`,
      body: `Am ${new Date(schedule.date).toLocaleDateString()} - ${TIME_SLOTS.find(s => s.id === schedule.timeSlot)?.time}`,
      data: {
        scheduleId: schedule.id,
        date: schedule.date,
        location: schedule.location
      },
      timestamp: serverTimestamp()
    };
    
    // Push to notifications queue
    await push(ref(database, 'notificationQueue'), notificationData);
  };

  const handleExportCalendar = useCallback(() => {
    const exportData = {
      exportDate: new Date().toISOString(),
      month: MONTHS[currentMonth],
      year: currentYear,
      schedules: [],
      stats: monthScheduleStats
    };

    // Collect all schedules for the month
    calendarDays.forEach(day => {
      if (day.isCurrentMonth) {
        const daySchedules = getSchedulesForDate(day.date);
        if (daySchedules.length > 0) {
          exportData.schedules.push({
            date: day.date.toISOString().split('T')[0],
            schedules: daySchedules
          });
        }
      }
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foodtruck-calendar-${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentMonth, currentYear, calendarDays, monthScheduleStats]);

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  const renderDayCell = (dayInfo) => {
    const { date, isCurrentMonth, isToday, isPast, isFuture } = dayInfo;
    const daySchedules = getSchedulesForDate(date);
    const dateKey = date.toISOString().split('T')[0];
    
    // Check if we can add more schedules (max 30 days ahead)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const canAddSchedule = !isPast && date <= maxDate;
    
    return (
      <div
        key={dateKey}
        className={`${styles.dayCell} ${!isCurrentMonth ? styles.otherMonth : ''} ${isToday ? styles.today : ''} ${isPast ? styles.past : ''}`}
      >
        <div className={styles.dayHeader}>
          <span className={styles.dayNumber}>{date.getDate()}</span>
          {canAddSchedule && (
            <button
              className={styles.addButton}
              onClick={() => handleAddSchedule(date)}
              title="Termin hinzufügen"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        
        <div className={styles.daySchedules}>
          {daySchedules.slice(0, 3).map(schedule => {
            const timeSlot = TIME_SLOTS.find(s => s.id === schedule.timeSlot);
            const locationType = LOCATION_TYPES[schedule.location?.type || 'public'];
            
            return (
              <div
                key={schedule.id}
                className={styles.scheduleItem}
                onClick={() => {
                  setSelectedSchedule(schedule);
                  setEditingSchedule(schedule);
                  setShowAddModal(true);
                }}
                style={{ borderLeftColor: locationType.color }}
              >
                <div className={styles.scheduleTime}>
                  <timeSlot.icon size={12} />
                  {timeSlot.label}
                </div>
                <div className={styles.scheduleTenant}>{schedule.tenantName}</div>
                <div className={styles.scheduleLocation}>
                  <MapPin size={10} />
                  {schedule.location?.name}
                </div>
                {schedule.allowPreOrders && (
                  <div className={styles.preOrderIndicator}>
                    <Timer size={10} />
                  </div>
                )}
              </div>
            );
          })}
          
          {daySchedules.length > 3 && (
            <div className={styles.moreSchedules}>
              +{daySchedules.length - 3} weitere
            </div>
          )}
        </div>
      </div>
    );
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Lade Kalender...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} />
        <h2>Fehler</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          <RefreshCw size={20} />
          Neu laden
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1>Standort-Kalender</h1>
            <p>Planen Sie Foodtruck-Standorte bis zu 30 Tage im Voraus</p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.connectionStatus}>
              <CheckCircle size={16} />
              Verbunden
              {lastSync && (
                <span className={styles.lastSync}>
                  Sync: {lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
            <button className={styles.exportButton} onClick={handleExportCalendar}>
              <Download size={20} />
              Export
            </button>
            <button className={styles.refreshButton} onClick={() => window.location.reload()}>
              <RefreshCw size={20} />
              Aktualisieren
            </button>
          </div>
        </div>
      </div>

      {/* Month Stats */}
      <div className={styles.monthStats}>
        <div className={styles.statCard}>
          <Calendar size={24} />
          <div>
            <h3>{monthScheduleStats.totalSchedules}</h3>
            <p>Geplante Termine</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <MapPin size={24} />
          <div>
            <h3>{monthScheduleStats.uniqueLocations.size}</h3>
            <p>Verschiedene Orte</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <Truck size={24} />
          <div>
            <h3>{monthScheduleStats.topTenant?.name || '-'}</h3>
            <p>Aktivster Foodtruck</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <DollarSign size={24} />
          <div>
            <h3>CHF {monthScheduleStats.revenue.toLocaleString()}</h3>
            <p>Erwarteter Umsatz</p>
          </div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className={styles.calendarControls}>
        <div className={styles.navigationControls}>
          <button onClick={() => navigateMonth(-1)}>
            <ChevronLeft size={20} />
          </button>
          <h2>{MONTHS[currentMonth]} {currentYear}</h2>
          <button onClick={() => navigateMonth(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className={styles.viewControls}>
          <button
            className={viewMode === 'month' ? styles.active : ''}
            onClick={() => setViewMode('month')}
          >
            Monat
          </button>
          <button
            className={viewMode === 'week' ? styles.active : ''}
            onClick={() => setViewMode('week')}
          >
            Woche
          </button>
          <button
            className={viewMode === 'day' ? styles.active : ''}
            onClick={() => setViewMode('day')}
          >
            Tag
          </button>
        </div>
        
        <div className={styles.filterControls}>
          <button
            className={styles.filterButton}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} />
            Filter
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Foodtruck</label>
            <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
              <option value="all">Alle Foodtrucks</option>
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Standort-Typ</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Alle Typen</option>
              {Object.entries(LOCATION_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Tageszeit</label>
            <select value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}>
              <option value="all">Alle Zeiten</option>
              {TIME_SLOTS.map(slot => (
                <option key={slot.id} value={slot.id}>{slot.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Calendar Views */}
      <div className={styles.calendarContainer}>
        {viewMode === 'month' && (
          <>
            {/* Weekday Headers */}
            <div className={styles.weekdayHeaders}>
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className={styles.weekdayHeader}>
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className={styles.calendarGrid}>
              {calendarDays.map(dayInfo => renderDayCell(dayInfo))}
            </div>
          </>
        )}
        
        {viewMode === 'week' && (
          <div className={styles.weekView}>
            <div className={styles.timeColumn}>
              {TIME_SLOTS.map(slot => (
                <div key={slot.id} className={styles.timeSlot}>
                  <slot.icon size={16} />
                  <span>{slot.time}</span>
                </div>
              ))}
            </div>
            
            <div className={styles.weekGrid}>
              {getWeekDays(selectedDate).map(day => {
                const daySchedules = getSchedulesForDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div key={day.toISOString()} className={`${styles.weekDay} ${isToday ? styles.today : ''}`}>
                    <div className={styles.weekDayHeader}>
                      <span className={styles.weekDayName}>{DAYS_OF_WEEK[day.getDay()]}</span>
                      <span className={styles.weekDayDate}>{day.getDate()}</span>
                    </div>
                    
                    {TIME_SLOTS.map(slot => {
                      const slotSchedules = daySchedules.filter(s => s.timeSlot === slot.id);
                      
                      return (
                        <div key={slot.id} className={styles.weekSlot}>
                          {slotSchedules.map(schedule => (
                            <div
                              key={schedule.id}
                              className={styles.weekScheduleItem}
                              onClick={() => {
                                setSelectedSchedule(schedule);
                                setEditingSchedule(schedule);
                                setShowAddModal(true);
                              }}
                              style={{ backgroundColor: LOCATION_TYPES[schedule.location?.type]?.color + '20' }}
                            >
                              <strong>{schedule.tenantName}</strong>
                              <span>{schedule.location?.name}</span>
                            </div>
                          ))}
                          
                          {slotSchedules.length === 0 && (
                            <button
                              className={styles.addSlotButton}
                              onClick={() => {
                                const newSchedule = {
                                  date: day.toISOString().split('T')[0],
                                  timeSlot: slot.id
                                };
                                setEditingSchedule(newSchedule);
                                setShowAddModal(true);
                              }}
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {viewMode === 'day' && (
          <div className={styles.dayView}>
            <h3>{selectedDate.toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            
            <div className={styles.dayTimeline}>
              {TIME_SLOTS.map(slot => {
                const daySchedules = getSchedulesForDate(selectedDate).filter(s => s.timeSlot === slot.id);
                
                return (
                  <div key={slot.id} className={styles.dayTimeSlot}>
                    <div className={styles.slotHeader}>
                      <slot.icon size={20} />
                      <h4>{slot.label}</h4>
                      <span>{slot.time}</span>
                    </div>
                    
                    <div className={styles.slotSchedules}>
                      {daySchedules.map(schedule => (
                        <div
                          key={schedule.id}
                          className={styles.dayScheduleCard}
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setEditingSchedule(schedule);
                            setShowAddModal(true);
                          }}
                        >
                          <div className={styles.scheduleCardHeader}>
                            <h5>{schedule.tenantName}</h5>
                            <div className={styles.scheduleActions}>
                              <button onClick={(e) => {
                                e.stopPropagation();
                                handleCopySchedule(schedule);
                              }}>
                                <Copy size={16} />
                              </button>
                              <button onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSchedule(schedule);
                              }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div className={styles.scheduleDetails}>
                            <p>
                              <MapPin size={14} />
                              {schedule.location?.name}
                            </p>
                            <p>
                              <Users size={14} />
                              Max. {schedule.maxPreOrders} Vorbestellungen
                            </p>
                            {schedule.specialOffer && (
                              <p className={styles.specialOffer}>
                                <Zap size={14} />
                                {schedule.specialOffer}
                              </p>
                            )}
                          </div>
                          
                          <div className={styles.scheduleFooter}>
                            {schedule.allowPreOrders && (
                              <span className={styles.badge}>
                                <Timer size={12} />
                                Vorbestellungen
                              </span>
                            )}
                            {schedule.notifyFavorites && (
                              <span className={styles.badge}>
                                <Bell size={12} />
                                Benachrichtigt
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {daySchedules.length === 0 && (
                        <button
                          className={styles.addDaySchedule}
                          onClick={() => {
                            const newSchedule = {
                              date: selectedDate.toISOString().split('T')[0],
                              timeSlot: slot.id
                            };
                            setEditingSchedule(newSchedule);
                            setShowAddModal(true);
                          }}
                        >
                          <Plus size={20} />
                          Termin hinzufügen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && editingSchedule && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingSchedule.id ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
              <button onClick={() => {
                setShowAddModal(false);
                setEditingSchedule(null);
              }}>
                <X size={24} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                {/* Date & Time */}
                <div className={styles.formSection}>
                  <h3>Datum & Zeit</h3>
                  
                  <div className={styles.formGroup}>
                    <label>Datum</label>
                    <input
                      type="date"
                      value={editingSchedule.date}
                      onChange={(e) => setEditingSchedule({
                        ...editingSchedule,
                        date: e.target.value
                      })}
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Tageszeit</label>
                    <div className={styles.timeSlotGrid}>
                      {TIME_SLOTS.map(slot => (
                        <button
                          key={slot.id}
                          className={`${styles.timeSlotButton} ${editingSchedule.timeSlot === slot.id ? styles.active : ''}`}
                          onClick={() => setEditingSchedule({
                            ...editingSchedule,
                            timeSlot: slot.id
                          })}
                        >
                          <slot.icon size={20} />
                          <span>{slot.label}</span>
                          <small>{slot.time}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Foodtruck */}
                <div className={styles.formSection}>
                  <h3>Foodtruck</h3>
                  
                  <div className={styles.formGroup}>
                    <label>Foodtruck auswählen</label>
                    <select
                      value={editingSchedule.tenantId}
                      onChange={(e) => setEditingSchedule({
                        ...editingSchedule,
                        tenantId: e.target.value
                      })}
                    >
                      <option value="">Bitte wählen...</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name} ({tenant.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Location */}
                <div className={styles.formSection}>
                  <h3>Standort</h3>
                  
                  <div className={styles.formGroup}>
                    <label>Schnellauswahl</label>
                    <div className={styles.quickLocations}>
                      {QUICK_LOCATIONS.map(loc => (
                        <button
                          key={loc.id}
                          className={styles.quickLocationBtn}
                          onClick={() => setEditingSchedule({
                            ...editingSchedule,
                            location: {
                              ...editingSchedule.location,
                              name: loc.name,
                              canton: loc.canton,
                              type: loc.type
                            }
                          })}
                        >
                          {loc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Standort-Name *</label>
                    <input
                      type="text"
                      value={editingSchedule.location?.name || ''}
                      onChange={(e) => setEditingSchedule({
                        ...editingSchedule,
                        location: {
                          ...editingSchedule.location,
                          name: e.target.value
                        }
                      })}
                      placeholder="z.B. Bahnhofplatz Zürich"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Adresse</label>
                    <input
                      type="text"
                      value={editingSchedule.location?.address || ''}
                      onChange={(e) => setEditingSchedule({
                        ...editingSchedule,
                        location: {
                          ...editingSchedule.location,
                          address: e.target.value
                        }
                      })}
                      placeholder="Strasse und Hausnummer"
                    />
                  </div>
                  
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Kanton</label>
                      <select
                        value={editingSchedule.location?.canton || ''}
                        onChange={(e) => setEditingSchedule({
                          ...editingSchedule,
                          location: {
                            ...editingSchedule.location,
                            canton: e.target.value
                          }
                        })}
                      >
                        <option value="">Wählen...</option>
                        <option value="ZH">Zürich</option>
                        <option value="BE">Bern</option>
                        <option value="LU">Luzern</option>
                        <option value="UR">Uri</option>
                        <option value="SZ">Schwyz</option>
                        <option value="OW">Obwalden</option>
                        <option value="NW">Nidwalden</option>
                        <option value="GL">Glarus</option>
                        <option value="ZG">Zug</option>
                        <option value="FR">Freiburg</option>
                        <option value="SO">Solothurn</option>
                        <option value="BS">Basel-Stadt</option>
                        <option value="BL">Basel-Landschaft</option>
                        <option value="SH">Schaffhausen</option>
                        <option value="AR">Appenzell Ausserrhoden</option>
                        <option value="AI">Appenzell Innerrhoden</option>
                        <option value="SG">St. Gallen</option>
                        <option value="GR">Graubünden</option>
                        <option value="AG">Aargau</option>
                        <option value="TG">Thurgau</option>
                        <option value="TI">Tessin</option>
                        <option value="VD">Waadt</option>
                        <option value="VS">Wallis</option>
                        <option value="NE">Neuenburg</option>
                        <option value="GE">Genf</option>
                        <option value="JU">Jura</option>
                      </select>
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Standort-Typ</label>
                      <select
                        value={editingSchedule.location?.type || 'public'}
                        onChange={(e) => setEditingSchedule({
                          ...editingSchedule,
                          location: {
                            ...editingSchedule.location,
                            type: e.target.value
                          }
                        })}
                      >
                        {Object.entries(LOCATION_TYPES).map(([key, type]) => (
                          <option key={key} value={key}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Settings */}
                <div className={styles.formSection}>
                  <h3>Einstellungen</h3>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editingSchedule.isPublic}
                        onChange={(e) => setEditingSchedule({
                          ...editingSchedule,
                          isPublic: e.target.checked
                        })}
                      />
                      <Eye size={16} />
                      Öffentlich sichtbar
                    </label>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editingSchedule.allowPreOrders}
                        onChange={(e) => setEditingSchedule({
                          ...editingSchedule,
                          allowPreOrders: e.target.checked
                        })}
                      />
                      <Timer size={16} />
                      Vorbestellungen erlauben
                    </label>
                  </div>
                  
                  {editingSchedule.allowPreOrders && (
                    <div className={styles.formGroup}>
                      <label>Max. Vorbestellungen</label>
                      <input
                        type="number"
                        value={editingSchedule.maxPreOrders}
                        onChange={(e) => setEditingSchedule({
                          ...editingSchedule,
                          maxPreOrders: parseInt(e.target.value) || 0
                        })}
                        min="1"
                        max="500"
                      />
                    </div>
                  )}
                  
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editingSchedule.notifyFavorites}
                        onChange={(e) => setEditingSchedule({
                          ...editingSchedule,
                          notifyFavorites: e.target.checked
                        })}
                      />
                      <Bell size={16} />
                      Favoriten benachrichtigen
                    </label>
                  </div>
                </div>
                
                {/* Additional Info */}
                <div className={styles.formSection}>
                  <h3>Zusätzliche Informationen</h3>
                  
                  <div className={styles.formGroup}>
                    <label>Erwartetes Wetter</label>
                    <div className={styles.weatherGrid}>
                      {Object.entries(WEATHER_CONDITIONS).map(([key, weather]) => (
                        <button
                          key={key}
                          className={`${styles.weatherButton} ${editingSchedule.weather === key ? styles.active : ''}`}
                          onClick={() => setEditingSchedule({
                            ...editingSchedule,
                            weather: key
                          })}
                        >
                          <weather.icon size={20} />
                          <span>{weather.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Erwarteter Umsatz (CHF)</label>
                    <input
                      type="number"
                      value={editingSchedule.estimatedRevenue || ''}
                      onChange={(e) => setEditingSchedule({
                        ...editingSchedule,
                        estimatedRevenue: parseInt(e.target.value) || 0
                      })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Spezialangebot</label>
                    <input
                      type="text"
                      value={editingSchedule.specialOffer || ''}
                      onChange={(e) => setEditingSchedule({
                        ...editingSchedule,
                        specialOffer: e.target.value
                      })}
                      placeholder="z.B. Tages-Special: 2 für 1"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Notizen</label>
                    <textarea
                      value={editingSchedule.notes || ''}
                      onChange={(e) => setEditingSchedule({
                        ...editingSchedule,
                        notes: e.target.value
                      })}
                      rows={3}
                      placeholder="Zusätzliche Informationen..."
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSchedule(null);
                }}
              >
                Abbrechen
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSaveSchedule}
                disabled={saving || !editingSchedule.tenantId || !editingSchedule.location?.name}
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className={styles.spinning} />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Speichern
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarManager;