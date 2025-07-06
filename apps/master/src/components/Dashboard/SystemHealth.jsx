/**
 * EATECH - System Health Component
 * Version: 1.0.0
 * Description: Echtzeit-Überwachung der Systemgesundheit und Services
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/components/Dashboard/SystemHealth.jsx
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Server,
  Database,
  Shield,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  WifiOff,
  Cpu,
  HardDrive,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Terminal,
  Globe,
  Lock,
  Cloud,
  GitBranch,
  Package,
  Bell,
  DollarSign,
  BarChart3
} from 'lucide-react';
import styles from './SystemHealth.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const SERVICE_STATUS = {
  operational: { label: 'Operational', color: '#10b981', icon: CheckCircle },
  degraded: { label: 'Degraded', color: '#f59e0b', icon: AlertCircle },
  outage: { label: 'Outage', color: '#ef4444', icon: XCircle },
  maintenance: { label: 'Maintenance', color: '#8b5cf6', icon: Settings }
};

const SERVICES = {
  api: {
    name: 'API Gateway',
    icon: Server,
    description: 'Main API endpoints',
    endpoints: ['REST API', 'GraphQL', 'WebSocket'],
    metrics: ['latency', 'requests', 'errors']
  },
  database: {
    name: 'Database Cluster',
    icon: Database,
    description: 'Firebase Firestore',
    endpoints: ['Primary', 'Read Replicas'],
    metrics: ['queries', 'latency', 'connections']
  },
  auth: {
    name: 'Authentication',
    icon: Shield,
    description: 'Firebase Auth Service',
    endpoints: ['OAuth', 'JWT', 'Sessions'],
    metrics: ['logins', 'failures', 'active']
  },
  storage: {
    name: 'File Storage',
    icon: HardDrive,
    description: 'Cloud Storage',
    endpoints: ['Images', 'Documents', 'Backups'],
    metrics: ['usage', 'bandwidth', 'operations']
  },
  functions: {
    name: 'Cloud Functions',
    icon: Zap,
    description: 'Serverless compute',
    endpoints: ['Triggers', 'Scheduled', 'HTTP'],
    metrics: ['executions', 'duration', 'errors']
  },
  notifications: {
    name: 'Notifications',
    icon: Bell,
    description: 'Push & Email service',
    endpoints: ['FCM', 'SendGrid', 'SMS'],
    metrics: ['sent', 'delivered', 'failed']
  },
  payments: {
    name: 'Payment Gateway',
    icon: DollarSign,
    description: 'Stripe integration',
    endpoints: ['Checkout', 'Webhooks', 'Refunds'],
    metrics: ['transactions', 'volume', 'failures']
  },
  analytics: {
    name: 'Analytics Engine',
    icon: BarChart3,
    description: 'Real-time analytics',
    endpoints: ['Events', 'Sessions', 'Reports'],
    metrics: ['events', 'latency', 'queue']
  }
};

const REGIONS = {
  'eu-west': { name: 'Europe West', latency: 12 },
  'eu-central': { name: 'Europe Central', latency: 8 },
  'us-east': { name: 'US East', latency: 120 },
  'asia-pac': { name: 'Asia Pacific', latency: 180 }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const generateServiceHealth = () => {
  const statuses = ['operational', 'operational', 'operational', 'degraded', 'outage'];
  const status = statuses[Math.floor(Math.random() * statuses.length * 0.3)]; // Bias towards operational
  
  return {
    status,
    uptime: status === 'operational' ? 99.9 + Math.random() * 0.09 : 95 + Math.random() * 4,
    responseTime: status === 'operational' ? 20 + Math.random() * 30 : 100 + Math.random() * 200,
    errorRate: status === 'operational' ? Math.random() * 0.1 : Math.random() * 5,
    load: Math.random() * 0.8 + 0.1,
    lastIncident: status !== 'operational' ? new Date(Date.now() - Math.random() * 3600000) : null
  };
};

const formatUptime = (uptime) => {
  return `${uptime.toFixed(2)}%`;
};

const formatDuration = (ms) => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const ServiceCard = ({ serviceKey, service, health, onViewDetails }) => {
  const Icon = service.icon;
  const status = SERVICE_STATUS[health.status];
  const StatusIcon = status.icon;
  
  const isHealthy = health.status === 'operational';
  const loadPercentage = health.load * 100;
  
  return (
    <div 
      className={`${styles.serviceCard} ${styles[health.status]}`}
      onClick={() => onViewDetails(serviceKey)}
    >
      <div className={styles.serviceHeader}>
        <div className={styles.serviceIcon}>
          <Icon size={24} />
        </div>
        <div className={styles.serviceInfo}>
          <h4>{service.name}</h4>
          <p>{service.description}</p>
        </div>
        <div 
          className={styles.statusIndicator}
          style={{ backgroundColor: status.color }}
        >
          <StatusIcon size={16} color="#ffffff" />
        </div>
      </div>
      
      <div className={styles.serviceMetrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Uptime</span>
          <span className={styles.metricValue}>{formatUptime(health.uptime)}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Response</span>
          <span className={styles.metricValue}>{health.responseTime.toFixed(0)}ms</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Errors</span>
          <span className={styles.metricValue}>{health.errorRate.toFixed(2)}%</span>
        </div>
      </div>
      
      <div className={styles.loadBar}>
        <div className={styles.loadLabel}>
          <span>Load</span>
          <span>{loadPercentage.toFixed(0)}%</span>
        </div>
        <div className={styles.loadTrack}>
          <div 
            className={styles.loadFill}
            style={{ 
              width: `${loadPercentage}%`,
              backgroundColor: loadPercentage > 80 ? '#ef4444' : loadPercentage > 60 ? '#f59e0b' : '#10b981'
            }}
          />
        </div>
      </div>
      
      {health.lastIncident && (
        <div className={styles.incidentInfo}>
          <AlertCircle size={14} />
          <span>Incident vor {formatDuration(Date.now() - health.lastIncident)}</span>
        </div>
      )}
      
      <div className={styles.endpoints}>
        {service.endpoints.map((endpoint, idx) => (
          <span key={idx} className={styles.endpoint}>{endpoint}</span>
        ))}
      </div>
    </div>
  );
};

const RegionStatus = ({ region, data }) => {
  const isHealthy = data.latency < 50;
  
  return (
    <div className={styles.regionCard}>
      <div className={styles.regionHeader}>
        <Globe size={16} />
        <span>{data.name}</span>
      </div>
      <div className={styles.regionMetrics}>
        <div className={styles.latency}>
          <span className={isHealthy ? styles.healthy : styles.warning}>
            {data.latency}ms
          </span>
        </div>
        <div className={styles.regionStatus}>
          <span className={styles.statusDot} style={{
            backgroundColor: isHealthy ? '#10b981' : '#f59e0b'
          }} />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const SystemHealth = ({ 
  refreshInterval = 30000,
  onServiceClick,
  compactView = false 
}) => {
  const [servicesHealth, setServicesHealth] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Initialize services health
  useEffect(() => {
    const health = {};
    Object.keys(SERVICES).forEach(key => {
      health[key] = generateServiceHealth();
    });
    setServicesHealth(health);
  }, []);
  
  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refreshHealth();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  // Calculate overall health
  const overallHealth = useMemo(() => {
    const statuses = Object.values(servicesHealth);
    if (statuses.length === 0) return 'operational';
    
    if (statuses.some(s => s.status === 'outage')) return 'outage';
    if (statuses.some(s => s.status === 'degraded')) return 'degraded';
    if (statuses.some(s => s.status === 'maintenance')) return 'maintenance';
    return 'operational';
  }, [servicesHealth]);
  
  const healthySystems = useMemo(() => {
    return Object.values(servicesHealth).filter(s => s.status === 'operational').length;
  }, [servicesHealth]);
  
  const refreshHealth = () => {
    setIsRefreshing(true);
    
    // Simulate refresh
    setTimeout(() => {
      const health = {};
      Object.keys(SERVICES).forEach(key => {
        health[key] = generateServiceHealth();
      });
      setServicesHealth(health);
      setLastUpdate(Date.now());
      setIsRefreshing(false);
    }, 1000);
  };
  
  const handleServiceClick = (serviceKey) => {
    setSelectedService(serviceKey);
    if (onServiceClick) {
      onServiceClick(serviceKey);
    }
  };
  
  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };
  
  const overallStatus = SERVICE_STATUS[overallHealth];
  const OverallIcon = overallStatus.icon;
  
  return (
    <div className={`${styles.systemHealth} ${compactView ? styles.compact : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3>System Health</h3>
          <div 
            className={styles.overallStatus}
            style={{ color: overallStatus.color }}
          >
            <OverallIcon size={18} />
            <span>{overallStatus.label}</span>
          </div>
        </div>
        
        <div className={styles.headerRight}>
          <span className={styles.updateTime}>
            <Clock size={14} />
            {getTimeSinceUpdate()}
          </span>
          <button
            className={`${styles.refreshButton} ${isRefreshing ? styles.spinning : ''}`}
            onClick={refreshHealth}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{healthySystems}/{Object.keys(SERVICES).length}</span>
          <span className={styles.summaryLabel}>Healthy Systems</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>99.95%</span>
          <span className={styles.summaryLabel}>Overall Uptime</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>28ms</span>
          <span className={styles.summaryLabel}>Avg Response</span>
        </div>
      </div>
      
      {/* Services Grid */}
      <div className={styles.servicesGrid}>
        {Object.entries(SERVICES).map(([key, service]) => (
          <ServiceCard
            key={key}
            serviceKey={key}
            service={service}
            health={servicesHealth[key] || {}}
            onViewDetails={handleServiceClick}
          />
        ))}
      </div>
      
      {/* Regions */}
      {!compactView && (
        <div className={styles.regionsSection}>
          <h4>Regional Status</h4>
          <div className={styles.regionsGrid}>
            {Object.entries(REGIONS).map(([key, region]) => (
              <RegionStatus key={key} region={key} data={region} />
            ))}
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      {!compactView && (
        <div className={styles.quickActions}>
          <button className={styles.actionButton}>
            <Terminal size={16} />
            System Logs
          </button>
          <button className={styles.actionButton}>
            <Activity size={16} />
            Metrics Dashboard
          </button>
          <button className={styles.actionButton}>
            <GitBranch size={16} />
            Deploy Status
          </button>
          <button className={styles.actionButton}>
            <Settings size={16} />
            Configuration
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default SystemHealth;