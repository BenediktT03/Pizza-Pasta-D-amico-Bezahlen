/**
 * EATECH - Commission Service
 * Version: 1.0.0
 * Description: Service für Kommissions-Berechnung und -Verwaltung mit Lazy Loading
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /packages/core/src/services/CommissionService.js
 */

import { getDatabase, ref, push, update, get, query, orderByChild, startAt, endAt, serverTimestamp } from 'firebase/database';
import { startOfMonth, endOfMonth, format } from 'date-fns';

class CommissionService {
  constructor() {
    this.db = getDatabase();
    this.commissionRate = 0.03; // 3%
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // ========== COMMISSION CALCULATION ==========
  async calculateCommission(order) {
    const commission = {
      orderId: order.id,
      tenantId: order.tenantId,
      orderAmount: order.total,
      commissionRate: this.commissionRate,
      commissionAmount: order.total * this.commissionRate,
      currency: 'CHF',
      status: 'pending',
      createdAt: Date.now(),
      paymentMethod: order.paymentMethod,
      metadata: {
        customerName: order.customer?.name,
        itemCount: order.items?.length || 0,
        orderNumber: order.orderNumber
      }
    };

    if (order.status === 'refunded' || order.status === 'cancelled') {
      commission.status = 'cancelled';
      commission.commissionAmount = 0;
    }

    return commission;
  }

  // ========== RECORDING & TRACKING ==========
  async recordCommission(order) {
    try {
      const commission = await this.calculateCommission(order);
      
      const commissionRef = await push(
        ref(this.db, `commissions/${order.tenantId}`),
        commission
      );

      await update(ref(this.db, `orders/${order.id}`), {
        commissionId: commissionRef.key,
        commissionAmount: commission.commissionAmount,
        commissionStatus: commission.status,
        commissionRecordedAt: serverTimestamp()
      });

      // Clear cache
      this.clearCacheForTenant(order.tenantId);

      if (window.Sentry) {
        window.Sentry.addBreadcrumb({
          category: 'commission',
          message: 'Commission recorded',
          level: 'info',
          data: { orderId: order.id, amount: commission.commissionAmount }
        });
      }

      return commissionRef.key;
    } catch (error) {
      console.error('Error recording commission:', error);
      
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
      
      throw error;
    }
  }

  // ========== MONTHLY CALCULATIONS ==========
  async getMonthlyCommission(tenantId, year, month) {
    const cacheKey = `monthly_${tenantId}_${year}_${month}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      const commissionsRef = query(
        ref(this.db, `commissions/${tenantId}`),
        orderByChild('createdAt'),
        startAt(startDate.getTime()),
        endAt(endDate.getTime())
      );

      const snapshot = await get(commissionsRef);
      
      if (!snapshot.exists()) {
        return this.setToCache(cacheKey, {
          total: 0,
          pending: 0,
          paid: 0,
          cancelled: 0,
          transactions: [],
          breakdown: {
            card: { count: 0, amount: 0 },
            twint: { count: 0, amount: 0 },
            invoice: { count: 0, amount: 0 }
          }
        });
      }

      let total = 0;
      let pending = 0;
      let paid = 0;
      let cancelled = 0;
      const transactions = [];
      const breakdown = {
        card: { count: 0, amount: 0 },
        twint: { count: 0, amount: 0 },
        invoice: { count: 0, amount: 0 }
      };

      snapshot.forEach((child) => {
        const commission = child.val();
        transactions.push({ id: child.key, ...commission });
        
        // Update totals by status
        switch (commission.status) {
          case 'pending':
            pending += commission.commissionAmount;
            total += commission.commissionAmount;
            break;
          case 'paid':
            paid += commission.commissionAmount;
            total += commission.commissionAmount;
            break;
          case 'cancelled':
            cancelled += commission.commissionAmount;
            break;
        }

        // Update breakdown by payment method
        if (commission.paymentMethod && breakdown[commission.paymentMethod]) {
          breakdown[commission.paymentMethod].count++;
          breakdown[commission.paymentMethod].amount += commission.commissionAmount;
        }
      });

      const result = {
        total,
        pending,
        paid,
        cancelled,
        transactions: transactions.sort((a, b) => b.createdAt - a.createdAt),
        breakdown,
        period: {
          year,
          month,
          monthName: format(startDate, 'MMMM yyyy')
        }
      };

      return this.setToCache(cacheKey, result);
    } catch (error) {
      console.error('Error getting monthly commission:', error);
      
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
      
      throw error;
    }
  }

  // ========== INVOICE GENERATION ==========
  async generateMonthlyInvoice(tenantId, year, month) {
    try {
      const monthlyData = await this.getMonthlyCommission(tenantId, year, month);
      
      if (monthlyData.pending === 0) {
        return null;
      }

      const tenantRef = await get(ref(this.db, `tenants/${tenantId}`));
      const tenant = tenantRef.val();

      const invoice = {
        tenantId,
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        tenantAddress: tenant.address,
        period: format(new Date(year, month - 1), 'MMMM yyyy'),
        periodStart: startOfMonth(new Date(year, month - 1)).getTime(),
        periodEnd: endOfMonth(new Date(year, month - 1)).getTime(),
        totalOrders: monthlyData.transactions.filter(t => t.status !== 'cancelled').length,
        totalRevenue: monthlyData.transactions.reduce((sum, t) => sum + t.orderAmount, 0),
        commissionRate: this.commissionRate,
        commissionAmount: monthlyData.pending,
        breakdown: monthlyData.breakdown,
        currency: 'CHF',
        status: 'pending',
        invoiceNumber: await this.generateInvoiceNumber(year, month),
        dueDate: this.calculateDueDate(30),
        createdAt: Date.now()
      };

      const invoiceRef = await push(ref(this.db, `invoices/${tenantId}`), invoice);

      // Update all pending commissions with invoice ID
      await Promise.all(
        monthlyData.transactions
          .filter(t => t.status === 'pending')
          .map(t => update(ref(this.db, `commissions/${tenantId}/${t.id}`), {
            invoiceId: invoiceRef.key,
            status: 'invoiced',
            invoicedAt: serverTimestamp()
          }))
      );

      // Clear cache
      this.clearCacheForTenant(tenantId);

      return { id: invoiceRef.key, ...invoice };
    } catch (error) {
      console.error('Error generating monthly invoice:', error);
      
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
      
      throw error;
    }
  }

  // ========== PAYMENT PROCESSING ==========
  async markInvoiceAsPaid(tenantId, invoiceId, paymentDetails) {
    try {
      await update(ref(this.db, `invoices/${tenantId}/${invoiceId}`), {
        status: 'paid',
        paidAt: Date.now(),
        paymentMethod: paymentDetails.method,
        transactionId: paymentDetails.transactionId,
        paymentReference: paymentDetails.reference
      });

      // Update all related commissions
      const commissionsRef = query(
        ref(this.db, `commissions/${tenantId}`),
        orderByChild('invoiceId'),
        startAt(invoiceId),
        endAt(invoiceId)
      );

      const snapshot = await get(commissionsRef);
      
      const updates = {};
      snapshot.forEach((child) => {
        updates[`commissions/${tenantId}/${child.key}/status`] = 'paid';
        updates[`commissions/${tenantId}/${child.key}/paidAt`] = Date.now();
      });

      await update(ref(this.db), updates);

      // Clear cache
      this.clearCacheForTenant(tenantId);

      return true;
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
      
      throw error;
    }
  }

  // ========== STATISTICS & ANALYTICS ==========
  async getCommissionStats(tenantId) {
    const cacheKey = `stats_${tenantId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Get data for all months of current year
      const yearlyStats = [];
      const monthlyPromises = [];
      
      for (let month = 0; month < 12; month++) {
        monthlyPromises.push(this.getMonthlyCommission(tenantId, currentYear, month + 1));
      }
      
      const monthlyData = await Promise.all(monthlyPromises);
      
      monthlyData.forEach((data, index) => {
        yearlyStats.push({
          month: format(new Date(currentYear, index), 'MMM'),
          monthNumber: index + 1,
          ...data
        });
      });

      // Calculate totals
      const totalCommission = yearlyStats.reduce((sum, month) => sum + month.total, 0);
      const totalPaid = yearlyStats.reduce((sum, month) => sum + month.paid, 0);
      const totalPending = yearlyStats.reduce((sum, month) => sum + month.pending, 0);

      // Calculate growth
      const lastMonth = now.getMonth() - 1;
      const currentMonth = now.getMonth();
      const growth = lastMonth >= 0 && yearlyStats[lastMonth].total > 0
        ? ((yearlyStats[currentMonth].total - yearlyStats[lastMonth].total) / yearlyStats[lastMonth].total) * 100
        : 0;

      // Daily average
      const daysInCurrentMonth = now.getDate();
      const dailyAverage = yearlyStats[currentMonth].total / daysInCurrentMonth;

      const result = {
        yearly: yearlyStats,
        totals: {
          allTime: totalCommission,
          paid: totalPaid,
          pending: totalPending,
          currentMonth: yearlyStats[currentMonth].total,
          lastMonth: lastMonth >= 0 ? yearlyStats[lastMonth].total : 0
        },
        metrics: {
          growth,
          dailyAverage,
          projectedMonthly: dailyAverage * 30,
          averageOrderCommission: totalCommission / yearlyStats.reduce((sum, m) => sum + m.transactions.length, 0) || 0
        },
        breakdown: {
          byPaymentMethod: this.aggregateBreakdown(yearlyStats),
          byStatus: {
            paid: totalPaid,
            pending: totalPending,
            cancelled: yearlyStats.reduce((sum, month) => sum + month.cancelled, 0)
          }
        }
      };

      return this.setToCache(cacheKey, result);
    } catch (error) {
      console.error('Error getting commission stats:', error);
      
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
      
      throw error;
    }
  }

  // ========== UTILITY METHODS ==========
  async generateInvoiceNumber(year, month) {
    const prefix = `INV-${year}${String(month).padStart(2, '0')}`;
    
    // Get count of invoices for this month
    const invoicesRef = query(
      ref(this.db, 'invoices'),
      orderByChild('invoiceNumber'),
      startAt(prefix),
      endAt(prefix + '\uf8ff')
    );
    
    const snapshot = await get(invoicesRef);
    const count = snapshot.size + 1;
    
    return `${prefix}-${String(count).padStart(4, '0')}`;
  }

  calculateDueDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.getTime();
  }

  aggregateBreakdown(yearlyStats) {
    const aggregate = {
      card: { count: 0, amount: 0 },
      twint: { count: 0, amount: 0 },
      invoice: { count: 0, amount: 0 }
    };

    yearlyStats.forEach(month => {
      Object.keys(month.breakdown).forEach(method => {
        aggregate[method].count += month.breakdown[method].count;
        aggregate[method].amount += month.breakdown[method].amount;
      });
    });

    return aggregate;
  }

  // ========== CACHE MANAGEMENT ==========
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    return data;
  }

  clearCacheForTenant(tenantId) {
    // Clear all cache entries for this tenant
    Array.from(this.cache.keys()).forEach(key => {
      if (key.includes(tenantId)) {
        this.cache.delete(key);
      }
    });
  }

  // ========== EXPORT FUNCTIONALITY ==========
  async exportCommissionData(tenantId, startDate, endDate) {
    try {
      const commissionsRef = query(
        ref(this.db, `commissions/${tenantId}`),
        orderByChild('createdAt'),
        startAt(startDate.getTime()),
        endAt(endDate.getTime())
      );

      const snapshot = await get(commissionsRef);
      const commissions = [];

      snapshot.forEach((child) => {
        commissions.push({ id: child.key, ...child.val() });
      });

      return {
        tenant: tenantId,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        commissions: commissions.sort((a, b) => b.createdAt - a.createdAt),
        summary: {
          total: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
          count: commissions.length,
          averageCommission: commissions.length > 0 
            ? commissions.reduce((sum, c) => sum + c.commissionAmount, 0) / commissions.length 
            : 0
        }
      };
    } catch (error) {
      console.error('Error exporting commission data:', error);
      
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
      
      throw error;
    }
  }
}

// Singleton instance
const commissionService = new CommissionService();

export default commissionService;