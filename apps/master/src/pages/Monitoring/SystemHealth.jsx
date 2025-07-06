/**
 * EATECH - System Health Monitoring
 * Version: 1.0.0
 * Description: Echtzeit-Überwachung der Systemgesundheit mit Performance-Metriken,
 *              Error-Tracking und automatischen Alerts
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * Kapitel: Phase 5 - Master Control - System Monitoring
 * File Path: /apps/master/src/pages/Monitoring/SystemHealth.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  off
} from 'firebase/database';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Download,
  Mail,
  Bell,
  Settings,
  BarChart3,
  Monitor,
  Zap,
  Users,
  Globe,
  Shield,
  Heart,
  Gauge,
  Timer,
  Package,
  Cloud,
  CloudOff,
  Layers,
  Box,
  Info,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Filter,
  Calendar,
  Search,
  FileText,
  Terminal,
  Code,
  Smartphone,
  Tablet,
  Monitor as DesktopIcon,
  Chrome,
  Compass,
  PieChart,
  LineChart,
  AreaChart,
  Sparkles,
  BellOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  SkipForward
} from 'lucide-react';
import styles from './SystemHealth.module.css';

// Lazy loaded components
const MetricChart = lazy(() => import('./components/MetricChart'));
const AlertHistory = lazy(() => import('./components/AlertHistory'));
const ServiceStatus = lazy(() => import('./components/ServiceStatus'));
const PerformanceInsights = lazy(() => import('./components/PerformanceInsights'));

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebaseio.com",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.appspot.com",
  messagingSenderId: "679154857640",
  appId: "1:679154857640:web:e9b623a3e9b2f3b5a9c8d6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============================================================================
// CONSTANTS
// ============================================================================
const REFRESH_INTERVALS = {
  metrics: 5000,      // 5 seconds
  services: 10000,    // 10 seconds
  alerts: 30000,      // 30 seconds
  insights: 60000     // 1 minute
};

const HEALTH_THRESHOLDS = {
  cpu: { warning: 70, critical: 90 },
  memory: { warning: 80, critical: 95 },
  disk: { warning: 75, critical: 90 },
  responseTime: { warning: 1000, critical: 3000 }, // ms
  errorRate: { warning: 5, critical: 10 }, // percentage
  uptime: { warning: 99, critical: 95 } // percentage
};

const SERVICE_LIST = [
  { id: 'firebase', name: 'Firebase', icon: Database },
  { id: 'vercel', name: 'Vercel Hosting', icon: Globe },
  { id: 'stripe', name: 'Stripe Payments', icon: Shield },
  { id: 'twilio', name: 'Twilio SMS', icon: Mail },
  { id: 'openai', name: 'OpenAI API', icon: Sparkles },
  { id: 'cloudflare', name: 'Cloudflare CDN', icon: Cloud },
  { id: 'sendgrid', name: 'SendGrid Email', icon: Mail },
  { id: 'mapbox', name: 'Mapbox Maps', icon: Globe }
];

const METRIC_TYPES = {
  system: { label: 'System', icon: Server, color: '#3b82f6' },
  performance: { label: 'Performance', icon: Zap, color: '#10b981' },
  network: { label: 'Network', icon: Wifi, color: '#8b5cf6' },
  errors: { label: 'Errors', icon: AlertTriangle, color: '#ef4444' },
  users: { label: 'Users', icon: Users, color: '#f59e0b' },
  database: { label: 'Database', icon: Database, color: '#6366f1' }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const SystemHealth = () => {
  // State Management
  const [metrics, setMetrics] = useState({
    cpu: { current: 0, average: 0, peak: 0, history: [] },
    memory: { current: 0, available: 16384, used: 0, history: [] },
    disk: { current: 0, total: 500, used: 0, history: [] },
    network: { in: 0, out: 0, latency: 0, history: [] },
    requests: { total: 0, success: 0, failed: 0, rate: 0 },
    users: { active: 0, total: 0, sessions: 0, locations: {} }
  });

  const [services, setServices] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [insights, setInsights] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('system');
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    email: true,
    push: true,
    sound: true,
    criticalOnly: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ========================================================================
  // FIREBASE LISTENERS
  // ========================================================================
  useEffect(() => {
    const metricsRef = ref(database, 'systemMetrics/current');
    const servicesRef = ref(database, 'serviceStatus');
    const alertsRef = query(
      ref(database, 'systemAlerts'),
      orderByChild('timestamp'),
      limitToLast(50)
    );

    // Metrics listener
    const unsubscribeMetrics = onValue(metricsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMetrics(prevMetrics => {
          // Update history for charts
          const newMetrics = { ...prevMetrics };
          
          Object.keys(data).forEach(key => {
            if (newMetrics[key] && data[key]) {
              newMetrics[key] = {
                ...newMetrics[key],
                ...data[key],
                history: [...(prevMetrics[key]?.history || []), {
                  value: data[key].current,
                  timestamp: Date.now()
                }].slice(-100) // Keep last 100 points
              };
            }
          });
          
          return newMetrics;
        });
        
        // Check for threshold violations
        checkThresholds(data);
      }
      setLoading(false);
    }, (error) => {
      console.error('Metrics error:', error);
      setError('Fehler beim Laden der Metriken');
      setLoading(false);
    });

    // Services listener
    const unsubscribeServices = onValue(servicesRef, (snapshot) => {
      if (snapshot.exists()) {
        setServices(snapshot.val());
      }
    });

    // Alerts listener
    const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
      if (snapshot.exists()) {
        const alertList = [];
        snapshot.forEach((child) => {
          alertList.unshift({ id: child.key, ...child.val() });
        });
        setAlerts(alertList);
        
        // Show notification for new critical alerts
        if (alertList.length > 0 && alertList[0].severity === 'critical') {
          showNotification(alertList[0]);
        }
      }
    });

    // Cleanup
    return () => {
      off(metricsRef);
      off(servicesRef);
      off(alertsRef);
    };
  }, []);

  // ========================================================================
  // PERIODIC UPDATES
  // ========================================================================
  useEffect(() => {
    if (!autoRefresh) return;

    // Generate insights periodically
    const insightsInterval = setInterval(() => {
      generateInsights();
    }, REFRESH_INTERVALS.insights);

    return () => clearInterval(insightsInterval);
  }, [metrics, autoRefresh]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  const checkThresholds = useCallback((data) => {
    const newAlerts = [];

    // Check CPU
    if (data.cpu?.current > HEALTH_THRESHOLDS.cpu.critical) {
      newAlerts.push({
        type: 'cpu',
        severity: 'critical',
        message: `CPU-Auslastung kritisch: ${data.cpu.current}%`,
        value: data.cpu.current
      });
    } else if (data.cpu?.current > HEALTH_THRESHOLDS.cpu.warning) {
      newAlerts.push({
        type: 'cpu',
        severity: 'warning',
        message: `CPU-Auslastung hoch: ${data.cpu.current}%`,
        value: data.cpu.current
      });
    }

    // Check Memory
    if (data.memory?.current > HEALTH_THRESHOLDS.memory.critical) {
      newAlerts.push({
        type: 'memory',
        severity: 'critical',
        message: `Speicher kritisch: ${data.memory.current}%`,
        value: data.memory.current
      });
    }

    // Check Error Rate
    const errorRate = data.requests?.failed / (data.requests?.total || 1) * 100;
    if (errorRate > HEALTH_THRESHOLDS.errorRate.critical) {
      newAlerts.push({
        type: 'errors',
        severity: 'critical',
        message: `Hohe Fehlerrate: ${errorRate.toFixed(1)}%`,
        value: errorRate
      });
    }

    // Send alerts to Firebase
    newAlerts.forEach(alert => {
      push(ref(database, 'systemAlerts'), {
        ...alert,
        timestamp: serverTimestamp(),
        resolved: false
      });
    });
  }, []);

  const generateInsights = useCallback(() => {
    const newInsights = [];

    // Performance trends
    if (metrics.cpu.history.length > 10) {
      const recent = metrics.cpu.history.slice(-10);
      const avg = recent.reduce((a, b) => a + b.value, 0) / recent.length;
      const trend = recent[recent.length - 1].value - recent[0].value;
      
      if (trend > 20) {
        newInsights.push({
          type: 'trend',
          icon: TrendingUp,
          title: 'CPU-Last steigt',
          description: `CPU-Auslastung ist in den letzten 10 Minuten um ${trend.toFixed(1)}% gestiegen`,
          severity: 'warning'
        });
      }
    }

    // Service availability
    const downServices = Object.entries(services).filter(([_, s]) => !s.operational).length;
    if (downServices > 0) {
      newInsights.push({
        type: 'service',
        icon: AlertCircle,
        title: 'Service-Ausfall',
        description: `${downServices} Service${downServices > 1 ? 's' : ''} nicht verfügbar`,
        severity: 'critical'
      });
    }

    // User activity
    if (metrics.users.active > 100) {
      newInsights.push({
        type: 'users',
        icon: Users,
        title: 'Hohe Benutzeraktivität',
        description: `${metrics.users.active} aktive Benutzer online`,
        severity: 'info'
      });
    }

    setInsights(newInsights);
  }, [metrics, services]);

  const showNotification = useCallback((alert) => {
    if (!alertSettings.email && !alertSettings.push) return;
    if (alertSettings.criticalOnly && alert.severity !== 'critical') return;

    // Browser notification
    if (alertSettings.push && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('EATECH System Alert', {
        body: alert.message,
        icon: '/icons/alert.png',
        badge: '/icons/badge.png',
        tag: alert.id,
        requireInteraction: alert.severity === 'critical'
      });
    }

    // Sound alert
    if (alertSettings.sound && alert.severity === 'critical') {
      const audio = new Audio('/sounds/alert.mp3');
      audio.play().catch(console.error);
    }
  }, [alertSettings]);

  const handleExportReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: metrics,
      services: services,
      alerts: alerts,
      insights: insights
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-health-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, services, alerts, insights]);

  const handleResolveAlert = useCallback(async (alertId) => {
    try {
      await push(ref(database, `systemAlerts/${alertId}`), {
        resolved: true,
        resolvedAt: serverTimestamp(),
        resolvedBy: 'master-admin'
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  }, []);

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================
  const systemHealth = useMemo(() => {
    const scores = {
      cpu: 100 - (metrics.cpu.current / 100) * 50,
      memory: 100 - (metrics.memory.current / 100) * 50,
      errors: 100 - ((metrics.requests.failed / (metrics.requests.total || 1)) * 100) * 10,
      services: (Object.values(services).filter(s => s.operational).length / Object.keys(services).length) * 100 || 100
    };

    const overall = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;

    return {
      overall: Math.round(overall),
      status: overall >= 90 ? 'excellent' : overall >= 70 ? 'good' : overall >= 50 ? 'warning' : 'critical',
      scores
    };
  }, [metrics, services]);

  const activeAlerts = useMemo(() => {
    return alerts.filter(alert => !alert.resolved);
  }, [alerts]);

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  const getHealthColor = (value, thresholds) => {
    if (value >= thresholds.critical) return '#ef4444';
    if (value >= thresholds.warning) return '#f59e0b';
    return '#10b981';
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'excellent': return CheckCircle;
      case 'good': return Activity;
      case 'warning': return AlertCircle;
      case 'critical': return XCircle;
      default: return Info;
    }
  };

  const formatBytes = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Lade System-Metriken...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle size={48} />
        <h2>Fehler</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          <RefreshCw size={20} />
          Neu laden
        </button>
      </div>
    );
  }

  const HealthIcon = getHealthIcon(systemHealth.status);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>System Health Monitoring</h1>
          <p>Echtzeit-Überwachung aller EATECH Systeme</p>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.healthScore} data-status={systemHealth.status}>
            <HealthIcon size={32} />
            <div>
              <span className={styles.scoreValue}>{systemHealth.overall}%</span>
              <span className={styles.scoreLabel}>System Health</span>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              className={styles.autoRefreshButton}
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-active={autoRefresh}
            >
              {autoRefresh ? <RefreshCw size={20} className={styles.spinning} /> : <RefreshCw size={20} />}
              {autoRefresh ? 'Auto' : 'Manual'}
            </button>
            
            <button 
              className={styles.alertButton}
              onClick={() => setShowAlertSettings(!showAlertSettings)}
            >
              {alertSettings.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
              Alerts
            </button>
            
            <button 
              className={styles.exportButton}
              onClick={handleExportReport}
            >
              <Download size={20} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Alert Settings Modal */}
      {showAlertSettings && (
        <div className={styles.alertSettingsModal}>
          <div className={styles.modalHeader}>
            <h3>Alert Einstellungen</h3>
            <button onClick={() => setShowAlertSettings(false)}>
              <XCircle size={20} />
            </button>
          </div>
          
          <div className={styles.modalContent}>
            <label>
              <input 
                type="checkbox" 
                checked={alertSettings.email}
                onChange={(e) => setAlertSettings({...alertSettings, email: e.target.checked})}
              />
              Email-Benachrichtigungen
            </label>
            
            <label>
              <input 
                type="checkbox" 
                checked={alertSettings.push}
                onChange={(e) => setAlertSettings({...alertSettings, push: e.target.checked})}
              />
              Push-Benachrichtigungen
            </label>
            
            <label>
              <input 
                type="checkbox" 
                checked={alertSettings.sound}
                onChange={(e) => setAlertSettings({...alertSettings, sound: e.target.checked})}
              />
              Sound-Alerts
            </label>
            
            <label>
              <input 
                type="checkbox" 
                checked={alertSettings.criticalOnly}
                onChange={(e) => setAlertSettings({...alertSettings, criticalOnly: e.target.checked})}
              />
              Nur kritische Alerts
            </label>
          </div>
        </div>
      )}

      {/* Time Range Selector */}
      <div className={styles.controls}>
        <div className={styles.metricTabs}>
          {Object.entries(METRIC_TYPES).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                className={`${styles.metricTab} ${selectedMetric === key ? styles.active : ''}`}
                onClick={() => setSelectedMetric(key)}
                style={{ '--tab-color': config.color }}
              >
                <Icon size={18} />
                {config.label}
              </button>
            );
          })}
        </div>
        
        <div className={styles.timeRangeSelector}>
          <button 
            className={timeRange === '5m' ? styles.active : ''}
            onClick={() => setTimeRange('5m')}
          >
            5m
          </button>
          <button 
            className={timeRange === '1h' ? styles.active : ''}
            onClick={() => setTimeRange('1h')}
          >
            1h
          </button>
          <button 
            className={timeRange === '24h' ? styles.active : ''}
            onClick={() => setTimeRange('24h')}
          >
            24h
          </button>
          <button 
            className={timeRange === '7d' ? styles.active : ''}
            onClick={() => setTimeRange('7d')}
          >
            7d
          </button>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className={styles.metricsGrid}>
        {/* CPU Usage */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <Cpu size={20} />
            <h3>CPU Auslastung</h3>
            <span 
              className={styles.metricValue}
              style={{ color: getHealthColor(metrics.cpu.current, HEALTH_THRESHOLDS.cpu) }}
            >
              {metrics.cpu.current.toFixed(1)}%
            </span>
          </div>
          
          <div className={styles.metricChart}>
            <Suspense fallback={<div className={styles.chartLoading}>Lade Chart...</div>}>
              <MetricChart 
                data={metrics.cpu.history}
                color={getHealthColor(metrics.cpu.current, HEALTH_THRESHOLDS.cpu)}
                height={80}
              />
            </Suspense>
          </div>
          
          <div className={styles.metricStats}>
            <div>
              <span>Durchschnitt</span>
              <strong>{metrics.cpu.average.toFixed(1)}%</strong>
            </div>
            <div>
              <span>Peak</span>
              <strong>{metrics.cpu.peak.toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <HardDrive size={20} />
            <h3>Speicher</h3>
            <span 
              className={styles.metricValue}
              style={{ color: getHealthColor(metrics.memory.current, HEALTH_THRESHOLDS.memory) }}
            >
              {metrics.memory.current.toFixed(1)}%
            </span>
          </div>
          
          <div className={styles.metricChart}>
            <Suspense fallback={<div className={styles.chartLoading}>Lade Chart...</div>}>
              <MetricChart 
                data={metrics.memory.history}
                color={getHealthColor(metrics.memory.current, HEALTH_THRESHOLDS.memory)}
                height={80}
              />
            </Suspense>
          </div>
          
          <div className={styles.metricStats}>
            <div>
              <span>Verwendet</span>
              <strong>{formatBytes(metrics.memory.used * 1024 * 1024)}</strong>
            </div>
            <div>
              <span>Verfügbar</span>
              <strong>{formatBytes((metrics.memory.available - metrics.memory.used) * 1024 * 1024)}</strong>
            </div>
          </div>
        </div>

        {/* Network */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <Wifi size={20} />
            <h3>Netzwerk</h3>
            <span className={styles.metricValue}>
              {metrics.network.latency}ms
            </span>
          </div>
          
          <div className={styles.metricChart}>
            <Suspense fallback={<div className={styles.chartLoading}>Lade Chart...</div>}>
              <MetricChart 
                data={metrics.network.history}
                color="#8b5cf6"
                height={80}
              />
            </Suspense>
          </div>
          
          <div className={styles.metricStats}>
            <div>
              <span>In</span>
              <strong>{formatBytes(metrics.network.in)}/s</strong>
            </div>
            <div>
              <span>Out</span>
              <strong>{formatBytes(metrics.network.out)}/s</strong>
            </div>
          </div>
        </div>

        {/* Request Stats */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <BarChart3 size={20} />
            <h3>Anfragen</h3>
            <span className={styles.metricValue}>
              {metrics.requests.rate}/s
            </span>
          </div>
          
          <div className={styles.requestStats}>
            <div className={styles.requestBar}>
              <div 
                className={styles.successBar}
                style={{ width: `${(metrics.requests.success / metrics.requests.total) * 100}%` }}
              />
            </div>
            
            <div className={styles.requestNumbers}>
              <div>
                <span style={{ color: '#10b981' }}>●</span>
                Success: {((metrics.requests.success / metrics.requests.total) * 100).toFixed(1)}%
              </div>
              <div>
                <span style={{ color: '#ef4444' }}>●</span>
                Failed: {((metrics.requests.failed / metrics.requests.total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className={styles.metricStats}>
            <div>
              <span>Total</span>
              <strong>{metrics.requests.total.toLocaleString()}</strong>
            </div>
            <div>
              <span>Rate</span>
              <strong>{metrics.requests.rate}/s</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Service Status</h2>
          <span className={styles.sectionBadge}>
            {Object.values(services).filter(s => s.operational).length} / {Object.keys(services).length} Online
          </span>
        </div>
        
        <div className={styles.servicesGrid}>
          {SERVICE_LIST.map(service => {
            const status = services[service.id] || { operational: false };
            const Icon = service.icon;
            
            return (
              <div 
                key={service.id}
                className={styles.serviceCard}
                data-status={status.operational ? 'online' : 'offline'}
              >
                <Icon size={24} />
                <h4>{service.name}</h4>
                <div className={styles.serviceStatus}>
                  {status.operational ? (
                    <>
                      <CheckCircle size={16} />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      <span>Offline</span>
                    </>
                  )}
                </div>
                {status.responseTime && (
                  <span className={styles.responseTime}>{status.responseTime}ms</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Aktive Alerts</h2>
            <span className={styles.alertCount}>{activeAlerts.length}</span>
          </div>
          
          <div className={styles.alertsList}>
            {activeAlerts.map(alert => (
              <div 
                key={alert.id}
                className={styles.alertItem}
                data-severity={alert.severity}
              >
                <AlertTriangle size={20} />
                <div className={styles.alertContent}>
                  <h4>{alert.message}</h4>
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
                <button 
                  className={styles.resolveButton}
                  onClick={() => handleResolveAlert(alert.id)}
                >
                  Beheben
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>System Insights</h2>
            <Info size={20} />
          </div>
          
          <div className={styles.insightsGrid}>
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div 
                  key={index}
                  className={styles.insightCard}
                  data-severity={insight.severity}
                >
                  <Icon size={24} />
                  <div>
                    <h4>{insight.title}</h4>
                    <p>{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className={styles.footer}>
        <div className={styles.footerStat}>
          <Clock size={16} />
          <span>Uptime: {formatUptime(metrics.uptime || 0)}</span>
        </div>
        <div className={styles.footerStat}>
          <Users size={16} />
          <span>{metrics.users.active} aktive Nutzer</span>
        </div>
        <div className={styles.footerStat}>
          <Database size={16} />
          <span>DB: {formatBytes(metrics.database?.size || 0)}</span>
        </div>
        <div className={styles.footerStat}>
          <Activity size={16} />
          <span>Letztes Update: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default SystemHealth;