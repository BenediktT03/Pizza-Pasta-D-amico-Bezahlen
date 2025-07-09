/**
 * Scheduled reports generation
 * Generates daily, weekly, and monthly reports for tenants
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { de, fr, it, enUS } from 'date-fns/locale';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const locales = {
  de: de,
  fr: fr,
  it: it,
  en: enUS,
};

// Daily report - runs at 6 AM
export const generateDailyReports = onSchedule({
  schedule: '0 6 * * *',
  timeZone: 'Europe/Zurich',
  region: 'europe-west6',
  memory: '1GiB',
  timeoutSeconds: 540,
}, async (event) => {
  console.log('Starting daily report generation');
  
  const yesterday = subDays(new Date(), 1);
  const startDate = startOfDay(yesterday);
  const endDate = endOfDay(yesterday);
  
  await generateReportsForPeriod('daily', startDate, endDate);
});

// Weekly report - runs every Monday at 7 AM
export const generateWeeklyReports = onSchedule({
  schedule: '0 7 * * 1',
  timeZone: 'Europe/Zurich',
  region: 'europe-west6',
  memory: '1GiB',
  timeoutSeconds: 540,
}, async (event) => {
  console.log('Starting weekly report generation');
  
  const lastWeek = subDays(new Date(), 7);
  const startDate = startOfWeek(lastWeek, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(lastWeek, { weekStartsOn: 1 });
  
  await generateReportsForPeriod('weekly', startDate, endDate);
});

// Monthly report - runs on the 1st of each month at 8 AM
export const generateMonthlyReports = onSchedule({
  schedule: '0 8 1 * *',
  timeZone: 'Europe/Zurich',
  region: 'europe-west6',
  memory: '2GiB',
  timeoutSeconds: 540,
}, async (event) => {
  console.log('Starting monthly report generation');
  
  const lastMonth = subDays(new Date(), 30);
  const startDate = startOfMonth(lastMonth);
  const endDate = endOfMonth(lastMonth);
  
  await generateReportsForPeriod('monthly', startDate, endDate);
});

async function generateReportsForPeriod(
  type: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date
) {
  // Get all active tenants
  const tenantsSnapshot = await admin.firestore()
    .collection('tenants')
    .where('active', '==', true)
    .where('subscription.features.reports', '==', true)
    .get();
  
  console.log(`Generating ${type} reports for ${tenantsSnapshot.size} tenants`);
  
  // Process each tenant
  const promises = tenantsSnapshot.docs.map(async (tenantDoc) => {
    const tenant = tenantDoc.data();
    
    try {
      // Generate report data
      const reportData = await generateTenantReport(
        tenantDoc.id,
        tenant,
        startDate,
        endDate
      );
      
      // Store report in Firestore
      await storeReport(tenantDoc.id, type, reportData);
      
      // Send report via email if enabled
      if (tenant.settings?.reports?.emailEnabled) {
        await sendReportEmail(tenant, type, reportData);
      }
      
      // Update last report timestamp
      await tenantDoc.ref.update({
        [`lastReports.${type}`]: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`${type} report generated for tenant ${tenantDoc.id}`);
    } catch (error) {
      console.error(`Failed to generate ${type} report for tenant ${tenantDoc.id}:`, error);
    }
  });
  
  await Promise.all(promises);
  
  console.log(`${type} report generation completed`);
}

async function generateTenantReport(
  tenantId: string,
  tenant: any,
  startDate: Date,
  endDate: Date
) {
  const tenantRef = admin.firestore().collection('tenants').doc(tenantId);
  
  // Fetch orders
  const ordersSnapshot = await tenantRef
    .collection('orders')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .get();
  
  // Calculate order statistics
  const orderStats = calculateOrderStats(ordersSnapshot.docs);
  
  // Fetch product sales
  const productSales = await calculateProductSales(ordersSnapshot.docs);
  
  // Fetch customer data
  const customerStats = await calculateCustomerStats(tenantId, startDate, endDate);
  
  // Fetch payment data
  const paymentStats = calculatePaymentStats(ordersSnapshot.docs);
  
  // Calculate growth metrics
  const growthMetrics = await calculateGrowthMetrics(
    tenantId,
    startDate,
    endDate
  );
  
  // Generate insights
  const insights = generateInsights(orderStats, productSales, customerStats);
  
  return {
    tenantId,
    tenantName: tenant.name,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      type: getPeriodType(startDate, endDate),
    },
    generatedAt: new Date().toISOString(),
    summary: {
      totalOrders: orderStats.totalOrders,
      totalRevenue: orderStats.totalRevenue,
      averageOrderValue: orderStats.averageOrderValue,
      totalCustomers: customerStats.totalCustomers,
      newCustomers: customerStats.newCustomers,
      returningCustomers: customerStats.returningCustomers,
    },
    orders: orderStats,
    products: productSales,
    customers: customerStats,
    payments: paymentStats,
    growth: growthMetrics,
    insights,
  };
}

function calculateOrderStats(orders: admin.firestore.QueryDocumentSnapshot[]) {
  const stats = {
    totalOrders: orders.length,
    totalRevenue: 0,
    averageOrderValue: 0,
    ordersByStatus: {} as Record<string, number>,
    ordersByType: {} as Record<string, number>,
    ordersByHour: Array(24).fill(0),
    ordersByDayOfWeek: Array(7).fill(0),
    averagePreparationTime: 0,
    canceledOrders: 0,
    cancelationRate: 0,
  };
  
  let totalPreparationTime = 0;
  let preparationTimeCount = 0;
  
  orders.forEach(doc => {
    const order = doc.data();
    
    // Revenue
    stats.totalRevenue += order.total || 0;
    
    // Status
    stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] || 0) + 1;
    
    // Type
    stats.ordersByType[order.type || 'standard'] = 
      (stats.ordersByType[order.type || 'standard'] || 0) + 1;
    
    // Time distribution
    if (order.createdAt) {
      const date = order.createdAt.toDate();
      stats.ordersByHour[date.getHours()]++;
      stats.ordersByDayOfWeek[date.getDay()]++;
    }
    
    // Preparation time
    if (order.completedAt && order.acceptedAt) {
      const prepTime = order.completedAt.toMillis() - order.acceptedAt.toMillis();
      totalPreparationTime += prepTime;
      preparationTimeCount++;
    }
    
    // Cancellations
    if (order.status === 'canceled') {
      stats.canceledOrders++;
    }
  });
  
  // Calculate averages
  stats.averageOrderValue = stats.totalOrders > 0 
    ? stats.totalRevenue / stats.totalOrders 
    : 0;
  
  stats.averagePreparationTime = preparationTimeCount > 0
    ? totalPreparationTime / preparationTimeCount / 60000 // Convert to minutes
    : 0;
  
  stats.cancelationRate = stats.totalOrders > 0
    ? (stats.canceledOrders / stats.totalOrders) * 100
    : 0;
  
  return stats;
}

async function calculateProductSales(orders: admin.firestore.QueryDocumentSnapshot[]) {
  const productSales = new Map<string, {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    category?: string;
  }>();
  
  orders.forEach(doc => {
    const order = doc.data();
    
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const existing = productSales.get(item.productId) || {
          id: item.productId,
          name: item.name,
          quantity: 0,
          revenue: 0,
          category: item.category,
        };
        
        existing.quantity += item.quantity || 1;
        existing.revenue += (item.price * (item.quantity || 1));
        
        productSales.set(item.productId, existing);
      });
    }
  });
  
  // Convert to array and sort by revenue
  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  // Category breakdown
  const categoryBreakdown = Array.from(productSales.values())
    .reduce((acc, product) => {
      const category = product.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + product.revenue;
      return acc;
    }, {} as Record<string, number>);
  
  return {
    topProducts,
    categoryBreakdown,
    totalUniqueProducts: productSales.size,
  };
}

async function calculateCustomerStats(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  const ordersSnapshot = await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('orders')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .get();
  
  const customerMap = new Map<string, {
    id: string;
    orderCount: number;
    totalSpent: number;
    firstOrder?: Date;
    lastOrder?: Date;
  }>();
  
  ordersSnapshot.forEach(doc => {
    const order = doc.data();
    const customerId = order.customerId || order.customerEmail || 'anonymous';
    
    const existing = customerMap.get(customerId) || {
      id: customerId,
      orderCount: 0,
      totalSpent: 0,
    };
    
    existing.orderCount++;
    existing.totalSpent += order.total || 0;
    
    const orderDate = order.createdAt?.toDate();
    if (orderDate) {
      if (!existing.firstOrder || orderDate < existing.firstOrder) {
        existing.firstOrder = orderDate;
      }
      if (!existing.lastOrder || orderDate > existing.lastOrder) {
        existing.lastOrder = orderDate;
      }
    }
    
    customerMap.set(customerId, existing);
  });
  
  // Calculate new vs returning
  let newCustomers = 0;
  let returningCustomers = 0;
  
  for (const customer of customerMap.values()) {
    if (customer.firstOrder && customer.firstOrder >= startDate) {
      newCustomers++;
    } else {
      returningCustomers++;
    }
  }
  
  // Top customers
  const topCustomers = Array.from(customerMap.values())
    .filter(c => c.id !== 'anonymous')
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);
  
  return {
    totalCustomers: customerMap.size,
    newCustomers,
    returningCustomers,
    topCustomers,
    averageOrdersPerCustomer: ordersSnapshot.size / customerMap.size,
    customerRetentionRate: (returningCustomers / customerMap.size) * 100,
  };
}

function calculatePaymentStats(orders: admin.firestore.QueryDocumentSnapshot[]) {
  const stats = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    paymentMethods: {} as Record<string, number>,
    averagePaymentTime: 0,
    refunds: 0,
    refundAmount: 0,
  };
  
  let totalPaymentTime = 0;
  let paymentTimeCount = 0;
  
  orders.forEach(doc => {
    const order = doc.data();
    
    if (order.payment) {
      stats.totalTransactions++;
      
      if (order.payment.status === 'succeeded' || order.payment.status === 'paid') {
        stats.successfulTransactions++;
      } else if (order.payment.status === 'failed') {
        stats.failedTransactions++;
      }
      
      // Payment method
      const method = order.payment.method || 'unknown';
      stats.paymentMethods[method] = (stats.paymentMethods[method] || 0) + 1;
      
      // Payment time
      if (order.payment.completedAt && order.createdAt) {
        const paymentTime = order.payment.completedAt.toMillis() - order.createdAt.toMillis();
        totalPaymentTime += paymentTime;
        paymentTimeCount++;
      }
      
      // Refunds
      if (order.refund) {
        stats.refunds++;
        stats.refundAmount += order.refund.amount || 0;
      }
    }
  });
  
  stats.averagePaymentTime = paymentTimeCount > 0
    ? totalPaymentTime / paymentTimeCount / 1000 // Convert to seconds
    : 0;
  
  return stats;
}

async function calculateGrowthMetrics(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  // Calculate period length
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Get previous period data
  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - periodDays);
  
  // Fetch current and previous period orders
  const [currentOrders, previousOrders] = await Promise.all([
    admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('orders')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get(),
    admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('orders')
      .where('createdAt', '>=', prevStartDate)
      .where('createdAt', '<=', prevEndDate)
      .get(),
  ]);
  
  // Calculate metrics
  const currentRevenue = currentOrders.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
  const previousRevenue = previousOrders.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
  
  const revenueGrowth = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : 0;
  
  const orderGrowth = previousOrders.size > 0
    ? ((currentOrders.size - previousOrders.size) / previousOrders.size) * 100
    : 0;
  
  return {
    revenueGrowth,
    orderGrowth,
    currentPeriod: {
      revenue: currentRevenue,
      orders: currentOrders.size,
    },
    previousPeriod: {
      revenue: previousRevenue,
      orders: previousOrders.size,
    },
  };
}

function generateInsights(
  orderStats: any,
  productSales: any,
  customerStats: any
) {
  const insights = [];
  
  // Peak hours insight
  const peakHour = orderStats.ordersByHour.indexOf(Math.max(...orderStats.ordersByHour));
  insights.push({
    type: 'peak_hours',
    title: 'Stoßzeiten',
    message: `Die meisten Bestellungen gehen um ${peakHour}:00 Uhr ein.`,
    impact: 'high',
  });
  
  // Best selling product
  if (productSales.topProducts.length > 0) {
    const topProduct = productSales.topProducts[0];
    insights.push({
      type: 'top_product',
      title: 'Bestseller',
      message: `"${topProduct.name}" war mit ${topProduct.quantity} verkauften Einheiten das meistverkaufte Produkt.`,
      impact: 'medium',
    });
  }
  
  // Customer retention
  if (customerStats.customerRetentionRate < 20) {
    insights.push({
      type: 'retention_warning',
      title: 'Kundenbindung',
      message: 'Die Kundenbindungsrate ist niedrig. Erwägen Sie Treueprogramme oder Sonderangebote für Stammkunden.',
      impact: 'high',
      actionable: true,
    });
  }
  
  // Cancellation rate
  if (orderStats.cancelationRate > 10) {
    insights.push({
      type: 'cancellation_warning',
      title: 'Hohe Stornierungsrate',
      message: `${orderStats.cancelationRate.toFixed(1)}% der Bestellungen wurden storniert. Überprüfen Sie die Gründe für Stornierungen.`,
      impact: 'high',
      actionable: true,
    });
  }
  
  // Preparation time
  if (orderStats.averagePreparationTime > 30) {
    insights.push({
      type: 'preparation_time',
      title: 'Zubereitungszeit',
      message: `Die durchschnittliche Zubereitungszeit beträgt ${orderStats.averagePreparationTime.toFixed(0)} Minuten. Optimieren Sie Küchenabläufe für schnelleren Service.`,
      impact: 'medium',
      actionable: true,
    });
  }
  
  return insights;
}

function getPeriodType(startDate: Date, endDate: Date): string {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days <= 1) return 'daily';
  if (days <= 7) return 'weekly';
  if (days <= 31) return 'monthly';
  return 'custom';
}

async function storeReport(tenantId: string, type: string, reportData: any) {
  await admin.firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('reports')
    .add({
      type,
      ...reportData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function sendReportEmail(tenant: any, type: string, reportData: any) {
  const locale = tenant.settings?.locale || 'de';
  const recipients = tenant.settings?.reports?.recipients || [tenant.email];
  
  if (!recipients.length) {
    console.log(`No email recipients configured for tenant ${tenant.id}`);
    return;
  }
  
  const subject = getEmailSubject(type, locale, reportData.period);
  const html = generateEmailHTML(tenant, type, reportData, locale);
  
  const msg = {
    to: recipients,
    from: {
      email: 'reports@eatech.ch',
      name: 'EATECH Reports',
    },
    subject,
    html,
    attachments: [
      {
        content: Buffer.from(JSON.stringify(reportData, null, 2)).toString('base64'),
        filename: `report-${type}-${format(new Date(), 'yyyy-MM-dd')}.json`,
        type: 'application/json',
        disposition: 'attachment',
      },
    ],
  };
  
  try {
    await sgMail.send(msg);
    console.log(`Report email sent to ${recipients.join(', ')}`);
  } catch (error) {
    console.error('Failed to send report email:', error);
  }
}

function getEmailSubject(type: string, locale: string, period: any): string {
  const templates = {
    de: {
      daily: 'Ihr täglicher EATECH Bericht',
      weekly: 'Ihr wöchentlicher EATECH Bericht', 
      monthly: 'Ihr monatlicher EATECH Bericht',
    },
    fr: {
      daily: 'Votre rapport quotidien EATECH',
      weekly: 'Votre rapport hebdomadaire EATECH',
      monthly: 'Votre rapport mensuel EATECH',
    },
    it: {
      daily: 'Il tuo rapporto giornaliero EATECH',
      weekly: 'Il tuo rapporto settimanale EATECH',
      monthly: 'Il tuo rapporto mensile EATECH',
    },
    en: {
      daily: 'Your daily EATECH report',
      weekly: 'Your weekly EATECH report',
      monthly: 'Your monthly EATECH report',
    },
  };
  
  return templates[locale]?.[type] || templates.en[type];
}

function generateEmailHTML(tenant: any, type: string, reportData: any, locale: string): string {
  // This would be a more complex HTML template in production
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>EATECH Report</title>
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .header { background: #0066cc; color: white; padding: 20px; }
        .content { padding: 20px; }
        .metric { margin: 10px 0; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .insights { background: #f5f5f5; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>EATECH ${type} Report</h1>
        <p>${tenant.name}</p>
      </div>
      <div class="content">
        <h2>Summary</h2>
        <div class="metric">
          <div>Total Orders</div>
          <div class="metric-value">${reportData.summary.totalOrders}</div>
        </div>
        <div class="metric">
          <div>Total Revenue</div>
          <div class="metric-value">CHF ${reportData.summary.totalRevenue.toFixed(2)}</div>
        </div>
        
        <div class="insights">
          <h3>Key Insights</h3>
          ${reportData.insights.map((insight: any) => `
            <p><strong>${insight.title}:</strong> ${insight.message}</p>
          `).join('')}
        </div>
        
        <p>View full report in your EATECH dashboard.</p>
      </div>
    </body>
    </html>
  `;
}
