import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  orderBy,
  limit,
  startAt,
  endAt
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export interface AnalyticsMetrics {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  customers: number;
  conversionRate: number;
  topProducts: ProductMetric[];
  hourlyDistribution: HourlyMetric[];
  paymentMethods: PaymentMethodMetric[];
  orderStatuses: OrderStatusMetric[];
}

export interface ProductMetric {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface HourlyMetric {
  hour: number;
  orders: number;
  revenue: number;
}

export interface PaymentMethodMetric {
  method: string;
  count: number;
  total: number;
}

export interface OrderStatusMetric {
  status: string;
  count: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AnalyticsEvent {
  type: 'order' | 'view' | 'cart' | 'payment' | 'user';
  action: string;
  category: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  tenantId: string;
  timestamp: Timestamp;
}

class AnalyticsService {
  // Track custom events
  async trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>) {
    try {
      await addDoc(collection(db, 'analytics_events'), {
        ...event,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  // Get analytics metrics for a date range
  async getMetrics(tenantId: string, dateRange: DateRange): Promise<AnalyticsMetrics> {
    try {
      // Get orders for the date range
      const ordersQuery = query(
        collection(db, 'orders'),
        where('tenantId', '==', tenantId),
        where('createdAt', '>=', startOfDay(dateRange.start)),
        where('createdAt', '<=', endOfDay(dateRange.end))
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate basic metrics
      const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const orderCount = orders.length;
      const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

      // Get unique customers
      const uniqueCustomers = new Set(orders.map(order => order.customerId || order.customerEmail));
      const customerCount = uniqueCustomers.size;

      // Calculate conversion rate (simplified - would need session data in real app)
      const conversionRate = 0; // Placeholder

      // Get top products
      const productMap = new Map<string, ProductMetric>();
      orders.forEach(order => {
        order.items?.forEach((item: any) => {
          const existing = productMap.get(item.productId) || {
            productId: item.productId,
            productName: item.name,
            quantity: 0,
            revenue: 0
          };
          
          existing.quantity += item.quantity;
          existing.revenue += item.price * item.quantity;
          productMap.set(item.productId, existing);
        });
      });
      
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate hourly distribution
      const hourlyMap = new Map<number, HourlyMetric>();
      for (let hour = 0; hour < 24; hour++) {
        hourlyMap.set(hour, { hour, orders: 0, revenue: 0 });
      }
      
      orders.forEach(order => {
        const hour = order.createdAt?.toDate().getHours() || 0;
        const metric = hourlyMap.get(hour)!;
        metric.orders++;
        metric.revenue += order.total || 0;
      });
      
      const hourlyDistribution = Array.from(hourlyMap.values());

      // Payment methods distribution
      const paymentMap = new Map<string, PaymentMethodMetric>();
      orders.forEach(order => {
        const method = order.paymentMethod || 'unknown';
        const existing = paymentMap.get(method) || {
          method,
          count: 0,
          total: 0
        };
        
        existing.count++;
        existing.total += order.total || 0;
        paymentMap.set(method, existing);
      });
      
      const paymentMethods = Array.from(paymentMap.values());

      // Order status distribution
      const statusMap = new Map<string, OrderStatusMetric>();
      orders.forEach(order => {
        const status = order.status || 'unknown';
        const existing = statusMap.get(status) || { status, count: 0 };
        existing.count++;
        statusMap.set(status, existing);
      });
      
      const orderStatuses = Array.from(statusMap.values());

      return {
        revenue,
        orders: orderCount,
        averageOrderValue,
        customers: customerCount,
        conversionRate,
        topProducts,
        hourlyDistribution,
        paymentMethods,
        orderStatuses
      };
    } catch (error) {
      console.error('Error fetching analytics metrics:', error);
      throw error;
    }
  }

  // Get revenue trend over time
  async getRevenueTrend(tenantId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    const dailyRevenue: { date: string; revenue: number }[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const ordersQuery = query(
        collection(db, 'orders'),
        where('tenantId', '==', tenantId),
        where('createdAt', '>=', dayStart),
        where('createdAt', '<=', dayEnd),
        where('status', 'in', ['completed', 'delivered'])
      );
      
      const snapshot = await getDocs(ordersQuery);
      const dayRevenue = snapshot.docs.reduce((sum, doc) => {
        return sum + (doc.data().total || 0);
      }, 0);
      
      dailyRevenue.unshift({
        date: format(date, 'yyyy-MM-dd'),
        revenue: dayRevenue
      });
    }
    
    return dailyRevenue;
  }

  // Get customer retention metrics
  async getCustomerRetention(tenantId: string) {
    // This would require more complex calculations with customer order history
    // Placeholder implementation
    return {
      newCustomers: 0,
      returningCustomers: 0,
      retentionRate: 0,
      churnRate: 0
    };
  }

  // Get product performance
  async getProductPerformance(tenantId: string, productId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('tenantId', '==', tenantId),
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate)
    );
    
    const snapshot = await getDocs(ordersQuery);
    
    let totalQuantity = 0;
    let totalRevenue = 0;
    let orderCount = 0;
    
    snapshot.docs.forEach(doc => {
      const order = doc.data();
      order.items?.forEach((item: any) => {
        if (item.productId === productId) {
          totalQuantity += item.quantity;
          totalRevenue += item.price * item.quantity;
          orderCount++;
        }
      });
    });
    
    return {
      productId,
      totalQuantity,
      totalRevenue,
      orderCount,
      averageQuantityPerOrder: orderCount > 0 ? totalQuantity / orderCount : 0
    };
  }

  // Export analytics data
  async exportAnalytics(tenantId: string, dateRange: DateRange, format: 'csv' | 'json') {
    const metrics = await this.getMetrics(tenantId, dateRange);
    
    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    }
    
    // CSV export
    const csv: string[] = [];
    csv.push('Metric,Value');
    csv.push(`Revenue,${metrics.revenue}`);
    csv.push(`Orders,${metrics.orders}`);
    csv.push(`Average Order Value,${metrics.averageOrderValue}`);
    csv.push(`Customers,${metrics.customers}`);
    csv.push('');
    csv.push('Top Products');
    csv.push('Product,Quantity,Revenue');
    metrics.topProducts.forEach(product => {
      csv.push(`${product.productName},${product.quantity},${product.revenue}`);
    });
    
    return csv.join('\n');
  }

  // Real-time dashboard metrics
  async getDashboardMetrics(tenantId: string) {
    const today = startOfDay(new Date());
    const now = new Date();
    
    // Today's metrics
    const todayMetrics = await this.getMetrics(tenantId, { start: today, end: now });
    
    // Yesterday's metrics for comparison
    const yesterday = subDays(today, 1);
    const yesterdayEnd = endOfDay(yesterday);
    const yesterdayMetrics = await this.getMetrics(tenantId, { 
      start: yesterday, 
      end: yesterdayEnd 
    });
    
    // Calculate percentage changes
    const revenueChange = yesterdayMetrics.revenue > 0 
      ? ((todayMetrics.revenue - yesterdayMetrics.revenue) / yesterdayMetrics.revenue) * 100 
      : 0;
      
    const ordersChange = yesterdayMetrics.orders > 0 
      ? ((todayMetrics.orders - yesterdayMetrics.orders) / yesterdayMetrics.orders) * 100 
      : 0;
    
    return {
      today: todayMetrics,
      changes: {
        revenue: revenueChange,
        orders: ordersChange,
        averageOrderValue: todayMetrics.averageOrderValue - yesterdayMetrics.averageOrderValue,
        customers: todayMetrics.customers - yesterdayMetrics.customers
      }
    };
  }
}

export const analyticsService = new AnalyticsService();
