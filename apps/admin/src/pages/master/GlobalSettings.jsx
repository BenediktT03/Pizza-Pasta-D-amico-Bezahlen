/**
 * EATECH - Global Settings
 * Version: 5.0.0
 * Description: Globale Systemeinstellungen für Master Administratoren
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/pages/master/GlobalSettings.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Shield, Globe, Database, Mail, Bell,
  CreditCard, Users, Key, Lock, Zap, Server,
  FileText, Code, Palette, Languages, Clock,
  Save, RefreshCw, AlertCircle, CheckCircle,
  Info, ChevronRight, Toggle, Copy, ExternalLink,
  Smartphone, Monitor, Cloud, GitBranch, Package
} from 'lucide-react';
import { ref, set, get } from 'firebase/database';
import { getDatabaseInstance } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import styles from './GlobalSettings.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const SETTING_CATEGORIES = [
  { id: 'general', label: 'Allgemein', icon: Settings },
  { id: 'security', label: 'Sicherheit', icon: Shield },
  { id: 'api', label: 'API & Integration', icon: Code },
  { id: 'payment', label: 'Zahlungen', icon: CreditCard },
  { id: 'email', label: 'E-Mail & Benachrichtigungen', icon: Mail },
  { id: 'appearance', label: 'Erscheinungsbild', icon: Palette },
  { id: 'advanced', label: 'Erweitert', icon: Zap }
];

const DEFAULT_SETTINGS = {
  general: {
    systemName: 'EATECH',
    systemUrl: 'https://eatech.ch',
    defaultLanguage: 'de-CH',
    timezone: 'Europe/Zurich',
    currency: 'CHF',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    maintenanceMode: false,
    maintenanceMessage: 'Das System wird gerade gewartet. Bitte versuchen Sie es später erneut.'
  },
  security: {
    requireMfa: false,
    sessionTimeout: 30,
    passwordMinLength: 12,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    ipWhitelisting: false,
    ipWhitelist: [],
    forceHttps: true,
    allowedOrigins: ['https://eatech.ch', 'https://*.eatech.ch']
  },
  api: {
    rateLimit: 1000,
    rateLimitWindow: 3600,
    apiVersion: 'v1',
    webhookRetries: 3,
    webhookTimeout: 30,
    allowedIPs: [],
    requireApiKey: true,
    apiKeyRotation: 90,
    maxRequestSize: '10MB',
    enableGraphQL: false,
    enableWebSocket: true
  },
  payment: {
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    enableStripe: true,
    enableTwint: true,
    enableCrypto: false,
    cryptoWalletAddress: '',
    paymentRetries: 3,
    refundPeriod: 14,
    automaticTaxCalculation: true,
    defaultTaxRate: 7.7
  },
  email: {
    provider: 'sendgrid',
    fromEmail: 'noreply@eatech.ch',
    fromName: 'EATECH',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    enableEmailNotifications: true,
    enableSmsNotifications: false,
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: ''
  },
  appearance: {
    primaryColor: '#FF6B6B',
    secondaryColor: '#4ECDC4',
    darkMode: true,
    customLogo: '',
    customFavicon: '',
    customCss: '',
    showPoweredBy: true,
    customFooterText: '',
    enableAnimations: true,
    fontFamily: 'Inter'
  },
  advanced: {
    debugMode: false,
    logLevel: 'info',
    enableAnalytics: true,
    analyticsId: '',
    cdnUrl: 'https://cdn.eatech.ch',
    enableCaching: true,
    cacheTimeout: 3600,
    enableCompression: true,
    maxUploadSize: '50MB',
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'csv', 'xlsx'],
    backupEnabled: true,
    backupFrequency: 'daily',
    backupRetention: 30
  }
};

// ============================================================================
// COMPONENTS
// ============================================================================

const SettingToggle = ({ label, value, onChange, description }) => (
  <div className={styles.settingToggle}>
    <div className={styles.toggleContent}>
      <label className={styles.toggleLabel}>{label}</label>
      {description && <p className={styles.toggleDescription}>{description}</p>}
    </div>
    <label className={styles.switch}>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.slider}></span>
    </label>
  </div>
);

const SettingInput = ({ label, value, onChange, type = 'text', placeholder, description, icon: Icon }) => (
  <div className={styles.settingInput}>
    <label className={styles.inputLabel}>
      {Icon && <Icon size={16} />}
      {label}
    </label>
    {description && <p className={styles.inputDescription}>{description}</p>}
    <div className={styles.inputWrapper}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  </div>
);

const SettingSelect = ({ label, value, onChange, options, description }) => (
  <div className={styles.settingSelect}>
    <label className={styles.selectLabel}>{label}</label>
    {description && <p className={styles.selectDescription}>{description}</p>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={styles.select}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const SettingTextarea = ({ label, value, onChange, placeholder, description, rows = 4 }) => (
  <div className={styles.settingTextarea}>
    <label className={styles.textareaLabel}>{label}</label>
    {description && <p className={styles.textareaDescription}>{description}</p>}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={styles.textarea}
    />
  </div>
);

const ApiKeyCard = ({ title, apiKey, onRegenerate }) => {
  const [showKey, setShowKey] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API Key kopiert');
  };
  
  return (
    <div className={styles.apiKeyCard}>
      <div className={styles.apiKeyHeader}>
        <h4>{title}</h4>
        <button className={styles.regenerateButton} onClick={onRegenerate}>
          <RefreshCw size={16} />
          Neu generieren
        </button>
      </div>
      <div className={styles.apiKeyContent}>
        <code className={styles.apiKey}>
          {showKey ? apiKey : '••••••••••••••••••••••••••••••••'}
        </code>
        <div className={styles.apiKeyActions}>
          <button onClick={() => setShowKey(!showKey)}>
            {showKey ? 'Verbergen' : 'Anzeigen'}
          </button>
          <button onClick={copyToClipboard}>
            <Copy size={16} />
            Kopieren
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GlobalSettings = () => {
  const db = getDatabaseInstance();
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('general');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const settingsRef = ref(db, 'globalSettings');
        const snapshot = await get(settingsRef);
        
        if (snapshot.exists()) {
          const loadedSettings = snapshot.val();
          setSettings(prevSettings => ({
            ...prevSettings,
            ...loadedSettings
          }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Fehler beim Laden der Einstellungen');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [db]);
  
  // Update setting
  const updateSetting = useCallback((category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  }, []);
  
  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsRef = ref(db, 'globalSettings');
      await set(settingsRef, settings);
      
      toast.success('Einstellungen gespeichert');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };
  
  // Reset settings
  const resetSettings = () => {
    if (window.confirm('Möchten Sie alle Einstellungen auf die Standardwerte zurücksetzen?')) {
      setSettings(DEFAULT_SETTINGS);
      setHasChanges(true);
      toast.success('Einstellungen zurückgesetzt');
    }
  };
  
  // Generate API key
  const generateApiKey = () => {
    const key = 'sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return key;
  };
  
  // Loading state
  if (loading) {
    return (
      <div className={styles.loading}>
        <RefreshCw className={styles.spinner} />
        <span>Einstellungen werden geladen...</span>
      </div>
    );
  }
  
  return (
    <div className={styles.globalSettings}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Globale Einstellungen</h1>
          <p>Systemweite Konfiguration und Einstellungen</p>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.resetButton} onClick={resetSettings}>
            <RefreshCw size={18} />
            Zurücksetzen
          </button>
          <button 
            className={styles.saveButton} 
            onClick={saveSettings}
            disabled={!hasChanges || saving}
          >
            <Save size={18} />
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
      
      {/* Unsaved changes warning */}
      {hasChanges && (
        <div className={styles.unsavedWarning}>
          <AlertCircle size={16} />
          <span>Sie haben ungespeicherte Änderungen</span>
        </div>
      )}
      
      {/* Categories */}
      <div className={styles.categories}>
        {SETTING_CATEGORIES.map(category => (
          <button
            key={category.id}
            className={`${styles.categoryButton} ${activeCategory === category.id ? styles.active : ''}`}
            onClick={() => setActiveCategory(category.id)}
          >
            <category.icon size={20} />
            <span>{category.label}</span>
            <ChevronRight size={16} className={styles.categoryArrow} />
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className={styles.content}>
        {/* General Settings */}
        {activeCategory === 'general' && (
          <div className={styles.settingsSection}>
            <h2>Allgemeine Einstellungen</h2>
            
            <div className={styles.settingsGrid}>
              <SettingInput
                label="System Name"
                value={settings.general.systemName}
                onChange={(value) => updateSetting('general', 'systemName', value)}
                description="Der Name des Systems, der in der Benutzeroberfläche angezeigt wird"
                icon={Globe}
              />
              
              <SettingInput
                label="System URL"
                value={settings.general.systemUrl}
                onChange={(value) => updateSetting('general', 'systemUrl', value)}
                description="Die Haupt-URL des Systems"
                icon={ExternalLink}
              />
              
              <SettingSelect
                label="Standard-Sprache"
                value={settings.general.defaultLanguage}
                onChange={(value) => updateSetting('general', 'defaultLanguage', value)}
                options={[
                  { value: 'de-CH', label: 'Deutsch (Schweiz)' },
                  { value: 'fr-CH', label: 'Französisch (Schweiz)' },
                  { value: 'it-CH', label: 'Italienisch (Schweiz)' },
                  { value: 'en-US', label: 'Englisch (US)' }
                ]}
                description="Die Standardsprache für neue Benutzer"
              />
              
              <SettingSelect
                label="Zeitzone"
                value={settings.general.timezone}
                onChange={(value) => updateSetting('general', 'timezone', value)}
                options={[
                  { value: 'Europe/Zurich', label: 'Europa/Zürich' },
                  { value: 'Europe/Berlin', label: 'Europa/Berlin' },
                  { value: 'Europe/Paris', label: 'Europa/Paris' },
                  { value: 'UTC', label: 'UTC' }
                ]}
                description="Die Standard-Zeitzone des Systems"
              />
              
              <SettingSelect
                label="Währung"
                value={settings.general.currency}
                onChange={(value) => updateSetting('general', 'currency', value)}
                options={[
                  { value: 'CHF', label: 'CHF - Schweizer Franken' },
                  { value: 'EUR', label: 'EUR - Euro' },
                  { value: 'USD', label: 'USD - US Dollar' }
                ]}
                description="Die Standardwährung für Preise und Abrechnungen"
              />
              
              <SettingSelect
                label="Datumsformat"
                value={settings.general.dateFormat}
                onChange={(value) => updateSetting('general', 'dateFormat', value)}
                options={[
                  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
                  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
                ]}
                description="Das Standardformat für Datumsanzeigen"
              />
            </div>
            
            <div className={styles.maintenanceSection}>
              <h3>Wartungsmodus</h3>
              <SettingToggle
                label="Wartungsmodus aktivieren"
                value={settings.general.maintenanceMode}
                onChange={(value) => updateSetting('general', 'maintenanceMode', value)}
                description="Wenn aktiviert, können nur Master-Admins auf das System zugreifen"
              />
              
              {settings.general.maintenanceMode && (
                <SettingTextarea
                  label="Wartungsnachricht"
                  value={settings.general.maintenanceMessage}
                  onChange={(value) => updateSetting('general', 'maintenanceMessage', value)}
                  placeholder="Nachricht für Benutzer während der Wartung..."
                  description="Diese Nachricht wird Benutzern während der Wartung angezeigt"
                />
              )}
            </div>
          </div>
        )}
        
        {/* Security Settings */}
        {activeCategory === 'security' && (
          <div className={styles.settingsSection}>
            <h2>Sicherheitseinstellungen</h2>
            
            <div className={styles.settingsGrid}>
              <SettingToggle
                label="Zwei-Faktor-Authentifizierung erforderlich"
                value={settings.security.requireMfa}
                onChange={(value) => updateSetting('security', 'requireMfa', value)}
                description="Alle Benutzer müssen 2FA aktivieren"
              />
              
              <SettingInput
                label="Session Timeout (Minuten)"
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(value) => updateSetting('security', 'sessionTimeout', parseInt(value))}
                description="Zeit bis zur automatischen Abmeldung bei Inaktivität"
                icon={Clock}
              />
              
              <SettingInput
                label="Max. Login-Versuche"
                type="number"
                value={settings.security.maxLoginAttempts}
                onChange={(value) => updateSetting('security', 'maxLoginAttempts', parseInt(value))}
                description="Anzahl der erlaubten fehlgeschlagenen Login-Versuche"
                icon={Lock}
              />
              
              <SettingInput
                label="Sperrzeit (Minuten)"
                type="number"
                value={settings.security.lockoutDuration}
                onChange={(value) => updateSetting('security', 'lockoutDuration', parseInt(value))}
                description="Dauer der Kontosperrung nach zu vielen fehlgeschlagenen Versuchen"
                icon={Clock}
              />
            </div>
            
            <div className={styles.passwordSection}>
              <h3>Passwort-Richtlinien</h3>
              
              <div className={styles.settingsGrid}>
                <SettingInput
                  label="Minimale Passwortlänge"
                  type="number"
                  value={settings.security.passwordMinLength}
                  onChange={(value) => updateSetting('security', 'passwordMinLength', parseInt(value))}
                  description="Minimale Anzahl von Zeichen für Passwörter"
                  icon={Key}
                />
                
                <SettingToggle
                  label="Großbuchstaben erforderlich"
                  value={settings.security.passwordRequireUppercase}
                  onChange={(value) => updateSetting('security', 'passwordRequireUppercase', value)}
                />
                
                <SettingToggle
                  label="Zahlen erforderlich"
                  value={settings.security.passwordRequireNumbers}
                  onChange={(value) => updateSetting('security', 'passwordRequireNumbers', value)}
                />
                
                <SettingToggle
                  label="Sonderzeichen erforderlich"
                  value={settings.security.passwordRequireSpecial}
                  onChange={(value) => updateSetting('security', 'passwordRequireSpecial', value)}
                />
              </div>
            </div>
            
            <div className={styles.networkSection}>
              <h3>Netzwerk-Sicherheit</h3>
              
              <SettingToggle
                label="HTTPS erzwingen"
                value={settings.security.forceHttps}
                onChange={(value) => updateSetting('security', 'forceHttps', value)}
                description="Alle Verbindungen müssen über HTTPS erfolgen"
              />
              
              <SettingToggle
                label="IP-Whitelisting aktivieren"
                value={settings.security.ipWhitelisting}
                onChange={(value) => updateSetting('security', 'ipWhitelisting', value)}
                description="Nur erlaubte IP-Adressen können auf das System zugreifen"
              />
              
              {settings.security.ipWhitelisting && (
                <SettingTextarea
                  label="Erlaubte IP-Adressen"
                  value={settings.security.ipWhitelist.join('\n')}
                  onChange={(value) => updateSetting('security', 'ipWhitelist', value.split('\n').filter(ip => ip.trim()))}
                  placeholder="Eine IP-Adresse pro Zeile..."
                  description="Liste der erlaubten IP-Adressen (eine pro Zeile)"
                  rows={6}
                />
              )}
            </div>
          </div>
        )}
        
        {/* API Settings */}
        {activeCategory === 'api' && (
          <div className={styles.settingsSection}>
            <h2>API & Integration</h2>
            
            <div className={styles.apiKeysSection}>
              <h3>API Schlüssel</h3>
              <p className={styles.sectionDescription}>
                Diese Schlüssel werden für die Authentifizierung von API-Anfragen verwendet
              </p>
              
              <ApiKeyCard
                title="Master API Key"
                apiKey="sk_live_1234567890abcdefghijklmnop"
                onRegenerate={() => toast.success('API Key regeneriert')}
              />
              
              <ApiKeyCard
                title="Webhook Signing Secret"
                apiKey="whsec_1234567890abcdefghijklmnop"
                onRegenerate={() => toast.success('Webhook Secret regeneriert')}
              />
            </div>
            
            <div className={styles.settingsGrid}>
              <SettingInput
                label="Rate Limit (Anfragen)"
                type="number"
                value={settings.api.rateLimit}
                onChange={(value) => updateSetting('api', 'rateLimit', parseInt(value))}
                description="Maximale Anzahl von API-Anfragen pro Zeitfenster"
                icon={Zap}
              />
              
              <SettingInput
                label="Rate Limit Zeitfenster (Sekunden)"
                type="number"
                value={settings.api.rateLimitWindow}
                onChange={(value) => updateSetting('api', 'rateLimitWindow', parseInt(value))}
                description="Zeitfenster für das Rate Limiting"
                icon={Clock}
              />
              
              <SettingSelect
                label="API Version"
                value={settings.api.apiVersion}
                onChange={(value) => updateSetting('api', 'apiVersion', value)}
                options={[
                  { value: 'v1', label: 'v1 (Stabil)' },
                  { value: 'v2', label: 'v2 (Beta)' }
                ]}
                description="Die aktuelle API-Version"
              />
              
              <SettingInput
                label="Webhook Timeout (Sekunden)"
                type="number"
                value={settings.api.webhookTimeout}
                onChange={(value) => updateSetting('api', 'webhookTimeout', parseInt(value))}
                description="Maximale Zeit für Webhook-Antworten"
                icon={Clock}
              />
              
              <SettingInput
                label="Webhook Wiederholungen"
                type="number"
                value={settings.api.webhookRetries}
                onChange={(value) => updateSetting('api', 'webhookRetries', parseInt(value))}
                description="Anzahl der Wiederholungsversuche bei fehlgeschlagenen Webhooks"
                icon={RefreshCw}
              />
              
              <SettingSelect
                label="Max. Request-Größe"
                value={settings.api.maxRequestSize}
                onChange={(value) => updateSetting('api', 'maxRequestSize', value)}
                options={[
                  { value: '1MB', label: '1 MB' },
                  { value: '5MB', label: '5 MB' },
                  { value: '10MB', label: '10 MB' },
                  { value: '50MB', label: '50 MB' }
                ]}
                description="Maximale Größe für API-Anfragen"
              />
            </div>
            
            <div className={styles.apiFeatures}>
              <h3>API Features</h3>
              
              <div className={styles.featureToggles}>
                <SettingToggle
                  label="API Key erforderlich"
                  value={settings.api.requireApiKey}
                  onChange={(value) => updateSetting('api', 'requireApiKey', value)}
                  description="Alle API-Anfragen müssen einen gültigen API-Key enthalten"
                />
                
                <SettingToggle
                  label="GraphQL aktivieren"
                  value={settings.api.enableGraphQL}
                  onChange={(value) => updateSetting('api', 'enableGraphQL', value)}
                  description="GraphQL-Endpunkt zusätzlich zur REST API bereitstellen"
                />
                
                <SettingToggle
                  label="WebSocket aktivieren"
                  value={settings.api.enableWebSocket}
                  onChange={(value) => updateSetting('api', 'enableWebSocket', value)}
                  description="WebSocket-Verbindungen für Echtzeit-Updates erlauben"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Payment Settings */}
        {activeCategory === 'payment' && (
          <div className={styles.settingsSection}>
            <h2>Zahlungseinstellungen</h2>
            
            <div className={styles.paymentProviders}>
              <h3>Zahlungsanbieter</h3>
              
              <div className={styles.providerSection}>
                <div className={styles.providerHeader}>
                  <h4>Stripe</h4>
                  <SettingToggle
                    label=""
                    value={settings.payment.enableStripe}
                    onChange={(value) => updateSetting('payment', 'enableStripe', value)}
                  />
                </div>
                
                {settings.payment.enableStripe && (
                  <div className={styles.providerSettings}>
                    <SettingInput
                      label="Publishable Key"
                      value={settings.payment.stripePublishableKey}
                      onChange={(value) => updateSetting('payment', 'stripePublishableKey', value)}
                      placeholder="pk_live_..."
                      description="Öffentlicher Stripe-Schlüssel"
                    />
                    
                    <SettingInput
                      label="Secret Key"
                      type="password"
                      value={settings.payment.stripeSecretKey}
                      onChange={(value) => updateSetting('payment', 'stripeSecretKey', value)}
                      placeholder="sk_live_..."
                      description="Geheimer Stripe-Schlüssel (wird verschlüsselt gespeichert)"
                    />
                    
                    <SettingInput
                      label="Webhook Secret"
                      type="password"
                      value={settings.payment.stripeWebhookSecret}
                      onChange={(value) => updateSetting('payment', 'stripeWebhookSecret', value)}
                      placeholder="whsec_..."
                      description="Stripe Webhook Signing Secret"
                    />
                  </div>
                )}
              </div>
              
              <div className={styles.providerSection}>
                <div className={styles.providerHeader}>
                  <h4>TWINT</h4>
                  <SettingToggle
                    label=""
                    value={settings.payment.enableTwint}
                    onChange={(value) => updateSetting('payment', 'enableTwint', value)}
                  />
                </div>
              </div>
              
              <div className={styles.providerSection}>
                <div className={styles.providerHeader}>
                  <h4>Kryptowährungen</h4>
                  <SettingToggle
                    label=""
                    value={settings.payment.enableCrypto}
                    onChange={(value) => updateSetting('payment', 'enableCrypto', value)}
                  />
                </div>
                
                {settings.payment.enableCrypto && (
                  <div className={styles.providerSettings}>
                    <SettingInput
                      label="Wallet-Adresse"
                      value={settings.payment.cryptoWalletAddress}
                      onChange={(value) => updateSetting('payment', 'cryptoWalletAddress', value)}
                      placeholder="0x..."
                      description="Ethereum-Wallet-Adresse für Krypto-Zahlungen"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.paymentSettings}>
              <h3>Zahlungsrichtlinien</h3>
              
              <div className={styles.settingsGrid}>
                <SettingInput
                  label="Zahlungswiederholungen"
                  type="number"
                  value={settings.payment.paymentRetries}
                  onChange={(value) => updateSetting('payment', 'paymentRetries', parseInt(value))}
                  description="Anzahl der automatischen Wiederholungsversuche bei fehlgeschlagenen Zahlungen"
                />
                
                <SettingInput
                  label="Rückerstattungszeitraum (Tage)"
                  type="number"
                  value={settings.payment.refundPeriod}
                  onChange={(value) => updateSetting('payment', 'refundPeriod', parseInt(value))}
                  description="Maximaler Zeitraum für Rückerstattungen"
                />
                
                <SettingToggle
                  label="Automatische Steuerberechnung"
                  value={settings.payment.automaticTaxCalculation}
                  onChange={(value) => updateSetting('payment', 'automaticTaxCalculation', value)}
                  description="Steuern automatisch basierend auf dem Standort berechnen"
                />
                
                <SettingInput
                  label="Standard-Steuersatz (%)"
                  type="number"
                  step="0.1"
                  value={settings.payment.defaultTaxRate}
                  onChange={(value) => updateSetting('payment', 'defaultTaxRate', parseFloat(value))}
                  description="Standard-MwSt-Satz für die Schweiz"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Email Settings */}
        {activeCategory === 'email' && (
          <div className={styles.settingsSection}>
            <h2>E-Mail & Benachrichtigungen</h2>
            
            <div className={styles.emailSettings}>
              <h3>E-Mail-Konfiguration</h3>
              
              <div className={styles.settingsGrid}>
                <SettingSelect
                  label="E-Mail-Provider"
                  value={settings.email.provider}
                  onChange={(value) => updateSetting('email', 'provider', value)}
                  options={[
                    { value: 'sendgrid', label: 'SendGrid' },
                    { value: 'smtp', label: 'SMTP' },
                    { value: 'ses', label: 'Amazon SES' },
                    { value: 'mailgun', label: 'Mailgun' }
                  ]}
                  description="Der E-Mail-Versanddienstleister"
                />
                
                <SettingInput
                  label="Absender E-Mail"
                  type="email"
                  value={settings.email.fromEmail}
                  onChange={(value) => updateSetting('email', 'fromEmail', value)}
                  description="Standard-Absenderadresse für System-E-Mails"
                  icon={Mail}
                />
                
                <SettingInput
                  label="Absender Name"
                  value={settings.email.fromName}
                  onChange={(value) => updateSetting('email', 'fromName', value)}
                  description="Standard-Absendername für System-E-Mails"
                />
              </div>
              
              {settings.email.provider === 'smtp' && (
                <div className={styles.smtpSettings}>
                  <h4>SMTP-Einstellungen</h4>
                  
                  <div className={styles.settingsGrid}>
                    <SettingInput
                      label="SMTP Host"
                      value={settings.email.smtpHost}
                      onChange={(value) => updateSetting('email', 'smtpHost', value)}
                      placeholder="smtp.example.com"
                    />
                    
                    <SettingInput
                      label="SMTP Port"
                      type="number"
                      value={settings.email.smtpPort}
                      onChange={(value) => updateSetting('email', 'smtpPort', parseInt(value))}
                    />
                    
                    <SettingInput
                      label="SMTP Benutzername"
                      value={settings.email.smtpUser}
                      onChange={(value) => updateSetting('email', 'smtpUser', value)}
                    />
                    
                    <SettingInput
                      label="SMTP Passwort"
                      type="password"
                      value={settings.email.smtpPassword}
                      onChange={(value) => updateSetting('email', 'smtpPassword', value)}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className={styles.notificationSettings}>
              <h3>Benachrichtigungen</h3>
              
              <div className={styles.notificationToggles}>
                <SettingToggle
                  label="E-Mail-Benachrichtigungen aktivieren"
                  value={settings.email.enableEmailNotifications}
                  onChange={(value) => updateSetting('email', 'enableEmailNotifications', value)}
                  description="System-E-Mails an Benutzer senden"
                />
                
                <SettingToggle
                  label="SMS-Benachrichtigungen aktivieren"
                  value={settings.email.enableSmsNotifications}
                  onChange={(value) => updateSetting('email', 'enableSmsNotifications', value)}
                  description="SMS-Benachrichtigungen über Twilio senden"
                />
              </div>
              
              {settings.email.enableSmsNotifications && (
                <div className={styles.twilioSettings}>
                  <h4>Twilio-Einstellungen</h4>
                  
                  <div className={styles.settingsGrid}>
                    <SettingInput
                      label="Account SID"
                      value={settings.email.twilioAccountSid}
                      onChange={(value) => updateSetting('email', 'twilioAccountSid', value)}
                      placeholder="AC..."
                    />
                    
                    <SettingInput
                      label="Auth Token"
                      type="password"
                      value={settings.email.twilioAuthToken}
                      onChange={(value) => updateSetting('email', 'twilioAuthToken', value)}
                    />
                    
                    <SettingInput
                      label="Telefonnummer"
                      value={settings.email.twilioPhoneNumber}
                      onChange={(value) => updateSetting('email', 'twilioPhoneNumber', value)}
                      placeholder="+41..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Appearance Settings */}
        {activeCategory === 'appearance' && (
          <div className={styles.settingsSection}>
            <h2>Erscheinungsbild</h2>
            
            <div className={styles.colorSettings}>
              <h3>Farben</h3>
              
              <div className={styles.colorGrid}>
                <div className={styles.colorInput}>
                  <label>Primärfarbe</label>
                  <div className={styles.colorPicker}>
                    <input
                      type="color"
                      value={settings.appearance.primaryColor}
                      onChange={(e) => updateSetting('appearance', 'primaryColor', e.target.value)}
                    />
                    <input
                      type="text"
                      value={settings.appearance.primaryColor}
                      onChange={(e) => updateSetting('appearance', 'primaryColor', e.target.value)}
                      placeholder="#FF6B6B"
                    />
                  </div>
                </div>
                
                <div className={styles.colorInput}>
                  <label>Sekundärfarbe</label>
                  <div className={styles.colorPicker}>
                    <input
                      type="color"
                      value={settings.appearance.secondaryColor}
                      onChange={(e) => updateSetting('appearance', 'secondaryColor', e.target.value)}
                    />
                    <input
                      type="text"
                      value={settings.appearance.secondaryColor}
                      onChange={(e) => updateSetting('appearance', 'secondaryColor', e.target.value)}
                      placeholder="#4ECDC4"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.themeSettings}>
              <h3>Theme-Einstellungen</h3>
              
              <div className={styles.themeToggles}>
                <SettingToggle
                  label="Dark Mode als Standard"
                  value={settings.appearance.darkMode}
                  onChange={(value) => updateSetting('appearance', 'darkMode', value)}
                  description="Dark Mode als Standard-Theme verwenden"
                />
                
                <SettingToggle
                  label="Animationen aktivieren"
                  value={settings.appearance.enableAnimations}
                  onChange={(value) => updateSetting('appearance', 'enableAnimations', value)}
                  description="UI-Animationen und Übergänge aktivieren"
                />
                
                <SettingToggle
                  label="'Powered by EATECH' anzeigen"
                  value={settings.appearance.showPoweredBy}
                  onChange={(value) => updateSetting('appearance', 'showPoweredBy', value)}
                  description="EATECH-Branding im Footer anzeigen"
                />
              </div>
              
              <SettingSelect
                label="Schriftart"
                value={settings.appearance.fontFamily}
                onChange={(value) => updateSetting('appearance', 'fontFamily', value)}
                options={[
                  { value: 'Inter', label: 'Inter' },
                  { value: 'Roboto', label: 'Roboto' },
                  { value: 'Open Sans', label: 'Open Sans' },
                  { value: 'Helvetica Neue', label: 'Helvetica Neue' }
                ]}
                description="Standard-Schriftart für die Benutzeroberfläche"
              />
            </div>
            
            <div className={styles.customizationSettings}>
              <h3>Anpassungen</h3>
              
              <SettingInput
                label="Custom Logo URL"
                value={settings.appearance.customLogo}
                onChange={(value) => updateSetting('appearance', 'customLogo', value)}
                placeholder="https://example.com/logo.png"
                description="URL zu einem benutzerdefinierten Logo"
              />
              
              <SettingInput
                label="Custom Favicon URL"
                value={settings.appearance.customFavicon}
                onChange={(value) => updateSetting('appearance', 'customFavicon', value)}
                placeholder="https://example.com/favicon.ico"
                description="URL zu einem benutzerdefinierten Favicon"
              />
              
              <SettingTextarea
                label="Custom Footer Text"
                value={settings.appearance.customFooterText}
                onChange={(value) => updateSetting('appearance', 'customFooterText', value)}
                placeholder="© 2025 Ihr Unternehmen. Alle Rechte vorbehalten."
                description="Benutzerdefinierter Text für den Footer"
              />
              
              <SettingTextarea
                label="Custom CSS"
                value={settings.appearance.customCss}
                onChange={(value) => updateSetting('appearance', 'customCss', value)}
                placeholder="/* Ihre benutzerdefinierten CSS-Regeln */"
                description="Zusätzliche CSS-Regeln zur Anpassung des Designs"
                rows={8}
              />
            </div>
          </div>
        )}
        
        {/* Advanced Settings */}
        {activeCategory === 'advanced' && (
          <div className={styles.settingsSection}>
            <h2>Erweiterte Einstellungen</h2>
            
            <div className={styles.debugSettings}>
              <h3>Entwicklung & Debugging</h3>
              
              <div className={styles.settingsGrid}>
                <SettingToggle
                  label="Debug-Modus"
                  value={settings.advanced.debugMode}
                  onChange={(value) => updateSetting('advanced', 'debugMode', value)}
                  description="Erweiterte Fehlerausgaben und Entwickler-Tools aktivieren"
                />
                
                <SettingSelect
                  label="Log-Level"
                  value={settings.advanced.logLevel}
                  onChange={(value) => updateSetting('advanced', 'logLevel', value)}
                  options={[
                    { value: 'error', label: 'Nur Fehler' },
                    { value: 'warn', label: 'Warnungen & Fehler' },
                    { value: 'info', label: 'Info, Warnungen & Fehler' },
                    { value: 'debug', label: 'Alles (Debug)' }
                  ]}
                  description="Detailgrad der System-Logs"
                />
              </div>
            </div>
            
            <div className={styles.performanceSettings}>
              <h3>Performance & Caching</h3>
              
              <div className={styles.settingsGrid}>
                <SettingToggle
                  label="Caching aktivieren"
                  value={settings.advanced.enableCaching}
                  onChange={(value) => updateSetting('advanced', 'enableCaching', value)}
                  description="Server-seitiges Caching für bessere Performance"
                />
                
                <SettingInput
                  label="Cache Timeout (Sekunden)"
                  type="number"
                  value={settings.advanced.cacheTimeout}
                  onChange={(value) => updateSetting('advanced', 'cacheTimeout', parseInt(value))}
                  description="Wie lange Daten im Cache gespeichert werden"
                  disabled={!settings.advanced.enableCaching}
                />
                
                <SettingToggle
                  label="Kompression aktivieren"
                  value={settings.advanced.enableCompression}
                  onChange={(value) => updateSetting('advanced', 'enableCompression', value)}
                  description="Gzip-Kompression für API-Antworten"
                />
                
                <SettingInput
                  label="CDN URL"
                  value={settings.advanced.cdnUrl}
                  onChange={(value) => updateSetting('advanced', 'cdnUrl', value)}
                  placeholder="https://cdn.eatech.ch"
                  description="CDN-URL für statische Assets"
                />
              </div>
            </div>
            
            <div className={styles.storageSettings}>
              <h3>Speicher & Uploads</h3>
              
              <div className={styles.settingsGrid}>
                <SettingSelect
                  label="Max. Upload-Größe"
                  value={settings.advanced.maxUploadSize}
                  onChange={(value) => updateSetting('advanced', 'maxUploadSize', value)}
                  options={[
                    { value: '5MB', label: '5 MB' },
                    { value: '10MB', label: '10 MB' },
                    { value: '50MB', label: '50 MB' },
                    { value: '100MB', label: '100 MB' }
                  ]}
                  description="Maximale Dateigröße für Uploads"
                />
                
                <SettingTextarea
                  label="Erlaubte Dateitypen"
                  value={settings.advanced.allowedFileTypes.join(', ')}
                  onChange={(value) => updateSetting('advanced', 'allowedFileTypes', value.split(',').map(type => type.trim()))}
                  placeholder="jpg, png, pdf..."
                  description="Komma-getrennte Liste erlaubter Dateierweiterungen"
                  rows={3}
                />
              </div>
            </div>
            
            <div className={styles.backupSettings}>
              <h3>Backup & Wiederherstellung</h3>
              
              <div className={styles.settingsGrid}>
                <SettingToggle
                  label="Automatische Backups"
                  value={settings.advanced.backupEnabled}
                  onChange={(value) => updateSetting('advanced', 'backupEnabled', value)}
                  description="Regelmäßige automatische Backups durchführen"
                />
                
                <SettingSelect
                  label="Backup-Häufigkeit"
                  value={settings.advanced.backupFrequency}
                  onChange={(value) => updateSetting('advanced', 'backupFrequency', value)}
                  options={[
                    { value: 'hourly', label: 'Stündlich' },
                    { value: 'daily', label: 'Täglich' },
                    { value: 'weekly', label: 'Wöchentlich' },
                    { value: 'monthly', label: 'Monatlich' }
                  ]}
                  description="Wie oft automatische Backups erstellt werden"
                  disabled={!settings.advanced.backupEnabled}
                />
                
                <SettingInput
                  label="Backup-Aufbewahrung (Tage)"
                  type="number"
                  value={settings.advanced.backupRetention}
                  onChange={(value) => updateSetting('advanced', 'backupRetention', parseInt(value))}
                  description="Wie lange Backups aufbewahrt werden"
                  disabled={!settings.advanced.backupEnabled}
                />
              </div>
              
              <div className={styles.backupActions}>
                <button className={styles.backupButton}>
                  <Cloud size={18} />
                  Backup jetzt erstellen
                </button>
                <button className={styles.restoreButton}>
                  <RefreshCw size={18} />
                  Backup wiederherstellen
                </button>
              </div>
            </div>
            
            <div className={styles.analyticsSettings}>
              <h3>Analytics & Tracking</h3>
              
              <div className={styles.settingsGrid}>
                <SettingToggle
                  label="Analytics aktivieren"
                  value={settings.advanced.enableAnalytics}
                  onChange={(value) => updateSetting('advanced', 'enableAnalytics', value)}
                  description="Nutzungsstatistiken und Analytics sammeln"
                />
                
                <SettingInput
                  label="Analytics ID"
                  value={settings.advanced.analyticsId}
                  onChange={(value) => updateSetting('advanced', 'analyticsId', value)}
                  placeholder="G-XXXXXXXXXX"
                  description="Google Analytics oder andere Analytics-ID"
                  disabled={!settings.advanced.enableAnalytics}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default GlobalSettings;