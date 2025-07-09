import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { analyticsService } from './analytics';

export interface ReportConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: Date;
  endDate: Date;
  includeCharts?: boolean;
  includeDetails?: boolean;
  format?: 'pdf' | 'excel' | 'csv';
}

export interface SalesReport {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  paymentBreakdown: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
  hourlyBreakdown?: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
}

export interface InventoryReport {
  period: string;
  lowStockItems: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    reorderLevel: number;
    lastRestocked: Date;
  }>;
  stockMovements: Array<{
    productId: string;
    productName: string;
    movement: number;
    reason: string;
    date: Date;
  }>;
  totalValue: number;
  expiringSoon: Array<{
    productId: string;
    productName: string;
    expiryDate: Date;
    quantity: number;
  }>;
}

export interface StaffReport {
  period: string;
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    ordersHandled: number;
    averageServiceTime: number;
    revenue: number;
    rating: number;
  }>;
  shiftCoverage: Array<{
    date: Date;
    shift: string;
    staffCount: number;
    ordersHandled: number;
  }>;
  trainingNeeds: Array<{
    staffId: string;
    staffName: string;
    areas: string[];
  }>;
}

export interface CustomerReport {
  period: string;
  newCustomers: number;
  returningCustomers: number;
  customerLifetimeValue: number;
  topCustomers: Array<{
    customerId: string;
    name: string;
    orders: number;
    totalSpent: number;
    lastOrder: Date;
  }>;
  customerSatisfaction: {
    average: number;
    reviews: number;
    breakdown: Record<number, number>;
  };
}

class ReportsService {
  // Generate sales report
  async generateSalesReport(tenantId: string, config: ReportConfig): Promise<SalesReport> {
    try {
      const metrics = await analyticsService.getMetrics(tenantId, {
        start: config.startDate,
        end: config.endDate
      });

      const report: SalesReport = {
        period: `${format(config.startDate, 'yyyy-MM-dd')} to ${format(config.endDate, 'yyyy-MM-dd')}`,
        totalRevenue: metrics.revenue,
        totalOrders: metrics.orders,
        averageOrderValue: metrics.averageOrderValue,
        topProducts: metrics.topProducts.slice(0, 10).map(p => ({
          name: p.productName,
          quantity: p.quantity,
          revenue: p.revenue
        })),
        paymentBreakdown: metrics.paymentMethods.map(pm => ({
          method: pm.method,
          amount: pm.total,
          percentage: metrics.revenue > 0 ? (pm.total / metrics.revenue) * 100 : 0
        }))
      };

      if (config.includeDetails) {
        report.hourlyBreakdown = metrics.hourlyDistribution;
      }

      return report;
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw error;
    }
  }

  // Generate inventory report
  async generateInventoryReport(tenantId: string, config: ReportConfig): Promise<InventoryReport> {
    try {
      // Get inventory data
      const inventoryQuery = query(
        collection(db, 'inventory'),
        where('tenantId', '==', tenantId)
      );

      const inventorySnapshot = await getDocs(inventoryQuery);
      const inventory = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get stock movements
      const movementsQuery = query(
        collection(db, 'stock_movements'),
        where('tenantId', '==', tenantId),
        where('date', '>=', config.startDate),
        where('date', '<=', config.endDate),
        orderBy('date', 'desc')
      );

      const movementsSnapshot = await getDocs(movementsQuery);
      const movements = movementsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Process data
      const lowStockItems = inventory
        .filter(item => item.currentStock <= item.reorderLevel)
        .map(item => ({
          productId: item.productId,
          productName: item.productName,
          currentStock: item.currentStock,
          reorderLevel: item.reorderLevel,
          lastRestocked: item.lastRestocked?.toDate() || new Date()
        }));

      const stockMovements = movements.map(movement => ({
        productId: movement.productId,
        productName: movement.productName,
        movement: movement.quantity,
        reason: movement.reason,
        date: movement.date.toDate()
      }));

      const totalValue = inventory.reduce((sum, item) => {
        return sum + (item.currentStock * item.unitCost || 0);
      }, 0);

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringSoon = inventory
        .filter(item => item.expiryDate && item.expiryDate.toDate() <= thirtyDaysFromNow)
        .map(item => ({
          productId: item.productId,
          productName: item.productName,
          expiryDate: item.expiryDate.toDate(),
          quantity: item.currentStock
        }));

      return {
        period: `${format(config.startDate, 'yyyy-MM-dd')} to ${format(config.endDate, 'yyyy-MM-dd')}`,
        lowStockItems,
        stockMovements: stockMovements.slice(0, 50), // Limit to 50 most recent
        totalValue,
        expiringSoon
      };
    } catch (error) {
      console.error('Error generating inventory report:', error);
      throw error;
    }
  }

  // Generate staff performance report
  async generateStaffReport(tenantId: string, config: ReportConfig): Promise<StaffReport> {
    try {
      // Get staff data
      const staffQuery = query(
        collection(db, 'staff'),
        where('tenantId', '==', tenantId)
      );

      const staffSnapshot = await getDocs(staffQuery);
      const staff = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get orders handled by staff
      const ordersQuery = query(
        collection(db, 'orders'),
        where('tenantId', '==', tenantId),
        where('createdAt', '>=', config.startDate),
        where('createdAt', '<=', config.endDate)
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate staff performance
      const staffPerformance = staff.map(member => {
        const staffOrders = orders.filter(order => order.servedBy === member.id);
        const totalRevenue = staffOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalServiceTime = staffOrders.reduce((sum, order) => {
          if (order.completedAt && order.createdAt) {
            const duration = order.completedAt.toDate().getTime() - order.createdAt.toDate().getTime();
            return sum + duration;
          }
          return sum;
        }, 0);

        const averageServiceTime = staffOrders.length > 0 
          ? totalServiceTime / staffOrders.length / 60000 // Convert to minutes
          : 0;

        const ratings = staffOrders
          .filter(order => order.rating)
          .map(order => order.rating);
        
        const averageRating = ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

        return {
          staffId: member.id,
          staffName: member.name,
          ordersHandled: staffOrders.length,
          averageServiceTime,
          revenue: totalRevenue,
          rating: averageRating
        };
      });

      // Placeholder for shift coverage - would need shift schedule data
      const shiftCoverage: any[] = [];

      // Placeholder for training needs - would need performance metrics
      const trainingNeeds: any[] = [];

      return {
        period: `${format(config.startDate, 'yyyy-MM-dd')} to ${format(config.endDate, 'yyyy-MM-dd')}`,
        staffPerformance,
        shiftCoverage,
        trainingNeeds
      };
    } catch (error) {
      console.error('Error generating staff report:', error);
      throw error;
    }
  }

  // Generate customer report
  async generateCustomerReport(tenantId: string, config: ReportConfig): Promise<CustomerReport> {
    try {
      // Get customer orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('tenantId', '==', tenantId),
        where('createdAt', '>=', config.startDate),
        where('createdAt', '<=', config.endDate)
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group orders by customer
      const customerMap = new Map();
      orders.forEach(order => {
        const customerId = order.customerId || order.customerEmail || 'guest';
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customerId,
            name: order.customerName || 'Guest',
            orders: [],
            totalSpent: 0,
            firstOrder: order.createdAt.toDate(),
            lastOrder: order.createdAt.toDate()
          });
        }

        const customer = customerMap.get(customerId);
        customer.orders.push(order);
        customer.totalSpent += order.total || 0;
        
        if (order.createdAt.toDate() > customer.lastOrder) {
          customer.lastOrder = order.createdAt.toDate();
        }
        if (order.createdAt.toDate() < customer.firstOrder) {
          customer.firstOrder = order.createdAt.toDate();
        }
      });

      const customers = Array.from(customerMap.values());
      
      // Calculate metrics
      const newCustomers = customers.filter(c => 
        c.firstOrder >= config.startDate && c.firstOrder <= config.endDate
      ).length;

      const returningCustomers = customers.filter(c => 
        c.orders.length > 1
      ).length;

      const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
      const customerLifetimeValue = customers.length > 0 
        ? totalRevenue / customers.length 
        : 0;

      // Top customers
      const topCustomers = customers
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .map(c => ({
          customerId: c.customerId,
          name: c.name,
          orders: c.orders.length,
          totalSpent: c.totalSpent,
          lastOrder: c.lastOrder
        }));

      // Customer satisfaction
      const reviews = orders.filter(o => o.rating);
      const ratingsBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      
      reviews.forEach(order => {
        if (order.rating >= 1 && order.rating <= 5) {
          ratingsBreakdown[Math.floor(order.rating)]++;
        }
      });

      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, o) => sum + o.rating, 0) / reviews.length
        : 0;

      return {
        period: `${format(config.startDate, 'yyyy-MM-dd')} to ${format(config.endDate, 'yyyy-MM-dd')}`,
        newCustomers,
        returningCustomers,
        customerLifetimeValue,
        topCustomers,
        customerSatisfaction: {
          average: averageRating,
          reviews: reviews.length,
          breakdown: ratingsBreakdown
        }
      };
    } catch (error) {
      console.error('Error generating customer report:', error);
      throw error;
    }
  }

  // Schedule automated reports
  async scheduleReport(
    tenantId: string, 
    reportType: 'sales' | 'inventory' | 'staff' | 'customer',
    schedule: 'daily' | 'weekly' | 'monthly',
    recipients: string[]
  ) {
    try {
      await addDoc(collection(db, 'scheduled_reports'), {
        tenantId,
        reportType,
        schedule,
        recipients,
        isActive: true,
        createdAt: serverTimestamp(),
        nextRun: this.calculateNextRun(schedule)
      });
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw error;
    }
  }

  // Calculate next run time for scheduled reports
  private calculateNextRun(schedule: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    
    switch (schedule) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        now.setHours(6, 0, 0, 0); // 6 AM next day
        break;
      case 'weekly':
        now.setDate(now.getDate() + (7 - now.getDay() + 1)); // Next Monday
        now.setHours(6, 0, 0, 0);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        now.setDate(1); // First day of next month
        now.setHours(6, 0, 0, 0);
        break;
    }
    
    return now;
  }

  // Export report in different formats
  async exportReport(report: any, format: 'pdf' | 'excel' | 'csv'): Promise<Blob> {
    switch (format) {
      case 'csv':
        return this.exportToCSV(report);
      case 'excel':
        return this.exportToExcel(report);
      case 'pdf':
        return this.exportToPDF(report);
      default:
        throw new Error('Unsupported export format');
    }
  }

  private exportToCSV(report: any): Blob {
    // Simple CSV export implementation
    const lines: string[] = [];
    
    // Add headers
    lines.push(`Report Period: ${report.period}`);
    lines.push('');
    
    // Add data based on report type
    if (report.totalRevenue !== undefined) {
      lines.push('Metric,Value');
      lines.push(`Total Revenue,${report.totalRevenue}`);
      lines.push(`Total Orders,${report.totalOrders}`);
      lines.push(`Average Order Value,${report.averageOrderValue}`);
    }
    
    const csv = lines.join('\n');
    return new Blob([csv], { type: 'text/csv' });
  }

  private exportToExcel(report: any): Blob {
    // Would use a library like SheetJS in a real implementation
    throw new Error('Excel export not implemented');
  }

  private exportToPDF(report: any): Blob {
    // Would use a library like jsPDF in a real implementation
    throw new Error('PDF export not implemented');
  }
}

export const reportsService = new ReportsService();

// Import fix
import { addDoc, serverTimestamp } from 'firebase/firestore';
