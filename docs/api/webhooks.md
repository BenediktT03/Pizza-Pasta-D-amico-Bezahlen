# EATECH V3.0 Webhooks Documentation

**Version:** 3.0.0  
**Environment:** Production  
**Security:** HMAC SHA-256 Signatures  
**Last Updated:** Januar 2025

---

## 📋 Inhaltsverzeichnis

1. [Webhook Overview](#webhook-overview)
2. [Configuration](#configuration)
3. [Security & Verification](#security--verification)
4. [Event Types](#event-types)
5. [Payload Structures](#payload-structures)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Swiss Compliance](#swiss-compliance)

---

## 🔗 Webhook Overview

EATECH Webhooks ermöglichen Echtzeit-Benachrichtigungen über Events in Ihrem Foodtruck-System. Webhooks werden als HTTP POST-Requests an Ihre konfigurierten Endpoints gesendet.

### Key Features
- **Echtzeit Updates** - Sofortige Benachrichtigung bei Events
- **Reliable Delivery** - Retry-Mechanismus bei Fehlern
- **Security** - HMAC SHA-256 Signatur-Verifizierung
- **Multi-Tenant** - Isolierte Webhooks pro Tenant
- **Swiss Compliance** - DSGVO/DSG konforme Datenübertragung

### Supported Events
- Order Lifecycle Events
- Payment Status Changes
- Inventory Updates
- Customer Actions
- System Alerts
- AI Insights
- Event Management

---

## ⚙️ Configuration

### Webhook Endpoints Setup

```http
POST /api/tenants/{tenantId}/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-domain.com/webhooks/eatech",
  "events": [
    "order.created",
    "order.status_changed",
    "payment.succeeded",
    "payment.failed"
  ],
  "active": true,
  "secret": "your-webhook-secret-key",
  "headers": {
    "X-Custom-Header": "custom-value"
  },
  "retryPolicy": {
    "maxRetries": 3,
    "backoffMultiplier": 2,
    "initialDelay": 1000
  }
}
```

### Response
```json
{
  "id": "webhook_abc123",
  "url": "https://your-domain.com/webhooks/eatech",
  "events": [
    "order.created",
    "order.status_changed",
    "payment.succeeded",
    "payment.failed"
  ],
  "active": true,
  "secret": "whsec_...",
  "createdAt": "2025-01-07T12:00:00Z",
  "lastDeliveryAt": null,
  "deliverySuccess": null
}
```

### List Webhooks
```http
GET /api/tenants/{tenantId}/webhooks
Authorization: Bearer {token}
```

### Update Webhook
```http
PUT /api/tenants/{tenantId}/webhooks/{webhookId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "events": [
    "order.*",
    "payment.*"
  ],
  "active": true
}
```

### Delete Webhook
```http
DELETE /api/tenants/{tenantId}/webhooks/{webhookId}
Authorization: Bearer {token}
```

---

## 🔐 Security & Verification

### HMAC Signature Verification

Jeder Webhook-Request wird mit einer HMAC SHA-256 Signatur versehen:

```javascript
// Node.js Example
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const receivedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

// Express.js Middleware
app.use('/webhooks/eatech', (req, res, next) => {
  const signature = req.headers['x-eatech-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
});
```

### Headers
```http
POST /your-webhook-endpoint
Content-Type: application/json
X-EATECH-Signature: sha256=a1b2c3d4e5f6...
X-EATECH-Event: order.created
X-EATECH-Delivery: delivery_123
X-EATECH-Timestamp: 1609459200
X-EATECH-Tenant: tenant_123
```

---

## 📅 Event Types

### Order Events

| Event | Beschreibung |
|-------|-------------|
| `order.created` | Neue Bestellung erstellt |
| `order.updated` | Bestellung aktualisiert |
| `order.status_changed` | Status geändert |
| `order.cancelled` | Bestellung storniert |
| `order.completed` | Bestellung abgeschlossen |
| `order.refunded` | Rückerstattung verarbeitet |

### Payment Events

| Event | Beschreibung |
|-------|-------------|
| `payment.initiated` | Zahlung gestartet |
| `payment.processing` | Zahlung wird verarbeitet |
| `payment.succeeded` | Zahlung erfolgreich |
| `payment.failed` | Zahlung fehlgeschlagen |
| `payment.refunded` | Rückerstattung erfolgt |
| `payment.disputed` | Zahlung bestritten |

### Product Events

| Event | Beschreibung |
|-------|-------------|
| `product.created` | Produkt erstellt |
| `product.updated` | Produkt aktualisiert |
| `product.deleted` | Produkt gelöscht |
| `product.availability_changed` | Verfügbarkeit geändert |
| `product.out_of_stock` | Produkt ausverkauft |
| `product.low_stock` | Niedriger Lagerbestand |

### Customer Events

| Event | Beschreibung |
|-------|-------------|
| `customer.created` | Neuer Kunde registriert |
| `customer.updated` | Kunde aktualisiert |
| `customer.deleted` | Kunde gelöscht |
| `customer.loyalty_tier_changed` | Treueprogramm-Tier geändert |

### System Events

| Event | Beschreibung |
|-------|-------------|
| `system.emergency_activated` | Notfallmodus aktiviert |
| `system.emergency_deactivated` | Notfallmodus deaktiviert |
| `system.maintenance_started` | Wartung gestartet |
| `system.maintenance_completed` | Wartung abgeschlossen |

### AI Events

| Event | Beschreibung |
|-------|-------------|
| `ai.price_optimization` | Preisoptimierung verfügbar |
| `ai.demand_forecast` | Nachfrageprognose aktualisiert |
| `ai.anomaly_detected` | Anomalie erkannt |
| `ai.insight_generated` | Neue KI-Erkenntnis |

### Event Management

| Event | Beschreibung |
|-------|-------------|
| `event.created` | Event erstellt |
| `event.participant_joined` | Teilnehmer beigetreten |
| `event.participant_left` | Teilnehmer verlassen |
| `event.metrics_updated` | Event-Metriken aktualisiert |

---

## 📦 Payload Structures

### Order Events

#### order.created
```json
{
  "event": "order.created",
  "data": {
    "orderId": "order_789",
    "orderNumber": "BP-2025-0001",
    "tenantId": "tenant_123",
    "status": "pending",
    "type": "pickup",
    "channel": "web",
    "customer": {
      "id": "cust_456",
      "name": "Max Mustermann",
      "phone": "+41791234567",
      "email": "max@example.com"
    },
    "items": [
      {
        "id": "item_1",
        "productId": "prod_123",
        "productName": "Classic Burger",
        "variantName": "Normal (200g)",
        "quantity": 2,
        "unitPrice": 16.90,
        "modifiers": [
          {
            "groupName": "Extras",
            "optionName": "Bacon",
            "price": 3.50
          }
        ],
        "totalPrice": 40.80
      }
    ],
    "pricing": {
      "subtotal": 40.80,
      "tax": 3.14,
      "total": 43.94,
      "currency": "CHF"
    },
    "fulfillment": {
      "type": "pickup",
      "timing": {
        "requestedAt": "2025-01-07T13:00:00Z",
        "promisedAt": "2025-01-07T13:15:00Z",
        "estimatedAt": "2025-01-07T13:12:00Z"
      },
      "pickup": {
        "location": "main",
        "code": "4321"
      }
    },
    "context": {
      "location": {
        "coordinates": {
          "lat": 47.3699,
          "lng": 8.5380
        }
      },
      "device": {
        "type": "mobile",
        "os": "ios"
      }
    }
  },
  "timestamp": "2025-01-07T12:34:56Z",
  "version": "3.0.0"
}
```

#### order.status_changed
```json
{
  "event": "order.status_changed",
  "data": {
    "orderId": "order_789",
    "orderNumber": "BP-2025-0001",
    "tenantId": "tenant_123",
    "previousStatus": "confirmed",
    "newStatus": "preparing",
    "statusChangedBy": {
      "type": "staff",
      "id": "staff_456",
      "name": "Hans Müller"
    },
    "estimatedReadyTime": "2025-01-07T13:10:00Z",
    "notes": "Started preparation on grill station",
    "customer": {
      "id": "cust_456",
      "name": "Max Mustermann",
      "phone": "+41791234567",
      "notificationPreferences": {
        "sms": true,
        "push": true,
        "email": false
      }
    }
  },
  "timestamp": "2025-01-07T12:40:00Z",
  "version": "3.0.0"
}
```

### Payment Events

#### payment.succeeded
```json
{
  "event": "payment.succeeded",
  "data": {
    "paymentId": "pay_abc123",
    "orderId": "order_789",
    "orderNumber": "BP-2025-0001",
    "tenantId": "tenant_123",
    "amount": 43.94,
    "currency": "CHF",
    "method": "card",
    "processor": "stripe",
    "processorTransactionId": "ch_3ABC123",
    "card": {
      "brand": "visa",
      "last4": "4242",
      "country": "CH"
    },
    "customer": {
      "id": "cust_456",
      "name": "Max Mustermann"
    },
    "metadata": {
      "tip": 5.00,
      "processingFee": 1.31
    }
  },
  "timestamp": "2025-01-07T12:35:00Z",
  "version": "3.0.0"
}
```

#### payment.failed
```json
{
  "event": "payment.failed",
  "data": {
    "paymentId": "pay_abc123",
    "orderId": "order_789",
    "tenantId": "tenant_123",
    "amount": 43.94,
    "currency": "CHF",
    "method": "card",
    "processor": "stripe",
    "errorCode": "card_declined",
    "errorMessage": "Your card was declined",
    "retryable": true,
    "customer": {
      "id": "cust_456",
      "name": "Max Mustermann",
      "phone": "+41791234567"
    }
  },
  "timestamp": "2025-01-07T12:35:00Z",
  "version": "3.0.0"
}
```

### Inventory Events

#### product.out_of_stock
```json
{
  "event": "product.out_of_stock",
  "data": {
    "productId": "prod_123",
    "productName": "Classic Burger",
    "tenantId": "tenant_123",
    "variantId": "var_regular",
    "variantName": "Normal (200g)",
    "previousQuantity": 5,
    "currentQuantity": 0,
    "lastOrderId": "order_789",
    "estimatedRestockTime": "2025-01-07T15:00:00Z",
    "autoDisabled": true,
    "affectedOrders": 3,
    "supplier": {
      "name": "Metro AG",
      "contactPerson": "Hans Müller",
      "phone": "+41441234567"
    }
  },
  "timestamp": "2025-01-07T12:45:00Z",
  "version": "3.0.0"
}
```

### AI Events

#### ai.price_optimization
```json
{
  "event": "ai.price_optimization",
  "data": {
    "tenantId": "tenant_123",
    "productId": "prod_123",
    "productName": "Classic Burger",
    "optimization": {
      "currentPrice": 16.90,
      "recommendedPrice": 17.50,
      "confidence": 0.89,
      "factors": {
        "demand": 0.15,
        "weather": 0.08,
        "competition": -0.02,
        "inventory": -0.05
      },
      "projectedImpact": {
        "revenueLift": 0.08,
        "demandChange": -0.03,
        "profitIncrease": 0.12
      },
      "recommendation": "increase",
      "reasoning": "High demand and favorable weather conditions support price increase"
    },
    "validUntil": "2025-01-07T18:00:00Z"
  },
  "timestamp": "2025-01-07T12:00:00Z",
  "version": "3.0.0"
}
```

### System Events

#### system.emergency_activated
```json
{
  "event": "system.emergency_activated",
  "data": {
    "tenantId": "tenant_123",
    "emergencyMode": {
      "type": "rush_hour_optimization",
      "trigger": "high_wait_times",
      "severity": "high",
      "activatedBy": "ai_system",
      "context": {
        "currentWaitTime": 45,
        "queueLength": 15,
        "availableStaff": 2,
        "orderVolume": 23
      },
      "adjustments": {
        "menu": {
          "disabled": ["prod_789", "prod_101"],
          "promoted": ["prod_123", "prod_456"]
        },
        "pricing": {
          "surge": 1.2,
          "happyHour": false
        },
        "operations": {
          "batchOrders": true,
          "simplifiedMenu": true,
          "staffAlert": true
        }
      },
      "estimatedImpact": {
        "waitTimeReduction": "30%",
        "throughputIncrease": "25%"
      },
      "estimatedDuration": 45
    }
  },
  "timestamp": "2025-01-07T12:30:00Z",
  "version": "3.0.0"
}
```

### Customer Events

#### customer.loyalty_tier_changed
```json
{
  "event": "customer.loyalty_tier_changed",
  "data": {
    "customerId": "cust_456",
    "tenantId": "tenant_123",
    "customer": {
      "name": "Max Mustermann",
      "email": "max@example.com",
      "phone": "+41791234567"
    },
    "loyaltyProgram": {
      "previousTier": "bronze",
      "newTier": "silver",
      "currentPoints": 1250,
      "pointsToNextTier": 750,
      "benefits": [
        "5% discount on all orders",
        "Free delivery",
        "Priority support",
        "Birthday special"
      ]
    },
    "triggeringOrder": {
      "orderId": "order_789",
      "orderNumber": "BP-2025-0001",
      "pointsEarned": 44
    }
  },
  "timestamp": "2025-01-07T12:55:00Z",
  "version": "3.0.0"
}
```

### Event Management

#### event.participant_joined
```json
{
  "event": "event.participant_joined",
  "data": {
    "eventId": "event_456",
    "eventName": "Zürich Street Food Festival",
    "participant": {
      "tenantId": "tenant_123",
      "tenantName": "Burger Paradise",
      "status": "confirmed",
      "spotNumber": "A15",
      "joinedAt": "2025-01-07T12:00:00Z"
    },
    "event": {
      "startDate": "2025-08-01T10:00:00Z",
      "endDate": "2025-08-03T22:00:00Z",
      "location": {
        "name": "Sechseläutenplatz",
        "city": "Zürich",
        "coordinates": {
          "lat": 47.3667,
          "lng": 8.5500
        }
      }
    },
    "totalParticipants": 45,
    "maxParticipants": 50
  },
  "timestamp": "2025-01-07T12:00:00Z",
  "version": "3.0.0"
}
```

---

## ⚠️ Error Handling

### Retry Policy

EATECH implementiert ein exponential backoff Retry-System:

1. **Initial Retry:** Nach 1 Sekunde
2. **Second Retry:** Nach 2 Sekunden  
3. **Third Retry:** Nach 4 Sekunden
4. **Final Retry:** Nach 8 Sekunden

### Failed Deliveries

Bei dauerhaft fehlgeschlagenen Deliveries:

```json
{
  "event": "webhook.delivery_failed",
  "data": {
    "webhookId": "webhook_abc123",
    "url": "https://your-domain.com/webhooks/eatech",
    "originalEvent": "order.created",
    "attempts": 4,
    "lastError": {
      "code": "TIMEOUT",
      "message": "Request timeout after 30 seconds",
      "httpStatus": null
    },
    "nextRetryAt": null,
    "disabled": true
  },
  "timestamp": "2025-01-07T12:45:00Z"
}
```

### Response Requirements

Ihr Webhook-Endpoint sollte:
- **HTTP 200** zurückgeben für erfolgreiche Verarbeitung
- Innerhalb von **30 Sekunden** antworten
- **Idempotent** sein (mehrfache Verarbeitung derselben Events handhaben)

```javascript
// Express.js Example
app.post('/webhooks/eatech', (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Process the webhook
    await processWebhook(event, data);
    
    // Return success
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    
    // Return error (will trigger retry)
    res.status(500).json({ 
      error: 'Internal server error',
      retryable: true 
    });
  }
});
```

---

## 🎯 Best Practices

### 1. Idempotency
```javascript
// Store processed webhook IDs to prevent duplicate processing
const processedWebhooks = new Set();

app.post('/webhooks/eatech', (req, res) => {
  const deliveryId = req.headers['x-eatech-delivery'];
  
  if (processedWebhooks.has(deliveryId)) {
    return res.status(200).json({ received: true, duplicate: true });
  }
  
  // Process webhook
  processWebhook(req.body);
  
  // Mark as processed
  processedWebhooks.add(deliveryId);
  
  res.status(200).json({ received: true });
});
```

### 2. Async Processing
```javascript
// Queue webhook for background processing
app.post('/webhooks/eatech', async (req, res) => {
  // Quickly acknowledge receipt
  res.status(200).json({ received: true });
  
  // Process in background
  await webhookQueue.add('process-webhook', {
    event: req.body.event,
    data: req.body.data,
    deliveryId: req.headers['x-eatech-delivery']
  });
});
```

### 3. Error Handling
```javascript
const processWebhook = async (event, data) => {
  try {
    switch (event) {
      case 'order.created':
        await handleNewOrder(data);
        break;
      case 'payment.succeeded':
        await handlePaymentSuccess(data);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
  } catch (error) {
    // Log error for debugging
    console.error(`Webhook processing failed for ${event}:`, error);
    
    // Consider if error is retryable
    if (error.code === 'TEMPORARY_ERROR') {
      throw error; // Will trigger retry
    }
    
    // Log and continue for non-retryable errors
    await logNonRetryableError(event, data, error);
  }
};
```

### 4. Monitoring
```javascript
// Add monitoring for webhook processing
const webhookMetrics = {
  received: 0,
  processed: 0,
  failed: 0,
  avgProcessingTime: 0
};

app.post('/webhooks/eatech', async (req, res) => {
  const startTime = Date.now();
  webhookMetrics.received++;
  
  try {
    await processWebhook(req.body);
    webhookMetrics.processed++;
    
    const processingTime = Date.now() - startTime;
    webhookMetrics.avgProcessingTime = 
      (webhookMetrics.avgProcessingTime + processingTime) / 2;
    
    res.status(200).json({ received: true });
  } catch (error) {
    webhookMetrics.failed++;
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🧪 Testing

### Webhook Testing Tool

```bash
# Test einzelnen Webhook
curl -X POST https://api.eatech.ch/v3/tenants/{tenantId}/webhooks/{webhookId}/test \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.created",
    "testData": true
  }'
```

### Test Event Payload
```json
{
  "event": "order.created",
  "data": {
    "orderId": "test_order_123",
    "orderNumber": "TEST-2025-0001",
    "tenantId": "tenant_123",
    "status": "pending",
    "test": true,
    "customer": {
      "name": "Test Customer",
      "phone": "+41791234567"
    },
    "items": [
      {
        "productName": "Test Product",
        "quantity": 1,
        "totalPrice": 19.90
      }
    ],
    "pricing": {
      "total": 19.90,
      "currency": "CHF"
    }
  },
  "timestamp": "2025-01-07T12:00:00Z",
  "version": "3.0.0"
}
```

### Webhook Simulator

```javascript
// Node.js webhook simulator for development
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Simulate EATECH webhook
app.post('/simulate-webhook', (req, res) => {
  const { url, secret, event, data } = req.body;
  
  const payload = JSON.stringify({
    event,
    data: { ...data, test: true },
    timestamp: new Date().toISOString(),
    version: '3.0.0'
  });
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-EATECH-Signature': `sha256=${signature}`,
      'X-EATECH-Event': event,
      'X-EATECH-Delivery': `test_${Date.now()}`,
      'X-EATECH-Timestamp': Math.floor(Date.now() / 1000)
    },
    body: payload
  })
  .then(response => {
    res.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText
    });
  })
  .catch(error => {
    res.status(500).json({ error: error.message });
  });
});

app.listen(3001, () => {
  console.log('Webhook simulator running on port 3001');
});
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Signature Verification Fails
```javascript
// Debug signature verification
function debugSignatureVerification(payload, receivedSignature, secret) {
  console.log('Payload:', payload);
  console.log('Received signature:', receivedSignature);
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  console.log('Expected signature:', expectedSignature);
  console.log('Signatures match:', receivedSignature.includes(expectedSignature));
}
```

#### 2. Timeouts
- Vergrössern Sie das Timeout in Ihrer HTTP-Client-Konfiguration
- Implementieren Sie asynchrone Verarbeitung
- Optimieren Sie Ihre Webhook-Handler

#### 3. Duplicate Events
```javascript
// Implement idempotency with database
const processedEvents = new Map();

const isProcessed = async (deliveryId) => {
  return await db.webhookDeliveries.findOne({ deliveryId });
};

const markProcessed = async (deliveryId, event, data) => {
  await db.webhookDeliveries.create({
    deliveryId,
    event,
    processedAt: new Date(),
    data: JSON.stringify(data)
  });
};
```

### Webhook Logs

Zugriff auf Webhook-Delivery-Logs:

```http
GET /api/tenants/{tenantId}/webhooks/{webhookId}/deliveries
Authorization: Bearer {token}
```

Response:
```json
{
  "deliveries": [
    {
      "id": "delivery_123",
      "event": "order.created",
      "url": "https://your-domain.com/webhooks/eatech",
      "status": "success",
      "httpStatus": 200,
      "attempts": 1,
      "deliveredAt": "2025-01-07T12:34:58Z",
      "responseTime": 245
    },
    {
      "id": "delivery_124",
      "event": "payment.failed",
      "url": "https://your-domain.com/webhooks/eatech",
      "status": "failed",
      "httpStatus": 500,
      "attempts": 4,
      "lastAttemptAt": "2025-01-07T12:35:15Z",
      "error": "Internal server error"
    }
  ]
}
```

---

## 🇨🇭 Swiss Compliance

### Data Protection (DSG/DSGVO)

#### Minimal Data Principle
Webhooks enthalten nur notwendige Daten:
- Keine vollständigen Kreditkartennummern
- Keine Passwörter oder Geheimnisse
- Hash-IDs für externe Referenzen

#### Data Retention
```javascript
// Automatische Löschung von Webhook-Logs nach 90 Tagen
const cleanupOldWebhookLogs = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  
  await db.webhookDeliveries.deleteMany({
    createdAt: { $lt: cutoffDate }
  });
};
```

#### Consent Management
Webhook-Events respektieren Kunden-Einwilligungen:

```json
{
  "event": "order.created",
  "data": {
    "customer": {
      "id": "cust_456",
      "name": "Max Mustermann",
      "phone": "+41791234567",
      "consentGiven": true,
      "marketingOptIn": false,
      "dataProcessingConsent": true
    }
  }
}
```

### Swiss Format Compliance

#### Phone Numbers
- Format: `+41XXXXXXXXX`
- Validation in Webhook-Payloads

#### Addresses
```json
{
  "address": {
    "street": "Bahnhofstrasse 1",
    "city": "Zürich",
    "zip": "8001",
    "canton": "ZH",
    "country": "CH"
  }
}
```

#### Currency & Taxes
```json
{
  "pricing": {
    "subtotal": 40.80,
    "tax": 3.14,
    "taxRate": 7.7,
    "total": 43.94,
    "currency": "CHF"
  }
}
```

---

## 📞 Support

### Webhook Management Dashboard
- **URL:** [https://app.eatech.ch/settings/webhooks](https://app.eatech.ch/settings/webhooks)
- **Test Tool:** [https://app.eatech.ch/tools/webhook-tester](https://app.eatech.ch/tools/webhook-tester)

### Technical Support
- **E-Mail:** [webhooks@eatech.ch](mailto:webhooks@eatech.ch)
- **Docs:** [https://docs.eatech.ch/webhooks](https://docs.eatech.ch/webhooks)
- **Status:** [https://status.eatech.ch](https://status.eatech.ch)

### Webhook Security Best Practices Guide
- **URL:** [https://docs.eatech.ch/webhooks/security](https://docs.eatech.ch/webhooks/security)

---

*Last Updated: Januar 2025 - EATECH V3.0*