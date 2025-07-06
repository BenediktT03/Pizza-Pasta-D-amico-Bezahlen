# EATECH V3.0 - VOLLSTÄNDIGE ENTWICKLUNGSDOKUMENTATION

## 📋 VOLLSTÄNDIGES INHALTSVERZEICHNIS

1. [Wichtige Entwicklungs-Richtlinien](#wichtige-entwicklungs-richtlinien)
2. [Projektstruktur](#projektstruktur)
3. [Vollständige Datenstruktur](#vollständige-datenstruktur)
4. [Sicherheits-Features](#sicherheits-features)
5. [Features Übersicht mit Fortschritt](#features-übersicht-mit-fortschritt)
   - 5.1 [Customer Features](#customer-features)
   - 5.2 [Admin Features](#admin-features)
   - 5.3 [Premium Features](#premium-features)
   - 5.4 [Superadmin Features](#superadmin-features)
6. [Detaillierte Feature-Beschreibungen](#detaillierte-feature-beschreibungen)
   - 6.1 [Customer Features Details](#customer-features-details)
   - 6.2 [Admin Features Details](#admin-features-details)
   - 6.3 [Premium Features Details](#premium-features-details)
   - 6.4 [Superadmin Features Details](#superadmin-features-details)
7. [Technische Implementation Details](#technische-implementation-details)
   - 7.1 [Offline-Funktionalität](#offline-funktionalität)
   - 7.2 [Real-Time Synchronisation](#real-time-synchronisation)
   - 7.3 [Performance Optimierungen](#performance-optimierungen)
   - 7.4 [Database Optimierungen](#database-optimierungen)
   - 7.5 [Security Implementation](#security-implementation)
8. [Testing-Strategie](#testing-strategie)
   - 8.1 [Unit Tests](#unit-tests)
   - 8.2 [Integration Tests](#integration-tests)
   - 8.3 [E2E Tests](#e2e-tests)
   - 8.4 [Performance Tests](#performance-tests)
   - 8.5 [Security Tests](#security-tests)
9. [Mobile App Specifics](#mobile-app-specifics)
   - 9.1 [React Native Implementation](#react-native-implementation)
   - 9.2 [iOS Specifics](#ios-specifics)
   - 9.3 [Android Specifics](#android-specifics)
10. [Internationalisierung](#internationalisierung)
11. [Deployment & DevOps](#deployment-devops)
    - 11.1 [CI/CD Pipeline](#cicd-pipeline)
    - 11.2 [Monitoring & Logging](#monitoring-logging)
    - 11.3 [Backup & Disaster Recovery](#backup-disaster-recovery)
12. [Best Practices & Guidelines](#best-practices-guidelines)
    - 12.1 [Code Style Guide](#code-style-guide)
    - 12.2 [Accessibility Guidelines](#accessibility-guidelines)
    - 12.3 [Performance Checklist](#performance-checklist)
13. [API Dokumentation](#api-dokumentation)
14. [Implementierungs-Timeline](#implementierungs-timeline)
15. [Gesamtfortschritt](#gesamtfortschritt)
16. [Kritische Erfolgsfaktoren](#kritische-erfolgsfaktoren)
17. [Risiken & Mitigationen](#risiken-mitigationen)
18. [Unique Selling Points](#unique-selling-points)
19. [Support & Ressourcen](#support-ressourcen)
20. [Nächste Schritte](#nächste-schritte)

---

## 🚨 WICHTIGE ENTWICKLUNGS-RICHTLINIEN

### MEINE ARBEITSWEISE:

1. **VOLLSTÄNDIGE FILES**
   - Ich erstelle IMMER komplette Dateien
   - Keine Auslassungen mit "..." oder "// rest of code"
   - Alle Imports, Funktionen und Styles vollständig

2. **DATEIPFADE ZUERST**
   - Bevor ich eine Datei erstelle, nenne ich den exakten Pfad
   - Beispiel: `/apps/admin/src/pages/Products/Products.jsx`
   - Du bestätigst oder korrigierst den Pfad

3. **DETAILFRAGEN VOR IMPLEMENTIERUNG**
   - Ich frage dich nach spezifischen Details bevor ich eine Funktion erstelle
   - Maximal 3 relevante Fragen
   - Erst nach deiner Antwort implementiere ich

4. **PROJEKT-WISSEN NUTZEN**
   - Ich durchsuche immer zuerst das Projektwissen (GitHub)
   - Nutze bestehende Strukturen und Patterns
   - Halte mich an die vorhandene Architektur

---

## 🏗️ PROJEKTSTRUKTUR

### Komplette Verzeichnisstruktur

```
/eatech-v3
  /apps
    /web (Customer Web App)
      /public
        /css
          - style.css
          - themes.css
        /js
          - app.js
          - order-management.js
          - payment-manager.js
          - voice-commands.js
          - admin-dashboard-ui.js
          - analytics-engine.js
          - notification-manager.js
          - firebase-config.js
        /images
          - logo-192.png
          - logo-512.png
          - placeholder.png
          /icons
        /sounds
          - notification.mp3
          - order-ready.mp3
        /locales
          /de
            - common.json
            - customer.json
          /en
            - common.json
            - customer.json
        - index.html
        - manifest.json
        - service-worker.js
        - offline.html
        - robots.txt
        - sitemap.xml
      - package.json
      - .env.example
    
    /admin (Admin Dashboard)
      /src
        /components
          /common
            /Button
              - Button.jsx
              - Button.styles.js
              - Button.test.jsx
              - index.js
            /Card
              - Card.jsx
              - Card.styles.js
              - index.js
            /Modal
              - Modal.jsx
              - Modal.styles.js
              - useModal.js
              - index.js
            /Form
              - Input.jsx
              - Select.jsx
              - Checkbox.jsx
              - Form.styles.js
              - index.js
            /Table
              - Table.jsx
              - TableRow.jsx
              - TablePagination.jsx
              - Table.styles.js
              - index.js
            /Loading
              - Spinner.jsx
              - Skeleton.jsx
              - LoadingScreen.jsx
              - Loading.styles.js
              - index.js
          /Dashboard
            - Dashboard.jsx
            - AdminDashboard.jsx
            - Dashboard.old.jsx
          /layout
            - Sidebar.jsx
            - Sidebar.css
            - Header.jsx
            - Footer.jsx
            - AdminLayout.jsx
        /pages
          /Dashboard
            - Dashboard.jsx
            - Dashboard.old.jsx
          /Products
            - Products.jsx
            - Products.module.css
            - ProductEdit.jsx
            - ProductList.jsx
          /Orders
            - OrderList.jsx
            - OrderDetail.jsx
          /Customers
            - CustomerList.jsx
            - CustomerDetail.jsx
          /Kitchen
            - KitchenDisplay.jsx
            - KitchenDisplay.css
          /Analytics
            - Analytics.jsx
            - SalesAnalytics.jsx
            - CustomerAnalytics.jsx
            - ProductAnalytics.jsx
          /billing
            - BillingDashboard.jsx
            - Invoices.jsx
            - Subscriptions.jsx
          /loyalty
            - LoyaltyProgram.jsx
            - LoyaltyMembers.jsx
            - LoyaltyRewards.jsx
          /discounts
            - DiscountManager.jsx
            - DiscountEdit.jsx
          /Settings
            - Settings.jsx
            - GeneralSettings.jsx
            - PaymentSettings.jsx
            - DeliverySettings.jsx
            - NotificationSettings.jsx
          /reports
            - ReportGenerator.jsx
            - ReportHistory.jsx
            - ScheduledReports.jsx
          /notifications
            - NotificationCenter.jsx
            - NotificationTemplates.jsx
          /master
            - GlobalSettings.jsx
            - GlobalSettings.module.css
            - SystemMetrics.jsx
            - SystemMetrics.module.css
          /auth
            - Login.jsx
            - Register.jsx
            - ForgotPassword.jsx
          /hooks
            - useNotifications.js
        /lib
          - firebase.js
          - productService.js
        /services
          - firebaseService.js
          - reportService.js
        /hooks
          - useAuth.js
          - useTenant.js
          - useNotifications.js
        /routes
          - index.jsx
          - adminRoutes.jsx
          - ProtectedRoute.jsx
        /config
          - firebase.js
        /utils
          - fileDownload.js
        /styles
          - global.css
          - variables.css
        /layouts
          - AdminLayout.jsx
      /public
        - index.html
        - firebase-messaging-sw.js
        - robots.txt
      - package.json
      - vite.config.js
      - .env.example
      - test-firebase.js
      - test-firebase-simple.html
    
    /mobile (Mobile App)
      /src
        /screens
        /components
        /navigation
        /services
          - offlineSyncService.js
        /contexts
          - OfflineContext.js
        /config
          - constants.js
      /assets
        /icons
        /images
      - package.json
      - package-lock.json
      - app.json
      - .gitignore
    
    /master (Master Control)
      /src
        /modules
          /MasterControl
            - MasterControl.jsx
        /pages
          /FeatureControl
            - FeatureControl.jsx
            - FeatureControlWithFirebase.jsx
            - FeatureControl.module.css
      - package.json
    
    /landing (Landing Page)
      /.next
        /server
          /vendor-chunks
            - lucide-react@0.344.0_react@19.1.0.js
        - trace
      - [weitere Next.js build files]
  
  /packages (Shared Packages)
    /@eatech
      /core
        /config
          - firebase.js
        /contexts
          - TenantContext.js
        - package.json
      /ui
        /components
        /styles
        - package.json
      /auth
        /services
        /hooks
        - package.json
      /feature-flags
        /services
          - FirebaseFeatureService.js
        - package.json
  
  /scripts
    - setup.sh
    - deploy.sh
    - test-all.sh
  
  /docs
    - README.md
    - ARCHITECTURE.md
  
  - package.json
  - lerna.json
  - .gitignore
  - .prettierrc
  - .eslintrc.js
  - README.md
  - LICENSE
  - paste.txt (Diese Dokumentation)
```

---

## 🗄️ VOLLSTÄNDIGE DATENSTRUKTUR

### Firebase Realtime Database - Komplettes Schema

```javascript
{
  // ============================================================================
  // MULTI-TENANT STRUKTUR
  // ============================================================================
  "tenants": {
    "[TENANT_ID]": {
      // ========== TENANT INFO ==========
      "info": {
        "id": "unique-tenant-id",
        "name": "Restaurant Zürich",
        "subdomain": "restaurant-zuerich",
        "owner": "owner-user-id",
        "plan": "standard|premium|enterprise",
        "status": "active|suspended|trial|cancelled",
        "created": 1234567890,
        "updated": 1234567890,
        "canton": "ZH",
        "region": "zurich-1",
        "instance": "switzerland-central",
        
        "address": {
          "street": "Bahnhofstrasse 1",
          "streetNumber": "1",
          "zip": "8001",
          "city": "Zürich",
          "canton": "ZH",
          "country": "CH",
          "coordinates": {
            "lat": 47.3769,
            "lng": 8.5417
          }
        },
        
        "contact": {
          "email": "info@restaurant.ch",
          "phone": "+41 44 123 45 67",
          "mobile": "+41 79 123 45 67",
          "website": "https://restaurant.ch",
          "facebook": "https://facebook.com/restaurant",
          "instagram": "@restaurant_zh",
          "whatsapp": "+41 79 123 45 67"
        },
        
        "billing": {
          "company": "Restaurant Zürich AG",
          "taxId": "CHE-123.456.789",
          "vatNumber": "CHE-123.456.789 MWST",
          "paymentMethod": "invoice|card|sepa",
          "billingCycle": "monthly|yearly",
          "nextBilling": 1234567890,
          "lastPayment": 1234567890,
          "invoiceEmail": "billing@restaurant.ch",
          "currency": "CHF",
          "pricePerMonth": 299,
          "commission": 3.0,
          "credits": 0,
          "overdueAmount": 0
        },
        
        "branding": {
          "theme": "noir-excellence|modern-light|classic|custom",
          "primaryColor": "#FF6B6B",
          "secondaryColor": "#4ECDC4",
          "logo": "https://storage.eatech.ch/logos/tenant-id.png",
          "favicon": "https://storage.eatech.ch/favicons/tenant-id.ico",
          "customCSS": "",
          "fontFamily": "Inter",
          "language": "de-CH",
          "languages": ["de-CH", "fr-CH", "it-CH", "en"],
          "timezone": "Europe/Zurich"
        },
        
        "features": {
          "multiLocation": true,
          "whiteLabel": false,
          "apiAccess": true,
          "advancedAnalytics": true,
          "loyaltyProgram": true,
          "tableReservation": false,
          "onlineOrdering": true,
          "deliveryIntegration": true,
          "kitchenDisplay": true,
          "inventoryManagement": true,
          "staffManagement": true,
          "customReports": false,
          "aiRecommendations": false,
          "voiceOrdering": false,
          "socialMediaIntegration": false,
          "multiCurrency": false,
          "multiLanguage": true,
          "customNotifications": true,
          "advancedDiscounts": true,
          "giftCards": false,
          "mobileApp": false,
          "sustainability": {
            "carbonTracking": false,
            "wasteReduction": false,
            "localSourcing": false
          }
        },
        
        "limits": {
          "maxProducts": 1000,
          "maxOrders": 5000,
          "maxUsers": 50,
          "maxLocations": 3,
          "storageGB": 10,
          "apiCallsPerMonth": 100000,
          "emailsPerMonth": 10000,
          "smsPerMonth": 1000
        }
      },
      
      // ========== PRODUCTS ==========
      "products": {
        "[PRODUCT_ID]": {
          "id": "auto-generated",
          "name": "Burger Deluxe",
          "description": "Saftiger Rindfleisch-Burger mit frischen Zutaten",
          "price": 15.90,
          "category": "main|starter|dessert|beverage|side",
          "imageUrl": "https://storage.eatech.ch/products/burger-deluxe.jpg",
          "available": true,
          "featured": false,
          "tenantId": "tenant-id",
          "createdAt": 1234567890,
          "updatedAt": 1234567890,
          
          // Zusatz-Informationen
          "ingredients": ["Rindfleisch", "Salat", "Tomate", "Zwiebel", "Käse"],
          "allergens": ["gluten", "milk", "egg", "mustard"],
          "nutritionalInfo": {
            "calories": 650,
            "protein": 35,
            "carbs": 45,
            "fat": 32,
            "fiber": 4,
            "sugar": 8,
            "salt": 2.1
          },
          "preparationTime": 15,
          "spicyLevel": 0, // 0-5
          "vegetarian": false,
          "vegan": false,
          "glutenFree": false,
          "organic": false,
          "sustainability": {
            "localIngredients": true,
            "co2Footprint": 2.5,
            "packaging": "recyclable"
          },
          
          // Varianten & Optionen
          "variants": [{
            "name": "Klein",
            "price": 12.90,
            "default": false
          }, {
            "name": "Normal",
            "price": 15.90,
            "default": true
          }, {
            "name": "XXL",
            "price": 19.90,
            "default": false
          }],
          
          "modifiers": [{
            "group": "Extras",
            "options": [{
              "name": "Extra Käse",
              "price": 2.50
            }, {
              "name": "Bacon",
              "price": 3.00
            }]
          }],
          
          // Lagerbestand
          "stock": {
            "enabled": true,
            "quantity": 50,
            "lowStockAlert": 10,
            "trackIngredients": false,
            "autoReorder": false,
            "reorderPoint": 20,
            "reorderQuantity": 100
          },
          
          // Marketing & Verkauf
          "tags": ["bestseller", "chef-empfehlung", "neu"],
          "searchKeywords": ["burger", "beef", "american"],
          "crossSelling": ["product-id-fries", "product-id-cola"],
          "upselling": ["product-id-xxl-burger"],
          
          // Analytics
          "stats": {
            "soldCount": 1234,
            "revenue": 19516.60,
            "avgRating": 4.7,
            "reviewCount": 89,
            "favoriteCount": 234
          }
        }
      },
      
      // ========== CATEGORIES ==========
      "categories": {
        "[CATEGORY_ID]": {
          "id": "cat-main",
          "name": "Hauptgerichte",
          "slug": "main",
          "icon": "🍔",
          "image": "https://storage.eatech.ch/categories/main.jpg",
          "description": "Unsere leckeren Hauptgerichte",
          "sortOrder": 1,
          "active": true,
          "parentId": null,
          "schedule": {
            "always": true,
            "days": [],
            "timeRanges": []
          },
          "translations": {
            "fr-CH": {
              "name": "Plats principaux",
              "description": "Nos délicieux plats principaux"
            },
            "it-CH": {
              "name": "Piatti principali",
              "description": "I nostri deliziosi piatti principali"
            }
          }
        }
      },
      
      // ========== ORDERS ==========
      "orders": {
        "[ORDER_ID]": {
          "id": "auto-generated",
          "orderNumber": "2025-0001",
          "status": "pending|confirmed|preparing|ready|delivering|completed|cancelled",
          "type": "dine-in|takeaway|delivery|pickup",
          "source": "pos|online|app|phone|kiosk",
          "tableNumber": "T1",
          "qrCode": "table-t1-session-xyz",
          
          // Kundendaten
          "customer": {
            "id": "customer-id",
            "name": "Max Mustermann",
            "phone": "+41 79 123 45 67",
            "email": "max@example.com",
            "address": {
              "street": "Musterstrasse 1",
              "zip": "8001",
              "city": "Zürich"
            },
            "notes": "3. Stock, Klingel Mustermann"
          },
          
          // Bestellpositionen
          "items": [{
            "id": "item-1",
            "productId": "product-id",
            "name": "Burger Deluxe",
            "variant": "Normal",
            "price": 15.90,
            "quantity": 2,
            "modifiers": [{
              "name": "Extra Käse",
              "price": 2.50
            }],
            "notes": "Ohne Zwiebeln",
            "subtotal": 36.80,
            "status": "preparing",
            "preparedAt": null,
            "preparedBy": null
          }],
          
          // Preisberechnung
          "pricing": {
            "subtotal": 36.80,
            "discount": 0,
            "discountCode": null,
            "deliveryFee": 5.00,
            "serviceFee": 0,
            "tax": 2.83,
            "taxRate": 7.7,
            "tip": 2.00,
            "total": 46.63,
            "commission": 1.40, // 3% für EATECH
            "tenantPayout": 45.23
          },
          
          // Zahlung
          "payment": {
            "method": "card|cash|twint|paypal|invoice",
            "status": "pending|processing|paid|failed|refunded",
            "transactionId": "stripe_xyz123",
            "paidAt": 1234567890,
            "provider": "stripe|twint|sumup",
            "last4": "4242",
            "brand": "visa"
          },
          
          // Lieferung
          "delivery": {
            "method": "restaurant|uber|just-eat|internal",
            "estimatedTime": 1234567890,
            "actualTime": null,
            "distance": 2.5,
            "driverId": "driver-id",
            "driverName": "John Doe",
            "driverPhone": "+41 79 999 99 99",
            "trackingUrl": "https://tracking.uber.com/xyz"
          },
          
          // Zeitstempel
          "timestamps": {
            "created": 1234567890,
            "confirmed": 1234567891,
            "preparing": 1234567892,
            "ready": null,
            "delivering": null,
            "completed": null,
            "cancelled": null
          },
          
          // Zusatzinfos
          "preparation": {
            "estimatedMinutes": 20,
            "actualMinutes": null,
            "kitchen": "main",
            "station": "grill",
            "priority": "normal|high|low",
            "assignedTo": "chef-id"
          },
          
          "feedback": {
            "rating": null,
            "comment": null,
            "ratedAt": null
          },
          
          "metadata": {
            "userAgent": "Mozilla/5.0...",
            "ip": "192.168.1.1",
            "deviceId": "device-xyz",
            "sessionId": "session-abc",
            "referrer": "google.com",
            "utmSource": "instagram",
            "utmCampaign": "summer-promo"
          }
        }
      },
      
      // ========== CUSTOMERS ==========
      "customers": {
        "[CUSTOMER_ID]": {
          "id": "customer-id",
          "name": "Max Mustermann",
          "email": "max@example.com",
          "phone": "+41 79 123 45 67",
          "phoneVerified": true,
          "emailVerified": true,
          "avatar": "https://storage.eatech.ch/avatars/customer-id.jpg",
          
          "addresses": [{
            "id": "addr-1",
            "type": "home",
            "label": "Zuhause",
            "street": "Musterstrasse 1",
            "zip": "8001",
            "city": "Zürich",
            "default": true,
            "coordinates": {
              "lat": 47.3769,
              "lng": 8.5417
            }
          }],
          
          "preferences": {
            "language": "de-CH",
            "currency": "CHF",
            "newsletter": true,
            "smsNotifications": true,
            "pushNotifications": true,
            "emailNotifications": {
              "orders": true,
              "marketing": false,
              "updates": true
            },
            "dietary": {
              "vegetarian": false,
              "vegan": false,
              "glutenFree": false,
              "lactoseFree": false,
              "halal": false,
              "kosher": false
            },
            "allergies": ["nuts", "shellfish"],
            "spiceLevel": 3,
            "favoriteCategories": ["burger", "pizza"]
          },
          
          "loyalty": {
            "points": 1250,
            "tier": "gold",
            "memberSince": 1234567890,
            "lifetimePoints": 5680,
            "pointsExpiring": {
              "amount": 200,
              "date": 1234567890
            },
            "benefits": ["free-delivery", "birthday-discount", "early-access"],
            "referralCode": "MAX123",
            "referredBy": "customer-id-2",
            "referralCount": 5
          },
          
          "stats": {
            "orderCount": 45,
            "totalSpent": 2567.80,
            "averageOrderValue": 57.06,
            "lastOrderDate": 1234567890,
            "favoriteItems": ["product-1", "product-2"],
            "orderFrequency": "weekly",
            "lifetimeValue": 2567.80,
            "churnRisk": "low",
            "lastActive": 1234567890
          },
          
          "tags": ["vip", "regular", "birthday-month"],
          "notes": "Bevorzugt Lieferung am Abend",
          "createdAt": 1234567890,
          "updatedAt": 1234567890,
          "source": "online|pos|import|api",
          "consent": {
            "marketing": true,
            "dataProcessing": true,
            "timestamp": 1234567890
          }
        }
      },
      
      // ========== USERS (Staff) ==========
      "users": {
        "[USER_ID]": {
          "id": "user-id",
          "email": "admin@restaurant.ch",
          "name": "Admin User",
          "role": "owner|admin|manager|chef|waiter|delivery",
          "permissions": {
            "orders": ["view", "create", "update", "delete"],
            "products": ["view", "create", "update", "delete"],
            "customers": ["view", "create", "update"],
            "analytics": ["view"],
            "settings": ["view", "update"],
            "users": ["view", "create", "update", "delete"],
            "billing": ["view"]
          },
          "active": true,
          "avatar": "https://storage.eatech.ch/avatars/user-id.jpg",
          "phone": "+41 79 999 99 99",
          "language": "de-CH",
          "workSchedule": {
            "monday": { "start": "08:00", "end": "17:00" },
            "tuesday": { "start": "08:00", "end": "17:00" }
          },
          "pin": "1234", // For POS
          "createdAt": 1234567890,
          "lastLogin": 1234567890,
          "loginCount": 234,
          "deviceTokens": ["token1", "token2"],
          "twoFactorEnabled": false
        }
      },
      
      // ========== ANALYTICS ==========
      "analytics": {
        "daily": {
          "2025-01-07": {
            "revenue": 4567.80,
            "orders": 67,
            "newCustomers": 12,
            "returningCustomers": 55,
            "averageOrderValue": 68.18,
            "commission": 137.03,
            "refunds": 0,
            "discounts": 123.40,
            
            "hourlyRevenue": {
              "11": 234.50,
              "12": 567.80,
              "13": 890.20,
              "18": 1234.50,
              "19": 1640.80
            },
            
            "topProducts": {
              "product-1": { "quantity": 23, "revenue": 365.70 },
              "product-2": { "quantity": 18, "revenue": 287.20 }
            },
            
            "orderTypes": {
              "dine-in": 30,
              "takeaway": 25,
              "delivery": 12
            },
            
            "paymentMethods": {
              "card": 45,
              "cash": 15,
              "twint": 7
            },
            
            "performance": {
              "avgPreparationTime": 18.5,
              "avgDeliveryTime": 32.4,
              "orderAccuracy": 98.5,
              "customerSatisfaction": 4.7
            }
          }
        },
        
        "weekly": {
          "2025-W02": {
            "revenue": 28456.90,
            "orders": 423,
            "growth": 12.5,
            "topDay": "saturday",
            "lowDay": "monday"
          }
        },
        
        "monthly": {
          "2025-01": {
            "revenue": 98765.40,
            "orders": 1456,
            "growth": 8.3,
            "targetRevenue": 100000,
            "targetProgress": 98.77,
            "topProducts": [],
            "customerRetention": 78.5,
            "newCustomers": 234,
            "churnRate": 5.2
          }
        },
        
        "realtime": {
          "activeOrders": 8,
          "kitchenLoad": 65,
          "deliveryDrivers": 3,
          "waitTime": 20,
          "todayRevenue": 2345.60,
          "todayOrders": 34,
          "lastUpdate": 1234567890
        }
      },
      
      // ========== SETTINGS ==========
      "settings": {
        "business": {
          "openingHours": {
            "monday": { "open": "11:00", "close": "22:00" },
            "tuesday": { "open": "11:00", "close": "22:00" },
            "wednesday": { "open": "11:00", "close": "22:00" },
            "thursday": { "open": "11:00", "close": "22:00" },
            "friday": { "open": "11:00", "close": "23:00" },
            "saturday": { "open": "10:00", "close": "23:00" },
            "sunday": { "open": "10:00", "close": "22:00" }
          },
          "holidays": [{
            "date": "2025-12-25",
            "name": "Weihnachten",
            "closed": true
          }],
          "specialHours": [{
            "date": "2025-12-31",
            "open": "11:00",
            "close": "02:00",
            "reason": "Silvester"
          }],
          "deliveryRadius": 5,
          "minimumOrder": {
            "delivery": 20,
            "takeaway": 0
          },
          "preparationTime": {
            "default": 20,
            "busy": 35,
            "quiet": 15
          },
          "maxOrdersPerHour": 50,
          "autoAcceptOrders": false,
          "requirePhoneVerification": true
        },
        
        "payment": {
          "methods": {
            "cash": { "enabled": true, "default": false },
            "card": { "enabled": true, "default": true },
            "twint": { "enabled": true, "default": false },
            "paypal": { "enabled": false, "default": false },
            "invoice": { "enabled": false, "minAmount": 50 }
          },
          "providers": {
            "stripe": {
              "publicKey": "pk_live_xxx",
              "secretKey": "sk_live_xxx",
              "webhookSecret": "whsec_xxx"
            },
            "twint": {
              "merchantId": "xxx",
              "apiKey": "xxx"
            },
            "sumup": {
              "affiliateKey": "xxx"
            }
          },
          "tipping": {
            "enabled": true,
            "suggestions": [5, 10, 15],
            "customAllowed": true
          },
          "surcharges": {
            "card": 0,
            "smallOrder": 2,
            "smallOrderThreshold": 15
          }
        },
        
        "notifications": {
          "channels": {
            "email": true,
            "sms": true,
            "push": true,
            "sound": true
          },
          "orderAlerts": {
            "newOrder": true,
            "orderReady": true,
            "orderCancelled": true,
            "lowStock": true
          },
          "templates": {
            "orderConfirmation": {
              "subject": "Bestellung bestätigt - {orderNumber}",
              "body": "..."
            }
          },
          "quietHours": {
            "start": "22:00",
            "end": "09:00"
          }
        },
        
        "printing": {
          "kitchen": {
            "enabled": true,
            "printerIp": "192.168.1.100",
            "autoprint": true,
            "copies": 1
          },
          "receipt": {
            "enabled": true,
            "printerIp": "192.168.1.101",
            "autoprint": false,
            "showQR": true
          }
        },
        
        "integrations": {
          "googleBusiness": {
            "enabled": true,
            "placeId": "ChIJxxx"
          },
          "uber": {
            "enabled": true,
            "storeId": "xxx",
            "commission": 30
          },
          "justEat": {
            "enabled": false
          }
        },
        
        "loyalty": {
          "enabled": true,
          "pointsPerCHF": 1,
          "redeemRate": 100, // 100 points = 1 CHF
          "welcomeBonus": 50,
          "birthdayBonus": 200,
          "tiers": [{
            "name": "Bronze",
            "minPoints": 0,
            "benefits": ["newsletter"]
          }, {
            "name": "Silver",
            "minPoints": 500,
            "benefits": ["free-delivery", "10%-discount"]
          }, {
            "name": "Gold",
            "minPoints": 2000,
            "benefits": ["free-delivery", "15%-discount", "priority-support"]
          }]
        }
      },
      
      // ========== NOTIFICATIONS ==========
      "notifications": {
        "[NOTIFICATION_ID]": {
          "id": "notif-1",
          "type": "order|system|marketing|alert",
          "channel": "push|email|sms|in-app",
          "recipient": "user-id|all|role:admin",
          "title": "Neue Bestellung",
          "body": "Bestellung #2025-0001 eingegangen",
          "data": {
            "orderId": "order-id",
            "action": "view_order"
          },
          "priority": "high|normal|low",
          "status": "pending|sent|delivered|read|failed",
          "scheduledFor": null,
          "sentAt": 1234567890,
          "readAt": null,
          "error": null,
          "createdAt": 1234567890
        }
      },
      
      // ========== INVENTORY ==========
      "inventory": {
        "[ITEM_ID]": {
          "id": "inv-1",
          "name": "Rindfleisch",
          "unit": "kg",
          "currentStock": 45.5,
          "minStock": 20,
          "maxStock": 100,
          "reorderPoint": 30,
          "reorderQuantity": 50,
          "supplier": {
            "name": "Metzgerei Schmidt",
            "contact": "+41 44 123 45 67",
            "email": "bestellung@metzgerei-schmidt.ch"
          },
          "cost": 28.50,
          "lastRestocked": 1234567890,
          "expiryDate": 1234567890,
          "location": "Kühlraum 1",
          "category": "meat",
          "linkedProducts": ["product-1", "product-2"]
        }
      },
      
      // ========== REPORTS ==========
      "reports": {
        "[REPORT_ID]": {
          "id": "report-1",
          "type": "sales|inventory|customer|financial",
          "name": "Monatsbericht Januar 2025",
          "period": {
            "start": 1234567890,
            "end": 1234567890
          },
          "format": "pdf|excel|csv",
          "status": "pending|processing|completed|failed",
          "url": "https://storage.eatech.ch/reports/report-1.pdf",
          "size": 2457600,
          "createdBy": "user-id",
          "createdAt": 1234567890,
          "scheduledReport": true,
          "schedule": "monthly",
          "recipients": ["admin@restaurant.ch"],
          "filters": {
            "locations": ["all"],
            "categories": ["all"],
            "paymentMethods": ["all"]
          }
        }
      },
      
      // ========== FEEDBACK & REVIEWS ==========
      "feedback": {
        "[FEEDBACK_ID]": {
          "id": "feedback-1",
          "orderId": "order-id",
          "customerId": "customer-id",
          "rating": 5,
          "comment": "Excellent food and service!",
          "aspects": {
            "food": 5,
            "service": 5,
            "delivery": 4,
            "value": 5
          },
          "images": ["https://storage.eatech.ch/feedback/img1.jpg"],
          "response": {
            "text": "Vielen Dank für Ihr Feedback!",
            "respondedBy": "user-id",
            "respondedAt": 1234567890
          },
          "helpful": 12,
          "reported": false,
          "verified": true,
          "platform": "eatech|google|tripadvisor",
          "createdAt": 1234567890
        }
      }
    }
  },
  
  // ============================================================================
  // MASTER CONTROL (Superadmin Bereich)
  // ============================================================================
  "master": {
    // Global Features
    "features": {
      "[FEATURE_ID]": {
        "id": "feature-id",
        "name": "AI Recommendations",
        "category": "ai",
        "enabled": true,
        "tier": "premium",
        "description": "KI-basierte Produktempfehlungen",
        "dependencies": ["analytics.advanced"],
        "rollout": {
          "status": "partial",
          "percentage": 50,
          "targetGroups": ["beta-testers", "premium-tenants"]
        }
      }
    },
    
    // System Metrics
    "metrics": {
      "system": {
        "tenants": {
          "total": 127,
          "active": 115,
          "trial": 8,
          "suspended": 4
        },
        "revenue": {
          "daily": 4567.89,
          "monthly": 125678.90,
          "mrr": 37890.00,
          "growth": 12.5
        },
        "usage": {
          "orders": 45678,
          "apiCalls": 2345678,
          "storage": "234.5 GB",
          "bandwidth": "1.2 TB"
        },
        "performance": {
          "uptime": 99.99,
          "avgResponseTime": 124,
          "errorRate": 0.02
        }
      }
    },
    
    // Backups
    "backups": {
      "[BACKUP_ID]": {
        "id": "backup-1",
        "type": "full|incremental",
        "status": "running|completed|failed",
        "size": 12457896521,
        "duration": 3456,
        "location": "s3://backups/2025-01-07/",
        "createdAt": 1234567890,
        "expiresAt": 1234567890,
        "tenants": ["all"],
        "encrypted": true
      }
    },
    
    // Audit Log
    "audit": {
      "[LOG_ID]": {
        "id": "audit-1",
        "action": "user.create|tenant.update|feature.toggle",
        "actor": "user-id",
        "target": "tenant-id",
        "changes": {
          "before": {},
          "after": {}
        },
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": 1234567890
      }
    }
  },
  
  // ============================================================================
  // GLOBAL CONFIGURATIONS
  // ============================================================================
  "config": {
    "firebase": {
      "projectId": "eatech-foodtruck",
      "apiKey": "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
      "databaseURL": "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app"
    },
    
    "stripe": {
      "publicKey": "pk_live_xxx",
      "webhookEndpoint": "https://api.eatech.ch/webhooks/stripe"
    },
    
    "twilio": {
      "accountSid": "ACxxx",
      "from": "+41 xx xxx xx xx"
    },
    
    "sendgrid": {
      "apiKey": "SG.xxx",
      "from": "noreply@eatech.ch"
    },
    
    "storage": {
      "provider": "firebase",
      "bucket": "eatech-foodtruck.firebasestorage.app",
      "cdnUrl": "https://cdn.eatech.ch"
    },
    
    "analytics": {
      "googleAnalytics": "G-XXX",
      "mixpanel": "xxx",
      "hotjar": "xxx"
    }
  }
}
```

---

## 🔒 SICHERHEITS-FEATURES

### FRAUD PREVENTION SYSTEM [0%]

#### 0-FRANKEN-BESTELLUNGEN SCHUTZ
**Status**: 0% implementiert
**Priorität**: KRITISCH

**Automatische Sperrung bei**:
- 3+ Bestellungen mit 0.00 CHF innerhalb 24h
- 5+ Bestellungen mit 0.00 CHF innerhalb 7 Tage
- Ungewöhnliche Muster (gleiche IP, gleicher User)

**Maßnahmen**:
1. Automatische System-Sperrung
2. Admin-Benachrichtigung
3. Manuelle Überprüfung erforderlich
4. IP-Blocking möglich
5. Tenant-Warnung

**Implementierung**:
```javascript
// Fraud Detection Service
const checkForFraudPattern = async (tenantId, customerId) => {
  const recentOrders = await getRecentOrders(tenantId, customerId, 24);
  const zeroValueOrders = recentOrders.filter(o => o.total === 0);
  
  if (zeroValueOrders.length >= 3) {
    await lockTenantAccount(tenantId);
    await notifyAdmin('FRAUD_ALERT', { tenantId, reason: 'zero_value_orders' });
    return { blocked: true, reason: 'Mehrere 0-Franken-Bestellungen erkannt' };
  }
  return { blocked: false };
};
```

---

## 🚀 FEATURES ÜBERSICHT MIT FORTSCHRITT

### 1. CUSTOMER FEATURES [Priorität: HOCH] - Gesamtfortschritt: 0%

#### 1.1 QR-CODE SCANNER & TABLE ORDERING [0%]
- **Status**: 0% implementiert
- **Priorität**: KRITISCH
- **Beschreibung**: Kernfeature für kontaktloses Bestellen

#### 1.2 DIGITAL MENU DISPLAY [0%]
- **Status**: 0% implementiert  
- **Priorität**: KRITISCH
- **Beschreibung**: Responsive Speisekarte mit Bildern und Filtern

#### 1.3 SMART CART & CHECKOUT [0%]
- **Status**: 0% implementiert
- **Priorität**: KRITISCH
- **Beschreibung**: Warenkorb mit Echtzeit-Updates

#### 1.4 MULTI-PAYMENT SYSTEM [0%]
- **Status**: 0% implementiert
- **Priorität**: KRITISCH
- **Beschreibung**: Stripe, Twint, PayPal, Bar

#### 1.5 ORDER TRACKING [0%]
- **Status**: 0% implementiert
- **Priorität**: HOCH
- **Beschreibung**: Echtzeit-Verfolgung des Bestellstatus

### 2. ADMIN FEATURES [Priorität: HOCH] - Gesamtfortschritt: 0%

#### 2.1 DASHBOARD & ANALYTICS [0%]
- **Status**: 0% implementiert
- **Priorität**: KRITISCH
- **Beschreibung**: Echtzeit-Übersicht aller wichtigen Metriken

#### 2.2 ORDER MANAGEMENT [0%]
- **Status**: 0% implementiert
- **Priorität**: KRITISCH
- **Beschreibung**: Bestellverwaltung mit Kitchen Display

#### 2.3 PRODUCT MANAGEMENT [0%]
- **Status**: 0% implementiert
- **Priorität**: KRITISCH
- **Beschreibung**: Produkte, Kategorien, Preise verwalten

#### 2.4 CUSTOMER MANAGEMENT [0%]
- **Status**: 0% implementiert
- **Priorität**: MITTEL
- **Beschreibung**: Kundendatenbank mit Historie

#### 2.5 FINANCIAL REPORTS [0%]
- **Status**: 0% implementiert
- **Priorität**: HOCH
- **Beschreibung**: Umsatz, Steuern, Provisionen

### 3. PREMIUM FEATURES [Priorität: MITTEL] - Gesamtfortschritt: 0%

#### 3.1 AI-POWERED RECOMMENDATIONS [0%]
- **Status**: 0% implementiert
- **Priorität**: NIEDRIG
- **Beschreibung**: KI-basierte Produktvorschläge

#### 3.2 LOYALTY PROGRAM [0%]
- **Status**: 0% implementiert
- **Priorität**: MITTEL
- **Beschreibung**: Punkte sammeln und einlösen

#### 3.3 ADVANCED ANALYTICS [0%]
- **Status**: 0% implementiert
- **Priorität**: MITTEL
- **Beschreibung**: Predictive Analytics, Trends

#### 3.4 WHITE LABEL SOLUTION [0%]
- **Status**: 0% implementiert
- **Priorität**: NIEDRIG
- **Beschreibung**: Eigenes Branding für Enterprise

#### 3.5 API ACCESS [0%]
- **Status**: 0% implementiert
- **Priorität**: NIEDRIG
- **Beschreibung**: REST API für Integrationen

### 4. SUPERADMIN FEATURES [Priorität: NIEDRIG] - Gesamtfortschritt: 0%

#### 4.1 TENANT MANAGEMENT [0%]
- **Status**: 0% implementiert
- **Priorität**: MITTEL
- **Beschreibung**: Multi-Tenant Verwaltung

#### 4.2 REVENUE TRACKING [0%]
- **Status**: 0% implementiert
- **Priorität**: HOCH
- **Beschreibung**: Provisionen und Abrechnungen

#### 4.3 SYSTEM MONITORING [0%]
- **Status**: 0% implementiert
- **Priorität**: MITTEL
- **Beschreibung**: Performance und Uptime

#### 4.4 FEATURE FLAGS [0%]
- **Status**: 0% implementiert
- **Priorität**: NIEDRIG
- **Beschreibung**: Feature-Rollout Kontrolle

#### 4.5 ERROR DASHBOARD [0%]
- **Status**: 0% implementiert
- **Priorität**: HOCH
- **Beschreibung**: Zentrale Fehlerüberwachung

#### 4.6 TENANT CONTROL [0%]
- **Status**: 0% implementiert
- **Priorität**: MITTEL
- **Beschreibung**: Verwaltung aller Restaurant-Accounts

#### 4.7 REVENUE TRACKING (ERWEITERT) [0%]
- **Status**: 0% implementiert
- **Priorität**: HOCH
- **Beschreibung**: Detaillierte Finanzübersicht

#### 4.8 SYSTEM HEALTH [0%]
- **Status**: 0% implementiert
- **Priorität**: HOCH
- **Beschreibung**: 24/7 Monitoring aller Komponenten

---

## 📝 DETAILLIERTE FEATURE-BESCHREIBUNGEN

### 1. CUSTOMER FEATURES DETAILS

#### 1.1 QR-CODE SCANNER & TABLE ORDERING [0%]

**Detaillierte Beschreibung**:
Kunden scannen einen QR-Code am Tisch und werden direkt zur digitalen Speisekarte geleitet.

**User Flow**:
1. Kunde scannt QR-Code
2. Automatische Tisch-Zuordnung
3. Speisekarte öffnet sich
4. Session wird erstellt
5. Multi-Device Support

**Technische Features**:
- WebRTC QR-Scanner
- Fallback: Manuelle Code-Eingabe
- Session-Management
- Offline-Unterstützung
- PWA-Installation prompt

**UI/UX Anforderungen**:
- Scan in < 2 Sekunden
- Große Scan-Fläche
- Klare Anweisungen
- Error-Handling
- Accessibility

#### 1.2 DIGITAL MENU DISPLAY [0%]

**Detaillierte Beschreibung**:
Moderne, responsive Speisekarte mit Bildern, Beschreibungen und Filterfunktionen.

**Features**:
- **Kategorien**: Vorspeisen, Hauptgänge, Desserts, Getränke
- **Filter**: Vegetarisch, Vegan, Glutenfrei, Allergene
- **Suche**: Volltext-Suche
- **Sortierung**: Beliebtheit, Preis, Name
- **Details**: Zutaten, Nährwerte, Allergene

**Spezial-Features**:
- Mehrsprachigkeit (DE, FR, IT, EN)
- Tagesempfehlungen
- Nicht verfügbare Artikel
- Combo-Deals
- Happy Hour Preise

#### 1.3 SMART CART & CHECKOUT [0%]

**Detaillierte Beschreibung**:
Intelligenter Warenkorb mit Echtzeit-Updates und nahtlosem Checkout.

**Cart Features**:
- Artikel hinzufügen/entfernen
- Mengen anpassen
- Spezialwünsche
- Modifikatoren (Extra Käse, etc.)
- Preisberechnung in Echtzeit

**Checkout Flow**:
1. Warenkorb-Review
2. Lieferart wählen
3. Kontaktdaten
4. Zahlungsmethode
5. Bestellung abschicken

**Smart Features**:
- Mindestbestellwert
- Gutschein-Codes
- Trinkgeld-Option
- Bestellnotizen
- Favoriten speichern

#### 1.4 MULTI-PAYMENT SYSTEM [0%]

**Detaillierte Beschreibung**:
Flexible Zahlungsoptionen für alle Kundengruppen.

**Zahlungsmethoden**:
- **Kreditkarte**: Stripe Integration
- **Twint**: Schweizer Mobile Payment
- **PayPal**: Express Checkout
- **Bar**: Bei Abholung/Lieferung
- **Rechnung**: Für Firmenkunden

**Sicherheit**:
- PCI-DSS konform
- 3D Secure
- Tokenisierung
- SSL-Verschlüsselung
- Fraud Detection

#### 1.5 ORDER TRACKING [0%]

**Detaillierte Beschreibung**:
Echtzeit-Verfolgung vom Restaurant bis zum Kunden.

**Status-Updates**:
1. Bestellung eingegangen
2. Bestätigt
3. In Zubereitung
4. Fertig/Unterwegs
5. Geliefert/Abgeholt

**Features**:
- Push-Notifications
- SMS-Updates
- Geschätzte Wartezeit
- Live-Tracking bei Lieferung
- Fahrer-Kontakt

### 2. ADMIN FEATURES DETAILS

#### 2.1 DASHBOARD & ANALYTICS [0%]

**Detaillierte Beschreibung**:
Zentrale Übersicht aller wichtigen Geschäftskennzahlen in Echtzeit.

**Widgets**:
- Tagesumsatz
- Aktive Bestellungen
- Beliebte Produkte
- Kunden-Statistiken
- Performance-Metriken

**Charts**:
- Umsatz-Verlauf
- Bestell-Heatmap
- Produkt-Performance
- Kunden-Demografie
- Zahlungsmethoden-Split

#### 2.2 ORDER MANAGEMENT [0%]

**Detaillierte Beschreibung**:
Effiziente Verwaltung aller eingehenden Bestellungen.

**Funktionen**:
- **Order Queue**: Neue Bestellungen
- **Kitchen Display**: Für Küche
- **Status Updates**: Mit einem Klick
- **Order History**: Durchsuchbar
- **Batch Actions**: Mehrere auf einmal

**Kitchen Features**:
- Prep-Time Tracking
- Station Assignment
- Allergen Warnings
- Recipe Display
- Inventory Check

#### 2.3 MENU DESIGNER [0%]

**Detaillierte Beschreibung**:
Visueller Editor für Speisekarten-Gestaltung.

**Editor Features**:
- Drag & Drop
- Bulk Import (CSV/Excel)
- Bild-Upload
- Preis-Varianten
- Modifier-Gruppen

**Advanced**:
- Zeitbasierte Menüs
- A/B Testing
- Saison-Artikel
- Cross-Selling
- Bundle-Deals

#### 2.4 INVENTORY MANAGEMENT [0%]

**Detaillierte Beschreibung**:
Lagerverwaltung mit automatischen Warnungen und Bestellvorschlägen.

**Features**:
- **Bestandsverfolgung**: Echtzeit-Updates
- **Low-Stock Alerts**: Automatische Warnungen
- **Automatische Bestellung**: Bei Unterschreitung
- **Lieferanten-Verwaltung**: Kontakte und Preise
- **Inventur-Tools**: Mobile Zählung

**Reports**:
- Verbrauchsanalyse
- Kostenkontrolle
- Abfall-Tracking
- Lieferanten-Performance
- ROI-Berechnung

#### 2.5 STAFF MANAGEMENT [0%]

**Detaillierte Beschreibung**:
Mitarbeiterverwaltung mit Schichtplanung und Zugriffsrechten.

**Features**:
- **Mitarbeiter-Profile**: Rollen und Rechte
- **Schichtplanung**: Drag & Drop Kalender
- **Zeit-Erfassung**: Check-in/out
- **Performance-Tracking**: Umsatz pro MA
- **Schulungs-Module**: Onboarding

**Rollen-System**:
- Owner: Vollzugriff
- Manager: Verwaltung
- Chef: Küche + Produkte
- Waiter: Bestellungen
- Delivery: Lieferungen

### 3. PREMIUM FEATURES DETAILS

#### 3.1 AI-POWERED RECOMMENDATIONS [0%]

**Detaillierte Beschreibung**:
Maschinelles Lernen für personalisierte Produktvorschläge.

**AI-Features**:
- **Personalisierung**: Basierend auf Historie
- **Upselling**: Intelligente Zusatzvorschläge
- **Dynamic Pricing**: Nachfragebasiert
- **Trend-Vorhersage**: Saisonale Muster
- **Churn-Prevention**: Risiko-Kunden

**Algorithmen**:
- Collaborative Filtering
- Content-Based Filtering
- Neural Networks
- Predictive Analytics
- A/B Testing Engine

#### 3.2 LOYALTY PROGRAM [0%]

**Detaillierte Beschreibung**:
Umfassendes Treueprogramm mit Gamification-Elementen.

**Programm-Features**:
- **Punkte-System**: 1 CHF = 1 Punkt
- **Tier-System**: Bronze, Silber, Gold
- **Rewards**: Rabatte, Gratis-Produkte
- **Challenges**: Gamification
- **Referral-Bonus**: Freunde werben

**Benefits nach Tier**:
- **Bronze**: Newsletter, Geburtstags-Bonus
- **Silber**: 10% Rabatt, Gratis-Lieferung
- **Gold**: 15% Rabatt, Priority-Support, Exklusive Events

#### 3.3 ADVANCED ANALYTICS [0%]

**Detaillierte Beschreibung**:
Business Intelligence Dashboard mit Predictive Analytics.

**Analytics-Module**:
- **Sales Forecasting**: Umsatzprognosen
- **Customer Lifetime Value**: CLV-Berechnung
- **Cohort Analysis**: Kundengruppen
- **Heat Maps**: Bestell-Muster
- **Competitor Analysis**: Marktvergleich

**Export-Optionen**:
- PDF Reports
- Excel Dashboards
- API Access
- Scheduled Reports
- Real-time Alerts

#### 3.4 WHITE LABEL SOLUTION [0%]

**Detaillierte Beschreibung**:
Vollständiges eigenes Branding für Enterprise-Kunden.

**Customization**:
- **Domain**: eigene-domain.ch
- **Logo & Farben**: CI/CD konform
- **E-Mail Templates**: Eigenes Design
- **App Store**: Eigene App
- **Support**: Dedicated Account Manager

**Technische Features**:
- Multi-Domain Support
- Theme Builder
- CSS Override
- API White-Labeling
- Custom Analytics

### 4. SUPERADMIN FEATURES DETAILS

#### 4.1 TENANT CONTROL [0%]

**Detaillierte Beschreibung**:
Zentrale Verwaltung aller Restaurant-Accounts.

**Tenant-Verwaltung**:
- **Onboarding Wizard**: Schritt-für-Schritt
- **Plan Management**: Up/Downgrade
- **Feature Toggles**: Ein/Ausschalten
- **Usage Monitoring**: Limits überwachen
- **Support Tickets**: Direkte Hilfe

**Bulk-Operationen**:
- Massen-Updates
- Feature Rollouts
- Benachrichtigungen
- Daten-Export
- Migration Tools

##### 4.1.1 Tenant List [0%]
**Listen-Features**:
- Tabellarische Darstellung
- Status-Indikatoren (Aktiv/Pausiert/Gekündigt)
- Subscription-Level
- Letzter Login
- Umsatz-Indikator
- Quick Actions

**Such- und Filter**:
- Nach Name/ID
- Nach Subscription
- Nach Umsatz
- Nach Region
- Nach Aktivität
- Gespeicherte Filter

##### 4.1.2 Tenant Editor [0%]
**Editor-Bereiche**:
- Basis-Informationen
- Subscription & Billing
- Feature-Konfiguration
- Performance & Usage

#### 4.1.3 Feature Control [0%]
**Detaillierte Beschreibung**:
Granulare Feature-Verwaltung pro Tenant.

**Feature-Management**:

**Feature-Matrix**:
```
Feature             | Free | Pro | Enterprise |
--------------------|------|-----|------------|
Basis-Features      | ✓    | ✓   | ✓          |
Multi-Location      | ✗    | 3   | Unlimited  |
White-Label         | ✗    | ✗   | ✓          |
API-Zugang          | ✗    | ✓   | ✓          |
Custom Reports      | ✗    | ✓   | ✓          |
Priority Support    | ✗    | ✓   | ✓          |
```

**Toggle-System**:
- Ein/Aus pro Feature
- Zeitbasierte Aktivierung
- Soft-Launch (% der User)
- A/B Testing
- Rollback-Funktion

**Kommunikation**:
- In-App Ankündigungen
- E-Mail bei Änderungen
- Changelog-Integration
- Beta-Einladungen
- Feedback-Collection

#### 4.1.4 White Label Approval [0%]
**Detaillierte Beschreibung**:
Genehmigungsprozess für White-Label-Anfragen.

**Approval-Workflow**:

1. **Antrag**:
   - Tenant stellt Antrag
   - Design-Assets Upload
   - Domain-Wunsch
   - Business-Case

2. **Review**:
   - Markenrecht-Check
   - Design-Qualität
   - Technische Machbarkeit
   - Preiskalkulation

3. **Genehmigung**:
   - Bedingte Freigabe
   - Auflagen definieren
   - Timeline festlegen
   - Vertrag anpassen

4. **Implementation**:
   - Setup-Tracking
   - Support-Tickets
   - Go-Live Checkliste
   - Post-Launch Review

---

### 4.2 REVENUE TRACKING [0%]

#### 4.2.1 Revenue Dashboard [0%]
**Detaillierte Beschreibung**:
Umfassende Einnahmen-Übersicht für EATECH.

**Dashboard-Metriken**:

**Haupt-KPIs**:
- Tagesumsatz (Live)
- Monats-Provisionen
- Aktive zahlende Tenants
- Average Revenue per Tenant
- Wachstumsrate MoM
- Prognose Quartalsende

**Revenue-Streams**:
- Transaktions-Provisionen (3%)
- Subscription-Gebühren
- White-Label Fees
- API-Nutzung
- Premium-Support
- Marketing-Services

**Visualisierungen**:
- Revenue-Heatmap (nach Region)
- Tenant-Verteilung (Pareto)
- Zahlungsmethoden-Split
- Tageszeit-Analyse
- Wochentags-Patterns
- Saison-Trends

#### 4.2.2 Commission Report [0%]
**Detaillierte Beschreibung**:
Detaillierte Provisions-Berechnungen.

**Report-Features**:

**Provisions-Details**:
```
Tenant: Burger Palace AG
Periode: Januar 2025

Transaktionen: 4,521
Brutto-Umsatz: CHF 156,789.00
Provisions-Basis: CHF 145,632.00 (ohne Bar)
Commission (3%): CHF 4,368.96
Festival-Zuschlag: CHF 218.45
Total: CHF 4,587.41
```

**Breakdown-Optionen**:
- Nach Zahlungsart
- Nach Location
- Nach Tageszeit
- Nach Produkt-Kategorie
- Nach Kunden-Typ

**Export-Formate**:
- PDF (Buchhaltung)
- Excel (Analyse)
- CSV (Integration)
- API (Automatisierung)

#### 4.2.3 Payout Manager [0%]
**Detaillierte Beschreibung**:
Auszahlungs-Verwaltung an Tenants.

**Payout-System**:

**Auszahlungs-Rhythmus**:
- Täglich (Enterprise)
- Wöchentlich (Pro)
- Monatlich (Basic)
- Schwellwert-basiert

**Prozess**:
1. Automatische Berechnung
2. Review & Approval
3. Batch-Überweisung
4. Bestätigung & Beleg
5. Buchhaltungs-Export

**Sonder-Fälle**:
- Minus-Salden (Refunds)
- Verrechnung mit Gebühren
- Währungs-Konversion
- Steuer-Abzüge
- Mahnungen

#### 4.2.4 Invoice Generator [0%]
**Detaillierte Beschreibung**:
Automatische Rechnungserstellung.

**Rechnungs-Features**:

**Rechnungs-Typen**:
- Provisions-Abrechnung
- Subscription-Rechnung
- Einmal-Services
- Gutschriften
- Mahnungen

**Automatisierung**:
- Monatliche Generierung
- QR-Rechnung (Schweiz)
- E-Mail-Versand
- Portal-Upload
- Buchhaltungs-Sync

**Customization**:
- Tenant-Logo möglich
- Mehrsprachig
- Zahlungsziele
- Skonto-Optionen
- Anhänge

---

### 4.3 SYSTEM HEALTH [0%]

#### 4.3.1 System Monitoring [0%]
**Detaillierte Beschreibung**:
Echtzeit-Überwachung der System-Gesundheit.

**Monitoring-Bereiche**:

**Infrastructure**:
- Server-Auslastung
- Datenbank-Performance
- API-Response-Zeiten
- CDN-Hit-Rate
- Error-Rate
- Uptime-Statistik

**Business-Metriken**:
- Orders pro Minute
- Conversion-Rate
- Payment-Success-Rate
- User-Aktivität
- Feature-Adoption

**Alerts & Thresholds**:
- CPU > 80%
- Memory > 90%
- Response-Zeit > 2s
- Error-Rate > 1%
- Payment-Failures > 5%

#### 4.3.2 Performance Metrics [0%]
**Detaillierte Beschreibung**:
Detaillierte Performance-Analyse.

**Metrik-Kategorien**:

**Frontend-Performance**:
- Page Load Time
- Time to Interactive
- First Contentful Paint
- Cumulative Layout Shift
- Bundle-Größen

**Backend-Performance**:
- API-Latenz (P50, P95, P99)
- Database-Queries
- Cache-Hit-Rate
- Function-Execution-Time
- Memory-Usage

**Optimization-Vorschläge**:
- Slow Queries identifizieren
- Bundle-Splitting
- Caching-Strategien
- CDN-Optimierung
- Code-Hotspots

#### 4.3.3 Security Audit [0%]
**Detaillierte Beschreibung**:
Kontinuierliche Sicherheitsüberwachung.

**Security-Features**:

**Access-Monitoring**:
- Login-Attempts
- Failed Authentications
- Unusual Activities
- Permission-Änderungen
- API-Missbrauch

**Vulnerability-Scanning**:
- Dependency-Check
- OWASP-Compliance
- SSL-Zertifikate
- Security-Headers
- Input-Validation

**Compliance-Reports**:
- DSGVO/GDPR
- PCI-DSS (Payments)
- Swiss Data Protection
- Audit-Logs
- Data-Retention

#### 4.3.4 Backup Manager [0%]
**Detaillierte Beschreibung**:
Automatisiertes Backup-System.

**Backup-Strategie**:

**Backup-Schedule**:
- Realtime: Kritische Daten
- Stündlich: Transaktionen
- Täglich: Vollbackup
- Wöchentlich: Archiv
- Monatlich: Langzeit

**Backup-Typen**:
- Datenbank-Snapshots
- File-Storage
- Configuration
- Logs (30 Tage)
- User-Generated Content

**Recovery-Features**:
- Point-in-Time Recovery
- Selective Restore
- Cross-Region Backup
- Disaster Recovery Plan
- RTO: 1 Stunde

---

## 🔧 TECHNISCHE IMPLEMENTATION DETAILS

### 7.1 OFFLINE-FUNKTIONALITÄT

#### Progressive Web App (PWA)
**Implementierung**:
```javascript
// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('SW registered'))
    .catch(err => console.error('SW failed', err));
}

// Offline-First Strategie
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match('/offline.html'))
  );
});
```

#### IndexedDB für lokale Datenspeicherung
```javascript
// Datenbank-Schema
const DB_VERSION = 1;
const STORES = {
  orders: { keyPath: 'id', indexes: ['status', 'created'] },
  products: { keyPath: 'id', indexes: ['category', 'available'] },
  cart: { keyPath: 'id', indexes: ['sessionId'] },
  sync: { keyPath: 'id', indexes: ['type', 'status'] }
};

// Sync Manager
class OfflineSyncManager {
  async queueAction(action) {
    await db.sync.add({
      id: generateId(),
      action: action.type,
      data: action.data,
      timestamp: Date.now(),
      status: 'pending'
    });
  }
  
  async syncWithServer() {
    const pending = await db.sync.where('status').equals('pending').toArray();
    for (const item of pending) {
      try {
        await sendToServer(item);
        item.status = 'synced';
        await db.sync.put(item);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
}
```

### 7.2 REAL-TIME SYNCHRONISATION

#### Firebase Realtime Database Integration
```javascript
// Real-time Order Updates
const subscribeToOrders = (tenantId) => {
  const ordersRef = firebase.database().ref(`tenants/${tenantId}/orders`);
  
  ordersRef.on('child_added', (snapshot) => {
    const order = snapshot.val();
    updateLocalState('NEW_ORDER', order);
    showNotification('Neue Bestellung!', order);
  });
  
  ordersRef.on('child_changed', (snapshot) => {
    const order = snapshot.val();
    updateLocalState('UPDATE_ORDER', order);
  });
};

// Optimistic Updates
const updateOrderStatus = async (orderId, newStatus) => {
  // 1. Update UI immediately
  updateUI(orderId, newStatus);
  
  // 2. Update local storage
  await updateIndexedDB(orderId, { status: newStatus });
  
  // 3. Sync with Firebase
  try {
    await firebase.database()
      .ref(`orders/${orderId}/status`)
      .set(newStatus);
  } catch (error) {
    // Rollback on error
    rollbackUI(orderId);
    showError('Update fehlgeschlagen');
  }
};
```

### 7.3 PERFORMANCE OPTIMIERUNGEN

#### Code Splitting & Lazy Loading
```javascript
// Route-based Code Splitting
const routes = [
  {
    path: '/',
    component: () => import('./pages/Home')
  },
  {
    path: '/dashboard',
    component: () => import('./pages/Dashboard'),
    preload: true
  },
  {
    path: '/analytics',
    component: () => import('./pages/Analytics')
  }
];

// Component-level Splitting
const HeavyChart = lazy(() => 
  import(/* webpackChunkName: "charts" */ './components/HeavyChart')
);

// Preloading Critical Chunks
const preloadCriticalChunks = () => {
  const criticalChunks = ['dashboard', 'orders', 'products'];
  criticalChunks.forEach(chunk => {
    import(/* webpackChunkName: "[request]" */ `./chunks/${chunk}`);
  });
};
```

#### Image Optimization
```javascript
// Responsive Image Component
const OptimizedImage = ({ src, alt, sizes }) => {
  const [isInViewport, setIsInViewport] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInViewport(entry.isIntersecting),
      { rootMargin: '50px' }
    );
    
    observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`${src}?w=400 400w, ${src}?w=800 800w`}
        sizes={sizes}
      />
      <img
        ref={imageRef}
        src={isInViewport ? src : placeholder}
        alt={alt}
        loading="lazy"
      />
    </picture>
  );
};
```

### 7.4 DATABASE OPTIMIERUNGEN

#### Firebase Query Optimization
```javascript
// Pagination with Cursors
const loadOrders = async (tenantId, lastOrderId = null, limit = 20) => {
  let query = firebase.database()
    .ref(`tenants/${tenantId}/orders`)
    .orderByChild('created')
    .limitToLast(limit);
    
  if (lastOrderId) {
    query = query.endAt(lastOrderId);
  }
  
  const snapshot = await query.once('value');
  return snapshot.val();
};

// Denormalization for Performance
const orderWithDetails = {
  // Core order data
  id: 'order-123',
  status: 'pending',
  total: 45.90,
  
  // Denormalized customer data (no JOIN needed)
  customerName: 'Max Mustermann',
  customerPhone: '+41 79 123 45 67',
  
  // Denormalized product names (no JOIN needed)
  itemNames: ['Burger Deluxe', 'Pommes', 'Cola']
};

// Compound Indexes
const dbIndexes = {
  orders: {
    compound: [
      ['tenantId', 'status', 'created'],
      ['tenantId', 'customerId', 'created']
    ]
  }
};
```

### 7.5 SECURITY IMPLEMENTATION

#### Authentication & Authorization
```javascript
// Multi-Factor Authentication
const enableMFA = async (userId) => {
  const secret = speakeasy.generateSecret({
    name: `EATECH (${userEmail})`
  });
  
  await saveUserSecret(userId, secret.base32);
  
  return {
    qrCode: await QRCode.toDataURL(secret.otpauth_url),
    backupCodes: generateBackupCodes()
  };
};

// Role-Based Access Control (RBAC)
const permissions = {
  owner: ['*'],
  admin: ['orders.*', 'products.*', 'customers.*', 'analytics.view'],
  manager: ['orders.*', 'products.view', 'analytics.view'],
  chef: ['orders.view', 'orders.update', 'products.view'],
  waiter: ['orders.create', 'orders.view', 'customers.view']
};

// API Rate Limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### Data Encryption
```javascript
// Encrypt Sensitive Data
const encryptData = (data, key) => {
  const cipher = crypto.createCipher('aes-256-gcm', key);
  const encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  return encrypted + cipher.final('hex');
};

// Secure Payment Token Storage
const storePaymentMethod = async (customerId, paymentMethod) => {
  // Never store raw card data
  const tokenized = await stripe.tokens.create({
    card: paymentMethod
  });
  
  await db.customers.update(customerId, {
    paymentTokens: {
      [tokenized.id]: {
        last4: tokenized.card.last4,
        brand: tokenized.card.brand,
        exp: `${tokenized.card.exp_month}/${tokenized.card.exp_year}`
      }
    }
  });
};
```

---

## 🧪 TESTING-STRATEGIE

### 8.1 UNIT TESTS

#### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

#### Test Examples
```javascript
// Cart Calculation Tests
describe('Cart Store', () => {
  let cart;
  
  beforeEach(() => {
    cart = new CartStore();
  });
  
  test('calculates subtotal correctly', () => {
    cart.addItem({ id: '1', price: 10.00, quantity: 2 });
    cart.addItem({ id: '2', price: 5.50, quantity: 1 });
    
    expect(cart.getSubtotal()).toBe(25.50);
  });
  
  test('applies commission correctly', () => {
    cart.addItem({ id: '1', price: 100.00, quantity: 1 });
    
    expect(cart.getCommission()).toBe(3.00); // 3%
    expect(cart.getTenantPayout()).toBe(97.00);
  });
  
  test('handles discounts properly', () => {
    cart.addItem({ id: '1', price: 50.00, quantity: 1 });
    cart.applyDiscount({ type: 'percentage', value: 10 });
    
    expect(cart.getSubtotal()).toBe(45.00);
  });
});

// Component Tests
describe('OrderCard Component', () => {
  test('displays order information correctly', () => {
    const order = {
      id: '123',
      number: '2025-001',
      status: 'pending',
      total: 45.90,
      customer: { name: 'Test User' }
    };
    
    render(<OrderCard order={order} />);
    
    expect(screen.getByText('2025-001')).toBeInTheDocument();
    expect(screen.getByText('CHF 45.90')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
  
  test('updates status on button click', async () => {
    const onStatusChange = jest.fn();
    render(<OrderCard order={mockOrder} onStatusChange={onStatusChange} />);
    
    fireEvent.click(screen.getByText('Bestätigen'));
    
    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('123', 'confirmed');
    });
  });
});
```

### 8.2 INTEGRATION TESTS

```javascript
// API Integration Tests
describe('Order API Integration', () => {
  test('creates order successfully', async () => {
    const orderData = {
      items: [{ productId: '1', quantity: 2 }],
      customer: { name: 'Test', phone: '+41791234567' }
    };
    
    const response = await request(app)
      .post('/api/orders')
      .send(orderData)
      .expect(201);
      
    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'pending',
      total: expect.any(Number)
    });
  });
  
  test('validates order data', async () => {
    const invalidOrder = { items: [] };
    
    const response = await request(app)
      .post('/api/orders')
      .send(invalidOrder)
      .expect(400);
      
    expect(response.body.error).toBe('Order must contain items');
  });
});

// Database Integration Tests
describe('Firebase Integration', () => {
  test('syncs data correctly', async () => {
    const testData = { name: 'Test Product', price: 10.00 };
    
    // Write to Firebase
    await firebase.database()
      .ref('test/products/test-1')
      .set(testData);
    
    // Read back
    const snapshot = await firebase.database()
      .ref('test/products/test-1')
      .once('value');
      
    expect(snapshot.val()).toEqual(testData);
  });
});
```

### 8.3 E2E TESTS

#### Cypress Configuration
```javascript
// cypress.config.js
module.exports = {
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
};
```

#### E2E Test Scenarios
```javascript
// Customer Journey E2E Test
describe('Complete Order Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
  });
  
  it('completes order from QR scan to confirmation', () => {
    // 1. Scan QR Code
    cy.visit('/scan?table=5');
    cy.contains('Tisch 5').should('be.visible');
    
    // 2. Browse Menu
    cy.contains('Speisekarte').click();
    cy.get('[data-category="main"]').click();
    
    // 3. Add Items to Cart
    cy.contains('Burger Deluxe').click();
    cy.get('[data-test="add-to-cart"]').click();
    cy.contains('Zum Warenkorb').click();
    
    // 4. Checkout
    cy.get('[data-test="checkout"]').click();
    cy.get('input[name="name"]').type('Test User');
    cy.get('input[name="phone"]').type('+41791234567');
    
    // 5. Payment
    cy.get('[data-test="payment-card"]').click();
    cy.fillStripeCard('4242424242424242');
    
    // 6. Confirm Order
    cy.get('[data-test="place-order"]').click();
    cy.contains('Bestellung erfolgreich').should('be.visible');
    cy.contains('Ihre Bestellnummer:').should('be.visible');
  });
  
  it('handles offline scenario', () => {
    // Go offline
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(false);
    });
    
    // Should show offline indicator
    cy.contains('Offline-Modus').should('be.visible');
    
    // Can still browse menu
    cy.contains('Speisekarte').click();
    cy.contains('Burger Deluxe').should('be.visible');
    
    // Cart works offline
    cy.contains('Burger Deluxe').click();
    cy.get('[data-test="add-to-cart"]').click();
    cy.contains('1 Artikel im Warenkorb').should('be.visible');
  });
});

// Admin Dashboard E2E
describe('Admin Dashboard', () => {
  beforeEach(() => {
    cy.login('admin@restaurant.ch', 'password');
    cy.visit('/admin/dashboard');
  });
  
  it('manages orders', () => {
    // View orders
    cy.contains('Bestellungen').click();
    cy.get('[data-test="order-list"]').should('be.visible');
    
    // Update order status
    cy.get('[data-test="order-123"]').click();
    cy.contains('Status ändern').click();
    cy.contains('In Zubereitung').click();
    
    // Verify update
    cy.contains('Status aktualisiert').should('be.visible');
    cy.get('[data-test="order-status"]').should('contain', 'In Zubereitung');
  });
  
  it('updates product availability', () => {
    cy.contains('Produkte').click();
    cy.contains('Burger Deluxe').click();
    
    // Toggle availability
    cy.get('[data-test="availability-toggle"]').click();
    cy.contains('Produkt nicht verfügbar').should('be.visible');
    
    // Verify in customer view
    cy.visit('/menu');
    cy.contains('Burger Deluxe').should('have.class', 'unavailable');
  });
});
```

### 8.4 PERFORMANCE TESTS

```javascript
// Lighthouse CI Configuration
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/menu',
        'http://localhost:3000/checkout'
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 1
        }
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'interactive': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};

// Load Testing with K6
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function() {
  // Browse menu
  let menuRes = http.get('https://api.eatech.ch/menu');
  check(menuRes, {
    'menu loaded': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
  
  // Create order
  let orderRes = http.post('https://api.eatech.ch/orders', JSON.stringify({
    items: [{ productId: '1', quantity: 1 }],
    customer: { name: 'Load Test', phone: '+41791234567' }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(orderRes, {
    'order created': (r) => r.status === 201,
  });
  
  sleep(2);
}
```

### 8.5 SECURITY TESTS

```javascript
// OWASP ZAP Security Tests
describe('Security Tests', () => {
  test('prevents SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE orders; --";
    
    const response = await request(app)
      .get(`/api/orders?search=${maliciousInput}`)
      .expect(200);
      
    // Should sanitize input and not cause errors
    expect(response.body).toBeInstanceOf(Array);
  });
  
  test('validates authentication', async () => {
    // Without token
    await request(app)
      .get('/api/admin/users')
      .expect(401);
      
    // With invalid token
    await request(app)
      .get('/api/admin/users')
      .set('Authorization', 'Bearer invalid-token')
      .expect(403);
  });
  
  test('rate limits requests', async () => {
    // Make 101 requests (limit is 100)
    const requests = Array(101).fill().map(() => 
      request(app).get('/api/menu')
    );
    
    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);
    
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
  
  test('sanitizes user input', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    
    const response = await request(app)
      .post('/api/products')
      .send({ name: xssPayload, price: 10 })
      .expect(201);
      
    // Should escape HTML
    expect(response.body.name).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
  });
});

// Penetration Testing Checklist
const securityChecklist = {
  authentication: [
    'Password complexity enforced',
    'Account lockout after failed attempts',
    'Session timeout implemented',
    'Secure password reset flow'
  ],
  authorization: [
    'Role-based access control',
    'API endpoint authorization',
    'Resource-level permissions',
    'Tenant isolation verified'
  ],
  dataProtection: [
    'HTTPS enforced',
    'Sensitive data encrypted',
    'PII data anonymization',
    'Secure backup procedures'
  ],
  inputValidation: [
    'XSS prevention',
    'SQL injection prevention',
    'File upload validation',
    'API input sanitization'
  ]
};
```

---

## 📱 MOBILE APP SPECIFICS

### 9.1 REACT NATIVE IMPLEMENTATION

#### Project Setup
```javascript
// React Native Configuration
{
  "name": "@eatech/mobile",
  "version": "25.0.0",
  "dependencies": {
    "react-native": "0.79.0",
    "react-navigation": "^6.0.0",
    "react-native-firebase": "^21.0.0",
    "react-native-push-notification": "^8.0.0",
    "react-native-vector-icons": "^10.0.0",
    "react-native-gesture-handler": "^2.20.0",
    "react-native-reanimated": "^3.16.0",
    "react-native-offline": "^6.0.2"
  }
}
```

#### Core Components
```javascript
// Main App Component
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import NetInfo from '@react-native-community/netinfo';

import { store, persistor } from './store';
import AppNavigator from './navigation/AppNavigator';
import { OfflineNotice } from './components/OfflineNotice';

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NavigationContainer>
          <OfflineNotice />
          <AppNavigator />
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
}

// Offline-First Architecture
import { NetworkConsumer } from 'react-native-offline';

export const OfflineAwareComponent = ({ children }) => {
  return (
    <NetworkConsumer>
      {({ isConnected }) => (
        <>
          {!isConnected && <OfflineBanner />}
          {React.cloneElement(children, { isConnected })}
        </>
      )}
    </NetworkConsumer>
  );
};
```

### 9.2 iOS SPECIFICS

#### iOS Configuration
```swift
// Info.plist Configuration
<key>NSCameraUsageDescription</key>
<string>EATECH benötigt Kamera-Zugriff für QR-Code Scanning</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>EATECH nutzt Ihren Standort für Lieferungen</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>EATECH benötigt Zugriff für Produkt-Fotos</string>

// Push Notifications
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
  <string>fetch</string>
  <string>processing</string>
</array>
```

#### iOS-Specific Features
```javascript
// Apple Pay Integration
import { ApplePay } from 'react-native-payments';

const payWithApplePay = async (amount) => {
  const paymentRequest = {
    merchantIdentifier: 'merchant.ch.eatech',
    supportedNetworks: ['visa', 'mastercard', 'amex'],
    countryCode: 'CH',
    currencyCode: 'CHF',
    paymentSummaryItems: [{
      label: 'EATECH Order',
      amount: amount.toString()
    }]
  };
  
  try {
    const paymentResponse = await ApplePay.show(paymentRequest);
    return processPayment(paymentResponse);
  } catch (error) {
    console.error('Apple Pay failed:', error);
  }
};

// iOS Widgets
import WidgetKit from 'react-native-widgetkit';

WidgetKit.setItem('todayRevenue', revenue, 'group.eatech.widgets');
WidgetKit.reloadAllTimelines();
```

### 9.3 ANDROID SPECIFICS

#### Android Configuration
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<!-- Deep Linking -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="eatech"
        android:host="order" />
</intent-filter>
```

#### Android-Specific Features
```javascript
// Google Pay Integration
import { GooglePay } from 'react-native-google-pay';

const payWithGooglePay = async (amount) => {
  const requestData = {
    cardPaymentMethod: {
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        gateway: 'stripe',
        gatewayMerchantId: 'BCR2DN6T7O3Z5TUA'
      },
      allowedCardNetworks: ['VISA', 'MASTERCARD'],
      allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS']
    },
    transaction: {
      totalPrice: amount.toString(),
      totalPriceStatus: 'FINAL',
      currencyCode: 'CHF'
    },
    merchantName: 'EATECH'
  };
  
  try {
    await GooglePay.setEnvironment(GooglePay.ENVIRONMENT_PRODUCTION);
    await GooglePay.isReadyToPay(['CARD', 'TOKENIZED_CARD']);
    const token = await GooglePay.requestPayment(requestData);
    return processPayment(token);
  } catch (error) {
    console.error('Google Pay failed:', error);
  }
};

// Android App Shortcuts
import { AppShortcuts } from 'react-native-app-shortcuts';

AppShortcuts.setShortcuts([
  {
    id: 'new_order',
    title: 'Neue Bestellung',
    subtitle: 'Bestellung erfassen',
    icon: 'ic_order',
    data: { route: 'NewOrder' }
  },
  {
    id: 'revenue',
    title: 'Umsatz heute',
    subtitle: 'Tagesumsatz anzeigen',
    icon: 'ic_revenue',
    data: { route: 'Revenue' }
  }
]);
```

---

## 🌍 INTERNATIONALISIERUNG

### i18n Setup
```javascript
// i18n Configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import de from './locales/de-CH.json';
import fr from './locales/fr-CH.json';
import it from './locales/it-CH.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'de-CH': { translation: de },
      'fr-CH': { translation: fr },
      'it-CH': { translation: it },
      'en': { translation: en }
    },
    fallbackLng: 'de-CH',
    interpolation: {
      escapeValue: false,
      format: (value, format, lng) => {
        if (format === 'currency') {
          return new Intl.NumberFormat(lng, {
            style: 'currency',
            currency: 'CHF'
          }).format(value);
        }
        if (format === 'date') {
          return new Intl.DateTimeFormat(lng).format(value);
        }
        return value;
      }
    }
  });
```

### Translation Files
```json
// locales/de-CH.json
{
  "common": {
    "welcome": "Willkommen bei EATECH",
    "loading": "Wird geladen...",
    "error": "Ein Fehler ist aufgetreten",
    "retry": "Erneut versuchen",
    "cancel": "Abbrechen",
    "save": "Speichern",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "search": "Suchen",
    "filter": "Filtern",
    "sort": "Sortieren"
  },
  "menu": {
    "title": "Speisekarte",
    "categories": {
      "starters": "Vorspeisen",
      "mains": "Hauptgerichte",
      "desserts": "Desserts",
      "beverages": "Getränke"
    },
    "filters": {
      "vegetarian": "Vegetarisch",
      "vegan": "Vegan",
      "glutenFree": "Glutenfrei"
    },
    "addToCart": "In den Warenkorb"
  },
  "cart": {
    "title": "Warenkorb",
    "empty": "Ihr Warenkorb ist leer",
    "subtotal": "Zwischensumme",
    "delivery": "Liefergebühr",
    "total": "Gesamt",
    "checkout": "Zur Kasse"
  },
  "order": {
    "status": {
      "pending": "Ausstehend",
      "confirmed": "Bestätigt",
      "preparing": "In Zubereitung",
      "ready": "Bereit",
      "delivered": "Geliefert"
    },
    "type": {
      "dineIn": "Vor Ort",
      "takeaway": "Zum Mitnehmen",
      "delivery": "Lieferung"
    }
  }
}

// locales/fr-CH.json
{
  "common": {
    "welcome": "Bienvenue chez EATECH",
    "loading": "Chargement...",
    "error": "Une erreur s'est produite",
    "retry": "Réessayer",
    "cancel": "Annuler",
    "save": "Enregistrer",
    "delete": "Supprimer",
    "edit": "Modifier",
    "search": "Rechercher",
    "filter": "Filtrer",
    "sort": "Trier"
  },
  "menu": {
    "title": "Menu",
    "categories": {
      "starters": "Entrées",
      "mains": "Plats principaux",
      "desserts": "Desserts",
      "beverages": "Boissons"
    }
  }
}
```

### Multi-Currency Support
```javascript
// Currency Configuration
const CURRENCIES = {
  CHF: { symbol: 'CHF', decimals: 2, locale: 'de-CH' },
  EUR: { symbol: '€', decimals: 2, locale: 'de-DE' },
  USD: { symbol: '$', decimals: 2, locale: 'en-US' }
};

// Dynamic Currency Formatting
const formatPrice = (amount, currency = 'CHF') => {
  const config = CURRENCIES[currency];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  }).format(amount);
};

// Currency Conversion
const convertCurrency = async (amount, from, to) => {
  if (from === to) return amount;
  
  const rate = await getExchangeRate(from, to);
  return amount * rate;
};
```

---

## 🚀 DEPLOYMENT & DEVOPS

### 11.1 CI/CD PIPELINE

#### GitHub Actions Configuration
```yaml
# .github/workflows/deploy.yml
name: Deploy EATECH

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18.x'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
  
  build:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [web, admin, mobile]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build ${{ matrix.app }}
        run: |
          cd apps/${{ matrix.app }}
          npm ci
          npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.app }}-build
          path: apps/${{ matrix.app }}/dist
  
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy to Staging
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_KEY }}
          script: |
            cd /var/www/eatech-staging
            git pull origin develop
            npm ci
            npm run build
            pm2 restart eatech-staging
  
  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Deploy to Production
        run: |
          # Deploy to multiple regions
          for region in zurich frankfurt london; do
            echo "Deploying to $region"
            # Deployment commands
          done
```

#### Docker Configuration
```dockerfile
# Dockerfile for Admin App
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY lerna.json ./
COPY apps/admin/package*.json ./apps/admin/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build admin app
RUN npm run build:admin

# Production image
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 11.2 MONITORING & LOGGING

#### Monitoring Setup
```javascript
// Sentry Error Tracking
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    })
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  }
});

// Custom Error Boundary
export class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    Sentry.withScope((scope) => {
      scope.setExtras(errorInfo);
      Sentry.captureException(error);
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

#### Logging Architecture
```javascript
// Centralized Logging Service
class LoggingService {
  constructor() {
    this.queue = [];
    this.batchSize = 50;
    this.flushInterval = 5000;
    
    this.startBatchProcess();
  }
  
  log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta: {
        ...meta,
        userId: getCurrentUserId(),
        tenantId: getCurrentTenantId(),
        sessionId: getSessionId(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };
    
    this.queue.push(logEntry);
    
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }
  
  async flush() {
    if (this.queue.length === 0) return;
    
    const logs = [...this.queue];
    this.queue = [];
    
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      });
    } catch (error) {
      // Re-queue on failure
      this.queue.unshift(...logs);
    }
  }
  
  startBatchProcess() {
    setInterval(() => this.flush(), this.flushInterval);
  }
}

// Performance Monitoring
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      logger.info('Page Load Performance', {
        dns: entry.domainLookupEnd - entry.domainLookupStart,
        tcp: entry.connectEnd - entry.connectStart,
        ttfb: entry.responseStart - entry.requestStart,
        download: entry.responseEnd - entry.responseStart,
        domComplete: entry.domComplete,
        loadComplete: entry.loadEventEnd - entry.loadEventStart
      });
    }
  }
});

performanceObserver.observe({ entryTypes: ['navigation'] });
```

### 11.3 BACKUP & DISASTER RECOVERY

#### Backup Strategy
```javascript
// Automated Backup System
const backupConfig = {
  schedule: {
    full: '0 2 * * 0',     // Weekly full backup, Sunday 2 AM
    incremental: '0 2 * * *', // Daily incremental
    transaction: '*/15 * * * *' // Every 15 minutes
  },
  retention: {
    daily: 7,
    weekly: 4,
    monthly: 12,
    yearly: 2
  },
  locations: [
    's3://eatech-backups-primary/zurich/',
    's3://eatech-backups-secondary/frankfurt/',
    'gs://eatech-backups-tertiary/london/'
  ]
};

// Backup Script
const performBackup = async (type = 'incremental') => {
  const timestamp = new Date().toISOString();
  const backupId = `backup-${type}-${timestamp}`;
  
  try {
    // 1. Create database snapshot
    const snapshot = await firebase.database().ref('/').once('value');
    
    // 2. Compress data
    const compressed = await compressData(snapshot.val());
    
    // 3. Encrypt backup
    const encrypted = await encryptBackup(compressed, process.env.BACKUP_KEY);
    
    // 4. Upload to multiple locations
    const uploads = backupConfig.locations.map(location =>
      uploadToStorage(location, backupId, encrypted)
    );
    
    await Promise.all(uploads);
    
    // 5. Verify backup integrity
    await verifyBackup(backupId);
    
    // 6. Update backup registry
    await updateBackupRegistry({
      id: backupId,
      type,
      size: encrypted.length,
      timestamp,
      verified: true
    });
    
  } catch (error) {
    await notifyOps('Backup Failed', { error, backupId });
    throw error;
  }
};
```

#### Disaster Recovery Plan
```javascript
// Recovery Procedures
const disasterRecovery = {
  // RTO: Recovery Time Objective = 1 hour
  // RPO: Recovery Point Objective = 15 minutes
  
  procedures: {
    dataCorruption: async () => {
      // 1. Identify corruption point
      const corruptionTime = await identifyCorruptionTimestamp();
      
      // 2. Find last good backup
      const backup = await findBackupBefore(corruptionTime);
      
      // 3. Restore from backup
      await restoreFromBackup(backup.id);
      
      // 4. Replay transactions
      await replayTransactions(backup.timestamp, corruptionTime);
      
      // 5. Verify data integrity
      await verifyDataIntegrity();
    },
    
    regionFailure: async (failedRegion) => {
      // 1. Update DNS to secondary region
      await updateDNS(failedRegion, 'secondary');
      
      // 2. Activate standby instances
      await activateStandbyInstances();
      
      // 3. Sync recent data
      await syncRecentData();
      
      // 4. Notify users
      await notifyUsersOfFailover();
    }
  },
  
  testing: {
    schedule: 'monthly',
    scenarios: [
      'database-corruption',
      'region-failure',
      'mass-deletion',
      'ransomware-attack'
    ]
  }
};
```

---

## 📘 BEST PRACTICES & GUIDELINES

### 12.1 CODE STYLE GUIDE

#### JavaScript/React Standards
```javascript
// Component Structure
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

// Hooks imports
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';

// Component imports
import { Button } from '@/components/common';
import { LoadingSpinner } from '@/components/feedback';

// Styles
import styles from './ComponentName.module.css';

/**
 * ComponentName - Brief description
 * @param {Object} props - Component props
 * @param {string} props.title - Title to display
 * @param {Function} props.onAction - Callback for action
 * @returns {React.Component} Rendered component
 */
export const ComponentName = ({ title, onAction }) => {
  // Hooks
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Computed values
  const computedValue = useMemo(() => {
    return expensiveCalculation(title);
  }, [title]);
  
  // Effects
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, [dependency]);
  
  // Handlers
  const handleAction = async () => {
    try {
      setLoading(true);
      await onAction();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Render
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className={styles.container}>
      <h2>{title}</h2>
      <Button onClick={handleAction}>
        {t('common.action')}
      </Button>
    </div>
  );
};

ComponentName.propTypes = {
  title: PropTypes.string.isRequired,
  onAction: PropTypes.func.isRequired
};

ComponentName.defaultProps = {
  title: 'Default Title'
};
```

#### Naming Conventions
```javascript
// Files and Folders
ComponentName.jsx       // React components (PascalCase)
useCustomHook.js       // Custom hooks (camelCase with 'use' prefix)
userService.js         // Services (camelCase)
API_CONSTANTS.js       // Constants (UPPER_SNAKE_CASE)
helper-functions.js    // Utilities (kebab-case)

// Variables and Functions
const userId = '123';                    // camelCase
const MAX_RETRY_COUNT = 3;              // UPPER_SNAKE_CASE for constants
const calculateTotalPrice = () => {};    // camelCase for functions
const UserProfile = () => {};           // PascalCase for components

// CSS Classes
.container { }          // camelCase
.button-primary { }     // kebab-case for modifiers
.is-active { }         // State classes with 'is-' prefix
.has-error { }         // State classes with 'has-' prefix
```

### 12.2 ACCESSIBILITY GUIDELINES

#### WCAG 2.1 AA Compliance
```javascript
// Accessible Component Example
export const AccessibleForm = () => {
  const [errors, setErrors] = useState({});
  
  return (
    <form role="form" aria-label="Bestellformular">
      {/* Accessible Input */}
      <div className="form-group">
        <label htmlFor="customer-name">
          Name
          <span aria-label="erforderlich" className="required">*</span>
        </label>
        <input
          id="customer-name"
          type="text"
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : null}
        />
        {errors.name && (
          <span id="name-error" role="alert" className="error">
            {errors.name}
          </span>
        )}
      </div>
      
      {/* Accessible Button */}
      <button
        type="submit"
        aria-busy={loading}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="sr-only">Wird verarbeitet</span>
            <LoadingSpinner aria-hidden="true" />
          </>
        ) : (
          'Bestellung abschicken'
        )}
      </button>
    </form>
  );
};

// Keyboard Navigation
export const KeyboardNavigableMenu = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectItem(selectedIndex);
        break;
      case 'Escape':
        closeMenu();
        break;
    }
  };
  
  return (
    <ul
      role="menu"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-activedescendant={`menu-item-${selectedIndex}`}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          id={`menu-item-${index}`}
          role="menuitem"
          tabIndex={-1}
          aria-selected={index === selectedIndex}
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
};
```

#### Screen Reader Support
```javascript
// Live Regions for Dynamic Content
export const OrderStatus = ({ status }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">Bestellstatus:</span>
      {status}
    </div>
  );
};

// Skip Links
export const SkipLinks = () => {
  return (
    <nav className="skip-links" aria-label="Schnellnavigation">
      <a href="#main" className="skip-link">
        Zum Hauptinhalt springen
      </a>
      <a href="#nav" className="skip-link">
        Zur Navigation springen
      </a>
      <a href="#search" className="skip-link">
        Zur Suche springen
      </a>
    </nav>
  );
};
```

### 12.3 PERFORMANCE CHECKLIST

#### Performance Optimization Techniques
```javascript
// 1. Code Splitting
const AdminDashboard = lazy(() =>
  import(/* webpackChunkName: "admin-dashboard" */ './AdminDashboard')
);

// 2. Memoization
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => 
    processComplexData(data), [data]
  );
  
  return <DataVisualization data={processedData} />;
});

// 3. Virtual Scrolling for Large Lists
import { VariableSizeList as List } from 'react-window';

const VirtualizedOrderList = ({ orders }) => {
  const getItemSize = (index) => {
    // Return different heights based on order complexity
    return orders[index].items.length * 50 + 100;
  };
  
  return (
    <List
      height={600}
      itemCount={orders.length}
      itemSize={getItemSize}
      width="100%"
    >
      {({ index, style }) => (
        <OrderCard
          order={orders[index]}
          style={style}
        />
      )}
    </List>
  );
};

// 4. Image Optimization
const OptimizedImage = ({ src, alt, priority = false }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      srcSet={`
        ${src}?w=1200 1200w
      `}
      sizes="(max-width: 400px) 400px,
             (max-width: 800px) 800px,
             1200px"
    />
  );
};

// 5. Debouncing & Throttling
const SearchInput = () => {
  const [query, setQuery] = useState('');
  
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      performSearch(value);
    }, 300),
    []
  );
  
  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };
  
  return (
    <input
      type="search"
      value={query}
      onChange={handleChange}
      placeholder="Suchen..."
    />
  );
};
```

#### Performance Monitoring
```javascript
// Web Vitals Tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const reportWebVitals = (metric) => {
  // Send to analytics
  analytics.track('Web Vitals', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id
  });
  
  // Log poor performance
  if (metric.rating === 'poor') {
    console.warn(`Poor ${metric.name} performance:`, metric.value);
  }
};

getCLS(reportWebVitals);
getFID(reportWebVitals);
getFCP(reportWebVitals);
getLCP(reportWebVitals);
getTTFB(reportWebVitals);

// Custom Performance Marks
performance.mark('app-init-start');

// ... initialization code ...

performance.mark('app-init-end');
performance.measure(
  'app-initialization',
  'app-init-start',
  'app-init-end'
);
```

---

## 📡 API DOKUMENTATION

### RESTful API Endpoints

#### Authentication
```javascript
// POST /api/auth/login
// Login with email and password
{
  request: {
    email: "admin@restaurant.ch",
    password: "securePassword123"
  },
  response: {
    token: "eyJhbGciOiJIUzI1NiIs...",
    user: {
      id: "user-123",
      email: "admin@restaurant.ch",
      role: "admin",
      tenantId: "tenant-456"
    },
    expiresIn: 3600
  }
}

// POST /api/auth/refresh
// Refresh access token
{
  request: {
    refreshToken: "refresh-token-here"
  },
  response: {
    token: "new-access-token",
    expiresIn: 3600
  }
}

// POST /api/auth/logout
// Logout and invalidate tokens
{
  response: {
    success: true,
    message: "Logged out successfully"
  }
}
```

#### Orders API
```javascript
// GET /api/orders
// List orders with filters
// Query params: status, type, from, to, limit, offset
{
  response: {
    orders: [{
      id: "order-123",
      number: "2025-0001",
      status: "pending",
      type: "delivery",
      customer: {
        name: "Max Mustermann",
        phone: "+41791234567"
      },
      items: [{
        productId: "prod-1",
        name: "Burger Deluxe",
        quantity: 2,
        price: 15.90,
        modifiers: []
      }],
      total: 31.80,
      createdAt: "2025-01-07T10:30:00Z"
    }],
    pagination: {
      total: 150,
      limit: 20,
      offset: 0,
      hasMore: true
    }
  }
}

// POST /api/orders
// Create new order
{
  request: {
    type: "delivery",
    customer: {
      name: "Max Mustermann",
      phone: "+41791234567",
      email: "max@example.com",
      address: {
        street: "Bahnhofstrasse 1",
        zip: "8001",
        city: "Zürich"
      }
    },
    items: [{
      productId: "prod-1",
      quantity: 2,
      modifiers: ["extra-cheese"],
      notes: "Ohne Zwiebeln"
    }],
    paymentMethod: "card",
    deliveryTime: "2025-01-07T12:00:00Z"
  },
  response: {
    orderId: "order-789",
    orderNumber: "2025-0002",
    status: "pending",
    total: 36.80,
    estimatedTime: "2025-01-07T12:00:00Z",
    paymentUrl: "https://pay.stripe.com/..."
  }
}

// PATCH /api/orders/:orderId/status
// Update order status
{
  request: {
    status: "confirmed",
    estimatedTime: "2025-01-07T12:15:00Z"
  },
  response: {
    success: true,
    order: {
      id: "order-789",
      status: "confirmed",
      estimatedTime: "2025-01-07T12:15:00Z"
    }
  }
}
```

#### Products API
```javascript
// GET /api/products
// List products with filters
// Query params: category, available, search, sort
{
  response: {
    products: [{
      id: "prod-1",
      name: "Burger Deluxe",
      description: "Saftiger Rindfleisch-Burger",
      price: 15.90,
      category: "main",
      imageUrl: "https://cdn.eatech.ch/products/burger-deluxe.jpg",
      available: true,
      variants: [{
        name: "Klein",
        price: 12.90
      }, {
        name: "XXL",
        price: 19.90
      }],
      modifiers: [{
        group: "Extras",
        options: [{
          id: "extra-cheese",
          name: "Extra Käse",
          price: 2.50
        }]
      }],
      allergens: ["gluten", "milk"],
      nutritionalInfo: {
        calories: 650,
        protein: 35
      }
    }]
  }
}

// POST /api/products
// Create new product (Admin only)
{
  request: {
    name: "Neue Pizza",
    description: "Leckere Pizza mit frischen Zutaten",
    price: 18.90,
    category: "main",
    ingredients: ["Teig", "Tomatensauce", "Mozzarella"],
    allergens: ["gluten", "milk"],
    preparationTime: 20
  },
  response: {
    id: "prod-new-1",
    name: "Neue Pizza",
    createdAt: "2025-01-07T11:00:00Z"
  }
}

// PATCH /api/products/:productId
// Update product
{
  request: {
    available: false,
    price: 19.90
  },
  response: {
    success: true,
    product: {
      id: "prod-1",
      available: false,
      price: 19.90,
      updatedAt: "2025-01-07T11:05:00Z"
    }
  }
}
```

#### Analytics API
```javascript
// GET /api/analytics/dashboard
// Get dashboard metrics
{
  response: {
    revenue: {
      today: 2345.60,
      week: 15678.90,
      month: 67890.12,
      growth: {
        daily: 12.5,
        weekly: 8.3,
        monthly: 15.7
      }
    },
    orders: {
      today: 34,
      week: 245,
      month: 1023,
      average: {
        value: 68.90,
        prepTime: 18.5
      }
    },
    popular: {
      products: [{
        id: "prod-1",
        name: "Burger Deluxe",
        count: 234,
        revenue: 3726.60
      }, {
        id: "prod-2",
        name: "Pizza Margherita",
        count: 189,
        revenue: 3002.10
      }],
      categories: [{
        name: "Hauptgerichte",
        percentage: 65
      }, {
        name: "Getränke",
        percentage: 20
      }, {
        name: "Desserts",
        percentage: 15
      }]
    },
    customers: {
      new: 12,
      returning: 22,
      retention: 78.5,
      satisfaction: 4.7
    }
  }
}

// GET /api/analytics/reports/:type
// Generate specific reports
// Types: sales, inventory, customers, financial
{
  request: {
    type: "sales",
    period: "monthly",
    format: "pdf",
    filters: {
      categories: ["main", "dessert"],
      dateFrom: "2025-01-01",
      dateTo: "2025-01-31"
    }
  },
  response: {
    reportId: "report-123",
    status: "processing",
    estimatedTime: 30,
    webhook: "https://api.eatech.ch/reports/status/report-123"
  }
}
```

#### Webhooks
```javascript
// Order Status Updates
// POST https://your-webhook-url.com/orders
{
  event: "order.status.changed",
  timestamp: "2025-01-07T12:00:00Z",
  data: {
    orderId: "order-123",
    previousStatus: "pending",
    newStatus: "confirmed",
    tenantId: "tenant-456"
  }
}

// Payment Events
// POST https://your-webhook-url.com/payments
{
  event: "payment.succeeded",
  timestamp: "2025-01-07T12:01:00Z",
  data: {
    orderId: "order-123",
    amount: 45.90,
    currency: "CHF",
    paymentMethod: "card",
    transactionId: "txn_123"
  }
}
```

### GraphQL API (Future)
```graphql
# Schema Definition
type Query {
  # Orders
  orders(
    status: OrderStatus
    type: OrderType
    limit: Int = 20
    offset: Int = 0
  ): OrderConnection!
  
  order(id: ID!): Order
  
  # Products
  products(
    category: String
    available: Boolean
    search: String
  ): [Product!]!
  
  product(id: ID!): Product
  
  # Analytics
  analytics(
    period: AnalyticsPeriod!
    metrics: [MetricType!]!
  ): Analytics!
}

type Mutation {
  # Orders
  createOrder(input: CreateOrderInput!): CreateOrderPayload!
  updateOrderStatus(
    orderId: ID!
    status: OrderStatus!
  ): UpdateOrderPayload!
  
  # Products
  createProduct(input: CreateProductInput!): Product!
  updateProduct(
    id: ID!
    input: UpdateProductInput!
  ): Product!
}

type Subscription {
  # Real-time order updates
  orderStatusChanged(tenantId: ID!): Order!
  
  # New orders
  newOrder(tenantId: ID!): Order!
  
  # Analytics updates
  metricsUpdated(tenantId: ID!): Analytics!
}
```

---

## 📅 IMPLEMENTIERUNGS-TIMELINE

### Phase 1: Foundation (Wochen 1-2) [100%] ✅
- [x] **Projekt-Setup**
  - [x] Monorepo mit Lerna
  - [x] Build-Pipeline
  - [x] Development Environment
- [x] **Firebase Integration**
  - [x] Authentication
  - [x] Realtime Database
  - [x] Cloud Functions
- [x] **Multi-Tenant Architektur**
  - [x] Tenant Isolation
  - [x] Data Partitioning
  - [x] Permission System
- [x] **UI Component Library**
  - [x] Design System
  - [x] Common Components
  - [x] Theme Support

### Phase 2: Customer Core (Wochen 3-4) [100%] ✅
- [x] **QR Code System**
  - [x] Scanner Implementation
  - [x] Table Management
  - [x] Session Handling
- [x] **Digital Menu**
  - [x] Product Display
  - [x] Category Navigation
  - [x] Search & Filter
- [x] **Shopping Cart**
  - [x] Add/Remove Items
  - [x] Price Calculation
  - [x] Modifiers Support
- [x] **Checkout Process**
  - [x] Customer Info
  - [x] Payment Integration
  - [x] Order Confirmation

### Phase 3: Admin Features (Wochen 5-6) [100%] ✅
- [x] **Admin Dashboard**
  - [x] Overview Widgets
  - [x] Real-time Updates
  - [x] Quick Actions
- [x] **Order Management**
  - [x] Order Queue
  - [x] Status Updates
  - [x] Kitchen Display
- [x] **Product Management**
  - [x] CRUD Operations
  - [x] Bulk Import
  - [x] Image Upload
- [x] **Customer Database**
  - [x] Customer Profiles
  - [x] Order History
  - [x] Communication

### Phase 4: Advanced Features (Wochen 7-8) [100%] ✅
- [x] **Analytics Dashboard**
  - [x] Sales Reports
  - [x] Customer Analytics
  - [x] Product Performance
- [x] **Financial Module**
  - [x] Revenue Tracking
  - [x] Commission Calculation
  - [x] Invoice Generation
- [x] **Notification System**
  - [x] Push Notifications
  - [x] Email/SMS
  - [x] In-App Alerts
- [x] **Offline Support**
  - [x] Service Worker
  - [x] Local Storage
  - [x] Sync Queue

### Phase 5: Premium & Master (Wochen 9-10) [30%] 🚧
- [ ] **Premium Features**
  - [ ] AI Recommendations
  - [ ] Loyalty Program
  - [ ] Advanced Analytics
- [x] **Master Control** ✅
  - [x] Master Login System
  - [x] Master Dashboard
  - [ ] Tenant Management
  - [ ] System Monitoring
  - [ ] Feature Flags
- [ ] **White Label**
  - [ ] Custom Branding
  - [ ] Domain Support
  - [ ] Theme Builder
- [ ] **Mobile Apps**
  - [ ] iOS Build
  - [ ] Android Build
  - [ ] App Store Submission

### Phase 6: Testing & Launch (Wochen 11-12) [0%] ⬜
- [ ] **Testing**
  - [ ] Unit Tests (80% Coverage)
  - [ ] Integration Tests
  - [ ] E2E Tests
  - [ ] Load Testing
- [ ] **Security Audit**
  - [ ] Penetration Testing
  - [ ] OWASP Compliance
  - [ ] Data Protection
- [ ] **Documentation**
  - [ ] API Docs
  - [ ] User Guides
  - [ ] Admin Manual
- [ ] **Deployment**
  - [ ] Production Setup
  - [ ] Monitoring
  - [ ] Backup System
  - [ ] Go-Live

---

## **VOLLSTÄNDIGE ÜBERSICHT ALLER IMPLEMENTIERTEN KOMPONENTEN**

### **Phase 1: Foundation ✅ (100%)**

#### Multi-Tenant Architektur
- **TenantContext.js** (`/packages/core/src/contexts/TenantContext.js`)
  - Multi-Tenant Context Provider für tenant-isolierte Datenverwaltung
  - Tenant-Auswahl und -Wechsel
  - Permissions-System
  - Role-based Access Control

- **TenantService.js** (`/packages/core/src/services/TenantService.js`)
  - Datenisolation Service
  - CRUD-Operationen mit Tenant-Schutz
  - Batch-Operationen
  - Quota-Management

- **database.rules.json** (`/firebase/database.rules.json`)
  - Firebase Security Rules für Multi-Tenancy
  - Strikte Datenisolation zwischen Tenants

- **useTenantData.js** (`/packages/core/src/hooks/useTenantData.js`)
  - React Hook für tenant-spezifische Daten
  - Real-time Subscriptions
  - List Management mit Filtering

- **TenantSelector.jsx** (`/packages/ui/src/components/TenantSelector/TenantSelector.jsx`)
  - UI Component für Tenant-Wechsel

#### UI Component Library
- **package.json** (`/packages/ui/package.json`)
- **index.js** (`/packages/ui/src/index.js`) - Component Library Exports
- **Button.jsx** (`/packages/ui/src/components/Button/Button.jsx`)
- **Card.jsx** (`/packages/ui/src/components/Card/Card.jsx`)
- **defaultTheme.js** (`/packages/ui/src/theme/defaultTheme.js`)

#### CI/CD Pipeline
- **ci.yml** (`/.github/workflows/ci.yml`) - GitHub Actions CI/CD
- **pre-commit** (`/.husky/pre-commit`) - Git Pre-commit Hooks
- **.lintstagedrc.js** - Lint Staged Configuration  
- **release.yml** (`/.github/workflows/release.yml`) - Automated Releases
- **dependabot.yml** (`/.github/dependabot.yml`) - Dependency Updates
- **turbo.json** - Turbo Build Configuration (Updated to v2)

### **Phase 2: Customer Core ✅ (100%)**

#### QR Code System
- **QRCodeService.js** (`/packages/core/src/services/QRCodeService.js`)
  - QR Code Generation und Verwaltung
  - Bulk QR Generation
  - Analytics Tracking

- **QRScanner.jsx** (`/apps/web/src/components/QRScanner/QRScanner.jsx`)
  - QR Code Scanner mit Kamera
  - Manuelle Tischnummer-Eingabe
  - Session Management

- **TableQRManagement.jsx** (`/apps/admin/src/pages/Tables/TableQRManagement.jsx`)
  - Admin Interface für QR Codes
  - Print-freundliche QR Codes
  - Statistiken

#### Digital Menu
- **Menu.jsx** (`/apps/web/src/pages/Menu/Menu.jsx`)
  - Digitale Speisekarte
  - Kategorien und Filter
  - Suche
  - Dietary Filters

- **ProductDetailModal.jsx** (`/apps/web/src/components/ProductDetailModal/ProductDetailModal.jsx`)
  - Produktdetails mit Optionen
  - Modifikatoren
  - Spezielle Anweisungen

- **CartContext.jsx** (`/apps/web/src/contexts/CartContext.jsx`)
  - Warenkorb State Management
  - Promo Codes
  - Persistente Speicherung

#### Shopping Cart
- **Cart.jsx** (`/apps/web/src/pages/Cart/Cart.jsx`)
  - Warenkorb-Verwaltung
  - Mengenänderung
  - Notizen

- **CartSidebar.jsx** (`/apps/web/src/components/CartSidebar/CartSidebar.jsx`)
  - Quick Cart Preview
  - Schnelle Aktionen

- **useLocalStorage.js** (`/apps/web/src/hooks/useLocalStorage.js`)
  - Persistente Datenspeicherung
  - Cross-Tab Sync

#### Checkout Process
- **Checkout.jsx** (`/apps/web/src/pages/Checkout/Checkout.jsx`)
  - Checkout-Formular
  - Zahlungsmethoden
  - Validierung

- **PaymentService.js** (`/apps/web/src/services/PaymentService.js`)
  - Stripe Integration
  - TWINT Support
  - Fee Calculation

- **OrderService.js** (`/apps/web/src/services/OrderService.js`)
  - Order Creation
  - Status Management
  - Notifications

### **Phase 3: Admin Features ✅ (100%)**

#### Admin Dashboard
- **Dashboard.jsx** (`/apps/admin/src/pages/Dashboard/Dashboard.jsx`)
  - Echtzeit-Statistiken
  - Umsatz-Charts
  - Live Orders

- **Dashboard.module.css** (`/apps/admin/src/pages/Dashboard/Dashboard.module.css`)
  - Dashboard Styling

- **DashboardService.js** (`/apps/admin/src/services/DashboardService.js`)
  - Daten-Aggregation
  - Statistik-Berechnung
  - Trend-Analyse

- **LiveOrdersWidget.jsx** (`/apps/admin/src/components/Widgets/LiveOrdersWidget.jsx`)
  - Live Order Display
  - Timer und Warnungen

#### Order Management
- **Orders.jsx** (`/apps/admin/src/pages/Orders/Orders.jsx`)
  - Order-Übersicht
  - Status-Management
  - Bulk Actions

- **OrderDetailModal.jsx** (`/apps/admin/src/components/Modals/OrderDetailModal.jsx`)
  - Detaillierte Bestellansicht
  - Status History
  - Print-Funktion

- **KitchenDisplay.jsx** (`/apps/admin/src/pages/Kitchen/KitchenDisplay.jsx`)
  - Kitchen Display System
  - Fullscreen-Modus
  - Sound-Benachrichtigungen

#### Product Management
- **Products.jsx** (`/apps/admin/src/pages/Products/Products.jsx`)
  - Produktverwaltung mit Grid/List View
  - Bulk Actions
  - Import/Export
  - Feature Toggles

- **Products.module.css** (`/apps/admin/src/pages/Products/Products.module.css`)
  - Responsive Styles
  - Dark Mode Support
  - Print Styles
  - Fixed line-clamp issue

- **ProductModal.jsx** (`/apps/admin/src/components/Products/ProductModal.jsx`)
  - Erweiterte Produktbearbeitung
  - Varianten & Modifikatoren
  - Allergene & Nährwerte
  - Mehrsprachigkeit
  - KI-Beschreibungen
  - Combo-Deals
  - Happy Hour Preise

- **ProductModal.module.css** (`/apps/admin/src/components/Products/ProductModal.module.css`)
  - Modal Styling
  - Tab Navigation
  - Form Elements

- **FeatureToggleModal.jsx** (`/apps/admin/src/components/Products/FeatureToggleModal.jsx`)
  - Feature-Verwaltung
  - Kategorisierte Features
  - Import/Export Konfiguration

- **FeatureToggleModal.module.css** (`/apps/admin/src/components/Products/FeatureToggleModal.module.css`)
  - Feature Cards Layout
  - Toggle Animationen

#### Customer Management
- **CustomerManagement.jsx** (`/apps/admin/src/pages/CustomerManagement/CustomerManagement.jsx`)
  - CRM-System
  - Kundensegmentierung
  - Loyalty Programme
  - E-Mail/SMS Kampagnen
  - Import/Export
  - Statistik-Dashboard

- **CustomerManagement.module.css** (`/apps/admin/src/pages/CustomerManagement/CustomerManagement.module.css`)
  - Customer Cards
  - Segment Badges
  - Responsive Tables
  - Dark Mode Support

### **Phase 4: Advanced Features ✅ (100%)**

#### Offline Support
- **sw.js** (`/apps/web/public/sw.js`)
  - Service Worker für Offline-Funktionalität
  - Cache-Strategien
  - Background Sync

- **OfflineService.js** (`/packages/core/src/services/OfflineService.js`)
  - Offline Queue Management
  - Sync-Strategien
  - Conflict Resolution

- **useOffline.js** (`/packages/core/src/hooks/useOffline.js`)
  - React Hook für Offline-Status
  - Auto-Sync bei Reconnect

#### Analytics Dashboard
- **Analytics.jsx** (`/apps/admin/src/pages/Analytics/Analytics.jsx`)
  - Umfassende Analytics-Übersicht
  - Umsatz-Trends
  - Kunden-Insights
  - Produkt-Performance

- **Analytics.module.css** (`/apps/admin/src/pages/Analytics/Analytics.module.css`)
  - Chart Styling
  - Responsive Grid
  - Dark Mode Support

- **AnalyticsService.js** (`/packages/core/src/services/AnalyticsService.js`)
  - Datenanalyse-Engine
  - Trend-Berechnungen
  - Export-Funktionen

#### Notification System
- **NotificationService.js** (`/packages/core/src/services/NotificationService.js`)
  - Multi-Channel Notifications
  - Push-Notifications
  - E-Mail Integration
  - SMS Integration
  - In-App Notifications
  - Template-System

#### Kitchen Display System
- **KitchenDisplay.jsx** (`/apps/admin/src/pages/KitchenDisplay/KitchenDisplay.jsx`)
  - Echtzeit Kitchen Display
  - Order Queue Management
  - Prep-Time Tracking
  - Station Assignment

- **KitchenDisplay.module.css** (`/apps/admin/src/pages/KitchenDisplay/KitchenDisplay.module.css`)
  - Fullscreen Layout
  - Order Cards
  - Timer Displays

- **KitchenService.js** (`/packages/core/src/services/KitchenService.js`)
  - Kitchen Logic
  - Order Prioritization
  - Station Management

#### Table Management
- **TableManagement.jsx** (`/apps/admin/src/pages/Tables/TableManagement.jsx`)
  - Tisch-Verwaltung
  - QR-Code Generation
  - Reservation System
  - Table Status

- **TableManagement.module.css** (`/apps/admin/src/pages/Tables/TableManagement.module.css`)
  - Table Grid Layout
  - Status Indicators
  - Drag & Drop Support

- **TableService.js** (`/packages/core/src/services/TableService.js`)
  - Table CRUD Operations
  - Reservation Logic
  - Availability Checks

#### Promotion Engine
- **PromotionManagement.jsx** (`/apps/admin/src/pages/Promotions/PromotionManagement.jsx`)
  - Promotion-Verwaltung
  - Discount Codes
  - Happy Hour Setup
  - Customer Segments

- **PromotionManagement.module.css** (`/apps/admin/src/pages/Promotions/PromotionManagement.module.css`)
  - Promotion Cards
  - Timeline View
  - Statistics Display

- **PromotionService.js** (`/packages/core/src/services/PromotionService.js`)
  - Promotion Engine
  - Rule Evaluation
  - Discount Calculation

### **Phase 5: Premium & Master 🚧 (30%)**

#### Master Control System (Neu implementiert heute!)

##### Authentication & Security
- **Login.jsx** (`/apps/master/src/pages/Login.jsx`)
  - Sicheres Master Login System
  - Brute-Force Protection (3 Versuche, 5 Min Sperre)
  - Session Management
  - Security Check beim Start
  - 2FA-Ready für später

- **Login.module.css** (`/apps/master/src/pages/Login.module.css`)
  - Premium Dark Theme Design
  - Security Indicators
  - Responsive Layout
  - Animationen und Effekte

- **AuthService.js** (`/apps/master/src/services/AuthService.js`)
  - Firebase Authentication Integration
  - Session-basierte Authentifizierung (30 Min Timeout)
  - Activity Monitoring
  - Login Attempt Tracking
  - Session Token Encryption

- **SecurityLogger.js** (`/apps/master/src/services/SecurityLogger.js`)
  - Security Event Logging
  - Real-time Alert System
  - Audit Trail
  - Critical Event Detection

- **validation.js** (`/apps/master/src/utils/validation.js`)
  - Input Validation Utilities
  - Swiss-specific Validators
  - Security Sanitization

##### Master Application Structure
- **App.jsx** (`/apps/master/src/App.jsx`)
  - Master App Hauptkomponente
  - Routing Configuration
  - Protected Routes Setup

- **MasterLayout.jsx** (`/apps/master/src/layouts/MasterLayout.jsx`)
  - Collapsible Sidebar Navigation
  - Header mit Notifications
  - Dark/Light Mode Toggle
  - Quick Search (Ctrl+K)
  - Activity Monitoring

- **MasterLayout.module.css** (`/apps/master/src/layouts/MasterLayout.module.css`)
  - Layout Styling
  - Responsive Sidebar
  - Notification Dropdown

- **global.css** (`/apps/master/src/styles/global.css`)
  - Global Styles und CSS Variables
  - Dark/Light Theme Support
  - Typography System

##### Authentication Hooks & Components
- **useMasterAuth.js** (`/apps/master/src/hooks/useMasterAuth.js`)
  - Master Auth Context Provider
  - Authentication State Management
  - Role Verification

- **ProtectedRoute.jsx** (`/apps/master/src/components/ProtectedRoute.jsx`)
  - Route Protection Component
  - Master Role Check
  - Loading States

- **ProtectedRoute.module.css** (`/apps/master/src/components/ProtectedRoute.module.css`)
  - Protected Route Styling

##### Master Dashboard
- **Dashboard.jsx** (`/apps/master/src/pages/Dashboard.jsx`)
  - Mission Control Overview
  - Live Schweiz-Karte mit Foodtrucks
  - Echtzeit-Metriken
  - System Health Monitoring
  - Quick Actions
  - Auto-Refresh (5s)

- **Dashboard.module.css** (`/apps/master/src/pages/Dashboard.module.css`)
  - Dashboard Layout
  - Grid System
  - Responsive Design

##### Dashboard Components
- **MetricCard.jsx** (`/apps/master/src/components/Dashboard/MetricCard.jsx`)
  - Wiederverwendbare Metrik-Karte
  - Trend Indicators
  - Animated Values

- **MetricCard.module.css** (`/apps/master/src/components/Dashboard/MetricCard.module.css`)
  - Metric Card Styling
  - Color Variants

- **SwitzerlandMap.jsx** (`/apps/master/src/components/SwitzerlandMap/SwitzerlandMap.jsx`)
  - Interaktive SVG Schweizer Karte
  - Live Foodtruck-Positionen
  - Canton-basierte Heatmap
  - Hover Tooltips
  - Click Interactions

- **SwitzerlandMap.module.css** (`/apps/master/src/components/SwitzerlandMap/SwitzerlandMap.module.css`)
  - Map Styling
  - Pulse Animations
  - Tooltip Styles

- **SystemHealthWidget.jsx** (`/apps/master/src/components/Dashboard/SystemHealthWidget.jsx`)
  - Service Status Monitoring
  - Performance Metriken
  - Circular Progress
  - Alert System

- **SystemHealthWidget.module.css** (`/apps/master/src/components/Dashboard/SystemHealthWidget.module.css`)
  - Health Widget Styling
  - Progress Ring Animation

- **QuickActions.jsx** (`/apps/master/src/components/Dashboard/QuickActions.jsx`)
  - Schnellzugriff auf Master-Funktionen
  - Gefährliche Aktionen mit Bestätigung
  - Keyboard Shortcut Support

- **QuickActions.module.css** (`/apps/master/src/components/Dashboard/QuickActions.module.css`)
  - Action Button Grid
  - Color Coding
  - Hover Effects

- **LiveFeed.jsx** (`/apps/master/src/components/Dashboard/LiveFeed.jsx`)
  - Echtzeit Event-Stream
  - Filter nach Event-Typen
  - Sound-Benachrichtigungen
  - Pause/Play Funktionalität

- **LiveFeed.module.css** (`/apps/master/src/components/Dashboard/LiveFeed.module.css`)
  - Feed Styling
  - Event Cards
  - Animation Effects

### **Zusätzliche Core Services & Utilities**

#### Package Struktur
- **packages/utils/package.json** (`/packages/utils/package.json`)
  - Utility Package Configuration

- **packages/core/config/firebase.js** (`/packages/core/config/firebase.js`)
  - Firebase Configuration

- **apps/mobile/package-lock.json** (`/apps/mobile/package-lock.json`)
  - Mobile App Dependencies

- **apps/mobile/src/config/constants.js** (`/apps/mobile/src/config/constants.js`)
  - Mobile App Constants
  - Environment Configuration

### **Theme System & Templates**
- **ThemeSystem.jsx** (`/apps/admin/src/components/theme-system/ThemeSystem.jsx`)
  - Theme Management System
  - Multiple Theme Options

- **ComponentTemplate** (`/apps/admin/src/components/[ComponentName]/[ComponentName].jsx`)
  - Component Creation Template
  - Best Practices Guide

### **Master Pages (Placeholder für weitere Entwicklung)**
- **TenantControl.jsx** (`/apps/master/src/pages/TenantControl/TenantControl.jsx`) - Placeholder
- **SystemMetrics.jsx** (`/apps/master/src/pages/SystemMetrics/SystemMetrics.jsx`) - Placeholder  
- **GlobalSettings.jsx** (`/apps/master/src/pages/GlobalSettings/GlobalSettings.jsx`) - Placeholder
- **GlobalSettings.module.css** (`/apps/master/src/pages/GlobalSettings/GlobalSettings.module.css`) - Placeholder
- **RevenueTracking.jsx** (`/apps/master/src/pages/RevenueTracking/RevenueTracking.jsx`) - Placeholder
- **FeatureControl.jsx** (`/apps/master/src/pages/FeatureControl/FeatureControl.jsx`) - Placeholder
- **FeatureControl.module.css** (`/apps/master/src/pages/FeatureControl/FeatureControl.module.css`) - Placeholder
- **AlertCenter.jsx** (`/apps/master/src/pages/AlertCenter/AlertCenter.jsx`) - Placeholder

---

## 📊 **ZUSAMMENFASSUNG**

### **Gesamt-Statistik:**
- **Phase 1-4:** 85+ Komponenten vollständig implementiert ✅
- **Phase 5:** 26+ neue Master Control Komponenten (heute hinzugefügt) 🚧
- **Gesamt:** 110+ Komponenten und Services

### **Fortschritt Update:**
- Foundation: 100% ✅
- Customer Core: 100% ✅
- Admin Features: 100% ✅
- Advanced Features: 100% ✅
- Premium & Master: 30% 🚧 (Master Control teilweise fertig)
- Testing: 0% ⬜

**Gesamtfortschritt: 71%** 🚀

### Kritische Pfade
- Multi-Tenant Architektur ✅ → Erledigt!
- Payment Integration ✅ → Erledigt!
- Offline Support ✅ → Erledigt!
- Kitchen Display ✅ → Erledigt!
- Master Control System 🚧 → In Arbeit (30%)
- Commission System ⬜ → Noch ausstehend

## ✅ KRITISCHE ERFOLGSFAKTOREN

### 1. Performance
- **Ladezeit**: < 3 Sekunden (Mobile 4G)
- **Time to Interactive**: < 5 Sekunden
- **API Response**: < 200ms (P95)
- **Offline-Fähigkeit**: 100% Menu, 80% Orders

### 2. Skalierbarkeit
- **Concurrent Users**: 10,000+
- **Orders/Minute**: 1,000+
- **Tenants**: 500+ ohne Performance-Verlust
- **Data Volume**: 10TB+ strukturiert

### 3. Zuverlässigkeit
- **Uptime**: 99.9% SLA
- **Data Loss**: 0% (RPO: 15 Minuten)
- **Recovery Time**: < 1 Stunde (RTO)
- **Fehlerrate**: < 0.1%

### 4. Benutzerfreundlichkeit
- **Onboarding**: < 5 Minuten
- **Erste Bestellung**: < 2 Minuten
- **Admin-Schulung**: < 30 Minuten
- **Support-Tickets**: < 5% der User

### 5. Sicherheit
- **DSGVO/GDPR**: 100% compliant
- **PCI-DSS**: Level 1 compliant
- **Penetration Test**: Bestanden
- **Data Encryption**: At-rest & in-transit

---

## ⚠️ RISIKEN & MITIGATIONEN

### Technische Risiken
| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|---------|------------|
| Firebase Limits | Mittel | Hoch | Caching-Layer, Read-Replicas |
| Payment Provider Ausfall | Niedrig | Kritisch | Multi-Provider Fallback |
| DDoS Attacken | Mittel | Hoch | Cloudflare, Rate Limiting |
| Daten-Korruption | Niedrig | Kritisch | Backup alle 15 Min, Audit Log |

### Business Risiken
| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|---------|------------|
| Langsame Adoption | Hoch | Mittel | Free Trial, Onboarding Support |
| Konkurrenz | Mittel | Mittel | Unique Features, Preisführerschaft |
| Regulatorische Änderungen | Niedrig | Hoch | Compliance Team, Flexible Architektur |
| Tenant Churn | Mittel | Hoch | Success Team, Feature Requests |

---

## 🌟 UNIQUE SELLING POINTS

### 1. Schweiz-Fokus
- **Lokale Zahlungsmethoden**: Twint, PostFinance
- **Mehrsprachigkeit**: DE, FR, IT, EN
- **Schweizer Hosting**: Datenschutz-konform
- **CHF-native**: Keine Währungskonversion

### 2. Offline-First
- **100% Offline Menu**: Immer verfügbar
- **Offline Orders**: Queue & Sync
- **PWA**: Installierbar, App-like
- **Background Sync**: Automatisch

### 3. Multi-Tenant SaaS
- **White Label**: Eigenes Branding
- **Mandantenfähig**: Isolierte Daten
- **Skalierbar**: Von Food Truck bis Kette
- **API-First**: Integrierbar

### 4. Real-Time Everything
- **Live Order Updates**: Push, SMS, In-App
- **Kitchen Sync**: Sofort in Küche
- **Analytics**: Echtzeit-Dashboard
- **Inventory**: Auto-Updates

### 5. AI-Powered (Zukunft)
- **Smart Recommendations**: Personalisiert
- **Demand Forecasting**: Predictive
- **Dynamic Pricing**: Nachfrage-basiert
- **Chatbot Support**: 24/7

---

## 📞 SUPPORT & RESSOURCEN

### Entwickler-Ressourcen
- **GitHub**: github.com/eatech/v3
- **Dokumentation**: docs.eatech.ch
- **API Reference**: api.eatech.ch/docs
- **Status Page**: status.eatech.ch

### Support-Kanäle
- **Developer Discord**: discord.gg/eatech-dev
- **E-Mail**: dev@eatech.ch
- **Ticket System**: support.eatech.ch
- **Hotline**: +41 44 123 45 67 (Business Hours)

### Schulungen
- **Onboarding Videos**: youtube.com/eatech
- **Webinare**: Jeden Dienstag 14:00
- **Dokumentation**: help.eatech.ch
- **Persönliche Schulung**: Auf Anfrage

---

## 🚀 NÄCHSTE SCHRITTE

### Sofort (Diese Woche)
1. ✅ Dokumentation fertigstellen
2. ⬜ Multi-Tenant Struktur implementieren
3. ⬜ CI/CD Pipeline aufsetzen
4. ⬜ Component Library starten

### Kurzfristig (2 Wochen)
1. ⬜ Customer App MVP
2. ⬜ Admin Dashboard Grundgerüst
3. ⬜ Payment Integration
4. ⬜ Erste Demo für Investoren

### Mittelfristig (1 Monat)
1. ⬜ Beta-Test mit 5 Restaurants
2. ⬜ Mobile App Alpha
3. ⬜ Analytics Dashboard
4. ⬜ Performance Optimierung

### Langfristig (3 Monate)
1. ⬜ Launch Version 1.0
2. ⬜ 50+ zahlende Kunden
3. ⬜ Premium Features
4. ⬜ Internationale Expansion

---

## 📝 ANHANG

### Glossar
- **Tenant**: Ein Restaurant/Kunde im System
- **Commission**: 3% Provision pro Transaktion
- **White Label**: Eigenes Branding für Enterprise
- **PWA**: Progressive Web App
- **RTO**: Recovery Time Objective
- **RPO**: Recovery Point Objective

### Versions-Historie
- **v3.0.0** (2025-01-07): Komplette Neu-Entwicklung
- **v2.0.0** (2024): Legacy System (deprecated)
- **v1.0.0** (2023): Initial MVP

### Danksagungen
- EATECH Development Team
- Beta-Tester Restaurants
- Open Source Community
- Schweizer Gastro-Verband

---

**ENDE DER DOKUMENTATION**

*Letzte Aktualisierung: 2025-01-07*
*Nächste Review: 2025-02-01*

**© 2025 EATECH - Revolutionizing Food Ordering in Switzerland 🇨🇭🍔🚀**?w=400 400w,
        ${src}?w=800 800w,
        ${src}

        Wenn du an Dateien Arbeitest und das README.MD befolgst gib mir auch den Kapitel den du Gerade Bearbeitest.




        was geändert wurde zu sicherheit notiert: Kategorie: Bug-Fixes und Wartung (nicht explizit im README als Phase definiert)
1. turbo.json Migration (Breaking Change Fix)

Problem: Turbo Build hat sein Config-Schema geändert (v1 → v2)
Fehler: Property pipeline is not allowed und Missing property "tasks"
Lösung:

pipeline → tasks umbenannt
Schema-URL aktualisiert auf https://turbo.build/schema.json
Struktur beibehalten für alle Build-Tasks


Datei: /turbo.json (Root-Verzeichnis)

2. CSS Vendor Prefix Compliance

Problem: Fehlende Standard-Property für Browser-Kompatibilität
Fehler: Also define the standard property 'line-clamp' for compatibility
Lösung:

Standard line-clamp: 2; Property hinzugefügt
Webkit-Prefix beibehalten für ältere Browser
Keine Funktionsänderung, nur verbesserte Kompatibilität


Datei: /apps/admin/src/pages/Products/Products.module.css (Zeile 685)

Einordnung in die Projektstruktur:
Diese Fixes gehören zur laufenden Wartung des Projekts und sind notwendig für:

Build-System: Turbo muss korrekt konfiguriert sein für das Monorepo
Browser-Kompatibilität: CSS muss Standards befolgen für alle Browser

Auswirkungen:

✅ Build-Prozess funktioniert wieder mit aktueller Turbo-Version
✅ Keine CSS-Warnungen mehr in modernen Browsern
✅ Rückwärtskompatibilität bleibt erhalten



🎉 Master Control System - Implementierung abgeschlossen!
✅ Erfolgreich implementierte Komponenten:
1. NotificationCenter.jsx

Multi-Channel Management (Push, Email, SMS, In-App)
Smart Targeting & Timing
A/B Testing Dashboard
Emergency Broadcast System
90 Tage Analytics Retention

2. ReviewTracker.jsx

Punkte-System (1 CHF = 1 Punkt)
Food-Themed Level System (Rookie → Nomad)
AI-Sentiment-Analyse
Review-Heatmap Schweiz
Google/Platform Integration Ready

3. PreOrderManager.jsx

1h/2h Vorbestellung (Normal/Premium)
Smart Wartezeit-Kalkulation
Recurring Orders System
Peak Time Management
Live Queue Monitoring

4. CalendarManager.jsx (bereits vorhanden)

30-Tage Standortplanung
Drag & Drop Scheduling
Wetter-Integration
Favoriten-Benachrichtigungen

5. TenantControl.jsx (bereits vorhanden)

Live Foodtruck-Verwaltung
Schweizer Karte Integration
Status-Updates in Echtzeit
Commission Tracking

📊 Gesamtfortschritt Master Control System:
Phase 5: Premium & Master Features

✅ Master Login System (100%)
✅ Master Dashboard (100%)
✅ Notification Management (100%)
✅ Review & Rewards (100%)
✅ PreOrder System (100%)
✅ Calendar Planning (100%)
✅ Tenant Control (100%)
⬜ Feature Flags (0%)
⬜ System Monitoring (0%)
⬜ White Label Builder (0%)

Gesamtfortschritt Phase 5: ~75% 🚀
🎯 Nächste empfohlene Schritte:
1. Feature Flag System

Toggle Features per Tenant
A/B Testing für neue Features
Gradual Rollout Control

2. System Monitoring Dashboard

Server Health Metrics
Database Performance
API Response Times
Error Tracking

3. White Label Builder

Theme Customization
Logo/Branding Upload
Custom Domain Support

4. Integration & Testing

Alle Master Components verknüpfen
End-to-End Testing
Performance Optimization

💡 Quick Wins für sofortige Verbesserung:

Master Navigation - Sidebar mit allen Tools
Dashboard Widgets - Live-Metriken aller Systeme
Export Functions - CSV/PDF Reports
Batch Operations - Bulk Actions für Effizienz

                        