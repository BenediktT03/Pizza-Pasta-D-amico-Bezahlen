/**
 * EATECH - Master Control Dashboard
 * Version: 1.0.0
 * Description: Hauptdashboard für das Master Control System mit
 *              Systemübersicht, Live-Metriken und Schweiz-Karte
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/pages/Dashboard.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Users,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  ShoppingBag,
  MapPin,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Server,
  Database,
  Shield,
  Zap,
  BarChart3,
  PieChart,
  Calendar,
  Bell,
  Settings,
  RefreshCw,
  Download,
  Filter,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Eye,
  TrendingDown,
  Star,
  MessageSquare,
  Truck,
  Navigation,
  Thermometer,
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Info,
  ExternalLink,
  Globe,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader,
  MoreVertical
} from 'lucide-react';
import SwitzerlandMap from '../components/Dashboard/SwitzerlandMap';
import SystemHealth from '../components/Dashboard/SystemHealth';
import LiveMetrics from '../components/Dashboard/LiveMetrics';
import RevenueChart from '../components/Dashboard/RevenueChart';
import TopFoodtrucks from '../components/Dashboard/TopFoodtrucks';
import RecentEvents from '../components/Dashboard/RecentEvents';
import WeatherWidget from '../components/Dashboard/WeatherWidget';
import styles from './Dashboard.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const REFRESH_INTERVALS = {
  metrics: 5000,      // 5 seconds
  health: 10000,      // 10 seconds
  map: 30000,         // 30 seconds
  weather: 300000     // 5 minutes
};

const SYSTEM_COMPONENTS = {
  api: { label: 'API Gateway', icon: Server },
  database: { label: 'Database', icon: Database },
  storage: { label: 'Storage', icon: HardDrive },
  auth: { label: 'Auth Service', icon: Shield },
  payments: { label: 'Payments', icon: DollarSign },
  notifications: { label: 'Notifications', icon: Bell },
  analytics: { label: 'Analytics', icon: BarChart3 },
  ml: { label: 'ML Pipeline', icon: Cpu }
};

const CANTON_DATA = {
  'ZH': { name: 'Zürich', foodtrucks: 145, revenue: 892450, growth: 12.5 },
  'BE': { name: 'Bern', foodtrucks: 98, revenue: 567230, growth: 8.3 },
  'VD': { name: 'Vaud', foodtrucks: 76, revenue: 445670, growth: 15.2 },
  'AG': { name: 'Aargau', foodtrucks: 54, revenue: 312890, growth: 6.7 },
  'SG': { name: 'St. Gallen', foodtrucks: 43, revenue: 287340, growth: 9.1 },
  'LU': { name: 'Luzern', foodtrucks: 38, revenue: 234560, growth: 11.8 },
  'TI': { name: 'Ticino', foodtrucks: 35, revenue: 198760, growth: 14.3 },
  'VS': { name: 'Valais', foodtrucks: 29, revenue: 167890, growth: 7.9 },
  'FR': { name: 'Fribourg', foodtrucks: 24, revenue: 145230, growth: 10.2 },
  'BS': { name: 'Basel-Stadt', foodtrucks: 31, revenue: 198450, growth: 13.6 }
};

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================
const generateLiveMetrics = () => ({
  activeUsers: Math.floor(Math.random() * 500) + 2500,
  activeOrders: Math.floor(Math.random() * 50) + 150,
  revenue24h: Math.floor(Math.random() * 5000) + 45000,
  avgOrderValue: Math.random() * 10 + 25,
  conversionRate: Math.random() * 0.05 + 0.12,
  newCustomers: Math.floor(Math.random() * 100) + 200,
  returningCustomers: Math.floor(Math.random() * 150) + 350,
  avgDeliveryTime: Math.floor(Math.random() * 5) + 18
});

const generateSystemHealth = () => ({
  overall: Math.random() > 0.1 ? 'healthy' : Math.random() > 0.5 ? 'warning' : 'critical',
  uptime: 99.9 - Math.random() * 0.5,
  responseTime: Math.floor(Math.random() * 50) + 80,
  errorRate: Math.random() * 0.5,
  components: Object.fromEntries(
    Object.keys(SYSTEM_COMPONENTS).map(key => [
      key,
      {
        status: Math.random() > 0.9 ? 'warning' : 'healthy',
        latency: Math.floor(Math.random() * 30) + 20,
        load: Math.random() * 0.8 + 0.1
      }
    ])
  )
});

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const MetricCard = ({ title, value, change, icon: Icon, color, format = 'number', trend }) => {
  const formatValue = useCallback((val) => {
    switch (format) {
      case 'currency':
        return `CHF ${val.toLocaleString('de-CH')}`;
      case 'percentage':
        return `${(val * 100).toFixed(1)}%`;
      case 'time':
        return `${val} min`;
      default:
        return val.toLocaleString('de-CH');
    }
  }, [format]);
  
  const isPositiveChange = change > 0;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <Icon size={20} style={{ color }} />
        <span>{title}</span>
      </div>
      <div className={styles.metricValue}>
        {formatValue(value)}
      </div>
      <div className={styles.metricChange}>
        {TrendIcon && <TrendIcon size={14} />}
        <span className={isPositiveChange ? styles.positive : styles.negative}>
          {isPositiveChange ? '+' : ''}{change.toFixed(1)}%
        </span>
        <span className={styles.changeLabel}>vs. Vortag</span>
      </div>
    </div>
  );
};

const SystemStatusCard = ({ component, data }) => {
  const config = SYSTEM_COMPONENTS[component];
  const Icon = config.icon;
  const statusColors = {
    healthy: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444'
  };
  
  return (
    <div className={`${styles.systemCard} ${styles[data.status]}`}>
      <div className={styles.systemHeader}>
        <Icon size={18} />
        <span>{config.label}</span>
        <div 
          className={styles.statusDot}
          style={{ backgroundColor: statusColors[data.status] }}
        />
      </div>
      <div className={styles.systemMetrics}>
        <div className={styles.systemMetric}>
          <span>Latency</span>
          <strong>{data.latency}ms</strong>
        </div>
        <div className={styles.systemMetric}>
          <span>Load</span>
          <strong>{(data.load * 100).toFixed(0)}%</strong>
        </div>
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'order': return ShoppingBag;
      case 'user': return Users;
      case 'foodtruck': return Truck;
      case 'system': return Server;
      case 'alert': return AlertCircle;
      default: return Activity;
    }
  };
  
  const Icon = getActivityIcon();
  
  return (
    <div className={styles.activityItem}>
      <div className={styles.activityIcon}>
        <Icon size={16} />
      </div>
      <div className={styles.activityContent}>
        <p>{activity.message}</p>
        <span>{activity.time}</span>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const Dashboard = () => {
  // State
  const [liveMetrics, setLiveMetrics] = useState(generateLiveMetrics());
  const [systemHealth, setSystemHealth] = useState(generateSystemHealth());
  const [selectedCanton, setSelectedCanton] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('today');
  const [showFilters, setShowFilters] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'alert', message: 'Hohe Nachfrage in Zürich HB erwartet', time: 'vor 5 Min.' },
    { id: 2, type: 'success', message: 'Neue Foodtruck-Registrierung: "Thai Street Kitchen"', time: 'vor 12 Min.' },
    { id: 3, type: 'info', message: 'System-Update erfolgreich durchgeführt', time: 'vor 1 Std.' }
  ]);
  
  // Live updates
  useEffect(() => {
    const metricsInterval = setInterval(() => {
      setLiveMetrics(generateLiveMetrics());
    }, REFRESH_INTERVALS.metrics);
    
    const healthInterval = setInterval(() => {
      setSystemHealth(generateSystemHealth());
    }, REFRESH_INTERVALS.health);
    
    return () => {
      clearInterval(metricsInterval);
      clearInterval(healthInterval);
    };
  }, []);
  
  // Handlers
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setLiveMetrics(generateLiveMetrics());
    setSystemHealth(generateSystemHealth());
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, []);
  
  const handleCantonClick = useCallback((cantonCode) => {
    setSelectedCanton(cantonCode);
  }, []);
  
  const handleExportData = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: liveMetrics,
      systemHealth,
      cantonData: CANTON_DATA
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eatech-dashboard-export-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [liveMetrics, systemHealth]);
  
  // Calculate aggregated stats
  const totalStats = useMemo(() => {
    const totals = Object.values(CANTON_DATA).reduce((acc, canton) => ({
      foodtrucks: acc.foodtrucks + canton.foodtrucks,
      revenue: acc.revenue + canton.revenue
    }), { foodtrucks: 0, revenue: 0 });
    
    return {
      ...totals,
      avgGrowth: Object.values(CANTON_DATA).reduce((sum, c) => sum + c.growth, 0) / Object.keys(CANTON_DATA).length
    };
  }, []);
  
  // Recent activities
  const recentActivities = useMemo(() => [
    { id: 1, type: 'order', message: 'Neue Bestellung #12345 in Zürich', time: 'vor 2 Min.' },
    { id: 2, type: 'foodtruck', message: 'Bella Italia ist jetzt online', time: 'vor 5 Min.' },
    { id: 3, type: 'user', message: '50 neue Kunden heute registriert', time: 'vor 15 Min.' },
    { id: 4, type: 'system', message: 'Backup erfolgreich abgeschlossen', time: 'vor 30 Min.' },
    { id: 5, type: 'alert', message: 'Zahlungsprozessor-Latenz erhöht', time: 'vor 45 Min.' }
  ], []);
  
  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Master Control Dashboard</h1>
          <p>Willkommen zurück! Hier ist die aktuelle Systemübersicht.</p>
        </div>
        
        <div className={styles.headerActions}>
          <div className={styles.dateSelector}>
            <Calendar size={18} />
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Heute</option>
              <option value="week">Diese Woche</option>
              <option value="month">Dieser Monat</option>
              <option value="quarter">Dieses Quartal</option>
            </select>
          </div>
          
          <button 
            className={styles.iconButton}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} />
          </button>
          
          <button 
            className={`${styles.iconButton} ${isRefreshing ? styles.spinning : ''}`}
            onClick={handleRefresh}
          >
            <RefreshCw size={20} />
          </button>
          
          <button 
            className={styles.iconButton}
            onClick={handleExportData}
          >
            <Download size={20} />
          </button>
          
          <div className={styles.notificationButton}>
            <Bell size={20} />
            <span className={styles.notificationBadge}>3</span>
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className={styles.metricsGrid}>
        <MetricCard
          title="Aktive Nutzer"
          value={liveMetrics.activeUsers}
          change={12.5}
          icon={Users}
          color="#3b82f6"
          trend="up"
        />
        <MetricCard
          title="Aktive Bestellungen"
          value={liveMetrics.activeOrders}
          change={8.3}
          icon={ShoppingBag}
          color="#10b981"
          trend="up"
        />
        <MetricCard
          title="Umsatz (24h)"
          value={liveMetrics.revenue24h}
          change={15.7}
          icon={DollarSign}
          color="#f59e0b"
          format="currency"
          trend="up"
        />
        <MetricCard
          title="Ø Bestellwert"
          value={liveMetrics.avgOrderValue}
          change={-2.1}
          icon={TrendingUp}
          color="#8b5cf6"
          format="currency"
          trend="down"
        />
      </div>
      
      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Switzerland Map */}
        <div className={styles.mapSection}>
          <div className={styles.sectionHeader}>
            <h2>Foodtruck-Verteilung Schweiz</h2>
            <div className={styles.mapLegend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: '#fee2e2' }} />
                Niedrig
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: '#fbbf24' }} />
                Mittel
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ backgroundColor: '#10b981' }} />
                Hoch
              </span>
            </div>
          </div>
          
          <SwitzerlandMap
            data={CANTON_DATA}
            onCantonClick={handleCantonClick}
            selectedCanton={selectedCanton}
          />
          
          {selectedCanton && (
            <div className={styles.cantonDetails}>
              <h3>{CANTON_DATA[selectedCanton].name}</h3>
              <div className={styles.cantonStats}>
                <div>
                  <span>Foodtrucks</span>
                  <strong>{CANTON_DATA[selectedCanton].foodtrucks}</strong>
                </div>
                <div>
                  <span>Umsatz (Monat)</span>
                  <strong>CHF {CANTON_DATA[selectedCanton].revenue.toLocaleString('de-CH')}</strong>
                </div>
                <div>
                  <span>Wachstum</span>
                  <strong className={styles.positive}>+{CANTON_DATA[selectedCanton].growth}%</strong>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* System Health */}
        <div className={styles.systemHealthSection}>
          <div className={styles.sectionHeader}>
            <h2>System Health</h2>
            <div className={styles.healthStatus}>
              <CheckCircle size={16} style={{ color: '#10b981' }} />
              <span>Alle Systeme operational</span>
            </div>
          </div>
          
          <div className={styles.healthMetrics}>
            <div className={styles.healthMetric}>
              <span>Uptime</span>
              <strong>{systemHealth.uptime.toFixed(2)}%</strong>
            </div>
            <div className={styles.healthMetric}>
              <span>Response Time</span>
              <strong>{systemHealth.responseTime}ms</strong>
            </div>
            <div className={styles.healthMetric}>
              <span>Error Rate</span>
              <strong>{systemHealth.errorRate.toFixed(2)}%</strong>
            </div>
          </div>
          
          <div className={styles.systemGrid}>
            {Object.entries(systemHealth.components).map(([key, data]) => (
              <SystemStatusCard
                key={key}
                component={key}
                data={data}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Secondary Grid */}
      <div className={styles.secondaryGrid}>
        {/* Live Activity Feed */}
        <div className={styles.activitySection}>
          <div className={styles.sectionHeader}>
            <h2>Live Activity</h2>
            <button className={styles.viewAllButton}>
              Alle anzeigen
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div className={styles.activityFeed}>
            {recentActivities.map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
        
        {/* Revenue Chart */}
        <div className={styles.revenueSection}>
          <div className={styles.sectionHeader}>
            <h2>Umsatzentwicklung</h2>
            <select className={styles.chartPeriod}>
              <option>Letzte 7 Tage</option>
              <option>Letzte 30 Tage</option>
              <option>Letzte 90 Tage</option>
            </select>
          </div>
          
          <RevenueChart period="week" />
        </div>
        
        {/* Top Foodtrucks */}
        <div className={styles.topFoodtrucksSection}>
          <div className={styles.sectionHeader}>
            <h2>Top Foodtrucks</h2>
            <span className={styles.subtitle}>Nach Umsatz</span>
          </div>
          
          <TopFoodtrucks limit={5} />
        </div>
      </div>
      
      {/* Footer Stats */}
      <div className={styles.footerStats}>
        <div className={styles.statCard}>
          <Truck size={24} />
          <div>
            <span>{totalStats.foodtrucks}</span>
            <p>Aktive Foodtrucks</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <Users size={24} />
          <div>
            <span>{(liveMetrics.newCustomers + liveMetrics.returningCustomers).toLocaleString()}</span>
            <p>Kunden heute</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <Package size={24} />
          <div>
            <span>{liveMetrics.activeOrders}</span>
            <p>Offene Bestellungen</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <TrendingUp size={24} />
          <div>
            <span>+{totalStats.avgGrowth.toFixed(1)}%</span>
            <p>Durchschnittliches Wachstum</p>
          </div>
        </div>
      </div>
      
      {/* Notifications Dropdown */}
      {notifications.length > 0 && (
        <div className={styles.notificationsDropdown}>
          <div className={styles.notificationsHeader}>
            <h3>Benachrichtigungen</h3>
            <button onClick={() => setNotifications([])}>
              Alle löschen
            </button>
          </div>
          <div className={styles.notificationsList}>
            {notifications.map(notification => (
              <div key={notification.id} className={styles.notificationItem}>
                <div className={styles.notificationIcon}>
                  {notification.type === 'alert' && <AlertCircle size={16} />}
                  {notification.type === 'success' && <CheckCircle size={16} />}
                  {notification.type === 'info' && <Info size={16} />}
                </div>
                <div className={styles.notificationContent}>
                  <p>{notification.message}</p>
                  <span>{notification.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default Dashboard;