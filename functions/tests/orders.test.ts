/**
 * EATECH Order Management Tests
 * 
 * Test suite for order triggers, APIs, and services
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions-test';
import { expect } from '@jest/globals';
import * as sinon from 'sinon';
import * as request from 'supertest';

// Import functions to test
import * as orderTriggers from '../src/triggers/order.triggers';
import { app as ordersApi } from '../src/api/orders.api';
import { OrderService } from '../src/services/OrderService';
import { InventoryService } from '../src/services/InventoryService';
import { NotificationService } from '../src/services/NotificationService';
import { orderUtils } from '../src/utils/orderUtils';
import { OrderStatus, OrderType } from '../src/types/order.types';

// Initialize test environment
const test = functions();
const db = admin.firestore();

// ============================================================================
// MOCK DATA
// ============================================================================
const mockOrder = {
  id: 'order-123',
  tenantId: 'tenant-456',
  orderNumber: '#10001',
  customerId: 'customer-789',
  customerName: 'John Doe',
  customerPhone: '+41791234567',
  customerEmail: 'john@example.com',
  type: 'pickup' as OrderType,
  status: 'pending' as OrderStatus,
  items: [
    {
      productId: 'product-1',
      productName: 'Burger',
      quantity: 2,
      price: 15.00,
      total: 30.00,
      modifiers: [],
      notes: null,
    },
    {
      productId: 'product-2',
      productName: 'Fries',
      quantity: 1,
      price: 5.00,
      total: 5.00,
      modifiers: [],
      notes: 'Extra crispy',
    },
  ],
  pricing: {
    subtotal: 35.00,
    tax: 2.70,
    deliveryFee: 0,
    discount: 0,
    tip: 2.00,
    total: 39.70,
  },
  payment: {
    method: 'card',
    status: 'pending',
    transactionId: null,
  },
  pickup: {
    time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    location: 'Main Location',
  },
  notes: 'Please call when ready',
  createdAt: admin.firestore.Timestamp.now(),
  updatedAt: admin.firestore.Timestamp.now(),
};

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================
describe('Order Management Tests', () => {
  let sandbox: sinon.SinonSandbox;
  let orderService: OrderService;
  
  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  });
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    orderService = new OrderService();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  afterAll(() => {
    test.cleanup();
  });
  
  // ============================================================================
  // ORDER TRIGGERS TESTS
  // ============================================================================
  describe('Order Triggers', () => {
    describe('onOrderCreated', () => {
      it('should send order confirmation notification', async () => {
        const wrapped = test.wrap(orderTriggers.onOrderCreated);
        const snap = test.firestore.makeDocumentSnapshot(mockOrder, `tenants/${mockOrder.tenantId}/orders/${mockOrder.id}`);
        
        // Mock notification service
        const sendOrderConfirmationStub = sandbox.stub();
        sandbox.stub(NotificationService.prototype, 'sendOrderConfirmation').callsFake(sendOrderConfirmationStub);
        
        await wrapped(snap, {
          params: { tenantId: mockOrder.tenantId, orderId: mockOrder.id },
        });
        
        expect(sendOrderConfirmationStub.calledOnce).toBe(true);
        expect(sendOrderConfirmationStub.firstCall.args[0]).toMatchObject(mockOrder);
      });
      
      it('should update inventory for tracked products', async () => {
        const wrapped = test.wrap(orderTriggers.onOrderCreated);
        const snap = test.firestore.makeDocumentSnapshot(mockOrder, `tenants/${mockOrder.tenantId}/orders/${mockOrder.id}`);
        
        // Mock inventory service
        const updateStockStub = sandbox.stub();
        sandbox.stub(InventoryService.prototype, 'updateStock').callsFake(updateStockStub);
        
        await wrapped(snap, {
          params: { tenantId: mockOrder.tenantId, orderId: mockOrder.id },
        });
        
        expect(updateStockStub.callCount).toBe(mockOrder.items.length);
      });
      
      it('should update customer stats', async () => {
        const wrapped = test.wrap(orderTriggers.onOrderCreated);
        const snap = test.firestore.makeDocumentSnapshot(mockOrder, `tenants/${mockOrder.tenantId}/orders/${mockOrder.id}`);
        
        // Mock customer update
        const updateStub = sandbox.stub();
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            update: updateStub,
          }),
        } as any);
        
        await wrapped(snap, {
          params: { tenantId: mockOrder.tenantId, orderId: mockOrder.id },
        });
        
        expect(updateStub.calledOnce).toBe(true);
        expect(updateStub.firstCall.args[0]).toMatchObject({
          'stats.totalOrders': admin.firestore.FieldValue.increment(1),
          'stats.totalSpent': admin.firestore.FieldValue.increment(mockOrder.pricing.total),
          'stats.lastOrderDate': expect.any(Object),
        });
      });
    });
    
    describe('onOrderUpdated', () => {
      it('should send notification on status change', async () => {
        const oldOrder = { ...mockOrder, status: 'pending' };
        const newOrder = { ...mockOrder, status: 'confirmed' };
        
        const wrapped = test.wrap(orderTriggers.onOrderUpdated);
        const change = test.makeChange(
          test.firestore.makeDocumentSnapshot(oldOrder, `tenants/${mockOrder.tenantId}/orders/${mockOrder.id}`),
          test.firestore.makeDocumentSnapshot(newOrder, `tenants/${mockOrder.tenantId}/orders/${mockOrder.id}`)
        );
        
        // Mock notification service
        const sendStub = sandbox.stub();
        sandbox.stub(NotificationService.prototype, 'sendOrderStatusUpdate').callsFake(sendStub);
        
        await wrapped(change, {
          params: { tenantId: mockOrder.tenantId, orderId: mockOrder.id },
        });
        
        expect(sendStub.calledOnce).toBe(true);
        expect(sendStub.firstCall.args[0]).toMatchObject(newOrder);
        expect(sendStub.firstCall.args[1]).toBe('confirmed');
      });
      
      it('should not send notification if status unchanged', async () => {
        const oldOrder = { ...mockOrder, status: 'pending' };
        const newOrder = { ...mockOrder, status: 'pending', notes: 'Updated note' };
        
        const wrapped = test.wrap(orderTriggers.onOrderUpdated);
        const change = test.makeChange(
          test.firestore.makeDocumentSnapshot(oldOrder, `tenants/${mockOrder.tenantId}/orders/${mockOrder.id}`),
          test.firestore.makeDocumentSnapshot(newOrder, `tenants/${mockOrder.tenantId}/orders/${mockOrder.id}`)
        );
        
        const sendStub = sandbox.stub();
        sandbox.stub(NotificationService.prototype, 'sendOrderStatusUpdate').callsFake(sendStub);
        
        await wrapped(change, {
          params: { tenantId: mockOrder.tenantId, orderId: mockOrder.id },
        });
        
        expect(sendStub.called).toBe(false);
      });
    });
    
    describe('onOrderCompleted', () => {
      it('should award loyalty points', async () => {
        const completedOrder = { ...mockOrder, status: 'completed' as OrderStatus };
        
        const wrapped = test.wrap(orderTriggers.onOrderCompleted);
        const snap = test.firestore.makeDocumentSnapshot(completedOrder, `tenants/${mockOrder.tenantId}/orders/${mockOrder.id}`);
        
        // Mock loyalty service
        const awardPointsStub = sandbox.stub();
        sandbox.stub(require('../src/services/LoyaltyService'), 'LoyaltyService').returns({
          awardPoints: awardPointsStub,
        });
        
        await wrapped(snap, {
          params: { tenantId: mockOrder.tenantId, orderId: mockOrder.id },
        });
        
        expect(awardPointsStub.calledOnce).toBe(true);
        expect(awardPointsStub.firstCall.args[0]).toBe(mockOrder.customerId);
        expect(awardPointsStub.firstCall.args[1]).toBeGreaterThan(0);
      });
      
      it('should update product stats', async () => {
        const completedOrder = { ...mockOrder, status: 'completed' as OrderStatus };
        
        const wrapped = test.wrap(orderTriggers.onOrderCompleted);
        const snap = test.firestore.makeDocumentSnapshot(completedOrder, `tenants/${mockOrder.tenantId}/orders/${mockOrder.id}`);
        
        const updateStub = sandbox.stub();
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            update: updateStub,
          }),
        } as any);
        
        await wrapped(snap, {
          params: { tenantId: mockOrder.tenantId, orderId: mockOrder.id },
        });
        
        // Should update stats for each product
        expect(updateStub.callCount).toBeGreaterThanOrEqual(mockOrder.items.length);
      });
    });
  });
  
  // ============================================================================
  // ORDER SERVICE TESTS
  // ============================================================================
  describe('OrderService', () => {
    describe('createOrder', () => {
      it('should create order with valid data', async () => {
        const orderData = {
          tenantId: mockOrder.tenantId,
          customerId: mockOrder.customerId,
          items: mockOrder.items,
          type: mockOrder.type,
          payment: mockOrder.payment,
        };
        
        // Mock Firestore
        const setStub = sandbox.stub().resolves();
        sandbox.stub(db, 'collection').returns({
          doc: () => ({ set: setStub }),
        } as any);
        
        // Mock product validation
        sandbox.stub(orderService, 'validateProducts').resolves(true);
        
        const result = await orderService.createOrder(orderData);
        
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('orderNumber');
        expect(setStub.calledOnce).toBe(true);
      });
      
      it('should throw error for invalid products', async () => {
        const orderData = {
          tenantId: mockOrder.tenantId,
          customerId: mockOrder.customerId,
          items: mockOrder.items,
          type: mockOrder.type,
        };
        
        // Mock product validation to fail
        sandbox.stub(orderService, 'validateProducts').resolves(false);
        
        await expect(orderService.createOrder(orderData))
          .rejects.toThrow('Invalid products in order');
      });
      
      it('should apply tenant-specific settings', async () => {
        const orderData = {
          tenantId: mockOrder.tenantId,
          customerId: mockOrder.customerId,
          items: mockOrder.items,
          type: mockOrder.type,
        };
        
        // Mock tenant settings
        sandbox.stub(db, 'collection').withArgs('tenants').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({
                settings: {
                  taxRate: 8.1,
                  minimumOrder: 20,
                  prepTimeMinutes: 25,
                },
              }),
            }),
          }),
        } as any);
        
        const result = await orderService.createOrder(orderData);
        
        expect(result.pricing.tax).toBe(mockOrder.pricing.subtotal * 0.081);
      });
    });
    
    describe('updateOrderStatus', () => {
      it('should update order status with validation', async () => {
        const orderId = mockOrder.id;
        const newStatus = 'confirmed' as OrderStatus;
        
        // Mock order lookup
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({ ...mockOrder, status: 'pending' }),
            }),
            update: sandbox.stub().resolves(),
          }),
        } as any);
        
        const result = await orderService.updateOrderStatus(
          mockOrder.tenantId,
          orderId,
          newStatus
        );
        
        expect(result.status).toBe(newStatus);
      });
      
      it('should prevent invalid status transitions', async () => {
        const orderId = mockOrder.id;
        const invalidStatus = 'pending' as OrderStatus; // Can't go back to pending
        
        // Mock order lookup
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({ ...mockOrder, status: 'completed' }),
            }),
          }),
        } as any);
        
        await expect(
          orderService.updateOrderStatus(mockOrder.tenantId, orderId, invalidStatus)
        ).rejects.toThrow('Invalid status transition');
      });
    });
    
    describe('calculatePricing', () => {
      it('should calculate order pricing correctly', () => {
        const items = mockOrder.items;
        const taxRate = 7.7;
        const deliveryFee = 5;
        const discount = 5;
        const tip = 3;
        
        const pricing = orderService.calculatePricing(items, {
          taxRate,
          deliveryFee,
          discount,
          tip,
        });
        
        expect(pricing.subtotal).toBe(35); // 30 + 5
        expect(pricing.tax).toBeCloseTo(2.70, 2);
        expect(pricing.total).toBeCloseTo(40.70, 2); // 35 + 2.70 + 5 - 5 + 3
      });
    });
  });
  
  // ============================================================================
  // ORDER API TESTS
  // ============================================================================
  describe('Orders API', () => {
    describe('POST /orders', () => {
      it('should create order with valid request', async () => {
        const orderData = {
          customerId: mockOrder.customerId,
          items: mockOrder.items,
          type: mockOrder.type,
          payment: mockOrder.payment,
          pickup: mockOrder.pickup,
        };
        
        // Mock auth middleware
        sandbox.stub(require('../src/middleware/auth.middleware'), 'validateAuth')
          .callsFake((req: any, res: any, next: any) => {
            req.user = { uid: 'user-123', tenantId: mockOrder.tenantId };
            next();
          });
        
        // Mock order service
        sandbox.stub(OrderService.prototype, 'createOrder').resolves({
          ...mockOrder,
          id: 'new-order-123',
        });
        
        const response = await request(ordersApi)
          .post('/orders')
          .send(orderData)
          .expect(201);
        
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('orderNumber');
      });
      
      it('should validate required fields', async () => {
        const invalidData = {
          // Missing required fields
          items: [],
        };
        
        // Mock auth
        sandbox.stub(require('../src/middleware/auth.middleware'), 'validateAuth')
          .callsFake((req: any, res: any, next: any) => {
            req.user = { uid: 'user-123', tenantId: mockOrder.tenantId };
            next();
          });
        
        const response = await request(ordersApi)
          .post('/orders')
          .send(invalidData)
          .expect(400);
        
        expect(response.body).toHaveProperty('error');
      });
    });
    
    describe('GET /orders', () => {
      it('should return tenant orders', async () => {
        // Mock auth
        sandbox.stub(require('../src/middleware/auth.middleware'), 'validateAuth')
          .callsFake((req: any, res: any, next: any) => {
            req.user = { uid: 'user-123', tenantId: mockOrder.tenantId, role: 'admin' };
            next();
          });
        
        // Mock order query
        sandbox.stub(db, 'collection').returns({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                get: async () => ({
                  docs: [
                    { id: 'order-1', data: () => mockOrder },
                    { id: 'order-2', data: () => ({ ...mockOrder, id: 'order-2' }) },
                  ],
                }),
              }),
            }),
          }),
        } as any);
        
        const response = await request(ordersApi)
          .get('/orders')
          .expect(200);
        
        expect(response.body).toHaveProperty('orders');
        expect(response.body.orders).toHaveLength(2);
      });
      
      it('should filter orders by status', async () => {
        // Mock auth
        sandbox.stub(require('../src/middleware/auth.middleware'), 'validateAuth')
          .callsFake((req: any, res: any, next: any) => {
            req.user = { uid: 'user-123', tenantId: mockOrder.tenantId, role: 'admin' };
            next();
          });
        
        // Mock filtered query
        const whereStub = sandbox.stub();
        sandbox.stub(db, 'collection').returns({
          where: whereStub.returns({
            orderBy: () => ({
              limit: () => ({
                get: async () => ({
                  docs: [{ id: 'order-1', data: () => mockOrder }],
                }),
              }),
            }),
          }),
        } as any);
        
        await request(ordersApi)
          .get('/orders?status=pending')
          .expect(200);
        
        expect(whereStub.calledWith('status', '==', 'pending')).toBe(true);
      });
    });
    
    describe('PATCH /orders/:orderId/status', () => {
      it('should update order status', async () => {
        // Mock auth
        sandbox.stub(require('../src/middleware/auth.middleware'), 'validateAuth')
          .callsFake((req: any, res: any, next: any) => {
            req.user = { uid: 'user-123', tenantId: mockOrder.tenantId, role: 'admin' };
            next();
          });
        
        // Mock order service
        sandbox.stub(OrderService.prototype, 'updateOrderStatus').resolves({
          ...mockOrder,
          status: 'confirmed' as OrderStatus,
        });
        
        const response = await request(ordersApi)
          .patch(`/orders/${mockOrder.id}/status`)
          .send({ status: 'confirmed' })
          .expect(200);
        
        expect(response.body.status).toBe('confirmed');
      });
    });
  });
  
  // ============================================================================
  // ORDER UTILS TESTS
  // ============================================================================
  describe('Order Utils', () => {
    describe('generateOrderNumber', () => {
      it('should generate unique order numbers', () => {
        const numbers = new Set();
        
        for (let i = 0; i < 100; i++) {
          const number = orderUtils.generateOrderNumber();
          expect(number).toMatch(/^#\d{5,}$/);
          numbers.add(number);
        }
        
        expect(numbers.size).toBe(100); // All unique
      });
    });
    
    describe('isValidStatusTransition', () => {
      it('should validate allowed transitions', () => {
        expect(orderUtils.isValidStatusTransition('pending', 'confirmed')).toBe(true);
        expect(orderUtils.isValidStatusTransition('confirmed', 'preparing')).toBe(true);
        expect(orderUtils.isValidStatusTransition('preparing', 'ready')).toBe(true);
        expect(orderUtils.isValidStatusTransition('ready', 'completed')).toBe(true);
      });
      
      it('should reject invalid transitions', () => {
        expect(orderUtils.isValidStatusTransition('completed', 'pending')).toBe(false);
        expect(orderUtils.isValidStatusTransition('cancelled', 'preparing')).toBe(false);
        expect(orderUtils.isValidStatusTransition('ready', 'confirmed')).toBe(false);
      });
    });
    
    describe('calculateEstimatedTime', () => {
      it('should calculate pickup time based on prep time', () => {
        const prepTimeMinutes = 30;
        const estimatedTime = orderUtils.calculateEstimatedTime('pickup', prepTimeMinutes);
        
        const expected = new Date(Date.now() + prepTimeMinutes * 60 * 1000);
        const actual = new Date(estimatedTime);
        
        expect(actual.getTime()).toBeCloseTo(expected.getTime(), -3); // Within seconds
      });
      
      it('should add delivery time for delivery orders', () => {
        const prepTimeMinutes = 30;
        const deliveryTimeMinutes = 15;
        const estimatedTime = orderUtils.calculateEstimatedTime(
          'delivery',
          prepTimeMinutes,
          deliveryTimeMinutes
        );
        
        const expected = new Date(Date.now() + (prepTimeMinutes + deliveryTimeMinutes) * 60 * 1000);
        const actual = new Date(estimatedTime);
        
        expect(actual.getTime()).toBeCloseTo(expected.getTime(), -3);
      });
    });
  });
});