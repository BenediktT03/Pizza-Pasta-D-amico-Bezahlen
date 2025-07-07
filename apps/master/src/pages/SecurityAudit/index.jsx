import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Lock,
  Unlock,
  Key,
  FileText,
  Download,
  Filter,
  Calendar,
  Clock,
  User,
  Globe,
  Smartphone,
  Monitor,
  Wifi,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Search,
  RefreshCw,
  ChevronRight,
  Info
} from 'lucide-react';
import styles from './SecurityAudit.module.css';

const SecurityAudit = () => {
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');

  // Mock security data
  const securityMetrics = {
    threatLevel: 'low',
    blockedAttempts: 1234,
    suspiciousActivities: 23,
    failedLogins: 156,
    successfulLogins: 8932,
    activeThreats: 2,
    resolvedThreats: 45,
    systemScore: 92
  };

  const recentEvents = [
    {
      id: 1,
      type: 'failed_login',
      severity: 'warning',
      user: 'unknown@hacker.com',
      ip: '185.220.101.45',
      location: 'Russia',
      timestamp: '2025-01-07 15:23:45',
      details: 'Multiple failed login attempts detected',
      device: 'Unknown',
      blocked: true
    },
    {
      id: 2,
      type: 'suspicious_activity',
      severity: 'high',
      user: 'admin@tenant-123.ch',
      ip: '45.129.56.200',
      location: 'China',
      timestamp: '2025-01-07 14:15:32',
      details: 'Unusual access pattern detected - possible account compromise',
      device: 'Windows PC',
      blocked: false
    },
    {
      id: 3,
      type: 'brute_force',
      severity: 'critical',
      user: 'various',
      ip: '192.42.116.191',
      location: 'Netherlands',
      timestamp: '2025-01-07 13:45:12',
      details: 'Brute force attack detected and blocked',
      device: 'Bot/Scanner',
      blocked: true
    },
    {
      id: 4,
      type: 'successful_login',
      severity: 'info',
      user: 'thomas.mueller@eatech.ch',
      ip: '85.195.123.45',
      location: 'Switzerland',
      timestamp: '2025-01-07 13:30:00',
      details: 'Successful master admin login',
      device: 'MacBook Pro',
      blocked: false
    },
    {
      id: 5,
      type: 'permission_change',
      severity: 'medium',
      user: 'sarah.weber@eatech.ch',
      ip: '85.195.67.89',
      location: 'Switzerland',
      timestamp: '2025-01-07 12:20:15',
      details: 'User permissions elevated to admin level',
      device: 'Windows PC',
      blocked: false
    }
  ];

  const vulnerabilityScans = [
    {
      id: 1,
      name: 'SSL/TLS Configuration',
      status: 'passed',
      score: 100,
      lastScan: '2025-01-07 06:00',
      issues: 0
    },
    {
      id: 2,
      name: 'Authentication Security',
      status: 'warning',
      score: 85,
      lastScan: '2025-01-07 06:00',
      issues: 2,
      details: ['2FA not enforced for all users', 'Password policy could be stronger']
    },
    {
      id: 3,
      name: 'API Security',
      status: 'passed',
      score: 95,
      lastScan: '2025-01-07 06:00',
      issues: 1,
      details: ['Rate limiting could be more restrictive']
    },
    {
      id: 4,
      name: 'Database Security',
      status: 'passed',
      score: 98,
      lastScan: '2025-01-07 06:00',
      issues: 0
    },
    {
      id: 5,
      name: 'Infrastructure Security',
      status: 'critical',
      score: 75,
      lastScan: '2025-01-07 06:00',
      issues: 3,
      details: ['Outdated dependencies detected', 'Firewall rules need review', 'Backup encryption not enabled']
    }
  ];

  // Calculate threat statistics
  const threatStats = {
    total: recentEvents.length,
    critical: recentEvents.filter(e => e.severity === 'critical').length,
    high: recentEvents.filter(e => e.severity === 'high').length,
    medium: recentEvents.filter(e => e.severity === 'medium').length,
    warning: recentEvents.filter(e => e.severity === 'warning').length,
    info: recentEvents.filter(e => e.severity === 'info').length
  };

  // Filter events
  const filteredEvents = recentEvents.filter(event => {
    const matchesSearch = event.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.ip.includes(searchTerm) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || event.severity === filterSeverity;
    
    return matchesSearch && matchesSeverity;
  });

  // Severity configuration
  const severityConfig = {
    critical: { color: '#ef4444', bg: '#fee2e2', icon: AlertOctagon },
    high: { color: '#f97316', bg: '#ffedd5', icon: AlertTriangle },
    medium: { color: '#f59e0b', bg: '#fef3c7', icon: AlertTriangle },
    warning: { color: '#3b82f6', bg: '#dbeafe', icon: Info },
    info: { color: '#6b7280', bg: '#f3f4f6', icon: Info }
  };

  // Event type configuration
  const eventTypeConfig = {
    failed_login: { label: 'Failed Login', icon: XCircle },
    successful_login: { label: 'Successful Login', icon: CheckCircle },
    suspicious_activity: { label: 'Suspicious Activity', icon: AlertTriangle },
    brute_force: { label: 'Brute Force Attack', icon: Shield },
    permission_change: { label: 'Permission Change', icon: Key }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  // Export audit report
  const exportReport = () => {
    // Implementation for exporting audit report
    console.log('Exporting security audit report...');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>Security Audit</h1>
          <p className={styles.subtitle}>Überwachen Sie Sicherheitsereignisse und Systemintegrität</p>
        </div>
        <div className={styles.headerActions}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={styles.timeRangeSelect}
          >
            <option value="24h">Letzte 24 Stunden</option>
            <option value="7d">Letzte 7 Tage</option>
            <option value="30d">Letzte 30 Tage</option>
            <option value="90d">Letzte 90 Tage</option>
          </select>
          <button className={styles.exportButton} onClick={exportReport}>
            <Download size={20} />
            <span>Report exportieren</span>
          </button>
        </div>
      </div>

      {/* Security Overview */}
      <div className={styles.overviewSection}>
        <div className={styles.threatIndicator}>
          <div className={`${styles.threatLevel} ${styles[securityMetrics.threatLevel]}`}>
            <Shield size={48} />
            <div>
              <h3>Bedrohungsstufe</h3>
              <p>{securityMetrics.threatLevel.toUpperCase()}</p>
            </div>
          </div>
          <div className={styles.systemScore}>
            <div className={styles.scoreCircle}>
              <svg viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="5"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="5"
                  strokeDasharray={`${securityMetrics.systemScore * 2.83} 283`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className={styles.scoreValue}>{securityMetrics.systemScore}</div>
            </div>
            <h4>Security Score</h4>
          </div>
        </div>

        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <Lock size={24} />
            <div>
              <h4>{securityMetrics.blockedAttempts.toLocaleString()}</h4>
              <p>Blockierte Angriffe</p>
            </div>
          </div>
          <div className={styles.metricCard}>
            <AlertTriangle size={24} />
            <div>
              <h4>{securityMetrics.suspiciousActivities}</h4>
              <p>Verdächtige Aktivitäten</p>
            </div>
          </div>
          <div className={styles.metricCard}>
            <XCircle size={24} />
            <div>
              <h4>{securityMetrics.failedLogins}</h4>
              <p>Fehlgeschlagene Logins</p>
            </div>
          </div>
          <div className={styles.metricCard}>
            <Activity size={24} />
            <div>
              <h4>{securityMetrics.activeThreats}</h4>
              <p>Aktive Bedrohungen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={20} />
          <span>Ereignisse</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'vulnerabilities' ? styles.active : ''}`}
          onClick={() => setActiveTab('vulnerabilities')}
        >
          <Shield size={20} />
          <span>Schwachstellen</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'analytics' ? styles.active : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={20} />
          <span>Analysen</span>
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === 'overview' && (
        <div className={styles.eventsSection}>
          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Suche nach Benutzer, IP oder Standort..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className={styles.filterGroup}>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">Alle Schweregrade</option>
                <option value="critical">Kritisch</option>
                <option value="high">Hoch</option>
                <option value="medium">Mittel</option>
                <option value="warning">Warnung</option>
                <option value="info">Info</option>
              </select>
              
              <button 
                className={styles.refreshButton} 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw size={20} className={isLoading ? styles.spinning : ''} />
              </button>
            </div>
          </div>

          {/* Threat Summary */}
          <div className={styles.threatSummary}>
            <div className={styles.threatItem}>
              <span className={styles.threatDot} style={{ background: severityConfig.critical.color }}></span>
              <span>Kritisch: {threatStats.critical}</span>
            </div>
            <div className={styles.threatItem}>
              <span className={styles.threatDot} style={{ background: severityConfig.high.color }}></span>
              <span>Hoch: {threatStats.high}</span>
            </div>
            <div className={styles.threatItem}>
              <span className={styles.threatDot} style={{ background: severityConfig.medium.color }}></span>
              <span>Mittel: {threatStats.medium}</span>
            </div>
            <div className={styles.threatItem}>
              <span className={styles.threatDot} style={{ background: severityConfig.warning.color }}></span>
              <span>Warnung: {threatStats.warning}</span>
            </div>
            <div className={styles.threatItem}>
              <span className={styles.threatDot} style={{ background: severityConfig.info.color }}></span>
              <span>Info: {threatStats.info}</span>
            </div>
          </div>

          {/* Events List */}
          <div className={styles.eventsList}>
            {filteredEvents.map(event => {
              const SeverityIcon = severityConfig[event.severity].icon;
              const TypeIcon = eventTypeConfig[event.type].icon;
              
              return (
                <div 
                  key={event.id} 
                  className={styles.eventCard}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div 
                    className={styles.severityIndicator}
                    style={{ background: severityConfig[event.severity].color }}
                  ></div>
                  
                  <div className={styles.eventIcon}>
                    <TypeIcon size={24} style={{ color: severityConfig[event.severity].color }} />
                  </div>
                  
                  <div className={styles.eventContent}>
                    <div className={styles.eventHeader}>
                      <h4>{eventTypeConfig[event.type].label}</h4>
                      <span className={styles.eventTime}>
                        <Clock size={14} />
                        {event.timestamp}
                      </span>
                    </div>
                    
                    <p className={styles.eventDetails}>{event.details}</p>
                    
                    <div className={styles.eventMeta}>
                      <span>
                        <User size={14} />
                        {event.user}
                      </span>
                      <span>
                        <Globe size={14} />
                        {event.ip}
                      </span>
                      <span>
                        <Monitor size={14} />
                        {event.location}
                      </span>
                      {event.blocked && (
                        <span className={styles.blockedBadge}>
                          <Lock size={14} />
                          Blockiert
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRight size={20} className={styles.chevron} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vulnerabilities Tab */}
      {activeTab === 'vulnerabilities' && (
        <div className={styles.vulnerabilitiesSection}>
          <div className={styles.scanSummary}>
            <h3>Letzte Sicherheitsprüfung</h3>
            <p>Durchgeführt am: {new Date().toLocaleDateString('de-CH')} um 06:00 Uhr</p>
            <button className={styles.scanButton}>
              <RefreshCw size={20} />
              <span>Neue Prüfung starten</span>
            </button>
          </div>

          <div className={styles.vulnerabilityList}>
            {vulnerabilityScans.map(scan => (
              <div key={scan.id} className={`${styles.vulnerabilityCard} ${styles[scan.status]}`}>
                <div className={styles.scanHeader}>
                  <h4>{scan.name}</h4>
                  <div className={styles.scanScore}>
                    <span className={styles.scoreLabel}>Score:</span>
                    <span className={styles.scoreValue}>{scan.score}/100</span>
                  </div>
                </div>
                
                <div className={styles.scanStatus}>
                  <div className={styles.statusIndicator}>
                    {scan.status === 'passed' && <CheckCircle size={20} />}
                    {scan.status === 'warning' && <AlertTriangle size={20} />}
                    {scan.status === 'critical' && <AlertOctagon size={20} />}
                    <span>{scan.status === 'passed' ? 'Bestanden' : 
                          scan.status === 'warning' ? 'Warnung' : 'Kritisch'}</span>
                  </div>
                  <span className={styles.issueCount}>
                    {scan.issues} {scan.issues === 1 ? 'Problem' : 'Probleme'}
                  </span>
                </div>
                
                {scan.details && (
                  <div className={styles.scanDetails}>
                    <h5>Gefundene Probleme:</h5>
                    <ul>
                      {scan.details.map((detail, index) => (
                        <li key={index}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className={styles.analyticsSection}>
          <div className={styles.chartContainer}>
            <h3>Sicherheitsereignisse im Zeitverlauf</h3>
            <div className={styles.chartPlaceholder}>
              {/* Chart implementation would go here */}
              <BarChart3 size={48} />
              <p>Chart-Visualisierung</p>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <TrendingUp size={24} />
              <h4>Angriffstrends</h4>
              <p className={styles.increase}>+23% diese Woche</p>
            </div>
            <div className={styles.statCard}>
              <Globe size={24} />
              <h4>Top Angreiferländer</h4>
              <ol className={styles.countryList}>
                <li>Russia (45%)</li>
                <li>China (28%)</li>
                <li>USA (12%)</li>
              </ol>
            </div>
            <div className={styles.statCard}>
              <Smartphone size={24} />
              <h4>Gerätetypen</h4>
              <div className={styles.deviceStats}>
                <span>Desktop: 65%</span>
                <span>Mobile: 25%</span>
                <span>Bot: 10%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Ereignisdetails</h2>
              <button onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.eventDetailHeader}>
                <div 
                  className={styles.severityBadge}
                  style={{ 
                    background: severityConfig[selectedEvent.severity].bg,
                    color: severityConfig[selectedEvent.severity].color
                  }}
                >
                  {selectedEvent.severity.toUpperCase()}
                </div>
                <h3>{eventTypeConfig[selectedEvent.type].label}</h3>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <label>Zeitstempel</label>
                  <p>{selectedEvent.timestamp}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Benutzer</label>
                  <p>{selectedEvent.user}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>IP-Adresse</label>
                  <p className={styles.monospace}>{selectedEvent.ip}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Standort</label>
                  <p>{selectedEvent.location}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Gerät</label>
                  <p>{selectedEvent.device}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Status</label>
                  <p>{selectedEvent.blocked ? 'Blockiert' : 'Erlaubt'}</p>
                </div>
              </div>

              <div className={styles.detailDescription}>
                <label>Beschreibung</label>
                <p>{selectedEvent.details}</p>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.modalButton}>
                  <FileText size={20} />
                  <span>Details exportieren</span>
                </button>
                {!selectedEvent.blocked && (
                  <button className={`${styles.modalButton} ${styles.danger}`}>
                    <Lock size={20} />
                    <span>IP blockieren</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityAudit;