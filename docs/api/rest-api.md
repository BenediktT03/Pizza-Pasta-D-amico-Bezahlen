# EATECH V3.0 REST API Documentation

**Version:** 3.0.0  
**Base URL:** `https://api.eatech.ch/v3`  
**Environment:** Production  
**Last Updated:** Januar 2025

---

## 📋 Inhaltsverzeichnis

1. [Authentication](#authentication)
2. [Multi-Tenant System](#multi-tenant-system)
3. [Orders API](#orders-api)
4. [Products API](#products-api)
5. [Analytics API](#analytics-api)
6. [AI Services API](#ai-services-api)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Webhooks](#webhooks)
10. [Swiss Compliance](#swiss-compliance)

---

## 🔐 Authentication

### JWT Token System
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@burgerparadise.ch",
  "password": "password123",
  "tenantId": "tenant_123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rt_abc123...",
  "expiresIn": 3600,
  "user": {
    "id": "user_456",
    "email": "admin@burgerparadise.ch",
    "role": "admin",
    "permissions": ["orders:read", "orders:write", "products:manage"]
  },
  "tenant": {
    "id": "tenant_123",
    "name": "Burger Paradise",
    "slug": "burger-paradise",
    "plan": "premium"
  }
}
```

### Phone Verification (Swiss Numbers)
```http
POST /api/auth/verify-phone
Content-Type: application/json

{
  "phone": "+41791234567",
  "tenantId": "tenant_123"
}
```

### OTP Verification
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+41791234567",
  "otp": "123456",
  "tenantId": "tenant_123"
}
```

---

## 🏢 Multi-Tenant System

### Get Tenant Information
```http
GET /api/tenants/{tenantId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "tenant_123",
  "name": "Burger Paradise",
  "slug": "burger-paradise",
  "status": "active",
  "subscription": {
    "plan": "premium",
    "status": "active",
    "nextBillingDate": "2025-02-01T00:00:00Z",
    "price": 49.00,
    "currency": "CHF"
  },
  "settings": {
    "language": "de",
    "languages": ["de", "fr", "en"],
    "timezone": "Europe/Zurich",
    "currency": "CHF",
    "taxRate": 7.7,
    "features": {
      "allowPreorders": true,
      "allowDelivery": false,
      "loyaltyProgram": true,
      "aiPricing": true,
      "voiceCommerce": true
    }
  },
  "branding": {
    "colors": {
      "primary": "#FF6B35",
      "secondary": "#004E89"
    },
    "assets": {
      "logo": "https://storage.eatech.ch/tenants/123/logo.png"
    }
  }
}
```

### Update Tenant Settings
```http
PUT /api/tenants/{tenantId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "settings": {
    "taxRate": 7.7,
    "features": {
      "allowPreorders": true,
      "voiceCommerce": true
    }
  },
  "operatingHours": {
    "monday": { "open": "11:00", "close": "21:00" },
    "tuesday": { "open": "11:00", "close": "21:00" }
  }
}
```

---

## 🛒 Orders API

### Create Order
```http
POST /api/tenants/{tenantId}/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "pickup",
  "channel": "web",
  "customer": {
    "name": "Max Mustermann",
    "phone": "+41791234567",
    "email": "max@example.com",
    "language": "de"
  },
  "items": [
    {
      "productId": "prod_123",
      "variantId": "var_regular",
      "quantity": 2,
      "modifiers": [
        {
          "groupId": "toppings",
          "optionId": "bacon",
          "price": 3.50
        }
      ],
      "notes": "Ohne Zwiebeln bitte"
    }
  ],
  "fulfillment": {
    "timing": {
      "requestedType": "asap"
    },
    "pickup": {
      "location": "main"
    }
  },
  "payment": {
    "method": "card"
  },
  "context": {
    "location": {
      "coordinates": {
        "lat": 47.3699,
        "lng": 8.5380
      }
    }
  }
}
```

**Response:**
```json
{
  "id": "order_789",
  "orderNumber": "BP-2025-0001",
  "status": "pending",
  "type": "pickup",
  "customer": {
    "id": "cust_123",
    "name": "Max Mustermann",
    "phone": "+41791234567"
  },
  "items": [
    {
      "id": "item_1",
      "productName": "Classic Burger",
      "variantName": "Normal (200g)",
      "quantity": 2,
      "unitPrice": 16.90,
      "totalPrice": 40.80
    }
  ],
  "pricing": {
    "subtotal": 40.80,
    "taxAmount": 3.14,
    "total": 43.94,
    "currency": "CHF"
  },
  "fulfillment": {
    "timing": {
      "promisedAt": "2025-01-07T13:15:00Z",
      "estimatedAt": "2025-01-07T13:12:00Z"
    },
    "pickup": {
      "code": "4321",
      "qrCode": "data:image/png;base64,..."
    }
  },
  "createdAt": "2025-01-07T12:34:00Z"
}
```

### Get Orders
```http
GET /api/tenants/{tenantId}/orders?status=confirmed&limit=20&page=1
Authorization: Bearer {token}
```

**Query Parameters:**
- `status`: `pending`, `confirmed`, `preparing`, `ready`, `completed`, `cancelled`
- `type`: `pickup`, `delivery`, `dinein`
- `channel`: `web`, `app`, `pos`, `phone`
- `date`: ISO date string (e.g., `2025-01-07`)
- `customer`: Customer ID
- `limit`: Number of results (max 100)
- `page`: Page number

### Update Order Status
```http
PATCH /api/tenants/{tenantId}/orders/{orderId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "preparing",
  "staffId": "staff_789",
  "estimatedReadyTime": "2025-01-07T13:10:00Z",
  "notes": "Started preparation"
}
```

### Process Refund
```http
POST /api/tenants/{tenantId}/orders/{orderId}/refund
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 43.94,
  "reason": "customer_request",
  "refundMethod": "original_payment",
  "notes": "Customer requested refund due to long wait"
}
```

---

## 🍔 Products API

### Get Products
```http
GET /api/tenants/{tenantId}/products?category=main&available=true
Authorization: Bearer {token}
```

**Query Parameters:**
- `category`: Product category
- `available`: `true`/`false`
- `search`: Search term
- `tags`: Comma-separated tags
- `featured`: `true`/`false`

**Response:**
```json
{
  "products": [
    {
      "id": "prod_123",
      "name": {
        "de": "Classic Burger",
        "fr": "Burger Classique",
        "en": "Classic Burger"
      },
      "description": {
        "de": "Saftiges Rindfleisch mit frischen Zutaten"
      },
      "category": "main",
      "subcategory": "burgers",
      "tags": ["bestseller", "spicy"],
      "pricing": {
        "basePrice": 16.90,
        "currency": "CHF",
        "taxRate": 7.7
      },
      "variants": [
        {
          "id": "var_regular",
          "name": { "de": "Normal (200g)" },
          "price": 16.90,
          "isDefault": true,
          "inventory": {
            "quantity": 100,
            "available": true
          }
        }
      ],
      "modifierGroups": [
        {
          "id": "toppings",
          "name": { "de": "Extras" },
          "required": false,
          "min": 0,
          "max": 5,
          "options": [
            {
              "id": "bacon",
              "name": { "de": "Bacon" },
              "price": 3.50
            }
          ]
        }
      ],
      "media": {
        "images": [
          {
            "url": "https://storage.eatech.ch/products/123/burger-main.jpg",
            "thumbnails": {
              "small": "https://cdn.eatech.ch/cdn-cgi/image/w=300/products/123/burger-main.jpg"
            },
            "alt": { "de": "Classic Burger Hauptbild" }
          }
        ]
      },
      "nutrition": {
        "calories": 650,
        "protein": 35,
        "carbs": 45,
        "fat": 30
      },
      "allergens": {
        "contains": ["gluten", "milk", "egg"],
        "mayContain": ["soy", "nuts"]
      },
      "availability": {
        "status": "available",
        "schedule": {
          "always": false,
          "rules": [
            {
              "type": "daily",
              "startTime": "11:00",
              "endTime": "21:00"
            }
          ]
        }
      },
      "analytics": {
        "orders": {
          "total": 3421,
          "lastMonth": 234,
          "conversionRate": 0.27
        },
        "revenue": {
          "total": 57895.90,
          "lastMonth": 3456.70
        }
      }
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### Create Product
```http
POST /api/tenants/{tenantId}/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": {
    "de": "Neuer Burger",
    "fr": "Nouveau Burger",
    "en": "New Burger"
  },
  "description": {
    "de": "Beschreibung des neuen Burgers"
  },
  "category": "main",
  "subcategory": "burgers",
  "pricing": {
    "basePrice": 18.90,
    "currency": "CHF",
    "taxRate": 7.7
  },
  "variants": [
    {
      "name": { "de": "Standard" },
      "price": 18.90,
      "isDefault": true,
      "sku": "NB-001"
    }
  ],
  "inventory": {
    "trackInventory": true,
    "quantity": 50
  }
}
```

### Bulk Update Products
```http
POST /api/tenants/{tenantId}/products/bulk-update
Authorization: Bearer {token}
Content-Type: application/json

{
  "updates": [
    {
      "id": "prod_123",
      "pricing": {
        "basePrice": 17.90
      }
    },
    {
      "id": "prod_456",
      "availability": {
        "status": "unavailable"
      }
    }
  ]
}
```

---

## 📊 Analytics API

### Get Overview Analytics
```http
GET /api/tenants/{tenantId}/analytics/overview?period=7d
Authorization: Bearer {token}
```

**Query Parameters:**
- `period`: `1d`, `7d`, `30d`, `90d`, `1y`
- `startDate`: ISO date string
- `endDate`: ISO date string
- `timezone`: Timezone (default: tenant timezone)

**Response:**
```json
{
  "period": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-07T23:59:59Z",
    "days": 7
  },
  "overview": {
    "orders": {
      "total": 247,
      "completed": 235,
      "cancelled": 12,
      "averageValue": 31.45,
      "growth": 0.125
    },
    "revenue": {
      "total": 7890.50,
      "netRevenue": 7311.60,
      "tax": 578.90,
      "growth": 0.18
    },
    "customers": {
      "total": 189,
      "new": 23,
      "returning": 166,
      "repeatRate": 0.45
    },
    "products": {
      "topSelling": [
        {
          "id": "prod_123",
          "name": "Classic Burger",
          "orders": 89,
          "revenue": 1498.10
        }
      ]
    }
  },
  "trends": {
    "daily": [
      {
        "date": "2025-01-01",
        "orders": 32,
        "revenue": 1012.40,
        "customers": 28
      }
    ]
  }
}
```

### Get Revenue Analytics
```http
GET /api/tenants/{tenantId}/analytics/revenue?period=30d&breakdown=daily
Authorization: Bearer {token}
```

### Export Analytics
```http
POST /api/tenants/{tenantId}/analytics/export
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "revenue_report",
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "format": "csv",
  "email": "admin@burgerparadise.ch"
}
```

---

## 🤖 AI Services API

### Activate Emergency Mode
```http
POST /api/ai/emergency-mode
Authorization: Bearer {token}
Content-Type: application/json

{
  "tenantId": "tenant_123",
  "trigger": "high_wait_times",
  "severity": "high",
  "context": {
    "currentWaitTime": 45,
    "queueLength": 15,
    "availableStaff": 2
  }
}
```

**Response:**
```json
{
  "activated": true,
  "mode": "rush_hour_optimization",
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
  }
}
```

### Get Price Optimization
```http
POST /api/ai/price-optimization
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "prod_123",
  "factors": {
    "demand": "high",
    "inventory": 50,
    "weather": "sunny",
    "competition": "normal"
  }
}
```

**Response:**
```json
{
  "currentPrice": 16.90,
  "optimizedPrice": 17.50,
  "confidence": 0.89,
  "factors": {
    "demand": 0.15,
    "inventory": -0.05,
    "weather": 0.08,
    "time": 0.12
  },
  "projectedImpact": {
    "revenueLift": 0.08,
    "demandChange": -0.03,
    "profitIncrease": 0.12
  },
  "recommendation": "increase",
  "reasoning": "High demand and favorable weather conditions support price increase"
}
```

### Process Voice Order
```http
POST /api/ai/voice-order
Authorization: Bearer {token}
Content-Type: application/json

{
  "tenantId": "tenant_123",
  "audioData": "base64_encoded_audio",
  "language": "de",
  "sessionId": "voice_session_123"
}
```

**Response:**
```json
{
  "recognized": true,
  "transcript": "Ich hätte gerne zwei Classic Burger mit extra Bacon",
  "intent": "place_order",
  "entities": {
    "items": [
      {
        "product": "Classic Burger",
        "quantity": 2,
        "modifiers": ["extra Bacon"]
      }
    ]
  },
  "order": {
    "items": [
      {
        "productId": "prod_123",
        "quantity": 2,
        "modifiers": [
          {
            "groupId": "toppings",
            "optionId": "bacon"
          }
        ]
      }
    ]
  },
  "confidence": 0.94,
  "response": {
    "text": "Verstanden! Zwei Classic Burger mit extra Bacon. Das macht 40.80 CHF. Möchten Sie noch etwas dazu?",
    "audio": "base64_encoded_response_audio"
  }
}
```

---

## ⚠️ Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "customer.phone",
        "message": "Phone number must be in Swiss format (+41...)",
        "code": "INVALID_PHONE_FORMAT"
      }
    ],
    "requestId": "req_abc123",
    "timestamp": "2025-01-07T12:34:56Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | No valid authentication token |
| `AUTHORIZATION_FAILED` | 403 | Insufficient permissions |
| `TENANT_NOT_FOUND` | 404 | Tenant does not exist |
| `TENANT_SUSPENDED` | 403 | Tenant account suspended |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `PRODUCT_NOT_AVAILABLE` | 409 | Product not available |
| `INVENTORY_INSUFFICIENT` | 409 | Not enough inventory |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `MAINTENANCE_MODE` | 503 | System under maintenance |

### Swiss-Specific Errors

| Code | Description |
|------|-------------|
| `INVALID_SWISS_PHONE` | Phone number not in Swiss format |
| `INVALID_SWISS_ADDRESS` | Address not in Switzerland |
| `TAX_CALCULATION_ERROR` | Swiss tax calculation failed |
| `LANGUAGE_NOT_SUPPORTED` | Language not supported (DE/FR/IT/EN) |

---

## 🚦 Rate Limiting

### Limits by Plan

| Plan | Requests/Hour | Burst |
|------|---------------|-------|
| Free | 1,000 | 100 |
| Basic | 10,000 | 500 |
| Premium | 50,000 | 1,000 |
| Enterprise | Unlimited | 5,000 |

### Rate Limit Headers
```http
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9999
X-RateLimit-Reset: 1609459200
X-RateLimit-Retry-After: 3600
```

---

## 🔄 Webhooks

### Order Events
```http
POST https://your-domain.com/webhooks/orders
Content-Type: application/json
X-EATECH-Signature: sha256=...

{
  "event": "order.created",
  "data": {
    "orderId": "order_789",
    "orderNumber": "BP-2025-0001",
    "tenantId": "tenant_123",
    "status": "pending",
    "total": 43.94
  },
  "timestamp": "2025-01-07T12:34:56Z"
}
```

### Payment Events
```http
POST https://your-domain.com/webhooks/payments
Content-Type: application/json

{
  "event": "payment.succeeded",
  "data": {
    "paymentId": "pay_abc123",
    "orderId": "order_789",
    "amount": 43.94,
    "method": "card"
  }
}
```

---

## 🇨🇭 Swiss Compliance

### Phone Number Validation
- Format: `+41XXXXXXXXX` (Swiss format required)
- Mobile: `+4176/77/78/79XXXXXXX`
- Landline: `+41XX XXX XX XX`

### Address Validation
- Required fields: `street`, `city`, `zip`, `canton`
- Canton codes: `ZH`, `BE`, `LU`, `UR`, `SZ`, `OW`, `NW`, `GL`, `ZG`, `FR`, `SO`, `BS`, `BL`, `SH`, `AR`, `AI`, `SG`, `GR`, `AG`, `TG`, `TI`, `VD`, `VS`, `NE`, `GE`, `JU`

### Tax Calculation
- Standard rate: 7.7% (included in prices)
- Reduced rate: 2.5% (special foods)
- Zero rate: 0% (exports)

### Currency
- Primary: `CHF` (Swiss Francs)
- Decimal places: 2
- Rounding: 0.05 CHF for cash payments

---

## 📝 Examples

### Complete Order Flow
```javascript
// 1. Create Order
const order = await fetch('/api/tenants/tenant_123/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'pickup',
    customer: {
      name: 'Max Mustermann',
      phone: '+41791234567'
    },
    items: [{
      productId: 'prod_123',
      quantity: 1
    }]
  })
});

// 2. Update Status
await fetch(`/api/tenants/tenant_123/orders/${order.id}/status`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'preparing'
  })
});

// 3. Mark as Ready
await fetch(`/api/tenants/tenant_123/orders/${order.id}/status`, {
  method: 'PATCH',
  body: JSON.stringify({
    status: 'ready'
  })
});
```

---

## 🔧 SDK & Integration

### JavaScript SDK
```javascript
import { EatechAPI } from '@eatech/sdk';

const api = new EatechAPI({
  apiKey: 'your-api-key',
  tenantId: 'tenant_123',
  environment: 'production'
});

// Create order
const order = await api.orders.create({
  type: 'pickup',
  items: [{ productId: 'prod_123', quantity: 1 }]
});

// Get analytics
const analytics = await api.analytics.getOverview('7d');
```

---

## 📞 Support

- **Technical Support:** [benedikt@thomma.ch](mailto:benedikt@thomma.ch)
- **Documentation:** [https://docs.eatech.ch](https://docs.eatech.ch)
- **Status Page:** [https://status.eatech.ch](https://status.eatech.ch)
- **Rate Limits:** Contact support for increases

---

*Last Updated: Januar 2025 - EATECH V3.0*