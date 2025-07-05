/**
 * EATECH - Tenant Health Score Component
 * Version: 5.0.0
 * Description: Visual health score display with breakdown and recommendations
 * File Path: /src/modules/master/components/TenantHealthScore.jsx
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  Activity, 
  CreditCard, 
  Star, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Info
} from 'lucide-react';
import { SCORE_CATEGORIES } from '../utils/healthScoreCalculator';
import styles from './TenantHealthScore.module.css';

// ============================================================================
// COMPONENT
// ============================================================================
const TenantHealthScore = ({ healthScore, tenantName, onActionClick }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  
  if (!healthScore) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Activity className={styles.loadingIcon} />
          <span>Berechne Health Score...</span>
        </div>
      </div>
    );
  }
  
  const { totalScore, scores, category, issues, recommendations, trend } = healthScore;
  
  // Get metric icons
  const metricIcons = {
    paymentSuccess: CreditCard,
    orderFrequency: Activity,
    customerSatisfaction: Star,
    technicalIssues: AlertCircle
  };
  
  // Get metric labels
  const metricLabels = {
    paymentSuccess: 'Zahlungserfolg',
    orderFrequency: 'Bestellfrequenz',
    customerSatisfaction: 'Kundenzufriedenheit',
    technicalIssues: 'Technische Stabilität'
  };
  
  // Calculate ring progress
  const ringProgress = useMemo(() => {
    const circumference = 2 * Math.PI * 70; // radius = 70
    const progress = (totalScore / 100) * circumference;
    return { circumference, progress };
  }, [totalScore]);
  
  // Render score ring
  const renderScoreRing = () => (
    <div className={styles.scoreRing}>
      <svg width='160' height='160' viewBox='0 0 160 160'>
        {/* Background ring */}
        <circle
          cx='80'
          cy='80'
          r='70'
          fill='none'
          stroke='#f0f0f0'
          strokeWidth='12'
        />
        {/* Progress ring */}
        <circle
          cx='80'
          cy='80'
          r='70'
          fill='none'
          stroke={category.color}
          strokeWidth='12'
          strokeLinecap='round'
          strokeDasharray={ringProgress.circumference}
          strokeDashoffset={ringProgress.circumference - ringProgress.progress}
          transform='rotate(-90 80 80)'
          className={styles.progressRing}
        />
      </svg>
      <div className={styles.scoreValue}>
        <span className={styles.score}>{totalScore}</span>
        <span className={styles.scoreLabel}>von 100</span>
      </div>
    </div>
  );
  
  // Render trend indicator
  const renderTrend = () => {
    if (!trend) return null;
    
    const Icon = trend.direction === 'up' ? TrendingUp : TrendingDown;
    const trendClass = trend.direction === 'up' ? styles.trendUp : 
                      trend.direction === 'down' ? styles.trendDown : 
                      styles.trendStable;
    
    return (
      <div className={[styles.trend, trendClass].join(' ')}>
        <Icon size={16} />
        <span>{Math.abs(trend.change).toFixed(1)}%</span>
      </div>
    );
  };
  
  // Render metric breakdown
  const renderMetricBreakdown = () => (
    <div className={styles.metrics}>
      {Object.entries(scores).map(([key, score]) => {
        const Icon = metricIcons[key];
        const label = metricLabels[key];
        const isSelected = selectedMetric === key;
        
        return (
          <div
            key={key}
            className={[styles.metric, isSelected ? styles.metricSelected : ''].join(' ')}
            onClick={() => setSelectedMetric(isSelected ? null : key)}
          >
            <div className={styles.metricHeader}>
              <Icon size={20} />
              <span className={styles.metricLabel}>{label}</span>
            </div>
            <div className={styles.metricScore}>
              <div className={styles.metricBar}>
                <div
                  className={styles.metricProgress}
                  style={{ 
                    width: score + '%',
                    backgroundColor: getMetricColor(score)
                  }}
                />
              </div>
              <span className={styles.metricValue}>{score}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
  
  // Render issues
  const renderIssues = () => {
    if (!issues || issues.length === 0) return null;
    
    return (
      <div className={styles.issues}>
        <h4>Aktuelle Probleme</h4>
        {issues.map((issue, index) => {
          const severityClass = 'issue' + issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1);
          return (
            <div 
              key={index} 
              className={[styles.issue, styles[severityClass]].join(' ')}
            >
              <AlertCircle size={16} />
              <div className={styles.issueContent}>
                <span className={styles.issueMessage}>{issue.message}</span>
                <span className={styles.issueImpact}>Impact: {issue.impact}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Render recommendations
  const renderRecommendations = () => {
    if (!recommendations || recommendations.length === 0) return null;
    
    return (
      <div className={styles.recommendations}>
        <h4>Empfehlungen</h4>
        {recommendations.map((rec, index) => {
          const priorityClass = 'priority' + rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1);
          return (
            <div 
              key={index} 
              className={styles.recommendation}
              onClick={() => onActionClick && onActionClick('recommendation', rec)}
            >
              <div className={styles.recHeader}>
                <span className={[styles.recPriority, styles[priorityClass]].join(' ')}>
                  {rec.priority === 'high' ? 'Hoch' : rec.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                </span>
                <span className={styles.recImpact}>{rec.estimatedImpact}</span>
              </div>
              <h5>{rec.action}</h5>
              <p>{rec.description}</p>
              {onActionClick && (
                <button className={styles.recButton}>
                  Massnahme ergreifen
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  // Get metric color based on score
  const getMetricColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3>{tenantName}</h3>
          <div className={styles.categoryBadge} style={{ backgroundColor: category.color }}>
            <span>{category.emoji}</span>
            <span>{category.label}</span>
          </div>
        </div>
        {renderTrend()}
      </div>
      
      <div className={styles.content}>
        <div className={styles.scoreSection}>
          {renderScoreRing()}
          
          <button 
            className={styles.detailsToggle}
            onClick={() => setShowDetails(!showDetails)}
          >
            <Info size={16} />
            {showDetails ? 'Weniger Details' : 'Mehr Details'}
          </button>
        </div>
        
        {renderMetricBreakdown()}
        
        {showDetails && (
          <div className={styles.details}>
            {renderIssues()}
            {renderRecommendations()}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PROP TYPES
// ============================================================================
TenantHealthScore.propTypes = {
  healthScore: PropTypes.shape({
    totalScore: PropTypes.number.isRequired,
    scores: PropTypes.object.isRequired,
    category: PropTypes.object.isRequired,
    issues: PropTypes.array,
    recommendations: PropTypes.array,
    trend: PropTypes.object
  }),
  tenantName: PropTypes.string.isRequired,
  onActionClick: PropTypes.func
};

// ============================================================================
// EXPORT
// ============================================================================
export default React.memo(TenantHealthScore);
