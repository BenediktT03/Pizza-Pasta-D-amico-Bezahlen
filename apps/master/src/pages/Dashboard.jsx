/**
 * EATECH Master Dashboard
 * Version: 1.0.0
 * 
 * Mission Control für das gesamte EATECH System
 * Features:
 * - Live-Karte der Schweiz mit Foodtruck-Positionen
 * - Echtzeit-Metriken
 * - System Health Monitoring
 * - Quick Actions
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/pages/Dashboard.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Users, 
  DollarSign, 
  TrendingUp,
  MapPin,
  Truck,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Database,
  Server,
  Wifi,
  WifiOff,
  BarChart3,
  Calendar,
  Play,
  Pause,
  RefreshCw,
  Settings,
  ChevronUp,
  ChevronDown,
  MoreVertical
} from 'lucide-react';
import { useMasterAuth } from '../hooks/useMasterAuth';
import SwitzerlandMap from '../components/SwitzerlandMap/SwitzerlandMap';
import MetricCard from '../components/Dashboard/MetricCard';
import SystemHealthWidget from '../components/Dashboard/SystemHealthWidget';
import QuickActions from '../components/Dashboard/QuickActions';
import LiveFeed from '../components/Dashboard/LiveFeed';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  // State
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [metrics, setMetrics] = useState({
    totalRevenue: {
      value: 4567.89,
      change: 12.5,
      trend: 'up',
      label: 'Heutiger Umsatz',
      prefix: 'CHF'
    },
    activeOrders: {
      value: 23,
      change: 8,
      trend: 'up',
      label: 'Aktive Bestellungen',
      suffix: ''
    },
    onlineTenants: {
      value: 115,
      change: -2,
      trend: 'down',
      label: 'Online Tenants',
      suffix: '/127'
    },
    avgOrderValue: {
      value: 45.67,
      change: 5.2,
      trend: 'up',
      label: 'Ø Bestellwert',
      prefix: 'CHF'
    }
  });

  const [systemHealth, setSystemHealth] = useState({
    overall: 98,
    services: {
      api: { status: 'healthy', latency: 124 },
      database: { status: 'healthy', latency: 45 },
      storage: { status: 'healthy', usage: 67 },
      cdn: { status: 'warning', latency: 280 }
    }
  });

  const [activeFoodtrucks, setActiveFoodtrucks] = useState([
    {
      id: 'ft-001',
      name: 'Burger Express',
      location: { lat: 47.3769, lng: 8.5417 }, // Zürich
      status: 'active',
      orders: 12,
      revenue: 567.80
    },
    {
      id: 'ft-002',
      name: 'Pizza Mobile',
      location: { lat: 46.9480, lng: 7.4474 }, // Bern
      status: 'paused',
      orders: 8,
      revenue: 345.20
    },
    {
      id: 'ft-003',
      name: 'Asian Fusion Truck',
      location: { lat: 47.5596, lng: 7.5886 }, // Basel
      status: 'active',
      orders: 15,
      revenue: 890.50
    }
  ]);

  const [recentEvents, setRecentEvents] = useState([
    {
      id: 1,
      type: 'order',
      message: 'Neue Bestellung bei Burger Express',
      time: '2 min',
      icon: ShoppingCart
    },
    {
      id: 2,
      type: 'alert',
      message: 'CDN Latenz erhöht (280ms)',
      time: '5 min',
      icon: AlertTriangle
    },
    {
      id: 3,
      type: 'tenant',
      message: 'Pizza Mobile pausiert (10 min)',
      time: '8 min',
      icon: Pause
    }
  ]);

  const { user } = useMasterAuth();
  const refreshTimerRef = useRef(null);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        refreshData();
      }, refreshInterval);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Refresh data function
  const refreshData = () => {
    // Simulate data refresh
    console.log('Refreshing dashboard data...');
    
    // Update metrics with random changes
    setMetrics(prev => ({
      ...prev,
      totalRevenue: {
        ...prev.totalRevenue,
        value: prev.totalRevenue.value + (Math.random() * 100 - 50),
        change: Math.random() * 5
      },
      activeOrders: {
        ...prev.activeOrders,
        value: Math.max(0, prev.activeOrders.value + Math.floor(Math.random() * 5 - 2))
      }
    }));

    // Add new event
    const newEvents = [
      { type: 'order', message: 'Neue Bestellung', icon: ShoppingCart },
      { type: 'alert', message: 'System Alert', icon: AlertTriangle },
      { type: 'tenant', message: 'Tenant Update', icon: Users }
    ];
    
    const randomEvent = newEvents[Math.floor(Math.random() * newEvents.length)];
    
    setRecentEvents(prev => [
      {
        id: Date.now(),
        ...randomEvent,
        time: 'Jetzt'
      },
      ...prev.slice(0, 9)
    ]);
  };

  // Time range options
  const timeRanges = [
    { value: 'today', label: 'Heute' },
    { value: 'week', label: 'Diese Woche' },
    { value: 'month', label: 'Dieser Monat' },
    { value: 'year', label: 'Dieses Jahr' }
  ];

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Master Dashboard</h1>
          <p className={styles.subtitle}>
            Willkommen zurück, {user?.email} • {new Date().toLocaleDateString('de-CH', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <div className={styles.headerRight}>
          {/* Time Range Selector */}
          <div className={styles.timeRangeSelector}>
            {timeRanges.map(range => (
              <button
                key={range.value}
                className={`${styles.timeRangeButton} ${
                  selectedTimeRange === range.value ? styles.active : ''
                }`}
                onClick={() => setSelectedTimeRange(range.value)}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Auto Refresh Toggle */}
          <div className={styles.refreshControls}>
            <button
              className={`${styles.refreshToggle} ${autoRefresh ? styles.active : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Auto-Refresh aktiv' : 'Auto-Refresh deaktiviert'}
            >
              <RefreshCw className={autoRefresh ? styles.spinning : ''} />
              <span>{autoRefresh ? 'Auto' : 'Manual'}</span>
            </button>
            
            <button
              className={styles.refreshButton}
              onClick={refreshData}
              title="Jetzt aktualisieren"
            >
              <RefreshCw />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.mainGrid}>
        {/* Metrics Row */}
        <div className={styles.metricsRow}>
          <MetricCard
            icon={DollarSign}
            label={metrics.totalRevenue.label}
            value={metrics.totalRevenue.value}
            prefix={metrics.totalRevenue.prefix}
            change={metrics.totalRevenue.change}
            trend={metrics.totalRevenue.trend}
            color="primary"
          />
          <MetricCard
            icon={ShoppingCart}
            label={metrics.activeOrders.label}
            value={metrics.activeOrders.value}
            change={metrics.activeOrders.change}
            trend={metrics.activeOrders.trend}
            color="success"
          />
          <MetricCard
            icon={Users}
            label={metrics.onlineTenants.label}
            value={metrics.onlineTenants.value}
            suffix={metrics.onlineTenants.suffix}
            change={metrics.onlineTenants.change}
            trend={metrics.onlineTenants.trend}
            color="warning"
          />
          <MetricCard
            icon={TrendingUp}
            label={metrics.avgOrderValue.label}
            value={metrics.avgOrderValue.value}
            prefix={metrics.avgOrderValue.prefix}
            change={metrics.avgOrderValue.change}
            trend={metrics.avgOrderValue.trend}
            color="info"
          />
        </div>

        {/* Map and System Health Row */}
        <div className={styles.mapHealthRow}>
          {/* Switzerland Map */}
          <div className={styles.mapSection}>
            <div className={styles.sectionHeader}>
              <h2>
                <MapPin /> Live Foodtruck Positionen
              </h2>
              <div className={styles.mapLegend}>
                <span className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.active}`}></span>
                  Aktiv ({activeFoodtrucks.filter(ft => ft.status === 'active').length})
                </span>
                <span className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.paused}`}></span>
                  Pausiert ({activeFoodtrucks.filter(ft => ft.status === 'paused').length})
                </span>
              </div>
            </div>
            
            <div className={styles.mapContainer}>
              <SwitzerlandMap 
                foodtrucks={activeFoodtrucks}
                onFoodtruckClick={(foodtruck) => {
                  console.log('Clicked foodtruck:', foodtruck);
                }}
              />
            </div>

            {/* Foodtruck List */}
            <div className={styles.foodtruckList}>
              {activeFoodtrucks.map(truck => (
                <div key={truck.id} className={styles.foodtruckItem}>
                  <div className={styles.truckInfo}>
                    <Truck className={`${styles.truckIcon} ${styles[truck.status]}`} />
                    <div>
                      <h4>{truck.name}</h4>
                      <p>{truck.orders} Bestellungen • CHF {truck.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                  <button className={styles.truckAction}>
                    <MoreVertical />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className={styles.healthSection}>
            <SystemHealthWidget 
              health={systemHealth}
              onRefresh={() => console.log('Refresh health')}
            />
          </div>
        </div>

        {/* Bottom Row */}
        <div className={styles.bottomRow}>
          {/* Quick Actions */}
          <div className={styles.quickActionsSection}>
            <QuickActions />
          </div>

          {/* Live Feed */}
          <div className={styles.liveFeedSection}>
            <LiveFeed events={recentEvents} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;