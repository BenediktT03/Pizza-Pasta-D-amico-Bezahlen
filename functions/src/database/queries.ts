/**
 * EATECH Database Queries
 * 
 * Common database queries and query builders for Firestore
 * Provides optimized, reusable queries for all collections
 */

import * as admin from 'firebase-admin';
import { 
  OrderStatus, 
  PaymentStatus,
  PaymentMethod,
  TenantPlan,
  TenantStatus
} from '../types/order.types';
import { CustomerTier } from '../types/customer.types';
import { ProductCategory } from '../types/product.types';

const db = admin.firestore();

// ============================================================================
// TYPES
// ============================================================================
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  startAfter?: any;
  endBefore?: any;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  lastDoc?: admin.firestore.DocumentSnapshot;
}

// ============================================================================
// TENANT QUERIES
// ============================================================================
export const tenantQueries = {
  /**
   * Get active tenants
   */
  getActiveTenants: async (options: QueryOptions = {}): Promise<PaginatedResult<any>> => {
    let query = db.collection('tenants')
      .where('billing.status', '==', 'active');
    
    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.startAfter) {
      query = query.startAfter(options.startAfter);
    }
    
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return {
      data,
      total: snapshot.size,
      hasMore: snapshot.size === options.limit,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
    };
  },
  
  /**
   * Get tenants by plan
   */
  getTenantsByPlan: async (plan: TenantPlan): Promise<any[]> => {
    const snapshot = await db.collection('tenants')
      .where('billing.plan', '==', plan)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Get tenant with stats
   */
  getTenantWithStats: async (tenantId: string): Promise<any> => {
    const [tenantDoc, ordersSnapshot, customersSnapshot, productsSnapshot] = await Promise.all([
      db.collection('tenants').doc(tenantId).get(),
      db.collection(`tenants/${tenantId}/orders`)
        .where('status', '==', 'completed')
        .get(),
      db.collection(`tenants/${tenantId}/customers`).get(),
      db.collection(`tenants/${tenantId}/products`)
        .where('available', '==', true)
        .get(),
    ]);
    
    if (!tenantDoc.exists) {
      throw new Error('Tenant not found');
    }
    
    const tenant = { id: tenantDoc.id, ...tenantDoc.data() };
    
    // Calculate stats
    const totalRevenue = ordersSnapshot.docs.reduce((sum, doc) => {
      const order = doc.data();
      return sum + (order.pricing?.total || 0);
    }, 0);
    
    return {
      ...tenant,
      stats: {
        ...tenant.stats,
        totalOrders: ordersSnapshot.size,
        totalRevenue,
        totalCustomers: customersSnapshot.size,
        activeProducts: productsSnapshot.size,
      },
    };
  },
};

// ============================================================================
// ORDER QUERIES
// ============================================================================
export const orderQueries = {
  /**
   * Get orders by status
   */
  getOrdersByStatus: async (
    tenantId: string,
    status: OrderStatus,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<any>> => {
    let query = db.collection(`tenants/${tenantId}/orders`)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc');
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.startAfter) {
      query = query.startAfter(options.startAfter);
    }
    
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return {
      data,
      total: snapshot.size,
      hasMore: snapshot.size === options.limit,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
    };
  },
  
  /**
   * Get orders by date range
   */
  getOrdersByDateRange: async (
    tenantId: string,
    dateRange: DateRange,
    options: QueryOptions = {}
  ): Promise<any[]> => {
    let query = db.collection(`tenants/${tenantId}/orders`)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(dateRange.start))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(dateRange.end))
      .orderBy('createdAt', 'desc');
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Get customer orders
   */
  getCustomerOrders: async (
    tenantId: string,
    customerId: string,
    options: QueryOptions = {}
  ): Promise<any[]> => {
    let query = db.collection(`tenants/${tenantId}/orders`)
      .where('customerId', '==', customerId)
      .orderBy('createdAt', 'desc');
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Get today's orders
   */
  getTodayOrders: async (tenantId: string): Promise<any[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return orderQueries.getOrdersByDateRange(tenantId, {
      start: today,
      end: tomorrow,
    });
  },
  
  /**
   * Get pending orders count
   */
  getPendingOrdersCount: async (tenantId: string): Promise<number> => {
    const snapshot = await db.collection(`tenants/${tenantId}/orders`)
      .where('status', 'in', ['pending', 'confirmed', 'preparing'])
      .count()
      .get();
    
    return snapshot.data().count;
  },
};

// ============================================================================
// CUSTOMER QUERIES
// ============================================================================
export const customerQueries = {
  /**
   * Get VIP customers
   */
  getVIPCustomers: async (tenantId: string, minSpent: number = 1000): Promise<any[]> => {
    const snapshot = await db.collection(`tenants/${tenantId}/customers`)
      .where('stats.totalSpent', '>=', minSpent)
      .orderBy('stats.totalSpent', 'desc')
      .limit(100)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Get customers by tier
   */
  getCustomersByTier: async (tenantId: string, tier: CustomerTier): Promise<any[]> => {
    const snapshot = await db.collection(`tenants/${tenantId}/customers`)
      .where('loyalty.tier', '==', tier)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Get inactive customers
   */
  getInactiveCustomers: async (
    tenantId: string,
    daysSinceLastOrder: number = 30
  ): Promise<any[]> => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastOrder);
    
    const snapshot = await db.collection(`tenants/${tenantId}/customers`)
      .where('stats.lastOrderDate', '<=', cutoffDate.toISOString())
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Search customers
   */
  searchCustomers: async (
    tenantId: string,
    searchTerm: string,
    options: QueryOptions = {}
  ): Promise<any[]> => {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - consider using Algolia for production
    const snapshot = await db.collection(`tenants/${tenantId}/customers`)
      .orderBy('profile.lastName')
      .limit(options.limit || 50)
      .get();
    
    const searchLower = searchTerm.toLowerCase();
    const results = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(customer => {
        const firstName = customer.profile?.firstName?.toLowerCase() || '';
        const lastName = customer.profile?.lastName?.toLowerCase() || '';
        const email = customer.email?.toLowerCase() || '';
        const phone = customer.phone || '';
        
        return firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(searchTerm);
      });
    
    return results;
  },
};

// ============================================================================
// PRODUCT QUERIES
// ============================================================================
export const productQueries = {
  /**
   * Get available products
   */
  getAvailableProducts: async (
    tenantId: string,
    category?: ProductCategory
  ): Promise<any[]> => {
    let query = db.collection(`tenants/${tenantId}/products`)
      .where('available', '==', true);
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    query = query.orderBy('sortOrder', 'asc');
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Get featured products
   */
  getFeaturedProducts: async (tenantId: string, limit: number = 10): Promise<any[]> => {
    const snapshot = await db.collection(`tenants/${tenantId}/products`)
      .where('available', '==', true)
      .where('featured', '==', true)
      .orderBy('sortOrder', 'asc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Get best sellers
   */
  getBestSellers: async (tenantId: string, limit: number = 10): Promise<any[]> => {
    const snapshot = await db.collection(`tenants/${tenantId}/products`)
      .where('available', '==', true)
      .orderBy('stats.soldCount', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  /**
   * Get low stock products
   */
  getLowStockProducts: async (
    tenantId: string,
    threshold: number = 10
  ): Promise<any[]> => {
    const snapshot = await db.collection(`tenants/${tenantId}/products`)
      .where('stock.quantity', '<=', threshold)
      .where('stock.trackInventory', '==', true)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
};

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================
export const analyticsQueries = {
  /**
   * Get revenue by date range
   */
  getRevenueByDateRange: async (
    tenantId: string,
    dateRange: DateRange
  ): Promise<number> => {
    const snapshot = await db.collection(`tenants/${tenantId}/orders`)
      .where('status', '==', 'completed')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(dateRange.start))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(dateRange.end))
      .get();
    
    return snapshot.docs.reduce((sum, doc) => {
      const order = doc.data();
      return sum + (order.pricing?.total || 0);
    }, 0);
  },
  
  /**
   * Get order count by hour
   */
  getOrderCountByHour: async (
    tenantId: string,
    date: Date
  ): Promise<Map<number, number>> => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const snapshot = await db.collection(`tenants/${tenantId}/orders`)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
      .get();
    
    const hourCounts = new Map<number, number>();
    
    snapshot.docs.forEach(doc => {
      const order = doc.data();
      const hour = order.createdAt.toDate().getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    
    return hourCounts;
  },
  
  /**
   * Get popular items
   */
  getPopularItems: async (
    tenantId: string,
    dateRange: DateRange,
    limit: number = 10
  ): Promise<any[]> => {
    const snapshot = await db.collection(`tenants/${tenantId}/orders`)
      .where('status', '==', 'completed')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(dateRange.start))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(dateRange.end))
      .get();
    
    // Aggregate items
    const itemCounts = new Map<string, { name: string; count: number; revenue: number }>();
    
    snapshot.docs.forEach(doc => {
      const order = doc.data();
      order.items?.forEach((item: any) => {
        const existing = itemCounts.get(item.productId) || {
          name: item.productName,
          count: 0,
          revenue: 0,
        };
        
        existing.count += item.quantity;
        existing.revenue += item.total;
        
        itemCounts.set(item.productId, existing);
      });
    });
    
    // Sort by count and return top items
    return Array.from(itemCounts.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
  
  /**
   * Get customer acquisition rate
   */
  getCustomerAcquisitionRate: async (
    tenantId: string,
    dateRange: DateRange
  ): Promise<{ new: number; returning: number }> => {
    const snapshot = await db.collection(`tenants/${tenantId}/customers`)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(dateRange.start))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(dateRange.end))
      .get();
    
    const newCustomers = snapshot.size;
    
    const returningSnapshot = await db.collection(`tenants/${tenantId}/customers`)
      .where('stats.totalOrders', '>', 1)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(dateRange.start))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(dateRange.end))
      .get();
    
    return {
      new: newCustomers,
      returning: returningSnapshot.size,
    };
  },
};

// ============================================================================
// AGGREGATE QUERIES
// ============================================================================
export const aggregateQueries = {
  /**
   * Get platform statistics
   */
  getPlatformStats: async (): Promise<any> => {
    const [tenantsSnapshot, ordersCount, totalRevenue] = await Promise.all([
      db.collection('tenants').get(),
      db.collectionGroup('orders').count().get(),
      aggregateQueries.getTotalPlatformRevenue(),
    ]);
    
    return {
      totalTenants: tenantsSnapshot.size,
      activeTenants: tenantsSnapshot.docs.filter(doc => 
        doc.data().billing?.status === 'active'
      ).length,
      totalOrders: ordersCount.data().count,
      totalRevenue,
      averageRevenuePerTenant: totalRevenue / tenantsSnapshot.size,
    };
  },
  
  /**
   * Get total platform revenue
   */
  getTotalPlatformRevenue: async (): Promise<number> => {
    // Note: This is a simplified version. In production, you'd want to
    // use aggregation functions or BigQuery for better performance
    const ordersSnapshot = await db.collectionGroup('orders')
      .where('status', '==', 'completed')
      .where('payment.status', '==', 'paid')
      .get();
    
    return ordersSnapshot.docs.reduce((sum, doc) => {
      const order = doc.data();
      return sum + (order.pricing?.total || 0);
    }, 0);
  },
  
  /**
   * Get tenant rankings
   */
  getTenantRankings: async (
    metric: 'revenue' | 'orders' | 'customers',
    limit: number = 10
  ): Promise<any[]> => {
    const tenants = await db.collection('tenants')
      .where('billing.status', '==', 'active')
      .get();
    
    const rankings = await Promise.all(
      tenants.docs.map(async (tenantDoc) => {
        const tenant = { id: tenantDoc.id, ...tenantDoc.data() };
        
        let value = 0;
        switch (metric) {
          case 'revenue':
            value = tenant.stats?.totalRevenue || 0;
            break;
          case 'orders':
            value = tenant.stats?.totalOrders || 0;
            break;
          case 'customers':
            value = tenant.stats?.totalCustomers || 0;
            break;
        }
        
        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          value,
        };
      })
    );
    
    return rankings
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  },
};

// ============================================================================
// QUERY HELPERS
// ============================================================================
export const queryHelpers = {
  /**
   * Execute query with retry
   */
  executeWithRetry: async <T>(
    queryFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await queryFn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's a permission error
        if (error.code === 'permission-denied') {
          throw error;
        }
        
        // Exponential backoff
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    throw lastError;
  },
  
  /**
   * Batch get documents
   */
  batchGet: async (
    refs: admin.firestore.DocumentReference[]
  ): Promise<admin.firestore.DocumentSnapshot[]> => {
    const chunks = [];
    
    // Firestore allows max 10 documents per batch get
    for (let i = 0; i < refs.length; i += 10) {
      chunks.push(refs.slice(i, i + 10));
    }
    
    const results = await Promise.all(
      chunks.map(chunk => db.getAll(...chunk))
    );
    
    return results.flat();
  },
  
  /**
   * Stream query results
   */
  streamQuery: async function* <T>(
    query: admin.firestore.Query,
    batchSize: number = 100
  ): AsyncGenerator<T[]> {
    let lastDoc: admin.firestore.DocumentSnapshot | undefined;
    let hasMore = true;
    
    while (hasMore) {
      let batchQuery = query.limit(batchSize);
      
      if (lastDoc) {
        batchQuery = batchQuery.startAfter(lastDoc);
      }
      
      const snapshot = await batchQuery.get();
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }
      
      const batch = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      yield batch;
      
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      hasMore = snapshot.size === batchSize;
    }
  },
};