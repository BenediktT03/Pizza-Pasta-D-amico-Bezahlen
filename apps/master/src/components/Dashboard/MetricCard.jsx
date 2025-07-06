/**
 * EATECH Master Metric Card Component
 * Version: 1.0.0
 * 
 * Wiederverwendbare Metrik-Karte für Dashboard
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/components/Dashboard/MetricCard.jsx
 */

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import styles from './MetricCard.module.css';

const MetricCard = ({ 
  icon: Icon, 
  label, 
  value, 
  prefix = '', 
  suffix = '', 
  change, 
  trend, 
  color = 'primary' 
}) => {
  // Format value
  const formatValue = (val) => {
    if (typeof val === 'number') {
      // For currency values
      if (prefix === 'CHF') {
        return val.toLocaleString('de-CH', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        });
      }
      // For percentages
      if (suffix === '%') {
        return val.toFixed(1);
      }
      // For other numbers
      return val.toLocaleString('de-CH');
    }
    return val;
  };

  return (
    <div className={`${styles.card} ${styles[color]}`}>
      <div className={styles.header}>
        <div className={`${styles.iconContainer} ${styles[`${color}Icon`]}`}>
          <Icon />
        </div>
        <div className={styles.trend}>
          {trend === 'up' ? (
            <TrendingUp className={styles.trendUp} />
          ) : trend === 'down' ? (
            <TrendingDown className={styles.trendDown} />
          ) : null}
          {change && (
            <span className={`${styles.change} ${styles[trend]}`}>
              {trend === 'up' ? '+' : ''}{change}%
            </span>
          )}
        </div>
      </div>
      
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <h3 className={styles.value}>
          {prefix && <span className={styles.prefix}>{prefix}</span>}
          {formatValue(value)}
          {suffix && <span className={styles.suffix}>{suffix}</span>}
        </h3>
      </div>
    </div>
  );
};

export default MetricCard;