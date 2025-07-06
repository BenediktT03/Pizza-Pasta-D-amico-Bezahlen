/**
 * EATECH - Billing Dashboard
 * Version: 2.0.0
 * Description: Rechnungsübersicht mit Commission Tracking und Lazy Loading
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /apps/admin/src/pages/billing/BillingDashboard.jsx
 * 
 * New: Commission tracking and analytics with lazy loading
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, startAt, endAt } from 'firebase/database';
import { 
  DollarSign, TrendingUp, Receipt, Calendar,
  Download, Filter, ChevronRight, Percent,
  CreditCard, FileText, Clock, AlertCircle,
  CheckCircle, BarChart3, PieChart, Activity
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import styles from './BillingDashboard.module.css';

// Lazy loaded components
const CommissionChart = lazy(() => import('./components/CommissionChart'));
const TransactionTable = lazy(() => import('./components/TransactionTable'));
const InvoiceGenerator = lazy(() => import('./components/InvoiceGenerator'));
const ExportDialog = lazy(() => import('./components/ExportDialog'));

// Lazy loaded services
const CommissionService = lazy(() => import('@eatech/core/services/CommissionService'));

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

const BillingDashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [commissionData, setCommissionData] = useState({
    currentMonth: 0,
    lastMonth: 0,
    total: 0,
    pending: 0,
    paid: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [showDetails, setShowDetails] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [chartView, setChartView] = useState('daily');
  const tenantId = 'demo-restaurant';

  useEffect(() => {
    const loadBillingData = async () => {
      const now = new Date();
      const startDate = selectedPeriod === 'current' 
        ? startOfMonth(now) 
        : startOfMonth(subMonths(now, 1));
      const endDate = selectedPeriod === 'current'
        ? endOfMonth(now)
        : endOfMonth(subMonths(now, 1));

      const ordersRef = query(
        ref(database, `tenants/${tenantId}/orders`),
        orderByChild('createdAt'),
        startAt(startDate.getTime()),
        endAt(endDate.getTime())
      );

      const unsubscribe = onValue(ordersRef, (snapshot) => {
        if (snapshot.exists()) {
          const orders = [];
          let totalCommission = 0;
          let pendingCommission = 0;
          let paidCommission = 0;

          snapshot.forEach((child) => {
            const order = child.val();
            if (order.status === 'completed' || order.status === 'delivered') {
              const commission = order.total * 0.03;
              const transaction = {
                id: child.key,
                orderId: child.key,
                date: order.createdAt,
                orderAmount: order.total,
                commission: commission,
                status: order.commissionPaid ? 'paid' : 'pending',
                paymentMethod: order.paymentMethod,
                customerName: order.customer?.name || 'Anonym',
                items: order.items?.length || 0
              };
              
              orders.push(transaction);
              totalCommission += commission;
              
              if (order.commissionPaid) {
                paidCommission += commission;
              } else {
                pendingCommission += commission;
              }
            }
          });

          setTransactions(orders.sort((a, b) => b.date - a.date));
          setCommissionData(prev => ({
            ...prev,
            [selectedPeriod === 'current' ? 'currentMonth' : 'lastMonth']: totalCommission,
            pending: pendingCommission,
            paid: paidCommission,
            total: prev.total + totalCommission
          }));
        }
        setLoading(false);
      });

      return () => unsubscribe();
    };

    loadBillingData();
  }, [tenantId, selectedPeriod]);

  const handleExportCSV = useCallback(async () => {
    const csv = [
      ['Datum', 'Bestell-ID', 'Kunde', 'Bestellwert', 'Kommission (3%)', 'Status', 'Zahlungsmethode'],
      ...transactions.map(t => [
        format(new Date(t.date), 'dd.MM.yyyy HH:mm'),
        t.orderId,
        t.customerName,
        `CHF ${t.orderAmount.toFixed(2)}`,
        `CHF ${t.commission.toFixed(2)}`,
        t.status === 'paid' ? 'Bezahlt' : 'Ausstehend',
        t.paymentMethod
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eatech-kommissionen-${format(new Date(), 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    if (window.Sentry) {
      window.Sentry.captureMessage('Commission report exported', 'info');
    }
  }, [transactions]);

  const handleGenerateInvoice = useCallback(async () => {
    setShowInvoiceGenerator(true);
  }, []);

  const stats = useMemo(() => {
    const avgOrderValue = transactions.length > 0
      ? transactions.reduce((sum, t) => sum + t.orderAmount, 0) / transactions.length
      : 0;
    
    const avgCommission = avgOrderValue * 0.03;
    
    const growth = commissionData.lastMonth > 0
      ? ((commissionData.currentMonth - commissionData.lastMonth) / commissionData.lastMonth) * 100
      : 0;

    const dailyAverage = commissionData.currentMonth / new Date().getDate();
    const projectedMonthly = dailyAverage * 30;

    return {
      avgOrderValue,
      avgCommission,
      growth,
      transactionCount: transactions.length,
      dailyAverage,
      projectedMonthly
    };
  }, [transactions, commissionData]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Lade Abrechnungsdaten...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Abrechnung & Kommissionen</h1>
          <p>Übersicht über EATECH Gebühren (3% pro Transaktion)</p>
        </div>
        <div className={styles.headerActions}>
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={styles.periodSelect}
          >
            <option value="current">Aktueller Monat</option>
            <option value="last">Letzter Monat</option>
          </select>
          <button onClick={handleGenerateInvoice} className={styles.invoiceButton}>
            <FileText size={20} />
            Rechnung erstellen
          </button>
          <button onClick={() => setShowExport(true)} className={styles.exportButton}>
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#FF6B6B20', color: '#FF6B6B' }}>
            <Percent size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>Kommission {selectedPeriod === 'current' ? 'Aktuell' : 'Letzter Monat'}</h3>
            <div className={styles.statValue}>
              CHF {commissionData[selectedPeriod === 'current' ? 'currentMonth' : 'lastMonth'].toFixed(2)}
            </div>
            {selectedPeriod === 'current' && stats.growth !== 0 && (
              <div className={`${styles.statChange} ${stats.growth > 0 ? styles.positive : styles.negative}`}>
                <TrendingUp size={16} />
                {stats.growth > 0 ? '+' : ''}{stats.growth.toFixed(1)}% vs. letzter Monat
              </div>
            )}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#4ECDC420', color: '#4ECDC4' }}>
            <Clock size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>Ausstehend</h3>
            <div className={styles.statValue}>
              CHF {commissionData.pending.toFixed(2)}
            </div>
            <div className={styles.statSubtext}>
              Nächste Abrechnung in {new Date().getDate() > 25 ? '5' : 30 - new Date().getDate()} Tagen
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#00E67620', color: '#00E676' }}>
            <CheckCircle size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>Bezahlt</h3>
            <div className={styles.statValue}>
              CHF {commissionData.paid.toFixed(2)}
            </div>
            <div className={styles.statSubtext}>
              Gesamt seit Start
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#FFE66D20', color: '#FFB347' }}>
            <Activity size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>Ø Bestellwert</h3>
            <div className={styles.statValue}>
              CHF {stats.avgOrderValue.toFixed(2)}
            </div>
            <div className={styles.statSubtext}>
              Ø Kommission: CHF {stats.avgCommission.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h2>Kommissions-Verlauf</h2>
          <div className={styles.chartControls}>
            <button
              className={chartView === 'daily' ? styles.active : ''}
              onClick={() => setChartView('daily')}
            >
              Täglich
            </button>
            <button
              className={chartView === 'weekly' ? styles.active : ''}
              onClick={() => setChartView('weekly')}
            >
              Wöchentlich
            </button>
            <button
              className={chartView === 'monthly' ? styles.active : ''}
              onClick={() => setChartView('monthly')}
            >
              Monatlich
            </button>
          </div>
        </div>
        <Suspense fallback={<LoadingSpinner />}>
          <CommissionChart
            data={transactions}
            view={chartView}
            period={selectedPeriod}
          />
        </Suspense>
      </div>

      <div className={styles.commissionBreakdown}>
        <h2>Kommissions-Details</h2>
        <div className={styles.breakdownInfo}>
          <div className={styles.infoCard}>
            <h3>So funktioniert's</h3>
            <ul>
              <li>3% Kommission auf jede erfolgreiche Bestellung</li>
              <li>Automatische monatliche Abrechnung</li>
              <li>Transparente Aufstellung aller Transaktionen</li>
              <li>Keine versteckten Gebühren</li>
            </ul>
          </div>
          <div className={styles.infoCard}>
            <h3>Zahlungszyklus</h3>
            <ul>
              <li>Abrechnungszeitraum: 1. - letzter Tag des Monats</li>
              <li>Rechnungsstellung: 1. des Folgemonats</li>
              <li>Zahlungsziel: 30 Tage</li>
              <li>Automatischer Einzug möglich</li>
            </ul>
          </div>
          <div className={styles.infoCard}>
            <h3>Prognose</h3>
            <ul>
              <li>Ø täglich: CHF {stats.dailyAverage.toFixed(2)}</li>
              <li>Hochrechnung Monat: CHF {stats.projectedMonthly.toFixed(2)}</li>
              <li>Bestellungen: {stats.transactionCount}</li>
              <li>Erfolgsrate: 98.5%</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.transactionsSection}>
        <div className={styles.sectionHeader}>
          <h2>Transaktionen</h2>
          <button 
            className={styles.toggleButton}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Weniger anzeigen' : 'Alle anzeigen'}
            <ChevronRight className={showDetails ? styles.rotated : ''} />
          </button>
        </div>

        <Suspense fallback={<LoadingSpinner />}>
          <TransactionTable
            transactions={showDetails ? transactions : transactions.slice(0, 5)}
            showPagination={showDetails}
          />
        </Suspense>
        
        {!showDetails && transactions.length > 5 && (
          <div className={styles.moreTransactions}>
            <p>+{transactions.length - 5} weitere Transaktionen</p>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerInfo}>
          <AlertCircle size={20} />
          <p>
            Die Kommissionen werden automatisch von deinen Einnahmen abgezogen. 
            Bei Fragen wende dich an <a href="mailto:billing@eatech.ch">billing@eatech.ch</a>
          </p>
        </div>
      </div>

      {/* Modals */}
      {showExport && (
        <Suspense fallback={<LoadingSpinner />}>
          <ExportDialog
            transactions={transactions}
            commissionData={commissionData}
            onClose={() => setShowExport(false)}
            onExport={handleExportCSV}
          />
        </Suspense>
      )}

      {showInvoiceGenerator && (
        <Suspense fallback={<LoadingSpinner />}>
          <InvoiceGenerator
            tenantId={tenantId}
            period={selectedPeriod}
            commissionData={commissionData}
            onClose={() => setShowInvoiceGenerator(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

// Fallback components for lazy loading
export const TransactionTableComponent = ({ transactions, showPagination }) => (
  <div className={styles.transactionsTable}>
    <div className={styles.tableHeader}>
      <div>Datum</div>
      <div>Bestell-ID</div>
      <div>Kunde</div>
      <div>Bestellwert</div>
      <div>Kommission</div>
      <div>Status</div>
    </div>
    
    {transactions.map(transaction => (
      <div key={transaction.id} className={styles.tableRow}>
        <div>{format(new Date(transaction.date), 'dd.MM.yyyy HH:mm')}</div>
        <div className={styles.orderId}>#{transaction.orderId.slice(-8)}</div>
        <div className={styles.customerName}>{transaction.customerName}</div>
        <div>CHF {transaction.orderAmount.toFixed(2)}</div>
        <div className={styles.commission}>CHF {transaction.commission.toFixed(2)}</div>
        <div>
          <span className={`${styles.status} ${styles[transaction.status]}`}>
            {transaction.status === 'paid' ? (
              <>
                <CheckCircle size={16} />
                Bezahlt
              </>
            ) : (
              <>
                <Clock size={16} />
                Ausstehend
              </>
            )}
          </span>
        </div>
      </div>
    ))}
  </div>
);

export default BillingDashboard;