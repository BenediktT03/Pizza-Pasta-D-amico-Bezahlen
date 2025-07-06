/**
 * EATECH - Recent Events Component
 * Version: 1.0.0
 * Description: Echtzeit-Anzeige von System-Events und Aktivitäten
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/components/Dashboard/RecentEvents.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Users,
  ShoppingBag,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Info,
  Settings,
  UserPlus,
  UserMinus,
  Truck,
  MapPin,
  Clock,
  Star,
  MessageSquare,
  Bell,
  Shield,
  Zap,
  RefreshCw,
  Filter,
  Search,
  X,
  ChevronRight,
  ExternalLink,
  Eye
} from 'lucide-react';
import styles from './RecentEvents.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const EVENT_TYPES = {
  order_placed: {
    label: 'Bestellung',
    icon: ShoppingBag,
    color: '#10b981',
    priority: 'normal'
  },
  user_registered: {
    label: 'Neue Registrierung',
    icon: UserPlus,
    color: '#3b82f6',
    priority: 'normal'
  },
  foodtruck_online: {
    label: 'Foodtruck Online',
    icon: Truck,
    color: '#8b5cf6',
    priority: 'high'
  },
  foodtruck_offline: {
    label: 'Foodtruck Offline',
    icon: Truck,
    color: '#6b7280',
    priority: 'normal'
  },
  payment_success: {
    label: 'Zahlung',
    icon: DollarSign,
    color: '#10b981',
    priority: 'normal'
  },
  payment_failed: {
    label: 'Zahlung fehlgeschlagen',
    icon: DollarSign,
    color: '#ef4444',
    priority: 'high'
  },
  review_posted: {
    label: 'Neue Bewertung',
    icon: Star,
    color: '#f59e0b',
    priority: 'normal'
  },
  system_alert: {
    label: 'System Alert',
    icon: AlertCircle,
    color: '#ef4444',
    priority: 'critical'
  },
  system_update: {
    label: 'System Update',
    icon: Settings,
    color: '#8b5cf6',
    priority: 'low'
  },
  support_ticket: {
    label: 'Support Anfrage',
    icon: MessageSquare,
    color: '#f59e0b',
    priority: 'high'
  }
};

const FILTER_OPTIONS = {
  all: 'Alle Events',
  orders: 'Bestellungen',
  users: 'Benutzer',
  foodtrucks: 'Foodtrucks',
  system: 'System',
  critical: 'Kritisch'
};

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================
const generateMockEvent = () => {
  const types = Object.keys(EVENT_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  
  const mockData = {
    order_placed: () => ({
      customer: `Kunde #${Math.floor(Math.random() * 1000)}`,
      foodtruck: ['Bella Italia', 'Thai Street Kitchen', 'Burger Brothers'][Math.floor(Math.random() * 3)],
      amount: (Math.random() * 50 + 20).toFixed(2),
      items: Math.floor(Math.random() * 5) + 1
    }),
    user_registered: () => ({
      name: ['Max Müller', 'Anna Schmidt', 'Peter Weber'][Math.floor(Math.random() * 3)],
      location: ['Zürich', 'Bern', 'Basel'][Math.floor(Math.random() * 3)]
    }),
    foodtruck_online: () => ({
      name: ['Sushi Master', 'Taco Fiesta', 'Curry Express'][Math.floor(Math.random() * 3)],
      location: ['Hauptbahnhof', 'Marktplatz', 'Seepromenade'][Math.floor(Math.random() * 3)]
    }),
    foodtruck_offline: () => ({
      name: ['Pizza Express', 'Burger King', 'Asia Wok'][Math.floor(Math.random() * 3)],
      duration: `${Math.floor(Math.random() * 120) + 30} Minuten`
    }),
    payment_success: () => ({
      amount: (Math.random() * 100 + 20).toFixed(2),
      method: ['Kreditkarte', 'Twint', 'PayPal'][Math.floor(Math.random() * 3)]
    }),
    payment_failed: () => ({
      amount: (Math.random() * 100 + 20).toFixed(2),
      reason: ['Unzureichende Deckung', 'Technischer Fehler', 'Abgelaufen'][Math.floor(Math.random() * 3)]
    }),
    review_posted: () => ({
      rating: Math.floor(Math.random() * 2) + 4,
      foodtruck: ['Bella Italia', 'Thai Street Kitchen', 'Burger Brothers'][Math.floor(Math.random() * 3)],
      customer: `Kunde #${Math.floor(Math.random() * 1000)}`
    }),
    system_alert: () => ({
      severity: ['high', 'critical'][Math.floor(Math.random() * 2)],
      message: ['CPU Auslastung > 90%', 'Speicher fast voll', 'API Timeout'][Math.floor(Math.random() * 3)]
    }),
    system_update: () => ({
      component: ['API Gateway', 'Database', 'Frontend'][Math.floor(Math.random() * 3)],
      version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
    }),
    support_ticket: () => ({
      id: `#${Math.floor(Math.random() * 10000)}`,
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      subject: ['Login Problem', 'Zahlungsfehler', 'Feature Request'][Math.floor(Math.random() * 3)]
    })
  };
  
  return {
    id: Date.now() + Math.random(),
    type,
    timestamp: new Date(Date.now() - Math.random() * 3600000), // Last hour
    data: mockData[type]()
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Gerade eben';
  if (seconds < 3600) return `vor ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `vor ${Math.floor(seconds / 3600)}h`;
  return `vor ${Math.floor(seconds / 86400)}d`;
};

const getEventMessage = (event) => {
  const { type, data } = event;
  
  const messages = {
    order_placed: () => `${data.customer} hat ${data.items} Artikel bei ${data.foodtruck} für CHF ${data.amount} bestellt`,
    user_registered: () => `${data.name} aus ${data.location} hat sich registriert`,
    foodtruck_online: () => `${data.name} ist jetzt online am ${data.location}`,
    foodtruck_offline: () => `${data.name} ist offline gegangen (${data.duration})`,
    payment_success: () => `Zahlung über CHF ${data.amount} via ${data.method} erfolgreich`,
    payment_failed: () => `Zahlung über CHF ${data.amount} fehlgeschlagen: ${data.reason}`,
    review_posted: () => `${data.customer} bewertete ${data.foodtruck} mit ${data.rating} Sternen`,
    system_alert: () => `${data.severity.toUpperCase()}: ${data.message}`,
    system_update: () => `${data.component} wurde auf ${data.version} aktualisiert`,
    support_ticket: () => `Support-Ticket ${data.id} erstellt: ${data.subject}`
  };
  
  return messages[type] ? messages[type]() : 'Unbekanntes Event';
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const EventItem = ({ event, onView }) => {
  const config = EVENT_TYPES[event.type];
  const Icon = config.icon;
  
  return (
    <div 
      className={`${styles.eventItem} ${styles[config.priority]}`}
      onClick={() => onView(event)}
    >
      <div 
        className={styles.eventIcon}
        style={{ backgroundColor: `${config.color}20`, color: config.color }}
      >
        <Icon size={16} />
      </div>
      
      <div className={styles.eventContent}>
        <div className={styles.eventHeader}>
          <span className={styles.eventType}>{config.label}</span>
          <span className={styles.eventTime}>
            <Clock size={12} />
            {formatTimeAgo(event.timestamp)}
          </span>
        </div>
        <p className={styles.eventMessage}>{getEventMessage(event)}</p>
      </div>
      
      <button className={styles.viewButton}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const RecentEvents = ({ 
  maxEvents = 50,
  refreshInterval = 10000,
  onEventClick,
  showFilters = true 
}) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const eventListRef = useRef(null);
  
  // Initialize with mock events
  useEffect(() => {
    const initialEvents = Array.from({ length: 10 }, generateMockEvent)
      .sort((a, b) => b.timestamp - a.timestamp);
    setEvents(initialEvents);
  }, []);
  
  // Simulate live events
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      const newEvent = generateMockEvent();
      setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
    }, Math.random() * 5000 + 2000); // Random interval 2-7 seconds
    
    return () => clearInterval(interval);
  }, [isLive, maxEvents]);
  
  // Filter events
  useEffect(() => {
    let filtered = [...events];
    
    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(event => {
        switch (filter) {
          case 'orders':
            return ['order_placed', 'payment_success', 'payment_failed'].includes(event.type);
          case 'users':
            return ['user_registered'].includes(event.type);
          case 'foodtrucks':
            return ['foodtruck_online', 'foodtruck_offline'].includes(event.type);
          case 'system':
            return ['system_alert', 'system_update'].includes(event.type);
          case 'critical':
            return EVENT_TYPES[event.type].priority === 'critical' || EVENT_TYPES[event.type].priority === 'high';
          default:
            return true;
        }
      });
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(event => 
        getEventMessage(event).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredEvents(filtered);
  }, [events, filter, searchQuery]);
  
  const handleEventView = (event) => {
    setSelectedEvent(event);
    setShowDetails(true);
    if (onEventClick) {
      onEventClick(event);
    }
  };
  
  const criticalCount = events.filter(e => 
    EVENT_TYPES[e.type].priority === 'critical' || EVENT_TYPES[e.type].priority === 'high'
  ).length;
  
  return (
    <div className={styles.recentEvents}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3>
            <Activity size={18} />
            Recent Events
          </h3>
          {criticalCount > 0 && (
            <span className={styles.criticalBadge}>
              {criticalCount} Kritisch
            </span>
          )}
        </div>
        
        <div className={styles.headerActions}>
          <button
            className={`${styles.liveToggle} ${isLive ? styles.active : ''}`}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? (
              <>
                <span className={styles.liveDot} />
                Live
              </>
            ) : (
              'Pausiert'
            )}
          </button>
          
          <button className={styles.iconButton}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className={styles.filters}>
          <div className={styles.searchBar}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Events durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className={styles.filterButtons}>
            {Object.entries(FILTER_OPTIONS).map(([key, label]) => (
              <button
                key={key}
                className={filter === key ? styles.active : ''}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Events List */}
      <div className={styles.eventsList} ref={eventListRef}>
        {filteredEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <Activity size={32} />
            <p>Keine Events gefunden</p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventItem
              key={event.id}
              event={event}
              onView={handleEventView}
            />
          ))
        )}
      </div>
      
      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{events.length}</span>
          <span className={styles.statLabel}>Total Events</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {events.filter(e => new Date() - e.timestamp < 300000).length}
          </span>
          <span className={styles.statLabel}>Letzte 5 Min</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {Math.floor(events.length / ((new Date() - Math.min(...events.map(e => e.timestamp))) / 3600000))}
          </span>
          <span className={styles.statLabel}>Events/Stunde</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default RecentEvents;