/**
 * EATECH System Health Widget
 * Version: 1.0.0
 * 
 * Zeigt System-Gesundheit und Service-Status
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/components/Dashboard/SystemHealthWidget.jsx
 */

import React from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  HardDrive, 
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import styles from './SystemHealthWidget.module.css';

const SystemHealthWidget = ({ health, onRefresh }) => {
  // Get status color and icon
  const getStatusInfo = (status) => {
    switch (status) {
      case 'healthy':
        return { color: 'success', icon: CheckCircle, text: 'Gesund' };
      case 'warning':
        return { color: 'warning', icon: AlertTriangle, text: 'Warnung' };
      case 'error':
        return { color: 'error', icon: XCircle, text: 'Fehler' };
      default:
        return { color: 'secondary', icon: Activity, text: 'Unbekannt' };
    }
  };

  // Calculate overall health color
  const getHealthColor = (percentage) => {
    if (percentage >= 95) return 'success';
    if (percentage >= 80) return 'warning';
    return 'error';
  };

  // Service icons
  const serviceIcons = {
    api: Server,
    database: Database,
    storage: HardDrive,
    cdn: Wifi
  };

  const overallHealthColor = getHealthColor(health.overall);

  return (
    <div className={styles.widget}>
      {/* Header */}
      <div className={styles.header}>
        <h2>
          <Activity /> System Health
        </h2>
        <button 
          className={styles.refreshButton}
          onClick={onRefresh}
          title="Health-Status aktualisieren"
        >
          <RefreshCw />
        </button>
      </div>

      {/* Overall Health */}
      <div className={styles.overallHealth}>
        <div className={styles.healthScore}>
          <div className={`${styles.scoreCircle} ${styles[overallHealthColor]}`}>
            <svg viewBox="0 0 100 100" className={styles.progressRing}>
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                opacity="0.2"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={`${health.overall * 2.83} 283`}
                strokeDashoffset="0"
                transform="rotate(-90 50 50)"
                className={styles.progressBar}
              />
            </svg>
            <div className={styles.scoreValue}>
              <span className={styles.scoreNumber}>{health.overall}</span>
              <span className={styles.scorePercent}>%</span>
            </div>
          </div>
          <div className={styles.healthLabel}>
            <h3>Gesamt-Status</h3>
            <p className={`${styles.status} ${styles[overallHealthColor]}`}>
              {health.overall >= 95 ? 'Exzellent' : health.overall >= 80 ? 'Gut' : 'Kritisch'}
            </p>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className={styles.services}>
        <h3>Services</h3>
        <div className={styles.serviceList}>
          {Object.entries(health.services).map(([service, data]) => {
            const ServiceIcon = serviceIcons[service] || Server;
            const statusInfo = getStatusInfo(data.status);
            
            return (
              <div key={service} className={`${styles.serviceItem} ${styles[statusInfo.color]}`}>
                <div className={styles.serviceIcon}>
                  <ServiceIcon />
                </div>
                <div className={styles.serviceInfo}>
                  <h4>{service.toUpperCase()}</h4>
                  <div className={styles.serviceMetrics}>
                    {data.latency && (
                      <span className={styles.metric}>
                        <Activity size={12} />
                        {data.latency}ms
                      </span>
                    )}
                    {data.usage && (
                      <span className={styles.metric}>
                        <HardDrive size={12} />
                        {data.usage}%
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.serviceStatus}>
                  <statusInfo.icon className={styles.statusIcon} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {health.services.cdn.status === 'warning' && (
        <div className={styles.alert}>
          <AlertTriangle />
          <div>
            <h4>CDN Latenz erhöht</h4>
            <p>Response Zeit über 250ms. Monitoring aktiv.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealthWidget;