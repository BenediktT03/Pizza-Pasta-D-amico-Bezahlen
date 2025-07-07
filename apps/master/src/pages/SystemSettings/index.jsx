import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Database,
  Zap,
  Globe,
  Mail,
  Bell,
  Lock,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronRight,
  ToggleLeft,
  Sliders
} from 'lucide-react';
import styles from './SystemSettings.module.css';

const SystemSettings = () => {
  // State Management
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      systemName: 'EATECH Master Control',
      timezone: 'Europe/Zurich',
      language: 'de-CH',
      dateFormat: 'DD.MM.YYYY',
      currency: 'CHF',
      maintenanceMode: false
    },
    security: {
      twoFactorEnabled: true,
      sessionTimeout: 30,
      passwordPolicy: 'strong',
      ipWhitelist: [],
      failedLoginAttempts: 5,
      accountLockoutDuration: 30
    },
    performance: {
      cacheEnabled: true,
      cacheDuration: 3600,
      compressionEnabled: true,
      cdnEnabled: true,
      lazyLoadingEnabled: true,
      imageOptimization: true
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      webhooksEnabled: true,
      slackIntegration: false,
      emailProvider: 'sendgrid'
    },
    database: {
      backupEnabled: true,
      backupFrequency: 'daily',
      backupRetention: 30,
      replicationEnabled: true,
      compressionEnabled: true,
      maintenanceWindow: '02:00-04:00'
    },
    api: {
      rateLimit: 1000,
      rateLimitWindow: 60,
      apiVersion: 'v2',
      deprecatedVersions: ['v1'],
      corsEnabled: true,
      allowedOrigins: ['https://app.eatech.ch']
    }
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Mock data for system info
  const systemInfo = {
    version: '3.0.0',
    environment: 'Production',
    uptime: '45 days, 12 hours',
    lastUpdate: '2025-01-05',
    serverStatus: 'Healthy',
    databaseStatus: 'Optimal'
  };

  // Section configuration
  const sections = [
    { id: 'general', label: 'Allgemein', icon: Settings },
    { id: 'security', label: 'Sicherheit', icon: Shield },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
    { id: 'database', label: 'Datenbank', icon: Database },
    { id: 'api', label: 'API & Integration', icon: Globe }
  ];

  // Handle setting changes
  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  // Save settings
  const saveSettings = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSaveStatus('success');
      setHasChanges(false);
      
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Render setting input based on type
  const renderSettingInput = (section, key, value, type = 'text') => {
    switch (type) {
      case 'toggle':
        return (
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleSettingChange(section, key, e.target.checked)}
            />
            <span className={styles.toggleSlider}></span>
          </label>
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleSettingChange(section, key, e.target.value)}
            className={styles.select}
          >
            {getSelectOptions(section, key).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleSettingChange(section, key, parseInt(e.target.value))}
            className={styles.input}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleSettingChange(section, key, e.target.value)}
            className={styles.input}
          />
        );
    }
  };

  // Get select options based on setting
  const getSelectOptions = (section, key) => {
    const options = {
      general: {
        timezone: [
          { value: 'Europe/Zurich', label: 'Europe/Zurich' },
          { value: 'Europe/Berlin', label: 'Europe/Berlin' },
          { value: 'Europe/Paris', label: 'Europe/Paris' }
        ],
        language: [
          { value: 'de-CH', label: 'Deutsch (Schweiz)' },
          { value: 'fr-CH', label: 'Français (Suisse)' },
          { value: 'it-CH', label: 'Italiano (Svizzera)' },
          { value: 'en-US', label: 'English (US)' }
        ],
        dateFormat: [
          { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
          { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
        ]
      },
      security: {
        passwordPolicy: [
          { value: 'basic', label: 'Basic (8+ Zeichen)' },
          { value: 'strong', label: 'Stark (12+ Zeichen, Sonderzeichen)' },
          { value: 'custom', label: 'Benutzerdefiniert' }
        ]
      },
      database: {
        backupFrequency: [
          { value: 'hourly', label: 'Stündlich' },
          { value: 'daily', label: 'Täglich' },
          { value: 'weekly', label: 'Wöchentlich' },
          { value: 'monthly', label: 'Monatlich' }
        ]
      },
      notifications: {
        emailProvider: [
          { value: 'sendgrid', label: 'SendGrid' },
          { value: 'mailgun', label: 'Mailgun' },
          { value: 'ses', label: 'Amazon SES' },
          { value: 'smtp', label: 'Custom SMTP' }
        ]
      }
    };

    return options[section]?.[key] || [];
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>System Einstellungen</h1>
          <p className={styles.subtitle}>Globale Konfiguration und Systemparameter</p>
        </div>
        <div className={styles.headerActions}>
          {hasChanges && (
            <div className={styles.unsavedChanges}>
              <AlertCircle size={16} />
              <span>Ungespeicherte Änderungen</span>
            </div>
          )}
          <button
            className={`${styles.saveButton} ${isSaving ? styles.saving : ''}`}
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <RefreshCw size={20} className={styles.spinIcon} />
                <span>Speichern...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Speichern</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div className={`${styles.saveStatus} ${styles[saveStatus]}`}>
          {saveStatus === 'success' ? (
            <>
              <CheckCircle size={20} />
              <span>Einstellungen erfolgreich gespeichert</span>
            </>
          ) : (
            <>
              <AlertCircle size={20} />
              <span>Fehler beim Speichern der Einstellungen</span>
            </>
          )}
        </div>
      )}

      {/* System Info */}
      <div className={styles.systemInfo}>
        <div className={styles.infoCard}>
          <Server size={20} />
          <div>
            <span className={styles.infoLabel}>Version</span>
            <span className={styles.infoValue}>{systemInfo.version}</span>
          </div>
        </div>
        <div className={styles.infoCard}>
          <Cpu size={20} />
          <div>
            <span className={styles.infoLabel}>Umgebung</span>
            <span className={styles.infoValue}>{systemInfo.environment}</span>
          </div>
        </div>
        <div className={styles.infoCard}>
          <HardDrive size={20} />
          <div>
            <span className={styles.infoLabel}>Uptime</span>
            <span className={styles.infoValue}>{systemInfo.uptime}</span>
          </div>
        </div>
        <div className={styles.infoCard}>
          <Wifi size={20} />
          <div>
            <span className={styles.infoLabel}>Status</span>
            <span className={`${styles.infoValue} ${styles.statusHealthy}`}>
              {systemInfo.serverStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                className={`${styles.sidebarItem} ${activeSection === section.id ? styles.active : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <Icon size={20} />
                <span>{section.label}</span>
                <ChevronRight size={16} className={styles.chevron} />
              </button>
            );
          })}
        </div>

        {/* Settings Panel */}
        <div className={styles.settingsPanel}>
          {/* General Settings */}
          {activeSection === 'general' && (
            <div className={styles.section}>
              <h2>Allgemeine Einstellungen</h2>
              
              <div className={styles.settingGroup}>
                <div className={styles.setting}>
                  <label>System Name</label>
                  {renderSettingInput('general', 'systemName', settings.general.systemName)}
                  <span className={styles.settingHelp}>Der Name des Systems für Anzeigezwecke</span>
                </div>

                <div className={styles.setting}>
                  <label>Zeitzone</label>
                  {renderSettingInput('general', 'timezone', settings.general.timezone, 'select')}
                  <span className={styles.settingHelp}>Standard-Zeitzone für alle Zeitangaben</span>
                </div>

                <div className={styles.setting}>
                  <label>Sprache</label>
                  {renderSettingInput('general', 'language', settings.general.language, 'select')}
                  <span className={styles.settingHelp}>Standard-Sprache für das System</span>
                </div>

                <div className={styles.setting}>
                  <label>Datumsformat</label>
                  {renderSettingInput('general', 'dateFormat', settings.general.dateFormat, 'select')}
                  <span className={styles.settingHelp}>Format für Datumsanzeigen</span>
                </div>

                <div className={styles.setting}>
                  <label>Währung</label>
                  {renderSettingInput('general', 'currency', settings.general.currency)}
                  <span className={styles.settingHelp}>Standard-Währung für Preisangaben</span>
                </div>

                <div className={styles.setting}>
                  <label>Wartungsmodus</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('general', 'maintenanceMode', settings.general.maintenanceMode, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.general.maintenanceMode ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>Aktiviert den Wartungsmodus für alle Tenant-Apps</span>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeSection === 'security' && (
            <div className={styles.section}>
              <h2>Sicherheitseinstellungen</h2>
              
              <div className={styles.settingGroup}>
                <div className={styles.setting}>
                  <label>Zwei-Faktor-Authentifizierung</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('security', 'twoFactorEnabled', settings.security.twoFactorEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.security.twoFactorEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>2FA für alle Master-Administratoren erforderlich</span>
                </div>

                <div className={styles.setting}>
                  <label>Session Timeout (Minuten)</label>
                  {renderSettingInput('security', 'sessionTimeout', settings.security.sessionTimeout, 'number')}
                  <span className={styles.settingHelp}>Automatischer Logout nach Inaktivität</span>
                </div>

                <div className={styles.setting}>
                  <label>Passwort-Richtlinie</label>
                  {renderSettingInput('security', 'passwordPolicy', settings.security.passwordPolicy, 'select')}
                  <span className={styles.settingHelp}>Mindestanforderungen für Passwörter</span>
                </div>

                <div className={styles.setting}>
                  <label>Fehlgeschlagene Login-Versuche</label>
                  {renderSettingInput('security', 'failedLoginAttempts', settings.security.failedLoginAttempts, 'number')}
                  <span className={styles.settingHelp}>Max. Versuche vor Account-Sperrung</span>
                </div>

                <div className={styles.setting}>
                  <label>Account-Sperrungsdauer (Minuten)</label>
                  {renderSettingInput('security', 'accountLockoutDuration', settings.security.accountLockoutDuration, 'number')}
                  <span className={styles.settingHelp}>Dauer der Account-Sperrung nach zu vielen Fehlversuchen</span>
                </div>
              </div>
            </div>
          )}

          {/* Performance Settings */}
          {activeSection === 'performance' && (
            <div className={styles.section}>
              <h2>Performance Einstellungen</h2>
              
              <div className={styles.settingGroup}>
                <div className={styles.setting}>
                  <label>Cache aktivieren</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('performance', 'cacheEnabled', settings.performance.cacheEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.performance.cacheEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>Server-seitiges Caching für bessere Performance</span>
                </div>

                <div className={styles.setting}>
                  <label>Cache-Dauer (Sekunden)</label>
                  {renderSettingInput('performance', 'cacheDuration', settings.performance.cacheDuration, 'number')}
                  <span className={styles.settingHelp}>Wie lange Daten im Cache gespeichert werden</span>
                </div>

                <div className={styles.setting}>
                  <label>Komprimierung</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('performance', 'compressionEnabled', settings.performance.compressionEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.performance.compressionEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>GZIP-Komprimierung für kleinere Dateigrößen</span>
                </div>

                <div className={styles.setting}>
                  <label>CDN aktivieren</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('performance', 'cdnEnabled', settings.performance.cdnEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.performance.cdnEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>Content Delivery Network für statische Assets</span>
                </div>

                <div className={styles.setting}>
                  <label>Lazy Loading</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('performance', 'lazyLoadingEnabled', settings.performance.lazyLoadingEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.performance.lazyLoadingEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>Bilder und Komponenten bei Bedarf laden</span>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeSection === 'notifications' && (
            <div className={styles.section}>
              <h2>Benachrichtigungseinstellungen</h2>
              
              <div className={styles.settingGroup}>
                <div className={styles.setting}>
                  <label>E-Mail Benachrichtigungen</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('notifications', 'emailEnabled', settings.notifications.emailEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.notifications.emailEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>System-Benachrichtigungen per E-Mail</span>
                </div>

                <div className={styles.setting}>
                  <label>E-Mail Provider</label>
                  {renderSettingInput('notifications', 'emailProvider', settings.notifications.emailProvider, 'select')}
                  <span className={styles.settingHelp}>Service für E-Mail-Versand</span>
                </div>

                <div className={styles.setting}>
                  <label>SMS Benachrichtigungen</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('notifications', 'smsEnabled', settings.notifications.smsEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.notifications.smsEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>Kritische Alerts per SMS</span>
                </div>

                <div className={styles.setting}>
                  <label>Push Benachrichtigungen</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('notifications', 'pushEnabled', settings.notifications.pushEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.notifications.pushEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>Browser Push-Benachrichtigungen</span>
                </div>

                <div className={styles.setting}>
                  <label>Webhooks</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('notifications', 'webhooksEnabled', settings.notifications.webhooksEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.notifications.webhooksEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>Webhook-Integrationen für externe Services</span>
                </div>
              </div>
            </div>
          )}

          {/* Database Settings */}
          {activeSection === 'database' && (
            <div className={styles.section}>
              <h2>Datenbank Einstellungen</h2>
              
              <div className={styles.settingGroup}>
                <div className={styles.setting}>
                  <label>Automatische Backups</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('database', 'backupEnabled', settings.database.backupEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.database.backupEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>Regelmäßige Datenbank-Backups</span>
                </div>

                <div className={styles.setting}>
                  <label>Backup-Häufigkeit</label>
                  {renderSettingInput('database', 'backupFrequency', settings.database.backupFrequency, 'select')}
                  <span className={styles.settingHelp}>Wie oft Backups erstellt werden</span>
                </div>

                <div className={styles.setting}>
                  <label>Backup-Aufbewahrung (Tage)</label>
                  {renderSettingInput('database', 'backupRetention', settings.database.backupRetention, 'number')}
                  <span className={styles.settingHelp}>Wie lange Backups gespeichert werden</span>
                </div>

                <div className={styles.setting}>
                  <label>Replikation</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('database', 'replicationEnabled', settings.database.replicationEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.database.replicationEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>Datenbank-Replikation für Hochverfügbarkeit</span>
                </div>

                <div className={styles.setting}>
                  <label>Wartungsfenster</label>
                  {renderSettingInput('database', 'maintenanceWindow', settings.database.maintenanceWindow)}
                  <span className={styles.settingHelp}>Zeitfenster für Datenbank-Wartung (UTC)</span>
                </div>
              </div>
            </div>
          )}

          {/* API Settings */}
          {activeSection === 'api' && (
            <div className={styles.section}>
              <h2>API & Integration</h2>
              
              <div className={styles.settingGroup}>
                <div className={styles.setting}>
                  <label>Rate Limit (Anfragen)</label>
                  {renderSettingInput('api', 'rateLimit', settings.api.rateLimit, 'number')}
                  <span className={styles.settingHelp}>Max. API-Anfragen pro Zeitfenster</span>
                </div>

                <div className={styles.setting}>
                  <label>Rate Limit Fenster (Sekunden)</label>
                  {renderSettingInput('api', 'rateLimitWindow', settings.api.rateLimitWindow, 'number')}
                  <span className={styles.settingHelp}>Zeitfenster für Rate Limiting</span>
                </div>

                <div className={styles.setting}>
                  <label>API Version</label>
                  {renderSettingInput('api', 'apiVersion', settings.api.apiVersion)}
                  <span className={styles.settingHelp}>Aktuelle API-Version</span>
                </div>

                <div className={styles.setting}>
                  <label>CORS aktivieren</label>
                  <div className={styles.toggleSetting}>
                    {renderSettingInput('api', 'corsEnabled', settings.api.corsEnabled, 'toggle')}
                    <span className={styles.toggleLabel}>
                      {settings.api.corsEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </div>
                  <span className={styles.settingHelp}>Cross-Origin Resource Sharing erlauben</span>
                </div>

                <div className={styles.settingInfo}>
                  <Info size={16} />
                  <span>API-Dokumentation verfügbar unter <a href="/api/docs">/api/docs</a></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;