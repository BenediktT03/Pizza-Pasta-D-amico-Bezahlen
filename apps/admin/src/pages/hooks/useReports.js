/**
 * EATECH - useReports Hook
 * Version: 23.0.0
 * Description: Custom Hook für Report-Generierung und -Verwaltung
 * File Path: /apps/admin/src/hooks/useReports.js
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from './useTenant';
import { useAuth } from './useAuth';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  format 
} from 'date-fns';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================
const COLLECTION_NAME = 'reports';
const SCHEDULED_REPORTS_COLLECTION = 'scheduledReports';

const REPORT_TYPES = {
  SALES: 'sales',
  ORDERS: 'orders',
  INVENTORY: 'inventory',
  CUSTOMERS: 'customers',
  FINANCIAL: 'financial'
};

const REPORT_FORMATS = {
  PDF: 'pdf',
  EXCEL: 'excel',
  CSV: 'csv'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const calculateDateRange = (preset) => {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday)
      };
    case 'thisWeek':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 })
      };
    case 'thisMonth':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case 'last30Days':
      return {
        start: startOfDay(subDays(now, 30)),
        end: endOfDay(now)
      };
    default:
      return null;
  }
};

const getReportFileName = (type, format, dateRange) => {
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const extension = format.toLowerCase();
  
  return `${typeLabel}_Report_${dateStr}.${extension}`;
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================
export const useReports = () => {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const isMounted = useRef(true);
  
  // State
  const [reports, setReports] = useState([]);
  const [scheduledReports, setScheduledReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Load Reports
  const loadReports = useCallback(async () => {
    if (!tenant?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const reportsQuery = query(
        collection(db, COLLECTION_NAME),
        where('tenantId', '==', tenant.id),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(reportsQuery);
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (isMounted.current) {
        setReports(reportsData);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      if (isMounted.current) {
        setError(err.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [tenant?.id]);
  
  // Generate Report
  const generateReport = useCallback(async ({
    type,
    dateRange,
    format = REPORT_FORMATS.PDF,
    filters = {},
    options = {}
  }) => {
    if (!tenant?.id) {
      throw new Error('No tenant selected');
    }
    
    setGeneratingReport(true);
    setError(null);
    
    try {
      // Prepare report data based on type
      let reportData = {
        type,
        format,
        dateRange,
        filters,
        options,
        tenantId: tenant.id,
        generatedBy: user?.uid,
        generatedAt: new Date().toISOString(),
        status: 'generating'
      };
      
      // Add report to database
      const reportRef = await addDoc(collection(db, COLLECTION_NAME), reportData);
      
      // Fetch data based on report type
      switch (type) {
        case REPORT_TYPES.SALES:
          reportData = await generateSalesReport(dateRange, filters);
          break;
        case REPORT_TYPES.ORDERS:
          reportData = await generateOrdersReport(dateRange, filters);
          break;
        case REPORT_TYPES.INVENTORY:
          reportData = await generateInventoryReport(dateRange, filters);
          break;
        case REPORT_TYPES.CUSTOMERS:
          reportData = await generateCustomersReport(dateRange, filters);
          break;
        case REPORT_TYPES.FINANCIAL:
          reportData = await generateFinancialReport(dateRange, filters);
          break;
        default:
          throw new Error(`Unknown report type: ${type}`);
      }
      
      // Update report status
      await updateDoc(doc(db, COLLECTION_NAME, reportRef.id), {
        status: 'completed',
        data: reportData,
        completedAt: new Date().toISOString()
      });
      
      // Reload reports
      await loadReports();
      
      return {
        id: reportRef.id,
        ...reportData,
        fileName: getReportFileName(type, format, dateRange)
      };
      
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.message);
      throw err;
    } finally {
      setGeneratingReport(false);
    }
  }, [tenant?.id, user?.uid, loadReports]);
  
  // Sales Report Generator
  const generateSalesReport = async (dateRange, filters) => {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('tenantId', '==', tenant.id),
      where('createdAt', '>=', dateRange.start.toISOString()),
      where('createdAt', '<=', dateRange.end.toISOString()),
      where('status', 'in', ['completed', 'delivered'])
    );
    
    const snapshot = await getDocs(ordersQuery);
    const orders = snapshot.docs.map(doc => doc.data());
    
    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = totalRevenue / orders.length || 0;
    const itemsSold = orders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    
    // Group by date
    const salesByDate = {};
    orders.forEach(order => {
      const date = format(new Date(order.createdAt), 'yyyy-MM-dd');
      if (!salesByDate[date]) {
        salesByDate[date] = { revenue: 0, orders: 0, items: 0 };
      }
      salesByDate[date].revenue += order.total;
      salesByDate[date].orders += 1;
      salesByDate[date].items += order.items.reduce((sum, item) => sum + item.quantity, 0);
    });
    
    // Top products
    const productSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.price * item.quantity;
      });
    });
    
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }));
    
    return {
      summary: {
        totalRevenue,
        totalOrders: orders.length,
        averageOrderValue,
        itemsSold,
        dateRange
      },
      salesByDate,
      topProducts,
      orders: orders.slice(0, 100) // Limit for performance
    };
  };
  
  // Orders Report Generator
  const generateOrdersReport = async (dateRange, filters) => {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('tenantId', '==', tenant.id),
      where('createdAt', '>=', dateRange.start.toISOString()),
      where('createdAt', '<=', dateRange.end.toISOString())
    );
    
    const snapshot = await getDocs(ordersQuery);
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Group by status
    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    
    // Payment methods
    const paymentMethods = orders.reduce((acc, order) => {
      acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + 1;
      return acc;
    }, {});
    
    // Order types
    const orderTypes = orders.reduce((acc, order) => {
      acc[order.type] = (acc[order.type] || 0) + 1;
      return acc;
    }, {});
    
    // Average preparation time
    const completedOrders = orders.filter(o => o.status === 'completed' && o.completedAt);
    const avgPrepTime = completedOrders.reduce((sum, order) => {
      const prepTime = new Date(order.completedAt) - new Date(order.createdAt);
      return sum + prepTime;
    }, 0) / completedOrders.length || 0;
    
    return {
      summary: {
        totalOrders: orders.length,
        ordersByStatus,
        paymentMethods,
        orderTypes,
        averagePreparationTime: Math.round(avgPrepTime / 1000 / 60), // in minutes
        dateRange
      },
      orders
    };
  };
  
  // Inventory Report Generator
  const generateInventoryReport = async (dateRange, filters) => {
    // Get current inventory
    const inventoryQuery = query(
      collection(db, 'inventory'),
      where('tenantId', '==', tenant.id)
    );
    
    const snapshot = await getDocs(inventoryQuery);
    const inventory = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get inventory movements
    const movementsQuery = query(
      collection(db, 'inventoryMovements'),
      where('tenantId', '==', tenant.id),
      where('createdAt', '>=', dateRange.start.toISOString()),
      where('createdAt', '<=', dateRange.end.toISOString())
    );
    
    const movementsSnapshot = await getDocs(movementsQuery);
    const movements = movementsSnapshot.docs.map(doc => doc.data());
    
    // Calculate metrics
    const lowStockItems = inventory.filter(item => 
      item.currentStock <= item.minStock
    );
    
    const totalValue = inventory.reduce((sum, item) => 
      sum + (item.currentStock * item.unitCost), 0
    );
    
    const movementsByType = movements.reduce((acc, movement) => {
      acc[movement.type] = (acc[movement.type] || 0) + 1;
      return acc;
    }, {});
    
    return {
      summary: {
        totalItems: inventory.length,
        lowStockItems: lowStockItems.length,
        totalValue,
        movementsByType,
        dateRange
      },
      inventory,
      lowStockItems,
      movements: movements.slice(0, 100)
    };
  };
  
  // Customers Report Generator
  const generateCustomersReport = async (dateRange, filters) => {
    const customersQuery = query(
      collection(db, 'customers'),
      where('tenantId', '==', tenant.id)
    );
    
    const snapshot = await getDocs(customersQuery);
    const customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get orders for the period
    const ordersQuery = query(
      collection(db, 'orders'),
      where('tenantId', '==', tenant.id),
      where('createdAt', '>=', dateRange.start.toISOString()),
      where('createdAt', '<=', dateRange.end.toISOString())
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = ordersSnapshot.docs.map(doc => doc.data());
    
    // Calculate metrics
    const newCustomers = customers.filter(customer => {
      const createdAt = new Date(customer.createdAt);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });
    
    // Customer segments
    const segments = customers.reduce((acc, customer) => {
      acc[customer.loyaltyTier || 'none'] = (acc[customer.loyaltyTier || 'none'] || 0) + 1;
      return acc;
    }, {});
    
    // Top customers by revenue
    const customerRevenue = {};
    orders.forEach(order => {
      if (order.customerId) {
        customerRevenue[order.customerId] = 
          (customerRevenue[order.customerId] || 0) + order.total;
      }
    });
    
    const topCustomers = Object.entries(customerRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([customerId, revenue]) => {
        const customer = customers.find(c => c.id === customerId);
        return {
          id: customerId,
          name: customer?.name || 'Unknown',
          email: customer?.email,
          revenue
        };
      });
    
    return {
      summary: {
        totalCustomers: customers.length,
        newCustomers: newCustomers.length,
        segments,
        dateRange
      },
      topCustomers,
      newCustomers,
      segments
    };
  };
  
  // Financial Report Generator
  const generateFinancialReport = async (dateRange, filters) => {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('tenantId', '==', tenant.id),
      where('createdAt', '>=', dateRange.start.toISOString()),
      where('createdAt', '<=', dateRange.end.toISOString()),
      where('status', 'in', ['completed', 'delivered'])
    );
    
    const snapshot = await getDocs(ordersQuery);
    const orders = snapshot.docs.map(doc => doc.data());
    
    // Calculate financials
    const revenue = orders.reduce((sum, order) => sum + order.subtotal, 0);
    const tax = orders.reduce((sum, order) => sum + (order.tax || 0), 0);
    const tips = orders.reduce((sum, order) => sum + (order.tip || 0), 0);
    const deliveryFees = orders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
    const discounts = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
    
    const totalRevenue = revenue + tax + tips + deliveryFees - discounts;
    
    // Payment processing fees (estimate at 2.9% + 0.30)
    const processingFees = orders.reduce((sum, order) => {
      return sum + (order.total * 0.029 + 0.30);
    }, 0);
    
    // Group by payment method
    const revenueByPayment = orders.reduce((acc, order) => {
      if (!acc[order.paymentMethod]) {
        acc[order.paymentMethod] = 0;
      }
      acc[order.paymentMethod] += order.total;
      return acc;
    }, {});
    
    return {
      summary: {
        revenue,
        tax,
        tips,
        deliveryFees,
        discounts,
        totalRevenue,
        processingFees,
        netRevenue: totalRevenue - processingFees,
        orderCount: orders.length,
        averageOrderValue: totalRevenue / orders.length || 0,
        dateRange
      },
      revenueByPayment,
      dailyRevenue: calculateDailyRevenue(orders)
    };
  };
  
  // Helper: Calculate daily revenue
  const calculateDailyRevenue = (orders) => {
    const dailyRevenue = {};
    
    orders.forEach(order => {
      const date = format(new Date(order.createdAt), 'yyyy-MM-dd');
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = {
          revenue: 0,
          orders: 0,
          tax: 0,
          tips: 0
        };
      }
      dailyRevenue[date].revenue += order.subtotal;
      dailyRevenue[date].orders += 1;
      dailyRevenue[date].tax += order.tax || 0;
      dailyRevenue[date].tips += order.tip || 0;
    });
    
    return dailyRevenue;
  };
  
  // Schedule Report
  const scheduleReport = useCallback(async ({
    type,
    format,
    schedule,
    filters = {},
    options = {},
    emails = []
  }) => {
    if (!tenant?.id) {
      throw new Error('No tenant selected');
    }
    
    try {
      const scheduledReport = {
        type,
        format,
        schedule,
        filters,
        options,
        emails,
        tenantId: tenant.id,
        createdBy: user?.uid,
        createdAt: new Date().toISOString(),
        active: true,
        lastRun: null,
        nextRun: calculateNextRun(schedule)
      };
      
      const docRef = await addDoc(
        collection(db, SCHEDULED_REPORTS_COLLECTION), 
        scheduledReport
      );
      
      await loadScheduledReports();
      
      return docRef.id;
    } catch (err) {
      console.error('Error scheduling report:', err);
      throw err;
    }
  }, [tenant?.id, user?.uid]);
  
  // Calculate next run time
  const calculateNextRun = (schedule) => {
    const now = new Date();
    
    switch (schedule.frequency) {
      case 'daily':
        const [hours, minutes] = schedule.time.split(':');
        const nextRun = new Date(now);
        nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        return nextRun.toISOString();
        
      case 'weekly':
        // Implement weekly logic
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
      case 'monthly':
        // Implement monthly logic
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString();
        
      default:
        return null;
    }
  };
  
  // Get Scheduled Reports
  const getScheduledReports = useCallback(async () => {
    if (!tenant?.id) return [];
    
    try {
      const scheduledQuery = query(
        collection(db, SCHEDULED_REPORTS_COLLECTION),
        where('tenantId', '==', tenant.id),
        where('active', '==', true)
      );
      
      const snapshot = await getDocs(scheduledQuery);
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setScheduledReports(reports);
      return reports;
    } catch (err) {
      console.error('Error loading scheduled reports:', err);
      return [];
    }
  }, [tenant?.id]);
  
  // Load scheduled reports
  const loadScheduledReports = useCallback(async () => {
    await getScheduledReports();
  }, [getScheduledReports]);
  
  // Update Scheduled Report
  const updateScheduledReport = useCallback(async (reportId, updates) => {
    try {
      await updateDoc(
        doc(db, SCHEDULED_REPORTS_COLLECTION, reportId),
        {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      );
      
      await loadScheduledReports();
    } catch (err) {
      console.error('Error updating scheduled report:', err);
      throw err;
    }
  }, [loadScheduledReports]);
  
  // Delete Scheduled Report
  const deleteScheduledReport = useCallback(async (reportId) => {
    try {
      await deleteDoc(doc(db, SCHEDULED_REPORTS_COLLECTION, reportId));
      await loadScheduledReports();
    } catch (err) {
      console.error('Error deleting scheduled report:', err);
      throw err;
    }
  }, [loadScheduledReports]);
  
  // Initial load
  useEffect(() => {
    if (tenant?.id) {
      loadReports();
      loadScheduledReports();
    }
  }, [tenant?.id, loadReports, loadScheduledReports]);
  
  return {
    // State
    reports,
    scheduledReports,
    loading,
    error,
    generatingReport,
    
    // Actions
    generateReport,
    scheduleReport,
    getScheduledReports,
    updateScheduledReport,
    deleteScheduledReport,
    loadReports,
    
    // Utils
    calculateDateRange,
    REPORT_TYPES,
    REPORT_FORMATS
  };
};