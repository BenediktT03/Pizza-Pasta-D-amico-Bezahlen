import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';
import { validateFirebaseIdToken } from '../utils/auth';
import { paymentService } from '../services/payment.service';
import { z } from 'zod';

const app = express();

// CORS configuration
app.use(cors({ 
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true 
}));

// Middleware
app.use(express.json());

// Validation schemas
const CreatePaymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  tipAmount: z.number().min(0).optional(),
  paymentMethodId: z.string().optional(),
  savePaymentMethod: z.boolean().optional()
});

const RefundSchema = z.object({
  reason: z.string().min(1).max(500),
  amount: z.number().positive().optional() // Partial refund if specified
});

// Routes

/**
 * Create payment intent for order
 * POST /api/payments/create-intent
 */
app.post('/create-intent', async (req, res) => {
  try {
    const validatedData = CreatePaymentSchema.parse(req.body);
    const { orderId, amount, tipAmount, paymentMethodId } = validatedData;

    // Get order details to extract truckId
    const order = await getOrderDetails(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Create payment intent
    const paymentIntent = await paymentService.createPayment({
      amount,
      truckId: order.truckId,
      orderId,
      paymentMethodId,
      tipAmount,
      metadata: {
        orderNumber: order.dailyOrderNumber,
        customerName: order.customerName
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Payment creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment'
    });
  }
});

/**
 * Add tip to existing payment
 * POST /api/payments/:paymentIntentId/add-tip
 */
app.post('/:paymentIntentId/add-tip', async (req, res) => {
  try {
    const { tipAmount } = req.body;

    if (!tipAmount || tipAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tip amount'
      });
    }

    const updatedPaymentIntent = await paymentService.addTip(
      req.params.paymentIntentId,
      tipAmount
    );

    res.json({
      success: true,
      newAmount: updatedPaymentIntent.amount,
      tipAmount
    });
  } catch (error) {
    console.error('Failed to add tip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add tip'
    });
  }
});

/**
 * Process refund
 * POST /api/payments/:paymentIntentId/refund
 */
app.post('/:paymentIntentId/refund',
  validateFirebaseIdToken,
  async (req, res) => {
    try {
      const validatedData = RefundSchema.parse(req.body);

      const refund = await paymentService.processRefund({
        paymentIntentId: req.params.paymentIntentId,
        amount: validatedData.amount,
        reason: validatedData.reason
      });

      res.json({
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        });
      }

      console.error('Refund failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process refund'
      });
    }
  }
);

/**
 * Create Stripe Connect onboarding link
 * POST /api/payments/onboarding
 */
app.post('/onboarding',
  validateFirebaseIdToken,
  async (req, res) => {
    try {
      const { truckId } = req.body;

      if (!truckId) {
        return res.status(400).json({
          success: false,
          error: 'Truck ID required'
        });
      }

      // Check if user owns this truck
      if (!await userOwnsTruck(req.user.uid, truckId)) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Get truck's Stripe account ID
      const truck = await getTruckDetails(truckId);
      if (!truck.stripeAccountId) {
        return res.status(400).json({
          success: false,
          error: 'No Stripe account found for truck'
        });
      }

      // Generate onboarding link
      const onboardingUrl = await paymentService.generateOnboardingLink(
        truck.stripeAccountId,
        truckId
      );

      res.json({
        success: true,
        url: onboardingUrl
      });
    } catch (error) {
      console.error('Failed to create onboarding link:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create onboarding link'
      });
    }
  }
);

/**
 * Get payment methods for customer
 * GET /api/payments/methods
 */
app.get('/methods',
  validateFirebaseIdToken,
  async (req, res) => {
    try {
      // This would retrieve saved payment methods for the authenticated user
      const methods = await paymentService.getCustomerPaymentMethods(req.user.uid);

      res.json({
        success: true,
        methods
      });
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get payment methods'
      });
    }
  }
);

/**
 * Setup TWINT payment
 * POST /api/payments/twint/setup
 */
app.post('/twint/setup', async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Amount and order ID required'
      });
    }

    const twintData = await paymentService.setupTwintPayment(amount, orderId);

    res.json({
      success: true,
      ...twintData
    });
  } catch (error) {
    console.error('Failed to setup TWINT payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup TWINT payment'
    });
  }
});

/**
 * Get platform revenue stats (Master Admin only)
 * GET /api/payments/platform-stats
 */
app.get('/platform-stats',
  validateFirebaseIdToken,
  async (req, res) => {
    try {
      // Check if user is master admin
      if (req.user.role !== 'master_admin') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const { startDate, endDate } = req.query;
      
      const stats = await paymentService.getPlatformStats(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Failed to get platform stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get platform stats'
      });
    }
  }
);

// Helper functions
async function getOrderDetails(orderId: string): Promise<any> {
  // This would fetch order from Firestore
  // Implementation depends on your data structure
  return null;
}

async function userOwnsTruck(userId: string, truckId: string): Promise<boolean> {
  // Check if user owns or has permission for this truck
  return true;
}

async function getTruckDetails(truckId: string): Promise<any> {
  // Fetch truck details from Firestore
  return null;
}

// Export the Express app as a Cloud Function
export const payments = functions
  .region('europe-west6') // Zurich
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60
  })
  .https.onRequest(app);
