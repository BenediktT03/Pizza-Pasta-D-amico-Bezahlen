import * as functions from 'firebase-functions';
import * as express from 'express';
import * as cors from 'cors';
import * as multer from 'multer';
import { validateFirebaseIdToken } from '../utils/auth';
import { aiService } from '../services/ai.service';
import { requireFeature } from '../utils/feature-flags';
import { z } from 'zod';

const app = express();

// CORS configuration
app.use(cors({ 
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true 
}));

// Middleware
app.use(express.json());

// Multer for file uploads (voice recordings)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Validation schemas
const ChatSchema = z.object({
  message: z.string().min(1).max(1000),
  language: z.enum(['de', 'fr', 'it', 'en']).optional().default('de')
});

const DynamicPricingSchema = z.object({
  productId: z.string().min(1),
  basePrice: z.number().positive(),
  context: z.object({
    currentCapacity: z.number().min(0).max(100),
    weather: z.object({
      temperature: z.number(),
      condition: z.string()
    }).optional(),
    nearbyEvents: z.array(z.string()).optional()
  })
});

// Routes

/**
 * Process voice order
 * POST /api/ai/voice-order/:truckId
 */
app.post('/voice-order/:truckId',
  requireFeature('voice_ordering'),
  upload.single('audio'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No audio file provided'
        });
      }

      const language = req.body.language || 'de';
      
      // Check for Swiss German feature flag
      if (language === 'de-CH') {
        const swissGermanEnabled = await requireFeature('voice_swiss_german')(req, res, () => {});
        if (!swissGermanEnabled) {
          return res.status(403).json({
            success: false,
            error: 'Swiss German voice ordering not enabled'
          });
        }
      }

      // Process voice order
      const result = await aiService.processVoiceOrder({
        audioBuffer: req.file.buffer,
        language,
        truckId: req.params.truckId
      });

      res.json({
        success: true,
        transcription: result.transcription,
        items: result.items,
        confidence: result.confidence,
        needsConfirmation: result.needsConfirmation,
        specialRequests: result.specialRequests
      });
    } catch (error) {
      console.error('Voice order processing failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process voice order'
      });
    }
  }
);

/**
 * Chat with AI assistant
 * POST /api/ai/chat/:truckId
 */
app.post('/chat/:truckId', async (req, res) => {
  try {
    const validatedData = ChatSchema.parse(req.body);
    
    // Get truck context
    const truckContext = await getTruckContext(req.params.truckId);

    // Process chat message
    const response = await aiService.chatWithCustomer({
      message: validatedData.message,
      context: {
        truckId: req.params.truckId,
        truckName: truckContext.name,
        products: truckContext.products,
        language: validatedData.language
      }
    });

    res.json({
      success: true,
      response: response.message,
      isComplaint: response.isComplaint,
      allergenInfo: response.allergenInfo,
      suggestedProducts: response.suggestedProducts
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Chat processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message'
    });
  }
});

/**
 * Get dynamic pricing suggestion
 * POST /api/ai/pricing/:truckId
 */
app.post('/pricing/:truckId',
  validateFirebaseIdToken,
  requireFeature('dynamic_pricing'),
  async (req, res) => {
    try {
      const validatedData = DynamicPricingSchema.parse(req.body);
      
      // Add current context
      const context = {
        ...validatedData.context,
        currentTime: new Date(),
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        historicalSales: await getHistoricalSales(
          req.params.truckId, 
          validatedData.productId
        )
      };

      // Get pricing suggestion
      const pricing = await aiService.calculateDynamicPrice({
        productId: validatedData.productId,
        truckId: req.params.truckId,
        basePrice: validatedData.basePrice,
        context
      });

      res.json({
        success: true,
        pricing
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        });
      }

      console.error('Dynamic pricing failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate dynamic pricing'
      });
    }
  }
);

/**
 * Get AI predictions
 * GET /api/ai/predictions/:truckId
 */
app.get('/predictions/:truckId',
  validateFirebaseIdToken,
  async (req, res) => {
    try {
      const { type = 'all' } = req.query;
      const predictions: any = {};

      // Get requested prediction types
      const types = type === 'all' 
        ? ['inventory', 'rushHour', 'revenue', 'maintenance']
        : [type as string];

      for (const predType of types) {
        predictions[predType] = await aiService.generatePredictions({
          truckId: req.params.truckId,
          type: predType as any,
          historicalDays: 30
        });
      }

      res.json({
        success: true,
        predictions
      });
    } catch (error) {
      console.error('Failed to generate predictions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate predictions'
      });
    }
  }
);

/**
 * Process voice feedback after meal
 * POST /api/ai/feedback/:orderId
 */
app.post('/feedback/:orderId',
  upload.single('audio'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No audio file provided'
        });
      }

      const language = req.body.language || 'de';

      // Process voice feedback
      const result = await aiService.processVoiceFeedback(
        req.file.buffer,
        req.params.orderId,
        language
      );

      res.json({
        success: true,
        transcription: result.transcription,
        sentiment: result.sentiment,
        insights: result.insights,
        actionRequired: result.actionRequired
      });
    } catch (error) {
      console.error('Voice feedback processing failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process voice feedback'
      });
    }
  }
);

/**
 * Get rush hour predictions for today
 * GET /api/ai/rush-hours/:truckId
 */
app.get('/rush-hours/:truckId', async (req, res) => {
  try {
    const predictions = await aiService.generatePredictions({
      truckId: req.params.truckId,
      type: 'rushHour',
      historicalDays: 30
    });

    res.json({
      success: true,
      rushHours: predictions.predictions.patterns,
      todayPeaks: predictions.predictions.tomorrow.expectedPeaks,
      recommendations: predictions.predictions.tomorrow.recommendations
    });
  } catch (error) {
    console.error('Failed to get rush hour predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rush hour predictions'
    });
  }
});

// Helper functions
async function getTruckContext(truckId: string): Promise<any> {
  // Fetch truck data and products from Firestore
  // This is a placeholder implementation
  return {
    name: 'Food Truck',
    products: []
  };
}

async function getHistoricalSales(truckId: string, productId: string): Promise<any> {
  // Fetch historical sales data for the product
  // This is a placeholder implementation
  return {
    last7Days: [],
    last30Days: []
  };
}

// Export the Express app as a Cloud Function
export const ai = functions
  .region('europe-west6') // Zurich
  .runWith({
    memory: '1GB', // More memory for AI processing
    timeoutSeconds: 120 // Longer timeout for voice processing
  })
  .https.onRequest(app);
