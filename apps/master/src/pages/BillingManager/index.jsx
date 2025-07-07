/**
 * EATECH - Billing Manager
 * Version: 1.0.0
 * Description: Umfassendes Abrechnungssystem für alle Tenants mit
 *              automatisierten Rechnungen und Zahlungsverfolgung
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/pages/BillingManager/index.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { 
  DollarSign, CreditCard, FileText, Calendar,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  Download, Upload, Send, Eye, Edit2,
  Clock, Users, Package, Percent,
  RefreshCw, Filter, Search, Settings,
  BarChart3, PieChart, Activity, Shield,
  Mail, Phone, Globe, MapPin,
  ChevronRight, ChevronDown, MoreVertical,
  Zap, Star, Award, Info, X
} from 'lucide-react';
import styles from './BillingManager.module.css';

// Lazy loaded components
const InvoiceGenerator = lazy(() => import('./components/InvoiceGenerator'));
const PaymentTracker = lazy(() => import('./components/PaymentTracker'));
const SubscriptionManager = lazy(() => import('./components/SubscriptionManager'));
const RevenueChart = lazy(() => import('./components/RevenueChart'));
const BillingAnalytics = lazy(() => import('./components/BillingAnalytics'));
const PaymentMethods = lazy(() => import('./components/PaymentMethods'));
const TaxCalculator = lazy(() => import('./components/TaxCalculator'));
const InvoiceTemplate = lazy(() => import('./components/InvoiceTemplate'));

// Loading component
const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
    <span>Lade Billing Manager...</span>
  </div>
);

// Subscription plans
const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    price: 99,
    features: ['1 Foodtruck', 'Basis-Features', 'Email Support'],
    color: '#6b7280'
  },
  professional: {
    name: 'Professional',
    price: 299,
    features: ['3 Foodtrucks', 'Erweiterte Features', 'Priority Support', 'Analytics'],
    color: '#3b82f6'
  },
  enterprise: {
    name: 'Enterprise',
    price: 799,
    features: ['Unbegrenzte Foodtrucks', 'Alle Features', '24/7 Support', 'Custom Integration'],
    color: '#8b5cf6'
  }
};

// Invoice status
const INVOICE_STATUS = {
  draft: { label: 'Entwurf', color: '#6b7280', icon: FileText },
  sent: { label: 'Versendet', color: '#3b82f6', icon: Send },
  paid: { label: 'Bezahlt', color: '#10b981', icon: CheckCircle },
  overdue: { label: 'Überfällig', color: '#ef4444', icon: AlertCircle },
  cancelled: { label: 'Storniert', color: '#6b7280', icon: X }
};

const BillingManager = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [billingData, setBillingData] = useState({
    summary: {
      totalRevenue: 458760,
      monthlyRecurring: 38450,
      pendingPayments: 12340,
      overdueAmount: 3450,
      activeSubscriptions: 127,
      churnRate: 2.3
    },
    recentInvoices: [],
    subscriptions: [],
    paymentMethods: []
  });
  
  // Load billing data
  useEffect(() => {
    const loadBillingData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate mock data
        const mockInvoices = generateMockInvoices();
        const mockSubscriptions = generateMockSubscriptions();
        
        setBillingData(prev => ({
          ...prev,
          recentInvoices: mockInvoices,
          subscriptions: mockSubscriptions
        }));
        
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadBillingData();
  }, [selectedTimeRange]);
  
  // Generate mock invoices
  const generateMockInvoices = () => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: `INV-2025-${String(i + 1).padStart(4, '0')}`,
      tenant: {
        id: `tenant-${i + 1}`,
        name: `Foodtruck ${i + 1}`,
        email: `contact${i + 1}@foodtruck.ch`
      },
      amount: Math.floor(Math.random() * 500) + 100,
      status: Object.keys(INVOICE_STATUS)[Math.floor(Math.random() * 3)],
      dueDate: new Date(Date.now() + (i - 7) * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { description: 'Monthly Subscription', amount: 299 },
        { description: 'Transaction Fees', amount: Math.floor(Math.random() * 100) + 50 }
      ]
    }));
  };
  
  // Generate mock subscriptions
  const generateMockSubscriptions = () => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: `sub-${i + 1}`,
      tenant: {
        id: `tenant-${i + 1}`,
        name: `Foodtruck ${i + 1}`
      },
      plan: Object.keys(SUBSCRIPTION_PLANS)[Math.floor(Math.random() * 3)],
      status: Math.random() > 0.9 ? 'cancelled' : 'active',
      startDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      nextBilling: new Date(Date.now() + (30 - i) * 24 * 60 * 60 * 1000).toISOString(),
      mrr: SUBSCRIPTION_PLANS[Object.keys(SUBSCRIPTION_PLANS)[Math.floor(Math.random() * 3)]].price
    }));
  };
  
  // Calculate metrics
  const metrics = useMemo(() => {
    const paidInvoices = billingData.recentInvoices.filter(inv => inv.status === 'paid');
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const avgInvoiceValue = paidInvoices.length > 0 ? totalPaid / paidInvoices.length : 0;
    
    return {
      totalPaid,
      avgInvoiceValue,
      collectionRate: paidInvoices.length / billingData.recentInvoices.length * 100
    };
  }, [billingData.recentInvoices]);
  
  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return billingData.recentInvoices.filter(invoice => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return invoice.id.toLowerCase().includes(query) ||
             invoice.tenant.name.toLowerCase().includes(query) ||
             invoice.tenant.email.toLowerCase().includes(query);
    });
  }, [billingData.recentInvoices, searchQuery]);
  
  // Handle actions
  const handleCreateInvoice = useCallback(() => {
    setShowInvoiceModal(true);
  }, []);
  
  const handleSendInvoice = useCallback((invoiceId) => {
    console.log('Sending invoice:', invoiceId);
    // Update invoice status
  }, []);
  
  const handleDownloadInvoice = useCallback((invoiceId) => {
    console.log('Downloading invoice:', invoiceId);
    // Generate PDF
  }, []);
  
  // Render loading
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <h1>Billing Manager</h1>
            <p>Verwaltung von Rechnungen und Abonnements</p>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              className={styles.createButton}
              onClick={handleCreateInvoice}
            >
              <FileText size={20} />
              Neue Rechnung
            </button>
            
            <button className={styles.exportButton}>
              <Download size={20} />
              Export
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${selectedTab === 'overview' ? styles.active : ''}`}
            onClick={() => setSelectedTab('overview')}
          >
            <BarChart3 size={18} />
            Übersicht
          </button>
          <button
            className={`${styles.tab} ${selectedTab === 'invoices' ? styles.active : ''}`}
            onClick={() => setSelectedTab('invoices')}
          >
            <FileText size={18} />
            Rechnungen
          </button>
          <button
            className={`${styles.tab} ${selectedTab === 'subscriptions' ? styles.active : ''}`}
            onClick={() => setSelectedTab('subscriptions')}
          >
            <Package size={18} />
            Abonnements
          </button>
          <button
            className={`${styles.tab} ${selectedTab === 'payments' ? styles.active : ''}`}
            onClick={() => setSelectedTab('payments')}
          >
            <CreditCard size={18} />
            Zahlungen
          </button>
        </div>
      </div>
      
      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <DollarSign size={24} style={{ color: '#10b981' }} />
              </div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Gesamtumsatz</span>
                <span className={styles.summaryValue}>
                  CHF {billingData.summary.totalRevenue.toLocaleString()}
                </span>
                <span className={styles.summaryTrend}>
                  <TrendingUp size={16} />
                  +12.5% vs. Vormonat
                </span>
              </div>
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <Activity size={24} style={{ color: '#3b82f6' }} />
              </div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>MRR</span>
                <span className={styles.summaryValue}>
                  CHF {billingData.summary.monthlyRecurring.toLocaleString()}
                </span>
                <span className={styles.summaryTrend}>
                  <TrendingUp size={16} />
                  +8.3% Wachstum
                </span>
              </div>
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <Clock size={24} style={{ color: '#f59e0b' }} />
              </div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Ausstehend</span>
                <span className={styles.summaryValue}>
                  CHF {billingData.summary.pendingPayments.toLocaleString()}
                </span>
                <span className={styles.summarySubtext}>
                  {filteredInvoices.filter(i => i.status === 'sent').length} Rechnungen
                </span>
              </div>
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <AlertCircle size={24} style={{ color: '#ef4444' }} />
              </div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryLabel}>Überfällig</span>
                <span className={styles.summaryValue}>
                  CHF {billingData.summary.overdueAmount.toLocaleString()}
                </span>
                <span className={styles.summarySubtext}>
                  {filteredInvoices.filter(i => i.status === 'overdue').length} Rechnungen
                </span>
              </div>
            </div>
          </div>
          
          {/* Charts Row */}
          <div className={styles.chartsRow}>
            <div className={styles.revenueChartSection}>
              <Suspense fallback={<LoadingSpinner />}>
                <RevenueChart 
                  data={billingData}
                  timeRange={selectedTimeRange}
                />
              </Suspense>
            </div>
            
            <div className={styles.analyticsSection}>
              <Suspense fallback={<LoadingSpinner />}>
                <BillingAnalytics 
                  subscriptions={billingData.subscriptions}
                  invoices={billingData.recentInvoices}
                />
              </Suspense>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className={styles.recentActivity}>
            <div className={styles.sectionHeader}>
              <h3>Letzte Aktivitäten</h3>
              <button 
                className={styles.viewAllButton}
                onClick={() => setSelectedTab('invoices')}
              >
                Alle anzeigen
                <ChevronRight size={16} />
              </button>
            </div>
            
            <div className={styles.activityList}>
              {filteredInvoices.slice(0, 5).map(invoice => {
                const status = INVOICE_STATUS[invoice.status];
                const StatusIcon = status.icon;
                
                return (
                  <div key={invoice.id} className={styles.activityItem}>
                    <div 
                      className={styles.activityIcon}
                      style={{ backgroundColor: `${status.color}20`, color: status.color }}
                    >
                      <StatusIcon size={20} />
                    </div>
                    
                    <div className={styles.activityContent}>
                      <div className={styles.activityMain}>
                        <h4>{invoice.id}</h4>
                        <p>{invoice.tenant.name}</p>
                      </div>
                      <div className={styles.activityMeta}>
                        <span className={styles.activityAmount}>
                          CHF {invoice.amount.toFixed(2)}
                        </span>
                        <span className={styles.activityDate}>
                          {new Date(invoice.createdAt).toLocaleDateString('de-CH')}
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles.activityActions}>
                      <button 
                        className={styles.actionButton}
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        <Download size={16} />
                      </button>
                      <button className={styles.actionButton}>
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
      
      {/* Invoices Tab */}
      {selectedTab === 'invoices' && (
        <div className={styles.invoicesTab}>
          {/* Search and Filters */}
          <div className={styles.invoiceControls}>
            <div className={styles.searchBar}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Suche nach Rechnung, Tenant oder Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className={styles.filterButtons}>
              <button className={styles.filterButton}>
                <Filter size={18} />
                Filter
              </button>
              <button className={styles.filterButton}>
                <Calendar size={18} />
                Zeitraum
              </button>
            </div>
          </div>
          
          {/* Invoices Table */}
          <div className={styles.tableContainer}>
            <table className={styles.invoiceTable}>
              <thead>
                <tr>
                  <th>Rechnung</th>
                  <th>Tenant</th>
                  <th>Betrag</th>
                  <th>Status</th>
                  <th>Fällig</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(invoice => {
                  const status = INVOICE_STATUS[invoice.status];
                  const StatusIcon = status.icon;
                  const isOverdue = invoice.status === 'sent' && 
                                   new Date(invoice.dueDate) < new Date();
                  
                  return (
                    <tr key={invoice.id}>
                      <td>
                        <div className={styles.invoiceId}>
                          <FileText size={16} />
                          {invoice.id}
                        </div>
                      </td>
                      <td>
                        <div className={styles.tenantInfo}>
                          <strong>{invoice.tenant.name}</strong>
                          <span>{invoice.tenant.email}</span>
                        </div>
                      </td>
                      <td className={styles.amount}>
                        CHF {invoice.amount.toFixed(2)}
                      </td>
                      <td>
                        <span 
                          className={styles.status}
                          style={{ 
                            backgroundColor: `${status.color}20`,
                            color: status.color 
                          }}
                        >
                          <StatusIcon size={14} />
                          {status.label}
                        </span>
                      </td>
                      <td className={isOverdue ? styles.overdue : ''}>
                        {new Date(invoice.dueDate).toLocaleDateString('de-CH')}
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          {invoice.status === 'draft' && (
                            <button 
                              className={styles.sendButton}
                              onClick={() => handleSendInvoice(invoice.id)}
                            >
                              <Send size={16} />
                            </button>
                          )}
                          <button className={styles.viewButton}>
                            <Eye size={16} />
                          </button>
                          <button 
                            className={styles.downloadButton}
                            onClick={() => handleDownloadInvoice(invoice.id)}
                          >
                            <Download size={16} />
                          </button>
                          <button className={styles.moreButton}>
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Subscriptions Tab */}
      {selectedTab === 'subscriptions' && (
        <Suspense fallback={<LoadingSpinner />}>
          <SubscriptionManager 
            subscriptions={billingData.subscriptions}
            plans={SUBSCRIPTION_PLANS}
          />
        </Suspense>
      )}
      
      {/* Payments Tab */}
      {selectedTab === 'payments' && (
        <Suspense fallback={<LoadingSpinner />}>
          <PaymentTracker 
            invoices={billingData.recentInvoices}
            paymentMethods={billingData.paymentMethods}
          />
        </Suspense>
      )}
      
      {/* Invoice Modal */}
      {showInvoiceModal && (
        <Suspense fallback={<LoadingSpinner />}>
          <InvoiceGenerator 
            onClose={() => setShowInvoiceModal(false)}
            onGenerate={(invoiceData) => {
              console.log('Generated invoice:', invoiceData);
              setShowInvoiceModal(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default BillingManager;