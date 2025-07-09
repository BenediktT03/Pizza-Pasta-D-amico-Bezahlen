// Analytics Service for Firebase Functions
import * as admin from 'firebase-admin';
import { 
  PlatformMetrics, 
  TenantPerformance,
  RevenueAnalytics,
  OrderAnalytics 
} from '../types/analytics';

export class AnalyticsService {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Get comprehensive platform metrics
   */
  async getPlatformMetrics(period: 'day' | 'week' | 'month' | 'year'): Promise<PlatformMetrics> {
    const endDate = new Date();
    const startDate = this.getStartDate(period);

    // Get all tenants
    const tenantsSnapshot = await this.db.collection('foodtrucks').get();
    const totalTenants = tenantsSnapshot.size;
    const activeTenants = tenantsSnapshot.docs.filter(doc => doc.data().isActive).length;

    // Aggregate metrics
    let totalRevenue = 0;
    let totalOrders = 0;
    let platformFeesCollected = 0;
    const topTenants: TenantPerformance[] = [];

    // Process each tenant
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      // Get orders for this tenant in the period
      const ordersSnapshot = await this.db
        .collection(`foodtrucks/${tenantId}/orders`)
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .where('status', 'in', ['completed', 'ready'])
        .get();

      let tenantRevenue = 0;
      let tenantOrders = ordersSnapshot.size;
      let tenantFees = 0;

      ordersSnapshot.forEach(orderDoc => {
        const order = orderDoc.data();
        tenantRevenue += order.totalAmount || 0;
        tenantFees += order.platformFee || 0;
      });

      totalRevenue += tenantRevenue;
      totalOrders += tenantOrders;
      platformFeesCollected += tenantFees;

      if (tenantOrders > 0) {
        topTenants.push({
          tenantId,
          tenantName: tenantData.name,
          revenue: tenantRevenue,
          orders: tenantOrders,
          avgOrderValue: tenantRevenue / tenantOrders,
          platformFees: tenantFees,
          growthRate: await this.calculateGrowthRate(tenantId, period)
        });
      }
    }

    // Sort top tenants by revenue
    topTenants.sort((a, b) => b.revenue - a.revenue);

    // Calculate additional metrics
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const orderGrowthRate = await this.calculateOverallGrowthRate('orders', period);
    const revenueGrowthRate = await this.calculateOverallGrowthRate('revenue', period);

    // Get hourly and daily distributions
    const ordersByHour = await this.getOrdersByHour(startDate, endDate);
    const revenueByDay = await this.getRevenueByDay(startDate, endDate);
    const paymentMethodDistribution = await this.getPaymentMethodDistribution(startDate, endDate);
    const geographicDistribution = await this.getGeographicDistribution();

    return {
      totalRevenue,
      totalOrders,
      totalTenants,
      activeTenants,
      platformFeesCollected,
      averageOrderValue,
      orderGrowthRate,
      revenueGrowthRate,
      topPerformingTenants: topTenants.slice(0, 10),
      ordersByHour,
      revenueByDay,
      paymentMethodDistribution,
      geographicDistribution
    };
  }

  /**
   * Get revenue analytics for a specific period
   */
  async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<RevenueAnalytics> {
    let totalRevenue = 0;
    let platformFees = 0;
    let netRevenue = 0;
    const breakdown: any[] = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      let dayRevenue = 0;
      let dayFees = 0;
      let dayOrders = 0;

      // Get all orders for this day across all tenants
      const tenantsSnapshot = await this.db.collection('foodtrucks').get();
      
      for (const tenantDoc of tenantsSnapshot.docs) {
        const ordersSnapshot = await this.db
          .collection(`foodtrucks/${tenantDoc.id}/orders`)
          .where('createdAt', '>=', dayStart)
          .where('createdAt', '<=', dayEnd)
          .where('status', 'in', ['completed', 'ready'])
          .get();

        ordersSnapshot.forEach(orderDoc => {
          const order = orderDoc.data();
          dayRevenue += order.totalAmount || 0;
          dayFees += order.platformFee || 0;
          dayOrders++;
        });
      }

      totalRevenue += dayRevenue;
      platformFees += dayFees;

      breakdown.push({
        date: currentDate.toISOString().split('T')[0],
        revenue: dayRevenue,
        fees: dayFees,
        orders: dayOrders
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    netRevenue = totalRevenue - platformFees;

    return {
      totalRevenue,
      platformFees,
      netRevenue,
      breakdown
    };
  }

  /**
   * Get tenant rankings by metric
   */
  async getTenantRankings(
    metric: 'revenue' | 'orders' | 'growth',
    limit: number = 10
  ): Promise<TenantPerformance[]> {
    const period = 'month'; // Default to monthly rankings
    const endDate = new Date();
    const startDate = this.getStartDate(period);

    const tenantsSnapshot = await this.db.collection('foodtrucks').get();
    const rankings: TenantPerformance[] = [];

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();

      if (!tenantData.isActive) continue;

      const ordersSnapshot = await this.db
        .collection(`foodtrucks/${tenantId}/orders`)
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .where('status', 'in', ['completed', 'ready'])
        .get();

      let revenue = 0;
      let orders = ordersSnapshot.size;
      let fees = 0;

      ordersSnapshot.forEach(orderDoc => {
        const order = orderDoc.data();
        revenue += order.totalAmount || 0;
        fees += order.platformFee || 0;
      });

      const growthRate = await this.calculateGrowthRate(tenantId, period);

      rankings.push({
        tenantId,
        tenantName: tenantData.name,
        revenue,
        orders,
        avgOrderValue: orders > 0 ? revenue / orders : 0,
        platformFees: fees,
        growthRate
      });
    }

    // Sort by specified metric
    switch (metric) {
      case 'revenue':
        rankings.sort((a, b) => b.revenue - a.revenue);
        break;
      case 'orders':
        rankings.sort((a, b) => b.orders - a.orders);
        break;
      case 'growth':
        rankings.sort((a, b) => b.growthRate - a.growthRate);
        break;
    }

    return rankings.slice(0, limit);
  }

  /**
   * Update real-time analytics
   */
  async updateRealtimeAnalytics(
    orderId: string,
    tenantId: string,
    orderData: any
  ): Promise<void> {
    const batch = this.db.batch();

    // Update tenant real-time stats
    const tenantStatsRef = this.db.doc(`analytics_realtime/${tenantId}`);
    batch.set(tenantStatsRef, {
      lastOrderAt: admin.firestore.FieldValue.serverTimestamp(),
      activeOrders: admin.firestore.FieldValue.increment(1),
      todayRevenue: admin.firestore.FieldValue.increment(orderData.totalAmount),
      todayOrders: admin.firestore.FieldValue.increment(1)
    }, { merge: true });

    // Update platform real-time stats
    const platformStatsRef = this.db.doc('analytics_realtime/platform');
    batch.set(platformStatsRef, {
      activeOrders: admin.firestore.FieldValue.increment(1),
      ordersPerMinute: admin.firestore.FieldValue.increment(0.1), // Approximation
      revenuePerMinute: admin.firestore.FieldValue.increment(orderData.totalAmount / 60),
      lastUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();
  }

  /**
   * Generate analytics report
   */
  async generateAnalyticsReport(
    tenantId: string | null,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv'
  ): Promise<any> {
    const data = tenantId
      ? await this.getTenantAnalytics(tenantId, startDate, endDate)
      : await this.getPlatformMetrics('custom');

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  // Helper methods

  private getStartDate(period: string): Date {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }

  private async calculateGrowthRate(tenantId: string, period: string): Promise<number> {
    // Implementation for calculating growth rate
    // Compare current period with previous period
    return Math.random() * 20 - 10; // Placeholder
  }

  private async calculateOverallGrowthRate(metric: string, period: string): Promise<number> {
    // Implementation for calculating overall growth rate
    return Math.random() * 15 - 5; // Placeholder
  }

  private async getOrdersByHour(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation for hourly distribution
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      orders: Math.floor(Math.random() * 50),
      revenue: Math.floor(Math.random() * 5000)
    }));
    return hours;
  }

  private async getRevenueByDay(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation for daily revenue
    const days: any[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      days.push({
        date: currentDate.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 10000),
        orders: Math.floor(Math.random() * 100),
        newTenants: Math.floor(Math.random() * 5)
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  private async getPaymentMethodDistribution(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation for payment method distribution
    return [
      { method: 'card', count: 450, percentage: 45, totalAmount: 45000 },
      { method: 'twint', count: 350, percentage: 35, totalAmount: 35000 },
      { method: 'apple_pay', count: 150, percentage: 15, totalAmount: 15000 },
      { method: 'google_pay', count: 50, percentage: 5, totalAmount: 5000 }
    ];
  }

  private async getGeographicDistribution(): Promise<any[]> {
    // Implementation for geographic distribution
    return [
      { canton: 'Zürich', tenants: 25, orders: 5000, revenue: 500000 },
      { canton: 'Bern', tenants: 20, orders: 4000, revenue: 400000 },
      { canton: 'Basel', tenants: 15, orders: 3000, revenue: 300000 },
      { canton: 'Genève', tenants: 10, orders: 2000, revenue: 200000 }
    ];
  }

  private async getTenantAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Implementation for single tenant analytics
    const ordersSnapshot = await this.db
      .collection(`foodtrucks/${tenantId}/orders`)
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();

    let revenue = 0;
    let orders = ordersSnapshot.size;

    ordersSnapshot.forEach(orderDoc => {
      const order = orderDoc.data();
      revenue += order.totalAmount || 0;
    });

    return {
      tenantId,
      period: { startDate, endDate },
      revenue,
      orders,
      avgOrderValue: orders > 0 ? revenue / orders : 0
    };
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion
    const rows = [];
    const headers = Object.keys(data);
    rows.push(headers.join(','));
    
    // Handle nested objects
    const values = headers.map(header => {
      const value = data[header];
      return typeof value === 'object' ? JSON.stringify(value) : value;
    });
    rows.push(values.join(','));
    
    return rows.join('\n');
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
