/**
 * EATECH - Anomaly Detector Component
 * Version: 5.0.0
 * Description: Real-time anomaly detection and alerts for tenant issues
 * File Path: /src/modules/master/components/AnomalyDetector.jsx
 */

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  X,
  ChevronRight,
  Filter,
  Bell,
  BellOff
} from 'lucide-react';
import styles from './AnomalyDetector.module.css';

// ============================================================================
// COMPONENT
// ============================================================================
const AnomalyDetector = ({ anomalies, onAnomalyClick, onDismiss }) => {
  const [filter, setFilter] = useState('all');
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Filter anomalies
  const filteredAnomalies = useMemo(() => {
    let filtered = anomalies.filter(a => !dismissedIds.has(a.id || `${a.date}-${a.type}`));
    
    if (filter !== 'all') {
      filtered = filtered.filter(a => {
        if (filter === 'critical') return a.severity === 'severe';
        if (filter === 'warning') return a.severity === 'warning';
        if (filter === 'revenue') return a.type === 'drop' || a.type === 'payment';
        return true;
      });
    }
    
    return filtered;
  }, [anomalies, filter, dismissedIds]);
  
  // Group anomalies by tenant
  const groupedAnomalies = useMemo(() => {
    const groups = {};
    
    filteredAnomalies.forEach(anomaly => {
      const key = anomaly.tenantName || 'System';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(anomaly);
    });
    
    return groups;
  }, [filteredAnomalies]);
  
  // Show browser notification for critical anomalies
  useEffect(() => {
    if (!notificationsEnabled) return;
    
    const criticalAnomalies = anomalies.filter(
      a => a.severity === 'severe' && !dismissedIds.has(a.id || `${a.date}-${a.type}`)
    );
    
    if (criticalAnomalies.length > 0 && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          criticalAnomalies.forEach(anomaly => {
            new Notification('EATECH - Kritische Anomalie erkannt!', {
              body: `${anomaly.tenantName}: ${anomaly.message || 'Schwerwiegende Abweichung erkannt'}`,
              icon: '/icons/icon-192x192.png'
            });
          });
        }
      });
    }
  }, [anomalies, dismissedIds, notificationsEnabled]);
  
  // Handle dismiss
  const handleDismiss = (anomaly) => {
    const id = anomaly.id || `${anomaly.date}-${anomaly.type}`;
    setDismissedIds(prev => new Set([...prev, id]));
    if (onDismiss) {
      onDismiss(anomaly);
    }
  };
  
  // Get icon for anomaly type
  const getAnomalyIcon = (anomaly) => {
    if (anomaly.type === 'drop') return <TrendingDown />;
    if (anomaly.type === 'spike') return <TrendingUp />;
    if (anomaly.type === 'payment') return <AlertTriangle />;
    return <AlertTriangle />;
  };
  
  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
    if (hours < 24) return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  };
  
  // Render empty state
  if (filteredAnomalies.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3>Anomalie-Erkennung</h3>
          <button
            className={styles.notificationToggle}
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            title={notificationsEnabled ? 'Benachrichtigungen deaktivieren' : 'Benachrichtigungen aktivieren'}
          >
            {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        </div>
        <div className={styles.emptyState}>
          <AlertTriangle size={48} />
          <p>Keine Anomalien erkannt</p>
          <span>Alle Systeme laufen normal</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3>Anomalie-Erkennung</h3>
          <p className={styles.subtitle}>
            {filteredAnomalies.length} aktive{filteredAnomalies.length === 1 ? ' Warnung' : ' Warnungen'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.notificationToggle}
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            title={notificationsEnabled ? 'Benachrichtigungen deaktivieren' : 'Benachrichtigungen aktivieren'}
          >
            {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        </div>
      </div>
      
      <div className={styles.filters}>
        <button
          className={[styles.filterButton, filter === 'all' ? styles.active : ''].join(' ')}
          onClick={() => setFilter('all')}
        >
          <Filter size={16} />
          Alle
        </button>
        <button
          className={[styles.filterButton, filter === 'critical' ? styles.active : ''].join(' ')}
          onClick={() => setFilter('critical')}
        >
          <AlertTriangle size={16} />
          Kritisch
        </button>
        <button
          className={[styles.filterButton, filter === 'warning' ? styles.active : ''].join(' ')}
          onClick={() => setFilter('warning')}
        >
          <AlertTriangle size={16} />
          Warnung
        </button>
        <button
          className={[styles.filterButton, filter === 'revenue' ? styles.active : ''].join(' ')}
          onClick={() => setFilter('revenue')}
        >
          <TrendingDown size={16} />
          Umsatz
        </button>
      </div>
      
      <div className={styles.anomaliesList}>
        {Object.entries(groupedAnomalies).map(([tenant, tenantAnomalies]) => (
          <div key={tenant} className={styles.tenantGroup}>
            <h4 className={styles.tenantName}>{tenant}</h4>
            {tenantAnomalies.map((anomaly, index) => {
              const uniqueId = anomaly.id || `${anomaly.date}-${anomaly.type}-${index}`;
              
              return (
                <div
                  key={uniqueId}
                  className={[styles.anomaly, styles[anomaly.severity || 'warning']].join(' ')}
                  onClick={() => onAnomalyClick && onAnomalyClick(anomaly)}
                >
                  <div className={styles.anomalyIcon}>
                    {getAnomalyIcon(anomaly)}
                  </div>
                  
                  <div className={styles.anomalyContent}>
                    <div className={styles.anomalyHeader}>
                      <span className={styles.anomalyType}>
                        {anomaly.type === 'drop' ? 'Umsatzeinbruch' :
                         anomaly.type === 'spike' ? 'Ungewöhnlicher Anstieg' :
                         anomaly.type === 'payment' ? 'Zahlungsproblem' :
                         anomaly.type === 'health' ? 'Health Score Warnung' :
                         'Anomalie'}
                      </span>
                      <span className={styles.anomalyTime}>
                        <Clock size={14} />
                        {formatTimeAgo(anomaly.timestamp || anomaly.date)}
                      </span>
                    </div>
                    
                    <p className={styles.anomalyMessage}>
                      {anomaly.message || `${anomaly.deviation?.toFixed(0)}% Abweichung vom Normalwert`}
                    </p>
                    
                    {anomaly.possibleCauses && anomaly.possibleCauses.length > 0 && (
                      <div className={styles.causes}>
                        <span>Mögliche Ursachen:</span>
                        <ul>
                          {anomaly.possibleCauses.slice(0, 2).map((cause, i) => (
                            <li key={i}>{cause}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className={styles.anomalyStats}>
                      {anomaly.expected && (
                        <span>Erwartet: {anomaly.expected.toFixed(0)}</span>
                      )}
                      {anomaly.actual && (
                        <span>Tatsächlich: {anomaly.actual.toFixed(0)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.anomalyActions}>
                    <button
                      className={styles.dismissButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(anomaly);
                      }}
                      title="Warnung ausblenden"
                    >
                      <X size={16} />
                    </button>
                    {onAnomalyClick && (
                      <ChevronRight size={20} className={styles.chevron} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// PROP TYPES
// ============================================================================
AnomalyDetector.propTypes = {
  anomalies: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
    severity: PropTypes.string,
    message: PropTypes.string,
    tenantId: PropTypes.string,
    tenantName: PropTypes.string,
    timestamp: PropTypes.string,
    date: PropTypes.string,
    deviation: PropTypes.number,
    expected: PropTypes.number,
    actual: PropTypes.number,
    possibleCauses: PropTypes.array
  })),
  onAnomalyClick: PropTypes.func,
  onDismiss: PropTypes.func
};

AnomalyDetector.defaultProps = {
  anomalies: []
};

// ============================================================================
// EXPORT
// ============================================================================
export default React.memo(AnomalyDetector);
