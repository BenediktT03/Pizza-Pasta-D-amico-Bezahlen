/**
 * EATECH - Voice Analytics Component
 * Version: 4.1.0
 * Description: Comprehensive voice usage analytics and insights dashboard
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/VoiceAnalytics.jsx
 * 
 * Features:
 * - Voice usage statistics
 * - Command frequency analysis
 * - Performance metrics visualization
 * - User behavior insights
 * - Swiss German dialect usage
 * - Real-time charts and graphs
 * - Export analytics data
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef 
} from 'react';
import { 
  BarChart3, 
  X, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Mic, 
  Target, 
  Users,
  Activity, 
  PieChart, 
  Download,
  Calendar, 
  Filter, 
  RefreshCw,
  Award, 
  Zap, 
  Globe,
  MessageSquare, 
  CheckCircle,
  AlertCircle, 
  Info, 
  ArrowUp,
  ArrowDown, 
  Minus, 
  Eye,
  Share, 
  Settings, 
  Database
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ComposedChart
} from 'recharts';
import { useVoiceSettings } from '../hooks/useVoiceSettings';
import styles from './VoiceAnalytics.module.css';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const TIME_PERIODS = {
  HOUR: { label: '1 Stunde', hours: 1 },
  DAY: { label: '24 Stunden', hours: 24 },
  WEEK: { label: '7 Tage', hours: 168 },
  MONTH: { label: '30 Tage', hours: 720 }
};

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f97316',
  info: '#06b6d4',
  neutral: '#6b7280'
};

const SWISS_DIALECT_COLORS = {
  'de-CH-ZH': '#dc2626',  // Rot für Zürich
  'de-CH-BE': '#059669',  // Grün für Bern
  'de-CH-BS': '#7c3aed',  // Lila für Basel
  'de-CH-LU': '#ea580c',  // Orange für Luzern
  'de-CH-SG': '#0891b2',  // Türkis für St. Gallen
  'other': '#6b7280'      // Grau für andere
};

const METRIC_CARDS = [
  {
    id: 'total_commands',
    title: 'Gesamt Befehle',
    icon: Mic,
    format: 'number',
    trend: true
  },
  {
    id: 'success_rate',
    title: 'Erfolgsrate',
    icon: Target,
    format: 'percentage',
    trend: true
  },
  {
    id: 'avg_confidence',
    title: 'Ø Vertrauen',
    icon: Award,
    format: 'percentage',
    trend: true
  },
  {
    id: 'response_time',
    title: 'Ø Antwortzeit',
    icon: Zap,
    format: 'duration',
    trend: true
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateMockData = (period) => {
  const hours = TIME_PERIODS[period].hours;
  const dataPoints = Math.min(hours, 48); // Max 48 data points
  const interval = hours / dataPoints;
  
  const data = [];
  const now = new Date();
  
  for (let i = dataPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * interval * 60 * 60 * 1000);
    
    data.push({
      timestamp: timestamp.toISOString(),
      time: timestamp.toLocaleTimeString('de-CH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      date: timestamp.toLocaleDateString('de-CH'),
      commands: Math.floor(Math.random() * 20 + 5),
      success: Math.floor(Math.random() * 15 + 10),
      errors: Math.floor(Math.random() * 3),
      confidence: Math.random() * 0.3 + 0.7,
      responseTime: Math.random() * 500 + 200,
      dialects: {
        'de-CH-ZH': Math.floor(Math.random() * 8),
        'de-CH-BE': Math.floor(Math.random() * 5),
        'de-CH-BS': Math.floor(Math.random() * 3),
        'de-CH-LU': Math.floor(Math.random() * 2),
        'de-CH-SG': Math.floor(Math.random() * 2)
      }
    });
  }
  
  return data;
};

const formatValue = (value, format) => {
  switch (format) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'duration':
      return `${value.toFixed(0)}ms`;
    case 'number':
      return value.toLocaleString('de-CH');
    default:
      return value.toString();
  }
};

const calculateTrend = (data, metric) => {
  if (data.length < 2) return 0;
  
  const recent = data.slice(-5).reduce((sum, item) => sum + (item[metric] || 0), 0) / 5;
  const previous = data.slice(-10, -5).reduce((sum, item) => sum + (item[metric] || 0), 0) / 5;
  
  if (previous === 0) return 0;
  return ((recent - previous) / previous) * 100;
};

// ============================================================================
// COMPONENT
// ============================================================================

const VoiceAnalytics = ({
  metrics = {},
  commandHistory = [],
  onClose,
  className = '',
  ...props
}) => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================
  
  const { settings, getUsageStatistics } = useVoiceSettings();
  
  const [selectedPeriod, setSelectedPeriod] = useState('DAY');
  const [selectedMetrics, setSelectedMetrics] = useState(['commands', 'success', 'confidence']);
  const [chartType, setChartType] = useState('line');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [aggregatedMetrics, setAggregatedMetrics] = useState({});
  const [dialectData, setDialectData] = useState([]);
  const [commandFrequency, setCommandFrequency] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Refs
  const chartRef = useRef(null);
  
  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================
  
  const timeSeriesData = useMemo(() => {
    return generateMockData(selectedPeriod);
  }, [selectedPeriod]);
  
  const calculatedMetrics = useMemo(() => {
    const stats = getUsageStatistics();
    const mockData = timeSeriesData;
    
    const totalCommands = mockData.reduce((sum, item) => sum + item.commands, 0);
    const totalSuccess = mockData.reduce((sum, item) => sum + item.success, 0);
    const avgConfidence = mockData.reduce((sum, item) => sum + item.confidence, 0) / mockData.length;
    const avgResponseTime = mockData.reduce((sum, item) => sum + item.responseTime, 0) / mockData.length;
    
    return {
      total_commands: {
        value: totalCommands,
        trend: calculateTrend(mockData, 'commands'),
        previous: totalCommands * 0.85
      },
      success_rate: {
        value: totalSuccess / totalCommands,
        trend: calculateTrend(mockData, 'success'),
        previous: (totalSuccess / totalCommands) * 0.9
      },
      avg_confidence: {
        value: avgConfidence,
        trend: calculateTrend(mockData, 'confidence'),
        previous: avgConfidence * 0.95
      },
      response_time: {
        value: avgResponseTime,
        trend: -calculateTrend(mockData, 'responseTime'), // Negative because lower is better
        previous: avgResponseTime * 1.1
      }
    };
  }, [timeSeriesData, getUsageStatistics]);
  
  const dialectAnalytics = useMemo(() => {
    const dialectCounts = {};
    
    timeSeriesData.forEach(item => {
      Object.entries(item.dialects).forEach(([dialect, count]) => {
        dialectCounts[dialect] = (dialectCounts[dialect] || 0) + count;
      });
    });
    
    return Object.entries(dialectCounts).map(([dialect, count]) => ({
      name: dialect,
      value: count,
      color: SWISS_DIALECT_COLORS[dialect] || SWISS_DIALECT_COLORS.other,
      percentage: (count / Object.values(dialectCounts).reduce((sum, c) => sum + c, 0)) * 100
    }));
  }, [timeSeriesData]);
  
  const topCommands = useMemo(() => {
    // Mock command frequency data
    return [
      { command: 'Pizza bestellen', count: 45, success_rate: 0.95 },
      { command: 'Warenkorb zeigen', count: 38, success_rate: 0.98 },
      { command: 'Menü öffnen', count: 32, success_rate: 0.92 },
      { command: 'Kaffee bestellen', count: 28, success_rate: 0.97 },
      { command: 'Hilfe', count: 25, success_rate: 0.88 },
      { command: 'Zur Kasse', count: 22, success_rate: 0.94 },
      { command: 'Bestellung stornieren', count: 15, success_rate: 0.85 },
      { command: 'Favoriten zeigen', count: 12, success_rate: 0.91 }
    ];
  }, []);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handlePeriodChange = useCallback((period) => {
    setSelectedPeriod(period);
    setIsLoading(true);
    
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);
  
  const handleMetricToggle = useCallback((metric) => {
    setSelectedMetrics(prev => 
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  }, []);
  
  const handleExportData = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      period: selectedPeriod,
      metrics: calculatedMetrics,
      timeSeriesData,
      dialectData: dialectAnalytics,
      topCommands,
      settings: settings.stats
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice-analytics-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [selectedPeriod, calculatedMetrics, timeSeriesData, dialectAnalytics, topCommands, settings.stats]);
  
  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderMetricCard = useCallback((metricConfig) => {
    const metric = calculatedMetrics[metricConfig.id];
    if (!metric) return null;
    
    const Icon = metricConfig.icon;
    const trendDirection = metric.trend > 0 ? 'up' : metric.trend < 0 ? 'down' : 'stable';
    const TrendIcon = trendDirection === 'up' ? ArrowUp : 
                     trendDirection === 'down' ? ArrowDown : Minus;
    
    return (
      <div key={metricConfig.id} className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <Icon size={20} />
          <span className={styles.metricTitle}>{metricConfig.title}</span>
        </div>
        
        <div className={styles.metricValue}>
          {formatValue(metric.value, metricConfig.format)}
        </div>
        
        {metricConfig.trend && (
          <div className={`${styles.metricTrend} ${styles[trendDirection]}`}>
            <TrendIcon size={14} />
            <span>{Math.abs(metric.trend).toFixed(1)}%</span>
            <span className={styles.trendLabel}>vs. vorherige Periode</span>
          </div>
        )}
      </div>
    );
  }, [calculatedMetrics]);
  
  const renderTimeSeriesChart = useCallback(() => {
    const ChartComponent = chartType === 'area' ? AreaChart : 
                          chartType === 'bar' ? BarChart : LineChart;
    
    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h4>Zeitverlauf</h4>
          <div className={styles.chartControls}>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className={styles.chartTypeSelector}
            >
              <option value="line">Linie</option>
              <option value="area">Fläche</option>
              <option value="bar">Balken</option>
            </select>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(label) => `Zeit: ${label}`}
              formatter={(value, name) => [
                formatValue(value, name === 'confidence' ? 'percentage' : 'number'),
                name === 'commands' ? 'Befehle' :
                name === 'success' ? 'Erfolgreich' :
                name === 'confidence' ? 'Vertrauen' : name
              ]}
            />
            <Legend />
            
            {selectedMetrics.includes('commands') && (
              chartType === 'line' ? (
                <Line
                  type="monotone"
                  dataKey="commands"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  name="Befehle"
                />
              ) : chartType === 'area' ? (
                <Area
                  type="monotone"
                  dataKey="commands"
                  stackId="1"
                  stroke={CHART_COLORS.primary}
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.6}
                  name="Befehle"
                />
              ) : (
                <Bar
                  dataKey="commands"
                  fill={CHART_COLORS.primary}
                  name="Befehle"
                />
              )
            )}
            
            {selectedMetrics.includes('success') && (
              chartType === 'line' ? (
                <Line
                  type="monotone"
                  dataKey="success"
                  stroke={CHART_COLORS.success}
                  strokeWidth={2}
                  name="Erfolgreich"
                />
              ) : chartType === 'area' ? (
                <Area
                  type="monotone"
                  dataKey="success"
                  stackId="1"
                  stroke={CHART_COLORS.success}
                  fill={CHART_COLORS.success}
                  fillOpacity={0.6}
                  name="Erfolgreich"
                />
              ) : (
                <Bar
                  dataKey="success"
                  fill={CHART_COLORS.success}
                  name="Erfolgreich"
                />
              )
            )}
            
            {selectedMetrics.includes('confidence') && (
              chartType === 'line' ? (
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke={CHART_COLORS.accent}
                  strokeWidth={2}
                  name="Vertrauen"
                />
              ) : chartType === 'area' ? (
                <Area
                  type="monotone"
                  dataKey="confidence"
                  stackId="2"
                  stroke={CHART_COLORS.accent}
                  fill={CHART_COLORS.accent}
                  fillOpacity={0.6}
                  name="Vertrauen"
                />
              ) : (
                <Bar
                  dataKey="confidence"
                  fill={CHART_COLORS.accent}
                  name="Vertrauen"
                />
              )
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  }, [chartType, timeSeriesData, selectedMetrics]);
  
  const renderDialectChart = useCallback(() => {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h4>Dialekt-Verteilung</h4>
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <RechartsPieChart>
            <Pie
              data={dialectAnalytics}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
            >
              {dialectAnalytics.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [value, 'Verwendungen']}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    );
  }, [dialectAnalytics]);
  
  const renderCommandFrequency = useCallback(() => {
    return (
      <div className={styles.commandFrequencySection}>
        <h4>Häufigste Befehle</h4>
        <div className={styles.commandList}>
          {topCommands.map((command, index) => (
            <div key={index} className={styles.commandItem}>
              <div className={styles.commandRank}>#{index + 1}</div>
              <div className={styles.commandDetails}>
                <div className={styles.commandName}>{command.command}</div>
                <div className={styles.commandStats}>
                  <span className={styles.commandCount}>{command.count} mal</span>
                  <span className={styles.commandSuccess}>
                    {formatValue(command.success_rate, 'percentage')} Erfolg
                  </span>
                </div>
              </div>
              <div className={styles.commandBar}>
                <div 
                  className={styles.commandBarFill}
                  style={{ 
                    width: `${(command.count / topCommands[0].count) * 100}%`,
                    backgroundColor: command.success_rate > 0.9 ? CHART_COLORS.success : 
                                   command.success_rate > 0.8 ? CHART_COLORS.accent : 
                                   CHART_COLORS.error
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [topCommands]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    // Initialize with mock data
    setData(timeSeriesData);
  }, [timeSeriesData]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className={`${styles.voiceAnalytics} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <BarChart3 size={24} />
          <h2>Voice Analytics</h2>
        </div>
        
        <div className={styles.headerActions}>
          <div className={styles.periodSelector}>
            {Object.entries(TIME_PERIODS).map(([key, period]) => (
              <button
                key={key}
                className={`
                  ${styles.periodButton} 
                  ${selectedPeriod === key ? styles.active : ''}
                `}
                onClick={() => handlePeriodChange(key)}
              >
                {period.label}
              </button>
            ))}
          </div>
          
          <button
            className={styles.actionButton}
            onClick={handleExportData}
          >
            <Download size={16} />
            Export
          </button>
          
          <button
            className={styles.closeButton}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Metrics Cards */}
      <div className={styles.metricsGrid}>
        {METRIC_CARDS.map(renderMetricCard)}
      </div>
      
      {/* Charts Section */}
      <div className={styles.chartsSection}>
        {/* Time Series Chart */}
        {renderTimeSeriesChart()}
        
        {/* Bottom Charts Row */}
        <div className={styles.bottomChartsRow}>
          {/* Dialect Chart */}
          {renderDialectChart()}
          
          {/* Command Frequency */}
          {renderCommandFrequency()}
        </div>
      </div>
      
      {/* Metric Toggles */}
      <div className={styles.metricToggles}>
        <h4>Angezeigte Metriken</h4>
        <div className={styles.toggles}>
          {[
            { id: 'commands', label: 'Befehle', color: CHART_COLORS.primary },
            { id: 'success', label: 'Erfolgreich', color: CHART_COLORS.success },
            { id: 'confidence', label: 'Vertrauen', color: CHART_COLORS.accent }
          ].map(metric => (
            <button
              key={metric.id}
              className={`
                ${styles.metricToggle} 
                ${selectedMetrics.includes(metric.id) ? styles.active : ''}
              `}
              onClick={() => handleMetricToggle(metric.id)}
              style={{ 
                borderColor: metric.color,
                backgroundColor: selectedMetrics.includes(metric.id) ? metric.color : 'transparent'
              }}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>
            <RefreshCw className={styles.spinning} size={24} />
            <span>Lade Daten...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export { VoiceAnalytics };