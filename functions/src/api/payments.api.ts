/**
 * EATECH - Payments API Endpoints
 * Version: 1.0.0
 * Description: REST API endpoints for payment processing and management
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/api/payments.api.ts
 */

import * as express from 'express';
import { 
  authenticate, 
  requireRole, 
  requirePermission,
  requireTenantAccess,
  requireOwnership 
} from '../middleware/auth.middleware';
import { 
  validate, 
  validatePagination,
  CommonSchemas 
} from '../middleware/validation.middleware';
import { 
  publicApiLimiter, 
  authenticatedApiLimiter,
  orderCreationLimiter 
} from '../middleware/rateLimiting.middleware';
import { 
  asyncHandler, 
  NotFoundError, 
  BusinessError,
  ValidationError 
} from '../utils/errorHandler';
import { PaymentProcessor } from '../services/PaymentProcessor';
import { getStripeClient, toStripeAmount, fromStripeAmount } from '../config/stripe.config';
import { getCollection } from '../config/firebase.config';
import * as Joi from 'joi';
import { ROLES, PERMISSIONS, BUSINESS_RULES } from '../config/constants';
import { PaymentMethod, PaymentStatus } from '../types/payment.types';

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = express.Router();

// Initialize services
const paymentProcessor = new PaymentProcessor();
const stripe = getStripeClient();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const PaymentSchemas = {
  // Create payment intent
  createPaymentIntent: Joi.object({
    orderId: CommonSchemas.id,
    amount: CommonSchemas.price,
    currency: CommonSchemas.currency,
    paymentMethod: Joi.string().valid(...Object.values(PaymentMethod)).required(),
    savePaymentMethod: Joi.boolean().default(false),
    metadata: Joi.object().optional(),
    setupFutureUsage: Joi.boolean().default(false)
  }),
  
  // Update payment
  updatePayment: Joi.object({
    paymentMethodId: Joi.string().optional(),
    amount: CommonSchemas.price.optional(),
    tip: CommonSchemas.price.optional(),
    metadata: Joi.object().optional()
  }),
  
  // Refund request
  refundRequest: Joi.object({
    reason: Joi.string().max(500).required(),
    amount: CommonSchemas.price.optional(), // Partial refund
    items: Joi.array().items(
      Joi.object({
        orderItemId: CommonSchemas.id,
        quantity: Joi.number().integer().positive()
      })
    ).optional()
  }),
  
  // Payment method
  paymentMethod: Joi.object({
    type: Joi.string().valid('card', 'sepa_debit', 'paypal', 'twint').required(),
    token: Joi.string().when('type', {
      is: 'card',
      then: Joi.required()
    }),
    isDefault: Joi.boolean().default(false),
    billingAddress: CommonSchemas.address.optional()
  }),
  
  // Subscription
  subscription: Joi.object({
    planId: CommonSchemas.id,
    paymentMethodId: Joi.string().required(),
    quantity: Joi.number().integer().positive().default(1),
    trialDays: Joi.number().integer().min(0).max(30).optional(),
    metadata: Joi.object().optional()
  }),
  
  // Transfer funds
  transfer: Joi.object({
    amount: CommonSchemas.price,
    currency: CommonSchemas.currency,
    destinationAccountId: Joi.string().required(),
    description: Joi.string().max(500).optional(),
    metadata: Joi.object().optional()
  })
};

// ============================================================================
// ROUTES - PAYMENT INTENTS
// ============================================================================

/**
 * POST /payments/intents
 * Create a payment intent for an order
 */
router.post('/intents',
  authenticate(),
  requireTenantAccess(),
  orderCreationLimiter,
  validate(PaymentSchemas.createPaymentIntent),
  asyncHandler(async (req, res) => {
    const { tenantId, uid: userId } = req.user!;
    const paymentData = req.body;
    
    // Get order
    const orderDoc = await getCollection('orders').doc(paymentData.orderId).get();
    if (!orderDoc.exists) {
      throw new NotFoundError('Order', paymentData.orderId);
    }
    
    const order = orderDoc.data()!;
    
    // Verify order belongs to tenant
    if (order.tenantId !== tenantId) {
      throw new BusinessError('Order not found');
    }
    
    // Create payment intent
    const paymentIntent = await paymentProcessor.createPaymentIntent({
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      paymentMethod: paymentData.paymentMethod,
      customerId: order.customerId,
      metadata: {
        ...paymentData.metadata,
        tenantId,
        userId,
        orderNumber: order.orderNumber
      },
      savePaymentMethod: paymentData.savePaymentMethod,
      setupFutureUsage: paymentData.setupFutureUsage
    });
    
    res.status(201).json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    });
  })
);

/**
 * GET /payments/intents/:intentId
 * Get payment intent details
 */
router.get('/intents/:intentId',
  authenticate(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { intentId } = req.params;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
    
    // Verify tenant access
    if (paymentIntent.metadata.tenantId !== tenantId) {
      throw new NotFoundError('Payment intent', intentId);
    }
    
    res.json({
      success: true,
      data: {
        id: paymentIntent.id,
        amount: fromStripeAmount(paymentIntent.amount, paymentIntent.currency),
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        paymentMethod: paymentIntent.payment_method,
        created: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata
      }
    });
  })
);

/**
 * POST /payments/intents/:intentId/confirm
 * Confirm a payment intent
 */
router.post('/intents/:intentId/confirm',
  authenticate(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { intentId } = req.params;
    const { paymentMethodId, returnUrl } = req.body;
    
    // Verify tenant access
    const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
    if (paymentIntent.metadata.tenantId !== tenantId) {
      throw new NotFoundError('Payment intent', intentId);
    }
    
    // Confirm payment
    const confirmed = await paymentProcessor.confirmPayment(
      intentId,
      paymentMethodId,
      { returnUrl }
    );
    
    res.json({
      success: true,
      data: {
        status: confirmed.status,
        requiresAction: confirmed.status === 'requires_action',
        nextAction: confirmed.next_action
      }
    });
  })
);

/**
 * POST /payments/intents/:intentId/cancel
 * Cancel a payment intent
 */
router.post('/intents/:intentId/cancel',
  authenticate(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { intentId } = req.params;
    const { reason } = req.body;
    
    // Verify tenant access
    const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
    if (paymentIntent.metadata.tenantId !== tenantId) {
      throw new NotFoundError('Payment intent', intentId);
    }
    
    // Cancel payment
    const cancelled = await stripe.paymentIntents.cancel(intentId, {
      cancellation_reason: reason || 'requested_by_customer'
    });
    
    res.json({
      success: true,
      data: {
        id: cancelled.id,
        status: cancelled.status,
        cancelledAt: new Date(cancelled.canceled_at! * 1000)
      }
    });
  })
);

// ============================================================================
// ROUTES - PAYMENTS
// ============================================================================

/**
 * GET /payments
 * List payments for tenant
 */
router.get('/',
  authenticate(),
  requirePermission(PERMISSIONS.ORDER_VIEW),
  authenticatedApiLimiter,
  validatePagination,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    
    const payments = await paymentProcessor.listPayments(tenantId, {
      page: Number(page),
      limit: Number(limit),
      filters: {
        status: status as PaymentStatus,
        dateRange: startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        } : undefined
      }
    });
    
    res.json({
      success: true,
      data: payments.data,
      pagination: payments.pagination
    });
  })
);

/**
 * GET /payments/:paymentId
 * Get payment details
 */
router.get('/:paymentId',
  authenticate(),
  requirePermission(PERMISSIONS.ORDER_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { paymentId } = req.params;
    
    const payment = await paymentProcessor.getPayment(paymentId, tenantId);
    
    res.json({
      success: true,
      data: payment
    });
  })
);

/**
 * PUT /payments/:paymentId
 * Update payment (e.g., add tip)
 */
router.put('/:paymentId',
  authenticate(),
  authenticatedApiLimiter,
  validate(PaymentSchemas.updatePayment),
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { paymentId } = req.params;
    const updates = req.body;
    
    // Get payment
    const payment = await paymentProcessor.getPayment(paymentId, tenantId);
    
    // Check if payment can be updated
    if (payment.status !== PaymentStatus.PENDING && 
        payment.status !== PaymentStatus.REQUIRES_PAYMENT_METHOD) {
      throw new BusinessError('Payment cannot be updated in current status');
    }
    
    // Update payment
    const updated = await paymentProcessor.updatePayment(paymentId, updates);
    
    res.json({
      success: true,
      data: updated
    });
  })
);

// ============================================================================
// ROUTES - REFUNDS
// ============================================================================

/**
 * POST /payments/:paymentId/refund
 * Request a refund
 */
router.post('/:paymentId/refund',
  authenticate(),
  requirePermission(PERMISSIONS.ORDER_REFUND),
  authenticatedApiLimiter,
  validate(PaymentSchemas.refundRequest),
  asyncHandler(async (req, res) => {
    const { tenantId, uid: userId } = req.user!;
    const { paymentId } = req.params;
    const refundRequest = req.body;
    
    // Process refund
    const refund = await paymentProcessor.processRefund({
      paymentId,
      tenantId,
      ...refundRequest,
      requestedBy: userId
    });
    
    res.status(201).json({
      success: true,
      data: refund
    });
  })
);

/**
 * GET /payments/refunds
 * List refunds
 */
router.get('/refunds',
  authenticate(),
  requirePermission(PERMISSIONS.ORDER_VIEW),
  authenticatedApiLimiter,
  validatePagination,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { page = 1, limit = 20, status } = req.query;
    
    const refunds = await paymentProcessor.listRefunds(tenantId, {
      page: Number(page),
      limit: Number(limit),
      filters: {
        status: status as string
      }
    });
    
    res.json({
      success: true,
      data: refunds.data,
      pagination: refunds.pagination
    });
  })
);

// ============================================================================
// ROUTES - PAYMENT METHODS
// ============================================================================

/**
 * GET /payments/methods
 * List customer payment methods
 */
router.get('/methods',
  authenticate(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { uid: userId } = req.user!;
    
    const methods = await paymentProcessor.listPaymentMethods(userId);
    
    res.json({
      success: true,
      data: methods
    });
  })
);

/**
 * POST /payments/methods
 * Add a payment method
 */
router.post('/methods',
  authenticate(),
  authenticatedApiLimiter,
  validate(PaymentSchemas.paymentMethod),
  asyncHandler(async (req, res) => {
    const { uid: userId } = req.user!;
    const methodData = req.body;
    
    const method = await paymentProcessor.addPaymentMethod(userId, methodData);
    
    res.status(201).json({
      success: true,
      data: method
    });
  })
);

/**
 * DELETE /payments/methods/:methodId
 * Remove a payment method
 */
router.delete('/methods/:methodId',
  authenticate(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { uid: userId } = req.user!;
    const { methodId } = req.params;
    
    await paymentProcessor.removePaymentMethod(userId, methodId);
    
    res.json({
      success: true,
      message: 'Payment method removed successfully'
    });
  })
);

/**
 * PUT /payments/methods/:methodId/default
 * Set default payment method
 */
router.put('/methods/:methodId/default',
  authenticate(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { uid: userId } = req.user!;
    const { methodId } = req.params;
    
    await paymentProcessor.setDefaultPaymentMethod(userId, methodId);
    
    res.json({
      success: true,
      message: 'Default payment method updated'
    });
  })
);

// ============================================================================
// ROUTES - SUBSCRIPTIONS
// ============================================================================

/**
 * GET /payments/subscriptions
 * List tenant subscriptions
 */
router.get('/subscriptions',
  authenticate(),
  requireRole(ROLES.TENANT_ADMIN, ROLES.TENANT_OWNER),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    
    const subscriptions = await paymentProcessor.listSubscriptions(tenantId);
    
    res.json({
      success: true,
      data: subscriptions
    });
  })
);

/**
 * POST /payments/subscriptions
 * Create a subscription
 */
router.post('/subscriptions',
  authenticate(),
  requireRole(ROLES.TENANT_OWNER),
  authenticatedApiLimiter,
  validate(PaymentSchemas.subscription),
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const subscriptionData = req.body;
    
    const subscription = await paymentProcessor.createSubscription({
      ...subscriptionData,
      tenantId
    });
    
    res.status(201).json({
      success: true,
      data: subscription
    });
  })
);

/**
 * PUT /payments/subscriptions/:subscriptionId
 * Update subscription (upgrade/downgrade)
 */
router.put('/subscriptions/:subscriptionId',
  authenticate(),
  requireRole(ROLES.TENANT_OWNER),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { subscriptionId } = req.params;
    const { planId, quantity } = req.body;
    
    const subscription = await paymentProcessor.updateSubscription(
      subscriptionId,
      tenantId,
      { planId, quantity }
    );
    
    res.json({
      success: true,
      data: subscription
    });
  })
);

/**
 * DELETE /payments/subscriptions/:subscriptionId
 * Cancel subscription
 */
router.delete('/subscriptions/:subscriptionId',
  authenticate(),
  requireRole(ROLES.TENANT_OWNER),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { subscriptionId } = req.params;
    const { immediately = false } = req.query;
    
    const subscription = await paymentProcessor.cancelSubscription(
      subscriptionId,
      tenantId,
      immediately === 'true'
    );
    
    res.json({
      success: true,
      data: subscription
    });
  })
);

// ============================================================================
// ROUTES - INVOICES
// ============================================================================

/**
 * GET /payments/invoices
 * List invoices
 */
router.get('/invoices',
  authenticate(),
  requirePermission(PERMISSIONS.ORDER_VIEW),
  authenticatedApiLimiter,
  validatePagination,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { page = 1, limit = 20, status, customerId } = req.query;
    
    const invoices = await paymentProcessor.listInvoices(tenantId, {
      page: Number(page),
      limit: Number(limit),
      filters: {
        status: status as string,
        customerId: customerId as string
      }
    });
    
    res.json({
      success: true,
      data: invoices.data,
      pagination: invoices.pagination
    });
  })
);

/**
 * GET /payments/invoices/:invoiceId
 * Get invoice details
 */
router.get('/invoices/:invoiceId',
  authenticate(),
  requirePermission(PERMISSIONS.ORDER_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { invoiceId } = req.params;
    
    const invoice = await paymentProcessor.getInvoice(invoiceId, tenantId);
    
    res.json({
      success: true,
      data: invoice
    });
  })
);

/**
 * GET /payments/invoices/:invoiceId/pdf
 * Download invoice PDF
 */
router.get('/invoices/:invoiceId/pdf',
  authenticate(),
  requirePermission(PERMISSIONS.ORDER_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { invoiceId } = req.params;
    
    const { url, filename } = await paymentProcessor.getInvoicePDF(
      invoiceId,
      tenantId
    );
    
    res.json({
      success: true,
      data: {
        url,
        filename,
        expiresIn: 3600 // 1 hour
      }
    });
  })
);

// ============================================================================
// ROUTES - PAYOUTS
// ============================================================================

/**
 * GET /payments/payouts
 * List payouts (for marketplace/connect accounts)
 */
router.get('/payouts',
  authenticate(),
  requireRole(ROLES.TENANT_ADMIN, ROLES.TENANT_OWNER),
  authenticatedApiLimiter,
  validatePagination,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { page = 1, limit = 20, status } = req.query;
    
    const payouts = await paymentProcessor.listPayouts(tenantId, {
      page: Number(page),
      limit: Number(limit),
      filters: {
        status: status as string
      }
    });
    
    res.json({
      success: true,
      data: payouts.data,
      pagination: payouts.pagination
    });
  })
);

/**
 * POST /payments/payouts
 * Request a manual payout
 */
router.post('/payouts',
  authenticate(),
  requireRole(ROLES.TENANT_OWNER),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { amount, currency = 'CHF' } = req.body;
    
    const payout = await paymentProcessor.requestPayout(
      tenantId,
      amount,
      currency
    );
    
    res.status(201).json({
      success: true,
      data: payout
    });
  })
);

// ============================================================================
// ROUTES - TRANSFERS
// ============================================================================

/**
 * POST /payments/transfers
 * Transfer funds between accounts (marketplace)
 */
router.post('/transfers',
  authenticate(),
  requireRole(ROLES.SYSTEM_ADMIN),
  authenticatedApiLimiter,
  validate(PaymentSchemas.transfer),
  asyncHandler(async (req, res) => {
    const transferData = req.body;
    
    const transfer = await paymentProcessor.createTransfer(transferData);
    
    res.status(201).json({
      success: true,
      data: transfer
    });
  })
);

// ============================================================================
// ROUTES - FEES & CHARGES
// ============================================================================

/**
 * GET /payments/fees
 * Calculate payment processing fees
 */
router.get('/fees',
  authenticate({ required: false }),
  publicApiLimiter,
  asyncHandler(async (req, res) => {
    const { 
      amount, 
      currency = 'CHF', 
      paymentMethod = 'card',
      country = 'CH' 
    } = req.query;
    
    if (!amount) {
      throw new ValidationError('Amount is required');
    }
    
    const fees = await paymentProcessor.calculateFees({
      amount: Number(amount),
      currency: currency as string,
      paymentMethod: paymentMethod as string,
      country: country as string
    });
    
    res.json({
      success: true,
      data: fees
    });
  })
);

// ============================================================================
// ROUTES - REPORTS
// ============================================================================

/**
 * GET /payments/reports/summary
 * Get payment summary report
 */
router.get('/reports/summary',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { startDate, endDate } = req.query;
    
    const summary = await paymentProcessor.getPaymentSummary(
      tenantId,
      {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      }
    );
    
    res.json({
      success: true,
      data: summary
    });
  })
);

/**
 * GET /payments/reports/transactions
 * Export transaction report
 */
router.get('/reports/transactions',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_EXPORT),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { startDate, endDate, format = 'csv' } = req.query;
    
    const report = await paymentProcessor.exportTransactions(
      tenantId,
      {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      },
      format as string
    );
    
    res.json({
      success: true,
      data: {
        url: report.url,
        filename: report.filename,
        format: report.format,
        expiresIn: 3600 // 1 hour
      }
    });
  })
);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;