/**
 * EATECH - Performance Metrics Dashboard
 * Version: 1.0.0
 * Description: Umfassendes Performance-Monitoring mit Web Vitals, 
 *              Lighthouse-Integration und Real User Monitoring (RUM)
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * Kapitel: Phase 5 - Master Control - Performance Monitoring
 * File Path: /apps/master/src/pages/Monitoring/PerformanceMetrics.jsx
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
  off,
  startAt,
  endAt
} from 'firebase/database';
import {
  Zap,
  Gauge,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Monitor,
  Smartphone,
  Tablet,
  Chrome,
  Compass,
  Globe,
  Wifi,
  WifiOff,
  Server,
  Database,
  HardDrive,
  Cpu,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  Search,
  Settings,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  SkipForward,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  ExternalLink,
  FileText,
  Code,
  Package,
  Layers,
  Box,
  ArrowUp,
  ArrowDown,
  Target,
  Crosshair,
  Timer,
  Hourglass,
  MousePointer,
  Move,
  Maximize2,
  Minimize2,
  Image,
  Film,
  Type,
  Layout,
  Grid,
  List,
  Hash,
  Percent,
  TrendingUp as TrendUp,
  TrendingDown as TrendDown,
  Minus,
  Plus
} from 'lucide-react';
import styles from './PerformanceMetrics.module.css';

// Lazy loaded components
const WebVitalsChart = lazy(() => import('./components/WebVitalsChart'));
const PerformanceTimeline = lazy(() => import('./components/PerformanceTimeline'));
const ResourceWaterfall = lazy(() => import('./components/ResourceWaterfall'));
const DeviceBreakdown = lazy(() => import('./components/DeviceBreakdown'));

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
const WEB_VITALS = {
  lcp: {
    name: 'Largest Contentful Paint',
    short: 'LCP',
    unit: 'ms',
    good: 2500,
    needsImprovement: 4000,
    icon: Image,
    description: 'Misst die Ladezeit des größten sichtbaren Elements'
  },
  fid: {
    name: 'First Input Delay',
    short: 'FID',
    unit: 'ms',
    good: 100,
    needsImprovement: 300,
    icon: MousePointer,
    description: 'Zeit bis zur ersten Interaktion'
  },
  cls: {
    name: 'Cumulative Layout Shift',
    short: 'CLS',
    unit: '',
    good: 0.1,
    needsImprovement: 0.25,
    icon: Layout,
    description: 'Visuelle Stabilität der Seite'
  },
  fcp: {
    name: 'First Contentful Paint',
    short: 'FCP',
    unit: 'ms',
    good: 1800,
    needsImprovement: 3000,
    icon: Type,
    description: 'Zeit bis zum ersten sichtbaren Inhalt'
  },
  ttfb: {
    name: 'Time to First Byte',
    short: 'TTFB',
    unit: 'ms',
    good: 800,
    needsImprovement: 1800,
    icon: Server,
    description: 'Server-Antwortzeit'
  },
  inp: {
    name: 'Interaction to Next Paint',
    short: 'INP',
    unit: 'ms',
    good: 200,
    needsImprovement: 500,
    icon: Move,
    description: 'Reaktionszeit auf Nutzerinteraktionen'
  }
};

const RESOURCE_TYPES = {
  document: { label: 'Document', icon: FileText, color: '#3b82f6' },
  stylesheet: { label: 'CSS', icon: Code, color: '#ec4899' },
  script: { label: 'JavaScript', icon: Code, color: '#f59e0b' },
  image: { label: 'Images', icon: Image, color: '#10b981' },
  font: { label: 'Fonts', icon: Type, color: '#8b5cf6' },
  xhr: { label: 'XHR/Fetch', icon: Server, color: '#06b6d4' },
  other: { label: 'Other', icon: Package, color: '#6b7280' }
};

const PERFORMANCE_GRADES = {
  A: { min: 90, color: '#10b981', label: 'Excellent' },
  B: { min: 80, color: '#3b82f6', label: 'Good' },
  C: { min: 70, color: '#f59e0b', label: 'Needs Work' },
  D: { min: 50, color: '#f97316', label: 'Poor' },
  F: { min: 0, color: '#ef4444', label: 'Failing' }
};

const TIME_RANGES = {
  '1h': { label: '1 Stunde', value: 3600000 },
  '24h': { label: '24 Stunden', value: 86400000 },
  '7d': { label: '7 Tage', value: 604800000 },
  '30d': { label: '30 Tage', value: 2592000000 }
};

const DEVICES = {
  desktop: { label: 'Desktop', icon: Monitor },
  mobile: { label: 'Mobile', icon: Smartphone },
  tablet: { label: 'Tablet', icon: Tablet }
};

const BROWSERS = {
  chrome: { label: 'Chrome', icon: Chrome },
  firefox: { label: 'Firefox', icon: Compass },
  safari: { label: 'Safari', icon: Compass },
  edge: { label: 'Edge', icon: Globe },
  other: { label: 'Other', icon: Globe }
};

const NETWORK_TYPES = {
  '4g': { label: '4G', color: '#10b981' },
  '3g': { label: '3G', color: '#f59e0b' },
  '2g': { label: '2G', color: '#ef4444' },
  'wifi': { label: 'WiFi', color: '#3b82f6' },
  'ethernet': { label: 'Ethernet', color: '#8b5cf6' }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const getVitalScore = (metric, value) => {
  const vital = WEB_VITALS[metric];
  if (!vital) return 'unknown';
  
  if (value <= vital.good) return 'good';
  if (value <= vital.needsImprovement) return 'needs-improvement';
  return 'poor';
};

const calculatePerformanceScore = (vitals) => {
  let totalScore = 0;
  let count = 0;
  
  Object.entries(vitals).forEach(([key, value]) => {
    const vital = WEB_VITALS[key];
    if (!vital || !value) return;
    
    let score = 0;
    if (value <= vital.good) {
      score = 100;
    } else if (value <= vital.needsImprovement) {
      score = 50 + (50 * (vital.needsImprovement - value) / (vital.needsImprovement - vital.good));
    } else {
      score = 50 * (1 - Math.min((value - vital.needsImprovement) / vital.needsImprovement, 1));
    }
    
    totalScore += score;
    count++;
  });
  
  return count > 0 ? Math.round(totalScore / count) : 0;
};

const getPerformanceGrade = (score) => {
  for (const [grade, config] of Object.entries(PERFORMANCE_GRADES)) {
    if (score >= config.min) return { grade, ...config };
  }
  return { grade: 'F', ...PERFORMANCE_GRADES.F };
};

const formatDuration = (ms) => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatBytes = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const calculatePercentile = (values, percentile) => {
  if (!values || values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const PerformanceMetrics = () => {
  // State Management
  const [metrics, setMetrics] = useState([]);
  const [aggregatedMetrics, setAggregatedMetrics] = useState({});
  const [resources, setResources] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('lcp');
  const [timeRange, setTimeRange] = useState('24h');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [browserFilter, setBrowserFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [urlFilter, setUrlFilter] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ========================================================================
  // FIREBASE LISTENERS
  // ========================================================================
  useEffect(() => {
    const now = Date.now();
    const startTime = now - TIME_RANGES[timeRange].value;
    
    const metricsRef = query(
      ref(database, 'performance/metrics'),
      orderByChild('timestamp'),
      startAt(startTime),
      endAt(now)
    );
    
    const resourcesRef = query(
      ref(database, 'performance/resources'),
      orderByChild('timestamp'),
      limitToLast(100)
    );

    // Metrics listener
    const unsubscribeMetrics = onValue(metricsRef, (snapshot) => {
      if (snapshot.exists()) {
        const metricsList = [];
        snapshot.forEach((child) => {
          metricsList.push({ id: child.key, ...child.val() });
        });
        setMetrics(metricsList);
      } else {
        setMetrics([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Metrics error:', error);
      setError('Fehler beim Laden der Performance-Daten');
      setLoading(false);
    });

    // Resources listener
    const unsubscribeResources = onValue(resourcesRef, (snapshot) => {
      if (snapshot.exists()) {
        const resourcesList = [];
        snapshot.forEach((child) => {
          resourcesList.push({ id: child.key, ...child.val() });
        });
        setResources(resourcesList);
      }
    });

    // Cleanup
    return () => {
      off(metricsRef);
      off(resourcesRef);
    };
  }, [timeRange]);

  // ========================================================================
  // DATA AGGREGATION
  // ========================================================================
  useEffect(() => {
    // Filter metrics
    let filtered = [...metrics];
    
    if (deviceFilter !== 'all') {
      filtered = filtered.filter(m => m.device === deviceFilter);
    }
    
    if (browserFilter !== 'all') {
      filtered = filtered.filter(m => m.browser === browserFilter);
    }
    
    if (networkFilter !== 'all') {
      filtered = filtered.filter(m => m.network === networkFilter);
    }
    
    if (urlFilter) {
      filtered = filtered.filter(m => 
        m.url?.toLowerCase().includes(urlFilter.toLowerCase())
      );
    }
    
    // Aggregate metrics
    const aggregated = {
      vitals: {},
      devices: {},
      browsers: {},
      networks: {},
      urls: {},
      timeline: [],
      sessions: filtered.length
    };
    
    // Calculate Web Vitals
    Object.keys(WEB_VITALS).forEach(vital => {
      const values = filtered
        .map(m => m.vitals?.[vital])
        .filter(v => v !== undefined && v !== null);
      
      if (values.length > 0) {
        aggregated.vitals[vital] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          p50: calculatePercentile(values, 50),
          p75: calculatePercentile(values, 75),
          p90: calculatePercentile(values, 90),
          p95: calculatePercentile(values, 95),
          p99: calculatePercentile(values, 99),
          samples: values.length,
          distribution: values
        };
      }
    });
    
    // Device breakdown
    filtered.forEach(metric => {
      const device = metric.device || 'desktop';
      aggregated.devices[device] = (aggregated.devices[device] || 0) + 1;
    });
    
    // Browser breakdown
    filtered.forEach(metric => {
      const browser = metric.browser || 'other';
      aggregated.browsers[browser] = (aggregated.browsers[browser] || 0) + 1;
    });
    
    // Network breakdown
    filtered.forEach(metric => {
      const network = metric.network || 'unknown';
      aggregated.networks[network] = (aggregated.networks[network] || 0) + 1;
    });
    
    // URL performance
    const urlMap = {};
    filtered.forEach(metric => {
      const url = metric.url || 'unknown';
      if (!urlMap[url]) {
        urlMap[url] = {
          url,
          count: 0,
          vitals: {}
        };
      }
      
      urlMap[url].count++;
      
      Object.entries(metric.vitals || {}).forEach(([vital, value]) => {
        if (!urlMap[url].vitals[vital]) {
          urlMap[url].vitals[vital] = [];
        }
        urlMap[url].vitals[vital].push(value);
      });
    });
    
    // Calculate URL averages
    Object.values(urlMap).forEach(urlData => {
      Object.entries(urlData.vitals).forEach(([vital, values]) => {
        urlData.vitals[vital] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          samples: values.length
        };
      });
    });
    
    aggregated.urls = Object.values(urlMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Timeline data
    const timelineMap = {};
    const bucketSize = TIME_RANGES[timeRange].value > 86400000 ? 3600000 : 300000; // 1h or 5min buckets
    
    filtered.forEach(metric => {
      const bucket = Math.floor(metric.timestamp / bucketSize) * bucketSize;
      
      if (!timelineMap[bucket]) {
        timelineMap[bucket] = {
          timestamp: bucket,
          vitals: {},
          count: 0
        };
      }
      
      timelineMap[bucket].count++;
      
      Object.entries(metric.vitals || {}).forEach(([vital, value]) => {
        if (!timelineMap[bucket].vitals[vital]) {
          timelineMap[bucket].vitals[vital] = [];
        }
        timelineMap[bucket].vitals[vital].push(value);
      });
    });
    
    // Calculate timeline averages
    aggregated.timeline = Object.values(timelineMap)
      .map(bucket => {
        const avgVitals = {};
        Object.entries(bucket.vitals).forEach(([vital, values]) => {
          avgVitals[vital] = values.reduce((a, b) => a + b, 0) / values.length;
        });
        
        return {
          ...bucket,
          vitals: avgVitals
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
    
    setAggregatedMetrics(aggregated);
  }, [metrics, deviceFilter, browserFilter, networkFilter, urlFilter, timeRange]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  const handleExportData = useCallback(() => {
    const exportData = {
      exportDate: new Date().toISOString(),
      timeRange: timeRange,
      filters: {
        device: deviceFilter,
        browser: browserFilter,
        network: networkFilter,
        url: urlFilter
      },
      metrics: aggregatedMetrics,
      rawData: metrics
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, aggregatedMetrics, timeRange, deviceFilter, browserFilter, networkFilter, urlFilter]);

  const handleRunLighthouse = useCallback(async () => {
    // In real implementation, this would trigger a Lighthouse audit
    console.log('Running Lighthouse audit...');
  }, []);

  const handleViewSession = useCallback((sessionId) => {
    const session = metrics.find(m => m.id === sessionId);
    setSelectedSession(session);
  }, [metrics]);

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================
  const performanceScore = useMemo(() => {
    const vitals = {};
    Object.entries(aggregatedMetrics.vitals || {}).forEach(([key, data]) => {
      vitals[key] = data.p75; // Use 75th percentile for scoring
    });
    return calculatePerformanceScore(vitals);
  }, [aggregatedMetrics]);

  const performanceGrade = useMemo(() => {
    return getPerformanceGrade(performanceScore);
  }, [performanceScore]);

  const insights = useMemo(() => {
    const insights = [];
    
    // Check each vital
    Object.entries(aggregatedMetrics.vitals || {}).forEach(([vital, data]) => {
      const vitalConfig = WEB_VITALS[vital];
      if (!vitalConfig) return;
      
      const score = getVitalScore(vital, data.p75);
      
      if (score === 'poor') {
        insights.push({
          type: 'critical',
          icon: AlertTriangle,
          title: `${vitalConfig.short} needs improvement`,
          description: `${vitalConfig.short} is ${formatDuration(data.p75)} (75th percentile), which exceeds the recommended ${formatDuration(vitalConfig.needsImprovement)}`,
          metric: vital
        });
      } else if (score === 'needs-improvement') {
        insights.push({
          type: 'warning',
          icon: Info,
          title: `${vitalConfig.short} could be better`,
          description: `${vitalConfig.short} is ${formatDuration(data.p75)} (75th percentile). Aim for under ${formatDuration(vitalConfig.good)}`,
          metric: vital
        });
      }
    });
    
    // Device insights
    const mobilePercentage = (aggregatedMetrics.devices?.mobile || 0) / aggregatedMetrics.sessions * 100;
    if (mobilePercentage > 50) {
      insights.push({
        type: 'info',
        icon: Smartphone,
        title: 'Mobile-heavy traffic',
        description: `${mobilePercentage.toFixed(1)}% of your users are on mobile devices. Prioritize mobile optimization.`
      });
    }
    
    // Network insights
    const slowNetworkPercentage = ((aggregatedMetrics.networks?.['3g'] || 0) + 
                                  (aggregatedMetrics.networks?.['2g'] || 0)) / 
                                  aggregatedMetrics.sessions * 100;
    if (slowNetworkPercentage > 20) {
      insights.push({
        type: 'warning',
        icon: WifiOff,
        title: 'Slow network users',
        description: `${slowNetworkPercentage.toFixed(1)}% of users are on slow networks. Consider implementing progressive enhancement.`
      });
    }
    
    return insights;
  }, [aggregatedMetrics]);

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  const renderVitalCard = (vital, data) => {
    const vitalConfig = WEB_VITALS[vital];
    if (!vitalConfig || !data) return null;
    
    const Icon = vitalConfig.icon;
    const score = getVitalScore(vital, data.p75);
    
    return (
      <div 
        key={vital}
        className={styles.vitalCard}
        data-score={score}
        onClick={() => setSelectedMetric(vital)}
        data-selected={selectedMetric === vital}
      >
        <div className={styles.vitalHeader}>
          <Icon size={20} />
          <h3>{vitalConfig.short}</h3>
          <div className={styles.vitalScore} data-score={score}>
            {score === 'good' && <CheckCircle size={16} />}
            {score === 'needs-improvement' && <AlertTriangle size={16} />}
            {score === 'poor' && <AlertTriangle size={16} />}
          </div>
        </div>
        
        <div className={styles.vitalValue}>
          {vital === 'cls' 
            ? data.p75.toFixed(3)
            : formatDuration(data.p75)
          }
        </div>
        
        <div className={styles.vitalStats}>
          <div>
            <span>P50</span>
            <strong>
              {vital === 'cls' 
                ? data.p50.toFixed(3)
                : formatDuration(data.p50)
              }
            </strong>
          </div>
          <div>
            <span>P95</span>
            <strong>
              {vital === 'cls' 
                ? data.p95.toFixed(3)
                : formatDuration(data.p95)
              }
            </strong>
          </div>
        </div>
        
        <div className={styles.vitalDescription}>
          {vitalConfig.description}
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
        <p>Lade Performance-Metriken...</p>
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
          <h1>Performance Metrics</h1>
          <p>Web Vitals und Real User Monitoring</p>
        </div>
        
        <div className={styles.headerRight}>
          <div 
            className={styles.scoreCard}
            style={{ '--score-color': performanceGrade.color }}
          >
            <div className={styles.scoreGrade}>{performanceGrade.grade}</div>
            <div className={styles.scoreInfo}>
              <span className={styles.scoreValue}>{performanceScore}</span>
              <span className={styles.scoreLabel}>Performance Score</span>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              className={styles.lighthouseButton}
              onClick={handleRunLighthouse}
            >
              <Gauge size={20} />
              Lighthouse
            </button>
            
            <button 
              className={styles.autoRefreshButton}
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-active={autoRefresh}
            >
              {autoRefresh ? <RefreshCw size={20} className={styles.spinning} /> : <RefreshCw size={20} />}
            </button>
            
            <button 
              className={styles.exportButton}
              onClick={handleExportData}
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
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={styles.filterSelect}
          >
            {Object.entries(TIME_RANGES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select 
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Geräte</option>
            {Object.entries(DEVICES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select 
            value={browserFilter}
            onChange={(e) => setBrowserFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Browser</option>
            {Object.entries(BROWSERS).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select 
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Netzwerke</option>
            {Object.entries(NETWORK_TYPES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.searchBox}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Nach URL filtern..."
            value={urlFilter}
            onChange={(e) => setUrlFilter(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Web Vitals Grid */}
      <div className={styles.vitalsGrid}>
        {Object.entries(WEB_VITALS).map(([vital, config]) => 
          renderVitalCard(vital, aggregatedMetrics.vitals?.[vital])
        )}
      </div>

      {/* Main Chart */}
      <div className={styles.chartSection}>
        <div className={styles.sectionHeader}>
          <h2>Performance Timeline</h2>
          <span className={styles.sampleCount}>
            {aggregatedMetrics.sessions} Messungen
          </span>
        </div>
        
        <div className={styles.chartContainer}>
          <Suspense fallback={<div className={styles.chartLoading}>Lade Chart...</div>}>
            <WebVitalsChart 
              data={aggregatedMetrics.timeline}
              selectedMetric={selectedMetric}
              height={300}
            />
          </Suspense>
        </div>
      </div>

      {/* Device & Browser Breakdown */}
      <div className={styles.breakdownGrid}>
        <div className={styles.breakdownSection}>
          <h3>Geräte</h3>
          <div className={styles.breakdownBars}>
            {Object.entries(aggregatedMetrics.devices || {}).map(([device, count]) => {
              const percentage = (count / aggregatedMetrics.sessions) * 100;
              const Icon = DEVICES[device]?.icon || Monitor;
              
              return (
                <div key={device} className={styles.breakdownBar}>
                  <div className={styles.breakdownHeader}>
                    <div className={styles.breakdownLabel}>
                      <Icon size={16} />
                      <span>{DEVICES[device]?.label || device}</span>
                    </div>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <div className={styles.breakdownTrack}>
                    <div 
                      className={styles.breakdownFill}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className={styles.breakdownSection}>
          <h3>Browser</h3>
          <div className={styles.breakdownBars}>
            {Object.entries(aggregatedMetrics.browsers || {}).map(([browser, count]) => {
              const percentage = (count / aggregatedMetrics.sessions) * 100;
              const Icon = BROWSERS[browser]?.icon || Globe;
              
              return (
                <div key={browser} className={styles.breakdownBar}>
                  <div className={styles.breakdownHeader}>
                    <div className={styles.breakdownLabel}>
                      <Icon size={16} />
                      <span>{BROWSERS[browser]?.label || browser}</span>
                    </div>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <div className={styles.breakdownTrack}>
                    <div 
                      className={styles.breakdownFill}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className={styles.breakdownSection}>
          <h3>Netzwerk</h3>
          <div className={styles.breakdownBars}>
            {Object.entries(aggregatedMetrics.networks || {}).map(([network, count]) => {
              const percentage = (count / aggregatedMetrics.sessions) * 100;
              const config = NETWORK_TYPES[network];
              
              return (
                <div key={network} className={styles.breakdownBar}>
                  <div className={styles.breakdownHeader}>
                    <div className={styles.breakdownLabel}>
                      <Wifi size={16} style={{ color: config?.color }} />
                      <span>{config?.label || network}</span>
                    </div>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <div className={styles.breakdownTrack}>
                    <div 
                      className={styles.breakdownFill}
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: config?.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      {insights.length > 0 && (
        <div className={styles.insightsSection}>
          <div className={styles.sectionHeader}>
            <h2>Performance Insights</h2>
            <Info size={20} />
          </div>
          
          <div className={styles.insightsGrid}>
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div 
                  key={index}
                  className={styles.insightCard}
                  data-type={insight.type}
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

      {/* Top URLs */}
      <div className={styles.urlsSection}>
        <div className={styles.sectionHeader}>
          <h2>Top URLs nach Performance</h2>
          <Globe size={20} />
        </div>
        
        <div className={styles.urlsTable}>
          <div className={styles.urlsHeader}>
            <div>URL</div>
            <div>Aufrufe</div>
            <div>LCP</div>
            <div>FID</div>
            <div>CLS</div>
            <div>Score</div>
          </div>
          
          {aggregatedMetrics.urls?.map((urlData, index) => {
            const urlScore = calculatePerformanceScore(urlData.vitals);
            const urlGrade = getPerformanceGrade(urlScore);
            
            return (
              <div key={index} className={styles.urlRow}>
                <div className={styles.urlPath}>
                  <ExternalLink size={14} />
                  <span>{urlData.url}</span>
                </div>
                <div>{urlData.count}</div>
                <div data-score={getVitalScore('lcp', urlData.vitals.lcp?.avg)}>
                  {urlData.vitals.lcp ? formatDuration(urlData.vitals.lcp.avg) : '-'}
                </div>
                <div data-score={getVitalScore('fid', urlData.vitals.fid?.avg)}>
                  {urlData.vitals.fid ? formatDuration(urlData.vitals.fid.avg) : '-'}
                </div>
                <div data-score={getVitalScore('cls', urlData.vitals.cls?.avg)}>
                  {urlData.vitals.cls ? urlData.vitals.cls.avg.toFixed(3) : '-'}
                </div>
                <div 
                  className={styles.urlScore}
                  style={{ color: urlGrade.color }}
                >
                  {urlScore}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resource Analysis */}
      {showDetails && (
        <div className={styles.resourceSection}>
          <div className={styles.sectionHeader}>
            <h2>Resource Analysis</h2>
            <button onClick={() => setShowDetails(false)}>
              <X size={20} />
            </button>
          </div>
          
          <Suspense fallback={<div>Lade Resource Waterfall...</div>}>
            <ResourceWaterfall 
              resources={resources}
              sessionId={selectedSession?.id}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default PerformanceMetrics;