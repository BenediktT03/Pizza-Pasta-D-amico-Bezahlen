/**
 * EATECH - System Metrics Dashboard
 * Version: 5.0.0
 * Description: Systemweite Performance-Metriken und Monitoring
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/pages/master/SystemMetrics.jsx
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Activity, Server, Database, Globe, Zap, HardDrive,
  Cpu, MemoryStick, Wifi, Shield, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Clock, RefreshCw, Download,
  BarChart3, PieChart, LineChart as LineChartIcon, Info
} from 'lucide-react';
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { ref, onValue } from 'firebase/database';
import { getDatabaseInstance } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import styles from './SystemMetrics.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_COLORS = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  tertiary: '#FFE66D',
  quaternary: '#6C5CE7',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  info: '#3498DB',
  purple: '#9B59B6',
  pink: '#FD79A8'
};

const METRIC_CATEGORIES = [
  { id: 'infrastructure', label: 'Infrastruktur', icon: Server },
  { id: 'performance', label: 'Performance', icon: Zap },
  { id: 'database', label: 'Datenbank', icon: Database },
  { id: 'network', label: 'Netzwerk', icon: Globe },
  { id: 'security', label: 'Sicherheit', icon: Shield }
];

const TIME_RANGES = [
  { value: '1h', label: 'Letzte Stunde' },
  { value: '6h', label: 'Letzte 6 Stunden' },
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' }
];

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

const generateTimeSeriesData = (points = 24) => {
  const data = [];
  const now = new Date();
  
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000); // 1 hour intervals
    data.push({
      time: time.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
      cpu: Math.random() * 30 + 40 + Math.sin(i / 4) * 10,
      memory: Math.random() * 20 + 60 + Math.cos(i / 3) * 10,
      network: Math.random() * 100 + 200,
      requests: Math.floor(Math.random() * 1000 + 500),
      responseTime: Math.random() * 50 + 30,
      errorRate: Math.random() * 2
    });
  }
  
  return data;
};

const generateServerMetrics = () => ({
  servers: [
    {
      id: 'prod-eu-1',
      name: 'Production EU-1',
      location: 'Frankfurt',
      status: 'healthy',
      cpu: 45,
      memory: 72,
      disk: 65,
      uptime: '99.99%',
      lastRestart: '45 days ago'
    },
    {
      id: 'prod-eu-2',
      name: 'Production EU-2',
      location: 'Amsterdam',
      status: 'healthy',
      cpu: 38,
      memory: 68,
      disk: 58,
      uptime: '99.98%',
      lastRestart: '23 days ago'
    },
    {
      id: 'prod-ch-1',
      name: 'Production CH-1',
      location: 'Zürich',
      status: 'warning',
      cpu: 78,
      memory: 85,
      disk: 45,
      uptime: '99.95%',
      lastRestart: '7 days ago'
    }
  ],
  databases: [
    {
      name: 'Firebase Primary',
      region: 'europe-west1',
      status: 'healthy',
      connections: 1245,
      maxConnections: 10000,
      queryTime: 12,
      replication: 'sync'
    },
    {
      name: 'Firebase Secondary',
      region: 'europe-west3',
      status: 'healthy',
      connections: 856,
      maxConnections: 10000,
      queryTime: 15,
      replication: 'sync'
    }
  ],
  cdn: {
    hits: 8456234,
    misses: 234567,
    bandwidth: '2.4 TB',
    cacheRatio: 97.3,
    avgResponseTime: 45
  }
});

const generatePerformanceData = () => ({
  apiMetrics: [
    { endpoint: '/api/orders', calls: 45678, avgTime: 45, p99Time: 120, errorRate: 0.1 },
    { endpoint: '/api/menu', calls: 34567, avgTime: 32, p99Time: 89, errorRate: 0.05 },
    { endpoint: '/api/auth', calls: 23456, avgTime: 78, p99Time: 234, errorRate: 0.2 },
    { endpoint: '/api/payments', calls: 12345, avgTime: 123, p99Time: 345, errorRate: 0.3 },
    { endpoint: '/api/analytics', calls: 8901, avgTime: 234, p99Time: 567, errorRate: 0.8 }
  ],
  errorDistribution: [
    { type: '4xx Errors', value: 234, color: CHART_COLORS.warning },
    { type: '5xx Errors', value: 45, color: CHART_COLORS.danger },
    { type: 'Timeouts', value: 12, color: CHART_COLORS.purple },
    { type: 'Network', value: 8, color: CHART_COLORS.pink }
  ],
  regionPerformance: [
    { region: 'Zürich', latency: 12, availability: 99.99 },
    { region: 'Genf', latency: 18, availability: 99.98 },
    { region: 'Basel', latency: 15, availability: 99.99 },
    { region: 'Bern', latency: 14, availability: 99.97 },
    { region: 'Luzern', latency: 16, availability: 99.96 }
  ]
});

const generateSecurityMetrics = () => ({
  threats: {
    blocked: 1234,
    suspicious: 456,
    authenticated: 98765,
    failedLogins: 234
  },
  ddosProtection: {
    requestsBlocked: 45678,
    ipsBlacklisted: 234,
    challengesPassed: 8901,
    mitigationActive: false
  },
  vulnerabilities: [
    { severity: 'Critical', count: 0 },
    { severity: 'High', count: 2 },
    { severity: 'Medium', count: 8 },
    { severity: 'Low', count: 15 }
  ],
  compliance: {
    gdpr: 'compliant',
    pciDss: 'compliant',
    iso27001: 'compliant',
    lastAudit: '2024-12-15'
  }
});

// ============================================================================
// COMPONENTS
// ============================================================================

const MetricCard = ({ title, value, unit, icon: Icon, status, trend }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return styles.healthy;
      case 'warning': return styles.warning;
      case 'critical': return styles.critical;
      default: return '';
    }
  };
  
  return (
    <div className={`${styles.metricCard} ${getStatusColor()}`}>
      <div className={styles.metricHeader}>
        <Icon size={20} className={styles.metricIcon} />
        <h4>{title}</h4>
      </div>
      <div className={styles.metricValue}>
        {value}
        {unit && <span className={styles.metricUnit}>{unit}</span>}
      </div>
      {trend && (
        <div className={`${styles.metricTrend} ${trend > 0 ? styles.up : styles.down}`}>
          {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
};

const ServerCard = ({ server }) => {
  const getStatusIcon = () => {
    switch (server.status) {
      case 'healthy': return <CheckCircle size={16} className={styles.healthyIcon} />;
      case 'warning': return <AlertTriangle size={16} className={styles.warningIcon} />;
      case 'critical': return <AlertTriangle size={16} className={styles.criticalIcon} />;
      default: return null;
    }
  };
  
  return (
    <div className={`${styles.serverCard} ${styles[server.status]}`}>
      <div className={styles.serverHeader}>
        <div className={styles.serverInfo}>
          <h4>{server.name}</h4>
          <span className={styles.serverLocation}>{server.location}</span>
        </div>
        <div className={styles.serverStatus}>
          {getStatusIcon()}
          <span>{server.status}</span>
        </div>
      </div>
      
      <div className={styles.serverMetrics}>
        <div className={styles.serverMetric}>
          <Cpu size={16} />
          <span>CPU</span>
          <strong>{server.cpu}%</strong>
        </div>
        <div className={styles.serverMetric}>
          <MemoryStick size={16} />
          <span>RAM</span>
          <strong>{server.memory}%</strong>
        </div>
        <div className={styles.serverMetric}>
          <HardDrive size={16} />
          <span>Disk</span>
          <strong>{server.disk}%</strong>
        </div>
      </div>
      
      <div className={styles.serverFooter}>
        <span>Uptime: {server.uptime}</span>
        <span>Last restart: {server.lastRestart}</span>
      </div>
    </div>
  );
};

const AlertItem = ({ alert }) => {
  const getAlertIcon = () => {
    switch (alert.severity) {
      case 'critical': return <AlertTriangle size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'info': return <Info size={16} />;
      default: return <Info size={16} />;
    }
  };
  
  return (
    <div className={`${styles.alertItem} ${styles[alert.severity]}`}>
      <div className={styles.alertIcon}>
        {getAlertIcon()}
      </div>
      <div className={styles.alertContent}>
        <div className={styles.alertTitle}>{alert.title}</div>
        <div className={styles.alertMessage}>{alert.message}</div>
        <div className={styles.alertTime}>{alert.time}</div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SystemMetrics = () => {
  const db = getDatabaseInstance();
  
  // State
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('infrastructure');
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [metrics, setMetrics] = useState({
    timeSeries: [],
    servers: {},
    performance: {},
    security: {}
  });
  
  // Load metrics data
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        // In production, this would load from Firebase
        const timeSeriesData = generateTimeSeriesData();
        const serverMetrics = generateServerMetrics();
        const performanceData = generatePerformanceData();
        const securityMetrics = generateSecurityMetrics();
        
        setMetrics({
          timeSeries: timeSeriesData,
          servers: serverMetrics,
          performance: performanceData,
          security: securityMetrics
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading metrics:', error);
        toast.error('Fehler beim Laden der Metriken');
        setLoading(false);
      }
    };
    
    loadMetrics();
    
    // Auto-refresh
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTimeRange, autoRefresh]);
  
  // Handlers
  const handleExport = useCallback(() => {
    toast.success('Metriken werden exportiert...');
    // Implement export functionality
  }, []);
  
  const handleRefresh = useCallback(() => {
    setLoading(true);
    // Trigger data reload
    setTimeout(() => {
      setLoading(false);
      toast.success('Metriken aktualisiert');
    }, 1000);
  }, []);
  
  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!metrics.timeSeries.length) return null;
    
    const latest = metrics.timeSeries[metrics.timeSeries.length - 1];
    const avgResponseTime = metrics.timeSeries.reduce((sum, d) => sum + d.responseTime, 0) / metrics.timeSeries.length;
    const totalRequests = metrics.timeSeries.reduce((sum, d) => sum + d.requests, 0);
    
    return {
      cpu: latest.cpu,
      memory: latest.memory,
      responseTime: avgResponseTime,
      requests: totalRequests,
      errorRate: latest.errorRate,
      uptime: 99.98
    };
  }, [metrics.timeSeries]);
  
  // Loading state
  if (loading) {
    return (
      <div className={styles.loading}>
        <RefreshCw className={styles.spinner} />
        <span>System-Metriken werden geladen...</span>
      </div>
    );
  }
  
  return (
    <div className={styles.systemMetrics}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>System Metrics</h1>
          <p>Echtzeit-Überwachung der System-Performance</p>
        </div>
        <div className={styles.headerRight}>
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className={styles.timeSelect}
          >
            {TIME_RANGES.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <label className={styles.autoRefreshToggle}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-Refresh</span>
          </label>
          <button className={styles.refreshButton} onClick={handleRefresh}>
            <RefreshCw size={18} />
            Aktualisieren
          </button>
          <button className={styles.exportButton} onClick={handleExport}>
            <Download size={18} />
            Export
          </button>
        </div>
      </div>
      
      {/* Category Tabs */}
      <div className={styles.categoryTabs}>
        {METRIC_CATEGORIES.map(category => (
          <button
            key={category.id}
            className={`${styles.categoryTab} ${selectedCategory === category.id ? styles.active : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            <category.icon size={18} />
            {category.label}
          </button>
        ))}
      </div>
      
      {/* Summary Metrics */}
      {summaryMetrics && (
        <div className={styles.summaryGrid}>
          <MetricCard
            title="CPU Auslastung"
            value={summaryMetrics.cpu.toFixed(1)}
            unit="%"
            icon={Cpu}
            status={summaryMetrics.cpu > 80 ? 'warning' : 'healthy'}
            trend={-5}
          />
          <MetricCard
            title="Speichernutzung"
            value={summaryMetrics.memory.toFixed(1)}
            unit="%"
            icon={MemoryStick}
            status={summaryMetrics.memory > 85 ? 'warning' : 'healthy'}
            trend={3}
          />
          <MetricCard
            title="Antwortzeit"
            value={summaryMetrics.responseTime.toFixed(0)}
            unit="ms"
            icon={Zap}
            status={summaryMetrics.responseTime > 100 ? 'warning' : 'healthy'}
            trend={-12}
          />
          <MetricCard
            title="Anfragen"
            value={(summaryMetrics.requests / 1000).toFixed(1)}
            unit="k"
            icon={Activity}
            status="healthy"
            trend={18}
          />
          <MetricCard
            title="Fehlerrate"
            value={summaryMetrics.errorRate.toFixed(2)}
            unit="%"
            icon={AlertTriangle}
            status={summaryMetrics.errorRate > 1 ? 'warning' : 'healthy'}
            trend={-8}
          />
          <MetricCard
            title="Verfügbarkeit"
            value={summaryMetrics.uptime}
            unit="%"
            icon={CheckCircle}
            status="healthy"
            trend={0}
          />
        </div>
      )}
      
      {/* Content based on selected category */}
      <div className={styles.content}>
        {/* Infrastructure Tab */}
        {selectedCategory === 'infrastructure' && (
          <>
            {/* Time Series Chart */}
            <div className={styles.chartSection}>
              <h3>System-Auslastung</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke={CHART_COLORS.primary}
                      name="CPU %"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke={CHART_COLORS.secondary}
                      name="Memory %"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Server Status */}
            <div className={styles.serversSection}>
              <h3>Server Status</h3>
              <div className={styles.serverGrid}>
                {metrics.servers.servers?.map(server => (
                  <ServerCard key={server.id} server={server} />
                ))}
              </div>
            </div>
            
            {/* Database Status */}
            <div className={styles.databaseSection}>
              <h3>Datenbank Status</h3>
              <div className={styles.databaseGrid}>
                {metrics.servers.databases?.map(db => (
                  <div key={db.name} className={styles.databaseCard}>
                    <div className={styles.databaseHeader}>
                      <h4>{db.name}</h4>
                      <span className={`${styles.status} ${styles[db.status]}`}>
                        {db.status}
                      </span>
                    </div>
                    <div className={styles.databaseMetrics}>
                      <div className={styles.databaseMetric}>
                        <span>Region</span>
                        <strong>{db.region}</strong>
                      </div>
                      <div className={styles.databaseMetric}>
                        <span>Verbindungen</span>
                        <strong>{db.connections} / {db.maxConnections}</strong>
                      </div>
                      <div className={styles.databaseMetric}>
                        <span>Query Zeit</span>
                        <strong>{db.queryTime}ms</strong>
                      </div>
                      <div className={styles.databaseMetric}>
                        <span>Replikation</span>
                        <strong>{db.replication}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        {/* Performance Tab */}
        {selectedCategory === 'performance' && (
          <>
            {/* API Performance */}
            <div className={styles.apiSection}>
              <h3>API Performance</h3>
              <div className={styles.apiTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Aufrufe</th>
                      <th>Ø Zeit</th>
                      <th>P99 Zeit</th>
                      <th>Fehlerrate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.performance.apiMetrics?.map(api => (
                      <tr key={api.endpoint}>
                        <td className={styles.endpoint}>{api.endpoint}</td>
                        <td>{api.calls.toLocaleString()}</td>
                        <td>{api.avgTime}ms</td>
                        <td>{api.p99Time}ms</td>
                        <td className={api.errorRate > 0.5 ? styles.warning : ''}>
                          {api.errorRate}%
                        </td>
                        <td>
                          <span className={`${styles.status} ${api.errorRate > 0.5 ? styles.warning : styles.healthy}`}>
                            {api.errorRate > 0.5 ? 'Warning' : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Error Distribution */}
            <div className={styles.chartsRow}>
              <div className={styles.chartSection}>
                <h3>Fehlerverteilung</h3>
                <div className={styles.pieChartContainer}>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={metrics.performance.errorDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {metrics.performance.errorDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.pieChartLegend}>
                    {metrics.performance.errorDistribution?.map((item, index) => (
                      <div key={index} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
                        <span className={styles.legendLabel}>{item.type}</span>
                        <span className={styles.legendValue}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Regional Performance */}
              <div className={styles.chartSection}>
                <h3>Regionale Performance</h3>
                <div className={styles.regionTable}>
                  {metrics.performance.regionPerformance?.map(region => (
                    <div key={region.region} className={styles.regionRow}>
                      <span className={styles.regionName}>{region.region}</span>
                      <div className={styles.regionMetrics}>
                        <span className={styles.regionLatency}>
                          <Zap size={14} />
                          {region.latency}ms
                        </span>
                        <span className={styles.regionAvailability}>
                          <Activity size={14} />
                          {region.availability}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Database Tab */}
        {selectedCategory === 'database' && (
          <>
            <div className={styles.databaseMetricsSection}>
              <h3>Datenbank Performance</h3>
              <div className={styles.databaseChartsGrid}>
                {/* Query Performance Chart */}
                <div className={styles.chartSection}>
                  <h4>Query Performance</h4>
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={metrics.timeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis dataKey="time" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="responseTime"
                          stroke={CHART_COLORS.primary}
                          fill={CHART_COLORS.primary}
                          fillOpacity={0.3}
                          name="Response Time (ms)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Connection Pool */}
                <div className={styles.chartSection}>
                  <h4>Connection Pool</h4>
                  <div className={styles.connectionMetrics}>
                    <div className={styles.connectionMetric}>
                      <span>Active Connections</span>
                      <strong>1,245</strong>
                    </div>
                    <div className={styles.connectionMetric}>
                      <span>Idle Connections</span>
                      <strong>755</strong>
                    </div>
                    <div className={styles.connectionMetric}>
                      <span>Max Connections</span>
                      <strong>10,000</strong>
                    </div>
                    <div className={styles.connectionMetric}>
                      <span>Connection Wait</span>
                      <strong>0ms</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Network Tab */}
        {selectedCategory === 'network' && (
          <>
            <div className={styles.networkSection}>
              <h3>Netzwerk Traffic</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="network"
                      stroke={CHART_COLORS.secondary}
                      fill={CHART_COLORS.secondary}
                      fillOpacity={0.3}
                      name="Bandwidth (MB/s)"
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                      name="Requests/min"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {/* CDN Statistics */}
              <div className={styles.cdnSection}>
                <h3>CDN Statistiken</h3>
                <div className={styles.cdnGrid}>
                  <div className={styles.cdnCard}>
                    <h4>Cache Hit Ratio</h4>
                    <div className={styles.cdnValue}>{metrics.servers.cdn?.cacheRatio}%</div>
                    <div className={styles.cdnStats}>
                      <span>Hits: {(metrics.servers.cdn?.hits / 1000000).toFixed(1)}M</span>
                      <span>Misses: {(metrics.servers.cdn?.misses / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                  <div className={styles.cdnCard}>
                    <h4>Bandwidth</h4>
                    <div className={styles.cdnValue}>{metrics.servers.cdn?.bandwidth}</div>
                    <div className={styles.cdnStats}>
                      <span>Avg Response: {metrics.servers.cdn?.avgResponseTime}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Security Tab */}
        {selectedCategory === 'security' && (
          <>
            <div className={styles.securitySection}>
              {/* Threat Overview */}
              <div className={styles.threatOverview}>
                <h3>Bedrohungsübersicht</h3>
                <div className={styles.threatGrid}>
                  <div className={styles.threatCard}>
                    <Shield size={24} className={styles.threatIcon} />
                    <div className={styles.threatContent}>
                      <span className={styles.threatLabel}>Blockierte Anfragen</span>
                      <span className={styles.threatValue}>{metrics.security.threats?.blocked.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={styles.threatCard}>
                    <AlertTriangle size={24} className={styles.threatIcon} />
                    <div className={styles.threatContent}>
                      <span className={styles.threatLabel}>Verdächtige Aktivitäten</span>
                      <span className={styles.threatValue}>{metrics.security.threats?.suspicious}</span>
                    </div>
                  </div>
                  <div className={styles.threatCard}>
                    <CheckCircle size={24} className={styles.threatIcon} />
                    <div className={styles.threatContent}>
                      <span className={styles.threatLabel}>Erfolgreiche Logins</span>
                      <span className={styles.threatValue}>{metrics.security.threats?.authenticated.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={styles.threatCard}>
                    <AlertTriangle size={24} className={styles.threatIcon} />
                    <div className={styles.threatContent}>
                      <span className={styles.threatLabel}>Fehlgeschlagene Logins</span>
                      <span className={styles.threatValue}>{metrics.security.threats?.failedLogins}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Vulnerability Summary */}
              <div className={styles.vulnerabilitySection}>
                <h3>Schwachstellen-Übersicht</h3>
                <div className={styles.vulnerabilityGrid}>
                  {metrics.security.vulnerabilities?.map(vuln => (
                    <div key={vuln.severity} className={`${styles.vulnerabilityCard} ${styles[vuln.severity.toLowerCase()]}`}>
                      <span className={styles.vulnerabilitySeverity}>{vuln.severity}</span>
                      <span className={styles.vulnerabilityCount}>{vuln.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Compliance Status */}
              <div className={styles.complianceSection}>
                <h3>Compliance Status</h3>
                <div className={styles.complianceGrid}>
                  <div className={styles.complianceItem}>
                    <span className={styles.complianceName}>GDPR</span>
                    <span className={`${styles.complianceStatus} ${styles.compliant}`}>
                      <CheckCircle size={16} />
                      Compliant
                    </span>
                  </div>
                  <div className={styles.complianceItem}>
                    <span className={styles.complianceName}>PCI-DSS</span>
                    <span className={`${styles.complianceStatus} ${styles.compliant}`}>
                      <CheckCircle size={16} />
                      Compliant
                    </span>
                  </div>
                  <div className={styles.complianceItem}>
                    <span className={styles.complianceName}>ISO 27001</span>
                    <span className={`${styles.complianceStatus} ${styles.compliant}`}>
                      <CheckCircle size={16} />
                      Compliant
                    </span>
                  </div>
                </div>
                <div className={styles.lastAudit}>
                  Letztes Audit: {new Date(metrics.security.compliance?.lastAudit).toLocaleDateString('de-CH')}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Recent Alerts */}
      <div className={styles.alertsSection}>
        <div className={styles.alertsHeader}>
          <h3>Aktuelle Warnungen</h3>
          <button className={styles.clearAlertsButton}>
            Alle löschen
          </button>
        </div>
        <div className={styles.alertsList}>
          <AlertItem
            alert={{
              severity: 'warning',
              title: 'Hohe CPU-Auslastung',
              message: 'Server prod-ch-1 erreicht 78% CPU-Auslastung',
              time: 'vor 5 Minuten'
            }}
          />
          <AlertItem
            alert={{
              severity: 'info',
              title: 'Backup abgeschlossen',
              message: 'Tägliches Backup erfolgreich durchgeführt',
              time: 'vor 1 Stunde'
            }}
          />
          <AlertItem
            alert={{
              severity: 'warning',
              title: 'Erhöhte Fehlerrate',
              message: 'API Endpoint /api/payments zeigt erhöhte Fehlerrate',
              time: 'vor 2 Stunden'
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default SystemMetrics;