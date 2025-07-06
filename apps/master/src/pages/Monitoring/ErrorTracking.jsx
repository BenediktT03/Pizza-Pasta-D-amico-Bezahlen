/**
 * EATECH - Error Tracking System
 * Version: 1.0.0
 * Description: Umfassendes Error-Tracking mit Sentry-Integration, 
 *              Stack-Trace-Analyse und automatischer Fehlergruppierung
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * Kapitel: Phase 5 - Master Control - Error Management
 * File Path: /apps/master/src/pages/Monitoring/ErrorTracking.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push,
  update,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  off,
  equalTo
} from 'firebase/database';
import {
  AlertTriangle,
  XCircle,
  AlertCircle,
  Info,
  Bug,
  Code,
  Terminal,
  FileText,
  Search,
  Filter,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Globe,
  Smartphone,
  Monitor,
  Chrome,
  Compass,
  RefreshCw,
  Download,
  Archive,
  CheckCircle,
  Tag,
  Hash,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Shield,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  X,
  Plus,
  Minus,
  MessageSquare,
  UserCheck,
  GitBranch,
  GitCommit,
  Package,
  Layers,
  Database,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Bell,
  BellOff,
  Mail,
  Send,
  Trash2,
  Edit,
  Save,
  Settings,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Repeat,
  RotateCcw,
  Play,
  Pause,
  Square,
  SkipForward,
  Volume2,
  VolumeX
} from 'lucide-react';
import styles from './ErrorTracking.module.css';

// Lazy loaded components
const ErrorDetails = lazy(() => import('./components/ErrorDetails'));
const StackTrace = lazy(() => import('./components/StackTrace'));
const ErrorTimeline = lazy(() => import('./components/ErrorTimeline'));
const AffectedUsers = lazy(() => import('./components/AffectedUsers'));

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
const ERROR_SEVERITIES = {
  critical: { label: 'Kritisch', color: '#ef4444', icon: XCircle },
  error: { label: 'Fehler', color: '#f59e0b', icon: AlertTriangle },
  warning: { label: 'Warnung', color: '#f59e0b', icon: AlertCircle },
  info: { label: 'Info', color: '#3b82f6', icon: Info }
};

const ERROR_CATEGORIES = {
  javascript: { label: 'JavaScript', icon: Code, color: '#f7df1e' },
  network: { label: 'Netzwerk', icon: Wifi, color: '#10b981' },
  api: { label: 'API', icon: Server, color: '#8b5cf6' },
  database: { label: 'Datenbank', icon: Database, color: '#6366f1' },
  auth: { label: 'Authentifizierung', icon: Shield, color: '#ef4444' },
  payment: { label: 'Zahlung', icon: Shield, color: '#f59e0b' },
  ui: { label: 'UI/UX', icon: Monitor, color: '#3b82f6' },
  performance: { label: 'Performance', icon: Zap, color: '#10b981' }
};

const BROWSERS = {
  chrome: { label: 'Chrome', icon: Chrome },
  firefox: { label: 'Firefox', icon: Compass },
  safari: { label: 'Safari', icon: Compass },
  edge: { label: 'Edge', icon: Globe },
  other: { label: 'Andere', icon: Globe }
};

const PLATFORMS = {
  desktop: { label: 'Desktop', icon: Monitor },
  mobile: { label: 'Mobile', icon: Smartphone },
  tablet: { label: 'Tablet', icon: Smartphone }
};

const TIME_RANGES = {
  '1h': { label: '1 Stunde', value: 3600000 },
  '24h': { label: '24 Stunden', value: 86400000 },
  '7d': { label: '7 Tage', value: 604800000 },
  '30d': { label: '30 Tage', value: 2592000000 },
  'all': { label: 'Alle', value: null }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const groupErrorsByMessage = (errors) => {
  const groups = {};
  
  errors.forEach(error => {
    const key = error.message || 'Unknown Error';
    if (!groups[key]) {
      groups[key] = {
        message: key,
        count: 0,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        severity: error.severity,
        category: error.category,
        errors: []
      };
    }
    
    groups[key].count++;
    groups[key].lastSeen = Math.max(groups[key].lastSeen, error.timestamp);
    groups[key].errors.push(error);
  });
  
  return Object.values(groups).sort((a, b) => b.lastSeen - a.lastSeen);
};

const calculateErrorStats = (errors) => {
  const now = Date.now();
  const last24h = errors.filter(e => now - e.timestamp < 86400000);
  const previous24h = errors.filter(e => 
    e.timestamp > now - 172800000 && e.timestamp <= now - 86400000
  );
  
  const stats = {
    total: errors.length,
    last24h: last24h.length,
    trend: last24h.length - previous24h.length,
    bySeverity: {},
    byCategory: {},
    byBrowser: {},
    byPlatform: {},
    affectedUsers: new Set(errors.map(e => e.userId).filter(Boolean)).size,
    errorRate: last24h.length / 24 // errors per hour
  };
  
  // Count by severity
  Object.keys(ERROR_SEVERITIES).forEach(severity => {
    stats.bySeverity[severity] = errors.filter(e => e.severity === severity).length;
  });
  
  // Count by category
  Object.keys(ERROR_CATEGORIES).forEach(category => {
    stats.byCategory[category] = errors.filter(e => e.category === category).length;
  });
  
  // Count by browser
  errors.forEach(error => {
    const browser = error.browser || 'other';
    stats.byBrowser[browser] = (stats.byBrowser[browser] || 0) + 1;
  });
  
  // Count by platform
  errors.forEach(error => {
    const platform = error.platform || 'desktop';
    stats.byPlatform[platform] = (stats.byPlatform[platform] || 0) + 1;
  });
  
  return stats;
};

const parseStackTrace = (stack) => {
  if (!stack) return [];
  
  const lines = stack.split('\n');
  const frames = [];
  
  lines.forEach(line => {
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (match) {
      frames.push({
        function: match[1],
        file: match[2],
        line: parseInt(match[3]),
        column: parseInt(match[4])
      });
    }
  });
  
  return frames;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ErrorTracking = () => {
  // State Management
  const [errors, setErrors] = useState([]);
  const [filteredErrors, setFilteredErrors] = useState([]);
  const [errorGroups, setErrorGroups] = useState([]);
  const [selectedError, setSelectedError] = useState(null);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    severity: 'all',
    category: 'all',
    browser: 'all',
    platform: 'all',
    timeRange: '24h',
    search: '',
    resolved: false
  });
  const [sortBy, setSortBy] = useState('lastSeen');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedErrors, setSelectedErrors] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ========================================================================
  // FIREBASE LISTENERS
  // ========================================================================
  useEffect(() => {
    const errorsRef = query(
      ref(database, 'errors'),
      orderByChild('timestamp'),
      limitToLast(1000)
    );

    const unsubscribe = onValue(errorsRef, (snapshot) => {
      if (snapshot.exists()) {
        const errorList = [];
        snapshot.forEach((child) => {
          errorList.unshift({ id: child.key, ...child.val() });
        });
        setErrors(errorList);
        setLoading(false);
      } else {
        setErrors([]);
        setLoading(false);
      }
    }, (error) => {
      console.error('Error loading errors:', error);
      setError('Fehler beim Laden der Fehler');
      setLoading(false);
    });

    return () => {
      off(errorsRef);
    };
  }, []);

  // ========================================================================
  // FILTERING & GROUPING
  // ========================================================================
  useEffect(() => {
    let filtered = [...errors];
    
    // Apply filters
    if (filters.severity !== 'all') {
      filtered = filtered.filter(e => e.severity === filters.severity);
    }
    
    if (filters.category !== 'all') {
      filtered = filtered.filter(e => e.category === filters.category);
    }
    
    if (filters.browser !== 'all') {
      filtered = filtered.filter(e => e.browser === filters.browser);
    }
    
    if (filters.platform !== 'all') {
      filtered = filtered.filter(e => e.platform === filters.platform);
    }
    
    if (filters.timeRange !== 'all') {
      const cutoff = Date.now() - TIME_RANGES[filters.timeRange].value;
      filtered = filtered.filter(e => e.timestamp > cutoff);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.message?.toLowerCase().includes(searchLower) ||
        e.stack?.toLowerCase().includes(searchLower) ||
        e.url?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.resolved) {
      filtered = filtered.filter(e => e.resolved);
    } else {
      filtered = filtered.filter(e => !e.resolved);
    }
    
    setFilteredErrors(filtered);
    
    // Group errors
    const groups = groupErrorsByMessage(filtered);
    
    // Sort groups
    const sorted = [...groups].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });
    
    setErrorGroups(sorted);
    
    // Calculate stats
    setStats(calculateErrorStats(filtered));
  }, [errors, filters, sortBy, sortOrder]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  const handleResolveError = useCallback(async (errorId) => {
    try {
      await update(ref(database, `errors/${errorId}`), {
        resolved: true,
        resolvedAt: serverTimestamp(),
        resolvedBy: 'master-admin'
      });
    } catch (error) {
      console.error('Error resolving:', error);
    }
  }, []);

  const handleBulkResolve = useCallback(async () => {
    const updates = {};
    selectedErrors.forEach(errorId => {
      updates[`errors/${errorId}/resolved`] = true;
      updates[`errors/${errorId}/resolvedAt`] = serverTimestamp();
      updates[`errors/${errorId}/resolvedBy`] = 'master-admin';
    });
    
    try {
      await update(ref(database), updates);
      setSelectedErrors(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk resolve error:', error);
    }
  }, [selectedErrors]);

  const handleDeleteError = useCallback(async (errorId) => {
    if (!confirm('Diesen Fehler wirklich löschen?')) return;
    
    try {
      await update(ref(database, `errors/${errorId}`), null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  }, []);

  const handleToggleSelect = useCallback((errorId) => {
    setSelectedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedErrors.size === filteredErrors.length) {
      setSelectedErrors(new Set());
    } else {
      setSelectedErrors(new Set(filteredErrors.map(e => e.id)));
    }
  }, [selectedErrors, filteredErrors]);

  const handleExportErrors = useCallback(() => {
    const exportData = {
      exportDate: new Date().toISOString(),
      filters: filters,
      errors: filteredErrors,
      stats: stats
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredErrors, filters, stats]);

  const handleCopyStackTrace = useCallback((stack) => {
    navigator.clipboard.writeText(stack);
    // Show toast notification
  }, []);

  const openInSentry = useCallback((error) => {
    if (error.sentryId) {
      window.open(`https://sentry.io/organizations/eatech/issues/${error.sentryId}/`, '_blank');
    }
  }, []);

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  const renderErrorGroup = (group) => {
    const SeverityIcon = ERROR_SEVERITIES[group.severity]?.icon || AlertCircle;
    const CategoryIcon = ERROR_CATEGORIES[group.category]?.icon || Bug;
    const isExpanded = selectedError?.message === group.message;
    
    return (
      <div 
        key={group.message}
        className={styles.errorGroup}
        data-severity={group.severity}
        data-expanded={isExpanded}
      >
        <div 
          className={styles.errorHeader}
          onClick={() => setSelectedError(isExpanded ? null : group)}
        >
          <div className={styles.errorMain}>
            <div className={styles.errorIcons}>
              <SeverityIcon 
                size={20} 
                style={{ color: ERROR_SEVERITIES[group.severity]?.color }}
              />
              <CategoryIcon 
                size={16} 
                style={{ color: ERROR_CATEGORIES[group.category]?.color }}
              />
            </div>
            
            <div className={styles.errorInfo}>
              <h3>{group.message}</h3>
              <div className={styles.errorMeta}>
                <span>{group.count}x aufgetreten</span>
                <span>•</span>
                <span>Zuletzt: {new Date(group.lastSeen).toLocaleString()}</span>
                <span>•</span>
                <span>{group.errors[0]?.url || 'Unknown URL'}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.errorActions}>
            {group.errors.some(e => !e.resolved) && (
              <button
                className={styles.resolveButton}
                onClick={(e) => {
                  e.stopPropagation();
                  group.errors.forEach(error => {
                    if (!error.resolved) handleResolveError(error.id);
                  });
                }}
              >
                <CheckCircle size={16} />
                Beheben
              </button>
            )}
            
            <button className={styles.chevronButton}>
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className={styles.errorDetails}>
            <div className={styles.errorInstances}>
              <h4>Vorkommen ({group.errors.length})</h4>
              <div className={styles.instancesList}>
                {group.errors.slice(0, 5).map(error => (
                  <div key={error.id} className={styles.instance}>
                    <div className={styles.instanceInfo}>
                      <span className={styles.instanceTime}>
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                      {error.userId && (
                        <span className={styles.instanceUser}>
                          <Users size={14} />
                          {error.userId}
                        </span>
                      )}
                      {error.browser && (
                        <span className={styles.instanceBrowser}>
                          {BROWSERS[error.browser]?.label || error.browser}
                        </span>
                      )}
                    </div>
                    
                    <div className={styles.instanceActions}>
                      {error.sentryId && (
                        <button
                          className={styles.iconButton}
                          onClick={() => openInSentry(error)}
                          title="In Sentry öffnen"
                        >
                          <ExternalLink size={14} />
                        </button>
                      )}
                      
                      <button
                        className={styles.iconButton}
                        onClick={() => handleCopyStackTrace(error.stack)}
                        title="Stack Trace kopieren"
                      >
                        <Copy size={14} />
                      </button>
                      
                      <button
                        className={styles.iconButton}
                        onClick={() => handleDeleteError(error.id)}
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {group.errors.length > 5 && (
                  <button className={styles.showMoreButton}>
                    Alle {group.errors.length} anzeigen
                  </button>
                )}
              </div>
            </div>
            
            {group.errors[0].stack && (
              <div className={styles.stackTrace}>
                <h4>Stack Trace</h4>
                <Suspense fallback={<div>Lade Stack Trace...</div>}>
                  <StackTrace 
                    stack={group.errors[0].stack}
                    frames={parseStackTrace(group.errors[0].stack)}
                  />
                </Suspense>
              </div>
            )}
            
            <div className={styles.errorContext}>
              <h4>Kontext</h4>
              <div className={styles.contextGrid}>
                <div>
                  <span>Browser:</span>
                  <strong>{group.errors[0].browser || 'Unknown'}</strong>
                </div>
                <div>
                  <span>Platform:</span>
                  <strong>{group.errors[0].platform || 'Unknown'}</strong>
                </div>
                <div>
                  <span>Version:</span>
                  <strong>{group.errors[0].version || 'Unknown'}</strong>
                </div>
                <div>
                  <span>Environment:</span>
                  <strong>{group.errors[0].environment || 'production'}</strong>
                </div>
              </div>
            </div>
            
            {group.errors[0].tags && (
              <div className={styles.errorTags}>
                <h4>Tags</h4>
                <div className={styles.tagsList}>
                  {Object.entries(group.errors[0].tags).map(([key, value]) => (
                    <span key={key} className={styles.tag}>
                      {key}: {value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
        <p>Lade Fehler...</p>
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
          <h1>Error Tracking</h1>
          <p>Überwachung und Analyse aller System-Fehler</p>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.headerStats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats?.total || 0}</span>
              <span className={styles.statLabel}>Gesamt</span>
            </div>
            <div className={styles.statCard} data-trend={stats?.trend > 0 ? 'up' : 'down'}>
              <span className={styles.statValue}>{stats?.last24h || 0}</span>
              <span className={styles.statLabel}>24h</span>
              {stats?.trend !== 0 && (
                <span className={styles.statTrend}>
                  {stats?.trend > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(stats?.trend)}
                </span>
              )}
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats?.affectedUsers || 0}</span>
              <span className={styles.statLabel}>Betroffene</span>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              className={styles.autoRefreshButton}
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-active={autoRefresh}
            >
              {autoRefresh ? <RefreshCw size={20} className={styles.spinning} /> : <RefreshCw size={20} />}
            </button>
            
            <button 
              className={styles.exportButton}
              onClick={handleExportErrors}
            >
              <Download size={20} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <select 
            value={filters.severity}
            onChange={(e) => setFilters({...filters, severity: e.target.value})}
            className={styles.filterSelect}
          >
            <option value="all">Alle Schweregrade</option>
            {Object.entries(ERROR_SEVERITIES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select 
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className={styles.filterSelect}
          >
            <option value="all">Alle Kategorien</option>
            {Object.entries(ERROR_CATEGORIES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select 
            value={filters.timeRange}
            onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
            className={styles.filterSelect}
          >
            {Object.entries(TIME_RANGES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.searchBox}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Fehler suchen..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterActions}>
          <button
            className={`${styles.filterButton} ${filters.resolved ? styles.active : ''}`}
            onClick={() => setFilters({...filters, resolved: !filters.resolved})}
          >
            {filters.resolved ? <Eye size={18} /> : <EyeOff size={18} />}
            {filters.resolved ? 'Behobene' : 'Offene'}
          </button>
          
          {selectedErrors.size > 0 && (
            <button
              className={styles.bulkButton}
              onClick={() => setShowBulkActions(!showBulkActions)}
            >
              <Settings size={18} />
              {selectedErrors.size} ausgewählt
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className={styles.bulkActions}>
          <button onClick={handleSelectAll}>
            {selectedErrors.size === filteredErrors.length ? 'Keine auswählen' : 'Alle auswählen'}
          </button>
          <button onClick={handleBulkResolve}>
            <CheckCircle size={16} />
            Alle beheben
          </button>
          <button onClick={() => {
            selectedErrors.forEach(id => handleDeleteError(id));
            setSelectedErrors(new Set());
          }}>
            <Trash2 size={16} />
            Alle löschen
          </button>
          <button onClick={() => setShowBulkActions(false)}>
            <X size={16} />
            Abbrechen
          </button>
        </div>
      )}

      {/* Error Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statSection}>
            <h3>Nach Schweregrad</h3>
            <div className={styles.statBars}>
              {Object.entries(ERROR_SEVERITIES).map(([key, config]) => {
                const count = stats.bySeverity[key] || 0;
                const percentage = (count / stats.total) * 100 || 0;
                
                return (
                  <div key={key} className={styles.statBar}>
                    <div className={styles.statBarHeader}>
                      <span>{config.label}</span>
                      <span>{count}</span>
                    </div>
                    <div className={styles.statBarTrack}>
                      <div 
                        className={styles.statBarFill}
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
          
          <div className={styles.statSection}>
            <h3>Nach Kategorie</h3>
            <div className={styles.categoryGrid}>
              {Object.entries(ERROR_CATEGORIES).map(([key, config]) => {
                const count = stats.byCategory[key] || 0;
                if (count === 0) return null;
                
                const Icon = config.icon;
                return (
                  <div key={key} className={styles.categoryCard}>
                    <Icon size={20} style={{ color: config.color }} />
                    <span className={styles.categoryLabel}>{config.label}</span>
                    <span className={styles.categoryCount}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className={styles.statSection}>
            <h3>Nach Browser</h3>
            <div className={styles.browserStats}>
              {Object.entries(stats.byBrowser).map(([browser, count]) => {
                const percentage = (count / stats.total) * 100;
                const Icon = BROWSERS[browser]?.icon || Globe;
                
                return (
                  <div key={browser} className={styles.browserStat}>
                    <Icon size={16} />
                    <span>{BROWSERS[browser]?.label || browser}</span>
                    <div className={styles.browserBar}>
                      <div 
                        className={styles.browserBarFill}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Error List */}
      <div className={styles.errorList}>
        <div className={styles.listHeader}>
          <h2>Fehler ({errorGroups.length})</h2>
          <div className={styles.sortOptions}>
            <span>Sortieren:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="lastSeen">Zuletzt gesehen</option>
              <option value="count">Häufigkeit</option>
              <option value="firstSeen">Erstmals gesehen</option>
            </select>
            <button
              className={styles.sortOrderButton}
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
            </button>
          </div>
        </div>
        
        {errorGroups.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle size={48} />
            <h3>Keine Fehler gefunden</h3>
            <p>Großartig! Es gibt keine Fehler mit den aktuellen Filtern.</p>
          </div>
        ) : (
          <div className={styles.errorGroups}>
            {errorGroups.map(group => renderErrorGroup(group))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default ErrorTracking;