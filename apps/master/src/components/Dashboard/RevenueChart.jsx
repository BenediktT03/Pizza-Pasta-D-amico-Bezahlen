/**
 * EATECH - Revenue Chart Component
 * Version: 1.0.0
 * Description: Interaktive Umsatz-Visualisierung mit verschiedenen Zeiträumen
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/components/Dashboard/RevenueChart.jsx
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Filter,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import styles from './RevenueChart.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const PERIODS = {
  day: { label: 'Tag', days: 1, format: 'HH:mm' },
  week: { label: 'Woche', days: 7, format: 'DD.MM' },
  month: { label: 'Monat', days: 30, format: 'DD.MM' },
  quarter: { label: 'Quartal', days: 90, format: 'MMM' },
  year: { label: 'Jahr', days: 365, format: 'MMM' }
};

const CHART_COLORS = {
  revenue: '#3b82f6',
  orders: '#10b981',
  avgOrderValue: '#f59e0b',
  customers: '#8b5cf6'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const generateMockData = (period) => {
  const days = PERIODS[period].days;
  const dataPoints = period === 'day' ? 24 : days;
  const baseRevenue = 50000;
  const variation = 0.3;
  
  return Array.from({ length: dataPoints }, (_, i) => {
    const date = new Date();
    if (period === 'day') {
      date.setHours(date.getHours() - (dataPoints - i - 1));
    } else {
      date.setDate(date.getDate() - (dataPoints - i - 1));
    }
    
    // Simulate weekly patterns
    const dayOfWeek = date.getDay();
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1;
    
    // Simulate daily patterns for hourly data
    const hour = date.getHours();
    const hourMultiplier = period === 'day' ? 
      (hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21) ? 1.5 : 0.7 : 1;
    
    const revenue = baseRevenue * weekendMultiplier * hourMultiplier * 
      (1 + (Math.random() - 0.5) * variation);
    
    return {
      date,
      revenue: Math.floor(revenue),
      orders: Math.floor(revenue / 35),
      customers: Math.floor(revenue / 45),
      avgOrderValue: revenue / Math.floor(revenue / 35)
    };
  });
};

const formatDate = (date, format) => {
  const formats = {
    'HH:mm': () => date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
    'DD.MM': () => date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }),
    'MMM': () => date.toLocaleDateString('de-CH', { month: 'short' })
  };
  
  return formats[format] ? formats[format]() : date.toLocaleDateString('de-CH');
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const ChartTooltip = ({ data, x, y }) => {
  if (!data) return null;
  
  return (
    <div 
      className={styles.tooltip}
      style={{ left: x, top: y }}
    >
      <div className={styles.tooltipDate}>
        {formatDate(data.date, 'DD.MM HH:mm')}
      </div>
      <div className={styles.tooltipContent}>
        <div className={styles.tooltipRow}>
          <span style={{ color: CHART_COLORS.revenue }}>Umsatz:</span>
          <strong>{formatCurrency(data.revenue)}</strong>
        </div>
        <div className={styles.tooltipRow}>
          <span style={{ color: CHART_COLORS.orders }}>Bestellungen:</span>
          <strong>{data.orders}</strong>
        </div>
        <div className={styles.tooltipRow}>
          <span style={{ color: CHART_COLORS.avgOrderValue }}>Ø Bestellwert:</span>
          <strong>{formatCurrency(data.avgOrderValue)}</strong>
        </div>
        <div className={styles.tooltipRow}>
          <span style={{ color: CHART_COLORS.customers }}>Kunden:</span>
          <strong>{data.customers}</strong>
        </div>
      </div>
    </div>
  );
};

const MetricToggle = ({ metric, label, color, visible, onToggle }) => {
  return (
    <button
      className={`${styles.metricToggle} ${!visible ? styles.disabled : ''}`}
      onClick={() => onToggle(metric)}
    >
      <span 
        className={styles.metricColor}
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
      {visible ? <Eye size={14} /> : <EyeOff size={14} />}
    </button>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const RevenueChart = ({ 
  period = 'week',
  height = 300,
  showControls = true,
  data: externalData = null 
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [chartData, setChartData] = useState([]);
  const [visibleMetrics, setVisibleMetrics] = useState({
    revenue: true,
    orders: false,
    avgOrderValue: false,
    customers: false
  });
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Generate or use external data
  useEffect(() => {
    if (externalData) {
      setChartData(externalData);
    } else {
      setChartData(generateMockData(selectedPeriod));
    }
  }, [selectedPeriod, externalData]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
    const previousPeriodRevenue = totalRevenue * (1 - 0.15); // Mock previous period
    const growth = ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;
    
    return {
      total: totalRevenue,
      average: totalRevenue / chartData.length,
      growth,
      peak: Math.max(...chartData.map(d => d.revenue)),
      orders: chartData.reduce((sum, d) => sum + d.orders, 0)
    };
  }, [chartData]);
  
  // Calculate chart dimensions and scales
  const chartDimensions = useMemo(() => {
    const padding = { top: 20, right: 20, bottom: 40, left: 80 };
    const width = 800; // Base width
    const maxRevenue = Math.max(...chartData.map(d => d.revenue));
    const maxOrders = Math.max(...chartData.map(d => d.orders));
    
    return {
      width,
      height,
      padding,
      scaleX: (index) => padding.left + (index / (chartData.length - 1)) * (width - padding.left - padding.right),
      scaleY: {
        revenue: (value) => height - padding.bottom - (value / maxRevenue) * (height - padding.top - padding.bottom),
        orders: (value) => height - padding.bottom - (value / maxOrders) * (height - padding.top - padding.bottom),
        avgOrderValue: (value) => height - padding.bottom - (value / 50) * (height - padding.top - padding.bottom),
        customers: (value) => height - padding.bottom - (value / (maxOrders * 1.2)) * (height - padding.top - padding.bottom)
      }
    };
  }, [chartData, height]);
  
  // Handle metric toggle
  const handleMetricToggle = (metric) => {
    setVisibleMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };
  
  // Handle export
  const handleExport = () => {
    const csvContent = [
      ['Datum', 'Umsatz', 'Bestellungen', 'Durchschn. Bestellwert', 'Kunden'],
      ...chartData.map(d => [
        formatDate(d.date, 'DD.MM.YYYY HH:mm'),
        d.revenue,
        d.orders,
        d.avgOrderValue.toFixed(2),
        d.customers
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `umsatz-${selectedPeriod}-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Render chart lines
  const renderChartLine = (metric, color) => {
    if (!visibleMetrics[metric] || chartData.length === 0) return null;
    
    const points = chartData.map((d, i) => ({
      x: chartDimensions.scaleX(i),
      y: chartDimensions.scaleY[metric](d[metric])
    }));
    
    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
    
    const areaData = `${pathData} L ${points[points.length - 1].x} ${height - chartDimensions.padding.bottom} L ${points[0].x} ${height - chartDimensions.padding.bottom} Z`;
    
    return (
      <g key={metric}>
        <defs>
          <linearGradient id={`gradient-${metric}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path
          d={areaData}
          fill={`url(#gradient-${metric})`}
        />
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill={color}
            className={styles.dataPoint}
            onMouseEnter={(e) => {
              setHoveredPoint(chartData[i]);
              const rect = e.currentTarget.getBoundingClientRect();
              const chartRect = e.currentTarget.closest('svg').getBoundingClientRect();
              setMousePosition({
                x: rect.left - chartRect.left + rect.width / 2,
                y: rect.top - chartRect.top - 10
              });
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}
      </g>
    );
  };
  
  return (
    <div className={styles.revenueChart}>
      {/* Header */}
      {showControls && (
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h3>Umsatzentwicklung</h3>
            {stats && (
              <div className={styles.stats}>
                <span className={styles.totalRevenue}>
                  {formatCurrency(stats.total)}
                </span>
                <span className={stats.growth > 0 ? styles.growthPositive : styles.growthNegative}>
                  {stats.growth > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {Math.abs(stats.growth).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          
          <div className={styles.controls}>
            <div className={styles.periodSelector}>
              {Object.entries(PERIODS).map(([key, config]) => (
                <button
                  key={key}
                  className={selectedPeriod === key ? styles.active : ''}
                  onClick={() => setSelectedPeriod(key)}
                >
                  {config.label}
                </button>
              ))}
            </div>
            
            <button className={styles.exportButton} onClick={handleExport}>
              <Download size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Metric Toggles */}
      <div className={styles.metricToggles}>
        <MetricToggle
          metric="revenue"
          label="Umsatz"
          color={CHART_COLORS.revenue}
          visible={visibleMetrics.revenue}
          onToggle={handleMetricToggle}
        />
        <MetricToggle
          metric="orders"
          label="Bestellungen"
          color={CHART_COLORS.orders}
          visible={visibleMetrics.orders}
          onToggle={handleMetricToggle}
        />
        <MetricToggle
          metric="avgOrderValue"
          label="Ø Bestellwert"
          color={CHART_COLORS.avgOrderValue}
          visible={visibleMetrics.avgOrderValue}
          onToggle={handleMetricToggle}
        />
        <MetricToggle
          metric="customers"
          label="Kunden"
          color={CHART_COLORS.customers}
          visible={visibleMetrics.customers}
          onToggle={handleMetricToggle}
        />
      </div>
      
      {/* Chart */}
      <div className={styles.chartContainer}>
        <svg 
          width="100%" 
          height={height} 
          viewBox={`0 0 ${chartDimensions.width} ${height}`}
          className={styles.chart}
        >
          {/* Grid lines */}
          <g className={styles.grid}>
            {[0, 0.25, 0.5, 0.75, 1].map(tick => {
              const y = chartDimensions.padding.top + 
                (height - chartDimensions.padding.top - chartDimensions.padding.bottom) * tick;
              return (
                <line
                  key={tick}
                  x1={chartDimensions.padding.left}
                  y1={y}
                  x2={chartDimensions.width - chartDimensions.padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray={tick === 0 || tick === 1 ? "0" : "2,2"}
                />
              );
            })}
          </g>
          
          {/* Y-axis labels */}
          <g className={styles.yAxis}>
            {[0, 0.25, 0.5, 0.75, 1].map(tick => {
              const y = chartDimensions.padding.top + 
                (height - chartDimensions.padding.top - chartDimensions.padding.bottom) * (1 - tick);
              const maxRevenue = Math.max(...chartData.map(d => d.revenue));
              const value = maxRevenue * tick;
              
              return (
                <text
                  key={tick}
                  x={chartDimensions.padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className={styles.axisLabel}
                >
                  {formatCurrency(value)}
                </text>
              );
            })}
          </g>
          
          {/* X-axis labels */}
          <g className={styles.xAxis}>
            {chartData.filter((_, i) => i % Math.ceil(chartData.length / 8) === 0).map((d, i, arr) => {
              const originalIndex = chartData.indexOf(d);
              const x = chartDimensions.scaleX(originalIndex);
              
              return (
                <text
                  key={originalIndex}
                  x={x}
                  y={height - chartDimensions.padding.bottom + 20}
                  textAnchor="middle"
                  className={styles.axisLabel}
                >
                  {formatDate(d.date, PERIODS[selectedPeriod].format)}
                </text>
              );
            })}
          </g>
          
          {/* Chart lines */}
          {renderChartLine('revenue', CHART_COLORS.revenue)}
          {renderChartLine('orders', CHART_COLORS.orders)}
          {renderChartLine('avgOrderValue', CHART_COLORS.avgOrderValue)}
          {renderChartLine('customers', CHART_COLORS.customers)}
        </svg>
        
        {/* Tooltip */}
        {hoveredPoint && (
          <ChartTooltip
            data={hoveredPoint}
            x={mousePosition.x}
            y={mousePosition.y}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default RevenueChart;