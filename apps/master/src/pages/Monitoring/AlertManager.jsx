/**
 * EATECH - Alert Manager System
 * Version: 1.0.0
 * Description: Zentrales Alert-Management mit Regeln, Eskalationen,
 *              Benachrichtigungen und Incident-Response
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * Kapitel: Phase 5 - Master Control - Alert Management
 * File Path: /apps/master/src/pages/Monitoring/AlertManager.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push,
  update,
  set,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  off,
  equalTo
} from 'firebase/database';
import {
  Bell,
  BellOff,
  BellRing,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Timer,
  Calendar,
  User,
  Users,
  Mail,
  MessageSquare,
  Phone,
  Smartphone,
  Send,
  Shield,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Settings,
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  RefreshCw,
  Download,
  Upload,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  RotateCcw,
  Target,
  Crosshair,
  Flag,
  Tag,
  Hash,
  Layers,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Globe,
  Cloud,
  CloudOff,
  Lock,
  Unlock,
  Key,
  FileText,
  BarChart3,
  PieChart,
  LineChart,
  GitBranch,
  GitCommit,
  GitMerge,
  Package,
  Box,
  Archive,
  Folder,
  FolderOpen,
  Code,
  Terminal,
  Monitor,
  Gauge,
  Thermometer,
  Droplet,
  Wind,
  Sun,
  Moon,
  Star
} from 'lucide-react';
import styles from './AlertManager.module.css';

// Lazy loaded components
const AlertRuleEditor = lazy(() => import('./components/AlertRuleEditor'));
const AlertTimeline = lazy(() => import('./components/AlertTimeline'));
const IncidentDetails = lazy(() => import('./components/IncidentDetails'));
const EscalationChain = lazy(() => import('./components/EscalationChain'));

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
const ALERT_SEVERITIES = {
  critical: { 
    label: 'Kritisch', 
    icon: AlertOctagon, 
    color: '#ef4444',
    priority: 1,
    defaultTTL: 300000 // 5 minutes
  },
  high: { 
    label: 'Hoch', 
    icon: AlertTriangle, 
    color: '#f97316',
    priority: 2,
    defaultTTL: 900000 // 15 minutes
  },
  medium: { 
    label: 'Mittel', 
    icon: AlertCircle, 
    color: '#f59e0b',
    priority: 3,
    defaultTTL: 1800000 // 30 minutes
  },
  low: { 
    label: 'Niedrig', 
    icon: Info, 
    color: '#3b82f6',
    priority: 4,
    defaultTTL: 3600000 // 1 hour
  }
};

const ALERT_CATEGORIES = {
  system: { label: 'System', icon: Server, color: '#3b82f6' },
  performance: { label: 'Performance', icon: Gauge, color: '#10b981' },
  security: { label: 'Sicherheit', icon: Shield, color: '#ef4444' },
  network: { label: 'Netzwerk', icon: Wifi, color: '#8b5cf6' },
  database: { label: 'Datenbank', icon: Database, color: '#6366f1' },
  application: { label: 'Anwendung', icon: Package, color: '#f59e0b' },
  business: { label: 'Business', icon: TrendingUp, color: '#ec4899' },
  user: { label: 'Benutzer', icon: Users, color: '#14b8a6' }
};

const ALERT_STATES = {
  active: { label: 'Aktiv', color: '#ef4444' },
  acknowledged: { label: 'Bestätigt', color: '#f59e0b' },
  resolved: { label: 'Behoben', color: '#10b981' },
  suppressed: { label: 'Unterdrückt', color: '#6b7280' }
};

const NOTIFICATION_CHANNELS = {
  email: { label: 'E-Mail', icon: Mail, color: '#3b82f6' },
  sms: { label: 'SMS', icon: MessageSquare, color: '#10b981' },
  push: { label: 'Push', icon: Smartphone, color: '#8b5cf6' },
  slack: { label: 'Slack', icon: Hash, color: '#4a154b' },
  teams: { label: 'Teams', icon: Users, color: '#5558af' },
  webhook: { label: 'Webhook', icon: Globe, color: '#6366f1' },
  phone: { label: 'Anruf', icon: Phone, color: '#ef4444' }
};

const CONDITION_OPERATORS = {
  gt: { label: 'Größer als', symbol: '>' },
  gte: { label: 'Größer gleich', symbol: '>=' },
  lt: { label: 'Kleiner als', symbol: '<' },
  lte: { label: 'Kleiner gleich', symbol: '<=' },
  eq: { label: 'Gleich', symbol: '=' },
  neq: { label: 'Ungleich', symbol: '!=' },
  contains: { label: 'Enthält', symbol: '∋' },
  notContains: { label: 'Enthält nicht', symbol: '∌' }
};

const METRIC_TYPES = {
  cpu: { label: 'CPU', unit: '%', icon: Cpu },
  memory: { label: 'Speicher', unit: '%', icon: HardDrive },
  disk: { label: 'Festplatte', unit: '%', icon: Database },
  network: { label: 'Netzwerk', unit: 'ms', icon: Wifi },
  responseTime: { label: 'Antwortzeit', unit: 'ms', icon: Timer },
  errorRate: { label: 'Fehlerrate', unit: '%', icon: AlertTriangle },
  requestRate: { label: 'Anfragen', unit: '/s', icon: Activity },
  custom: { label: 'Benutzerdefiniert', unit: '', icon: Gauge }
};

const TIME_WINDOWS = {
  '1m': { label: '1 Minute', value: 60000 },
  '5m': { label: '5 Minuten', value: 300000 },
  '15m': { label: '15 Minuten', value: 900000 },
  '30m': { label: '30 Minuten', value: 1800000 },
  '1h': { label: '1 Stunde', value: 3600000 },
  '24h': { label: '24 Stunden', value: 86400000 }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const evaluateCondition = (value, operator, threshold) => {
  switch (operator) {
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    case 'eq': return value === threshold;
    case 'neq': return value !== threshold;
    case 'contains': return String(value).includes(String(threshold));
    case 'notContains': return !String(value).includes(String(threshold));
    default: return false;
  }
};

const calculateAlertStats = (alerts) => {
  const now = Date.now();
  const last24h = now - 86400000;
  
  const stats = {
    total: alerts.length,
    active: alerts.filter(a => a.state === 'active').length,
    acknowledged: alerts.filter(a => a.state === 'acknowledged').length,
    resolved: alerts.filter(a => a.state === 'resolved').length,
    last24h: alerts.filter(a => a.timestamp > last24h).length,
    bySeverity: {},
    byCategory: {},
    mttr: 0 // Mean Time To Resolution
  };
  
  // Count by severity
  Object.keys(ALERT_SEVERITIES).forEach(severity => {
    stats.bySeverity[severity] = alerts.filter(a => a.severity === severity).length;
  });
  
  // Count by category
  Object.keys(ALERT_CATEGORIES).forEach(category => {
    stats.byCategory[category] = alerts.filter(a => a.category === category).length;
  });
  
  // Calculate MTTR
  const resolvedAlerts = alerts.filter(a => a.state === 'resolved' && a.resolvedAt);
  if (resolvedAlerts.length > 0) {
    const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
      return sum + (alert.resolvedAt - alert.timestamp);
    }, 0);
    stats.mttr = totalResolutionTime / resolvedAlerts.length;
  }
  
  return stats;
};

const formatDuration = (ms) => {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
  return `${Math.round(ms / 86400000)}d`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const AlertManager = () => {
  // State Management
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedRule, setSelectedRule] = useState(null);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [filters, setFilters] = useState({
    state: 'all',
    severity: 'all',
    category: 'all',
    search: '',
    timeRange: '24h'
  });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    mute: false,
    channels: {
      email: true,
      sms: false,
      push: true,
      slack: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ========================================================================
  // FIREBASE LISTENERS
  // ========================================================================
  useEffect(() => {
    const alertsRef = query(
      ref(database, 'alerts'),
      orderByChild('timestamp'),
      limitToLast(500)
    );
    
    const rulesRef = ref(database, 'alertRules');
    const incidentsRef = query(
      ref(database, 'incidents'),
      orderByChild('timestamp'),
      limitToLast(100)
    );
    const contactsRef = ref(database, 'alertContacts');

    // Alerts listener
    const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
      if (snapshot.exists()) {
        const alertsList = [];
        snapshot.forEach((child) => {
          alertsList.unshift({ id: child.key, ...child.val() });
        });
        setAlerts(alertsList);
      } else {
        setAlerts([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Alerts error:', error);
      setError('Fehler beim Laden der Alerts');
      setLoading(false);
    });

    // Rules listener
    const unsubscribeRules = onValue(rulesRef, (snapshot) => {
      if (snapshot.exists()) {
        const rulesList = [];
        snapshot.forEach((child) => {
          rulesList.push({ id: child.key, ...child.val() });
        });
        setRules(rulesList);
      }
    });

    // Incidents listener
    const unsubscribeIncidents = onValue(incidentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const incidentsList = [];
        snapshot.forEach((child) => {
          incidentsList.unshift({ id: child.key, ...child.val() });
        });
        setIncidents(incidentsList);
      }
    });

    // Contacts listener
    const unsubscribeContacts = onValue(contactsRef, (snapshot) => {
      if (snapshot.exists()) {
        setContacts(snapshot.val());
      }
    });

    // Cleanup
    return () => {
      off(alertsRef);
      off(rulesRef);
      off(incidentsRef);
      off(contactsRef);
    };
  }, []);

  // ========================================================================
  // ALERT PROCESSING
  // ========================================================================
  useEffect(() => {
    // Check for new critical alerts
    const activeAlerts = alerts.filter(a => a.state === 'active');
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    
    if (criticalAlerts.length > 0 && !notificationSettings.mute) {
      // Play sound for critical alerts
      const audio = new Audio('/sounds/critical-alert.mp3');
      audio.play().catch(console.error);
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const latestAlert = criticalAlerts[0];
        new Notification('Kritischer Alert!', {
          body: latestAlert.message,
          icon: '/icons/alert-critical.png',
          badge: '/icons/badge.png',
          tag: latestAlert.id,
          requireInteraction: true
        });
      }
    }
  }, [alerts, notificationSettings.mute]);

  // ========================================================================
  // FILTERING
  // ========================================================================
  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];
    
    // State filter
    if (filters.state !== 'all') {
      filtered = filtered.filter(a => a.state === filters.state);
    }
    
    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(a => a.severity === filters.severity);
    }
    
    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(a => a.category === filters.category);
    }
    
    // Time range filter
    if (filters.timeRange !== 'all') {
      const cutoff = Date.now() - TIME_WINDOWS[filters.timeRange].value;
      filtered = filtered.filter(a => a.timestamp > cutoff);
    }
    
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.message?.toLowerCase().includes(search) ||
        a.source?.toLowerCase().includes(search) ||
        a.ruleId?.toLowerCase().includes(search)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'severity') {
        aVal = ALERT_SEVERITIES[a.severity]?.priority || 999;
        bVal = ALERT_SEVERITIES[b.severity]?.priority || 999;
      }
      
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });
    
    return filtered;
  }, [alerts, filters, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => calculateAlertStats(filteredAlerts), [filteredAlerts]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  const handleAcknowledgeAlert = useCallback(async (alertId) => {
    try {
      await update(ref(database, `alerts/${alertId}`), {
        state: 'acknowledged',
        acknowledgedAt: serverTimestamp(),
        acknowledgedBy: 'master-admin'
      });
      
      // Log to incident history
      await push(ref(database, `alerts/${alertId}/history`), {
        action: 'acknowledged',
        timestamp: serverTimestamp(),
        user: 'master-admin'
      });
    } catch (error) {
      console.error('Acknowledge error:', error);
    }
  }, []);

  const handleResolveAlert = useCallback(async (alertId, resolution = '') => {
    try {
      await update(ref(database, `alerts/${alertId}`), {
        state: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: 'master-admin',
        resolution
      });
      
      // Log to incident history
      await push(ref(database, `alerts/${alertId}/history`), {
        action: 'resolved',
        timestamp: serverTimestamp(),
        user: 'master-admin',
        resolution
      });
    } catch (error) {
      console.error('Resolve error:', error);
    }
  }, []);

  const handleSuppressAlert = useCallback(async (alertId, duration) => {
    try {
      const suppressUntil = Date.now() + duration;
      
      await update(ref(database, `alerts/${alertId}`), {
        state: 'suppressed',
        suppressedAt: serverTimestamp(),
        suppressedBy: 'master-admin',
        suppressUntil
      });
    } catch (error) {
      console.error('Suppress error:', error);
    }
  }, []);

  const handleCreateRule = useCallback(async (ruleData) => {
    try {
      const newRule = {
        ...ruleData,
        createdAt: serverTimestamp(),
        createdBy: 'master-admin',
        enabled: true,
        lastTriggered: null,
        triggerCount: 0
      };
      
      await push(ref(database, 'alertRules'), newRule);
      setShowRuleEditor(false);
      setSelectedRule(null);
    } catch (error) {
      console.error('Create rule error:', error);
    }
  }, []);

  const handleUpdateRule = useCallback(async (ruleId, updates) => {
    try {
      await update(ref(database, `alertRules/${ruleId}`), {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: 'master-admin'
      });
      
      if (selectedRule?.id === ruleId) {
        setSelectedRule({ ...selectedRule, ...updates });
      }
    } catch (error) {
      console.error('Update rule error:', error);
    }
  }, [selectedRule]);

  const handleDeleteRule = useCallback(async (ruleId) => {
    if (!confirm('Diese Regel wirklich löschen?')) return;
    
    try {
      await update(ref(database, `alertRules/${ruleId}`), null);
      
      if (selectedRule?.id === ruleId) {
        setSelectedRule(null);
      }
    } catch (error) {
      console.error('Delete rule error:', error);
    }
  }, [selectedRule]);

  const handleBulkAction = useCallback(async (action) => {
    const updates = {};
    
    selectedAlerts.forEach(alertId => {
      switch (action) {
        case 'acknowledge':
          updates[`alerts/${alertId}/state`] = 'acknowledged';
          updates[`alerts/${alertId}/acknowledgedAt`] = serverTimestamp();
          updates[`alerts/${alertId}/acknowledgedBy`] = 'master-admin';
          break;
        case 'resolve':
          updates[`alerts/${alertId}/state`] = 'resolved';
          updates[`alerts/${alertId}/resolvedAt`] = serverTimestamp();
          updates[`alerts/${alertId}/resolvedBy`] = 'master-admin';
          break;
        case 'suppress':
          updates[`alerts/${alertId}/state`] = 'suppressed';
          updates[`alerts/${alertId}/suppressedAt`] = serverTimestamp();
          updates[`alerts/${alertId}/suppressedBy`] = 'master-admin';
          updates[`alerts/${alertId}/suppressUntil`] = Date.now() + 3600000; // 1 hour
          break;
      }
    });
    
    try {
      await update(ref(database), updates);
      setSelectedAlerts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  }, [selectedAlerts]);

  const handleExportAlerts = useCallback(() => {
    const exportData = {
      exportDate: new Date().toISOString(),
      filters: filters,
      alerts: filteredAlerts,
      rules: rules,
      stats: stats
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAlerts, rules, stats, filters]);

  const handleTestAlert = useCallback(async () => {
    const testAlert = {
      severity: 'high',
      category: 'system',
      message: 'Test Alert - CPU usage exceeded 90%',
      source: 'system-monitor',
      metric: 'cpu',
      value: 92,
      threshold: 90,
      state: 'active',
      timestamp: serverTimestamp(),
      tags: ['test', 'cpu', 'performance']
    };
    
    try {
      await push(ref(database, 'alerts'), testAlert);
    } catch (error) {
      console.error('Test alert error:', error);
    }
  }, []);

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  const renderAlertRow = (alert) => {
    const SeverityIcon = ALERT_SEVERITIES[alert.severity]?.icon || AlertCircle;
    const CategoryIcon = ALERT_CATEGORIES[alert.category]?.icon || Package;
    const isSelected = selectedAlerts.has(alert.id);
    const rule = rules.find(r => r.id === alert.ruleId);
    
    return (
      <div 
        key={alert.id}
        className={styles.alertRow}
        data-state={alert.state}
        data-severity={alert.severity}
        onClick={() => setSelectedAlert(alert)}
      >
        <div className={styles.alertSelect}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              const newSet = new Set(selectedAlerts);
              if (isSelected) {
                newSet.delete(alert.id);
              } else {
                newSet.add(alert.id);
              }
              setSelectedAlerts(newSet);
            }}
          />
        </div>
        
        <div className={styles.alertIcons}>
          <SeverityIcon 
            size={20} 
            style={{ color: ALERT_SEVERITIES[alert.severity]?.color }}
          />
          <CategoryIcon 
            size={16} 
            style={{ color: ALERT_CATEGORIES[alert.category]?.color }}
          />
        </div>
        
        <div className={styles.alertInfo}>
          <div className={styles.alertMessage}>{alert.message}</div>
          <div className={styles.alertMeta}>
            <span className={styles.alertTime}>
              <Clock size={12} />
              {new Date(alert.timestamp).toLocaleString()}
            </span>
            {alert.source && (
              <span className={styles.alertSource}>
                <Server size={12} />
                {alert.source}
              </span>
            )}
            {rule && (
              <span className={styles.alertRule}>
                <Flag size={12} />
                {rule.name}
              </span>
            )}
          </div>
        </div>
        
        <div className={styles.alertState}>
          <span className={styles.stateLabel} data-state={alert.state}>
            {ALERT_STATES[alert.state]?.label}
          </span>
        </div>
        
        <div className={styles.alertActions} onClick={(e) => e.stopPropagation()}>
          {alert.state === 'active' && (
            <button
              className={styles.actionButton}
              onClick={() => handleAcknowledgeAlert(alert.id)}
              title="Bestätigen"
            >
              <CheckCircle size={16} />
            </button>
          )}
          
          {(alert.state === 'active' || alert.state === 'acknowledged') && (
            <button
              className={styles.actionButton}
              onClick={() => handleResolveAlert(alert.id)}
              title="Beheben"
            >
              <Check size={16} />
            </button>
          )}
          
          <button
            className={styles.actionButton}
            onClick={() => handleSuppressAlert(alert.id, 3600000)}
            title="1h unterdrücken"
          >
            <BellOff size={16} />
          </button>
          
          <button
            className={styles.moreButton}
            onClick={(e) => {
              e.stopPropagation();
              // Show context menu
            }}
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderRuleCard = (rule) => {
    const MetricIcon = METRIC_TYPES[rule.metric]?.icon || Gauge;
    const isActive = rule.enabled;
    
    return (
      <div 
        key={rule.id}
        className={styles.ruleCard}
        data-active={isActive}
        onClick={() => setSelectedRule(rule)}
      >
        <div className={styles.ruleHeader}>
          <div className={styles.ruleIcon}>
            <MetricIcon size={20} />
          </div>
          <div className={styles.ruleInfo}>
            <h4>{rule.name}</h4>
            <p>{rule.description}</p>
          </div>
          <div className={styles.ruleToggle}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUpdateRule(rule.id, { enabled: !isActive });
              }}
              className={styles.toggleButton}
              data-active={isActive}
            >
              {isActive ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
          </div>
        </div>
        
        <div className={styles.ruleCondition}>
          <span className={styles.conditionMetric}>
            {METRIC_TYPES[rule.metric]?.label}
          </span>
          <span className={styles.conditionOperator}>
            {CONDITION_OPERATORS[rule.operator]?.symbol}
          </span>
          <span className={styles.conditionThreshold}>
            {rule.threshold}{METRIC_TYPES[rule.metric]?.unit}
          </span>
          <span className={styles.conditionWindow}>
            für {TIME_WINDOWS[rule.timeWindow]?.label}
          </span>
        </div>
        
        <div className={styles.ruleFooter}>
          <div className={styles.ruleSeverity}>
            <span 
              className={styles.severityBadge}
              style={{ 
                backgroundColor: ALERT_SEVERITIES[rule.severity]?.color + '20',
                color: ALERT_SEVERITIES[rule.severity]?.color
              }}
            >
              {ALERT_SEVERITIES[rule.severity]?.label}
            </span>
          </div>
          
          <div className={styles.ruleStats}>
            {rule.lastTriggered && (
              <span>
                <Clock size={12} />
                Zuletzt: {new Date(rule.lastTriggered).toLocaleDateString()}
              </span>
            )}
            <span>
              <BellRing size={12} />
              {rule.triggerCount || 0} Auslösungen
            </span>
          </div>
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
        <p>Lade Alert Manager...</p>
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

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Alert Manager</h1>
          <p>Zentrale Überwachung und Incident Response</p>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.headerStats}>
            <div className={styles.statCard} data-severity="critical">
              <AlertOctagon size={24} />
              <div>
                <span className={styles.statValue}>{stats.bySeverity.critical || 0}</span>
                <span className={styles.statLabel}>Kritisch</span>
              </div>
            </div>
            <div className={styles.statCard} data-state="active">
              <Bell size={24} />
              <div>
                <span className={styles.statValue}>{stats.active}</span>
                <span className={styles.statLabel}>Aktiv</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <Timer size={24} />
              <div>
                <span className={styles.statValue}>{formatDuration(stats.mttr)}</span>
                <span className={styles.statLabel}>MTTR</span>
              </div>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <button
              className={styles.muteButton}
              onClick={() => setNotificationSettings({
                ...notificationSettings,
                mute: !notificationSettings.mute
              })}
              data-muted={notificationSettings.mute}
            >
              {notificationSettings.mute ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            <button
              className={styles.testButton}
              onClick={handleTestAlert}
            >
              <Play size={20} />
              Test
            </button>
            
            <button
              className={styles.exportButton}
              onClick={handleExportAlerts}
            >
              <Download size={20} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          {/* Alert Stats */}
          <div className={styles.sidebarSection}>
            <h3>Alert Übersicht</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statItemLabel}>Letzte 24h</span>
                <span className={styles.statItemValue}>{stats.last24h}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statItemLabel}>Bestätigt</span>
                <span className={styles.statItemValue}>{stats.acknowledged}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statItemLabel}>Behoben</span>
                <span className={styles.statItemValue}>{stats.resolved}</span>
              </div>
            </div>
          </div>
          
          {/* Severity Distribution */}
          <div className={styles.sidebarSection}>
            <h3>Nach Schweregrad</h3>
            <div className={styles.severityBars}>
              {Object.entries(ALERT_SEVERITIES).map(([severity, config]) => {
                const count = stats.bySeverity[severity] || 0;
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                
                return (
                  <div key={severity} className={styles.severityBar}>
                    <div className={styles.severityHeader}>
                      <span>{config.label}</span>
                      <span>{count}</span>
                    </div>
                    <div className={styles.severityTrack}>
                      <div 
                        className={styles.severityFill}
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: config.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className={styles.sidebarSection}>
            <h3>Schnellaktionen</h3>
            <div className={styles.quickActions}>
              <button
                className={styles.quickAction}
                onClick={() => setShowRuleEditor(true)}
              >
                <Plus size={16} />
                Neue Regel
              </button>
              <button
                className={styles.quickAction}
                onClick={() => setFilters({ ...filters, state: 'active' })}
              >
                <Bell size={16} />
                Aktive Alerts
              </button>
              <button
                className={styles.quickAction}
                onClick={() => {/* Show escalation settings */}}
              >
                <Users size={16} />
                Eskalation
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className={styles.content}>
          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <select 
                value={filters.state}
                onChange={(e) => setFilters({...filters, state: e.target.value})}
                className={styles.filterSelect}
              >
                <option value="all">Alle Status</option>
                {Object.entries(ALERT_STATES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              
              <select 
                value={filters.severity}
                onChange={(e) => setFilters({...filters, severity: e.target.value})}
                className={styles.filterSelect}
              >
                <option value="all">Alle Schweregrade</option>
                {Object.entries(ALERT_SEVERITIES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              
              <select 
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className={styles.filterSelect}
              >
                <option value="all">Alle Kategorien</option>
                {Object.entries(ALERT_CATEGORIES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.searchBox}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Alerts durchsuchen..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className={styles.searchInput}
              />
            </div>
            
            {selectedAlerts.size > 0 && (
              <div className={styles.bulkActions}>
                <span>{selectedAlerts.size} ausgewählt</span>
                <button onClick={() => handleBulkAction('acknowledge')}>
                  <CheckCircle size={16} />
                  Bestätigen
                </button>
                <button onClick={() => handleBulkAction('resolve')}>
                  <Check size={16} />
                  Beheben
                </button>
                <button onClick={() => setSelectedAlerts(new Set())}>
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Alert List */}
          <div className={styles.alertList}>
            <div className={styles.listHeader}>
              <div className={styles.headerCell} style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedAlerts.size === filteredAlerts.length && filteredAlerts.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAlerts(new Set(filteredAlerts.map(a => a.id)));
                    } else {
                      setSelectedAlerts(new Set());
                    }
                  }}
                />
              </div>
              <div className={styles.headerCell}>Alert</div>
              <div className={styles.headerCell} style={{ width: '120px' }}>Status</div>
              <div className={styles.headerCell} style={{ width: '150px' }}>Aktionen</div>
            </div>
            
            {filteredAlerts.length === 0 ? (
              <div className={styles.emptyState}>
                <CheckCircle size={48} />
                <h3>Keine Alerts</h3>
                <p>Großartig! Es gibt keine Alerts mit den aktuellen Filtern.</p>
              </div>
            ) : (
              <div className={styles.alertRows}>
                {filteredAlerts.map(alert => renderAlertRow(alert))}
              </div>
            )}
          </div>

          {/* Alert Rules */}
          <div className={styles.rulesSection}>
            <div className={styles.sectionHeader}>
              <h2>Alert Regeln</h2>
              <button
                className={styles.addButton}
                onClick={() => setShowRuleEditor(true)}
              >
                <Plus size={20} />
                Neue Regel
              </button>
            </div>
            
            <div className={styles.rulesGrid}>
              {rules.map(rule => renderRuleCard(rule))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showRuleEditor && (
        <Suspense fallback={<div>Lade Editor...</div>}>
          <AlertRuleEditor
            rule={selectedRule}
            onSave={selectedRule ? 
              (data) => handleUpdateRule(selectedRule.id, data) : 
              handleCreateRule
            }
            onClose={() => {
              setShowRuleEditor(false);
              setSelectedRule(null);
            }}
          />
        </Suspense>
      )}
      
      {selectedAlert && (
        <Suspense fallback={<div>Lade Details...</div>}>
          <IncidentDetails
            alert={selectedAlert}
            rules={rules}
            onClose={() => setSelectedAlert(null)}
            onResolve={(resolution) => handleResolveAlert(selectedAlert.id, resolution)}
          />
        </Suspense>
      )}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default AlertManager;