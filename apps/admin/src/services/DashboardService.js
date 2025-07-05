/**
 * EATECH Dashboard Service
 * Handles dashboard data aggregation and analytics
 * File Path: /apps/admin/src/services/DashboardService.js
 */

import { getDatabase, ref, get, query, orderByChild, startAt, endAt } from 'firebase/database';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from 'date-fns';

class DashboardService {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(tenantId, timeRange = 'today') {
    try {
      const { startTime, endTime, compareStart, compareEnd } = this.getTimeRanges(timeRange);
      
      // Fetch all required data in parallel
      const [
        revenue,
        orders,
        customers,
        products,
        revenueChart,
        ordersByStatus,
        popularItems,
        recentOrders
      ] = await Promise.all([
        this.getRevenueStats(tenantId, startTime, endTime, compareStart, compareEnd),
        this.getOrderStats(tenantId, startTime, endTime, compareStart, compareEnd),
        this.getCustomerStats(tenantId, startTime, endTime),
        this.getProductStats(tenantId, startTime, endTime),
        this.getRevenueChartData(tenantId, timeRange),
        this.getOrdersByStatus(tenantId),
        this.getPopularItems(tenantId, startTime, endTime),
        this.getRecentOrders(tenantId, 10)
      ]);

      // Calculate average preparation time
      const avgPrepTime = await this.getAveragePrepTime(tenantId, startTime, endTime);

      // Generate alerts
      const alerts = this.generateAlerts({ revenue, orders, products });

      return {
        revenue,
        orders,
        customers,
        products,
        avgPrepTime,
        revenueChart,
        ordersByStatus,
        popularItems,
        recentOrders,
        alerts
      };

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get time ranges based on filter
   */
  getTimeRanges(timeRange) {
    const now = new Date();
    let startTime, endTime, compareStart, compareEnd;

    switch (timeRange) {
      case 'today':
        startTime = startOfDay(now).getTime();
        endTime = endOfDay(now).getTime();
        compareStart = startOfDay(subDays(now, 1)).getTime();
        compareEnd = endOfDay(subDays(now, 1)).getTime();
        break;
      
      case 'week':
        startTime = startOfWeek(now, { weekStartsOn: 1 }).getTime();
        endTime = endOfWeek(now, { weekStartsOn: 1 }).getTime();
        compareStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 }).getTime();
        compareEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 }).getTime();
        break;
      
      case 'month':
        startTime = startOfMonth(now).getTime();
        endTime = endOfMonth(now).getTime();
        compareStart = startOfMonth(subDays(now, 30)).getTime();
        compareEnd = endOfMonth(subDays(now, 30)).getTime();
        break;
      
      default:
        return this.getTimeRanges('today');
    }

    return { startTime, endTime, compareStart, compareEnd };
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(tenantId, startTime, endTime, compareStart, compareEnd) {
    try {
      const ordersRef = ref(this.db, `tenants/${tenantId}/orders`);
      const ordersSnap = await get(ordersRef);

      if (!ordersSnap.exists()) {
        return { today: 0, change: 0 };
      }

      const orders = ordersSnap.val();
      let currentRevenue = 0;
      let compareRevenue = 0;

      Object.values(orders).forEach(order => {
        if (order.createdAt >= startTime && order.createdAt <= endTime && 
            order.status !== 'cancelled') {
          currentRevenue += order.totals.total;
        }
        if (order.createdAt >= compareStart && order.createdAt <= compareEnd && 
            order.status !== 'cancelled') {
          compareRevenue += order.totals.total;
        }
      });

      const change = compareRevenue > 0 
        ? ((currentRevenue - compareRevenue) / compareRevenue) * 100 
        : 0;

      return {
        today: currentRevenue,
        compare: compareRevenue,
        change
      };

    } catch (error) {
      console.error('Error getting revenue stats:', error);
      return { today: 0, change: 0 };
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(tenantId, startTime, endTime, compareStart, compareEnd) {
    try {
      const ordersRef = ref(this.db, `tenants/${tenantId}/orders`);
      const ordersSnap = await get(ordersRef);

      if (!ordersSnap.exists()) {
        return { total: 0, change: 0 };
      }

      const orders = ordersSnap.val();
      let currentOrders = 0;
      let compareOrders = 0;

      Object.values(orders).forEach(order => {
        if (order.createdAt >= startTime && order.createdAt <= endTime) {
          currentOrders++;
        }
        if (order.createdAt >= compareStart && order.createdAt <= compareEnd) {
          compareOrders++;
        }
      });

      const change = compareOrders > 0 
        ? ((currentOrders - compareOrders) / compareOrders) * 100 
        : 0;

      return {
        total: currentOrders,
        compare: compareOrders,
        change
      };

    } catch (error) {
      console.error('Error getting order stats:', error);
      return { total: 0, change: 0 };
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(tenantId, startTime, endTime) {
    try {
      const customersRef = ref(this.db, `tenants/${tenantId}/customers`);
      const customersSnap = await get(customersRef);

      if (!customersSnap.exists()) {
        return { new: 0, total: 0 };
      }

      const customers = customersSnap.val();
      let newCustomers = 0;
      let totalCustomers = Object.keys(customers).length;

      Object.values(customers).forEach(customer => {
        if (customer.createdAt >= startTime && customer.createdAt <= endTime) {
          newCustomers++;
        }
      });

      return {
        new: newCustomers,
        total: totalCustomers
      };

    } catch (error) {
      console.error('Error getting customer stats:', error);
      return { new: 0, total: 0 };
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats(tenantId, startTime, endTime) {
    try {
      const productsRef = ref(this.db, `tenants/${tenantId}/products`);
      const productsSnap = await get(productsRef);

      if (!productsSnap.exists()) {
        return { total: 0, available: 0, lowStock: 0 };
      }

      const products = productsSnap.val();
      let total = 0;
      let available = 0;
      let lowStock = 0;

      Object.values(products).forEach(product => {
        total++;
        if (product.available) available++;
        if (product.stock && product.stock < 10) lowStock++;
      });

      return {
        total,
        available,
        lowStock
      };

    } catch (error) {
      console.error('Error getting product stats:', error);
      return { total: 0, available: 0, lowStock: 0 };
    }
  }

  /**
   * Get revenue chart data
   */
  async getRevenueChartData(tenantId, timeRange) {
    try {
      const ordersRef = ref(this.db, `tenants/${tenantId}/orders`);
      const ordersSnap = await get(ordersRef);

      if (!ordersSnap.exists()) {
        return [];
      }

      const orders = ordersSnap.val();
      const chartData = [];
      const now = new Date();

      // Determine data points based on time range
      let dataPoints = [];
      if (timeRange === 'today') {
        // Hourly data for today
        for (let i = 0; i < 24; i++) {
          const hour = new Date(now);
          hour.setHours(i, 0, 0, 0);
          dataPoints.push({
            label: format(hour, 'HH:mm'),
            start: hour.getTime(),
            end: hour.getTime() + 3600000 // 1 hour
          });
        }
      } else if (timeRange === 'week') {
        // Daily data for week
        for (let i = 6; i >= 0; i--) {
          const day = subDays(now, i);
          dataPoints.push({
            label: format(day, 'EEE'),
            start: startOfDay(day).getTime(),
            end: endOfDay(day).getTime()
          });
        }
      } else {
        // Daily data for month
        const daysInMonth = endOfMonth(now).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const day = new Date(now.getFullYear(), now.getMonth(), i);
          dataPoints.push({
            label: format(day, 'd'),
            start: startOfDay(day).getTime(),
            end: endOfDay(day).getTime()
          });
        }
      }

      // Calculate revenue for each data point
      dataPoints.forEach(point => {
        let revenue = 0;
        let orders_count = 0;

        Object.values(orders).forEach(order => {
          if (order.createdAt >= point.start && order.createdAt <= point.end && 
              order.status !== 'cancelled') {
            revenue += order.totals.total;
            orders_count++;
          }
        });

        chartData.push({
          label: point.label,
          revenue,
          orders: orders_count
        });
      });

      return chartData;

    } catch (error) {
      console.error('Error getting revenue chart data:', error);
      return [];
    }
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(tenantId) {
    try {
      const ordersRef = ref(this.db, `tenants/${tenantId}/orders`);
      const ordersSnap = await get(ordersRef);

      if (!ordersSnap.exists()) {
        return [];
      }

      const orders = ordersSnap.val();
      const statusCounts = {
        pending: 0,
        preparing: 0,
        ready: 0,
        delivered: 0,
        cancelled: 0
      };

      Object.values(orders).forEach(order => {
        if (statusCounts[order.status] !== undefined) {
          statusCounts[order.status]++;
        }
      });

      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        label: this.getStatusLabel(status),
        color: this.getStatusColor(status)
      }));

    } catch (error) {
      console.error('Error getting orders by status:', error);
      return [];
    }
  }

  /**
   * Get popular items
   */
  async getPopularItems(tenantId, startTime, endTime) {
    try {
      const ordersRef = ref(this.db, `tenants/${tenantId}/orders`);
      const ordersSnap = await get(ordersRef);

      if (!ordersSnap.exists()) {
        return [];
      }

      const orders = ordersSnap.val();
      const itemCounts = {};

      // Count item occurrences
      Object.values(orders).forEach(order => {
        if (order.createdAt >= startTime && order.createdAt <= endTime && 
            order.status !== 'cancelled') {
          order.items.forEach(item => {
            if (!itemCounts[item.productId]) {
              itemCounts[item.productId] = {
                id: item.productId,
                name: item.name,
                count: 0,
                revenue: 0
              };
            }
            itemCounts[item.productId].count += item.quantity;
            itemCounts[item.productId].revenue += item.price * item.quantity;
          });
        }
      });

      // Sort by count and return top 5
      return Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    } catch (error) {
      console.error('Error getting popular items:', error);
      return [];
    }
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(tenantId, limit = 10) {
    try {
      const ordersRef = ref(this.db, `tenants/${tenantId}/orders`);
      const ordersSnap = await get(ordersRef);

      if (!ordersSnap.exists()) {
        return [];
      }

      const orders = ordersSnap.val();
      
      // Convert to array and sort by creation time
      return Object.entries(orders)
        .map(([id, order]) => ({ id, ...order }))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting recent orders:', error);
      return [];
    }
  }

  /**
   * Get average preparation time
   */
  async getAveragePrepTime(tenantId, startTime, endTime) {
    try {
      const ordersRef = ref(this.db, `tenants/${tenantId}/orders`);
      const ordersSnap = await get(ordersRef);

      if (!ordersSnap.exists()) {
        return 15; // Default 15 minutes
      }

      const orders = ordersSnap.val();
      let totalTime = 0;
      let count = 0;

      Object.values(orders).forEach(order => {
        if (order.createdAt >= startTime && order.createdAt <= endTime && 
            order.statusHistory) {
          const created = order.statusHistory.find(h => h.status === 'pending');
          const ready = order.statusHistory.find(h => h.status === 'ready');
          
          if (created && ready) {
            totalTime += (ready.timestamp - created.timestamp) / 60000; // Convert to minutes
            count++;
          }
        }
      });

      return count > 0 ? Math.round(totalTime / count) : 15;

    } catch (error) {
      console.error('Error getting average prep time:', error);
      return 15;
    }
  }

  /**
   * Generate alerts based on data
   */
  generateAlerts({ revenue, orders, products }) {
    const alerts = [];

    // Low revenue alert
    if (revenue.change < -20) {
      alerts.push({
        type: 'warning',
        message: 'Umsatz ist heute 20% niedriger als gestern'
      });
    }

    // High demand alert
    if (orders.total > 50) {
      alerts.push({
        type: 'info',
        message: 'Hohe Nachfrage heute - Stellen Sie sicher, dass genügend Personal vorhanden ist'
      });
    }

    // Low stock alert
    if (products.lowStock > 0) {
      alerts.push({
        type: 'warning',
        message: `${products.lowStock} Produkte haben niedrigen Lagerbestand`
      });
    }

    return alerts;
  }

  /**
   * Get status label
   */
  getStatusLabel(status) {
    const labels = {
      pending: 'Ausstehend',
      preparing: 'In Zubereitung',
      ready: 'Fertig',
      delivered: 'Geliefert',
      cancelled: 'Storniert'
    };
    return labels[status] || status;
  }

  /**
   * Get status color
   */
  getStatusColor(status) {
    const colors = {
      pending: '#3b82f6',
      preparing: '#f59e0b',
      ready: '#10b981',
      delivered: '#6b7280',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  }
}

export default new DashboardService();