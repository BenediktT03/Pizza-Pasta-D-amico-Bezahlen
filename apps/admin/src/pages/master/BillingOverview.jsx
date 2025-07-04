/**
 * EATECH - Billing Overview
 * Version: 5.0.0
 * Description: Zentrale Abrechnungsübersicht für alle Tenants
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/pages/master/BillingOverview.jsx
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  DollarSign, CreditCard, TrendingUp, TrendingDown, Users,
  Calendar, FileText, Download, Filter, Search, ChevronRight,
  AlertCircle, CheckCircle, Clock, RefreshCw, BarChart3,
  PieChart, Package, Zap, Building2, Receipt, ArrowUpRight,
  ArrowDownRight, Info, Mail, Phone, Globe
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as RePieChart, 
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ComposedChart
} from 'recharts';
import { ref, onValue } from 'firebase/database';
import { getDatabaseInstance } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import styles from './BillingOverview.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_COLORS = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  tertiary: '#FFE66D',
  quaternary: '#6C5CE7',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  info: '#3498DB'
};

const BILLING_TABS = [
  { id: 'overview', label: 'Übersicht', icon: BarChart3 },
  { id: 'revenue', label: 'Umsatz', icon: DollarSign },
  { id: 'invoices', label: 'Rechnungen', icon: FileText },
  { id: 'subscriptions', label: 'Abonnements', icon: Package },
  { id: 'payments', label: 'Zahlungen', icon: CreditCard }
];

const INVOICE_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

const PAYMENT_METHODS = {
  stripe: { name: 'Stripe', icon: CreditCard, color: '#635BFF' },
  twint: { name: 'TWINT', icon: Phone, color: '#00C4FF' },
  crypto: { name: 'Crypto', icon: Globe, color: '#F7931A' },
  invoice: { name: 'Rechnung', icon: FileText, color: '#95A5A6' }
};

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

const generateBillingData = () => {
  // Revenue data for last 12 months
  const revenueData = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.toLocaleDateString('de-CH', { month: 'short', year: 'numeric' });
    
    revenueData.push({
      month,
      revenue: Math.floor(Math.random() * 50000) + 100000,
      mrr: Math.floor(Math.random() * 20000) + 40000,
      subscriptions: Math.floor(Math.random() * 50) + 150,
      churn: Math.random() * 5 + 2,
      arpu: Math.floor(Math.random() * 100) + 200
    });
  }
  
  // Plan distribution
  const planDistribution = [
    { name: 'Starter', value: 45, revenue: 4455, color: CHART_COLORS.tertiary },
    { name: 'Professional', value: 35, revenue: 10465, color: CHART_COLORS.secondary },
    { name: 'Enterprise', value: 20, revenue: 24000, color: CHART_COLORS.primary }
  ];
  
  // Payment method distribution
  const paymentMethods = [
    { method: 'Stripe', value: 65, color: '#635BFF' },
    { method: 'TWINT', value: 20, color: '#00C4FF' },
    { method: 'Crypto', value: 10, color: '#F7931A' },
    { method: 'Rechnung', value: 5, color: '#95A5A6' }
  ];
  
  // Generate invoices
  const invoices = [];
  const tenantNames = [
    'Pizza Express Zürich', 'Burger Palace', 'Asian Fusion',
    'Veggie Delights', 'Taco Fiesta', 'Swiss Grill',
    'Döner Dreams', 'Pasta Paradise', 'Healthy Bowls',
    'Curry Express'
  ];
  
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const invoiceDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    let status;
    if (daysAgo > 60) {
      status = INVOICE_STATUS.PAID;
    } else if (daysAgo > 30) {
      status = Math.random() > 0.2 ? INVOICE_STATUS.PAID : INVOICE_STATUS.OVERDUE;
    } else {
      status = Math.random() > 0.7 ? INVOICE_STATUS.PAID : INVOICE_STATUS.PENDING;
    }
    
    invoices.push({
      id: `INV-2025-${String(i + 1).padStart(4, '0')}`,
      tenantId: `tenant-${Math.floor(Math.random() * 10) + 1}`,
      tenantName: tenantNames[Math.floor(Math.random() * tenantNames.length)],
      plan: ['starter', 'professional', 'enterprise'][Math.floor(Math.random() * 3)],
      amount: [99, 299, 599][Math.floor(Math.random() * 3)],
      status,
      invoiceDate: invoiceDate.toISOString(),
      dueDate: dueDate.toISOString(),
      paymentMethod: Object.keys(PAYMENT_METHODS)[Math.floor(Math.random() * 4)]
    });
  }
  
  // Recent transactions
  const transactions = [];
  for (let i = 0; i < 20; i++) {
    const hoursAgo = Math.floor(Math.random() * 72);
    const transactionDate = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    
    transactions.push({
      id: `TXN-${Date.now()}-${i}`,
      tenantName: tenantNames[Math.floor(Math.random() * tenantNames.length)],
      amount: Math.floor(Math.random() * 500) + 50,
      type: Math.random() > 0.8 ? 'refund' : 'payment',
      method: Object.keys(PAYMENT_METHODS)[Math.floor(Math.random() * 4)],
      status: 'completed',
      date: transactionDate.toISOString()
    });
  }
  
  return {
    summary: {
      totalRevenue: 458920,
      mrr: 52340,
      activeSubscriptions: 234,
      churnRate: 3.2,
      arpu: 223.67,
      lifetimeValue: 2684,
      outstandingAmount: 12450,
      overdueInvoices: 5
    },
    revenueData,
    planDistribution,
    paymentMethods,
    invoices,
    transactions,
    growth: {
      revenue: 18.5,
      mrr: 12.3,
      subscriptions: 8.7,
      arpu: 5.2
    }
  };
};

// ============================================================================
// COMPONENTS
// ============================================================================

const MetricCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) => (
  <div className={`${styles.metricCard} ${styles[color]}`}>
    <div className={styles.metricHeader}>
      <Icon size={20} className={styles.metricIcon} />
      <span className={styles.metricTitle}>{title}</span>
    </div>
    <div className={styles.metricValue}>{value}</div>
    {subtitle && <div className={styles.metricSubtitle}>{subtitle}</div>}
    {trend !== undefined && (
      <div className={`${styles.metricTrend} ${trend > 0 ? styles.positive : styles.negative}`}>
        {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        <span>{Math.abs(trend)}%</span>
      </div>
    )}
  </div>
);

const InvoiceRow = ({ invoice, onView, onAction }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case INVOICE_STATUS.PAID: return styles.paid;
      case INVOICE_STATUS.PENDING: return styles.pending;
      case INVOICE_STATUS.OVERDUE: return styles.overdue;
      case INVOICE_STATUS.CANCELLED: return styles.cancelled;
      default: return '';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case INVOICE_STATUS.PAID: return <CheckCircle size={14} />;
      case INVOICE_STATUS.PENDING: return <Clock size={14} />;
      case INVOICE_STATUS.OVERDUE: return <AlertCircle size={14} />;
      default: return null;
    }
  };
  
  const formatStatus = (status) => {
    switch (status) {
      case INVOICE_STATUS.PAID: return 'Bezahlt';
      case INVOICE_STATUS.PENDING: return 'Ausstehend';
      case INVOICE_STATUS.OVERDUE: return 'Überfällig';
      case INVOICE_STATUS.CANCELLED: return 'Storniert';
      default: return status;
    }
  };
  
  return (
    <tr className={styles.invoiceRow} onClick={() => onView(invoice)}>
      <td className={styles.invoiceId}>{invoice.id}</td>
      <td>
        <div className={styles.tenantInfo}>
          <span className={styles.tenantName}>{invoice.tenantName}</span>
          <span className={styles.tenantPlan}>{invoice.plan}</span>
        </div>
      </td>
      <td className={styles.amount}>CHF {invoice.amount.toFixed(2)}</td>
      <td>
        <span className={`${styles.status} ${getStatusColor(invoice.status)}`}>
          {getStatusIcon(invoice.status)}
          {formatStatus(invoice.status)}
        </span>
      </td>
      <td className={styles.date}>
        {new Date(invoice.invoiceDate).toLocaleDateString('de-CH')}
      </td>
      <td className={styles.date}>
        {new Date(invoice.dueDate).toLocaleDateString('de-CH')}
      </td>
      <td className={styles.actions}>
        <button 
          className={styles.actionButton}
          onClick={(e) => {
            e.stopPropagation();
            onAction('download', invoice);
          }}
        >
          <Download size={16} />
        </button>
        <button 
          className={styles.actionButton}
          onClick={(e) => {
            e.stopPropagation();
            onAction('email', invoice);
          }}
        >
          <Mail size={16} />
        </button>
      </td>
    </tr>
  );
};

const TransactionItem = ({ transaction }) => {
  const isRefund = transaction.type === 'refund';
  const PaymentIcon = PAYMENT_METHODS[transaction.method]?.icon || CreditCard;
  
  return (
    <div className={styles.transactionItem}>
      <div className={styles.transactionIcon}>
        <PaymentIcon size={16} />
      </div>
      <div className={styles.transactionInfo}>
        <div className={styles.transactionTenant}>{transaction.tenantName}</div>
        <div className={styles.transactionDate}>
          {new Date(transaction.date).toLocaleString('de-CH')}
        </div>
      </div>
      <div className={`${styles.transactionAmount} ${isRefund ? styles.refund : ''}`}>
        {isRefund ? '-' : '+'}CHF {transaction.amount.toFixed(2)}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BillingOverview = () => {
  const db = getDatabaseInstance();
  
  // State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [billingData, setBillingData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  
  // Load billing data
  useEffect(() => {
    const loadBillingData = async () => {
      setLoading(true);
      try {
        // In production, this would load from Firebase
        const mockData = generateBillingData();
        setBillingData(mockData);
      } catch (error) {
        console.error('Error loading billing data:', error);
        toast.error('Fehler beim Laden der Abrechnungsdaten');
      } finally {
        setLoading(false);
      }
    };
    
    loadBillingData();
  }, [selectedDateRange]);
  
  // Handlers
  const handleInvoiceView = useCallback((invoice) => {
    // Implement invoice view
    toast.success(`Rechnung ${invoice.id} wird angezeigt`);
  }, []);
  
  const handleInvoiceAction = useCallback((action, invoice) => {
    switch (action) {
      case 'download':
        toast.success(`Rechnung ${invoice.id} wird heruntergeladen`);
        break;
      case 'email':
        toast.success(`Rechnung ${invoice.id} wird per E-Mail versendet`);
        break;
      default:
        break;
    }
  }, []);
  
  const handleExport = useCallback(() => {
    toast.success('Abrechnungsdaten werden exportiert...');
  }, []);
  
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Daten aktualisiert');
    }, 1000);
  }, []);
  
  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (!billingData?.invoices) return [];
    
    return billingData.invoices.filter(invoice => {
      const matchesSearch = searchQuery === '' || 
        invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.tenantName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [billingData?.invoices, searchQuery, filterStatus]);
  
  // Calculate statistics
  const invoiceStats = useMemo(() => {
    if (!billingData?.invoices) return null;
    
    const stats = {
      total: billingData.invoices.length,
      paid: billingData.invoices.filter(i => i.status === INVOICE_STATUS.PAID).length,
      pending: billingData.invoices.filter(i => i.status === INVOICE_STATUS.PENDING).length,
      overdue: billingData.invoices.filter(i => i.status === INVOICE_STATUS.OVERDUE).length
    };
    
    return stats;
  }, [billingData?.invoices]);
  
  // Loading state
  if (loading) {
    return (
      <div className={styles.loading}>
        <RefreshCw className={styles.spinner} />
        <span>Abrechnungsdaten werden geladen...</span>
      </div>
    );
  }
  
  // Error state
  if (!billingData) {
    return (
      <div className={styles.error}>
        <AlertCircle size={48} />
        <h2>Fehler beim Laden der Daten</h2>
        <button onClick={() => window.location.reload()}>Neu laden</button>
      </div>
    );
  }
  
  return (
    <div className={styles.billingOverview}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Abrechnungsübersicht</h1>
          <p>Zentrale Verwaltung aller Abrechnungen und Zahlungen</p>
        </div>
        <div className={styles.headerRight}>
          <select 
            value={selectedDateRange} 
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className={styles.dateSelect}
          >
            <option value="7d">Letzte 7 Tage</option>
            <option value="30d">Letzte 30 Tage</option>
            <option value="90d">Letzte 90 Tage</option>
            <option value="1y">Letztes Jahr</option>
          </select>
          <button className={styles.refreshButton} onClick={handleRefresh}>
            <RefreshCw size={18} />
            Aktualisieren
          </button>
          <button className={styles.exportButton} onClick={handleExport}>
            <Download size={18} />
            Export
          </button>
        </div>
      </div>
      
      {/* Summary Metrics */}
      <div className={styles.metricsGrid}>
        <MetricCard
          title="Gesamtumsatz"
          value={`CHF ${(billingData.summary.totalRevenue / 1000).toFixed(1)}k`}
          subtitle="Letzte 30 Tage"
          icon={DollarSign}
          trend={billingData.growth.revenue}
          color="primary"
        />
        <MetricCard
          title="MRR"
          value={`CHF ${(billingData.summary.mrr / 1000).toFixed(1)}k`}
          subtitle="Monatlich wiederkehrend"
          icon={TrendingUp}
          trend={billingData.growth.mrr}
          color="success"
        />
        <MetricCard
          title="Aktive Abos"
          value={billingData.summary.activeSubscriptions}
          subtitle={`+${billingData.growth.subscriptions}% Wachstum`}
          icon={Package}
          trend={billingData.growth.subscriptions}
          color="info"
        />
        <MetricCard
          title="ARPU"
          value={`CHF ${billingData.summary.arpu.toFixed(2)}`}
          subtitle="Durchschnittsumsatz pro Nutzer"
          icon={Users}
          trend={billingData.growth.arpu}
          color="warning"
        />
        <MetricCard
          title="Churn Rate"
          value={`${billingData.summary.churnRate}%`}
          subtitle="Kündigungsrate"
          icon={TrendingDown}
          trend={-12}
          color="danger"
        />
        <MetricCard
          title="LTV"
          value={`CHF ${billingData.summary.lifetimeValue}`}
          subtitle="Customer Lifetime Value"
          icon={Zap}
          trend={8}
          color="purple"
        />
      </div>
      
      {/* Tabs */}
      <div className={styles.tabs}>
        {BILLING_TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Revenue Chart */}
            <div className={styles.chartSection}>
              <h3>Umsatzentwicklung</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={billingData.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis yAxisId="left" stroke="#666" />
                    <YAxis yAxisId="right" orientation="right" stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="revenue" 
                      fill={CHART_COLORS.primary} 
                      name="Umsatz (CHF)"
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="mrr" 
                      stroke={CHART_COLORS.secondary} 
                      name="MRR (CHF)"
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="subscriptions" 
                      stroke={CHART_COLORS.tertiary} 
                      name="Abonnements"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Distribution Charts */}
            <div className={styles.distributionSection}>
              {/* Plan Distribution */}
              <div className={styles.distributionCard}>
                <h3>Umsatz nach Plan</h3>
                <div className={styles.pieChartContainer}>
                  <ResponsiveContainer width="100%" height={200}>
                    <RePieChart>
                      <Pie
                        data={billingData.planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="revenue"
                      >
                        {billingData.planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className={styles.pieChartLegend}>
                    {billingData.planDistribution.map((plan, index) => (
                      <div key={index} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ backgroundColor: plan.color }} />
                        <span className={styles.legendName}>{plan.name}</span>
                        <span className={styles.legendValue}>CHF {plan.revenue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Payment Methods */}
              <div className={styles.distributionCard}>
                <h3>Zahlungsmethoden</h3>
                <div className={styles.paymentMethodsGrid}>
                  {billingData.paymentMethods.map((method, index) => (
                    <div key={index} className={styles.paymentMethod}>
                      <div className={styles.paymentMethodHeader}>
                        <span className={styles.paymentMethodName}>{method.method}</span>
                        <span className={styles.paymentMethodPercent}>{method.value}%</span>
                      </div>
                      <div className={styles.paymentMethodBar}>
                        <div 
                          className={styles.paymentMethodBarFill}
                          style={{ 
                            width: `${method.value}%`,
                            backgroundColor: method.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Recent Transactions */}
            <div className={styles.transactionsSection}>
              <div className={styles.sectionHeader}>
                <h3>Letzte Transaktionen</h3>
                <button className={styles.viewAllButton}>
                  Alle anzeigen
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className={styles.transactionsList}>
                {billingData.transactions.slice(0, 10).map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
              </div>
            </div>
          </>
        )}
        
        {/* Revenue Tab */}
        {activeTab === 'revenue' && (
          <div className={styles.revenueTab}>
            {/* Revenue Metrics */}
            <div className={styles.revenueMetrics}>
              <div className={styles.revenueMetric}>
                <h4>Ausstehende Beträge</h4>
                <div className={styles.revenueMetricValue}>
                  CHF {billingData.summary.outstandingAmount.toLocaleString()}
                </div>
                <div className={styles.revenueMetricSubtext}>
                  {billingData.summary.overdueInvoices} überfällige Rechnungen
                </div>
              </div>
              <div className={styles.revenueMetric}>
                <h4>Durchschnittliche Zahlungsdauer</h4>
                <div className={styles.revenueMetricValue}>12 Tage</div>
                <div className={styles.revenueMetricSubtext}>
                  -3 Tage gegenüber Vormonat
                </div>
              </div>
              <div className={styles.revenueMetric}>
                <h4>Erfolgsquote</h4>
                <div className={styles.revenueMetricValue}>94.5%</div>
                <div className={styles.revenueMetricSubtext}>
                  Erfolgreich eingezogene Zahlungen
                </div>
              </div>
            </div>
            
            {/* ARPU Chart */}
            <div className={styles.chartSection}>
              <h3>ARPU Entwicklung</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={billingData.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="arpu" 
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.primary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        
        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className={styles.invoicesTab}>
            {/* Invoice Stats */}
            {invoiceStats && (
              <div className={styles.invoiceStats}>
                <div className={styles.invoiceStat}>
                  <span className={styles.invoiceStatLabel}>Gesamt</span>
                  <span className={styles.invoiceStatValue}>{invoiceStats.total}</span>
                </div>
                <div className={styles.invoiceStat}>
                  <span className={styles.invoiceStatLabel}>Bezahlt</span>
                  <span className={`${styles.invoiceStatValue} ${styles.paid}`}>
                    {invoiceStats.paid}
                  </span>
                </div>
                <div className={styles.invoiceStat}>
                  <span className={styles.invoiceStatLabel}>Ausstehend</span>
                  <span className={`${styles.invoiceStatValue} ${styles.pending}`}>
                    {invoiceStats.pending}
                  </span>
                </div>
                <div className={styles.invoiceStat}>
                  <span className={styles.invoiceStatLabel}>Überfällig</span>
                  <span className={`${styles.invoiceStatValue} ${styles.overdue}`}>
                    {invoiceStats.overdue}
                  </span>
                </div>
              </div>
            )}
            
            {/* Filters */}
            <div className={styles.invoiceFilters}>
              <div className={styles.searchBar}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Suche nach Rechnungsnummer oder Tenant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className={styles.statusFilter}
              >
                <option value="all">Alle Status</option>
                <option value={INVOICE_STATUS.PAID}>Bezahlt</option>
                <option value={INVOICE_STATUS.PENDING}>Ausstehend</option>
                <option value={INVOICE_STATUS.OVERDUE}>Überfällig</option>
                <option value={INVOICE_STATUS.CANCELLED}>Storniert</option>
              </select>
            </div>
            
            {/* Invoice Table */}
            <div className={styles.invoiceTableWrapper}>
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th>Rechnungsnr.</th>
                    <th>Tenant</th>
                    <th>Betrag</th>
                    <th>Status</th>
                    <th>Rechnungsdatum</th>
                    <th>Fälligkeitsdatum</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(invoice => (
                    <InvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      onView={handleInvoiceView}
                      onAction={handleInvoiceAction}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className={styles.subscriptionsTab}>
            <div className={styles.subscriptionMetrics}>
              <div className={styles.subscriptionMetric}>
                <h4>Neue Abonnements</h4>
                <div className={styles.subscriptionValue}>+23</div>
                <div className={styles.subscriptionPeriod}>Letzte 30 Tage</div>
              </div>
              <div className={styles.subscriptionMetric}>
                <h4>Gekündigte Abonnements</h4>
                <div className={styles.subscriptionValue}>-8</div>
                <div className={styles.subscriptionPeriod}>Letzte 30 Tage</div>
              </div>
              <div className={styles.subscriptionMetric}>
                <h4>Upgrades</h4>
                <div className={styles.subscriptionValue}>12</div>
                <div className={styles.subscriptionPeriod}>Letzte 30 Tage</div>
              </div>
              <div className={styles.subscriptionMetric}>
                <h4>Downgrades</h4>
                <div className={styles.subscriptionValue}>3</div>
                <div className={styles.subscriptionPeriod}>Letzte 30 Tage</div>
              </div>
            </div>
            
            {/* Subscription Growth Chart */}
            <div className={styles.chartSection}>
              <h3>Abonnement-Wachstum</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={billingData.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="subscriptions"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        
        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className={styles.paymentsTab}>
            <div className={styles.paymentOverview}>
              <h3>Zahlungsübersicht</h3>
              <div className={styles.paymentCards}>
                {Object.entries(PAYMENT_METHODS).map(([key, method]) => {
                  const data = billingData.paymentMethods.find(m => m.method === method.name);
                  const Icon = method.icon;
                  
                  return (
                    <div key={key} className={styles.paymentCard}>
                      <div className={styles.paymentCardHeader}>
                        <Icon size={24} style={{ color: method.color }} />
                        <span>{method.name}</span>
                      </div>
                      <div className={styles.paymentCardValue}>
                        {data?.value || 0}%
                      </div>
                      <div className={styles.paymentCardSubtext}>
                        Anteil an Gesamtzahlungen
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Failed Payments */}
            <div className={styles.failedPayments}>
              <h3>Fehlgeschlagene Zahlungen</h3>
              <div className={styles.failedPaymentsList}>
                <div className={styles.failedPaymentItem}>
                  <AlertCircle className={styles.failedIcon} />
                  <div className={styles.failedInfo}>
                    <div className={styles.failedTenant}>Pizza Express Zürich</div>
                    <div className={styles.failedReason}>Karte abgelaufen</div>
                  </div>
                  <div className={styles.failedAmount}>CHF 299.00</div>
                  <button className={styles.retryButton}>Wiederholen</button>
                </div>
                <div className={styles.failedPaymentItem}>
                  <AlertCircle className={styles.failedIcon} />
                  <div className={styles.failedInfo}>
                    <div className={styles.failedTenant}>Burger Palace</div>
                    <div className={styles.failedReason}>Unzureichende Deckung</div>
                  </div>
                  <div className={styles.failedAmount}>CHF 99.00</div>
                  <button className={styles.retryButton}>Wiederholen</button>
                </div>
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

export default BillingOverview;