/**
 * EATECH - Payment Settings
 * Version: 3.1.0
 * Description: Zahlungsmethoden-Verwaltung ohne Bargeld mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/Settings/PaymentSettings.jsx
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update, set } from 'firebase/database';
import { 
  CreditCard, Smartphone, FileText, Settings,
  Save, AlertCircle, CheckCircle, Info,
  DollarSign, Percent, Calendar, Shield,
  Zap, Globe, Lock, Clock
} from 'lucide-react';
import styles from './PaymentSettings.module.css';

// Lazy loaded components
const PaymentMethodDetails = lazy(() => import('./components/PaymentMethodDetails'));
const CommissionInfo = lazy(() => import('./components/CommissionInfo'));
const AdditionalSettings = lazy(() => import('./components/AdditionalSettings'));

const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

const PAYMENT_METHODS = {
  stripe: {
    id: 'stripe',
    name: 'Kreditkarte (Stripe)',
    icon: CreditCard,
    color: '#635BFF',
    description: 'Visa, Mastercard, Amex',
    fees: '2.9% + 0.30 CHF',
    settlement: '2-3 Tage'
  },
  twint: {
    id: 'twint',
    name: 'TWINT',
    icon: Smartphone,
    color: '#00D4FF',
    description: 'Schweizer Mobile Payment',
    fees: '1.3%',
    settlement: '1-2 Tage'
  },
  invoice: {
    id: 'invoice',
    name: 'Rechnung',
    icon: FileText,
    color: '#10B981',
    description: 'Auf Rechnung (B2B)',
    fees: '0%',
    settlement: '30 Tage'
  }
};

const PaymentSettings = () => {
  const [settings, setSettings] = useState({
    enabled: {},
    config: {},
    commission: {
      rate: 0.03,
      enabled: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const tenantId = 'demo-restaurant';

  useEffect(() => {
    const settingsRef = ref(database, `tenants/${tenantId}/settings/payment`);
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.val());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId]);

  const handleToggleMethod = useCallback((methodId) => {
    setSettings(prev => ({
      ...prev,
      enabled: {
        ...prev.enabled,
        [methodId]: !prev.enabled[methodId]
      }
    }));
  }, []);

  const handleConfigChange = useCallback((methodId, field, value) => {
    setSettings(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [methodId]: {
          ...prev.config[methodId],
          [field]: value
        }
      }
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    try {
      const settingsRef = ref(database, `tenants/${tenantId}/settings/payment`);
      await update(settingsRef, settings);

      setMessage({
        type: 'success',
        text: 'Zahlungseinstellungen gespeichert'
      });

      if (window.Sentry) {
        window.Sentry.captureMessage('Payment settings updated', 'info');
      }
    } catch (error) {
      console.error('Error saving payment settings:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Speichern'
      });

      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
    } finally {
      setSaving(false);
    }
  }, [tenantId, settings]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Lade Zahlungseinstellungen...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Zahlungsmethoden</h1>
        <p>Konfiguriere die verfügbaren Zahlungsmethoden für deine Kunden</p>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === 'success' ? <CheckCircle /> : <AlertCircle />}
          {message.text}
        </div>
      )}

      <Suspense fallback={<LoadingSpinner />}>
        <CommissionInfo />
      </Suspense>

      <div className={styles.methodsGrid}>
        {Object.values(PAYMENT_METHODS).map(method => (
          <div 
            key={method.id} 
            className={`${styles.methodCard} ${settings.enabled[method.id] ? styles.enabled : ''}`}
          >
            <div className={styles.methodHeader}>
              <div className={styles.methodInfo}>
                <div 
                  className={styles.methodIcon}
                  style={{ backgroundColor: `${method.color}20`, color: method.color }}
                >
                  <method.icon size={24} />
                </div>
                <div>
                  <h3>{method.name}</h3>
                  <p>{method.description}</p>
                </div>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings.enabled[method.id] || false}
                  onChange={() => handleToggleMethod(method.id)}
                />
                <span className={styles.slider} />
              </label>
            </div>

            {settings.enabled[method.id] && (
              <Suspense fallback={<LoadingSpinner />}>
                <PaymentMethodDetails
                  method={method}
                  config={settings.config[method.id] || {}}
                  onChange={(field, value) => handleConfigChange(method.id, field, value)}
                />
              </Suspense>
            )}
          </div>
        ))}
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <AdditionalSettings 
          settings={settings}
          onChange={setSettings}
        />
      </Suspense>

      <div className={styles.actions}>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className={styles.buttonSpinner} />
              Speichern...
            </>
          ) : (
            <>
              <Save size={20} />
              Einstellungen speichern
            </>
          )}
        </button>
      </div>

      <div className={styles.securityNote}>
        <Shield size={20} />
        <p>
          Alle Zahlungen werden sicher über verschlüsselte Verbindungen abgewickelt. 
          EATECH speichert keine Kreditkartendaten.
        </p>
      </div>
    </div>
  );
};

// Fallback Component Exports for lazy loading
export const CommissionInfoComponent = () => (
  <div className={styles.commissionInfo}>
    <div className={styles.commissionIcon}>
      <Percent size={24} />
    </div>
    <div className={styles.commissionContent}>
      <h3>EATECH Kommission</h3>
      <p>3% pro Transaktion für die Nutzung der EATECH Plattform</p>
    </div>
    <div className={styles.commissionRate}>
      <span className={styles.rateValue}>3%</span>
      <span className={styles.rateLabel}>pro Transaktion</span>
    </div>
  </div>
);

export const PaymentMethodDetailsComponent = ({ method, config, onChange }) => (
  <div className={styles.methodConfig}>
    <div className={styles.configInfo}>
      <div className={styles.infoRow}>
        <DollarSign size={16} />
        <span>Gebühren: {method.fees}</span>
      </div>
      <div className={styles.infoRow}>
        <Clock size={16} />
        <span>Auszahlung: {method.settlement}</span>
      </div>
    </div>

    {method.id === 'stripe' && (
      <div className={styles.configFields}>
        <input
          type="text"
          placeholder="Stripe Publishable Key"
          value={config.publishableKey || ''}
          onChange={(e) => onChange('publishableKey', e.target.value)}
          className={styles.input}
        />
        <input
          type="password"
          placeholder="Stripe Secret Key"
          value={config.secretKey || ''}
          onChange={(e) => onChange('secretKey', e.target.value)}
          className={styles.input}
        />
      </div>
    )}

    {method.id === 'twint' && (
      <div className={styles.configFields}>
        <input
          type="text"
          placeholder="TWINT Merchant ID"
          value={config.merchantId || ''}
          onChange={(e) => onChange('merchantId', e.target.value)}
          className={styles.input}
        />
        <input
          type="password"
          placeholder="TWINT API Key"
          value={config.apiKey || ''}
          onChange={(e) => onChange('apiKey', e.target.value)}
          className={styles.input}
        />
      </div>
    )}

    {method.id === 'invoice' && (
      <div className={styles.configFields}>
        <input
          type="number"
          placeholder="Zahlungsziel (Tage)"
          value={config.paymentTerms || 30}
          onChange={(e) => onChange('paymentTerms', parseInt(e.target.value))}
          className={styles.input}
          min="1"
          max="90"
        />
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={config.requireApproval || false}
            onChange={(e) => onChange('requireApproval', e.target.checked)}
          />
          <span>Manuelle Genehmigung erforderlich</span>
        </label>
      </div>
    )}
  </div>
);

export const AdditionalSettingsComponent = ({ settings, onChange }) => (
  <div className={styles.additionalSettings}>
    <h2>Weitere Einstellungen</h2>
    
    <div className={styles.settingGroup}>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={settings.requirePhone || false}
          onChange={(e) => onChange(prev => ({ ...prev, requirePhone: e.target.checked }))}
        />
        <span>Telefonnummer bei Bestellung erforderlich</span>
      </label>
    </div>

    <div className={styles.settingGroup}>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={settings.savePaymentMethods || false}
          onChange={(e) => onChange(prev => ({ ...prev, savePaymentMethods: e.target.checked }))}
        />
        <span>Kunden können Zahlungsmethoden speichern</span>
      </label>
    </div>

    <div className={styles.settingGroup}>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={settings.sendReceipts || true}
          onChange={(e) => onChange(prev => ({ ...prev, sendReceipts: e.target.checked }))}
        />
        <span>Automatisch Quittungen per E-Mail senden</span>
      </label>
    </div>
  </div>
);

export default PaymentSettings;