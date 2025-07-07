# EATECH V3.0 Architecture Diagrams

**Comprehensive Visual Architecture Documentation**

**Version:** 3.0.0  
**Diagram Tool:** Mermaid.js + PlantUML  
**Last Updated:** Januar 2025

---

## 📋 Inhaltsverzeichnis

1. [System Overview Diagrams](#system-overview-diagrams)
2. [Application Architecture Diagrams](#application-architecture-diagrams)
3. [Data Architecture Diagrams](#data-architecture-diagrams)
4. [Infrastructure Diagrams](#infrastructure-diagrams)
5. [Security Architecture Diagrams](#security-architecture-diagrams)
6. [Integration Diagrams](#integration-diagrams)
7. [Deployment Diagrams](#deployment-diagrams)
8. [Sequence Diagrams](#sequence-diagrams)
9. [Swiss-Specific Diagrams](#swiss-specific-diagrams)
10. [Future Architecture Diagrams](#future-architecture-diagrams)

---

## 🌐 System Overview Diagrams

### High-Level System Architecture

```mermaid
graph TB
    subgraph "External Users"
        CUST[👤 Customers]
        STAFF[👨‍🍳 Restaurant Staff]
        ADMIN[👩‍💼 Admins]
        MASTER[🔧 Master Users]
    end
    
    subgraph "Edge Layer - Cloudflare Global Network"
        CDN[🌐 CDN]
        WAF[🛡️ WAF]
        DDOS[⚡ DDoS Protection]
        WORKERS[⚙️ Edge Workers]
    end
    
    subgraph "Application Layer - Vercel Edge"
        WEB[📱 Customer PWA<br/>Next.js 14]
        ADMIN_APP[💻 Admin Dashboard<br/>React SPA]
        MASTER_APP[🔧 Master Console<br/>React SPA]
        API[🔌 API Gateway<br/>GraphQL + REST]
    end
    
    subgraph "Business Services - Firebase Functions"
        AUTH[🔑 Auth Service]
        ORDER[📦 Order Service]
        PRODUCT[🍔 Product Service]
        PAYMENT[💳 Payment Service]
        NOTIF[📢 Notification Service]
        ANALYTICS[📊 Analytics Service]
        AI[🤖 AI Service]
    end
    
    subgraph "Data Layer - Firebase + Cloud"
        FS[📚 Firestore<br/>eur3 - Zurich]
        STORAGE[📁 Cloud Storage]
        REDIS[⚡ Redis Cache<br/>Upstash]
        R2[☁️ Cloudflare R2]
    end
    
    subgraph "External Services"
        STRIPE[💳 Stripe]
        TWINT[📱 Twint]
        TWILIO[📞 Twilio]
        SENDGRID[📧 SendGrid]
        OPENAI[🧠 OpenAI]
        MAPS[🗺️ Maps API]
    end
    
    %% User Connections
    CUST --> CDN
    STAFF --> CDN
    ADMIN --> CDN
    MASTER --> CDN
    
    %% Edge Layer
    CDN --> WAF
    WAF --> DDOS
    DDOS --> WORKERS
    WORKERS --> WEB
    WORKERS --> ADMIN_APP
    WORKERS --> MASTER_APP
    WORKERS --> API
    
    %% Application Layer
    WEB --> API
    ADMIN_APP --> API
    MASTER_APP --> API
    
    %% API to Services
    API --> AUTH
    API --> ORDER
    API --> PRODUCT
    API --> PAYMENT
    API --> NOTIF
    API --> ANALYTICS
    API --> AI
    
    %% Services to Data
    AUTH --> FS
    ORDER --> FS
    PRODUCT --> FS
    PAYMENT --> FS
    NOTIF --> REDIS
    ANALYTICS --> FS
    AI --> FS
    
    ORDER --> STORAGE
    PRODUCT --> STORAGE
    ANALYTICS --> R2
    
    %% External Integrations
    PAYMENT --> STRIPE
    PAYMENT --> TWINT
    NOTIF --> TWILIO
    NOTIF --> SENDGRID
    AI --> OPENAI
    WEB --> MAPS
    
    %% Styling
    classDef userClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edgeClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef appClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef serviceClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dataClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef externalClass fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    
    class CUST,STAFF,ADMIN,MASTER userClass
    class CDN,WAF,DDOS,WORKERS edgeClass
    class WEB,ADMIN_APP,MASTER_APP,API appClass
    class AUTH,ORDER,PRODUCT,PAYMENT,NOTIF,ANALYTICS,AI serviceClass
    class FS,STORAGE,REDIS,R2 dataClass
    class STRIPE,TWINT,TWILIO,SENDGRID,OPENAI,MAPS externalClass
```

### Multi-Tenant Architecture Overview

```mermaid
graph TB
    subgraph "Shared Infrastructure"
        EDGE[🌐 Edge Layer]
        APP[📱 Application Layer]
        API[🔌 API Gateway]
    end
    
    subgraph "Tenant Isolation"
        subgraph "Tenant A - Burger Paradise"
            TA_DATA[📊 Tenant A Data]
            TA_CONFIG[⚙️ Config A]
            TA_USERS[👥 Users A]
        end
        
        subgraph "Tenant B - Pizza Express"
            TB_DATA[📊 Tenant B Data]
            TB_CONFIG[⚙️ Config B]
            TB_USERS[👥 Users B]
        end
        
        subgraph "Tenant C - Taco Truck"
            TC_DATA[📊 Tenant C Data]
            TC_CONFIG[⚙️ Config C]
            TC_USERS[👥 Users C]
        end
    end
    
    subgraph "Shared Services"
        AUTH[🔑 Authentication]
        BILLING[💰 Billing]
        MONITORING[📊 Monitoring]
        BACKUP[💾 Backup]
    end
    
    subgraph "Data Storage"
        FIRESTORE[🔥 Firestore]
        CACHE[⚡ Redis Cache]
        FILES[📁 File Storage]
    end
    
    %% Connections
    EDGE --> APP
    APP --> API
    
    API --> TA_DATA
    API --> TB_DATA
    API --> TC_DATA
    
    API --> AUTH
    API --> BILLING
    API --> MONITORING
    
    TA_DATA --> FIRESTORE
    TB_DATA --> FIRESTORE
    TC_DATA --> FIRESTORE
    
    AUTH --> CACHE
    BILLING --> FIRESTORE
    MONITORING --> FILES
    BACKUP --> FIRESTORE
    
    %% Styling
    classDef tenantA fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef tenantB fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef tenantC fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef shared fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class TA_DATA,TA_CONFIG,TA_USERS tenantA
    class TB_DATA,TB_CONFIG,TB_USERS tenantB
    class TC_DATA,TC_CONFIG,TC_USERS tenantC
    class EDGE,APP,API,AUTH,BILLING,MONITORING,BACKUP shared
    class FIRESTORE,CACHE,FILES data
```

---

## 📱 Application Architecture Diagrams

### Customer PWA Architecture

```mermaid
graph TB
    subgraph "Customer PWA - Next.js 14"
        subgraph "App Router Structure"
            ROOT[app/layout.tsx<br/>🏠 Root Layout]
            AUTH_LAYOUT[app/(auth)/layout.tsx<br/>🔐 Auth Layout]
            CUSTOMER_LAYOUT[app/(customer)/layout.tsx<br/>👤 Customer Layout]
            
            LOGIN[app/(auth)/login/page.tsx<br/>🚪 Login Page]
            REGISTER[app/(auth)/register/page.tsx<br/>📝 Register Page]
            
            MENU[app/(customer)/menu/page.tsx<br/>🍔 Menu Page]
            CART[app/(customer)/cart/page.tsx<br/>🛒 Cart Page]
            CHECKOUT[app/(customer)/checkout/page.tsx<br/>💳 Checkout Page]
            ORDERS[app/(customer)/orders/page.tsx<br/>📦 Orders Page]
        end
        
        subgraph "API Routes"
            API_AUTH[app/api/auth/route.ts<br/>🔑 Auth API]
            API_ORDERS[app/api/orders/route.ts<br/>📦 Orders API]
            API_PRODUCTS[app/api/products/route.ts<br/>🍔 Products API]
            API_VOICE[app/api/voice/route.ts<br/>🎤 Voice API]
        end
        
        subgraph "Components"
            HEADER[components/Header<br/>📱 Navigation]
            PRODUCT_CARD[components/ProductCard<br/>🍔 Product Display]
            CART_ITEM[components/CartItem<br/>🛒 Cart Item]
            ORDER_STATUS[components/OrderStatus<br/>📊 Status Display]
        end
        
        subgraph "Features"
            MENU_FEATURE[features/menu<br/>🍽️ Menu Management]
            CART_FEATURE[features/cart<br/>🛒 Cart Logic]
            CHECKOUT_FEATURE[features/checkout<br/>💳 Checkout Flow]
            VOICE_FEATURE[features/voice<br/>🎤 Voice Commerce]
        end
        
        subgraph "PWA Features"
            SW[🔧 Service Worker]
            MANIFEST[📋 Web Manifest]
            OFFLINE[📴 Offline Support]
            PUSH[📢 Push Notifications]
        end
    end
    
    %% Layout Hierarchy
    ROOT --> AUTH_LAYOUT
    ROOT --> CUSTOMER_LAYOUT
    AUTH_LAYOUT --> LOGIN
    AUTH_LAYOUT --> REGISTER
    CUSTOMER_LAYOUT --> MENU
    CUSTOMER_LAYOUT --> CART
    CUSTOMER_LAYOUT --> CHECKOUT
    CUSTOMER_LAYOUT --> ORDERS
    
    %% Component Usage
    MENU --> PRODUCT_CARD
    CART --> CART_ITEM
    ORDERS --> ORDER_STATUS
    
    %% Feature Integration
    MENU --> MENU_FEATURE
    CART --> CART_FEATURE
    CHECKOUT --> CHECKOUT_FEATURE
    
    %% API Connections
    LOGIN --> API_AUTH
    MENU --> API_PRODUCTS
    CART --> API_ORDERS
    CHECKOUT --> API_ORDERS
    
    %% PWA Integration
    ROOT --> SW
    ROOT --> MANIFEST
    SW --> OFFLINE
    SW --> PUSH
    
    %% Styling
    classDef layout fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef page fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef component fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef feature fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef pwa fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class ROOT,AUTH_LAYOUT,CUSTOMER_LAYOUT layout
    class LOGIN,REGISTER,MENU,CART,CHECKOUT,ORDERS page
    class API_AUTH,API_ORDERS,API_PRODUCTS,API_VOICE api
    class HEADER,PRODUCT_CARD,CART_ITEM,ORDER_STATUS component
    class MENU_FEATURE,CART_FEATURE,CHECKOUT_FEATURE,VOICE_FEATURE feature
    class SW,MANIFEST,OFFLINE,PUSH pwa
```

### Admin Dashboard Architecture

```mermaid
graph TB
    subgraph "Admin Dashboard - React SPA"
        subgraph "Pages"
            DASHBOARD[📊 Dashboard]
            PRODUCTS[🍔 Products]
            ORDERS[📦 Orders]
            ANALYTICS[📈 Analytics]
            EVENTS[🎪 Events]
            SETTINGS[⚙️ Settings]
            STAFF[👥 Staff]
        end
        
        subgraph "Components"
            SIDEBAR[🔧 Sidebar]
            HEADER[📱 Header]
            STATS_CARD[📊 Stats Card]
            DATA_TABLE[📋 Data Table]
            CHARTS[📈 Charts]
            MODALS[🪟 Modals]
        end
        
        subgraph "State Management"
            AUTH_STORE[🔑 Auth Store]
            UI_STORE[🎨 UI Store]
            DATA_STORE[📊 Data Store]
            REAL_TIME[⚡ Real-time Store]
        end
        
        subgraph "Services"
            API_SERVICE[🔌 API Service]
            WEBSOCKET[🌐 WebSocket]
            CACHE[💾 Cache Service]
            EXPORT[📤 Export Service]
        end
        
        subgraph "Features"
            KDS[🍳 Kitchen Display]
            POS[💰 Point of Sale]
            INVENTORY[📦 Inventory]
            REPORTS[📋 Reports]
        end
    end
    
    %% Page Layout
    SIDEBAR --> DASHBOARD
    SIDEBAR --> PRODUCTS
    SIDEBAR --> ORDERS
    SIDEBAR --> ANALYTICS
    
    %% Component Reuse
    DASHBOARD --> STATS_CARD
    DASHBOARD --> CHARTS
    PRODUCTS --> DATA_TABLE
    ORDERS --> DATA_TABLE
    ANALYTICS --> CHARTS
    
    %% State Connections
    DASHBOARD --> AUTH_STORE
    DASHBOARD --> DATA_STORE
    ORDERS --> REAL_TIME
    KDS --> REAL_TIME
    
    %% Service Integration
    DATA_STORE --> API_SERVICE
    REAL_TIME --> WEBSOCKET
    REPORTS --> EXPORT
    
    %% Feature Integration
    ORDERS --> KDS
    ORDERS --> POS
    PRODUCTS --> INVENTORY
    ANALYTICS --> REPORTS
    
    %% Styling
    classDef page fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef component fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef state fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef service fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef feature fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class DASHBOARD,PRODUCTS,ORDERS,ANALYTICS,EVENTS,SETTINGS,STAFF page
    class SIDEBAR,HEADER,STATS_CARD,DATA_TABLE,CHARTS,MODALS component
    class AUTH_STORE,UI_STORE,DATA_STORE,REAL_TIME state
    class API_SERVICE,WEBSOCKET,CACHE,EXPORT service
    class KDS,POS,INVENTORY,REPORTS feature
```

---

## 💾 Data Architecture Diagrams

### Firestore Data Model

```mermaid
erDiagram
    TENANTS {
        string id PK
        string name
        string slug
        enum status
        object subscription
        object settings
        object branding
        timestamp createdAt
        timestamp updatedAt
    }
    
    PRODUCTS {
        string id PK
        string tenantId FK
        object name
        object description
        string category
        object pricing
        array variants
        array modifierGroups
        object inventory
        object availability
        object media
        object nutrition
        object allergens
        timestamp createdAt
        timestamp updatedAt
    }
    
    ORDERS {
        string id PK
        string tenantId FK
        string orderNumber
        enum type
        enum channel
        enum status
        object customer
        array items
        object pricing
        object payment
        object fulfillment
        object context
        timestamp createdAt
        timestamp updatedAt
    }
    
    CUSTOMERS {
        string id PK
        string tenantId FK
        string firebaseUid
        string name
        string phone
        string email
        enum language
        object preferences
        array addresses
        object loyalty
        timestamp createdAt
        timestamp lastOrderAt
    }
    
    ORDER_EVENTS {
        string id PK
        string orderId FK
        string tenantId FK
        enum eventType
        object eventData
        string userId
        timestamp timestamp
    }
    
    ANALYTICS {
        string id PK
        string tenantId FK
        string date
        object metrics
        object trends
        object forecasts
        timestamp generatedAt
    }
    
    STAFF {
        string id PK
        string tenantId FK
        string firebaseUid
        string name
        string email
        array roles
        object schedule
        object permissions
        timestamp createdAt
    }
    
    %% Relationships
    TENANTS ||--o{ PRODUCTS : "has many"
    TENANTS ||--o{ ORDERS : "has many"
    TENANTS ||--o{ CUSTOMERS : "has many"
    TENANTS ||--o{ STAFF : "has many"
    TENANTS ||--o{ ANALYTICS : "has many"
    
    ORDERS ||--o{ ORDER_EVENTS : "has many"
    CUSTOMERS ||--o{ ORDERS : "places"
    
    %% Indexes
    PRODUCTS }o--|| TENANTS : "tenantId + category + status"
    ORDERS }o--|| TENANTS : "tenantId + status + createdAt"
    CUSTOMERS }o--|| TENANTS : "tenantId + phone"
    ORDER_EVENTS }o--|| ORDERS : "orderId + timestamp"
```

### Caching Architecture

```mermaid
graph TB
    subgraph "Client Side"
        BROWSER[🌐 Browser Cache]
        IDB[💾 IndexedDB]
        SW_CACHE[🔧 Service Worker Cache]
    end
    
    subgraph "CDN Layer"
        CF_CACHE[☁️ Cloudflare Cache]
        CF_KV[🗂️ Cloudflare KV]
    end
    
    subgraph "Application Layer"
        REDIS[⚡ Redis Cache]
        MEMORY[🧠 Memory Cache]
    end
    
    subgraph "Database Layer"
        FS_CACHE[🔥 Firestore Cache]
        FS_OFFLINE[📴 Offline Cache]
    end
    
    subgraph "Data Sources"
        FIRESTORE[📚 Firestore]
        STORAGE[📁 Cloud Storage]
        API[🔌 External APIs]
    end
    
    %% Cache Hierarchy
    BROWSER --> CF_CACHE
    IDB --> SW_CACHE
    SW_CACHE --> CF_CACHE
    
    CF_CACHE --> REDIS
    CF_KV --> REDIS
    
    REDIS --> FS_CACHE
    MEMORY --> FS_CACHE
    
    FS_CACHE --> FIRESTORE
    FS_OFFLINE --> FIRESTORE
    
    %% Direct Data Access
    REDIS --> STORAGE
    CF_CACHE --> API
    
    %% Cache Types
    BROWSER -.->|"Static Assets<br/>5-30 min"| BROWSER
    IDB -.->|"User Data<br/>24 hours"| IDB
    SW_CACHE -.->|"API Responses<br/>5 min"| SW_CACHE
    CF_CACHE -.->|"Public Content<br/>1-24 hours"| CF_CACHE
    CF_KV -.->|"Config Data<br/>1 hour"| CF_KV
    REDIS -.->|"Session Data<br/>30 min"| REDIS
    MEMORY -.->|"Hot Data<br/>5 min"| MEMORY
    FS_CACHE -.->|"Query Results<br/>1 hour"| FS_CACHE
    
    %% Styling
    classDef client fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef cdn fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef app fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef db fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef source fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class BROWSER,IDB,SW_CACHE client
    class CF_CACHE,CF_KV cdn
    class REDIS,MEMORY app
    class FS_CACHE,FS_OFFLINE db
    class FIRESTORE,STORAGE,API source
```

---

## 🏗️ Infrastructure Diagrams

### Cloud Infrastructure Overview

```mermaid
graph TB
    subgraph "Cloudflare Global Network"
        CF_DNS[🌐 DNS]
        CF_CDN[☁️ CDN]
        CF_WAF[🛡️ WAF]
        CF_WORKERS[⚙️ Workers]
        CF_R2[📦 R2 Storage]
    end
    
    subgraph "Vercel Edge Network"
        VERCEL_EDGE[🌍 Edge Functions]
        VERCEL_DEPLOY[🚀 Deployments]
        VERCEL_ANALYTICS[📊 Analytics]
    end
    
    subgraph "Google Cloud Platform - europe-west1"
        subgraph "Firebase Services"
            FB_AUTH[🔑 Authentication]
            FB_FIRESTORE[📚 Firestore]
            FB_FUNCTIONS[⚙️ Cloud Functions]
            FB_STORAGE[📁 Cloud Storage]
            FB_HOSTING[🌐 Hosting]
        end
        
        subgraph "GCP Services"
            GCP_PUBSUB[📢 Pub/Sub]
            GCP_SCHEDULER[⏰ Scheduler]
            GCP_MONITORING[📊 Monitoring]
            GCP_LOGGING[📝 Logging]
        end
    end
    
    subgraph "External Services"
        UPSTASH[⚡ Redis - Upstash]
        SENTRY[🐛 Error Tracking]
        PLAUSIBLE[📈 Analytics]
    end
    
    subgraph "Payment & Communication"
        STRIPE[💳 Stripe]
        TWINT[📱 Twint]
        TWILIO[📞 Twilio]
        SENDGRID[📧 SendGrid]
    end
    
    %% Network Flow
    CF_DNS --> CF_CDN
    CF_CDN --> CF_WAF
    CF_WAF --> CF_WORKERS
    CF_WORKERS --> VERCEL_EDGE
    
    %% Vercel Integration
    VERCEL_EDGE --> VERCEL_DEPLOY
    VERCEL_DEPLOY --> FB_FUNCTIONS
    
    %% Firebase Internal
    FB_FUNCTIONS --> FB_FIRESTORE
    FB_FUNCTIONS --> FB_STORAGE
    FB_FUNCTIONS --> FB_AUTH
    FB_FUNCTIONS --> GCP_PUBSUB
    
    %% GCP Integration
    GCP_SCHEDULER --> FB_FUNCTIONS
    FB_FUNCTIONS --> GCP_MONITORING
    FB_FUNCTIONS --> GCP_LOGGING
    
    %% External Services
    FB_FUNCTIONS --> UPSTASH
    VERCEL_DEPLOY --> SENTRY
    CF_WORKERS --> PLAUSIBLE
    
    %% Payment Integration
    FB_FUNCTIONS --> STRIPE
    FB_FUNCTIONS --> TWINT
    FB_FUNCTIONS --> TWILIO
    FB_FUNCTIONS --> SENDGRID
    
    %% Storage Integration
    FB_STORAGE --> CF_R2
    
    %% Styling
    classDef cloudflare fill:#f96332,color:#fff,stroke:#f96332,stroke-width:2px
    classDef vercel fill:#000,color:#fff,stroke:#000,stroke-width:2px
    classDef firebase fill:#ffa000,color:#fff,stroke:#ffa000,stroke-width:2px
    classDef gcp fill:#4285f4,color:#fff,stroke:#4285f4,stroke-width:2px
    classDef external fill:#9c27b0,color:#fff,stroke:#9c27b0,stroke-width:2px
    classDef payment fill:#4caf50,color:#fff,stroke:#4caf50,stroke-width:2px
    
    class CF_DNS,CF_CDN,CF_WAF,CF_WORKERS,CF_R2 cloudflare
    class VERCEL_EDGE,VERCEL_DEPLOY,VERCEL_ANALYTICS vercel
    class FB_AUTH,FB_FIRESTORE,FB_FUNCTIONS,FB_STORAGE,FB_HOSTING firebase
    class GCP_PUBSUB,GCP_SCHEDULER,GCP_MONITORING,GCP_LOGGING gcp
    class UPSTASH,SENTRY,PLAUSIBLE external
    class STRIPE,TWINT,TWILIO,SENDGRID payment
```

### Network Security Architecture

```mermaid
graph TB
    subgraph "Internet"
        USERS[👥 Users]
        ATTACKERS[🏴‍☠️ Potential Attackers]
    end
    
    subgraph "Edge Security - Cloudflare"
        DNS_FILTER[🌐 DNS Filtering]
        DDOS_PROTECTION[⚡ DDoS Protection]
        WAF[🛡️ Web Application Firewall]
        SSL_TLS[🔐 SSL/TLS Termination]
        RATE_LIMIT[⏱️ Rate Limiting]
    end
    
    subgraph "Application Security"
        AUTH_GATEWAY[🔑 Auth Gateway]
        API_GATEWAY[🔌 API Gateway]
        INPUT_VALIDATION[✅ Input Validation]
        OUTPUT_ENCODING[🔒 Output Encoding]
    end
    
    subgraph "Service Mesh"
        SERVICE_A[📦 Service A]
        SERVICE_B[📦 Service B]
        SERVICE_C[📦 Service C]
        MTLS[🔐 mTLS]
    end
    
    subgraph "Data Security"
        ENCRYPTION[🔒 Encryption at Rest]
        ACCESS_CONTROL[👤 Access Control]
        AUDIT_LOG[📝 Audit Logging]
        BACKUP_ENCRYPTION[💾 Encrypted Backups]
    end
    
    subgraph "Monitoring & Response"
        SIEM[📊 SIEM]
        INTRUSION_DETECTION[🚨 IDS/IPS]
        INCIDENT_RESPONSE[🚨 Incident Response]
        THREAT_INTEL[🧠 Threat Intelligence]
    end
    
    %% Attack Flow
    USERS --> DNS_FILTER
    ATTACKERS --> DNS_FILTER
    
    %% Security Layers
    DNS_FILTER --> DDOS_PROTECTION
    DDOS_PROTECTION --> WAF
    WAF --> SSL_TLS
    SSL_TLS --> RATE_LIMIT
    RATE_LIMIT --> AUTH_GATEWAY
    
    %% Application Layer
    AUTH_GATEWAY --> API_GATEWAY
    API_GATEWAY --> INPUT_VALIDATION
    INPUT_VALIDATION --> OUTPUT_ENCODING
    
    %% Service Layer
    OUTPUT_ENCODING --> SERVICE_A
    OUTPUT_ENCODING --> SERVICE_B
    OUTPUT_ENCODING --> SERVICE_C
    SERVICE_A -.-> MTLS
    SERVICE_B -.-> MTLS
    SERVICE_C -.-> MTLS
    
    %% Data Layer
    SERVICE_A --> ENCRYPTION
    SERVICE_B --> ACCESS_CONTROL
    SERVICE_C --> AUDIT_LOG
    ENCRYPTION --> BACKUP_ENCRYPTION
    
    %% Monitoring
    WAF --> SIEM
    API_GATEWAY --> INTRUSION_DETECTION
    AUDIT_LOG --> INCIDENT_RESPONSE
    SIEM --> THREAT_INTEL
    
    %% Security Feedback
    THREAT_INTEL --> WAF
    INCIDENT_RESPONSE --> DDOS_PROTECTION
    
    %% Styling
    classDef internet fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef edge fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef app fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef service fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef monitoring fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class USERS,ATTACKERS internet
    class DNS_FILTER,DDOS_PROTECTION,WAF,SSL_TLS,RATE_LIMIT edge
    class AUTH_GATEWAY,API_GATEWAY,INPUT_VALIDATION,OUTPUT_ENCODING app
    class SERVICE_A,SERVICE_B,SERVICE_C,MTLS service
    class ENCRYPTION,ACCESS_CONTROL,AUDIT_LOG,BACKUP_ENCRYPTION data
    class SIEM,INTRUSION_DETECTION,INCIDENT_RESPONSE,THREAT_INTEL monitoring
```

---

## 🔄 Sequence Diagrams

### Order Creation Flow

```mermaid
sequenceDiagram
    participant C as Customer PWA
    participant CF as Cloudflare Edge
    participant API as API Gateway
    participant AUTH as Auth Service
    participant ORDER as Order Service
    participant PRODUCT as Product Service
    participant PAYMENT as Payment Service
    participant NOTIF as Notification Service
    participant DB as Firestore
    participant STRIPE as Stripe
    participant SMS as Twilio SMS
    
    Note over C,SMS: Complete Order Creation Flow
    
    C->>+CF: POST /api/orders (Order Data)
    CF->>+API: Forward Request
    
    API->>+AUTH: Validate JWT Token
    AUTH->>-API: Token Valid + User Context
    
    API->>+ORDER: Create Order Command
    
    ORDER->>+PRODUCT: Validate Products & Availability
    PRODUCT->>+DB: Check Product Stock
    DB->>-PRODUCT: Stock Available
    PRODUCT->>-ORDER: Products Valid
    
    ORDER->>+DB: Save Order (Status: Pending)
    DB->>-ORDER: Order Saved
    
    ORDER->>+PAYMENT: Process Payment
    PAYMENT->>+STRIPE: Charge Customer
    STRIPE->>-PAYMENT: Payment Successful
    PAYMENT->>+DB: Update Payment Status
    DB->>-PAYMENT: Payment Recorded
    PAYMENT->>-ORDER: Payment Confirmed
    
    ORDER->>+DB: Update Order (Status: Confirmed)
    DB->>-ORDER: Order Updated
    
    ORDER->>+NOTIF: Send Order Confirmation
    
    par Parallel Notifications
        NOTIF->>+SMS: Send SMS to Customer
        SMS->>-NOTIF: SMS Sent
    and
        NOTIF->>C: Push Notification
    and
        NOTIF->>+DB: Log Notification
        DB->>-NOTIF: Logged
    end
    
    NOTIF->>-ORDER: Notifications Sent
    ORDER->>-API: Order Created Successfully
    API->>-CF: Response (Order Details)
    CF->>-C: Order Confirmation
    
    Note over C,SMS: Order successfully created and confirmed
```

### Real-time Kitchen Updates

```mermaid
sequenceDiagram
    participant KDS as Kitchen Display
    participant WS as WebSocket Server
    participant ORDER as Order Service
    participant DB as Firestore
    participant STAFF as Staff Mobile
    participant CUSTOMER as Customer PWA
    
    Note over KDS,CUSTOMER: Real-time Order Status Updates
    
    KDS->>+WS: Connect WebSocket (Kitchen)
    WS->>-KDS: Connected
    
    STAFF->>+WS: Connect WebSocket (Staff)
    WS->>-STAFF: Connected
    
    CUSTOMER->>+WS: Connect WebSocket (Customer)
    WS->>-CUSTOMER: Connected
    
    Note over KDS,CUSTOMER: Order Status Change Triggered
    
    KDS->>+ORDER: Update Status to "Preparing"
    ORDER->>+DB: Save Status Change
    DB->>-ORDER: Status Updated
    
    ORDER->>+WS: Broadcast Status Update
    
    par Parallel Updates
        WS->>KDS: Order Status: Preparing
        WS->>STAFF: Order Status: Preparing
        WS->>CUSTOMER: Order Status: Preparing
    end
    
    WS->>-ORDER: Broadcast Complete
    ORDER->>-KDS: Status Update Confirmed
    
    Note over KDS,CUSTOMER: Kitchen marks order ready
    
    KDS->>+ORDER: Update Status to "Ready"
    ORDER->>+DB: Save Status Change
    DB->>-ORDER: Status Updated
    
    ORDER->>+WS: Broadcast Ready Status
    
    par Notifications
        WS->>KDS: Order Status: Ready
        WS->>STAFF: Order Status: Ready
        WS->>CUSTOMER: Order Status: Ready (with notification sound)
    end
    
    WS->>-ORDER: Broadcast Complete
    ORDER->>-KDS: Ready Status Confirmed
    
    Note over KDS,CUSTOMER: Real-time updates ensure synchronized state
```

---

## 🇨🇭 Swiss-Specific Diagrams

### Swiss Payment Integration Flow

```mermaid
flowchart TB
    subgraph "Customer Payment Choice"
        CUSTOMER[👤 Customer]
        PAYMENT_METHODS[💳 Payment Methods]
    end
    
    subgraph "Swiss Payment Options"
        TWINT[📱 Twint]
        POSTFINANCE[🏦 PostFinance]
        SWISS_CARDS[💳 Swiss Cards]
        CASH[💵 Cash]
    end
    
    subgraph "Payment Processing"
        TWINT_API[📱 Twint API]
        POSTFINANCE_API[🏦 PostFinance API]
        STRIPE_CH[💳 Stripe Switzerland]
        CASH_HANDLER[💵 Cash Management]
    end
    
    subgraph "Swiss Compliance"
        VAT_CALC[📊 VAT Calculation<br/>7.7% Standard]
        CHF_ROUNDING[🔄 CHF Rounding<br/>0.05 for Cash]
        RECEIPT_CH[🧾 Swiss Receipt Format]
        DATA_RESIDENCY[🇨🇭 Swiss Data Residency]
    end
    
    subgraph "Financial Systems"
        ACCOUNTING[📚 Accounting Integration]
        TAX_REPORT[📋 Tax Reporting]
        BANK_RECONCILIATION[🏦 Bank Reconciliation]
        AUDIT_TRAIL[📝 Audit Trail]
    end
    
    %% Payment Flow
    CUSTOMER --> PAYMENT_METHODS
    
    PAYMENT_METHODS --> TWINT
    PAYMENT_METHODS --> POSTFINANCE
    PAYMENT_METHODS --> SWISS_CARDS
    PAYMENT_METHODS --> CASH
    
    %% Processing
    TWINT --> TWINT_API
    POSTFINANCE --> POSTFINANCE_API
    SWISS_CARDS --> STRIPE_CH
    CASH --> CASH_HANDLER
    
    %% Compliance
    TWINT_API --> VAT_CALC
    POSTFINANCE_API --> VAT_CALC
    STRIPE_CH --> VAT_CALC
    CASH_HANDLER --> CHF_ROUNDING
    
    VAT_CALC --> RECEIPT_CH
    CHF_ROUNDING --> RECEIPT_CH
    RECEIPT_CH --> DATA_RESIDENCY
    
    %% Financial Integration
    DATA_RESIDENCY --> ACCOUNTING
    ACCOUNTING --> TAX_REPORT
    ACCOUNTING --> BANK_RECONCILIATION
    ACCOUNTING --> AUDIT_TRAIL
    
    %% Styling
    classDef customer fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef payment fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef processing fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef compliance fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef financial fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class CUSTOMER,PAYMENT_METHODS customer
    class TWINT,POSTFINANCE,SWISS_CARDS,CASH payment
    class TWINT_API,POSTFINANCE_API,STRIPE_CH,CASH_HANDLER processing
    class VAT_CALC,CHF_ROUNDING,RECEIPT_CH,DATA_RESIDENCY compliance
    class ACCOUNTING,TAX_REPORT,BANK_RECONCILIATION,AUDIT_TRAIL financial
```

### Swiss Data Protection Architecture

```mermaid
graph TB
    subgraph "Data Collection"
        WEB_FORMS[📝 Web Forms]
        MOBILE_APP[📱 Mobile Input]
        POS_SYSTEM[💰 POS System]
        API_ENDPOINTS[🔌 API Endpoints]
    end
    
    subgraph "Consent Management"
        CONSENT_BANNER[🍪 Cookie Banner]
        PRIVACY_CENTER[🔒 Privacy Center]
        CONSENT_DB[📊 Consent Database]
        LEGAL_BASIS[⚖️ Legal Basis Tracking]
    end
    
    subgraph "Swiss Data Processing"
        subgraph "Data Minimization"
            NECESSARY_ONLY[✅ Necessary Data Only]
            PURPOSE_LIMITATION[🎯 Purpose Limitation]
            RETENTION_POLICY[⏰ Retention Policies]
        end
        
        subgraph "Data Security"
            ENCRYPTION_REST[🔒 Encryption at Rest]
            ENCRYPTION_TRANSIT[🚀 Encryption in Transit]
            ACCESS_CONTROL[👤 Access Control]
            AUDIT_LOGGING[📝 Audit Logging]
        end
    end
    
    subgraph "Swiss Data Residency"
        SWISS_DC[🇨🇭 Swiss Data Centers]
        EU_BACKUP[🇪🇺 EU Backup Sites]
        NO_US_TRANSFER[🚫 No US Transfers]
        ADEQUACY_CHECK[✅ Adequacy Decisions]
    end
    
    subgraph "Data Subject Rights"
        ACCESS_REQUEST[📋 Access Requests]
        RECTIFICATION[✏️ Data Correction]
        ERASURE[🗑️ Right to Erasure]
        PORTABILITY[📤 Data Portability]
        OBJECTION[✋ Right to Object]
    end
    
    subgraph "Compliance Monitoring"
        DPIA[📊 DPIA Process]
        COMPLIANCE_AUDIT[🔍 Regular Audits]
        BREACH_DETECTION[🚨 Breach Detection]
        AUTHORITY_REPORTING[📢 Authority Reporting]
    end
    
    %% Data Flow
    WEB_FORMS --> CONSENT_BANNER
    MOBILE_APP --> PRIVACY_CENTER
    POS_SYSTEM --> CONSENT_DB
    API_ENDPOINTS --> LEGAL_BASIS
    
    CONSENT_BANNER --> NECESSARY_ONLY
    PRIVACY_CENTER --> PURPOSE_LIMITATION
    CONSENT_DB --> RETENTION_POLICY
    
    NECESSARY_ONLY --> ENCRYPTION_REST
    PURPOSE_LIMITATION --> ENCRYPTION_TRANSIT
    RETENTION_POLICY --> ACCESS_CONTROL
    ACCESS_CONTROL --> AUDIT_LOGGING
    
    ENCRYPTION_REST --> SWISS_DC
    ENCRYPTION_TRANSIT --> EU_BACKUP
    AUDIT_LOGGING --> NO_US_TRANSFER
    SWISS_DC --> ADEQUACY_CHECK
    
    SWISS_DC --> ACCESS_REQUEST
    EU_BACKUP --> RECTIFICATION
    ADEQUACY_CHECK --> ERASURE
    ACCESS_REQUEST --> PORTABILITY
    RECTIFICATION --> OBJECTION
    
    ERASURE --> DPIA
    PORTABILITY --> COMPLIANCE_AUDIT
    OBJECTION --> BREACH_DETECTION
    DPIA --> AUTHORITY_REPORTING
    
    %% Styling
    classDef collection fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef consent fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef processing fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef residency fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef rights fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef compliance fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class WEB_FORMS,MOBILE_APP,POS_SYSTEM,API_ENDPOINTS collection
    class CONSENT_BANNER,PRIVACY_CENTER,CONSENT_DB,LEGAL_BASIS consent
    class NECESSARY_ONLY,PURPOSE_LIMITATION,RETENTION_POLICY,ENCRYPTION_REST,ENCRYPTION_TRANSIT,ACCESS_CONTROL,AUDIT_LOGGING processing
    class SWISS_DC,EU_BACKUP,NO_US_TRANSFER,ADEQUACY_CHECK residency
    class ACCESS_REQUEST,RECTIFICATION,ERASURE,PORTABILITY,OBJECTION rights
    class DPIA,COMPLIANCE_AUDIT,BREACH_DETECTION,AUTHORITY_REPORTING compliance
```

---

## 🔮 Future Architecture Diagrams

### Edge Computing Evolution

```mermaid
graph TB
    subgraph "Current Architecture (2025)"
        CLIENT_CURRENT[📱 Client]
        CDN_CURRENT[☁️ CDN]
        SERVER_CURRENT[🖥️ Central Server]
        DB_CURRENT[💾 Central Database]
    end
    
    subgraph "Edge Architecture (2026)"
        CLIENT_EDGE[📱 Client]
        
        subgraph "Edge Layer"
            EDGE_EU[🌍 EU Edge]
            EDGE_US[🌎 US Edge]
            EDGE_ASIA[🌏 Asia Edge]
        end
        
        subgraph "Edge Services"
            EDGE_COMPUTE[⚙️ Edge Computing]
            EDGE_STORAGE[💾 Edge Storage]
            EDGE_DB[📚 Edge Database]
            EDGE_AI[🤖 Edge AI]
        end
        
        subgraph "Central Services"
            CENTRAL_ORCHESTRATION[🎯 Orchestration]
            CENTRAL_ANALYTICS[📊 Analytics]
            CENTRAL_BACKUP[💾 Backup]
        end
    end
    
    subgraph "Global Distribution"
        ZURICH[🇨🇭 Zurich]
        FRANKFURT[🇩🇪 Frankfurt]
        PARIS[🇫🇷 Paris]
        LONDON[🇬🇧 London]
    end
    
    %% Current Flow
    CLIENT_CURRENT --> CDN_CURRENT
    CDN_CURRENT --> SERVER_CURRENT
    SERVER_CURRENT --> DB_CURRENT
    
    %% Edge Flow
    CLIENT_EDGE --> EDGE_EU
    CLIENT_EDGE --> EDGE_US
    CLIENT_EDGE --> EDGE_ASIA
    
    EDGE_EU --> EDGE_COMPUTE
    EDGE_US --> EDGE_STORAGE
    EDGE_ASIA --> EDGE_DB
    EDGE_COMPUTE --> EDGE_AI
    
    %% Central Coordination
    EDGE_COMPUTE --> CENTRAL_ORCHESTRATION
    EDGE_STORAGE --> CENTRAL_ANALYTICS
    EDGE_DB --> CENTRAL_BACKUP
    
    %% Geographic Distribution
    EDGE_EU --> ZURICH
    EDGE_EU --> FRANKFURT
    EDGE_EU --> PARIS
    EDGE_EU --> LONDON
    
    %% Migration Path
    SERVER_CURRENT -.-> EDGE_COMPUTE
    DB_CURRENT -.-> EDGE_DB
    CDN_CURRENT -.-> EDGE_EU
    
    %% Styling
    classDef current fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef edge fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef service fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef central fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef geo fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class CLIENT_CURRENT,CDN_CURRENT,SERVER_CURRENT,DB_CURRENT current
    class CLIENT_EDGE,EDGE_EU,EDGE_US,EDGE_ASIA edge
    class EDGE_COMPUTE,EDGE_STORAGE,EDGE_DB,EDGE_AI service
    class CENTRAL_ORCHESTRATION,CENTRAL_ANALYTICS,CENTRAL_BACKUP central
    class ZURICH,FRANKFURT,PARIS,LONDON geo
```

### AI-Native Architecture Vision

```mermaid
graph TB
    subgraph "Data Sources"
        ORDERS[📦 Order Data]
        CUSTOMER[👤 Customer Data]
        WEATHER[🌤️ Weather Data]
        EVENTS[🎪 Event Data]
        SOCIAL[📱 Social Media]
    end
    
    subgraph "Data Pipeline"
        INGESTION[📥 Data Ingestion]
        PROCESSING[⚙️ Stream Processing]
        FEATURE_STORE[🏪 Feature Store]
        DATA_LAKE[🏞️ Data Lake]
    end
    
    subgraph "AI/ML Platform"
        subgraph "Model Training"
            DEMAND_MODEL[📈 Demand Forecasting]
            PRICE_MODEL[💰 Price Optimization]
            RECOMMENDATION[🎯 Recommendations]
            VOICE_MODEL[🎤 Voice Processing]
        end
        
        subgraph "Model Serving"
            INFERENCE_API[🚀 Inference API]
            EDGE_INFERENCE[🌍 Edge Inference]
            BATCH_SCORING[📊 Batch Scoring]
            REAL_TIME[⚡ Real-time Scoring]
        end
    end
    
    subgraph "AI Applications"
        DYNAMIC_PRICING[💲 Dynamic Pricing]
        DEMAND_FORECAST[📊 Demand Prediction]
        VOICE_ORDERING[🗣️ Voice Commerce]
        SMART_RECOMMENDATIONS[🤖 Smart Suggestions]
        PREDICTIVE_INVENTORY[📦 Predictive Inventory]
    end
    
    subgraph "Decision Automation"
        AUTO_PRICING[🔄 Auto Pricing]
        INVENTORY_ALERTS[🚨 Inventory Alerts]
        STAFF_SCHEDULING[👥 Staff Optimization]
        MENU_OPTIMIZATION[🍔 Menu Optimization]
    end
    
    subgraph "Feedback Loop"
        PERFORMANCE_MONITORING[📊 Model Performance]
        A_B_TESTING[🧪 A/B Testing]
        CONTINUOUS_LEARNING[🔄 Continuous Learning]
        MODEL_RETRAINING[🔁 Auto Retraining]
    end
    
    %% Data Flow
    ORDERS --> INGESTION
    CUSTOMER --> INGESTION
    WEATHER --> PROCESSING
    EVENTS --> PROCESSING
    SOCIAL --> PROCESSING
    
    INGESTION --> FEATURE_STORE
    PROCESSING --> DATA_LAKE
    FEATURE_STORE --> DATA_LAKE
    
    %% Training
    DATA_LAKE --> DEMAND_MODEL
    DATA_LAKE --> PRICE_MODEL
    DATA_LAKE --> RECOMMENDATION
    DATA_LAKE --> VOICE_MODEL
    
    %% Serving
    DEMAND_MODEL --> INFERENCE_API
    PRICE_MODEL --> EDGE_INFERENCE
    RECOMMENDATION --> BATCH_SCORING
    VOICE_MODEL --> REAL_TIME
    
    %% Applications
    INFERENCE_API --> DYNAMIC_PRICING
    EDGE_INFERENCE --> DEMAND_FORECAST
    BATCH_SCORING --> VOICE_ORDERING
    REAL_TIME --> SMART_RECOMMENDATIONS
    INFERENCE_API --> PREDICTIVE_INVENTORY
    
    %% Automation
    DYNAMIC_PRICING --> AUTO_PRICING
    DEMAND_FORECAST --> INVENTORY_ALERTS
    SMART_RECOMMENDATIONS --> STAFF_SCHEDULING
    PREDICTIVE_INVENTORY --> MENU_OPTIMIZATION
    
    %% Feedback
    AUTO_PRICING --> PERFORMANCE_MONITORING
    INVENTORY_ALERTS --> A_B_TESTING
    STAFF_SCHEDULING --> CONTINUOUS_LEARNING
    MENU_OPTIMIZATION --> MODEL_RETRAINING
    
    %% Learning Loop
    PERFORMANCE_MONITORING --> DATA_LAKE
    A_B_TESTING --> FEATURE_STORE
    CONTINUOUS_LEARNING --> DEMAND_MODEL
    MODEL_RETRAINING --> PRICE_MODEL
    
    %% Styling
    classDef data fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef pipeline fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef ml fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef app fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef automation fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef feedback fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class ORDERS,CUSTOMER,WEATHER,EVENTS,SOCIAL data
    class INGESTION,PROCESSING,FEATURE_STORE,DATA_LAKE pipeline
    class DEMAND_MODEL,PRICE_MODEL,RECOMMENDATION,VOICE_MODEL,INFERENCE_API,EDGE_INFERENCE,BATCH_SCORING,REAL_TIME ml
    class DYNAMIC_PRICING,DEMAND_FORECAST,VOICE_ORDERING,SMART_RECOMMENDATIONS,PREDICTIVE_INVENTORY app
    class AUTO_PRICING,INVENTORY_ALERTS,STAFF_SCHEDULING,MENU_OPTIMIZATION automation
    class PERFORMANCE_MONITORING,A_B_TESTING,CONTINUOUS_LEARNING,MODEL_RETRAINING feedback
```

---

## 📊 Diagram Legend

### Symbols and Colors

```mermaid
graph LR
    subgraph "User Types"
        U1[👤 Customer]
        U2[👨‍🍳 Staff]
        U3[👩‍💼 Admin]
        U4[🔧 Master User]
    end
    
    subgraph "System Components"
        S1[📱 Frontend Apps]
        S2[🔌 API Services]
        S3[💾 Data Storage]
        S4[☁️ Cloud Services]
    end
    
    subgraph "Security Elements"
        SEC1[🛡️ Security Controls]
        SEC2[🔒 Encryption]
        SEC3[🔑 Authentication]
        SEC4[👤 Authorization]
    end
    
    subgraph "Integration Points"
        I1[💳 Payment Services]
        I2[📞 Communication]
        I3[🤖 AI/ML Services]
        I4[📊 Analytics]
    end
    
    %% Styling
    classDef userStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef systemStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef securityStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef integrationStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class U1,U2,U3,U4 userStyle
    class S1,S2,S3,S4 systemStyle
    class SEC1,SEC2,SEC3,SEC4 securityStyle
    class I1,I2,I3,I4 integrationStyle
```

### Relationship Types

```mermaid
graph LR
    A[Component A] --> B[Component B]
    C[Component C] -.-> D[Component D]
    E[Component E] ==> F[Component F]
    G[Component G] ~~~ H[Component H]
    
    A1[Sync Call] --> B1[Response]
    C1[Async Message] -.-> D1[Eventual Response]
    E1[Strong Dependency] ==> F1[Required Service]
    G1[Loose Coupling] ~~~ H1[Optional Integration]
```

---

## 📞 Diagram Maintenance

### Tools and Standards

```bash
# Diagram Tools
📊 Mermaid.js: Online flowcharts and diagrams
🏗️ PlantUML: Complex architecture diagrams
🎨 Draw.io: Visual architecture documentation
📝 Markdown: Embedded diagrams in documentation

# Standards
🎯 Consistent color coding across all diagrams
📏 Standard symbols for common components
🔄 Regular updates with architecture changes
📋 Version control for all diagram sources

# Maintenance Schedule
📅 Monthly: Review and update diagrams
🔄 Quarterly: Major architecture diagram review
📊 Annually: Complete diagram architecture audit
🎯 On-demand: Updates for significant changes
```

### Diagram Guidelines

```markdown
# Diagram Creation Guidelines

## Consistency Rules
- Use consistent colors for similar components
- Follow established symbol conventions
- Maintain readable font sizes and spacing
- Include legends for complex diagrams

## Update Process
1. Update diagrams with architecture changes
2. Review diagrams in code reviews
3. Validate diagrams with stakeholders
4. Version control diagram sources

## Quality Checklist
- [ ] Diagram accurately represents current architecture
- [ ] All components are labeled clearly
- [ ] Relationships are correctly depicted
- [ ] Colors and symbols follow standards
- [ ] Diagram is readable at various sizes
```

---

*Last Updated: Januar 2025 - EATECH V3.0*  
*Diese Diagramme visualisieren die EATECH V3.0 Architektur umfassend*  
*Für Diagramm-Updates: [architecture@eatech.ch](mailto:architecture@eatech.ch)*