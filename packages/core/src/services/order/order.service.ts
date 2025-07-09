import { firestoreService } from '../database/firestore.service';
import { realtimeService } from '../database/realtime.service';
import { validateOrder, calculateOrderTotals, generateOrderNumber } from './order.validator';
import { Order, OrderItem, OrderStatus, OrderType, CreateOrderData, UpdateOrderData } from '@eatech/types';

export interface OrderFilters {
  tenantId?: string;
  status?: OrderStatus | OrderStatus[];
  type?: OrderType;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface OrderMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByType: Record<OrderType, number>;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export class OrderService {
  private readonly COLLECTION = 'orders';
  private readonly REALTIME_PATH = 'orders';

  /**
   * Create a new order
   */
  async createOrder(data: CreateOrderData): Promise<Order> {
    try {
      // Validate order data
      const validation = validateOrder(data);
      if (!validation.isValid) {
        throw new Error(`Invalid order data: ${validation.errors.join(', ')}`);
      }

      // Calculate totals
      const totals = calculateOrderTotals(data.items);

      // Generate order number
      const orderNumber = await generateOrderNumber(data.tenantId);

      // Create order object
      const order: Partial<Order> = {
        ...data,
        orderNumber,
        status: 'pending',
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to Firestore
      const orderId = await firestoreService.createDocument(this.COLLECTION, order);

      // Update realtime database for live tracking
      await realtimeService.set(`${this.REALTIME_PATH}/${orderId}`, {
        id: orderId,
        ...order,
        createdAt: order.createdAt?.toISOString(),
        updatedAt: order.updatedAt?.toISOString(),
      });

      return { id: orderId, ...order } as Order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      return await firestoreService.getDocument<Order>(this.COLLECTION, orderId);
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  }

  /**
   * Get orders with filters
   */
  async getOrders(filters: OrderFilters = {}): Promise<Order[]> {
    try {
      const queryOptions: any = {
        where: [],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      };

      // Apply filters
      if (filters.tenantId) {
        queryOptions.where.push({
          field: 'tenantId',
          operator: '==',
          value: filters.tenantId,
        });
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          queryOptions.where.push({
            field: 'status',
            operator: 'in',
            value: filters.status,
          });
        } else {
          queryOptions.where.push({
            field: 'status',
            operator: '==',
            value: filters.status,
          });
        }
      }

      if (filters.type) {
        queryOptions.where.push({
          field: 'type',
          operator: '==',
          value: filters.type,
        });
      }

      if (filters.customerId) {
        queryOptions.where.push({
          field: 'customerId',
          operator: '==',
          value: filters.customerId,
        });
      }

      if (filters.startDate) {
        queryOptions.where.push({
          field: 'createdAt',
          operator: '>=',
          value: filters.startDate,
        });
      }

      if (filters.endDate) {
        queryOptions.where.push({
          field: 'createdAt',
          operator: '<=',
          value: filters.endDate,
        });
      }

      if (filters.minAmount) {
        queryOptions.where.push({
          field: 'total',
          operator: '>=',
          value: filters.minAmount,
        });
      }

      if (filters.maxAmount) {
        queryOptions.where.push({
          field: 'total',
          operator: '<=',
          value: filters.maxAmount,
        });
      }

      const orders = await firestoreService.queryDocuments<Order>(
        this.COLLECTION,
        queryOptions
      );

      // Apply text search if provided
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return orders.filter(order =>
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.customerName?.toLowerCase().includes(searchLower) ||
          order.customerEmail?.toLowerCase().includes(searchLower)
        );
      }

      return orders;
    } catch (error) {
      console.error('Error getting orders:', error);
      throw error;
    }
  }

  /**
   * Update order
   */
  async updateOrder(orderId: string, updates: UpdateOrderData): Promise<void> {
    try {
      // If items are updated, recalculate totals
      if (updates.items) {
        const totals = calculateOrderTotals(updates.items);
        updates.subtotal = totals.subtotal;
        updates.tax = totals.tax;
        updates.total = totals.total;
      }

      // Update Firestore
      await firestoreService.updateDocument(this.COLLECTION, orderId, updates);

      // Update realtime database
      await realtimeService.update(`${this.REALTIME_PATH}/${orderId}`, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    try {
      const updates: UpdateOrderData = {
        status,
        statusHistory: firestoreService.getServerTimestamp() as any,
      };

      // Add status-specific updates
      switch (status) {
        case 'confirmed':
          updates.confirmedAt = new Date();
          break;
        case 'preparing':
          updates.preparingAt = new Date();
          break;
        case 'ready':
          updates.readyAt = new Date();
          break;
        case 'delivered':
          updates.deliveredAt = new Date();
          break;
        case 'cancelled':
          updates.cancelledAt = new Date();
          break;
      }

      await this.updateOrder(orderId, updates);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    try {
      const updates: UpdateOrderData = {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
      };

      await this.updateOrder(orderId, updates);
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Add item to order
   */
  async addOrderItem(orderId: string, item: OrderItem): Promise<void> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const updatedItems = [...order.items, item];
      await this.updateOrder(orderId, { items: updatedItems });
    } catch (error) {
      console.error('Error adding order item:', error);
      throw error;
    }
  }

  /**
   * Remove item from order
   */
  async removeOrderItem(orderId: string, itemId: string): Promise<void> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const updatedItems = order.items.filter(item => item.id !== itemId);
      await this.updateOrder(orderId, { items: updatedItems });
    } catch (error) {
      console.error('Error removing order item:', error);
      throw error;
    }
  }

  /**
   * Update order item quantity
   */
  async updateOrderItemQuantity(
    orderId: string,
    itemId: string,
    quantity: number
  ): Promise<void> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const updatedItems = order.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );
      await this.updateOrder(orderId, { items: updatedItems });
    } catch (error) {
      console.error('Error updating order item quantity:', error);
      throw error;
    }
  }

  /**
   * Listen to order changes
   */
  onOrderChange(
    orderId: string,
    callback: (order: Order | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    return realtimeService.onValue(
      `${this.REALTIME_PATH}/${orderId}`,
      (data) => {
        if (data) {
          callback({
            ...data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          } as Order);
        } else {
          callback(null);
        }
      },
      onError
    );
  }

  /**
   * Listen to orders for a tenant
   */
  onTenantOrders(
    tenantId: string,
    callback: (orders: Order[]) => void,
    filters?: {
      status?: OrderStatus[];
      limit?: number;
    },
    onError?: (error: Error) => void
  ): () => void {
    const queryOptions: any = {
      orderBy: 'child',
      orderByField: 'createdAt',
      limitToLast: filters?.limit || 100,
    };

    return realtimeService.onQuery(
      this.REALTIME_PATH,
      queryOptions,
      (data) => {
        let orders = data.filter((order: any) => order.tenantId === tenantId);
        
        if (filters?.status) {
          orders = orders.filter((order: any) => 
            filters.status!.includes(order.status)
          );
        }

        callback(orders.map((order: any) => ({
          ...order,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
        })));
      },
      onError
    );
  }

  /**
   * Get order metrics
   */
  async getOrderMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OrderMetrics> {
    try {
      const orders = await this.getOrders({
        tenantId,
        startDate,
        endDate,
      });

      const metrics: OrderMetrics = {
        totalOrders: orders.length,
        totalRevenue: 0,
        averageOrderValue: 0,
        ordersByStatus: {} as Record<OrderStatus, number>,
        ordersByType: {} as Record<OrderType, number>,
        topProducts: [],
      };

      const productMap = new Map<string, {
        name: string;
        quantity: number;
        revenue: number;
      }>();

      orders.forEach(order => {
        // Revenue
        metrics.totalRevenue += order.total;

        // Status count
        metrics.ordersByStatus[order.status] = 
          (metrics.ordersByStatus[order.status] || 0) + 1;

        // Type count
        metrics.ordersByType[order.type] = 
          (metrics.ordersByType[order.type] || 0) + 1;

        // Product stats
        order.items.forEach(item => {
          const existing = productMap.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.price * item.quantity;
          } else {
            productMap.set(item.productId, {
              name: item.name,
              quantity: item.quantity,
              revenue: item.price * item.quantity,
            });
          }
        });
      });

      // Calculate average
      metrics.averageOrderValue = metrics.totalOrders > 0
        ? metrics.totalRevenue / metrics.totalOrders
        : 0;

      // Get top products
      metrics.topProducts = Array.from(productMap.entries())
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return metrics;
    } catch (error) {
      console.error('Error getting order metrics:', error);
      throw error;
    }
  }

  /**
   * Export orders to CSV
   */
  async exportOrders(
    filters: OrderFilters,
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    try {
      const orders = await this.getOrders(filters);

      if (format === 'json') {
        return JSON.stringify(orders, null, 2);
      }

      // CSV format
      const headers = [
        'Order Number',
        'Date',
        'Status',
        'Type',
        'Customer',
        'Items',
        'Subtotal',
        'Tax',
        'Total',
      ];

      const rows = orders.map(order => [
        order.orderNumber,
        order.createdAt.toISOString(),
        order.status,
        order.type,
        order.customerName || order.customerEmail || 'Guest',
        order.items.length,
        order.subtotal.toFixed(2),
        order.tax.toFixed(2),
        order.total.toFixed(2),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      return csv;
    } catch (error) {
      console.error('Error exporting orders:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const orderService = new OrderService();
