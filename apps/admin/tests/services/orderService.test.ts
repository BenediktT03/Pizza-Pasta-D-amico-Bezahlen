/**
 * File: /apps/admin/tests/services/orderService.test.ts
 * EATECH V3.0 - Admin Order Service Tests
 * Swiss foodtruck order management API with real-time updates and kitchen integration
 */

import { ApiService } from '@/services/apiService';
import { NotificationService } from '@/services/notificationService';
import { OrderService } from '@/services/orderService';
import { RealtimeService } from '@/services/realtimeService';

// Mock dependencies
jest.mock('@/services/apiService');
jest.mock('@/services/realtimeService');
jest.mock('@/services/notificationService');

const mockApiService = ApiService as jest.MockedClass<typeof ApiService>;
const mockRealtimeService = RealtimeService as jest.MockedClass<typeof RealtimeService>;
const mockNotificationService = NotificationService as jest.MockedClass<typeof NotificationService>;

// Swiss order test data
const swissOrderData = {
  id: 'ord_zg_12345',
  orderNumber: 'ZG-2025-0042',
  tenantId: 'zuercher-genuss',
  type: 'pickup',
  status: 'confirmed',
  customer: {
    id: 'cust_123',
    name: 'Hans Müller',
    phone: '+41791234567',
    email: 'hans.mueller@example.ch'
  },
  items: [
    {
      id: 'item_1',
      productId: 'prod_geschnetzeltes',
      productName: 'Zürcher Geschnetzeltes',
      variantId: 'var_regular',
      variantName: 'Normal (350g)',
      quantity: 1,
      unitPrice: 24.90,
      modifiers: [
        {
          groupId: 'sides',
          groupName: 'Beilage',
          optionId: 'roesti',
          optionName: 'Rösti',
          price: 0
        },
        {
          groupId: 'extras',
          groupName: 'Extras',
          optionId: 'extra_sauce',
          optionName: 'Extra Sauce',
          price: 2.00
        }
      ],
      modifiersPrice: 2.00,
      itemPrice: 26.90,
      totalPrice: 26.90,
      notes: 'Ohne Zwiebeln bitte'
    }
  ],
  pricing: {
    subtotal: 26.90,
    taxRate: 7.7,
    taxAmount: 2.07,
    total: 26.90,
    currency: 'CHF'
  },
  timing: {
    orderTime: '2025-01-07T12:30:00Z',
    requestedTime: '2025-01-07T13:00:00Z',
    estimatedReadyTime: '2025-01-07T12:45:00Z',
    confirmedAt: '2025-01-07T12:31:00Z'
  },
  kitchen: {
    station: 'grill',
    priority: 'normal',
    preparationTime: 15,
    notes: 'Extra scharf'
  },
  payment: {
    method: 'card',
    status: 'paid',
    amount: 26.90
  }
};

const mockKitchenUpdate = {
  orderId: 'ord_zg_12345',
  status: 'preparing',
  station: 'grill',
  estimatedTime: 12,
  notes: 'In progress'
};

describe('OrderService', () => {
  let orderService: OrderService;
  let mockApi: jest.Mocked<ApiService>;
  let mockRealtime: jest.Mocked<RealtimeService>;
  let mockNotifications: jest.Mocked<NotificationService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockApi = new mockApiService() as jest.Mocked<ApiService>;
    mockRealtime = new mockRealtimeService() as jest.Mocked<RealtimeService>;
    mockNotifications = new mockNotificationService() as jest.Mocked<NotificationService>;

    orderService = new OrderService({
      api: mockApi,
      realtime: mockRealtime,
      notifications: mockNotifications
    });

    // Setup default API responses
    mockApi.get.mockResolvedValue({ data: [] });
    mockApi.post.mockResolvedValue({ data: swissOrderData });
    mockApi.patch.mockResolvedValue({ data: swissOrderData });
    mockRealtime.subscribe.mockReturnValue(() => {});
    mockNotifications.show.mockResolvedValue(undefined);
  });

  describe('Order Retrieval', () => {
    it('should fetch orders with Swiss formatting', async () => {
      const mockOrders = [swissOrderData];
      mockApi.get.mockResolvedValue({ data: mockOrders });

      const result = await orderService.getOrders({
        tenantId: 'zuercher-genuss',
        date: '2025-01-07'
      });

      expect(mockApi.get).toHaveBeenCalledWith('/tenants/zuercher-genuss/orders', {
        params: {
          date: '2025-01-07',
          timezone: 'Europe/Zurich'
        }
      });

      expect(result).toEqual(mockOrders);
    });

    it('should filter orders by status', async () => {
      const filters = {
        tenantId: 'zuercher-genuss',
        status: ['pending', 'confirmed'] as const,
        dateFrom: '2025-01-07T00:00:00Z',
        dateTo: '2025-01-07T23:59:59Z'
      };

      await orderService.getOrders(filters);

      expect(mockApi.get).toHaveBeenCalledWith('/tenants/zuercher-genuss/orders', {
        params: {
          status: 'pending,confirmed',
          dateFrom: '2025-01-07T00:00:00Z',
          dateTo: '2025-01-07T23:59:59Z',
          timezone: 'Europe/Zurich'
        }
      });
    });

    it('should fetch live kitchen orders', async () => {
      const mockKitchenOrders = [
        { ...swissOrderData, status: 'preparing', kitchen: { station: 'grill', elapsedTime: 8 } },
        { ...swissOrderData, id: 'ord_456', status: 'pending', kitchen: { station: 'prep', elapsedTime: 2 } }
      ];

      mockApi.get.mockResolvedValue({ data: mockKitchenOrders });

      const result = await orderService.getKitchenOrders('zuercher-genuss');

      expect(mockApi.get).toHaveBeenCalledWith('/tenants/zuercher-genuss/orders/kitchen', {
        params: { includeElapsed: true }
      });

      expect(result).toEqual(mockKitchenOrders);
    });

    it('should get single order by ID', async () => {
      mockApi.get.mockResolvedValue({ data: swissOrderData });

      const result = await orderService.getOrderById('ord_zg_12345');

      expect(mockApi.get).toHaveBeenCalledWith('/orders/ord_zg_12345');
      expect(result).toEqual(swissOrderData);
    });

    it('should get order by order number', async () => {
      mockApi.get.mockResolvedValue({ data: swissOrderData });

      const result = await orderService.getOrderByNumber('ZG-2025-0042');

      expect(mockApi.get).toHaveBeenCalledWith('/orders/by-number/ZG-2025-0042');
      expect(result).toEqual(swissOrderData);
    });
  });

  describe('Order Status Management', () => {
    it('should update order status with Swiss compliance', async () => {
      const statusUpdate = {
        orderId: 'ord_zg_12345',
        status: 'preparing' as const,
        estimatedReadyTime: '2025-01-07T12:45:00Z',
        notes: 'Started cooking'
      };

      const updatedOrder = { ...swissOrderData, status: 'preparing' };
      mockApi.patch.mockResolvedValue({ data: updatedOrder });

      const result = await orderService.updateOrderStatus(statusUpdate);

      expect(mockApi.patch).toHaveBeenCalledWith('/orders/ord_zg_12345/status', {
        status: 'preparing',
        estimatedReadyTime: '2025-01-07T12:45:00Z',
        notes: 'Started cooking',
        updatedBy: expect.any(String),
        updatedAt: expect.any(String)
      });

      expect(result).toEqual(updatedOrder);
    });

    it('should handle kitchen status updates', async () => {
      const kitchenUpdate = {
        orderId: 'ord_zg_12345',
        station: 'grill',
        status: 'preparing',
        preparationTime: 12,
        staffId: 'staff_kitchen_01'
      };

      await orderService.updateKitchenStatus(kitchenUpdate);

      expect(mockApi.patch).toHaveBeenCalledWith('/orders/ord_zg_12345/kitchen', {
        station: 'grill',
        status: 'preparing',
        preparationTime: 12,
        staffId: 'staff_kitchen_01',
        timestamp: expect.any(String)
      });
    });

    it('should bump order in kitchen queue', async () => {
      const bumpData = {
        orderId: 'ord_zg_12345',
        station: 'grill',
        completedBy: 'staff_chef_01'
      };

      await orderService.bumpOrder(bumpData);

      expect(mockApi.patch).toHaveBeenCalledWith('/orders/ord_zg_12345/bump', {
        station: 'grill',
        completedBy: 'staff_chef_01',
        bumpedAt: expect.any(String),
        newStatus: 'ready'
      });
    });

    it('should validate status transitions', async () => {
      // Try invalid status transition
      const invalidUpdate = {
        orderId: 'ord_zg_12345',
        status: 'completed' as const // Can't go directly from confirmed to completed
      };

      mockApi.patch.mockRejectedValue({
        status: 400,
        message: 'Invalid status transition'
      });

      await expect(orderService.updateOrderStatus(invalidUpdate))
        .rejects.toThrow('Invalid status transition');
    });
  });

  describe('Order Modifications', () => {
    it('should allow order item modifications', async () => {
      const modifications = {
        orderId: 'ord_zg_12345',
        items: [
          {
            id: 'item_1',
            quantity: 2,
            notes: 'Extra scharf, ohne Zwiebeln'
          }
        ],
        reason: 'Customer request'
      };

      await orderService.modifyOrder(modifications);

      expect(mockApi.patch).toHaveBeenCalledWith('/orders/ord_zg_12345', {
        items: [
          {
            id: 'item_1',
            quantity: 2,
            notes: 'Extra scharf, ohne Zwiebeln'
          }
        ],
        reason: 'Customer request',
        modifiedBy: expect.any(String),
        modifiedAt: expect.any(String)
      });
    });

    it('should handle order cancellation', async () => {
      const cancellationData = {
        orderId: 'ord_zg_12345',
        reason: 'Customer request',
        refundAmount: 26.90,
        notifyCustomer: true
      };

      await orderService.cancelOrder(cancellationData);

      expect(mockApi.patch).toHaveBeenCalledWith('/orders/ord_zg_12345/cancel', {
        reason: 'Customer request',
        refundAmount: 26.90,
        notifyCustomer: true,
        cancelledBy: expect.any(String),
        cancelledAt: expect.any(String)
      });
    });

    it('should process order refunds', async () => {
      const refundData = {
        orderId: 'ord_zg_12345',
        amount: 26.90,
        reason: 'Order error',
        paymentMethod: 'card',
        refundToOriginal: true
      };

      const refundResult = {
        refundId: 'ref_12345',
        amount: 26.90,
        status: 'processed',
        processedAt: '2025-01-07T13:00:00Z'
      };

      mockApi.post.mockResolvedValue({ data: refundResult });

      const result = await orderService.processRefund(refundData);

      expect(mockApi.post).toHaveBeenCalledWith('/orders/ord_zg_12345/refund', {
        amount: 26.90,
        reason: 'Order error',
        paymentMethod: 'card',
        refundToOriginal: true,
        processedBy: expect.any(String)
      });

      expect(result).toEqual(refundResult);
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to order updates', () => {
      const tenantId = 'zuercher-genuss';
      const callback = jest.fn();

      orderService.subscribeToOrderUpdates(tenantId, callback);

      expect(mockRealtime.subscribe).toHaveBeenCalledWith(
        `orders:${tenantId}`,
        callback
      );
    });

    it('should handle real-time order status changes', () => {
      const tenantId = 'zuercher-genuss';
      const callback = jest.fn();

      orderService.subscribeToOrderUpdates(tenantId, callback);

      // Simulate real-time update
      const updateData = {
        orderId: 'ord_zg_12345',
        status: 'ready',
        estimatedReadyTime: '2025-01-07T12:43:00Z'
      };

      const subscribeCall = mockRealtime.subscribe.mock.calls[0];
      const realtimeCallback = subscribeCall[1];
      realtimeCallback(updateData);

      expect(callback).toHaveBeenCalledWith(updateData);
    });

    it('should subscribe to kitchen updates', () => {
      const callback = jest.fn();

      orderService.subscribeToKitchenUpdates('zuercher-genuss', callback);

      expect(mockRealtime.subscribe).toHaveBeenCalledWith(
        'kitchen:zuercher-genuss',
        callback
      );
    });

    it('should handle kitchen queue changes', () => {
      const callback = jest.fn();
      orderService.subscribeToKitchenUpdates('zuercher-genuss', callback);

      const kitchenUpdate = {
        type: 'ORDER_BUMPED',
        orderId: 'ord_zg_12345',
        station: 'grill',
        newPosition: 0 // Moved to top of queue
      };

      const subscribeCall = mockRealtime.subscribe.mock.calls[0];
      const realtimeCallback = subscribeCall[1];
      realtimeCallback(kitchenUpdate);

      expect(callback).toHaveBeenCalledWith(kitchenUpdate);
    });
  });

  describe('Notifications', () => {
    it('should send SMS notifications for order status', async () => {
      const notificationData = {
        orderId: 'ord_zg_12345',
        customer: {
          phone: '+41791234567',
          name: 'Hans Müller'
        },
        status: 'ready',
        message: 'Ihre Bestellung ZG-2025-0042 ist bereit zur Abholung!'
      };

      await orderService.sendOrderNotification(notificationData);

      expect(mockNotifications.sendSMS).toHaveBeenCalledWith({
        to: '+41791234567',
        message: 'Ihre Bestellung ZG-2025-0042 ist bereit zur Abholung!',
        templateId: 'order_ready_sms'
      });
    });

    it('should send push notifications to admin staff', async () => {
      const staffNotification = {
        type: 'NEW_ORDER',
        orderId: 'ord_zg_12345',
        orderNumber: 'ZG-2025-0042',
        customerName: 'Hans Müller',
        total: 26.90,
        priority: 'normal'
      };

      await orderService.notifyStaff(staffNotification);

      expect(mockNotifications.sendPush).toHaveBeenCalledWith({
        title: 'Neue Bestellung',
        body: 'ZG-2025-0042 von Hans Müller - CHF 26.90',
        data: {
          orderId: 'ord_zg_12345',
          type: 'NEW_ORDER'
        },
        recipients: ['admin', 'kitchen']
      });
    });

    it('should handle notification preferences', async () => {
      const preferences = {
        sms: true,
        push: true,
        email: false
      };

      const notificationData = {
        orderId: 'ord_zg_12345',
        customer: {
          phone: '+41791234567',
          email: 'hans@example.ch',
          preferences
        },
        status: 'ready'
      };

      await orderService.sendOrderNotification(notificationData);

      expect(mockNotifications.sendSMS).toHaveBeenCalled();
      expect(mockNotifications.sendPush).toHaveBeenCalled();
      expect(mockNotifications.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('Kitchen Display System Integration', () => {
    it('should format orders for kitchen display', async () => {
      const mockKitchenOrders = [swissOrderData];
      mockApi.get.mockResolvedValue({ data: mockKitchenOrders });

      const result = await orderService.getKitchenDisplayData('zuercher-genuss');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            orderNumber: 'ZG-2025-0042',
            customerName: 'Hans Müller',
            items: expect.arrayContaining([
              expect.objectContaining({
                name: 'Zürcher Geschnetzeltes',
                quantity: 1,
                modifiers: ['+ Rösti', '+ Extra Sauce'],
                notes: 'Ohne Zwiebeln bitte'
              })
            ]),
            elapsedTime: expect.any(Number),
            priority: 'normal',
            allergens: expect.any(Array)
          })
        ])
      );
    });

    it('should prioritize urgent orders in kitchen queue', async () => {
      const orders = [
        { ...swissOrderData, id: 'ord_1', priority: 'normal', orderTime: '2025-01-07T12:30:00Z' },
        { ...swissOrderData, id: 'ord_2', priority: 'urgent', orderTime: '2025-01-07T12:32:00Z' },
        { ...swissOrderData, id: 'ord_3', priority: 'normal', orderTime: '2025-01-07T12:31:00Z' }
      ];

      mockApi.get.mockResolvedValue({ data: orders });

      const result = await orderService.getKitchenDisplayData('zuercher-genuss');

      // Urgent orders should come first, then by time
      expect(result[0].id).toBe('ord_2'); // Urgent
      expect(result[1].id).toBe('ord_1'); // Older normal order
      expect(result[2].id).toBe('ord_3'); // Newer normal order
    });

    it('should handle allergen highlighting for kitchen', async () => {
      const orderWithAllergens = {
        ...swissOrderData,
        items: [
          {
            ...swissOrderData.items[0],
            allergens: {
              contains: ['milk', 'gluten'],
              mayContain: ['nuts']
            }
          }
        ]
      };

      mockApi.get.mockResolvedValue({ data: [orderWithAllergens] });

      const result = await orderService.getKitchenDisplayData('zuercher-genuss');

      expect(result[0].allergenWarnings).toEqual([
        { type: 'contains', allergen: 'milk' },
        { type: 'contains', allergen: 'gluten' },
        { type: 'mayContain', allergen: 'nuts' }
      ]);
    });
  });

  describe('Analytics and Reporting', () => {
    it('should track order performance metrics', async () => {
      const performanceData = {
        orderId: 'ord_zg_12345',
        actualPreparationTime: 14,
        estimatedPreparationTime: 15,
        customerWaitTime: 16,
        kitchenEfficiency: 0.93
      };

      await orderService.trackOrderPerformance(performanceData);

      expect(mockApi.post).toHaveBeenCalledWith('/analytics/order-performance', {
        orderId: 'ord_zg_12345',
        actualPreparationTime: 14,
        estimatedPreparationTime: 15,
        customerWaitTime: 16,
        kitchenEfficiency: 0.93,
        timestamp: expect.any(String)
      });
    });

    it('should generate order completion reports', async () => {
      const reportData = {
        tenantId: 'zuercher-genuss',
        dateFrom: '2025-01-07T00:00:00Z',
        dateTo: '2025-01-07T23:59:59Z',
        groupBy: 'hour'
      };

      const mockReport = {
        completedOrders: 47,
        averagePreparationTime: 14.5,
        onTimeDeliveryRate: 0.94,
        customerSatisfaction: 4.7
      };

      mockApi.get.mockResolvedValue({ data: mockReport });

      const result = await orderService.getCompletionReport(reportData);

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/order-completion', {
        params: reportData
      });

      expect(result).toEqual(mockReport);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApi.get.mockRejectedValue({
        status: 500,
        message: 'Internal server error'
      });

      await expect(orderService.getOrders({ tenantId: 'test' }))
        .rejects.toThrow('Internal server error');
    });

    it('should retry failed status updates', async () => {
      mockApi.patch
        .mockRejectedValueOnce({ status: 503, message: 'Service unavailable' })
        .mockResolvedValueOnce({ data: swissOrderData });

      const statusUpdate = {
        orderId: 'ord_zg_12345',
        status: 'preparing' as const
      };

      const result = await orderService.updateOrderStatus(statusUpdate);

      expect(mockApi.patch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(swissOrderData);
    });

    it('should handle notification failures', async () => {
      mockNotifications.sendSMS.mockRejectedValue(new Error('SMS service down'));

      const notificationData = {
        orderId: 'ord_zg_12345',
        customer: { phone: '+41791234567' },
        status: 'ready' as const
      };

      // Should not throw, but log error
      await expect(orderService.sendOrderNotification(notificationData))
        .resolves.not.toThrow();
    });

    it('should validate Swiss phone numbers for SMS', async () => {
      const invalidNotificationData = {
        orderId: 'ord_zg_12345',
        customer: { phone: '123456' }, // Invalid Swiss format
        status: 'ready' as const
      };

      await expect(orderService.sendOrderNotification(invalidNotificationData))
        .rejects.toThrow('Invalid Swiss phone number format');
    });
  });

  describe('Caching and Performance', () => {
    it('should cache kitchen orders for performance', async () => {
      const mockOrders = [swissOrderData];
      mockApi.get.mockResolvedValue({ data: mockOrders });

      // First call
      await orderService.getKitchenOrders('zuercher-genuss');

      // Second call within cache period
      await orderService.getKitchenOrders('zuercher-genuss');

      // Should only make one API call due to caching
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache on status updates', async () => {
      const mockOrders = [swissOrderData];
      mockApi.get.mockResolvedValue({ data: mockOrders });

      // Get orders (cached)
      await orderService.getKitchenOrders('zuercher-genuss');

      // Update order status (should invalidate cache)
      await orderService.updateOrderStatus({
        orderId: 'ord_zg_12345',
        status: 'preparing'
      });

      // Get orders again (should make new API call)
      await orderService.getKitchenOrders('zuercher-genuss');

      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    it('should batch multiple status updates', async () => {
      const updates = [
        { orderId: 'ord_1', status: 'preparing' as const },
        { orderId: 'ord_2', status: 'ready' as const },
        { orderId: 'ord_3', status: 'completed' as const }
      ];

      await orderService.batchUpdateStatus(updates);

      expect(mockApi.patch).toHaveBeenCalledWith('/orders/batch-update', {
        updates: updates.map(update => ({
          ...update,
          updatedBy: expect.any(String),
          updatedAt: expect.any(String)
        }))
      });
    });
  });

  describe('Swiss Compliance', () => {
    it('should maintain order audit trail for tax compliance', async () => {
      const auditTrail = await orderService.getOrderAuditTrail('ord_zg_12345');

      expect(mockApi.get).toHaveBeenCalledWith('/orders/ord_zg_12345/audit');
      expect(auditTrail).toEqual(
        expect.objectContaining({
          orderId: 'ord_zg_12345',
          events: expect.arrayContaining([
            expect.objectContaining({
              timestamp: expect.any(String),
              action: expect.any(String),
              user: expect.any(String),
              changes: expect.any(Object)
            })
          ])
        })
      );
    });

    it('should generate tax-compliant receipts', async () => {
      const receiptData = {
        orderId: 'ord_zg_12345',
        format: 'pdf',
        language: 'de'
      };

      const mockReceipt = {
        url: 'https://cdn.eatech.ch/receipts/ZG-2025-0042.pdf',
        number: 'R-ZG-2025-0042',
        vatNumber: 'CHE-123.456.789',
        taxBreakdown: {
          netAmount: 24.83,
          vatAmount: 2.07,
          grossAmount: 26.90
        }
      };

      mockApi.post.mockResolvedValue({ data: mockReceipt });

      const result = await orderService.generateReceipt(receiptData);

      expect(mockApi.post).toHaveBeenCalledWith('/orders/ord_zg_12345/receipt', {
        format: 'pdf',
        language: 'de',
        includeVatBreakdown: true,
        compliance: 'swiss'
      });

      expect(result).toEqual(mockReceipt);
    });

    it('should handle FADP data protection requirements', async () => {
      const anonymizationRequest = {
        orderId: 'ord_zg_12345',
        retainForTax: true,
        anonymizeCustomerData: true
      };

      await orderService.anonymizeOrderData(anonymizationRequest);

      expect(mockApi.patch).toHaveBeenCalledWith('/orders/ord_zg_12345/anonymize', {
        retainForTax: true,
        anonymizeCustomerData: true,
        processedBy: expect.any(String),
        processedAt: expect.any(String),
        fadpCompliant: true
      });
    });
  });
});
