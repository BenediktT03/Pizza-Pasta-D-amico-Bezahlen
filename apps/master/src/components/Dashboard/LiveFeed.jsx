/**
 * EATECH Live Feed Component
 * Version: 1.0.0
 * 
 * Echtzeit-Feed aller System-Events
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/components/Dashboard/LiveFeed.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity,
  Filter,
  Pause,
  Play,
  Bell,
  BellOff,
  MoreVertical,
  ShoppingCart,
  AlertTriangle,
  Users,
  DollarSign,
  Truck,
  CheckCircle,
  X
} from 'lucide-react';
import styles from './LiveFeed.module.css';

const LiveFeed = ({ events: initialEvents = [] }) => {
  const [events, setEvents] = useState(initialEvents);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const feedRef = useRef(null);
  const audioRef = useRef(null);

  // Event types configuration
  const eventTypes = {
    order: {
      color: 'success',
      sound: 'order',
      priority: 'normal'
    },
    alert: {
      color: 'warning',
      sound: 'alert',
      priority: 'high'
    },
    tenant: {
      color: 'info',
      sound: 'notification',
      priority: 'normal'
    },
    payment: {
      color: 'primary',
      sound: 'payment',
      priority: 'normal'
    },
    system: {
      color: 'error',
      sound: 'alert',
      priority: 'critical'
    }
  };

  // Filter options
  const filters = [
    { value: 'all', label: 'Alle Events' },
    { value: 'order', label: 'Bestellungen' },
    { value: 'alert', label: 'Warnungen' },
    { value: 'tenant', label: 'Tenants' },
    { value: 'payment', label: 'Zahlungen' },
    { value: 'system', label: 'System' }
  ];

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (!isPaused && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events, isPaused]);

  // Play sound for new events
  const playSound = (type) => {
    if (soundEnabled && audioRef.current) {
      // In real implementation, play different sounds based on type
      audioRef.current.play().catch(e => console.log('Sound play failed:', e));
    }
  };

  // Add new event (for demo purposes)
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        const newEvent = generateRandomEvent();
        setEvents(prev => [...prev, newEvent]);
        playSound(newEvent.type);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isPaused]);

  // Generate random event for demo
  const generateRandomEvent = () => {
    const types = ['order', 'alert', 'tenant', 'payment'];
    const messages = {
      order: [
        'Neue Bestellung bei Burger Express',
        'Großbestellung: CHF 125.50',
        'Express-Bestellung eingegangen'
      ],
      alert: [
        'Hohe Server-Auslastung',
        'Zahlungsfehler bei Bestellung #4521',
        'API Response Zeit erhöht'
      ],
      tenant: [
        'Pizza Mobile ist wieder online',
        'Neuer Tenant registriert',
        'Asian Fusion Truck pausiert'
      ],
      payment: [
        'Zahlung erfolgreich: CHF 45.80',
        'TWINT Zahlung verarbeitet',
        'Tagesabschluss: CHF 2,456.90'
      ]
    };

    const type = types[Math.floor(Math.random() * types.length)];
    const message = messages[type][Math.floor(Math.random() * messages[type].length)];
    const icons = { order: ShoppingCart, alert: AlertTriangle, tenant: Users, payment: DollarSign };

    return {
      id: Date.now(),
      type,
      message,
      time: 'Jetzt',
      icon: icons[type]
    };
  };

  // Filter events
  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>
          <Activity /> Live Feed
        </h2>
        <div className={styles.controls}>
          <button
            className={`${styles.controlButton} ${isPaused ? '' : styles.active}`}
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Feed fortsetzen' : 'Feed pausieren'}
          >
            {isPaused ? <Play /> : <Pause />}
          </button>
          
          <button
            className={`${styles.controlButton} ${soundEnabled ? styles.active : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Ton ausschalten' : 'Ton einschalten'}
          >
            {soundEnabled ? <Bell /> : <BellOff />}
          </button>
          
          <button
            className={`${styles.controlButton} ${showFilters ? styles.active : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filter"
          >
            <Filter />
            {filter !== 'all' && <span className={styles.filterBadge}></span>}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={styles.filters}>
          {filters.map(f => (
            <button
              key={f.value}
              className={`${styles.filterButton} ${filter === f.value ? styles.active : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value !== 'all' && (
                <span className={styles.filterCount}>
                  {events.filter(e => e.type === f.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Event Feed */}
      <div className={styles.feed} ref={feedRef}>
        {filteredEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <Activity />
            <p>Keine Events {filter !== 'all' ? `vom Typ "${filter}"` : ''}</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const eventConfig = eventTypes[event.type] || eventTypes.order;
            
            return (
              <div
                key={event.id}
                className={`${styles.event} ${styles[eventConfig.color]} ${
                  styles[eventConfig.priority]
                }`}
              >
                <div className={styles.eventIcon}>
                  <event.icon />
                </div>
                <div className={styles.eventContent}>
                  <p className={styles.eventMessage}>{event.message}</p>
                  <span className={styles.eventTime}>{event.time}</span>
                </div>
                <button className={styles.eventAction}>
                  <MoreVertical />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <span className={styles.eventCount}>
          {filteredEvents.length} Events
        </span>
        {isPaused && (
          <span className={styles.pausedIndicator}>
            <Pause /> Feed pausiert
          </span>
        )}
      </div>

      {/* Hidden audio element for sounds */}
      <audio ref={audioRef} src="/sounds/notification.mp3" />
    </div>
  );
};

export default LiveFeed;