# EATECH V3.0 GraphQL Schema Documentation

**Version:** 3.0.0  
**Endpoint:** `https://api.eatech.ch/graphql`  
**Playground:** `https://api.eatech.ch/graphql-playground`  
**Last Updated:** Januar 2025

---

## 📋 Inhaltsverzeichnis

1. [Schema Overview](#schema-overview)
2. [Queries](#queries)
3. [Mutations](#mutations)
4. [Subscriptions](#subscriptions)
5. [Types](#types)
6. [Scalars](#scalars)
7. [Enums](#enums)
8. [Input Types](#input-types)
9. [Error Handling](#error-handling)
10. [Usage Examples](#usage-examples)

---

## 🏗️ Schema Overview

Das EATECH GraphQL Schema ist designed für maximale Flexibilität und Performance in Multi-Tenant Umgebungen.

### Key Features
- **Multi-Tenant Support** - Isolierte Daten pro Tenant
- **Real-time Subscriptions** - Live Updates für Orders und Kitchen
- **Swiss Compliance** - DSGVO/DSG konforme Datenstrukturen
- **Type Safety** - Vollständig typisierte Schema
- **Optimized Queries** - DataLoader für N+1 Problem Prevention

---

## 🔍 Queries

### Schema Definition

```graphql
type Query {
  # Tenant Queries
  tenant(id: ID!): Tenant
  tenants(filter: TenantFilter, pagination: PaginationInput): TenantConnection!
  
  # Product Queries
  products(
    tenantId: ID!
    filter: ProductFilter
    sort: ProductSort
    pagination: PaginationInput
  ): ProductConnection!
  
  product(id: ID!): Product
  productsByCategory(
    tenantId: ID!
    category: String!
    available: Boolean = true
  ): [Product!]!
  
  # Order Queries
  orders(
    tenantId: ID!
    filter: OrderFilter
    sort: OrderSort
    pagination: PaginationInput
  ): OrderConnection!
  
  order(id: ID!): Order
  orderByNumber(tenantId: ID!, orderNumber: String!): Order
  
  # Customer Queries
  customers(
    tenantId: ID!
    filter: CustomerFilter
    pagination: PaginationInput
  ): CustomerConnection!
  
  customer(id: ID!): Customer
  
  # Analytics Queries
  analytics(
    tenantId: ID!
    period: AnalyticsPeriod!
    metrics: [AnalyticsMetric!]!
  ): Analytics!
  
  revenueAnalytics(
    tenantId: ID!
    period: AnalyticsPeriod!
    breakdown: AnalyticsBreakdown = DAILY
  ): RevenueAnalytics!
  
  productAnalytics(
    tenantId: ID!
    productId: ID
    period: AnalyticsPeriod!
  ): ProductAnalytics!
  
  # Event Queries (New Feature)
  events(
    filter: EventFilter
    pagination: PaginationInput
  ): EventConnection!
  
  event(id: ID!): Event
  eventsNearLocation(
    coordinates: CoordinatesInput!
    radius: Float! # kilometers
    startDate: DateTime
  ): [Event!]!
  
  # AI Insights
  aiInsights(
    tenantId: ID!
    type: AIInsightType!
    timeframe: TimeframeInput
  ): AIInsights!
  
  # System Queries (Master Access)
  systemHealth: SystemHealth!
  platformMetrics(period: AnalyticsPeriod!): PlatformMetrics!
}
```

---

## ✏️ Mutations

```graphql
type Mutation {
  # Tenant Mutations
  createTenant(input: CreateTenantInput!): TenantPayload!
  updateTenant(id: ID!, input: UpdateTenantInput!): TenantPayload!
  deleteTenant(id: ID!): DeletePayload!
  
  # Product Mutations
  createProduct(tenantId: ID!, input: CreateProductInput!): ProductPayload!
  updateProduct(id: ID!, input: UpdateProductInput!): ProductPayload!
  deleteProduct(id: ID!): DeletePayload!
  duplicateProduct(id: ID!): ProductPayload!
  
  updateProductAvailability(
    id: ID!
    available: Boolean!
    reason: String
  ): ProductPayload!
  
  bulkUpdateProducts(
    tenantId: ID!
    updates: [BulkProductUpdate!]!
  ): BulkUpdatePayload!
  
  # Order Mutations
  createOrder(tenantId: ID!, input: CreateOrderInput!): OrderPayload!
  updateOrder(id: ID!, input: UpdateOrderInput!): OrderPayload!
  updateOrderStatus(
    id: ID!
    status: OrderStatus!
    notes: String
    estimatedReadyTime: DateTime
  ): OrderPayload!
  
  cancelOrder(id: ID!, reason: String!): OrderPayload!
  refundOrder(
    id: ID!
    amount: Float
    reason: String!
    method: RefundMethod = ORIGINAL_PAYMENT
  ): RefundPayload!
  
  # Payment Mutations
  processPayment(
    orderId: ID!
    paymentMethodId: String!
    savePaymentMethod: Boolean = false
  ): PaymentPayload!
  
  # Customer Mutations
  createCustomer(tenantId: ID!, input: CreateCustomerInput!): CustomerPayload!
  updateCustomer(id: ID!, input: UpdateCustomerInput!): CustomerPayload!
  
  # AI Mutations
  activateEmergencyMode(
    tenantId: ID!
    trigger: EmergencyTrigger!
    severity: EmergencySeverity!
  ): EmergencyModePayload!
  
  optimizePrice(
    productId: ID!
    factors: PriceOptimizationFactors
  ): PriceOptimizationPayload!
  
  processVoiceOrder(
    tenantId: ID!
    audioData: String!
    language: Language!
    sessionId: String
  ): VoiceOrderPayload!
  
  # Event Mutations
  createEvent(input: CreateEventInput!): EventPayload!
  updateEvent(id: ID!, input: UpdateEventInput!): EventPayload!
  joinEvent(eventId: ID!, tenantId: ID!): EventParticipationPayload!
  
  # Inventory Mutations
  updateInventory(
    productId: ID!
    variantId: ID
    quantity: Int!
    operation: InventoryOperation!
  ): InventoryPayload!
  
  # Staff Mutations
  createStaffMember(tenantId: ID!, input: CreateStaffInput!): StaffPayload!
  updateStaffSchedule(
    staffId: ID!
    schedule: ScheduleInput!
  ): StaffPayload!
}
```

---

## 📡 Subscriptions

```graphql
type Subscription {
  # Order Subscriptions
  orderCreated(tenantId: ID!): Order!
  orderUpdated(tenantId: ID!, orderId: ID): Order!
  orderStatusChanged(tenantId: ID!): OrderStatusUpdate!
  
  # Kitchen Subscriptions
  kitchenUpdated(tenantId: ID!, station: KitchenStation): KitchenUpdate!
  newKitchenOrder(tenantId: ID!, station: KitchenStation): Order!
  
  # Queue Management
  queueUpdated(tenantId: ID!): QueueStatus!
  waitTimeUpdated(tenantId: ID!): WaitTimeUpdate!
  
  # Inventory Alerts
  lowStockAlert(tenantId: ID!): LowStockAlert!
  outOfStockAlert(tenantId: ID!): OutOfStockAlert!
  
  # System Alerts
  emergencyActivated(tenantId: ID!): EmergencyMode!
  systemAlert(level: AlertLevel!): SystemAlert!
  
  # Analytics Live Updates
  liveMetrics(tenantId: ID!): LiveMetrics!
  revenueUpdate(tenantId: ID!): RevenueUpdate!
  
  # Event Updates
  eventMetrics(eventId: ID!): EventMetrics!
  eventParticipantUpdate(eventId: ID!): EventParticipantUpdate!
  
  # Voice Commerce
  voiceSessionUpdate(sessionId: ID!): VoiceSessionUpdate!
}
```

---

## 🏛️ Types

### Core Business Types

```graphql
type Tenant {
  id: ID!
  name: String!
  slug: String!
  status: TenantStatus!
  type: TenantType!
  
  # Contact Information
  contact: TenantContact!
  business: BusinessDetails!
  
  # Subscription & Billing
  subscription: Subscription!
  billing: BillingInfo!
  
  # Configuration
  settings: TenantSettings!
  branding: TenantBranding!
  operatingHours: OperatingHours!
  
  # Features & Integrations
  features: TenantFeatures!
  integrations: TenantIntegrations!
  
  # Locations (Multi-Location Support)
  locations: [Location!]!
  primaryLocation: Location
  
  # Collections
  products(filter: ProductFilter): [Product!]!
  orders(filter: OrderFilter): [Order!]!
  customers(filter: CustomerFilter): [Customer!]!
  staff: [StaffMember!]!
  
  # Analytics
  analytics(period: AnalyticsPeriod!): TenantAnalytics!
  stats: TenantStats!
  
  # Timestamps
  createdAt: DateTime!
  updatedAt: DateTime!
  lastLoginAt: DateTime
}

type Product {
  id: ID!
  tenantId: ID!
  
  # Basic Info
  name: LocalizedString!
  description: LocalizedString!
  shortDescription: LocalizedString
  
  # Categorization
  category: String!
  subcategory: String
  tags: [String!]!
  collections: [String!]!
  
  # Pricing
  pricing: ProductPricing!
  
  # Variants & Modifiers
  variants: [ProductVariant!]!
  modifierGroups: [ModifierGroup!]!
  
  # Inventory
  inventory: InventoryInfo!
  
  # Availability
  availability: ProductAvailability!
  
  # Media & Assets
  media: ProductMedia!
  
  # Nutrition & Compliance
  nutrition: NutritionInfo
  allergens: AllergenInfo!
  dietary: DietaryInfo!
  
  # Preparation
  preparation: PreparationInfo!
  
  # Analytics & Performance
  analytics: ProductAnalytics!
  
  # AI Insights
  aiInsights: ProductAIInsights
  
  # Metadata
  status: ProductStatus!
  visibility: ProductVisibility!
  featured: Boolean!
  sortOrder: Int!
  
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User
  lastModifiedBy: User
}

type Order {
  id: ID!
  orderNumber: String!
  tenantId: ID!
  
  # Basic Info
  type: OrderType!
  channel: OrderChannel!
  status: OrderStatus!
  
  # Customer
  customer: Customer!
  
  # Items
  items: [OrderItem!]!
  
  # Pricing & Payment
  pricing: OrderPricing!
  payment: PaymentInfo!
  
  # Fulfillment
  fulfillment: FulfillmentInfo!
  
  # Location & Context
  context: OrderContext!
  
  # Communications
  communications: OrderCommunications!
  
  # Feedback
  feedback: OrderFeedback
  
  # Analytics & Tracking
  analytics: OrderAnalytics!
  
  # Operations
  operations: OrderOperations!
  
  # Compliance
  compliance: OrderCompliance!
  
  # History & Audit
  history: [OrderHistoryEntry!]!
  
  # Timestamps
  createdAt: DateTime!
  updatedAt: DateTime!
  
  # Relations
  tenant: Tenant!
  relatedOrders: [Order!]! # Group orders, reorders
}

type Customer {
  id: ID!
  tenantId: ID!
  firebaseUid: String
  
  # Personal Info
  firstName: String
  lastName: String
  name: String! # Computed: firstName + lastName
  email: String
  phone: String!
  phoneVerified: Boolean!
  
  # Preferences
  language: Language!
  marketingConsent: Boolean!
  preferences: CustomerPreferences!
  
  # Address Information
  addresses: [Address!]!
  defaultAddress: Address
  
  # Orders & History
  orders(filter: OrderFilter): [Order!]!
  totalOrders: Int!
  totalSpent: Float!
  averageOrderValue: Float!
  
  # Loyalty & Rewards
  loyaltyPoints: Int!
  loyaltyTier: LoyaltyTier
  rewards: [Reward!]!
  
  # Analytics
  analytics: CustomerAnalytics!
  segmentation: CustomerSegment!
  
  # Metadata
  tags: [String!]!
  notes: String
  source: String # How they found us
  
  createdAt: DateTime!
  updatedAt: DateTime!
  lastOrderAt: DateTime
  
  # Relations
  tenant: Tenant!
}
```

### Analytics Types

```graphql
type Analytics {
  tenantId: ID!
  period: AnalyticsPeriod!
  
  # Overview Metrics
  overview: AnalyticsOverview!
  
  # Revenue Analytics
  revenue: RevenueAnalytics!
  
  # Order Analytics
  orders: OrderAnalytics!
  
  # Product Performance
  products: ProductAnalytics!
  
  # Customer Analytics
  customers: CustomerAnalytics!
  
  # Operational Metrics
  operations: OperationalAnalytics!
  
  # Trends & Comparisons
  trends: TrendAnalytics!
  comparisons: ComparisonAnalytics!
  
  # Forecasts (AI-powered)
  forecasts: ForecastAnalytics!
}

type RevenueAnalytics {
  # Totals
  total: Float!
  netRevenue: Float!
  tax: Float!
  
  # Growth
  growth: Float!
  growthRate: Float!
  
  # Breakdown
  byPeriod: [PeriodRevenue!]!
  byProduct: [ProductRevenue!]!
  byChannel: [ChannelRevenue!]!
  byPaymentMethod: [PaymentMethodRevenue!]!
  
  # Metrics
  averageOrderValue: Float!
  revenuePerCustomer: Float!
  
  # Forecasting
  forecast: RevenueForecast
}

type ProductAnalytics {
  productId: ID
  period: AnalyticsPeriod!
  
  # Performance Metrics
  orders: Int!
  revenue: Float!
  quantity: Int!
  
  # Conversion & Engagement
  views: Int!
  conversionRate: Float!
  clickThroughRate: Float!
  
  # Ratings & Reviews
  averageRating: Float
  reviewCount: Int!
  
  # Rankings
  categoryRank: Int
  overallRank: Int
  
  # Top Performers
  topProducts: [ProductPerformance!]!
  trending: [ProductTrend!]!
  
  # Cross-sell & Upsell
  frequentlyBoughtWith: [Product!]!
  crossSellRate: Float!
  upsellRate: Float!
}
```

### AI & ML Types

```graphql
type AIInsights {
  tenantId: ID!
  type: AIInsightType!
  
  # Price Optimization
  priceOptimization: PriceOptimization
  
  # Demand Forecasting
  demandForecast: DemandForecast
  
  # Customer Insights
  customerInsights: CustomerInsights
  
  # Operational Insights
  operationalInsights: OperationalInsights
  
  # Generated At
  generatedAt: DateTime!
  confidence: Float! # 0.0 - 1.0
}

type PriceOptimization {
  productId: ID!
  currentPrice: Float!
  optimizedPrice: Float!
  confidence: Float!
  
  # Factors
  factors: PriceFactors!
  
  # Projections
  projectedImpact: PriceImpactProjection!
  
  # Recommendation
  recommendation: PriceRecommendation!
  reasoning: String!
  
  # A/B Testing Suggestion
  abTestSuggestion: ABTestSuggestion
}

type VoiceOrderPayload {
  success: Boolean!
  recognized: Boolean!
  
  # Recognition Results
  transcript: String
  confidence: Float!
  language: Language!
  
  # Intent & Entities
  intent: VoiceIntent
  entities: VoiceEntities!
  
  # Order Processing
  order: OrderInput
  validationErrors: [ValidationError!]!
  
  # Response
  response: VoiceResponse!
  
  # Session
  sessionId: String!
  nextAction: VoiceAction
}

type EmergencyMode {
  tenantId: ID!
  activated: Boolean!
  mode: EmergencyModeType!
  
  # Trigger Information
  trigger: EmergencyTrigger!
  severity: EmergencySeverity!
  
  # Automated Adjustments
  adjustments: EmergencyAdjustments!
  
  # Impact Estimation
  estimatedImpact: EmergencyImpact!
  
  # Duration
  activatedAt: DateTime!
  estimatedDuration: Int # minutes
  
  # Override Options
  canOverride: Boolean!
  overrideReason: String
}
```

### Event Management Types

```graphql
type Event {
  id: ID!
  name: String!
  description: String!
  type: EventType!
  status: EventStatus!
  
  # Location & Timing
  location: EventLocation!
  startDate: DateTime!
  endDate: DateTime!
  timezone: String!
  
  # Participants
  participants: [EventParticipant!]!
  maxParticipants: Int
  
  # Revenue Sharing
  revenueModel: RevenueModel!
  commission: Float # percentage
  
  # Logistics
  logistics: EventLogistics!
  
  # Analytics
  metrics: EventMetrics!
  
  # Metadata
  tags: [String!]!
  organizer: EventOrganizer!
  
  createdAt: DateTime!
  updatedAt: DateTime!
}

type EventParticipant {
  id: ID!
  tenant: Tenant!
  
  # Participation Details
  status: ParticipationStatus!
  joinedAt: DateTime!
  
  # Location within Event
  spotNumber: String
  coordinates: Coordinates
  
  # Performance
  sales: EventSales!
  ranking: EventRanking!
  
  # Special Offers
  eventSpecials: [Product!]!
  promotions: [Promotion!]!
}
```

---

## 📊 Scalars

```graphql
scalar DateTime
scalar JSON
scalar Upload
scalar EmailAddress
scalar PhoneNumber
scalar URL
scalar UUID
scalar Currency
scalar Coordinates
scalar Base64
scalar Language
scalar Timezone
```

---

## 🔢 Enums

```graphql
enum TenantStatus {
  SETUP
  TRIAL
  ACTIVE
  SUSPENDED
  CANCELLED
  DELETED
}

enum TenantType {
  FOODTRUCK
  RESTAURANT
  CHAIN
  GHOST_KITCHEN
  CATERING
}

enum OrderStatus {
  DRAFT
  PENDING
  CONFIRMED
  PREPARING
  READY
  PICKED_UP
  DELIVERED
  COMPLETED
  CANCELLED
  REFUNDED
}

enum OrderType {
  PICKUP
  DELIVERY
  DINE_IN
  CATERING
  PREORDER
}

enum OrderChannel {
  WEB
  APP
  POS
  PHONE
  KIOSK
  API
  VOICE
}

enum ProductStatus {
  DRAFT
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum ProductVisibility {
  PUBLIC
  PRIVATE
  SCHEDULED
  HIDDEN
}

enum PaymentMethod {
  CASH
  CARD
  TWINT
  POSTFINANCE
  INVOICE
  VOUCHER
  MIXED
}

enum PaymentStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum Language {
  DE
  FR
  IT
  EN
  DE_CH # Schweizerdeutsch
}

enum AnalyticsPeriod {
  HOUR
  DAY
  WEEK
  MONTH
  QUARTER
  YEAR
  CUSTOM
}

enum AnalyticsBreakdown {
  HOURLY
  DAILY
  WEEKLY
  MONTHLY
  QUARTERLY
}

enum AIInsightType {
  PRICE_OPTIMIZATION
  DEMAND_FORECAST
  CUSTOMER_SEGMENTATION
  OPERATIONAL_EFFICIENCY
  MENU_OPTIMIZATION
  STAFF_SCHEDULING
}

enum EmergencyTrigger {
  HIGH_WAIT_TIMES
  STAFF_SHORTAGE
  EQUIPMENT_FAILURE
  HIGH_DEMAND
  INVENTORY_SHORTAGE
  SYSTEM_OVERLOAD
}

enum EmergencySeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum EventType {
  FESTIVAL
  MARKET
  CONFERENCE
  PRIVATE_EVENT
  CATERING
  POPUP
}

enum VoiceIntent {
  PLACE_ORDER
  MODIFY_ORDER
  CHECK_STATUS
  ASK_QUESTION
  CANCEL_ORDER
  PAYMENT_INQUIRY
}
```

---

## 📝 Input Types

```graphql
input CreateTenantInput {
  name: String!
  slug: String!
  type: TenantType!
  
  contact: TenantContactInput!
  business: BusinessDetailsInput!
  settings: TenantSettingsInput
  branding: TenantBrandingInput
}

input CreateOrderInput {
  type: OrderType!
  channel: OrderChannel = WEB
  
  customer: CustomerInput!
  items: [OrderItemInput!]!
  
  fulfillment: FulfillmentInput!
  payment: PaymentInput
  
  context: OrderContextInput
  notes: String
}

input OrderItemInput {
  productId: ID!
  variantId: ID
  quantity: Int! = 1
  
  modifiers: [ModifierInput!]!
  notes: String
  
  # Special pricing (for staff discounts, etc.)
  customPrice: Float
  priceOverrideReason: String
}

input ModifierInput {
  groupId: ID!
  optionId: ID!
  quantity: Int = 1
}

input CustomerInput {
  # For existing customers
  id: ID
  
  # For new customers
  name: String
  firstName: String
  lastName: String
  email: String
  phone: String!
  
  language: Language = DE
  marketingConsent: Boolean = false
  
  address: AddressInput
}

input ProductFilter {
  category: String
  subcategory: String
  tags: [String!]
  available: Boolean
  featured: Boolean
  search: String
  priceRange: PriceRangeInput
  allergens: AllergenFilter
  dietary: DietaryFilter
}

input OrderFilter {
  status: [OrderStatus!]
  type: [OrderType!]
  channel: [OrderChannel!]
  dateRange: DateRangeInput
  customerId: ID
  minTotal: Float
  maxTotal: Float
  search: String # Order number, customer name
}

input AnalyticsPeriodInput {
  type: AnalyticsPeriod!
  startDate: DateTime
  endDate: DateTime
  timezone: String
}

input PriceOptimizationFactors {
  demand: Float
  inventory: Int
  weather: WeatherCondition
  competition: CompetitionLevel
  timeOfDay: String
  dayOfWeek: String
  specialEvents: [String!]
}

input CreateEventInput {
  name: String!
  description: String!
  type: EventType!
  
  location: EventLocationInput!
  startDate: DateTime!
  endDate: DateTime!
  
  maxParticipants: Int
  revenueModel: RevenueModelInput!
  
  organizer: EventOrganizerInput!
  logistics: EventLogisticsInput
}
```

---

## ⚠️ Error Handling

### GraphQL Error Extensions

```graphql
{
  "errors": [
    {
      "message": "Product not available",
      "extensions": {
        "code": "PRODUCT_NOT_AVAILABLE",
        "field": "items.0.productId",
        "productId": "prod_123",
        "availableFrom": "2025-01-08T11:00:00Z",
        "reason": "OUT_OF_STOCK"
      },
      "path": ["createOrder", "items", 0, "productId"]
    }
  ],
  "data": null
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHENTICATED` | No valid authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Input validation failed |
| `BUSINESS_RULE_VIOLATION` | Business logic constraint |
| `EXTERNAL_SERVICE_ERROR` | Third-party service error |
| `RATE_LIMITED` | Too many requests |

---

## 💡 Usage Examples

### 1. Fetch Restaurant Menu with Variants

```graphql
query GetMenu($tenantId: ID!) {
  products(
    tenantId: $tenantId
    filter: { available: true }
    sort: { field: SORT_ORDER, direction: ASC }
  ) {
    edges {
      node {
        id
        name {
          de
          fr
          en
        }
        description {
          de
        }
        category
        pricing {
          basePrice
          currency
        }
        variants {
          id
          name {
            de
          }
          price
          isDefault
          inventory {
            available
            quantity
          }
        }
        modifierGroups {
          id
          name {
            de
          }
          required
          min
          max
          options {
            id
            name {
              de
            }
            price
            available
          }
        }
        media {
          images {
            url
            thumbnails {
              small
              medium
            }
            alt {
              de
            }
          }
        }
        allergens {
          contains
          mayContain
        }
        availability {
          status
          schedule {
            rules {
              type
              startTime
              endTime
            }
          }
        }
      }
    }
  }
}
```

### 2. Create Order with Real-time Updates

```graphql
mutation CreateOrder($tenantId: ID!, $input: CreateOrderInput!) {
  createOrder(tenantId: $tenantId, input: $input) {
    success
    order {
      id
      orderNumber
      status
      customer {
        name
        phone
      }
      items {
        productName
        quantity
        totalPrice
      }
      pricing {
        total
        currency
      }
      fulfillment {
        timing {
          promisedAt
          estimatedAt
        }
        pickup {
          code
          qrCode
        }
      }
    }
    errors {
      field
      message
      code
    }
  }
}

# Subscribe to order updates
subscription OrderUpdates($tenantId: ID!) {
  orderUpdated(tenantId: $tenantId) {
    id
    status
    fulfillment {
      timing {
        estimatedAt
      }
    }
  }
}
```

### 3. Analytics Dashboard Query

```graphql
query DashboardAnalytics($tenantId: ID!, $period: AnalyticsPeriod!) {
  analytics(tenantId: $tenantId, period: $period) {
    overview {
      orders {
        total
        completed
        growth
      }
      revenue {
        total
        growth
      }
      customers {
        total
        new
        returning
      }
    }
    
    revenue {
      byPeriod {
        date
        revenue
        orders
      }
      byProduct {
        product {
          name {
            de
          }
        }
        revenue
        orders
      }
    }
    
    trends {
      peakHours {
        hour
        orderCount
        revenue
      }
      popularDays {
        dayOfWeek
        averageOrders
      }
    }
  }
  
  # AI-powered insights
  aiInsights(tenantId: $tenantId, type: DEMAND_FORECAST) {
    demandForecast {
      tomorrow {
        expectedOrders
        confidence
      }
      nextWeek {
        daily {
          date
          expectedOrders
          factors
        }
      }
    }
  }
}
```

### 4. Voice Commerce Integration

```graphql
mutation ProcessVoiceOrder(
  $tenantId: ID!
  $audioData: String!
  $language: Language!
) {
  processVoiceOrder(
    tenantId: $tenantId
    audioData: $audioData
    language: $language
  ) {
    success
    recognized
    transcript
    confidence
    
    intent
    entities {
      items {
        product
        quantity
        modifiers
      }
    }
    
    order {
      items {
        productId
        quantity
        modifiers {
          groupId
          optionId
        }
      }
    }
    
    response {
      text
      audio
    }
    
    sessionId
    nextAction
  }
}

# Subscribe to voice session updates
subscription VoiceSessionUpdates($sessionId: ID!) {
  voiceSessionUpdate(sessionId: $sessionId) {
    status
    transcript
    currentStep
    order {
      items {
        productName
        quantity
      }
      total
    }
  }
}
```

### 5. Event Management

```graphql
query EventWithParticipants($eventId: ID!) {
  event(id: $eventId) {
    id
    name
    description
    type
    status
    
    location {
      name
      address
      coordinates {
        lat
        lng
      }
    }
    
    startDate
    endDate
    
    participants {
      id
      tenant {
        name
        slug
        branding {
          colors {
            primary
          }
          assets {
            logo
          }
        }
      }
      status
      spotNumber
      sales {
        totalRevenue
        orderCount
      }
      ranking {
        position
        category
      }
    }
    
    metrics {
      totalRevenue
      totalOrders
      averageOrderValue
      topPerformers {
        tenant {
          name
        }
        revenue
      }
    }
  }
}
```

### 6. Emergency Mode Activation

```graphql
mutation ActivateEmergencyMode(
  $tenantId: ID!
  $trigger: EmergencyTrigger!
  $severity: EmergencySeverity!
) {
  activateEmergencyMode(
    tenantId: $tenantId
    trigger: $trigger
    severity: $severity
  ) {
    success
    emergencyMode {
      activated
      mode
      adjustments {
        menu {
          disabled
          promoted
        }
        pricing {
          surge
          discounts
        }
        operations {
          batchOrders
          simplifiedMenu
          staffAlert
        }
      }
      estimatedImpact {
        waitTimeReduction
        throughputIncrease
      }
    }
  }
}

# Subscribe to emergency updates
subscription EmergencyUpdates($tenantId: ID!) {
  emergencyActivated(tenantId: $tenantId) {
    mode
    severity
    adjustments {
      menu {
        disabled
        promoted
      }
    }
    estimatedDuration
  }
}
```

---

## 🔧 Best Practices

### 1. Query Optimization
- Use fragments for repeated field selections
- Implement DataLoader to prevent N+1 queries
- Request only needed fields
- Use pagination for large result sets

### 2. Error Handling
- Always check for errors in responses
- Handle partial failures gracefully
- Implement retry logic for transient errors

### 3. Real-time Updates
- Use subscriptions for live data
- Implement proper cleanup
- Handle connection drops

### 4. Security
- Include tenant context in all operations
- Validate permissions at field level
- Sanitize input data

---

## 📞 Support

- **GraphQL Playground:** `https://api.eatech.ch/graphql-playground`
- **Schema Download:** `https://api.eatech.ch/schema.graphql`
- **Documentation:** [https://docs.eatech.ch/graphql](https://docs.eatech.ch/graphql)
- **Support:** [benedikt@thomma.ch](mailto:benedikt@thomma.ch)

---

*Last Updated: Januar 2025 - EATECH V3.0*