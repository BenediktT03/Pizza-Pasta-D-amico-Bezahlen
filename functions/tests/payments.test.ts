/**
 * EATECH Payment Processing Tests
 * 
 * Test suite for payment services, webhooks, and APIs
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions-test';
import { expect } from '@jest/globals';
import * as sinon from 'sinon';
import * as request from 'supertest';
import Stripe from 'stripe';

// Import functions to test
import { PaymentProcessor } from '../src/services/PaymentProcessor';
import { stripeWebhook } from '../src/api/webhooks';
import { app as paymentsApi } from '../src/api/payments.api';
import { PaymentMethod, PaymentStatus } from '../src/types/payment.types';
import { encryptionUtils } from '../src/utils/encryptionUtils';

// Initialize test environment
const test = functions();
const db = admin.firestore();

// Mock Stripe
jest.mock('stripe');
const mockStripe = new Stripe('sk_test_mock', { apiVersion: '2023-10-16' });

// ============================================================================
// MOCK DATA
// ============================================================================
const mockPaymentIntent = {
  id: 'pi_test123',
  object: 'payment_intent',
  amount: 3970, // CHF 39.70
  currency: 'chf',
  status: 'succeeded',
  customer: 'cus_test123',
  metadata: {
    orderId: 'order-123',
    tenantId: 'tenant-456',
    customerId: 'customer-789',
  },
  payment_method: 'pm_test123',
  created: Date.now() / 1000,
};

const mockOrder = {
  id: 'order-123',
  tenantId: 'tenant-456',
  customerId: 'customer-789',
  pricing: {
    subtotal: 35.00,
    tax: 2.70,
    deliveryFee: 0,
    discount: 0,
    tip: 2.00,
    total: 39.70,
  },
  payment: {
    method: 'card' as PaymentMethod,
    status: 'pending' as PaymentStatus,
    transactionId: null,
  },
};

const mockCustomer = {
  id: 'customer-789',
  email: 'test@example.com',
  stripeCustomerId: 'cus_test123',
  paymentMethods: [],
};

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================
describe('Payment Processing Tests', () => {
  let sandbox: sinon.SinonSandbox;
  let paymentProcessor: PaymentProcessor;
  
  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  });
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    paymentProcessor = new PaymentProcessor();
    
    // Setup Stripe mocks
    (paymentProcessor as any).stripe = mockStripe;
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  afterAll(() => {
    test.cleanup();
  });
  
  // ============================================================================
  // PAYMENT PROCESSOR TESTS
  // ============================================================================
  describe('PaymentProcessor', () => {
    describe('createPaymentIntent', () => {
      it('should create payment intent for order', async () => {
        // Mock Stripe payment intent creation
        const createStub = sandbox.stub(mockStripe.paymentIntents, 'create').resolves(mockPaymentIntent as any);
        
        // Mock customer lookup
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => mockCustomer,
            }),
          }),
        } as any);
        
        const result = await paymentProcessor.createPaymentIntent(mockOrder);
        
        expect(createStub.calledOnce).toBe(true);
        expect(createStub.firstCall.args[0]).toMatchObject({
          amount: 3970,
          currency: 'chf',
          customer: mockCustomer.stripeCustomerId,
          metadata: {
            orderId: mockOrder.id,
            tenantId: mockOrder.tenantId,
            customerId: mockOrder.customerId,
          },
        });
        
        expect(result).toMatchObject({
          clientSecret: expect.any(String),
          paymentIntentId: mockPaymentIntent.id,
          amount: mockPaymentIntent.amount,
        });
      });
      
      it('should create Stripe customer if not exists', async () => {
        // Mock customer without Stripe ID
        const customerWithoutStripe = { ...mockCustomer, stripeCustomerId: null };
        
        // Mock Stripe customer creation
        const createCustomerStub = sandbox.stub(mockStripe.customers, 'create').resolves({
          id: 'cus_new123',
        } as any);
        
        const createIntentStub = sandbox.stub(mockStripe.paymentIntents, 'create').resolves(mockPaymentIntent as any);
        
        // Mock database
        const updateStub = sandbox.stub();
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => customerWithoutStripe,
            }),
            update: updateStub,
          }),
        } as any);
        
        await paymentProcessor.createPaymentIntent(mockOrder);
        
        expect(createCustomerStub.calledOnce).toBe(true);
        expect(createCustomerStub.firstCall.args[0]).toMatchObject({
          email: customerWithoutStripe.email,
          metadata: {
            customerId: customerWithoutStripe.id,
            tenantId: mockOrder.tenantId,
          },
        });
        
        expect(updateStub.calledWith({ stripeCustomerId: 'cus_new123' })).toBe(true);
      });
      
      it('should handle payment intent creation errors', async () => {
        // Mock Stripe error
        sandbox.stub(mockStripe.paymentIntents, 'create').rejects(new Error('Insufficient funds'));
        
        // Mock customer lookup
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => mockCustomer,
            }),
          }),
        } as any);
        
        await expect(paymentProcessor.createPaymentIntent(mockOrder))
          .rejects.toThrow('Insufficient funds');
      });
    });
    
    describe('confirmPayment', () => {
      it('should confirm payment and update order', async () => {
        const paymentIntentId = mockPaymentIntent.id;
        
        // Mock Stripe retrieve
        sandbox.stub(mockStripe.paymentIntents, 'retrieve').resolves(mockPaymentIntent as any);
        
        // Mock order update
        const updateOrderStub = sandbox.stub();
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            update: updateOrderStub,
          }),
        } as any);
        
        const result = await paymentProcessor.confirmPayment(paymentIntentId);
        
        expect(result.status).toBe('succeeded');
        expect(updateOrderStub.calledOnce).toBe(true);
        expect(updateOrderStub.firstCall.args[0]).toMatchObject({
          'payment.status': 'paid',
          'payment.transactionId': paymentIntentId,
          'payment.paidAt': expect.any(Object),
        });
      });
      
      it('should handle failed payments', async () => {
        const failedIntent = {
          ...mockPaymentIntent,
          status: 'failed',
          last_payment_error: {
            code: 'card_declined',
            message: 'Your card was declined.',
          },
        };
        
        sandbox.stub(mockStripe.paymentIntents, 'retrieve').resolves(failedIntent as any);
        
        const updateOrderStub = sandbox.stub();
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            update: updateOrderStub,
          }),
        } as any);
        
        const result = await paymentProcessor.confirmPayment(failedIntent.id);
        
        expect(result.status).toBe('failed');
        expect(updateOrderStub.firstCall.args[0]).toMatchObject({
          'payment.status': 'failed',
          'payment.error': 'Your card was declined.',
        });
      });
    });
    
    describe('processRefund', () => {
      it('should process full refund', async () => {
        const orderId = mockOrder.id;
        const amount = mockOrder.pricing.total;
        
        // Mock order lookup
        sandbox.stub(db, 'collection').withArgs(`tenants/${mockOrder.tenantId}/orders`).returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({
                ...mockOrder,
                payment: {
                  ...mockOrder.payment,
                  status: 'paid',
                  transactionId: mockPaymentIntent.id,
                },
              }),
            }),
            update: sandbox.stub(),
          }),
        } as any);
        
        // Mock Stripe refund
        const refundStub = sandbox.stub(mockStripe.refunds, 'create').resolves({
          id: 'rf_test123',
          amount: amount * 100,
          status: 'succeeded',
        } as any);
        
        const result = await paymentProcessor.processRefund(mockOrder.tenantId, orderId, amount);
        
        expect(refundStub.calledOnce).toBe(true);
        expect(refundStub.firstCall.args[0]).toMatchObject({
          payment_intent: mockPaymentIntent.id,
          amount: amount * 100,
        });
        
        expect(result).toMatchObject({
          refundId: 'rf_test123',
          amount,
          status: 'succeeded',
        });
      });
      
      it('should process partial refund', async () => {
        const orderId = mockOrder.id;
        const partialAmount = 10.00;
        
        // Mock order lookup
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({
                ...mockOrder,
                payment: {
                  ...mockOrder.payment,
                  status: 'paid',
                  transactionId: mockPaymentIntent.id,
                },
              }),
            }),
            update: sandbox.stub(),
          }),
        } as any);
        
        const refundStub = sandbox.stub(mockStripe.refunds, 'create').resolves({
          id: 'rf_test123',
          amount: partialAmount * 100,
          status: 'succeeded',
        } as any);
        
        await paymentProcessor.processRefund(mockOrder.tenantId, orderId, partialAmount, 'Customer complaint');
        
        expect(refundStub.firstCall.args[0]).toMatchObject({
          amount: partialAmount * 100,
          reason: 'Customer complaint',
        });
      });
      
      it('should prevent refund on unpaid order', async () => {
        // Mock unpaid order
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => mockOrder, // Status is 'pending'
            }),
          }),
        } as any);
        
        await expect(
          paymentProcessor.processRefund(mockOrder.tenantId, mockOrder.id, 10)
        ).rejects.toThrow('Order has not been paid');
      });
    });
    
    describe('savePaymentMethod', () => {
      it('should save payment method for customer', async () => {
        const paymentMethodId = 'pm_test123';
        
        // Mock Stripe payment method
        sandbox.stub(mockStripe.paymentMethods, 'attach').resolves({
          id: paymentMethodId,
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025,
          },
        } as any);
        
        // Mock customer update
        const updateStub = sandbox.stub();
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => mockCustomer,
            }),
            update: updateStub,
          }),
        } as any);
        
        const result = await paymentProcessor.savePaymentMethod(
          mockCustomer.id,
          paymentMethodId,
          mockOrder.tenantId
        );
        
        expect(result).toMatchObject({
          id: paymentMethodId,
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
          },
        });
        
        expect(updateStub.calledOnce).toBe(true);
        expect(updateStub.firstCall.args[0]).toHaveProperty('paymentMethods');
      });
    });
  });
  
  // ============================================================================
  // WEBHOOK TESTS
  // ============================================================================
  describe('Stripe Webhooks', () => {
    describe('payment_intent.succeeded', () => {
      it('should handle successful payment webhook', async () => {
        const webhookPayload = {
          type: 'payment_intent.succeeded',
          data: {
            object: mockPaymentIntent,
          },
        };
        
        // Mock Stripe webhook verification
        sandbox.stub(mockStripe.webhooks, 'constructEvent').returns(webhookPayload as any);
        
        // Mock order update
        const updateStub = sandbox.stub();
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            update: updateStub,
            get: async () => ({
              exists: true,
              data: () => mockOrder,
            }),
          }),
        } as any);
        
        const response = await request(stripeWebhook)
          .post('/webhooks/stripe')
          .set('stripe-signature', 'mock-signature')
          .send(webhookPayload)
          .expect(200);
        
        expect(updateStub.calledOnce).toBe(true);
        expect(updateStub.firstCall.args[0]).toMatchObject({
          'payment.status': 'paid',
          'payment.transactionId': mockPaymentIntent.id,
        });
      });
    });
    
    describe('payment_intent.payment_failed', () => {
      it('should handle failed payment webhook', async () => {
        const failedPaymentIntent = {
          ...mockPaymentIntent,
          status: 'failed',
          last_payment_error: {
            code: 'insufficient_funds',
            message: 'Insufficient funds',
          },
        };
        
        const webhookPayload = {
          type: 'payment_intent.payment_failed',
          data: {
            object: failedPaymentIntent,
          },
        };
        
        sandbox.stub(mockStripe.webhooks, 'constructEvent').returns(webhookPayload as any);
        
        const updateStub = sandbox.stub();
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            update: updateStub,
            get: async () => ({
              exists: true,
              data: () => mockOrder,
            }),
          }),
        } as any);
        
        await request(stripeWebhook)
          .post('/webhooks/stripe')
          .set('stripe-signature', 'mock-signature')
          .send(webhookPayload)
          .expect(200);
        
        expect(updateStub.firstCall.args[0]).toMatchObject({
          'payment.status': 'failed',
          'payment.error': 'Insufficient funds',
        });
      });
    });
    
    describe('webhook signature verification', () => {
      it('should reject invalid webhook signature', async () => {
        sandbox.stub(mockStripe.webhooks, 'constructEvent').throws(new Error('Invalid signature'));
        
        await request(stripeWebhook)
          .post('/webhooks/stripe')
          .set('stripe-signature', 'invalid-signature')
          .send({})
          .expect(400);
      });
    });
  });
  
  // ============================================================================
  // PAYMENT API TESTS
  // ============================================================================
  describe('Payments API', () => {
    describe('POST /payments/intent', () => {
      it('should create payment intent', async () => {
        // Mock auth
        sandbox.stub(require('../src/middleware/auth.middleware'), 'validateAuth')
          .callsFake((req: any, res: any, next: any) => {
            req.user = { uid: 'user-123', tenantId: mockOrder.tenantId };
            next();
          });
        
        // Mock payment processor
        sandbox.stub(PaymentProcessor.prototype, 'createPaymentIntent').resolves({
          clientSecret: 'pi_test123_secret',
          paymentIntentId: mockPaymentIntent.id,
          amount: mockPaymentIntent.amount,
        });
        
        const response = await request(paymentsApi)
          .post('/payments/intent')
          .send({ orderId: mockOrder.id })
          .expect(200);
        
        expect(response.body).toMatchObject({
          clientSecret: 'pi_test123_secret',
          paymentIntentId: mockPaymentIntent.id,
          amount: mockPaymentIntent.amount,
        });
      });
    });
    
    describe('POST /payments/confirm', () => {
      it('should confirm payment', async () => {
        // Mock auth
        sandbox.stub(require('../src/middleware/auth.middleware'), 'validateAuth')
          .callsFake((req: any, res: any, next: any) => {
            req.user = { uid: 'user-123', tenantId: mockOrder.tenantId };
            next();
          });
        
        // Mock payment processor
        sandbox.stub(PaymentProcessor.prototype, 'confirmPayment').resolves({
          status: 'succeeded',
          paymentIntentId: mockPaymentIntent.id,
        });
        
        const response = await request(paymentsApi)
          .post('/payments/confirm')
          .send({ paymentIntentId: mockPaymentIntent.id })
          .expect(200);
        
        expect(response.body.status).toBe('succeeded');
      });
    });
    
    describe('POST /payments/refund', () => {
      it('should process refund with admin role', async () => {
        // Mock auth
        sandbox.stub(require('../src/middleware/auth.middleware'), 'validateAuth')
          .callsFake((req: any, res: any, next: any) => {
            req.user = { 
              uid: 'admin-123', 
              tenantId: mockOrder.tenantId,
              role: 'admin'
            };
            next();
          });
        
        // Mock payment processor
        sandbox.stub(PaymentProcessor.prototype, 'processRefund').resolves({
          refundId: 'rf_test123',
          amount: 10.00,
          status: 'succeeded',
        });
        
        const response = await request(paymentsApi)
          .post('/payments/refund')
          .send({
            orderId: mockOrder.id,
            amount: 10.00,
            reason: 'Customer request',
          })
          .expect(200);
        
        expect(response.body).toMatchObject({
          refundId: 'rf_test123',
          amount: 10.00,
          status: 'succeeded',
        });
      });
      
      it('should reject refund without admin role', async () => {
        // Mock auth with non-admin user
        sandbox.stub(require('../src/middleware/auth.middleware'), 'validateAuth')
          .callsFake((req: any, res: any, next: any) => {
            req.user = { 
              uid: 'user-123', 
              tenantId: mockOrder.tenantId,
              role: 'customer'
            };
            next();
          });
        
        await request(paymentsApi)
          .post('/payments/refund')
          .send({
            orderId: mockOrder.id,
            amount: 10.00,
          })
          .expect(403);
      });
    });
    
    describe('GET /payments/methods', () => {
      it('should return customer payment methods', async () => {
        const mockPaymentMethods = [
          {
            id: 'pm_test123',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2025,
            },
          },
          {
            id: 'pm_test456',
            type: 'card',
            card: {
              brand: 'mastercard',
              last4: '5555',
              exp_month: 6,
              exp_year: 2024,
            },
          },
        ];
        
        // Mock auth
        sandbox.stub(require('../src/middleware/auth.middleware'), 'validateAuth')
          .callsFake((req: any, res: any, next: any) => {
            req.user = { uid: 'user-123', customerId: mockCustomer.id };
            next();
          });
        
        // Mock customer lookup
        sandbox.stub(db, 'collection').returns({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({
                ...mockCustomer,
                paymentMethods: mockPaymentMethods,
              }),
            }),
          }),
        } as any);
        
        const response = await request(paymentsApi)
          .get('/payments/methods')
          .expect(200);
        
        expect(response.body.methods).toHaveLength(2);
        expect(response.body.methods[0]).toMatchObject({
          id: 'pm_test123',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
          },
        });
      });
    });
  });
  
  // ============================================================================
  // ENCRYPTION TESTS
  // ============================================================================
  describe('Payment Data Encryption', () => {
    it('should encrypt sensitive payment data', async () => {
      const sensitiveData = {
        cardNumber: '4242424242424242',
        cvv: '123',
        expiryDate: '12/25',
      };
      
      const encrypted = await encryptionUtils.encrypt(JSON.stringify(sensitiveData));
      
      expect(encrypted).not.toContain('4242424242424242');
      expect(encrypted).toMatch(/^[a-f0-9]+:[a-f0-9]+$/); // Format: iv:encryptedData
      
      const decrypted = await encryptionUtils.decrypt(encrypted);
      const decryptedData = JSON.parse(decrypted);
      
      expect(decryptedData).toMatchObject(sensitiveData);
    });
    
    it('should mask card numbers for display', () => {
      const cardNumber = '4242424242424242';
      const masked = paymentProcessor.maskCardNumber(cardNumber);
      
      expect(masked).toBe('**** **** **** 4242');
    });
  });
  
  // ============================================================================
  // TWINT INTEGRATION TESTS
  // ============================================================================
  describe('Twint Payment Integration', () => {
    it('should create Twint payment request', async () => {
      const twintProcessor = paymentProcessor.getTwintProcessor();
      
      // Mock Twint API
      const createRequestStub = sandbox.stub(twintProcessor, 'createPaymentRequest').resolves({
        requestId: 'twint_req_123',
        qrCode: 'data:image/png;base64,iVBORw0KGgo...',
        deepLink: 'twint://pay?id=req_123',
      });
      
      const result = await paymentProcessor.createTwintPayment(mockOrder);
      
      expect(createRequestStub.calledOnce).toBe(true);
      expect(result).toMatchObject({
        requestId: 'twint_req_123',
        qrCode: expect.stringContaining('data:image/png'),
        deepLink: expect.stringContaining('twint://'),
      });
    });
    
    it('should handle Twint payment confirmation', async () => {
      const twintProcessor = paymentProcessor.getTwintProcessor();
      const requestId = 'twint_req_123';
      
      // Mock Twint status check
      sandbox.stub(twintProcessor, 'checkPaymentStatus').resolves({
        status: 'completed',
        transactionId: 'twint_txn_123',
      });
      
      // Mock order update
      const updateStub = sandbox.stub();
      sandbox.stub(db, 'collection').returns({
        doc: () => ({
          update: updateStub,
        }),
      } as any);
      
      const result = await paymentProcessor.confirmTwintPayment(requestId, mockOrder.id);
      
      expect(result.status).toBe('completed');
      expect(updateStub.calledWith({
        'payment.status': 'paid',
        'payment.transactionId': 'twint_txn_123',
        'payment.method': 'twint',
      })).toBe(true);
    });
  });
});