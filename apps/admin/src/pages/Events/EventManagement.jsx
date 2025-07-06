/**
 * EATECH - Event Management
 * Version: 3.0.0
 * Description: Event-Verwaltung für Foodtrucks mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/Events/EventManagement.jsx
 * 
 * Features: Event planning, location management, staffing
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, remove } from 'firebase/database';
import { 
  Calendar, MapPin, Users, Clock,
  Plus, Edit2, Trash2, Eye,
  Search, Filter, Download, Upload,
  AlertCircle, CheckCircle, Star,
  Navigation, Utensils, DollarSign
} from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import styles from './EventManagement.module.css';

// Lazy loaded components
const EventCalendar = lazy(() => import('./components/EventCalendar'));
const EventForm = lazy(() => import('./components/EventForm'));
const LocationMap = lazy(() => import('./components/LocationMap'));
const StaffAssignment = lazy(() => import('./components/StaffAssignment'));
const EventAnalytics = lazy(() => import('./components/EventAnalytics'));

// Lazy loaded services
const EventService = lazy(() => import('../../services/EventService'));
const LocationService = lazy(() => import('../../services/LocationService'));
const WeatherService = lazy(() => import('../../services/WeatherService'));

const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

const EVENT_TYPES = {
  private: { name: 'Privat', color: '#10B981', icon: Users },
  corporate: { name: 'Firma', color: '#3B82F6', icon: Utensils },
  festival: { name: 'Festival', color: '#F59E0B', icon: Star },
  market: { name: 'Markt', color: '#8B5CF6', icon: MapPin }
};

const EVENT_STATUS = {
  planning: { name: 'Planung', color: '#F59E0B' },
  confirmed: { name: 'Bestätigt', color: '#10B981' },
  cancelled: { name: 'Abgesagt', color: '#EF4444' },
  completed: { name: 'Abgeschlossen', color: '#6B7280' }
};

const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showStaffing, setShowStaffing] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 30), 'yyyy-MM-dd')
  });

  const tenantId = 'demo-restaurant';

  // ============================================================================
  // FIREBASE DATA LOADING
  // ============================================================================
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const eventsRef = ref(database, `tenants/${tenantId}/events`);
        onValue(eventsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const eventsArray = Object.entries(data).map(([id, event]) => ({
              id,
              ...event
            }));
            setEvents(eventsArray);
          } else {
            setEvents([]);
          }
        });

        const locationsRef = ref(database, `tenants/${tenantId}/locations`);
        onValue(locationsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const locationsArray = Object.entries(data).map(([id, location]) => ({
              id,
              ...location
            }));
            setLocations(locationsArray);
          } else {
            setLocations([]);
          }
        });

        const staffRef = ref(database, `tenants/${tenantId}/staff`);
        onValue(staffRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const staffArray = Object.entries(data).map(([id, member]) => ({
              id,
              ...member
            }));
            setStaff(staffArray);
          } else {
            setStaff([]);
          }
        });
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [tenantId]);

  // ============================================================================
  // FILTERED DATA
  // ============================================================================
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.location?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
      const matchesType = filterType === 'all' || event.type === filterType;
      const eventDate = parseISO(event.date);
      const startDate = parseISO(dateRange.start);
      const endDate = parseISO(dateRange.end);
      const matchesDate = eventDate >= startDate && eventDate <= endDate;

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [events, searchTerm, filterStatus, filterType, dateRange]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCreateEvent = useCallback(async (eventData) => {
    try {
      const eventsRef = ref(database, `tenants/${tenantId}/events`);
      await push(eventsRef, {
        ...eventData,
        createdAt: new Date().toISOString(),
        status: 'planning'
      });
      setShowEventForm(false);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  }, [tenantId]);

  const handleUpdateEvent = useCallback(async (eventId, eventData) => {
    try {
      const eventRef = ref(database, `tenants/${tenantId}/events/${eventId}`);
      await update(eventRef, {
        ...eventData,
        updatedAt: new Date().toISOString()
      });
      setSelectedEvent(null);
      setShowEventForm(false);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  }, [tenantId]);

  const handleDeleteEvent = useCallback(async (eventId) => {
    if (window.confirm('Event wirklich löschen?')) {
      try {
        const eventRef = ref(database, `tenants/${tenantId}/events/${eventId}`);
        await remove(eventRef);
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  }, [tenantId]);

  const handleExportEvents = useCallback(() => {
    const csvData = filteredEvents.map(event => ({
      Name: event.name,
      Typ: EVENT_TYPES[event.type]?.name || event.type,
      Datum: format(parseISO(event.date), 'dd.MM.yyyy', { locale: de }),
      Zeit: event.time,
      Ort: event.location?.name,
      Status: EVENT_STATUS[event.status]?.name || event.status,
      Personal: event.staff?.length || 0,
      'Erw. Umsatz': `${event.expectedRevenue || 0} CHF`
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEvents]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderEventCard = (event) => {
    const eventType = EVENT_TYPES[event.type] || { name: event.type, color: '#6B7280', icon: Calendar };
    const eventStatus = EVENT_STATUS[event.status] || { name: event.status, color: '#6B7280' };
    const IconComponent = eventType.icon;

    return (
      <div key={event.id} className={styles.eventCard}>
        <div className={styles.eventHeader}>
          <div className={styles.eventType} style={{ backgroundColor: eventType.color + '20' }}>
            <IconComponent size={20} color={eventType.color} />
            <span style={{ color: eventType.color }}>{eventType.name}</span>
          </div>
          <div className={styles.eventActions}>
            <button
              onClick={() => {
                setSelectedEvent(event);
                setShowEventForm(true);
              }}
              className={styles.actionButton}
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDeleteEvent(event.id)}
              className={styles.actionButton}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className={styles.eventContent}>
          <h3>{event.name}</h3>
          <div className={styles.eventDetails}>
            <div className={styles.eventDetail}>
              <Calendar size={16} />
              <span>{format(parseISO(event.date), 'dd.MM.yyyy', { locale: de })}</span>
            </div>
            <div className={styles.eventDetail}>
              <Clock size={16} />
              <span>{event.time}</span>
            </div>
            <div className={styles.eventDetail}>
              <MapPin size={16} />
              <span>{event.location?.name}</span>
            </div>
            <div className={styles.eventDetail}>
              <Users size={16} />
              <span>{event.staff?.length || 0} Personen</span>
            </div>
          </div>
        </div>

        <div className={styles.eventFooter}>
          <div 
            className={styles.eventStatus}
            style={{ backgroundColor: eventStatus.color + '20', color: eventStatus.color }}
          >
            {eventStatus.name}
          </div>
          <div className={styles.eventRevenue}>
            <DollarSign size={16} />
            <span>{event.expectedRevenue || 0} CHF</span>
          </div>
        </div>
      </div>
    );
  };

  const renderStatsCards = () => {
    const totalEvents = filteredEvents.length;
    const confirmedEvents = filteredEvents.filter(e => e.status === 'confirmed').length;
    const totalRevenue = filteredEvents.reduce((sum, e) => sum + (e.expectedRevenue || 0), 0);
    const avgRevenue = totalEvents > 0 ? totalRevenue / totalEvents : 0;

    return (
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Calendar size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{totalEvents}</h3>
            <p>Gesamt Events</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <CheckCircle size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{confirmedEvents}</h3>
            <p>Bestätigt</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{totalRevenue.toLocaleString()} CHF</h3>
            <p>Erw. Umsatz</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Utensils size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{avgRevenue.toLocaleString()} CHF</h3>
            <p>Ø pro Event</p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.eventManagement}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Event Management</h1>
          <p>Planen und verwalten Sie Events für Ihren Foodtruck</p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowAnalytics(true)}
            className={styles.secondaryButton}
          >
            <BarChart3 size={20} />
            Analytics
          </button>
          <button
            onClick={handleExportEvents}
            className={styles.secondaryButton}
          >
            <Download size={20} />
            Export
          </button>
          <button
            onClick={() => setShowEventForm(true)}
            className={styles.primaryButton}
          >
            <Plus size={20} />
            Neues Event
          </button>
        </div>
      </div>

      {/* Stats */}
      {renderStatsCards()}

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchAndFilter}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Events suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className={styles.filters}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Alle Status</option>
              {Object.entries(EVENT_STATUS).map(([key, status]) => (
                <option key={key} value={key}>{status.name}</option>
              ))}
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Alle Typen</option>
              {Object.entries(EVENT_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.dateRange}>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
          <span>bis</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>

        <div className={styles.viewToggle}>
          <button
            className={viewMode === 'list' ? styles.active : ''}
            onClick={() => setViewMode('list')}
          >
            Liste
          </button>
          <button
            className={viewMode === 'calendar' ? styles.active : ''}
            onClick={() => {
              setViewMode('calendar');
              setShowCalendar(true);
            }}
          >
            Kalender
          </button>
          <button
            className={viewMode === 'map' ? styles.active : ''}
            onClick={() => {
              setViewMode('map');
              setShowMap(true);
            }}
          >
            Karte
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {viewMode === 'list' && (
          <div className={styles.eventsList}>
            {filteredEvents.length > 0 ? (
              filteredEvents.map(renderEventCard)
            ) : (
              <div className={styles.emptyState}>
                <Calendar size={48} />
                <h3>Keine Events gefunden</h3>
                <p>Erstellen Sie Ihr erstes Event oder passen Sie die Filter an</p>
                <button
                  onClick={() => setShowEventForm(true)}
                  className={styles.primaryButton}
                >
                  <Plus size={20} />
                  Erstes Event erstellen
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lazy Loaded Modals */}
      {showEventForm && (
        <Suspense fallback={<LoadingSpinner />}>
          <EventForm
            event={selectedEvent}
            locations={locations}
            staff={staff}
            onSave={selectedEvent ? handleUpdateEvent : handleCreateEvent}
            onClose={() => {
              setShowEventForm(false);
              setSelectedEvent(null);
            }}
          />
        </Suspense>
      )}

      {showCalendar && (
        <Suspense fallback={<LoadingSpinner />}>
          <EventCalendar
            events={filteredEvents}
            onEventSelect={setSelectedEvent}
            onClose={() => setShowCalendar(false)}
          />
        </Suspense>
      )}

      {showMap && (
        <Suspense fallback={<LoadingSpinner />}>
          <LocationMap
            events={filteredEvents}
            locations={locations}
            onLocationSelect={(location) => console.log(location)}
            onClose={() => setShowMap(false)}
          />
        </Suspense>
      )}

      {showStaffing && (
        <Suspense fallback={<LoadingSpinner />}>
          <StaffAssignment
            event={selectedEvent}
            staff={staff}
            onSave={(assignments) => console.log(assignments)}
            onClose={() => setShowStaffing(false)}
          />
        </Suspense>
      )}

      {showAnalytics && (
        <Suspense fallback={<LoadingSpinner />}>
          <EventAnalytics
            events={events}
            onClose={() => setShowAnalytics(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default EventManagement;