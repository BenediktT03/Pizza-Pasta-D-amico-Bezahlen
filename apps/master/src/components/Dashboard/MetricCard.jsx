import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from './MetricCard.module.css';

const MetricCard = ({
  title,
  value,
  change,
  changeType = 'neutral', // positive, negative, neutral
  icon: Icon,
  subtitle,
  trend = [],
  loading = false,
  onClick,
  variant = 'default' // default, primary, success, warning, danger
}) => {
  const getTrendIcon = () => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp size={16} />;
      case 'negative':
        return <TrendingDown size={16} />;
      default:
        return <Minus size={16} />;
    }
  };

  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const cardClasses = [
    styles.card,
    styles[variant],
    onClick ? styles.clickable : '',
    loading ? styles.loading : ''
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className={cardClasses}>
        <div className={styles.loadingContent}>
          <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonValue}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonChange}`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {Icon && (
          <div className={styles.iconWrapper}>
            <Icon size={24} />
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.valueSection}>
          <span className={styles.value}>{formatValue(value)}</span>
          {change !== undefined && (
            <div className={`${styles.change} ${styles[changeType]}`}>
              {getTrendIcon()}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>

        {trend.length > 0 && (
          <div className={styles.trendChart}>
            <svg viewBox="0 0 100 40" className={styles.trendSvg}>
              <polyline
                points={trend.map((val, idx) => 
                  `${(idx / (trend.length - 1)) * 100},${40 - (val / Math.max(...trend)) * 35}`
                ).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={styles.trendLine}
              />
              <polyline
                points={`0,40 ${trend.map((val, idx) => 
                  `${(idx / (trend.length - 1)) * 100},${40 - (val / Math.max(...trend)) * 35}`
                ).join(' ')} 100,40`}
                fill="currentColor"
                fillOpacity="0.1"
                className={styles.trendFill}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;