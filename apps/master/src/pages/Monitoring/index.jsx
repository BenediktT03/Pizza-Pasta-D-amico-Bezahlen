/**
 * EATECH - System Monitoring Dashboard
 * Version: 1.0.0
 * Description: Zentrale Überwachungskonsole für alle System-Komponenten
 *              mit Echtzeit-Metriken, Alerts und Performance-Tracking
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/pages/Monitoring/index.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { 
  Activity, AlertTriangle, CheckCircle, XCircle,
  Server, Database, Cpu, HardDrive, Wifi,
  Clock, TrendingUp, TrendingDown, BarChart3,
  Bell, BellOff, Shield, Zap, Globe,
  Filter, Settings, RefreshCw, Download,
  Eye, EyeOff, Pause, Play, Info,
  AlertCircle, Terminal, Code, Bug,
  Monitor, Smartphone, Cloud, Lock,
  ChevronRight
} from 'lucide-react';
import styles from './Monitoring.module.css';

// Lazy loaded components
const SystemHealth = lazy(() => import('./SystemHealth'));
const ErrorTracking = lazy(() => import('./ErrorTracking'));
const PerformanceMetrics = lazy(() => import('./PerformanceMetrics'));
const AlertManager = lazy(() => import('./AlertManager'));
const ServiceStatus = lazy(() => import('./components/ServiceStatus'));
const MetricsChart = lazy(() => import('./components/MetricsChart'));
const LogViewer = lazy(() => import('./components/LogViewer'));
const IncidentTimeline = lazy(() => import('./components/IncidentTimeline'));

// Loading component
const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
    <span>Lade Monitoring Dashboard...</span>
  </div>
);

// Service definitions
const SERVICES = [
  { id: 'firebase', name: 'Firebase', icon: Database, critical: true },
  { id: 'api', name: 'API Gateway', icon: Globe, critical: true },
  { id: 'cdn', name: 'CDN (Cloudflare)', icon: Cloud, critical: false },
  { id: 'payment', name: 'Payment (Stripe)', icon: Shield, critical: true },
  { id: 'notification', name: 'Notifications', icon: Bell, critical: false },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, critical: false }
];

// Alert severity levels
const ALERT_LEVELS = {
  critical: { label: 'Kritisch', color: '#ef4444', icon: XCircle },
  error: { label: 'Fehler', color: '#f59e0b', icon: AlertTriangle },
  warning: { label: 'Warnung', color: '#f59e0b', icon: AlertCircle },
  info: { label: 'Info', color: '#3b82f6', icon: Info }
};

const MonitoringDashboard = () => {
  // State
  const [activeView, setActiveView] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [systemStatus, setSystemStatus] = useState('operational');
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [metrics, setMetrics] = useState({
    cpu: { current: 45, avg: 42, max: 78 },
    memory: { current: 62, avg: 58, max: 85 },
    disk: { current: 73, avg: 71, max: 73 },
    network: { in: 125, out: 89 },
    responseTime: { current: 145, avg: 132, max: 456 },
    errorRate: { current: 0.12, avg: 0.15, max: 0.89 },
    uptime: 99.98,
    requests: { total: 1456789, rate: 234 }
  });
  const [services, setServices] = useState({});
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Load monitoring data
  useEffect(() => {
    const loadMonitoringData = async () => {
      setLoading(true);
      try {
        // Simulate API calls
        await Promise.all([
          loadSystemStatus(),
          loadActiveAlerts(),
          loadServiceStatus(),
          loadIncidents()
        ]);
      } catch (error) {
        console.error('Error loading monitoring data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMonitoringData();
    
    // Setup auto-refresh
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadMonitoringData, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);
  
  // Load system status
  const loadSystemStatus = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if any critical service is down
    const hasIssues = Math.random() > 0.9;
    setSystemStatus(hasIssues ? 'degraded' : 'operational');
  };
  
  // Load active alerts
  const loadActiveAlerts = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const mockAlerts = [
      {
        id: 1,
        severity: 'warning',
        title: 'Hohe CPU-Auslastung',
        message: 'CPU-Auslastung über 80% seit 5 Minuten',
        service: 'api',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        acknowledged: false
      },
      {
        id: 2,
        severity: 'info',
        title: 'Geplante Wartung',
        message: 'Systemwartung geplant für Dienstag 02:00-04:00 MEZ',
        service: 'system',
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
        acknowledged: true
      }
    ];
    
    setActiveAlerts(mockAlerts);
  };
  
  // Load service status
  const loadServiceStatus = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const statuses = {};
    SERVICES.forEach(service => {
      statuses[service.id] = {
        status: Math.random() > 0.95 ? 'down' : Math.random() > 0.9 ? 'degraded' : 'operational',
        responseTime: Math.floor(Math.random() * 200) + 50,
        uptime: 99.5 + Math.random() * 0.5,
        lastCheck: new Date().toISOString()
      };
    });
    
    setServices(statuses);
  };
  
  // Load incidents
  const loadIncidents = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const mockIncidents = [
      {
        id: 1,
        title: 'API Gateway Timeout',
        status: 'resolved',
        severity: 'error',
        startTime: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
        endTime: new Date(Date.now() - 1.5 * 60 * 60000).toISOString(),
        affectedServices: ['api'],
        description: 'Erhöhte Response-Zeiten durch Traffic-Spike'
      }
    ];
    
    setIncidents(mockIncidents);
  };
  
  // Calculate system health score
  const healthScore = useMemo(() => {
    const cpuScore = 100 - metrics.cpu.current;
    const memoryScore = 100 - metrics.memory.current;
    const errorScore = Math.max(0, 100 - (metrics.errorRate.current * 100));
    const uptimeScore = metrics.uptime;
    
    return Math.round((cpuScore + memoryScore + errorScore + uptimeScore) / 4);
  }, [metrics]);
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'var(--success)';
      case 'degraded': return 'var(--warning)';
      case 'down': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };
  
  // Navigate to detail view
  const handleNavigateToDetail = (view) => {
    setActiveView(view);
  };
  
  // Render main overview
  const renderOverview = () => (
    <>
      {/* System Status Hero */}
      <div className={styles.statusHero}>
        <div className={styles.statusIcon} data-status={systemStatus}>
          {systemStatus === 'operational' ? <CheckCircle size={48} /> :
           systemStatus === 'degraded' ? <AlertCircle size={48} /> :
           <XCircle size={48} />}
        </div>
        <div className={styles.statusInfo}>
          <h2>System Status: {systemStatus === 'operational' ? 'Betriebsbereit' : 
                              systemStatus === 'degraded' ? 'Beeinträchtigt' : 'Ausfall'}</h2>
          <p>Gesundheitsscore: {healthScore}% | Uptime: {metrics.uptime}%</p>
        </div>
        <div className={styles.statusActions}>
          <button 
            className={styles.refreshButton}
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={20} />
            Aktualisieren
          </button>
          <button className={styles.reportButton}>
            <Download size={20} />
            Report
          </button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className={styles.quickStats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: 'var(--primary)' }}>
            <Activity size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Requests/s</span>
            <span className={styles.statValue}>{metrics.requests.rate}</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: 'var(--success)' }}>
            <Clock size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Avg Response</span>
            <span className={styles.statValue}>{metrics.responseTime.avg}ms</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: 'var(--warning)' }}>
            <AlertTriangle size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Error Rate</span>
            <span className={styles.statValue}>{metrics.errorRate.current}%</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: 'var(--purple)' }}>
            <Bell size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Active Alerts</span>
            <span className={styles.statValue}>{activeAlerts.length}</span>
          </div>
        </div>
      </div>
      
      {/* Service Status Grid */}
      <div className={styles.servicesSection}>
        <h3>Service Status</h3>
        <div className={styles.servicesGrid}>
          {SERVICES.map(service => {
            const status = services[service.id];
            const Icon = service.icon;
            
            return (
              <div 
                key={service.id}
                className={styles.serviceCard}
                data-status={status?.status || 'loading'}
                onClick={() => handleNavigateToDetail('services')}
              >
                <div className={styles.serviceHeader}>
                  <Icon size={24} />
                  <span className={styles.serviceName}>{service.name}</span>
                  {service.critical && (
                    <span className={styles.criticalBadge}>Critical</span>
                  )}
                </div>
                <div className={styles.serviceMetrics}>
                  <div className={styles.serviceMetric}>
                    <span>Response</span>
                    <strong>{status?.responseTime || '--'}ms</strong>
                  </div>
                  <div className={styles.serviceMetric}>
                    <span>Uptime</span>
                    <strong>{status?.uptime?.toFixed(2) || '--'}%</strong>
                  </div>
                </div>
                <div 
                  className={styles.serviceStatus}
                  style={{ backgroundColor: getStatusColor(status?.status) }}
                >
                  {status?.status || 'loading'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className={styles.alertsSection}>
          <div className={styles.sectionHeader}>
            <h3>Aktive Alerts</h3>
            <button 
              className={styles.viewAllButton}
              onClick={() => handleNavigateToDetail('alerts')}
            >
              Alle anzeigen
              <ChevronRight size={16} />
            </button>
          </div>
          <div className={styles.alertsList}>
            {activeAlerts.slice(0, 3).map(alert => {
              const level = ALERT_LEVELS[alert.severity];
              const Icon = level.icon;
              
              return (
                <div 
                  key={alert.id}
                  className={styles.alertCard}
                  data-severity={alert.severity}
                >
                  <div 
                    className={styles.alertIcon}
                    style={{ backgroundColor: `${level.color}20`, color: level.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className={styles.alertContent}>
                    <h4>{alert.title}</h4>
                    <p>{alert.message}</p>
                    <div className={styles.alertMeta}>
                      <span>{new Date(alert.timestamp).toLocaleString('de-CH')}</span>
                      <span>•</span>
                      <span>{alert.service}</span>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button className={styles.acknowledgeButton}>
                      Bestätigen
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Recent Incidents */}
      <div className={styles.incidentsSection}>
        <div className={styles.sectionHeader}>
          <h3>Letzte Vorfälle</h3>
          <button 
            className={styles.viewAllButton}
            onClick={() => handleNavigateToDetail('incidents')}
          >
            Alle anzeigen
            <ChevronRight size={16} />
          </button>
        </div>
        <Suspense fallback={<LoadingSpinner />}>
          <IncidentTimeline incidents={incidents} />
        </Suspense>
      </div>
    </>
  );
  
  // Render loading state
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>System Monitoring</h1>
          <p>Echtzeit-Überwachung aller Systemkomponenten</p>
        </div>
        
        <div className={styles.headerRight}>
          {/* Auto Refresh Toggle */}
          <div className={styles.autoRefreshControl}>
            <button
              className={`${styles.autoRefreshButton} ${autoRefresh ? styles.active : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <RefreshCw size={18} className={styles.spinning} /> : <RefreshCw size={18} />}
              Auto-Refresh: {autoRefresh ? 'An' : 'Aus'}
            </button>
            {autoRefresh && (
              <select 
                className={styles.intervalSelect}
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
              >
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>1m</option>
              </select>
            )}
          </div>
          
          {/* View Selector */}
          <div className={styles.viewSelector}>
            <button
              className={`${styles.viewButton} ${activeView === 'overview' ? styles.active : ''}`}
              onClick={() => setActiveView('overview')}
            >
              <Monitor size={18} />
              Übersicht
            </button>
            <button
              className={`${styles.viewButton} ${activeView === 'health' ? styles.active : ''}`}
              onClick={() => setActiveView('health')}
            >
              <Activity size={18} />
              System Health
            </button>
            <button
              className={`${styles.viewButton} ${activeView === 'errors' ? styles.active : ''}`}
              onClick={() => setActiveView('errors')}
            >
              <Bug size={18} />
              Fehler
            </button>
            <button
              className={`${styles.viewButton} ${activeView === 'performance' ? styles.active : ''}`}
              onClick={() => setActiveView('performance')}
            >
              <Zap size={18} />
              Performance
            </button>
            <button
              className={`${styles.viewButton} ${activeView === 'alerts' ? styles.active : ''}`}
              onClick={() => setActiveView('alerts')}
            >
              <Bell size={18} />
              Alerts
              {activeAlerts.length > 0 && (
                <span className={styles.alertBadge}>{activeAlerts.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className={styles.content}>
        <Suspense fallback={<LoadingSpinner />}>
          {activeView === 'overview' && renderOverview()}
          {activeView === 'health' && <SystemHealth />}
          {activeView === 'errors' && <ErrorTracking />}
          {activeView === 'performance' && <PerformanceMetrics />}
          {activeView === 'alerts' && <AlertManager alerts={activeAlerts} />}
        </Suspense>
      </div>
    </div>
  );
};

export default MonitoringDashboard;