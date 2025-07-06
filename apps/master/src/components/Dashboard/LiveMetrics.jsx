/**
 * EATECH - Live Metrics Component
 * Version: 1.0.0
 * Description: Echtzeit-Metriken-Anzeige mit animierten Updates
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/components/Dashboard/LiveMetrics.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  Zap,
  Clock
} from 'lucide-react';
import styles from './LiveMetrics.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const METRIC_CONFIGS = {
  requests: {
    label: 'Requests/sec',
    unit: '',
    decimals: 0,
    threshold: { warning: 1000, critical: 1500 },
    sparklineColor: '#3b82f6'
  },
  latency: {
    label: 'Avg Latency',
    unit: 'ms',
    decimals: 0,
    threshold: { warning: 200, critical: 500 },
    sparklineColor: '#f59e0b',
    inverse: true // Lower is better
  },
  errorRate: {
    label: 'Error Rate',
    unit: '%',
    decimals: 2,
    threshold: { warning: 1, critical: 5 },
    sparklineColor: '#ef4444',
    inverse: true
  },
  throughput: {
    label: 'Throughput',
    unit: 'MB/s',
    decimals: 1,
    threshold: { warning: 80, critical: 95 },
    sparklineColor: '#10b981'
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const generateSparklineData = (length = 20) => {
  return Array.from({ length }, () => Math.random() * 100);
};

const interpolateValue = (from, to, progress) => {
  return from + (to - from) * progress;
};

const getMetricStatus = (value, config) => {
  if (!config.threshold) return 'normal';
  
  const { warning, critical } = config.threshold;
  if (config.inverse) {
    if (value >= critical) return 'critical';
    if (value >= warning) return 'warning';
  } else {
    if (value <= critical) return 'critical';
    if (value <= warning) return 'warning';
  }
  return 'normal';
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const SparklineChart = ({ data, color, width = 100, height = 40 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  
  return (
    <svg width={width} height={height} className={styles.sparkline}>
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#gradient-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
};

const MetricDisplay = ({ metric, value, previousValue, config, sparklineData }) => {
  const [displayValue, setDisplayValue] = useState(previousValue || value);
  const animationRef = useRef();
  
  // Animate value changes
  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const duration = 500;
    const startTime = Date.now();
    
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      const currentValue = interpolateValue(startValue, endValue, easeOutQuad);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);
  
  const status = getMetricStatus(value, config);
  const trend = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const TrendIcon = trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : Minus;
  
  return (
    <div className={`${styles.metricDisplay} ${styles[status]}`}>
      <div className={styles.metricHeader}>
        <span className={styles.metricLabel}>{config.label}</span>
        <Activity size={14} className={styles.metricIcon} />
      </div>
      
      <div className={styles.metricValue}>
        <span className={styles.value}>
          {displayValue.toFixed(config.decimals)}
        </span>
        <span className={styles.unit}>{config.unit}</span>
      </div>
      
      <div className={styles.metricTrend}>
        <TrendIcon size={12} className={trend > 0 ? styles.trendUp : styles.trendDown} />
        <span>{Math.abs(trend).toFixed(1)}%</span>
      </div>
      
      <div className={styles.sparklineContainer}>
        <SparklineChart
          data={sparklineData}
          color={config.sparklineColor}
        />
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const LiveMetrics = ({ 
  data = {},
  updateInterval = 2000,
  showSparklines = true,
  compactMode = false 
}) => {
  const [metrics, setMetrics] = useState({
    requests: 0,
    latency: 0,
    errorRate: 0,
    throughput: 0
  });
  const [previousMetrics, setPreviousMetrics] = useState({});
  const [sparklines, setSparklines] = useState({
    requests: generateSparklineData(),
    latency: generateSparklineData(),
    errorRate: generateSparklineData(),
    throughput: generateSparklineData()
  });
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Update metrics with new data
  useEffect(() => {
    if (Object.keys(data).length > 0) {
      setPreviousMetrics(metrics);
      setMetrics(data);
      setLastUpdate(Date.now());
      
      // Update sparkline data
      setSparklines(prev => {
        const updated = {};
        Object.keys(prev).forEach(key => {
          const newData = [...prev[key].slice(1), data[key] || 0];
          updated[key] = newData;
        });
        return updated;
      });
    }
  }, [data]);
  
  // Simulate live updates if no data provided
  useEffect(() => {
    if (Object.keys(data).length === 0) {
      const interval = setInterval(() => {
        const newMetrics = {
          requests: 800 + Math.random() * 400,
          latency: 50 + Math.random() * 100,
          errorRate: Math.random() * 2,
          throughput: 60 + Math.random() * 40
        };
        
        setPreviousMetrics(metrics);
        setMetrics(newMetrics);
        setLastUpdate(Date.now());
        
        // Update sparkline data
        setSparklines(prev => {
          const updated = {};
          Object.keys(prev).forEach(key => {
            const newData = [...prev[key].slice(1), newMetrics[key]];
            updated[key] = newData;
          });
          return updated;
        });
      }, updateInterval);
      
      return () => clearInterval(interval);
    }
  }, [updateInterval, data]);
  
  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };
  
  return (
    <div className={`${styles.liveMetrics} ${compactMode ? styles.compact : ''}`}>
      <div className={styles.header}>
        <h3>
          <Zap size={18} />
          Live System Metrics
        </h3>
        <div className={styles.updateInfo}>
          <Clock size={12} />
          <span>{getTimeSinceUpdate()}</span>
        </div>
      </div>
      
      <div className={styles.metricsGrid}>
        {Object.entries(METRIC_CONFIGS).map(([key, config]) => (
          <MetricDisplay
            key={key}
            metric={key}
            value={metrics[key] || 0}
            previousValue={previousMetrics[key]}
            config={config}
            sparklineData={showSparklines ? sparklines[key] : []}
          />
        ))}
      </div>
      
      <div className={styles.footer}>
        <div className={styles.statusIndicator}>
          <span className={styles.statusDot} />
          <span>Live Updates Active</span>
        </div>
        <div className={styles.refreshRate}>
          <span>Refresh: {updateInterval / 1000}s</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default LiveMetrics;