/**
 * EATECH - Billing System Dashboard
 * Version: 21.0.0
 * Description: Vollständiges Billing & Subscription Management mit Stripe Connect
 * File Path: /apps/admin/src/pages/billing/BillingDashboard.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard, DollarSign, TrendingUp, Download, AlertCircle,
  CheckCircle, XCircle, Clock, RefreshCw, Settings, Plus,
  Calendar, Users, Package, Zap, Shield, ChevronRight,
  ExternalLink, Copy, Check, Info, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// ============================================================================
// MOCK DATA & CONSTANTS
// ============================================================================
const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'price_starter_monthly',
    name: 'Starter',
    price: 99,
    interval: 'month',
    commission: 2.5,
    features: [
      '500 Bestellungen/Monat',
      'Basis-Analytics',
      'Email Support',
      '1 Standort'
    ],
    color: '#FFD93D'
  },
  professional: {
    id: 'price_pro_monthly',
    name: 'Professional',
    price: 299,
    interval: 'month',
    commission: 2.0,
    features: [
      '2000 Bestellungen/Monat',
      'Erweiterte Analytics',
      'Priority Support',
      '3 Standorte',
      'KI-Insights'
    ],
    popular: true,
    color: '#4ECDC4'
  },
  enterprise: {
    id: 'price_enterprise_monthly',
    name: 'Enterprise',
    price: 'custom',
    interval: 'month',
    commission: 1.5,
    features: [
      'Unbegrenzte Bestellungen',
      'Vollständige Analytics',
      'Dedicated Support',
      'Unbegrenzte Standorte',
      'White Label',
      'API Access'
    ],
    color: '#667EEA'
  }
};

const generateMockData = () => {
  // Revenue Data
  const revenueData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - 11 + i);
    return {
      month: month.toLocaleDateString('de-CH', { month: 'short' }),
      mrr: Math.floor(Math.random() * 5000) + 20000,
      transactions: Math.floor(Math.random() * 50000) + 100000,
      subscriptions: Math.floor(Math.random() * 20) + 80
    };
  });

  // Current Subscriptions
  const subscriptions = [
    {
      id: 'sub_1',
      customer: 'Pizza Express Zürich',
      plan: 'professional',
      status: 'active',
      startDate: '2024-01-15',
      nextBilling: '2025-02-15',
      mrr: 299,
      usage: { orders: 1450, limit: 2000 }
    },
    {
      id: 'sub_2',
      customer: 'Burger Truck Basel',
      plan: 'starter',
      status: 'active',
      startDate: '2024-03-22',
      nextBilling: '2025-02-22',
      mrr: 99,
      usage: { orders: 380, limit: 500 }
    },
    {
      id: 'sub_3',
      customer: 'Healthy Bowl Bern',
      plan: 'professional',
      status: 'trialing',
      startDate: '2025-01-01',
      nextBilling: '2025-02-01',
      mrr: 299,
      usage: { orders: 120, limit: 2000 },
      trialEnds: '2025-02-01'
    },
    {
      id: 'sub_4',
      customer: 'Street Food Collective',
      plan: 'enterprise',
      status: 'active',
      startDate: '2023-11-01',
      nextBilling: '2025-02-01',
      mrr: 599,
      usage: { orders: 5420, limit: null }
    },
    {
      id: 'sub_5',
      customer: 'Taco Libre',
      plan: 'starter',
      status: 'past_due',
      startDate: '2024-06-15',
      nextBilling: '2025-01-15',
      mrr: 99,
      usage: { orders: 495, limit: 500 }
    }
  ];

  // Invoices
  const invoices = [
    {
      id: 'inv_1',
      number: 'INV-2025-001',
      customer: 'Pizza Express Zürich',
      amount: 324.50,
      status: 'paid',
      date: '2025-01-15',
      items: [
        { description: 'Professional Plan', amount: 299 },
        { description: 'Transaktionsgebühren (1.275 Bestellungen)', amount: 25.50 }
      ]
    },
    {
      id: 'inv_2',
      number: 'INV-2025-002',
      customer: 'Street Food Collective',
      amount: 680.40,
      status: 'paid',
      date: '2025-01-01',
      items: [
        { description: 'Enterprise Plan', amount: 599 },
        { description: 'Transaktionsgebühren (5.420 Bestellungen)', amount: 81.40 }
      ]
    },
    {
      id: 'inv_3',
      number: 'INV-2025-003',
      customer: 'Taco Libre',
      amount: 111.35,
      status: 'overdue',
      date: '2025-01-15',
      dueDate: '2025-01-25',
      items: [
        { description: 'Starter Plan', amount: 99 },
        { description: 'Transaktionsgebühren (495 Bestellungen)', amount: 12.35 }
      ]
    }
  ];

  // Payouts
  const payouts = [
    {
      id: 'po_1',
      amount: 24580.50,
      status: 'paid',
      date: '2025-01-15',
      bankAccount: '****1234'
    },
    {
      id: 'po_2',
      amount: 26420.80,
      status: 'pending',
      date: '2025-01-22',
      arrivalDate: '2025-01-24',
      bankAccount: '****1234'
    }
  ];

  return {
    revenueData,
    subscriptions,
    invoices,
    payouts,
    metrics: {
      mrr: 25420,
      mrrGrowth: 12.5,
      activeSubscriptions: 92,
      churnRate: 2.3,
      arpu: 276.30,
      ltv: 12054
    }
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatCurrency = (amount, currency = 'CHF') => {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getStatusColor = (status) => {
  const colors = {
    active: '#4ECDC4',
    trialing: '#FFD93D',
    past_due: '#FF6B6B',
    canceled: '#666',
    paid: '#4ECDC4',
    pending: '#FFD93D',
    overdue: '#FF6B6B',
    failed: '#FF6B6B'
  };
  return colors[status] || '#666';
};

const getStatusLabel = (status) => {
  const labels = {
    active: 'Aktiv',
    trialing: 'Testphase',
    past_due: 'Überfällig',
    canceled: 'Gekündigt',
    paid: 'Bezahlt',
    pending: 'Ausstehend',
    overdue: 'Überfällig',
    failed: 'Fehlgeschlagen'
  };
  return labels[status] || status;
};

// ============================================================================
// SUB-KOMPONENTEN
// ============================================================================

// Metric Card
const MetricCard = ({ title, value, change, icon: Icon, format = 'number', subtitle }) => {
  const isPositive = change >= 0;
  const formattedValue = format === 'currency' ? formatCurrency(value) : value;
  
  return (
    <div className="metric-card">
      <div className="metric-header">
        <Icon className="metric-icon" />
        <span className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {Math.abs(change)}%
        </span>
      </div>
      <h3 className="metric-title">{title}</h3>
      <div className="metric-value">{formattedValue}</div>
      {subtitle && <p className="metric-subtitle">{subtitle}</p>}
    </div>
  );
};

// Subscription Row
const SubscriptionRow = ({ subscription, onManage }) => {
  const plan = SUBSCRIPTION_PLANS[subscription.plan];
  const usagePercent = subscription.usage.limit 
    ? (subscription.usage.orders / subscription.usage.limit) * 100 
    : 0;
  
  return (
    <tr className="subscription-row">
      <td>
        <div className="customer-info">
          <span className="customer-name">{subscription.customer}</span>
          <span className="subscription-id">ID: {subscription.id}</span>
        </div>
      </td>
      <td>
        <div className="plan-info">
          <span className="plan-name">{plan.name}</span>
          <span className="plan-price">{formatCurrency(plan.price)}/Monat</span>
        </div>
      </td>
      <td>
        <span className={`status-badge ${subscription.status}`}>
          {getStatusLabel(subscription.status)}
        </span>
        {subscription.trialEnds && (
          <span className="trial-info">
            Endet am {formatDate(subscription.trialEnds)}
          </span>
        )}
      </td>
      <td>
        <div className="usage-info">
          {subscription.usage.limit ? (
            <>
              <div className="usage-bar">
                <div 
                  className="usage-fill"
                  style={{ 
                    width: `${Math.min(usagePercent, 100)}%`,
                    backgroundColor: usagePercent > 90 ? '#FF6B6B' : '#4ECDC4'
                  }}
                />
              </div>
              <span className="usage-text">
                {subscription.usage.orders} / {subscription.usage.limit} Bestellungen
              </span>
            </>
          ) : (
            <span className="usage-text">
              {subscription.usage.orders} Bestellungen (Unbegrenzt)
            </span>
          )}
        </div>
      </td>
      <td>
        <span className="next-billing">
          {formatDate(subscription.nextBilling)}
        </span>
      </td>
      <td>
        <button 
          className="manage-btn"
          onClick={() => onManage(subscription)}
        >
          Verwalten <ChevronRight size={16} />
        </button>
      </td>
    </tr>
  );
};

// Invoice Row
const InvoiceRow = ({ invoice, onView, onDownload }) => {
  return (
    <tr className="invoice-row">
      <td>{invoice.number}</td>
      <td>{invoice.customer}</td>
      <td>{formatCurrency(invoice.amount)}</td>
      <td>
        <span className={`status-badge ${invoice.status}`}>
          {getStatusLabel(invoice.status)}
        </span>
      </td>
      <td>{formatDate(invoice.date)}</td>
      <td>
        <div className="invoice-actions">
          <button className="icon-btn" onClick={() => onView(invoice)}>
            <ExternalLink size={16} />
          </button>
          <button className="icon-btn" onClick={() => onDownload(invoice)}>
            <Download size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Stripe Connect Status
const StripeConnectStatus = ({ connected, onConnect }) => {
  if (connected) {
    return (
      <div className="stripe-status connected">
        <CheckCircle className="status-icon" />
        <div className="status-content">
          <h4>Stripe Connect aktiviert</h4>
          <p>Account ID: acct_1MqV3fQ7tGKljW4X</p>
        </div>
        <button className="settings-btn">
          <Settings size={16} /> Einstellungen
        </button>
      </div>
    );
  }
  
  return (
    <div className="stripe-status disconnected">
      <AlertCircle className="status-icon" />
      <div className="status-content">
        <h4>Stripe Connect einrichten</h4>
        <p>Verbinden Sie Ihr Stripe-Konto, um Zahlungen zu empfangen</p>
      </div>
      <button className="connect-btn" onClick={onConnect}>
        Jetzt verbinden <ExternalLink size={16} />
      </button>
    </div>
  );
};

// Plan Selection Modal
const PlanSelectionModal = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content plan-selection" onClick={e => e.stopPropagation()}>
        <h2>Plan auswählen</h2>
        <div className="plans-grid">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
            <div 
              key={key} 
              className={`plan-card ${plan.popular ? 'popular' : ''}`}
              onClick={() => onSelect(key)}
            >
              {plan.popular && <span className="popular-badge">Beliebt</span>}
              <h3>{plan.name}</h3>
              <div className="plan-price">
                {typeof plan.price === 'number' ? (
                  <>
                    <span className="currency">CHF</span>
                    <span className="amount">{plan.price}</span>
                    <span className="interval">/Monat</span>
                  </>
                ) : (
                  <span className="custom-price">Individuell</span>
                )}
              </div>
              <div className="commission-info">
                + {plan.commission}% Transaktionsgebühr
              </div>
              <ul className="plan-features">
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <Check size={16} /> {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================
const BillingDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stripeConnected, setStripeConnected] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('12months');

  // Load data
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(generateMockData());
      setLoading(false);
    }, 1000);
  }, []);

  // Handlers
  const handleStripeConnect = useCallback(() => {
    console.log('Connecting to Stripe...');
    // Implementierung der Stripe OAuth flow
  }, []);

  const handleManageSubscription = useCallback((subscription) => {
    console.log('Managing subscription:', subscription);
  }, []);

  const handleViewInvoice = useCallback((invoice) => {
    console.log('Viewing invoice:', invoice);
  }, []);

  const handleDownloadInvoice = useCallback((invoice) => {
    console.log('Downloading invoice:', invoice);
  }, []);

  const handleCreateSubscription = useCallback(() => {
    setShowPlanModal(true);
  }, []);

  const handlePlanSelect = useCallback((planKey) => {
    console.log('Selected plan:', planKey);
    setShowPlanModal(false);
    // Implementierung der Subscription-Erstellung
  }, []);

  // Revenue chart data
  const revenueChartData = useMemo(() => {
    if (!data) return [];
    return data.revenueData.map(item => ({
      ...item,
      transactionRevenue: item.transactions * 0.02 // 2% average
    }));
  }, [data]);

  // Plan distribution
  const planDistribution = useMemo(() => {
    if (!data) return [];
    const distribution = data.subscriptions.reduce((acc, sub) => {
      const plan = SUBSCRIPTION_PLANS[sub.plan];
      const existing = acc.find(item => item.name === plan.name);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: plan.name, value: 1, color: plan.color });
      }
      return acc;
    }, []);
    return distribution;
  }, [data]);

  if (loading) {
    return (
      <div className="billing-loading">
        <RefreshCw className="loading-spinner" />
        <p>Lade Billing-Daten...</p>
      </div>
    );
  }

  return (
    <div className="billing-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Billing & Subscriptions</h1>
          <p>Verwalten Sie Ihre Einnahmen und Abonnements</p>
        </div>
        <div className="header-actions">
          <button className="primary-btn" onClick={handleCreateSubscription}>
            <Plus size={16} /> Neues Abonnement
          </button>
        </div>
      </div>

      {/* Stripe Connect Status */}
      <StripeConnectStatus 
        connected={stripeConnected} 
        onConnect={handleStripeConnect}
      />

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Übersicht
        </button>
        <button 
          className={`tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          Abonnements
        </button>
        <button 
          className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          Rechnungen
        </button>
        <button 
          className={`tab ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('payouts')}
        >
          Auszahlungen
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Einstellungen
        </button>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <>
            {/* Metrics */}
            <div className="metrics-grid">
              <MetricCard
                title="Monthly Recurring Revenue"
                value={data.metrics.mrr}
                change={data.metrics.mrrGrowth}
                icon={DollarSign}
                format="currency"
                subtitle="Wiederkehrende Einnahmen"
              />
              <MetricCard
                title="Aktive Abonnements"
                value={data.metrics.activeSubscriptions}
                change={8.3}
                icon={Users}
                subtitle={`${data.metrics.churnRate}% Churn Rate`}
              />
              <MetricCard
                title="ARPU"
                value={data.metrics.arpu}
                change={3.2}
                icon={TrendingUp}
                format="currency"
                subtitle="Average Revenue per User"
              />
              <MetricCard
                title="Customer LTV"
                value={data.metrics.ltv}
                change={15.7}
                icon={Zap}
                format="currency"
                subtitle="Lifetime Value"
              />
            </div>

            {/* Revenue Chart */}
            <div className="chart-section">
              <div className="section-header">
                <h2>Umsatzentwicklung</h2>
                <div className="chart-legend">
                  <span className="legend-item mrr">
                    <span className="legend-dot" />
                    MRR
                  </span>
                  <span className="legend-item transactions">
                    <span className="legend-dot" />
                    Transaktionsgebühren
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#999" />
                  <YAxis stroke="#999" tickFormatter={value => `${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', border: 'none' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stackId="1"
                    stroke="#4ECDC4"
                    fill="#4ECDC4"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="transactionRevenue"
                    stackId="1"
                    stroke="#FFD93D"
                    fill="#FFD93D"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Plan Distribution */}
            <div className="plan-distribution">
              <h3>Verteilung der Abonnements</h3>
              <div className="distribution-content">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="distribution-stats">
                  {planDistribution.map((item, index) => (
                    <div key={index} className="stat-item">
                      <span 
                        className="stat-dot" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="stat-label">{item.name}</span>
                      <span className="stat-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <h3>Letzte Aktivitäten</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <CheckCircle className="activity-icon success" />
                  <div className="activity-content">
                    <p>Neue Subscription: Pizza Express Zürich (Professional)</p>
                    <span className="activity-time">vor 2 Stunden</span>
                  </div>
                  <span className="activity-value">+CHF 299/Mo</span>
                </div>
                <div className="activity-item">
                  <DollarSign className="activity-icon" />
                  <div className="activity-content">
                    <p>Zahlung erhalten von Street Food Collective</p>
                    <span className="activity-time">vor 5 Stunden</span>
                  </div>
                  <span className="activity-value">CHF 680.40</span>
                </div>
                <div className="activity-item">
                  <AlertCircle className="activity-icon warning" />
                  <div className="activity-content">
                    <p>Zahlung fehlgeschlagen: Taco Libre</p>
                    <span className="activity-time">vor 1 Tag</span>
                  </div>
                  <span className="activity-value">CHF 111.35</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'subscriptions' && (
          <div className="subscriptions-section">
            <div className="section-header">
              <h2>Aktive Abonnements ({data.subscriptions.length})</h2>
              <div className="section-actions">
                <button className="filter-btn">
                  Status <ChevronRight size={16} />
                </button>
                <button className="filter-btn">
                  Plan <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            <div className="subscriptions-table">
              <table>
                <thead>
                  <tr>
                    <th>Kunde</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Nutzung</th>
                    <th>Nächste Abrechnung</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscriptions.map(subscription => (
                    <SubscriptionRow
                      key={subscription.id}
                      subscription={subscription}
                      onManage={handleManageSubscription}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="invoices-section">
            <div className="section-header">
              <h2>Rechnungen</h2>
              <div className="section-actions">
                <button className="export-btn">
                  <Download size={16} /> Export CSV
                </button>
              </div>
            </div>
            
            <div className="invoices-table">
              <table>
                <thead>
                  <tr>
                    <th>Rechnungsnr.</th>
                    <th>Kunde</th>
                    <th>Betrag</th>
                    <th>Status</th>
                    <th>Datum</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map(invoice => (
                    <InvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      onView={handleViewInvoice}
                      onDownload={handleDownloadInvoice}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="payouts-section">
            <div className="section-header">
              <h2>Auszahlungen</h2>
              <div className="payout-balance">
                <span className="balance-label">Verfügbares Guthaben</span>
                <span className="balance-amount">{formatCurrency(3420.50)}</span>
              </div>
            </div>
            
            <div className="payouts-list">
              {data.payouts.map(payout => (
                <div key={payout.id} className="payout-card">
                  <div className="payout-header">
                    <span className={`payout-status ${payout.status}`}>
                      {payout.status === 'paid' ? (
                        <><CheckCircle size={16} /> Ausgezahlt</>
                      ) : (
                        <><Clock size={16} /> In Bearbeitung</>
                      )}
                    </span>
                    <span className="payout-amount">{formatCurrency(payout.amount)}</span>
                  </div>
                  <div className="payout-details">
                    <span>Bankkonto: {payout.bankAccount}</span>
                    <span>
                      {payout.status === 'paid' 
                        ? `Ausgezahlt am ${formatDate(payout.date)}`
                        : `Ankunft am ${formatDate(payout.arrivalDate)}`
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="billing-settings">
            <h2>Billing Einstellungen</h2>
            
            <div className="settings-section">
              <h3>Zahlungsmethoden</h3>
              <div className="payment-methods">
                <div className="payment-method">
                  <CreditCard className="method-icon" />
                  <div className="method-info">
                    <h4>Stripe</h4>
                    <p>Kreditkarten, Apple Pay, Google Pay</p>
                  </div>
                  <span className="method-status active">Aktiv</span>
                </div>
                <div className="payment-method">
                  <Shield className="method-icon" />
                  <div className="method-info">
                    <h4>TWINT</h4>
                    <p>Schweizer Mobile Payment</p>
                  </div>
                  <button className="activate-btn">Aktivieren</button>
                </div>
                <div className="payment-method">
                  <Zap className="method-icon" />
                  <div className="method-info">
                    <h4>Crypto Payments</h4>
                    <p>Bitcoin, Ethereum, USDC</p>
                  </div>
                  <button className="activate-btn">Aktivieren</button>
                </div>
              </div>
            </div>
            
            <div className="settings-section">
              <h3>Steuereinstellungen</h3>
              <div className="tax-settings">
                <div className="setting-item">
                  <label>Mehrwertsteuer-ID</label>
                  <input type="text" placeholder="CHE-123.456.789 MWST" />
                </div>
                <div className="setting-item">
                  <label>Standard MwSt.-Satz</label>
                  <select>
                    <option>7.7% (Standard)</option>
                    <option>2.5% (Reduziert)</option>
                    <option>3.7% (Sondersatz)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="settings-section">
              <h3>Webhook Endpoints</h3>
              <div className="webhook-list">
                <div className="webhook-item">
                  <div className="webhook-info">
                    <code>https://api.eatech.ch/webhooks/stripe</code>
                    <span className="webhook-events">payment_intent.succeeded, customer.subscription.*</span>
                  </div>
                  <button className="icon-btn">
                    <Settings size={16} />
                  </button>
                </div>
              </div>
              <button className="add-webhook-btn">
                <Plus size={16} /> Webhook hinzufügen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onSelect={handlePlanSelect}
      />
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = `
  .billing-dashboard {
    min-height: 100vh;
    background: #0A0A0A;
    color: #FFFFFF;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  /* Header */
  .dashboard-header {
    background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%);
    padding: 2rem;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-content h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #4ECDC4 0%, #44A3AA 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-content p {
    color: #999;
    margin: 0;
  }

  .primary-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: #4ECDC4;
    color: #0A0A0A;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .primary-btn:hover {
    background: #44A3AA;
    transform: translateY(-1px);
  }

  /* Stripe Connect Status */
  .stripe-status {
    margin: 2rem;
    padding: 1.5rem;
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stripe-status.connected {
    border-color: #4ECDC4;
  }

  .stripe-status.disconnected {
    border-color: #FFD93D;
  }

  .status-icon {
    width: 24px;
    height: 24px;
  }

  .stripe-status.connected .status-icon {
    color: #4ECDC4;
  }

  .stripe-status.disconnected .status-icon {
    color: #FFD93D;
  }

  .status-content {
    flex: 1;
  }

  .status-content h4 {
    margin: 0 0 0.25rem 0;
  }

  .status-content p {
    margin: 0;
    color: #999;
    font-size: 0.875rem;
  }

  .settings-btn,
  .connect-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #2D2D2D;
    border: 1px solid #333;
    color: #FFF;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .connect-btn {
    background: #4ECDC4;
    color: #0A0A0A;
    border-color: #4ECDC4;
  }

  .settings-btn:hover,
  .connect-btn:hover {
    transform: translateY(-1px);
  }

  /* Tabs */
  .dashboard-tabs {
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
  .dashboard-content {
    padding: 2rem;
  }

  /* Metrics Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .metric-card {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.3s;
  }

  .metric-card:hover {
    border-color: #4ECDC4;
    transform: translateY(-2px);
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .metric-icon {
    color: #4ECDC4;
    width: 24px;
    height: 24px;
  }

  .metric-change {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .metric-change.positive {
    color: #4ECDC4;
  }

  .metric-change.negative {
    color: #FF6B6B;
  }

  .metric-title {
    font-size: 0.875rem;
    color: #999;
    margin: 0 0 0.5rem 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .metric-subtitle {
    font-size: 0.875rem;
    color: #666;
    margin: 0;
  }

  /* Charts */
  .chart-section {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .chart-legend {
    display: flex;
    gap: 1.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #999;
  }

  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .legend-item.mrr .legend-dot {
    background: #4ECDC4;
  }

  .legend-item.transactions .legend-dot {
    background: #FFD93D;
  }

  /* Plan Distribution */
  .plan-distribution {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .plan-distribution h3 {
    margin: 0 0 1.5rem 0;
  }

  .distribution-content {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .distribution-stats {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .stat-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .stat-label {
    flex: 1;
    color: #999;
  }

  .stat-value {
    font-weight: 600;
  }

  /* Recent Activity */
  .recent-activity {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .recent-activity h3 {
    margin: 0 0 1.5rem 0;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #2D2D2D;
    border-radius: 8px;
  }

  .activity-icon {
    width: 20px;
    height: 20px;
  }

  .activity-icon.success {
    color: #4ECDC4;
  }

  .activity-icon.warning {
    color: #FFD93D;
  }

  .activity-content {
    flex: 1;
  }

  .activity-content p {
    margin: 0 0 0.25rem 0;
  }

  .activity-time {
    font-size: 0.75rem;
    color: #666;
  }

  .activity-value {
    font-weight: 600;
  }

  /* Tables */
  .subscriptions-table,
  .invoices-table {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    text-align: left;
    padding: 1rem 1.5rem;
    background: #2D2D2D;
    border-bottom: 1px solid #333;
    color: #999;
    font-weight: 500;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
  }

  td {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #222;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover {
    background: rgba(78, 205, 196, 0.05);
  }

  /* Subscription Row */
  .customer-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .customer-name {
    font-weight: 500;
  }

  .subscription-id {
    font-size: 0.75rem;
    color: #666;
  }

  .plan-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .plan-name {
    font-weight: 500;
  }

  .plan-price {
    font-size: 0.875rem;
    color: #999;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.75rem;
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

  .status-badge.past_due,
  .status-badge.overdue {
    background: rgba(255, 107, 107, 0.2);
    color: #FF6B6B;
  }

  .status-badge.paid {
    background: rgba(78, 205, 196, 0.2);
    color: #4ECDC4;
  }

  .status-badge.pending {
    background: rgba(255, 217, 61, 0.2);
    color: #FFD93D;
  }

  .trial-info {
    display: block;
    font-size: 0.75rem;
    color: #666;
    margin-top: 0.25rem;
  }

  .usage-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .usage-bar {
    width: 120px;
    height: 6px;
    background: #2D2D2D;
    border-radius: 3px;
    overflow: hidden;
  }

  .usage-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .usage-text {
    font-size: 0.75rem;
    color: #999;
  }

  .next-billing {
    color: #999;
  }

  .manage-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    background: #2D2D2D;
    border: 1px solid #333;
    color: #FFF;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .manage-btn:hover {
    background: #333;
    border-color: #4ECDC4;
  }

  /* Invoice Actions */
  .invoice-actions {
    display: flex;
    gap: 0.5rem;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 6px;
    color: #999;
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-btn:hover {
    color: #FFF;
    border-color: #4ECDC4;
  }

  /* Filters */
  .section-actions {
    display: flex;
    gap: 0.5rem;
  }

  .filter-btn,
  .export-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #2D2D2D;
    border: 1px solid #333;
    color: #FFF;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-btn:hover,
  .export-btn:hover {
    border-color: #4ECDC4;
  }

  /* Payouts */
  .payouts-section {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .payout-balance {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .balance-label {
    font-size: 0.875rem;
    color: #999;
  }

  .balance-amount {
    font-size: 1.5rem;
    font-weight: 700;
    color: #4ECDC4;
  }

  .payouts-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .payout-card {
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .payout-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .payout-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .payout-status.paid {
    color: #4ECDC4;
  }

  .payout-status.pending {
    color: #FFD93D;
  }

  .payout-amount {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .payout-details {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    color: #999;
  }

  /* Settings */
  .billing-settings {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2rem;
  }

  .billing-settings h2 {
    margin: 0 0 2rem 0;
  }

  .settings-section {
    margin-bottom: 3rem;
  }

  .settings-section h3 {
    margin: 0 0 1.5rem 0;
    color: #FFF;
  }

  .payment-methods {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .payment-method {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 8px;
  }

  .method-icon {
    width: 24px;
    height: 24px;
    color: #4ECDC4;
  }

  .method-info {
    flex: 1;
  }

  .method-info h4 {
    margin: 0 0 0.25rem 0;
  }

  .method-info p {
    margin: 0;
    font-size: 0.875rem;
    color: #999;
  }

  .method-status {
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .method-status.active {
    background: rgba(78, 205, 196, 0.2);
    color: #4ECDC4;
  }

  .activate-btn {
    padding: 0.5rem 1rem;
    background: #333;
    border: 1px solid #444;
    color: #FFF;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .activate-btn:hover {
    background: #4ECDC4;
    color: #0A0A0A;
    border-color: #4ECDC4;
  }

  /* Tax Settings */
  .tax-settings {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .setting-item label {
    font-size: 0.875rem;
    color: #999;
  }

  .setting-item input,
  .setting-item select {
    padding: 0.75rem;
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 6px;
    color: #FFF;
  }

  .setting-item input:focus,
  .setting-item select:focus {
    outline: none;
    border-color: #4ECDC4;
  }

  /* Webhooks */
  .webhook-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .webhook-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 8px;
  }

  .webhook-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .webhook-info code {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #4ECDC4;
  }

  .webhook-events {
    font-size: 0.75rem;
    color: #666;
  }

  .add-webhook-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #2D2D2D;
    border: 1px solid #333;
    color: #FFF;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-webhook-btn:hover {
    border-color: #4ECDC4;
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
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
  }

  .modal-content h2 {
    margin: 0 0 2rem 0;
    text-align: center;
  }

  .plans-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .plan-card {
    background: #2D2D2D;
    border: 2px solid #333;
    border-radius: 12px;
    padding: 2rem;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;
  }

  .plan-card:hover {
    border-color: #4ECDC4;
    transform: translateY(-4px);
  }

  .plan-card.popular {
    border-color: #4ECDC4;
  }

  .popular-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #4ECDC4;
    color: #0A0A0A;
    padding: 0.25rem 1rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .plan-card h3 {
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .plan-price {
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .currency {
    font-size: 1rem;
    color: #999;
  }

  .amount {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0.25rem;
  }

  .interval {
    font-size: 1rem;
    color: #999;
  }

  .custom-price {
    font-size: 1.5rem;
    color: #999;
  }

  .commission-info {
    text-align: center;
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 1.5rem;
  }

  .plan-features {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .plan-features li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #CCC;
  }

  .plan-features li svg {
    color: #4ECDC4;
    flex-shrink: 0;
  }

  /* Loading */
  .billing-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #0A0A0A;
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
    .dashboard-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .header-actions {
      display: flex;
      justify-content: flex-end;
    }

    .dashboard-tabs {
      padding: 1rem;
      gap: 0.5rem;
    }

    .tab {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .dashboard-content {
      padding: 1rem;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .distribution-content {
      flex-direction: column;
    }

    .plans-grid {
      grid-template-columns: 1fr;
    }

    .tax-settings {
      grid-template-columns: 1fr;
    }

    table {
      font-size: 0.875rem;
    }

    th, td {
      padding: 0.75rem;
    }

    .subscriptions-table,
    .invoices-table {
      overflow-x: auto;
    }
  }
`;

// Styles hinzufügen
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

export default BillingDashboard;