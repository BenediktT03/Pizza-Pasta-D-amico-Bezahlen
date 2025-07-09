import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';
import { validateFirebaseIdToken } from '../utils/auth';
import { orderService } from '../services/order.service';
import { z } from 'zod';

const app = express();

// CORS configuration
app.use(cors({ 
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true 
}));

// Middleware
app.use(express.json());

// Swiss phone number validation
const swissPhoneNumber = z.string().regex(
  /^(\+41|0041|0)[1-9]\d{8}$/,
  'Ungültige Schweizer Telefonnummer'
);

// Order validation schema
const CreateOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(99),
    modifiers: z.array(z.string()).optional(),
    specialInstructions: z.string().max(200).optional()
  })).min(1).max(50),
  customerName: z.string().min(2).max(50),
  customerPhone: swissPhoneNumber,
  customerEmail: z.string().email().optional(),
  scheduledFor: z.string().datetime().optional(),
  paymentMethodId: z.string().optional(),
  isVoiceOrder: z.boolean().optional(),
  voiceTranscription: z.string().optional()
});

// Routes

/**
 * Create new order
 * POST /api/trucks/:truckId/orders
 */
app.post('/trucks/:truckId/orders', async (req, res) => {
  try {
    // Validate request body
    const validatedData = CreateOrderSchema.parse(req.body);
    
    // Create order
    const order = await orderService.createOrder({
      truckId: req.params.truckId,
      ...validatedData
    });

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.dailyOrderNumber,
        status: order.status,
        estimatedTime: order.estimatedTime,
        totalAmount: order.totalAmount
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Order creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
});

/**
 * Get order status
 * GET /api/trucks/:truckId/orders/:orderId
 */
app.get('/trucks/:truckId/orders/:orderId', async (req, res) => {
  try {
    const order = await orderService.getOrder(
      req.params.orderId,
      req.params.truckId
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Failed to get order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order'
    });
  }
});

/**
 * Update order status (for truck owners)
 * PATCH /api/trucks/:truckId/orders/:orderId
 */
app.patch('/trucks/:truckId/orders/:orderId', 
  validateFirebaseIdToken,
  async (req, res) => {
    try {
      const { status, estimatedTime, cancelReason } = req.body;

      await orderService.updateOrderStatus(
        req.params.orderId,
        req.params.truckId,
        { status, estimatedTime, cancelReason }
      );

      res.json({
        success: true,
        message: 'Order updated successfully'
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update order'
      });
    }
  }
);

/**
 * Get today's orders for a truck
 * GET /api/trucks/:truckId/orders/today
 */
app.get('/trucks/:truckId/orders/today',
  validateFirebaseIdToken,
  async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const orders = await orderService.getOrdersForPeriod(
        req.params.truckId,
        today,
        tomorrow
      );

      res.json({
        success: true,
        orders,
        count: orders.length
      });
    } catch (error) {
      console.error('Failed to get today\'s orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get orders'
      });
    }
  }
);

/**
 * Health check
 * GET /api/health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'orders-api',
    timestamp: new Date().toISOString()
  });
});

// Export the Express app as a Cloud Function
export const orders = functions
  .region('europe-west6') // Zurich
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60
  })
  .https.onRequest(app);
