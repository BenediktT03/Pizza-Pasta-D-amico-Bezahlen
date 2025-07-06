/**
 * EATECH - Analytics Dashboard
 * Version: 1.0.0
 * Description: Echtzeit Analytics Dashboard mit interaktiven Charts
 * Features: Revenue Tracking, Order Analytics, Product Performance, Customer Insights
 * 
 * Kapitel: Phase 4 - Advanced Features - Analytics Dashboard
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calendar, Download, Filter,
  DollarSign, ShoppingCart, Users, Package, Clock, Star,
  AlertTriangle, ChevronUp, ChevronDown, MoreVertical
} from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';

// Hooks
import { useAnalytics } from '../../../packages/core/src/hooks/useAnalytics';
import { useTenant } from '../../../packages/core/src/hooks/useTenant';
import { useOffline } from '../../../packages/core/src/hooks/useOffline';

// Components
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import MetricCard from '../../components/Analytics/MetricCard';
import ChartCard from '../../components/Analytics/ChartCard';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import ExportButton from '../../components/ExportButton/ExportButton';

// Styles
import styles from './Analytics.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const TIME_RANGES = {
  today: { label: 'Heute', days: 0 },
  yesterday: { label: 'Gestern', days: 1 },
  week: { label: 'Diese Woche', days: 7 },
  month: { label: 'Dieser Monat', days: 30 },
  quarter: { label: 'Quartal', days: 90 },
  year: { label: 'Jahr', days: 365 }
};

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gradient: {
    start: '#3b82f6',
    end: '#8b5cf6'
  }
};

const METRIC_CONFIGS = [
  {
    id: 'revenue',
    title: 'Umsatz',
    icon: DollarSign,
    color: CHART_COLORS.primary,
    format: 'currency',
    trend: true
  },
  {
    id: 'orders',
    title: 'Bestellungen',
    icon: ShoppingCart,
    color: CHART_COLORS.secondary,
    format: 'number',
    trend: true
  },
  {
    id: 'customers',
    title: 'Kunden',
    icon: Users,
    color: CHART_COLORS.accent,
    format: 'number',
    trend: true
  },
  {
    id: 'avgOrderValue',
    title: 'Ø Bestellwert',
    icon: Package,
    color: CHART_COLORS.purple,
    format: 'currency',
    trend: true
  },
  {
    id: 'avgPrepTime',
    title: 'Ø Zubereitungszeit',
    icon: Clock,
    color: CHART_COLORS.pink,
    format: 'time',
    trend: false,
    suffix: 'min'
  },
  {
    id: 'rating',
    title: 'Bewertung',
    icon: Star,
    color: CHART_COLORS.accent,
    format: 'decimal',
    trend: false,
    suffix: '/5'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Analytics() {
  const { currentTenant } = useTenant();
  const { isOnline } = useOffline();
  const analytics = useAnalytics();
  
  // State
  const [timeRange, setTimeRange] = useState('today');
  const [dateRange, setDateRange] = useState({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [chartType, setChartType] = useState('line');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  
  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================
  const fetchAnalyticsData = useCallback(async () => {
    if (!currentTenant?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch main data
      const mainData = await analytics.getAnalytics({
        tenantId: currentTenant.id,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      
      // Fetch comparison data (previous period)
      const daysDiff = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
      const compareStart = subDays(dateRange.start, daysDiff);
      const compareEnd = subDays(dateRange.end, daysDiff);
      
      const comparisonData = await analytics.getAnalytics({
        tenantId: currentTenant.id,
        startDate: compareStart,
        endDate: compareEnd
      });
      
      setData(mainData);
      setCompareData(comparisonData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, dateRange, analytics]);
  
  // Auto-refresh
  useEffect(() => {
    fetchAnalyticsData();
    
    const interval = setInterval(fetchAnalyticsData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAnalyticsData, refreshInterval]);
  
  // ==========================================================================
  // TIME RANGE HANDLING
  // ==========================================================================
  const handleTimeRangeChange = useCallback((range) => {
    setTimeRange(range);
    
    const now = new Date();
    let start, end;
    
    switch (range) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'week':
        start = startOfWeek(now, { locale: de });
        end = now;
        break;
      case 'month':
        start = startOfMonth(now);
        end = now;
        break;
      case 'quarter':
        start = subDays(now, 90);
        end = now;
        break;
      case 'year':
        start = subDays(now, 365);
        end = now;
        break;
      default:
        return;
    }
    
    setDateRange({ start, end });
  }, []);
  
  // ==========================================================================
  // CALCULATIONS
  // ==========================================================================
  const metrics = useMemo(() => {
    if (!data) return null;
    
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };
    
    return {
      revenue: {
        value: data.summary.totalRevenue,
        trend: calculateTrend(data.summary.totalRevenue, compareData?.summary.totalRevenue),
        previous: compareData?.summary.totalRevenue
      },
      orders: {
        value: data.summary.totalOrders,
        trend: calculateTrend(data.summary.totalOrders, compareData?.summary.totalOrders),
        previous: compareData?.summary.totalOrders
      },
      customers: {
        value: data.summary.uniqueCustomers,
        trend: calculateTrend(data.summary.uniqueCustomers, compareData?.summary.uniqueCustomers),
        previous: compareData?.summary.uniqueCustomers
      },
      avgOrderValue: {
        value: data.summary.averageOrderValue,
        trend: calculateTrend(data.summary.averageOrderValue, compareData?.summary.averageOrderValue),
        previous: compareData?.summary.averageOrderValue
      },
      avgPrepTime: {
        value: data.summary.averagePreparationTime,
        trend: null,
        previous: compareData?.summary.averagePreparationTime
      },
      rating: {
        value: data.summary.averageRating,
        trend: null,
        previous: compareData?.summary.averageRating
      }
    };
  }, [data, compareData]);
  
  const chartData = useMemo(() => {
    if (!data?.timeSeries) return [];
    
    return data.timeSeries.map(point => ({
      time: format(new Date(point.timestamp), 'HH:mm', { locale: de }),
      date: format(new Date(point.timestamp), 'dd.MM', { locale: de }),
      revenue: point.revenue,
      orders: point.orders,
      customers: point.customers,
      avgOrderValue: point.avgOrderValue
    }));
  }, [data]);
  
  const topProducts = useMemo(() => {
    if (!data?.products) return [];
    
    return data.products
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(product => ({
        name: product.name,
        revenue: product.revenue,
        quantity: product.quantity,
        percentage: (product.revenue / data.summary.totalRevenue) * 100
      }));
  }, [data]);
  
  const categoryBreakdown = useMemo(() => {
    if (!data?.categories) return [];
    
    return data.categories.map(category => ({
      name: category.name,
      value: category.revenue,
      percentage: (category.revenue / data.summary.totalRevenue) * 100
    }));
  }, [data]);
  
  const hourlyDistribution = useMemo(() => {
    if (!data?.hourlyDistribution) return [];
    
    return Object.entries(data.hourlyDistribution).map(([hour, count]) => ({
      hour: `${hour}:00`,
      orders: count
    }));
  }, [data]);
  
  const paymentMethods = useMemo(() => {
    if (!data?.paymentMethods) return [];
    
    const total = Object.values(data.paymentMethods).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(data.paymentMethods).map(([method, count]) => ({
      name: method,
      value: count,
      percentage: (count / total) * 100
    }));
  }, [data]);
  
  // ==========================================================================
  // EXPORT FUNCTIONALITY
  // ==========================================================================
  const handleExport = useCallback(async (format) => {
    try {
      const exportData = {
        tenant: currentTenant.name,
        period: {
          start: format(dateRange.start, 'dd.MM.yyyy', { locale: de }),
          end: format(dateRange.end, 'dd.MM.yyyy', { locale: de })
        },
        summary: data.summary,
        products: topProducts,
        categories: categoryBreakdown,
        hourlyDistribution,
        paymentMethods
      };
      
      if (format === 'csv') {
        // Convert to CSV
        const csv = convertToCSV(exportData);
        downloadFile(csv, `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
      } else if (format === 'pdf') {
        // Generate PDF report
        await analytics.generateReport(exportData, 'pdf');
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [currentTenant, dateRange, data, topProducts, categoryBreakdown, hourlyDistribution, paymentMethods, analytics]);
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  if (loading && !data) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p>Lade Analytics-Daten...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.analyticsContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Analytics Dashboard</h1>
          <p className={styles.subtitle}>
            Echtzeit-Einblicke in Ihr Geschäft
          </p>
        </div>
        
        <div className={styles.headerRight}>
          {/* Time Range Selector */}
          <div className={styles.timeRangeSelector}>
            {Object.entries(TIME_RANGES).map(([key, config]) => (
              <button
                key={key}
                className={`${styles.timeRangeButton} ${timeRange === key ? styles.active : ''}`}
                onClick={() => handleTimeRangeChange(key)}
              >
                {config.label}
              </button>
            ))}
          </div>
          
          {/* Date Range Picker */}
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onChange={setDateRange}
          />
          
          {/* Export Button */}
          <ExportButton onExport={handleExport} />
          
          {/* Offline Indicator */}
          {!isOnline && (
            <div className={styles.offlineIndicator}>
              <AlertTriangle size={16} />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        {METRIC_CONFIGS.map(config => {
          const metric = metrics?.[config.id];
          
          return (
            <MetricCard
              key={config.id}
              title={config.title}
              value={metric?.value || 0}
              trend={metric?.trend}
              icon={config.icon}
              color={config.color}
              format={config.format}
              suffix={config.suffix}
              onClick={() => setSelectedMetric(config.id)}
              selected={selectedMetric === config.id}
            />
          );
        })}
      </div>
      
      {/* Main Chart */}
      <ChartCard
        title="Umsatzentwicklung"
        subtitle="Verlauf über den gewählten Zeitraum"
        actions={
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className={styles.chartTypeSelector}
          >
            <option value="line">Liniendiagramm</option>
            <option value="bar">Balkendiagramm</option>
            <option value="area">Flächendiagramm</option>
          </select>
        }
      >
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.gradient.start} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={CHART_COLORS.gradient.end} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey={timeRange === 'today' ? 'time' : 'date'} 
                stroke="#666"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#666"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `CHF ${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [`CHF ${value}`, 'Umsatz']}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke={CHART_COLORS.primary} 
                strokeWidth={3}
                dot={{ fill: CHART_COLORS.primary, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke={CHART_COLORS.secondary} 
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.secondary, r: 3 }}
                yAxisId="right"
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                stroke="#666"
                tick={{ fontSize: 12 }}
              />
            </LineChart>
          ) : chartType === 'bar' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey={timeRange === 'today' ? 'time' : 'date'} 
                stroke="#666"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#666"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `CHF ${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[8, 8, 0, 0]} />
              <Bar dataKey="orders" fill={CHART_COLORS.secondary} radius={[8, 8, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey={timeRange === 'today' ? 'time' : 'date'} 
                stroke="#666"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#666"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `CHF ${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke={CHART_COLORS.primary} 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </ChartCard>
      
      {/* Secondary Charts Grid */}
      <div className={styles.chartsGrid}>
        {/* Top Products */}
        <ChartCard title="Top 10 Produkte" subtitle="Nach Umsatz">
          <div className={styles.productsList}>
            {topProducts.map((product, index) => (
              <div key={index} className={styles.productItem}>
                <div className={styles.productInfo}>
                  <span className={styles.productRank}>{index + 1}</span>
                  <span className={styles.productName}>{product.name}</span>
                </div>
                <div className={styles.productMetrics}>
                  <span className={styles.productQuantity}>{product.quantity}x</span>
                  <span className={styles.productRevenue}>CHF {product.revenue.toFixed(2)}</span>
                </div>
                <div className={styles.productBar}>
                  <div 
                    className={styles.productBarFill}
                    style={{ 
                      width: `${product.percentage}%`,
                      backgroundColor: CHART_COLORS.primary
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
        
        {/* Category Breakdown */}
        <ChartCard title="Umsatz nach Kategorie" subtitle="Prozentuale Verteilung">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `CHF ${value.toFixed(2)}`}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        
        {/* Hourly Distribution */}
        <ChartCard title="Bestellungen nach Uhrzeit" subtitle="Verteilung über den Tag">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="hour" 
                stroke="#666"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#666"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="orders" 
                fill={CHART_COLORS.accent}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        
        {/* Payment Methods */}
        <ChartCard title="Zahlungsmethoden" subtitle="Verteilung der genutzten Zahlungsarten">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentMethods}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} (${paymentMethods.find(p => p.name === name)?.percentage.toFixed(1)}%)`, name]}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      
      {/* Performance Metrics */}
      <div className={styles.performanceSection}>
        <h2>Performance Metriken</h2>
        <div className={styles.performanceGrid}>
          {/* Conversion Rate */}
          <div className={styles.performanceCard}>
            <h3>Conversion Rate</h3>
            <div className={styles.performanceValue}>
              {data?.performance?.conversionRate?.toFixed(1)}%
            </div>
            <div className={styles.performanceSubtext}>
              Besucher zu Käufer
            </div>
          </div>
          
          {/* Customer Retention */}
          <div className={styles.performanceCard}>
            <h3>Wiederkehrende Kunden</h3>
            <div className={styles.performanceValue}>
              {data?.performance?.returningCustomers?.toFixed(1)}%
            </div>
            <div className={styles.performanceSubtext}>
              der Gesamtkunden
            </div>
          </div>
          
          {/* Order Completion Rate */}
          <div className={styles.performanceCard}>
            <h3>Bestellabschlussrate</h3>
            <div className={styles.performanceValue}>
              {data?.performance?.completionRate?.toFixed(1)}%
            </div>
            <div className={styles.performanceSubtext}>
              Erfolgreich abgeschlossen
            </div>
          </div>
          
          {/* Average Session Duration */}
          <div className={styles.performanceCard}>
            <h3>Ø Sitzungsdauer</h3>
            <div className={styles.performanceValue}>
              {Math.floor(data?.performance?.avgSessionDuration / 60)}:{(data?.performance?.avgSessionDuration % 60).toString().padStart(2, '0')}
            </div>
            <div className={styles.performanceSubtext}>
              Minuten:Sekunden
            </div>
          </div>
        </div>
      </div>
      
      {/* Auto-refresh indicator */}
      <div className={styles.footer}>
        <div className={styles.autoRefresh}>
          <Clock size={16} />
          <span>Automatische Aktualisierung alle {refreshInterval / 1000} Sekunden</span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className={styles.refreshSelector}
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
        </div>
        
        <div className={styles.lastUpdate}>
          Letzte Aktualisierung: {format(new Date(), 'HH:mm:ss', { locale: de })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function convertToCSV(data) {
  // Implementation for CSV conversion
  const rows = [];
  
  // Headers
  rows.push(['EATECH Analytics Report']);
  rows.push([`Zeitraum: ${data.period.start} - ${data.period.end}`]);
  rows.push(['']);
  
  // Summary
  rows.push(['Zusammenfassung']);
  rows.push(['Metrik', 'Wert']);
  Object.entries(data.summary).forEach(([key, value]) => {
    rows.push([key, value]);
  });
  rows.push(['']);
  
  // Top Products
  rows.push(['Top Produkte']);
  rows.push(['Rang', 'Produkt', 'Menge', 'Umsatz']);
  data.products.forEach((product, index) => {
    rows.push([index + 1, product.name, product.quantity, product.revenue]);
  });
  
  // Convert to CSV string
  return rows.map(row => row.join(',')).join('\n');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}