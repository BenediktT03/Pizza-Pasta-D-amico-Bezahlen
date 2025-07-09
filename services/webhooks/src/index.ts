/**
 * EATECH Webhook Service
 * Main entry point for webhook handlers
 */

import express from 'express';
import { handleStripeWebhook } from './stripe';
import { 
  handleSMSWebhook,
  handleVoiceWebhook,
  handleVoiceMenuWebhook,
  handleVoiceTranscriptionWebhook,
  handleWhatsAppWebhook
} from './twilio';

const app = express();

// Middleware for raw body (required for Stripe)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// Middleware for URL-encoded body (required for Twilio)
app.use('/webhooks/twilio', express.urlencoded({ extended: false }));

// JSON middleware for other endpoints
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'webhooks',
    timestamp: new Date().toISOString(),
  });
});

// Stripe webhooks
app.post('/webhooks/stripe', handleStripeWebhook);

// Twilio webhooks
app.post('/webhooks/twilio/sms', handleSMSWebhook);
app.post('/webhooks/twilio/voice', handleVoiceWebhook);
app.post('/webhooks/twilio/voice/menu', handleVoiceMenuWebhook);
app.post('/webhooks/twilio/voice/transcription', handleVoiceTranscriptionWebhook);
app.post('/webhooks/twilio/whatsapp', handleWhatsAppWebhook);

// Export all handlers
export * from './stripe';
export * from './twilio';

// Start server if running directly
if (require.main === module) {
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Webhook service listening on port ${port}`);
  });
}

export default app;
