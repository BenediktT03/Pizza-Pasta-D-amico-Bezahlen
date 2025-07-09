# 📡 EATECH API Documentation

## Overview

The EATECH API provides a comprehensive set of RESTful endpoints for managing restaurant operations. All API endpoints are secured with JWT authentication and follow REST best practices.

## Base URLs

- **Production**: `https://api.eatech.ch/v1`
- **Staging**: `https://api-staging.eatech.ch/v1`
- **Development**: `http://localhost:5001/v1`

## Authentication

All API requests require authentication using JWT tokens obtained from Firebase Auth.

### Headers

```http
Authorization: Bearer <firebase-jwt-token>
X-Tenant-ID: <tenant-id>
Content-Type: application/json
```

### Getting a Token

```javascript
// Using Firebase Auth
const token = await firebase.auth().currentUser.getIdToken();
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested product was not found",
    "details": {
      "productId": "prod_123"
    },
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

### HTTP Status Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting

- **Anonymous**: 100 requests per hour
- **Authenticated**: 1000 requests per hour
- **Premium**: 10000 requests per hour

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642680000
```

## API Endpoints

### Authentication

#### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "profile": {
    "name": "John Doe",
    "phone": "+41791234567",
    "language": "de"
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "profile": {
      "name": "John Doe",
      "phone": "+41791234567",
      "language": "de"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Products

#### List Products
```http
GET /products
```

**Query Parameters:**
- `category` (string): Filter by category
- `available` (boolean): Filter by availability
- `search` (string): Search in name and description
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `sort` (string): Sort field (name, price, created)
- `order` (string): Sort order (asc, desc)

**Response:**
```json
{
  "data": [
    {
      "id": "prod_123",
      "name": {
        "de": "Margherita Pizza",
        "fr": "Pizza Margherita",
        "it": "Pizza Margherita",
        "en": "Margherita Pizza"
      },
      "description": {
        "de": "Klassische Pizza mit Tomaten und Mozzarella",
        "fr": "Pizza classique avec tomates et mozzarella",
        "it": "Pizza classica con pomodoro e mozzarella",
        "en": "Classic pizza with tomatoes and mozzarella"
      },
      "price": {
        "amount": 18.50,
        "currency": "CHF",
        "tax": {
          "rate": 0.077,
          "included": true
        }
      },
      "category": "pizza",
      "images": [
        {
          "url": "https://cdn.eatech.ch/products/margherita.jpg",
          "alt": "Margherita Pizza"
        }
      ],
      "allergens": ["gluten", "lactose"],
      "available": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### Get Product
```http
GET /products/:productId
```

#### Create Product
```http
POST /products
```

**Request Body:**
```json
{
  "name": {
    "de": "Neue Pizza",
    "fr": "Nouvelle Pizza",
    "it": "Nuova Pizza",
    "en": "New Pizza"
  },
  "description": {
    "de": "Beschreibung",
    "fr": "Description",
    "it": "Descrizione",
    "en": "Description"
  },
  "price": {
    "amount": 22.50,
    "currency": "CHF"
  },
  "category": "pizza",
  "modifiers": [
    {
      "id": "mod_123",
      "name": {
        "de": "Extra Käse",
        "fr": "Fromage supplémentaire",
        "it": "Formaggio extra",
        "en": "Extra cheese"
      },
      "price": 3.00,
      "required": false
    }
  ],
  "allergens": ["gluten", "lactose"]
}
```

#### Update Product
```http
PUT /products/:productId
```

#### Delete Product
```http
DELETE /products/:productId
```

### Orders

#### Create Order
```http
POST /orders
```

**Request Body:**
```json
{
  "customerId": "user_123",
  "locationId": "loc_456",
  "type": "dine-in",
  "items": [
    {
      "productId": "prod_123",
      "quantity": 2,
      "modifiers": ["mod_456"],
      "notes": "Extra spicy"
    }
  ],
  "deliveryInfo": {
    "method": "table",
    "tableNumber": "12"
  },
  "paymentMethod": "card"
}
```

**Response:**
```json
{
  "order": {
    "id": "order_789",
    "number": "A-123",
    "status": "pending",
    "total": {
      "subtotal": 37.00,
      "tax": 2.85,
      "total": 39.85,
      "currency": "CHF"
    },
    "estimatedTime": 25,
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

#### List Orders
```http
GET /orders
```

**Query Parameters:**
- `status` (string): Filter by status (pending, preparing, ready, completed, cancelled)
- `customerId` (string): Filter by customer
- `date` (string): Filter by date (YYYY-MM-DD)
- `dateFrom` (string): Start date for range
- `dateTo` (string): End date for range

#### Get Order
```http
GET /orders/:orderId
```

#### Update Order Status
```http
PATCH /orders/:orderId/status
```

**Request Body:**
```json
{
  "status": "preparing",
  "estimatedTime": 20
}
```

#### Cancel Order
```http
POST /orders/:orderId/cancel
```

**Request Body:**
```json
{
  "reason": "Customer request",
  "refund": true
}
```

### Voice Orders

#### Process Voice Command
```http
POST /voice/process
```

**Request Body:**
```json
{
  "audio": "base64_encoded_audio",
  "language": "de-CH",
  "sessionId": "session_123"
}
```

**Response:**
```json
{
  "transcript": "Ich möchte eine Margherita Pizza bestellen",
  "intent": "ORDER_ITEM",
  "entities": {
    "product": "Margherita Pizza",
    "quantity": 1
  },
  "suggestedActions": [
    {
      "type": "ADD_TO_CART",
      "productId": "prod_123",
      "quantity": 1
    }
  ],
  "response": "Eine Margherita Pizza wurde zu Ihrem Warenkorb hinzugefügt"
}
```

### Payments

#### Create Payment Intent
```http
POST /payments/intent
```

**Request Body:**
```json
{
  "orderId": "order_123",
  "amount": 39.85,
  "currency": "CHF",
  "method": "card"
}
```

**Response:**
```json
{
  "intentId": "pi_123",
  "clientSecret": "pi_123_secret_456",
  "amount": 39.85,
  "currency": "CHF",
  "status": "requires_payment_method"
}
```

#### Process TWINT Payment
```http
POST /payments/twint
```

**Request Body:**
```json
{
  "orderId": "order_123",
  "amount": 39.85,
  "phone": "+41791234567"
}
```

### Analytics

#### Get Dashboard Stats
```http
GET /analytics/dashboard
```

**Query Parameters:**
- `period` (string): today, yesterday, week, month, year
- `locationId` (string): Filter by location

**Response:**
```json
{
  "revenue": {
    "total": 15420.50,
    "currency": "CHF",
    "change": 12.5,
    "changeType": "increase"
  },
  "orders": {
    "total": 234,
    "average": 65.90,
    "change": 8.3,
    "changeType": "increase"
  },
  "customers": {
    "total": 189,
    "new": 23,
    "returning": 166
  },
  "topProducts": [
    {
      "productId": "prod_123",
      "name": "Margherita Pizza",
      "quantity": 45,
      "revenue": 832.50
    }
  ]
}
```

#### Get Sales Report
```http
GET /analytics/sales
```

**Query Parameters:**
- `startDate` (string): Start date (YYYY-MM-DD)
- `endDate` (string): End date (YYYY-MM-DD)
- `groupBy` (string): day, week, month

### Staff Management

#### List Staff
```http
GET /staff
```

#### Create Staff Member
```http
POST /staff
```

**Request Body:**
```json
{
  "email": "staff@restaurant.ch",
  "name": "Anna Müller",
  "role": "waiter",
  "permissions": ["orders.view", "orders.update"],
  "locations": ["loc_123"]
}
```

#### Update Staff Member
```http
PUT /staff/:staffId
```

#### Remove Staff Member
```http
DELETE /staff/:staffId
```

### Inventory

#### Get Inventory Levels
```http
GET /inventory
```

#### Update Inventory
```http
POST /inventory/update
```

**Request Body:**
```json
{
  "updates": [
    {
      "itemId": "item_123",
      "quantity": 50,
      "unit": "kg"
    }
  ]
}
```

#### Low Stock Alert Settings
```http
PUT /inventory/alerts
```

### Webhooks

#### Register Webhook
```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://myapp.com/webhook",
  "events": ["order.created", "order.updated"],
  "secret": "webhook_secret_123"
}
```

#### List Webhooks
```http
GET /webhooks
```

#### Delete Webhook
```http
DELETE /webhooks/:webhookId
```

## WebSocket Events

Connect to real-time updates:
```javascript
const ws = new WebSocket('wss://api.eatech.ch/ws');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  // Handle event
});
```

### Event Types

#### Order Events
- `order.created`
- `order.updated`
- `order.completed`
- `order.cancelled`

#### Kitchen Events
- `kitchen.new_order`
- `kitchen.order_ready`
- `kitchen.order_delayed`

#### Inventory Events
- `inventory.low_stock`
- `inventory.out_of_stock`
- `inventory.restocked`

## SDKs

### JavaScript/TypeScript
```bash
npm install @eatech/sdk
```

```typescript
import { EatechClient } from '@eatech/sdk';

const client = new EatechClient({
  apiKey: 'your-api-key',
  tenantId: 'tenant-123'
});

// Create order
const order = await client.orders.create({
  items: [{ productId: 'prod_123', quantity: 1 }]
});
```

### Python
```bash
pip install eatech-sdk
```

```python
from eatech import Client

client = Client(api_key='your-api-key', tenant_id='tenant-123')

# Get products
products = client.products.list(category='pizza')
```

## Postman Collection

Download our Postman collection for easy API testing:
[EATECH API Collection](https://www.postman.com/eatech/workspace/eatech-api)

## API Changelog

### Version 1.2.0 (2024-01-15)
- Added voice order endpoints
- Improved error responses
- Added webhook support

### Version 1.1.0 (2023-12-01)
- Added inventory management
- Enhanced analytics endpoints
- Performance improvements

### Version 1.0.0 (2023-10-01)
- Initial release

---

For more examples and use cases, see our [API Examples](https://github.com/eatech/api-examples).
