/**
 * EATECH - Subscription Manager Component
 * Version: 21.0.0
 * Description: Verwaltung von Abonnements mit Stripe Subscriptions API
 * File Path: /apps/admin/src/pages/billing/components/SubscriptionManager.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Calendar, Users, Package, AlertCircle, 
  CheckCircle, XCircle, Clock, RefreshCw, ChevronRight,
  Plus, Minus, Shield, Zap, Edit, Trash2, PauseCircle,
  PlayCircle, Download, Send, DollarSign
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================
const SUBSCRIPTION_STATUSES = {
  active: { label: 'Aktiv', color: '#4ECDC4', icon: CheckCircle },
  trialing: { label: 'Testphase', color: '#FFD93D', icon: Clock },
  past_due: { label: 'Überfällig', color: '#FF6B6B', icon: AlertCircle },
  canceled: { label: 'Gekündigt', color: '#666', icon: XCircle },
  paused: { label: 'Pausiert', color: '#999', icon: PauseCircle }
};

const USAGE_TYPES = {
  orders: { label: 'Bestellungen', unit: 'Stück' },
  revenue: { label: 'Umsatz', unit: 'CHF' },
  locations: { label: 'Standorte', unit: 'Anzahl' },
  users: { label: 'Benutzer', unit: 'Anzahl' }
};

// ============================================================================
// SUB-KOMPONENTEN
// ============================================================================

// Usage Meter Component
const UsageMeter = ({ usage, limit, type = 'orders' }) => {
  const percentage = limit ? (usage / limit) * 100 : 0;
  const isOverLimit = percentage > 100;
  const isNearLimit = percentage > 80;
  
  const getColor = () => {
    if (isOverLimit) return '#FF6B6B';
    if (isNearLimit) return '#FFD93D';
    return '#4ECDC4';
  };
  
  return (
    <div className="usage-meter">
      <div className="usage-header">
        <span className="usage-label">{USAGE_TYPES[type].label}</span>
        <span className="usage-value">
          {usage.toLocaleString()} {limit ? `/ ${limit.toLocaleString()}` : '∞'} {USAGE_TYPES[type].unit}
        </span>
      </div>
      {limit && (
        <div className="usage-bar">
          <div 
            className="usage-fill"
            style={{ 
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: getColor()
            }}
          />
        </div>
      )}
      {isOverLimit && (
        <div className="usage-warning">
          <AlertCircle size={14} />
          Limit überschritten um {(usage - limit).toLocaleString()} {USAGE_TYPES[type].unit}
        </div>
      )}
    </div>
  );
};

// Addon Toggle Component
const AddonToggle = ({ addon, enabled, onChange }) => {
  return (
    <div className="addon-toggle">
      <div className="addon-info">
        <h4>{addon.name}</h4>
        <p>{addon.description}</p>
        <span className="addon-price">+CHF {addon.price}/Monat</span>
      </div>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(addon.id, e.target.checked)}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );
};

// Billing Cycle Selector
const BillingCycleSelector = ({ current, onChange }) => {
  const cycles = [
    { value: 'monthly', label: 'Monatlich', discount: 0 },
    { value: 'quarterly', label: 'Vierteljährlich', discount: 5 },
    { value: 'yearly', label: 'Jährlich', discount: 15 }
  ];
  
  return (
    <div className="billing-cycle-selector">
      <h3>Abrechnungszeitraum</h3>
      <div className="cycle-options">
        {cycles.map(cycle => (
          <button
            key={cycle.value}
            className={`cycle-option ${current === cycle.value ? 'active' : ''}`}
            onClick={() => onChange(cycle.value)}
          >
            <span className="cycle-label">{cycle.label}</span>
            {cycle.discount > 0 && (
              <span className="cycle-discount">-{cycle.discount}%</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Price Calculator Component
const PriceCalculator = ({ subscription, addons, billingCycle }) => {
  const calculatePrice = () => {
    let basePrice = subscription.plan.price;
    let addonPrice = addons.reduce((sum, addon) => sum + (addon.enabled ? addon.price : 0), 0);
    let subtotal = basePrice + addonPrice;
    
    // Billing cycle discount
    const discounts = { monthly: 0, quarterly: 5, yearly: 15 };
    const discount = discounts[billingCycle] || 0;
    const discountAmount = (subtotal * discount) / 100;
    
    return {
      basePrice,
      addonPrice,
      subtotal,
      discount,
      discountAmount,
      total: subtotal - discountAmount
    };
  };
  
  const pricing = calculatePrice();
  
  return (
    <div className="price-calculator">
      <h3>Preisübersicht</h3>
      <div className="price-breakdown">
        <div className="price-line">
          <span>Grundpreis ({subscription.plan.name})</span>
          <span>CHF {pricing.basePrice.toFixed(2)}</span>
        </div>
        {pricing.addonPrice > 0 && (
          <div className="price-line">
            <span>Add-ons</span>
            <span>CHF {pricing.addonPrice.toFixed(2)}</span>
          </div>
        )}
        <div className="price-line subtotal">
          <span>Zwischensumme</span>
          <span>CHF {pricing.subtotal.toFixed(2)}</span>
        </div>
        {pricing.discount > 0 && (
          <div className="price-line discount">
            <span>Rabatt ({pricing.discount}%)</span>
            <span>-CHF {pricing.discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="price-line total">
          <span>Gesamtpreis</span>
          <span>CHF {pricing.total.toFixed(2)}</span>
        </div>
      </div>
      <div className="price-note">
        <p>+ {subscription.plan.commission}% Transaktionsgebühr</p>
      </div>
    </div>
  );
};

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================
const SubscriptionManager = ({ subscriptionId, onClose }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [addons, setAddons] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Mock data loader
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      // Mock subscription data
      setSubscription({
        id: subscriptionId || 'sub_123',
        customer: {
          name: 'Pizza Express Zürich',
          email: 'info@pizzaexpress.ch',
          phone: '+41 44 123 45 67'
        },
        plan: {
          id: 'professional',
          name: 'Professional',
          price: 299,
          commission: 2.0,
          limits: {
            orders: 2000,
            locations: 3,
            users: 10
          }
        },
        status: 'active',
        currentUsage: {
          orders: 1450,
          revenue: 28500,
          locations: 2,
          users: 7
        },
        startDate: '2024-01-15',
        currentPeriodStart: '2025-01-15',
        currentPeriodEnd: '2025-02-15',
        nextBillingDate: '2025-02-15',
        paymentMethod: {
          type: 'card',
          last4: '4242',
          brand: 'Visa'
        }
      });
      
      // Mock addons
      setAddons([
        { id: 'ai_insights', name: 'KI-Insights', description: 'Erweiterte Analytics mit KI', price: 49, enabled: true },
        { id: 'white_label', name: 'White Label', description: 'Eigenes Branding', price: 99, enabled: false },
        { id: 'priority_support', name: 'Priority Support', description: '24/7 Support mit SLA', price: 79, enabled: false },
        { id: 'api_access', name: 'API Zugang', description: 'Vollständiger API-Zugriff', price: 149, enabled: false }
      ]);
      
      setLoading(false);
    }, 1000);
  }, [subscriptionId]);

  // Handlers
  const handleAddonChange = useCallback((addonId, enabled) => {
    setAddons(prev => prev.map(addon => 
      addon.id === addonId ? { ...addon, enabled } : addon
    ));
  }, []);

  const handlePauseSubscription = useCallback(() => {
    console.log('Pausing subscription...');
    // API call to pause subscription
  }, []);

  const handleResumeSubscription = useCallback(() => {
    console.log('Resuming subscription...');
    // API call to resume subscription
  }, []);

  const handleCancelSubscription = useCallback(() => {
    setShowCancelModal(true);
  }, []);

  const confirmCancellation = useCallback(() => {
    console.log('Canceling subscription...');
    // API call to cancel subscription
    setShowCancelModal(false);
  }, []);

  const handleUpdatePaymentMethod = useCallback(() => {
    console.log('Updating payment method...');
    // Stripe payment method update flow
  }, []);

  const handleDownloadInvoices = useCallback(() => {
    console.log('Downloading invoices...');
    // Generate and download invoice PDF
  }, []);

  if (loading) {
    return (
      <div className="subscription-loading">
        <RefreshCw className="loading-spinner" />
        <p>Lade Abonnement-Details...</p>
      </div>
    );
  }

  const StatusIcon = SUBSCRIPTION_STATUSES[subscription.status].icon;

  return (
    <div className="subscription-manager">
      {/* Header */}
      <div className="manager-header">
        <div className="header-info">
          <h2>{subscription.customer.name}</h2>
          <div className="subscription-meta">
            <span className={`status-badge ${subscription.status}`}>
              <StatusIcon size={14} />
              {SUBSCRIPTION_STATUSES[subscription.status].label}
            </span>
            <span className="plan-badge">{subscription.plan.name} Plan</span>
            <span className="subscription-id">ID: {subscription.id}</span>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <XCircle size={20} />
        </button>
      </div>

      {/* Navigation */}
      <div className="manager-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Übersicht
        </button>
        <button
          className={`tab ${activeTab === 'usage' ? 'active' : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          Nutzung
        </button>
        <button
          className={`tab ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          Abrechnung
        </button>
        <button
          className={`tab ${activeTab === 'addons' ? 'active' : ''}`}
          onClick={() => setActiveTab('addons')}
        >
          Add-ons
        </button>
        <button
          className={`tab ${activeTab === 'actions' ? 'active' : ''}`}
          onClick={() => setActiveTab('actions')}
        >
          Aktionen
        </button>
      </div>

      {/* Content */}
      <div className="manager-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="info-grid">
              <div className="info-card">
                <h3>Kunde</h3>
                <div className="info-details">
                  <p>{subscription.customer.name}</p>
                  <p className="secondary">{subscription.customer.email}</p>
                  <p className="secondary">{subscription.customer.phone}</p>
                </div>
              </div>
              
              <div className="info-card">
                <h3>Abonnement</h3>
                <div className="info-details">
                  <p>{subscription.plan.name} Plan</p>
                  <p className="secondary">CHF {subscription.plan.price}/Monat</p>
                  <p className="secondary">+ {subscription.plan.commission}% Gebühren</p>
                </div>
              </div>
              
              <div className="info-card">
                <h3>Abrechnungszeitraum</h3>
                <div className="info-details">
                  <p>Aktuell: {new Date(subscription.currentPeriodStart).toLocaleDateString('de-CH')} - {new Date(subscription.currentPeriodEnd).toLocaleDateString('de-CH')}</p>
                  <p className="secondary">Nächste Abrechnung: {new Date(subscription.nextBillingDate).toLocaleDateString('de-CH')}</p>
                </div>
              </div>
              
              <div className="info-card">
                <h3>Zahlungsmethode</h3>
                <div className="payment-method">
                  <CreditCard size={20} />
                  <div>
                    <p>{subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}</p>
                    <button className="update-payment-btn" onClick={handleUpdatePaymentMethod}>
                      Ändern
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
              <div className="stat-card">
                <Package size={24} />
                <div className="stat-content">
                  <h4>Bestellungen diese Periode</h4>
                  <p className="stat-value">{subscription.currentUsage.orders.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card">
                <DollarSign size={24} />
                <div className="stat-content">
                  <h4>Umsatz diese Periode</h4>
                  <p className="stat-value">CHF {subscription.currentUsage.revenue.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card">
                <Users size={24} />
                <div className="stat-content">
                  <h4>Aktive Benutzer</h4>
                  <p className="stat-value">{subscription.currentUsage.users}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="usage-section">
            <h3>Aktuelle Nutzung</h3>
            <div className="usage-grid">
              <UsageMeter
                usage={subscription.currentUsage.orders}
                limit={subscription.plan.limits.orders}
                type="orders"
              />
              <UsageMeter
                usage={subscription.currentUsage.locations}
                limit={subscription.plan.limits.locations}
                type="locations"
              />
              <UsageMeter
                usage={subscription.currentUsage.users}
                limit={subscription.plan.limits.users}
                type="users"
              />
            </div>

            <div className="usage-history">
              <h3>Nutzungsverlauf</h3>
              <div className="history-chart">
                {/* Hier würde ein Chart Component eingefügt */}
                <p className="placeholder">Nutzungsdiagramm wird hier angezeigt</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="billing-section">
            <BillingCycleSelector
              current={billingCycle}
              onChange={setBillingCycle}
            />
            
            <PriceCalculator
              subscription={subscription}
              addons={addons}
              billingCycle={billingCycle}
            />

            <div className="billing-actions">
              <button className="secondary-btn" onClick={handleDownloadInvoices}>
                <Download size={16} /> Rechnungen herunterladen
              </button>
              <button className="secondary-btn">
                <Send size={16} /> Rechnung per Email
              </button>
            </div>
          </div>
        )}

        {activeTab === 'addons' && (
          <div className="addons-section">
            <h3>Verfügbare Add-ons</h3>
            <div className="addons-list">
              {addons.map(addon => (
                <AddonToggle
                  key={addon.id}
                  addon={addon}
                  enabled={addon.enabled}
                  onChange={handleAddonChange}
                />
              ))}
            </div>
            <div className="addons-summary">
              <p>Aktive Add-ons: {addons.filter(a => a.enabled).length}</p>
              <p>Zusätzliche Kosten: CHF {addons.reduce((sum, a) => sum + (a.enabled ? a.price : 0), 0)}/Monat</p>
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="actions-section">
            <h3>Abonnement-Aktionen</h3>
            
            <div className="action-cards">
              {subscription.status === 'active' ? (
                <div className="action-card">
                  <PauseCircle size={24} />
                  <h4>Abonnement pausieren</h4>
                  <p>Pausieren Sie das Abonnement vorübergehend</p>
                  <button className="action-btn warning" onClick={handlePauseSubscription}>
                    Pausieren
                  </button>
                </div>
              ) : subscription.status === 'paused' ? (
                <div className="action-card">
                  <PlayCircle size={24} />
                  <h4>Abonnement fortsetzen</h4>
                  <p>Aktivieren Sie das pausierte Abonnement wieder</p>
                  <button className="action-btn success" onClick={handleResumeSubscription}>
                    Fortsetzen
                  </button>
                </div>
              ) : null}

              <div className="action-card">
                <Edit size={24} />
                <h4>Plan ändern</h4>
                <p>Wechseln Sie zu einem anderen Abonnement-Plan</p>
                <button className="action-btn">
                  Plan ändern
                </button>
              </div>

              <div className="action-card danger">
                <XCircle size={24} />
                <h4>Abonnement kündigen</h4>
                <p>Beenden Sie das Abonnement zum Ende der Laufzeit</p>
                <button className="action-btn danger" onClick={handleCancelSubscription}>
                  Kündigen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content cancel-modal" onClick={e => e.stopPropagation()}>
            <h3>Abonnement kündigen?</h3>
            <p>Sind Sie sicher, dass Sie das Abonnement kündigen möchten?</p>
            <div className="cancel-options">
              <label>
                <input type="radio" name="cancelReason" value="too_expensive" />
                Zu teuer
              </label>
              <label>
                <input type="radio" name="cancelReason" value="not_using" />
                Nutze den Service nicht
              </label>
              <label>
                <input type="radio" name="cancelReason" value="missing_features" />
                Fehlende Funktionen
              </label>
              <label>
                <input type="radio" name="cancelReason" value="other" />
                Andere Gründe
              </label>
            </div>
            <textarea
              placeholder="Zusätzliches Feedback (optional)"
              rows={3}
            />
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowCancelModal(false)}>
                Abbrechen
              </button>
              <button className="danger-btn" onClick={confirmCancellation}>
                Abonnement kündigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = `
  .subscription-manager {
    background: #0A0A0A;
    color: #FFF;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  /* Header */
  .manager-header {
    background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%);
    padding: 2rem;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .header-info h2 {
    margin: 0 0 1rem 0;
    font-size: 1.75rem;
  }

  .subscription-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .status-badge.active {
    background: rgba(78, 205, 196, 0.2);
    color: #4ECDC4;
  }

  .status-badge.trialing {
    background: rgba(255, 217, 61, 0.2);
    color: #FFD93D;
  }

  .status-badge.past_due {
    background: rgba(255, 107, 107, 0.2);
    color: #FF6B6B;
  }

  .status-badge.paused {
    background: rgba(153, 153, 153, 0.2);
    color: #999;
  }

  .plan-badge {
    background: #2D2D2D;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.875rem;
  }

  .subscription-id {
    color: #666;
    font-size: 0.875rem;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 0.5rem;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: #FFF;
  }

  /* Tabs */
  .manager-tabs {
    display: flex;
    gap: 1rem;
    padding: 1rem 2rem;
    background: #1A1A1A;
    border-bottom: 1px solid #333;
    overflow-x: auto;
  }

  .tab {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab:hover {
    color: #FFF;
    background: #2D2D2D;
  }

  .tab.active {
    background: #4ECDC4;
    color: #0A0A0A;
  }

  /* Content */
  .manager-content {
    padding: 2rem;
  }

  /* Overview Section */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .info-card {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .info-card h3 {
    margin: 0 0 1rem 0;
    color: #999;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-details p {
    margin: 0 0 0.5rem 0;
  }

  .info-details p.secondary {
    color: #999;
    font-size: 0.875rem;
  }

  .payment-method {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .update-payment-btn {
    background: none;
    border: none;
    color: #4ECDC4;
    cursor: pointer;
    font-size: 0.875rem;
    text-decoration: underline;
  }

  .quick-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .stat-card {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stat-card svg {
    color: #4ECDC4;
  }

  .stat-content h4 {
    margin: 0 0 0.5rem 0;
    color: #999;
    font-size: 0.875rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  /* Usage Section */
  .usage-section h3 {
    margin: 0 0 1.5rem 0;
  }

  .usage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .usage-meter {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .usage-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .usage-label {
    font-weight: 500;
  }

  .usage-value {
    color: #999;
    font-size: 0.875rem;
  }

  .usage-bar {
    height: 8px;
    background: #2D2D2D;
    border-radius: 4px;
    overflow: hidden;
  }

  .usage-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .usage-warning {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    color: #FF6B6B;
    font-size: 0.875rem;
  }

  .usage-history {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .history-chart {
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder {
    color: #666;
  }

  /* Billing Section */
  .billing-cycle-selector {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .billing-cycle-selector h3 {
    margin: 0 0 1rem 0;
  }

  .cycle-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .cycle-option {
    background: #2D2D2D;
    border: 2px solid #333;
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .cycle-option:hover {
    border-color: #4ECDC4;
  }

  .cycle-option.active {
    border-color: #4ECDC4;
    background: rgba(78, 205, 196, 0.1);
  }

  .cycle-label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .cycle-discount {
    color: #4ECDC4;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .price-calculator {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .price-calculator h3 {
    margin: 0 0 1rem 0;
  }

  .price-breakdown {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .price-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #999;
  }

  .price-line.subtotal {
    padding-top: 0.75rem;
    border-top: 1px solid #333;
  }

  .price-line.discount {
    color: #4ECDC4;
  }

  .price-line.total {
    padding-top: 0.75rem;
    border-top: 2px solid #333;
    font-size: 1.25rem;
    font-weight: 600;
    color: #FFF;
  }

  .price-note {
    background: #2D2D2D;
    padding: 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #999;
  }

  .price-note p {
    margin: 0;
  }

  .billing-actions {
    display: flex;
    gap: 1rem;
  }

  /* Addons Section */
  .addons-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .addon-toggle {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .addon-info h4 {
    margin: 0 0 0.25rem 0;
  }

  .addon-info p {
    margin: 0 0 0.5rem 0;
    color: #999;
    font-size: 0.875rem;
  }

  .addon-price {
    color: #4ECDC4;
    font-weight: 600;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #333;
    transition: 0.3s;
    border-radius: 24px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 4px;
    bottom: 4px;
    background-color: #FFF;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background-color: #4ECDC4;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(26px);
  }

  .addons-summary {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
  }

  .addons-summary p {
    margin: 0;
    color: #999;
  }

  /* Actions Section */
  .actions-section h3 {
    margin: 0 0 1.5rem 0;
  }

  .action-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .action-card {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    transition: all 0.3s;
  }

  .action-card:hover {
    border-color: #4ECDC4;
  }

  .action-card.danger:hover {
    border-color: #FF6B6B;
  }

  .action-card svg {
    color: #4ECDC4;
    margin-bottom: 1rem;
  }

  .action-card.danger svg {
    color: #FF6B6B;
  }

  .action-card h4 {
    margin: 0 0 0.5rem 0;
  }

  .action-card p {
    margin: 0 0 1.5rem 0;
    color: #999;
    font-size: 0.875rem;
  }

  .action-btn {
    padding: 0.75rem 2rem;
    background: #4ECDC4;
    color: #0A0A0A;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn:hover {
    transform: translateY(-2px);
  }

  .action-btn.warning {
    background: #FFD93D;
  }

  .action-btn.success {
    background: #4ECDC4;
  }

  .action-btn.danger {
    background: #FF6B6B;
    color: #FFF;
  }

  /* Buttons */
  .secondary-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: #2D2D2D;
    border: 1px solid #333;
    color: #FFF;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .secondary-btn:hover {
    background: #333;
    border-color: #4ECDC4;
  }

  .danger-btn {
    padding: 0.75rem 1.5rem;
    background: #FF6B6B;
    border: none;
    color: #FFF;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .danger-btn:hover {
    background: #E55555;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 16px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
  }

  .cancel-modal h3 {
    margin: 0 0 1rem 0;
  }

  .cancel-modal p {
    margin: 0 0 1.5rem 0;
    color: #999;
  }

  .cancel-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .cancel-options label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .cancel-modal textarea {
    width: 100%;
    padding: 0.75rem;
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 6px;
    color: #FFF;
    resize: vertical;
    margin-bottom: 1.5rem;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  /* Loading */
  .subscription-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: #999;
  }

  .loading-spinner {
    animation: spin 1s linear infinite;
    color: #4ECDC4;
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .manager-header {
      padding: 1rem;
    }

    .manager-tabs {
      padding: 1rem;
      gap: 0.5rem;
    }

    .tab {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .manager-content {
      padding: 1rem;
    }

    .info-grid,
    .quick-stats,
    .usage-grid,
    .action-cards {
      grid-template-columns: 1fr;
    }

    .cycle-options {
      grid-template-columns: 1fr;
    }
  }
`;

// Styles hinzufügen
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

export default SubscriptionManager;