## 🏗️ TECHNISCHE ARCHITEKTUR

### Monorepo Struktur (Vollständig)
```
eatech/
├── apps/
│   ├── web/                        # Customer PWA (Next.js 14)
│   │   ├── src/
│   │   │   ├── app/               # Next.js 14 App Router
│   │   │   │   ├── (auth)/        # Auth Routes
│   │   │   │   ├── (customer)/    # Customer Routes
│   │   │   │   ├── api/           # API Routes
│   │   │   │   └── layout.tsx     # Root Layout
│   │   │   ├── components/        # Shared Components
│   │   │   ├── features/          # Feature Modules
│   │   │   │   ├── menu/
│   │   │   │   ├── cart/
│   │   │   │   ├── checkout/
│   │   │   │   └── voice/         # [NEU] Voice Commerce
│   │   │   ├── hooks/             # Custom Hooks
│   │   │   ├── lib/               # Libraries
│   │   │   ├── services/          # API Services
│   │   │   └── styles/            # Global Styles
│   │   ├── public/
│   │   │   ├── icons/             # PWA Icons
│   │   │   ├── manifest.json      # PWA Manifest
│   │   │   └── service-worker.js  # [NEU] Service Worker
│   │   └── next.config.js
│   │
│   ├── admin/                      # Foodtruck Admin Dashboard
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── Products/
│   │   │   │   ├── OrderManagement/
│   │   │   │   ├── Analytics/
│   │   │   │   ├── Events/        # [UPDATE NEEDED]
│   │   │   │   ├── Settings/
│   │   │   │   ├── Staff/
│   │   │   │   ├── Reviews/
│   │   │   │   ├── Promotions/
│   │   │   │   └── notifications/
│   │   │   ├── components/
│   │   │   │   ├── Layout/
│   │   │   │   ├── Products/
│   │   │   │   └── Orders/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── master/                     # Master Control System
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── FeatureControl/  # [INCOMPLETE]
│   │   │   │   ├── TenantManagement/
│   │   │   │   ├── SystemAnalytics/
│   │   │   │   ├── Monitoring/      # [NEU]
│   │   │   │   └── AITraining/      # [NEU]
│   │   │   ├── components/
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── SwitzerlandMap/
│   │   │   │   └── SystemHealth# 🍴 EATECH V3.0 - ULTIMATE TECHNICAL DOCUMENTATION

> **Das revolutionäre Multi-Tenant Foodtruck Bestellsystem für die Schweiz**  
> Version: 3.0.0 | Stand: Januar 2025 | Fortschritt: 85% | Launch: 1. August 2025

---

## 📑 INHALTSVERZEICHNIS

1. [Projekt-Übersicht](#projekt-übersicht)
2. [Technische Architektur](#technische-architektur)
3. [Firebase Datenstruktur](#firebase-datenstruktur)
4. [Feature-Liste (200+ Features)](#feature-liste)
5. [Implementierungsstatus](#implementierungsstatus)
6. [API Dokumentation](#api-dokumentation)
7. [PWA Implementation](#pwa-implementation)
8. [Security & Compliance](#security-compliance)
9. [Performance Optimierung](#performance-optimierung)
10. [Development Guidelines](#development-guidelines)
11. [Testing Strategy](#testing-strategy)
12. [Deployment Guide](#deployment-guide)
13. [Monitoring & Analytics](#monitoring-analytics)
14. [Support & Maintenance](#support-maintenance)

---

## 📊 PROJEKT-ÜBERSICHT

### Vision & Mission
EATECH revolutioniert die Schweizer Foodtruck-Branche durch eine All-in-One PWA-Lösung. Keine Apps, keine Downloads - nur pure Effizienz.

### Key Metrics
- **Ziel**: 800+ Foodtrucks bis Ende 2025
- **Launch**: 1. August 2025 (Nationalfeiertag)
- **Tech Stack**: Next.js, React, Firebase, PWA
- **Architektur**: Multi-Tenant SaaS
- **Pricing**: 49 CHF/Monat
- **Support**: benedikt@thomma.ch + Telefon

### Unique Selling Points
1. **100% PWA** - Keine App Store Abhängigkeit
2. **Offline-First** - Funktioniert immer
3. **Multi-Language** - DE/FR/IT/EN + Schweizerdeutsch
4. **KI-Powered** - Intelligente Automatisierung
5. **Swiss Made** - DSGVO/DSG konform

---

## 🏗️ TECHNISCHE ARCHITEKTUR

### Monorepo Struktur (Vollständig mit allen Files)
```
eatech/
├── apps/
│   ├── web/                              # Customer PWA (Next.js 14)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── register/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── (customer)/
│   │   │   │   │   ├── menu/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── cart/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── checkout/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── orders/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [orderNumber]/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── api/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── login/route.ts
│   │   │   │   │   │   ├── logout/route.ts
│   │   │   │   │   │   └── verify/route.ts
│   │   │   │   │   ├── orders/
│   │   │   │   │   │   ├── route.ts
│   │   │   │   │   │   └── [id]/route.ts
│   │   │   │   │   ├── products/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── voice/              # [NEU]
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── webhooks/
│   │   │   │   │       ├── stripe/route.ts
│   │   │   │   │       └── twilio/route.ts
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── globals.css
│   │   │   │   ├── error.tsx
│   │   │   │   └── not-found.tsx
│   │   │   ├── components/
│   │   │   │   ├── common/
│   │   │   │   │   ├── Button/
│   │   │   │   │   │   ├── Button.tsx
│   │   │   │   │   │   ├── Button.module.css
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── Card/
│   │   │   │   │   │   ├── Card.tsx
│   │   │   │   │   │   ├── Card.module.css
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── Input/
│   │   │   │   │   │   ├── Input.tsx
│   │   │   │   │   │   ├── Input.module.css
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── Modal/
│   │   │   │   │       ├── Modal.tsx
│   │   │   │   │       ├── Modal.module.css
│   │   │   │   │       └── index.ts
│   │   │   │   ├── layouts/
│   │   │   │   │   ├── Header/
│   │   │   │   │   │   ├── Header.tsx
│   │   │   │   │   │   └── Header.module.css
│   │   │   │   │   ├── Footer/
│   │   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   │   └── Footer.module.css
│   │   │   │   │   └── Navigation/
│   │   │   │   │       ├── Navigation.tsx
│   │   │   │   │       └── Navigation.module.css
│   │   │   │   └── features/
│   │   │   │       ├── ProductCard/
│   │   │   │       │   ├── ProductCard.tsx
│   │   │   │       │   └── ProductCard.module.css
│   │   │   │       ├── CartItem/
│   │   │   │       │   ├── CartItem.tsx
│   │   │   │       │   └── CartItem.module.css
│   │   │   │       └── OrderStatus/
│   │   │   │           ├── OrderStatus.tsx
│   │   │   │           └── OrderStatus.module.css
│   │   │   ├── features/
│   │   │   │   ├── menu/
│   │   │   │   │   ├── MenuList.tsx
│   │   │   │   │   ├── MenuFilter.tsx
│   │   │   │   │   ├── MenuSearch.tsx
│   │   │   │   │   └── useMenu.ts
│   │   │   │   ├── cart/
│   │   │   │   │   ├── CartProvider.tsx
│   │   │   │   │   ├── CartSummary.tsx
│   │   │   │   │   ├── useCart.ts
│   │   │   │   │   └── cartUtils.ts
│   │   │   │   ├── checkout/
│   │   │   │   │   ├── CheckoutForm.tsx
│   │   │   │   │   ├── PaymentMethods.tsx
│   │   │   │   │   ├── OrderSummary.tsx
│   │   │   │   │   └── useCheckout.ts
│   │   │   │   └── voice/                  # [NEU]
│   │   │   │       ├── VoiceButton.tsx
│   │   │   │       ├── VoiceModal.tsx
│   │   │   │       ├── useVoiceRecognition.ts
│   │   │   │       └── voiceCommands.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useFirebase.ts
│   │   │   │   ├── useTenant.ts
│   │   │   │   ├── useAnalytics.ts
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   └── useServiceWorker.ts    # [NEU]
│   │   │   ├── lib/
│   │   │   │   ├── firebase.ts
│   │   │   │   ├── stripe.ts
│   │   │   │   ├── twilio.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── services/
│   │   │   │   ├── api/
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── orders.service.ts
│   │   │   │   │   ├── products.service.ts
│   │   │   │   │   └── customers.service.ts
│   │   │   │   ├── firebase/
│   │   │   │   │   ├── auth.firebase.ts
│   │   │   │   │   ├── firestore.firebase.ts
│   │   │   │   │   └── storage.firebase.ts
│   │   │   │   └── ai/                     # [NEU]
│   │   │   │       ├── openai.service.ts
│   │   │   │       └── predictions.service.ts
│   │   │   ├── store/
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── cartStore.ts
│   │   │   │   └── uiStore.ts
│   │   │   ├── styles/
│   │   │   │   ├── globals.css
│   │   │   │   ├── variables.css
│   │   │   │   └── fonts.css
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   ├── order.types.ts
│   │   │   │   ├── product.types.ts
│   │   │   │   └── tenant.types.ts
│   │   │   └── utils/
│   │   │       ├── constants.ts
│   │   │       ├── helpers.ts
│   │   │       ├── validators.ts
│   │   │       └── formatters.ts
│   │   ├── public/
│   │   │   ├── icons/
│   │   │   │   ├── icon-72x72.png
│   │   │   │   ├── icon-96x96.png
│   │   │   │   ├── icon-128x128.png
│   │   │   │   ├── icon-144x144.png
│   │   │   │   ├── icon-152x152.png
│   │   │   │   ├── icon-192x192.png
│   │   │   │   ├── icon-384x384.png
│   │   │   │   └── icon-512x512.png
│   │   │   ├── images/
│   │   │   │   ├── logo.svg
│   │   │   │   ├── hero-mobile.jpg
│   │   │   │   └── hero-desktop.jpg
│   │   │   ├── manifest.json
│   │   │   ├── service-worker.js          # [NEU]
│   │   │   ├── offline.html               # [NEU]
│   │   │   ├── robots.txt
│   │   │   └── sitemap.xml
│   │   ├── .env.local
│   │   ├── .env.production
│   │   ├── next.config.js
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── admin/                            # Foodtruck Admin Dashboard
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard/
│   │   │   │   │   ├── Dashboard.jsx
│   │   │   │   │   ├── Dashboard.module.css
│   │   │   │   │   └── components/
│   │   │   │   │       ├── StatsCard.jsx
│   │   │   │   │       ├── RevenueChart.jsx
│   │   │   │   │       └── OrdersTable.jsx
│   │   │   │   ├── Products/
│   │   │   │   │   ├── Products.jsx        # [UPDATE NEEDED]
│   │   │   │   │   ├── ProductDetail.jsx
│   │   │   │   │   ├── ProductForm.jsx
│   │   │   │   │   └── Products.module.css
│   │   │   │   ├── OrderManagement/
│   │   │   │   │   ├── OrderManagement.jsx # [UPDATE NEEDED]
│   │   │   │   │   ├── OrderDetail.jsx
│   │   │   │   │   ├── KitchenView.jsx
│   │   │   │   │   └── OrderManagement.module.css
│   │   │   │   ├── Analytics/
│   │   │   │   │   ├── Analytics.jsx       # [UPDATE NEEDED]
│   │   │   │   │   ├── Reports.jsx
│   │   │   │   │   ├── Insights.jsx
│   │   │   │   │   └── Analytics.module.css
│   │   │   │   ├── Events/
│   │   │   │   │   ├── Events.jsx          # [UPDATE NEEDED]
│   │   │   │   │   ├── EventDetail.jsx
│   │   │   │   │   ├── EventForm.jsx
│   │   │   │   │   ├── EventMap.jsx        # [NEU]
│   │   │   │   │   └── Events.module.css
│   │   │   │   ├── Settings/
│   │   │   │   │   ├── Settings.jsx        # [UPDATE NEEDED]
│   │   │   │   │   ├── GeneralSettings.jsx
│   │   │   │   │   ├── PaymentSettings.jsx
│   │   │   │   │   ├── NotificationSettings.jsx
│   │   │   │   │   └── Settings.module.css
│   │   │   │   ├── Staff/
│   │   │   │   │   ├── Staff.jsx
│   │   │   │   │   ├── StaffDetail.jsx
│   │   │   │   │   ├── StaffForm.jsx
│   │   │   │   │   └── Staff.module.css
│   │   │   │   ├── Reviews/
│   │   │   │   │   ├── Reviews.jsx
│   │   │   │   │   ├── ReviewDetail.jsx
│   │   │   │   │   └── Reviews.module.css
│   │   │   │   ├── Promotions/
│   │   │   │   │   ├── Promotions.jsx
│   │   │   │   │   ├── PromotionForm.jsx
│   │   │   │   │   └── Promotions.module.css
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── NotificationCenter.jsx
│   │   │   │   │   ├── NotificationTemplates.jsx
│   │   │   │   │   └── NotificationHistory.jsx
│   │   │   │   └── billing/
│   │   │   │       ├── BillingOverview.jsx
│   │   │   │       ├── Invoices.jsx
│   │   │   │       └── components/
│   │   │   │           └── SubscriptionManager.jsx
│   │   │   ├── components/
│   │   │   │   ├── Layout/
│   │   │   │   │   ├── AdminLayout.jsx
│   │   │   │   │   ├── Sidebar.jsx
│   │   │   │   │   ├── Header.jsx
│   │   │   │   │   └── Layout.module.css
│   │   │   │   ├── Products/
│   │   │   │   │   ├── ProductCard.jsx
│   │   │   │   │   ├── ModifierModal.jsx
│   │   │   │   │   ├── VariantManager.jsx
│   │   │   │   │   ├── FeatureToggleModal.jsx
│   │   │   │   │   └── PriceAIModal.jsx    # [NEU]
│   │   │   │   ├── Orders/
│   │   │   │   │   ├── OrderCard.jsx
│   │   │   │   │   ├── OrderStatusBadge.jsx
│   │   │   │   │   ├── OrderTimeline.jsx
│   │   │   │   │   └── VoiceOrderIndicator.jsx # [NEU]
│   │   │   │   └── common/
│   │   │   │       ├── DataTable.jsx
│   │   │   │       ├── LoadingSpinner.jsx
│   │   │   │       ├── ErrorBoundary.jsx
│   │   │   │       └── ConfirmModal.jsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAdminAuth.js
│   │   │   │   ├── useOrders.js
│   │   │   │   ├── useProducts.js
│   │   │   │   ├── useAnalytics.js
│   │   │   │   └── useRealtime.js
│   │   │   ├── services/
│   │   │   │   ├── api.service.js
│   │   │   │   ├── firebase.service.js
│   │   │   │   └── analytics.service.js
│   │   │   ├── utils/
│   │   │   │   ├── constants.js
│   │   │   │   ├── helpers.js
│   │   │   │   └── validators.js
│   │   │   ├── styles/
│   │   │   │   ├── globals.css
│   │   │   │   └── variables.css
│   │   │   ├── App.jsx
│   │   │   ├── index.js
│   │   │   └── Router.jsx
│   │   ├── public/
│   │   │   ├── index.html
│   │   │   └── favicon.ico
│   │   ├── .env
│   │   ├── package.json
│   │   ├── webpack.config.js
│   │   └── README.md
│   │
│   ├── master/                           # Master Control System
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Dashboard.module.css
│   │   │   │   ├── FeatureControl/
│   │   │   │   │   ├── FeatureControl.jsx      # [INCOMPLETE]
│   │   │   │   │   ├── FeatureControl.module.css
│   │   │   │   │   ├── FeatureControlWithFirebase.jsx
│   │   │   │   │   └── components/
│   │   │   │   │       ├── FeatureCard.jsx
│   │   │   │   │       └── FeatureToggle.jsx
│   │   │   │   ├── TenantManagement/
│   │   │   │   │   ├── TenantList.jsx
│   │   │   │   │   ├── TenantDetail.jsx
│   │   │   │   │   ├── TenantOnboarding.jsx
│   │   │   │   │   └── TenantManagement.module.css
│   │   │   │   ├── SystemAnalytics/
│   │   │   │   │   ├── PlatformMetrics.jsx
│   │   │   │   │   ├── RevenueAnalysis.jsx
│   │   │   │   │   ├── UsageStatistics.jsx
│   │   │   │   │   └── SystemAnalytics.module.css
│   │   │   │   ├── Monitoring/                  # [NEU]
│   │   │   │   │   ├── SystemHealth.jsx
│   │   │   │   │   ├── ErrorTracking.jsx
│   │   │   │   │   ├── PerformanceMetrics.jsx
│   │   │   │   │   ├── AlertManager.jsx
│   │   │   │   │   └── Monitoring.module.css
│   │   │   │   ├── AITraining/                  # [NEU]
│   │   │   │   │   ├── ModelManagement.jsx
│   │   │   │   │   ├── TrainingPipeline.jsx
│   │   │   │   │   ├── ExperimentTracking.jsx
│   │   │   │   │   └── AITraining.module.css
│   │   │   │   └── Support/
│   │   │   │       ├── TicketList.jsx
│   │   │   │       ├── TicketDetail.jsx
│   │   │   │       └── Support.module.css
│   │   │   ├── components/
│   │   │   │   ├── Dashboard/
│   │   │   │   │   ├── MetricCard.jsx
│   │   │   │   │   ├── MetricCard.module.css
│   │   │   │   │   ├── SystemHealthWidget.jsx
│   │   │   │   │   └── LiveActivityFeed.jsx
│   │   │   │   ├── SwitzerlandMap/
│   │   │   │   │   ├── SwitzerlandMap.jsx
│   │   │   │   │   ├── SwitzerlandMap.module.css
│   │   │   │   │   └── mapData.js
│   │   │   │   ├── Navigation/
│   │   │   │   │   ├── MasterNav.jsx
│   │   │   │   │   └── MasterNav.module.css
│   │   │   │   └── common/
│   │   │   │       ├── MasterButton.jsx
│   │   │   │       ├── MasterCard.jsx
│   │   │   │       └── MasterModal.jsx
│   │   │   ├── modules/
│   │   │   │   └── MasterControl/
│   │   │   │       └── MasterControl.jsx
│   │   │   ├── layouts/
│   │   │   │   ├── MasterLayout.jsx
│   │   │   │   └── MasterLayout.module.css
│   │   │   ├── hooks/
│   │   │   │   ├── useMasterAuth.js
│   │   │   │   ├── useSystemMetrics.js
│   │   │   │   └── useTenantData.js
│   │   │   ├── services/
│   │   │   │   ├── masterApi.service.js
│   │   │   │   ├── monitoring.service.js
│   │   │   │   └── ai.service.js
│   │   │   ├── styles/
│   │   │   │   ├── globals.css
│   │   │   │   └── theme.css
│   │   │   ├── App.jsx
│   │   │   ├── index.js
│   │   │   └── Router.jsx
│   │   ├── public/
│   │   │   ├── index.html
│   │   │   └── favicon.ico
│   │   ├── .env
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── landing/                          # Marketing Website
│       ├── src/
│       │   ├── pages/
│       │   │   ├── index.jsx
│       │   │   ├── features.jsx
│       │   │   ├── pricing.jsx
│       │   │   ├── about.jsx
│       │   │   └── contact.jsx
│       │   ├── components/
│       │   │   ├── Hero.jsx
│       │   │   ├── Features.jsx
│       │   │   ├── Pricing.jsx
│       │   │   └── Footer.jsx
│       │   └── styles/
│       │       └── landing.css
│       ├── package.json
│       └── README.md
│
├── packages/
│   ├── core/                             # Shared Business Logic
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── firebase.js           # [UPDATE NEEDED]
│   │   │   │   ├── constants.js
│   │   │   │   └── environment.js
│   │   │   ├── models/
│   │   │   │   ├── Order.js
│   │   │   │   ├── Product.js
│   │   │   │   ├── Customer.js
│   │   │   │   ├── Tenant.js
│   │   │   │   └── Event.js
│   │   │   ├── services/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.service.js
│   │   │   │   │   └── jwt.service.js
│   │   │   │   ├── database/
│   │   │   │   │   ├── firestore.service.js
│   │   │   │   │   └── queries.js
│   │   │   │   ├── payment/
│   │   │   │   │   ├── stripe.service.js
│   │   │   │   │   └── twint.service.js
│   │   │   │   ├── notification/
│   │   │   │   │   ├── sms.service.js
│   │   │   │   │   ├── email.service.js
│   │   │   │   │   └── push.service.js
│   │   │   │   └── cdn/                  # [NEU]
│   │   │   │       ├── cloudflare.service.js
│   │   │   │       └── imageOptimizer.js
│   │   │   ├── features/                 # [NEU]
│   │   │   │   ├── featureFlags.js
│   │   │   │   └── experiments.js
│   │   │   ├── utils/
│   │   │   │   ├── validators.js
│   │   │   │   ├── formatters.js
│   │   │   │   ├── calculations.js
│   │   │   │   └── helpers.js
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── ui/                               # Component Library
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button/
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Button.stories.tsx
│   │   │   │   │   ├── Button.test.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── Card/
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Card.stories.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── Input/
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Input.stories.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   └── Modal/
│   │   │   │       ├── Modal.tsx
│   │   │   │       ├── Modal.stories.tsx
│   │   │   │       └── index.ts
│   │   │   ├── styles/
│   │   │   │   ├── tokens.css
│   │   │   │   └── utilities.css
│   │   │   └── index.ts
│   │   ├── .storybook/
│   │   │   ├── main.js
│   │   │   └── preview.js
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── types/                            # TypeScript Definitions
│   │   ├── src/
│   │   │   ├── api.types.ts
│   │   │   ├── models.types.ts
│   │   │   ├── firebase.types.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── utils/                            # Shared Utilities
│   │   ├── src/
│   │   │   ├── date.utils.ts
│   │   │   ├── string.utils.ts
│   │   │   ├── number.utils.ts
│   │   │   ├── array.utils.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── analytics/                        # Analytics Engine
│   │   ├── src/
│   │   │   ├── collectors/
│   │   │   │   ├── event.collector.ts
│   │   │   │   ├── metric.collector.ts
│   │   │   │   └── error.collector.ts
│   │   │   ├── processors/
│   │   │   │   ├── aggregator.ts
│   │   │   │   ├── transformer.ts
│   │   │   │   └── enricher.ts
│   │   │   ├── ab-testing/              # [NEU]
│   │   │   │   ├── experiment.manager.ts
│   │   │   │   ├── variant.assigner.ts
│   │   │   │   └── result.analyzer.ts
│   │   │   ├── heatmap/                 # [NEU]
│   │   │   │   ├── click.tracker.ts
│   │   │   │   ├── scroll.tracker.ts
│   │   │   │   └── heatmap.generator.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── ai/                              # [NEU] AI Services
│   │   ├── src/
│   │   │   ├── emergency/
│   │   │   │   ├── emergency.detector.ts
│   │   │   │   ├── solution.generator.ts
│   │   │   │   └── auto.adjuster.ts
│   │   │   ├── pricing/
│   │   │   │   ├── price.optimizer.ts
│   │   │   │   ├── elasticity.analyzer.ts
│   │   │   │   └── competitor.monitor.ts
│   │   │   ├── predictions/
│   │   │   │   ├── demand.forecaster.ts
│   │   │   │   ├── wait.predictor.ts
│   │   │   │   └── revenue.projector.ts
│   │   │   ├── voice/
│   │   │   │   ├── speech.recognizer.ts
│   │   │   │   ├── intent.parser.ts
│   │   │   │   └── response.generator.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── blockchain/                      # [NEU] Blockchain Integration
│   │   ├── src/
│   │   │   ├── contracts/
│   │   │   │   ├── Transaction.sol
│   │   │   │   └── Loyalty.sol
│   │   │   ├── services/
│   │   │   │   ├── transaction.recorder.ts
│   │   │   │   └── smart.contract.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── edge/                           # [NEU] Edge Computing
│       ├── src/
│       │   ├── workers/
│       │   │   ├── offline.worker.ts
│       │   │   └── sync.worker.ts
│       │   ├── mesh/
│       │   │   ├── peer.connector.ts
│       │   │   └── data.syncer.ts
│       │   └── index.ts
│       ├── package.json
│       └── README.md
│
├── functions/                           # Firebase Cloud Functions
│   ├── src/
│   │   ├── triggers/
│   │   │   ├── auth.triggers.ts
│   │   │   ├── order.triggers.ts
│   │   │   ├── analytics.triggers.ts
│   │   │   └── scheduled.triggers.ts
│   │   ├── api/
│   │   │   ├── webhooks.ts
│   │   │   ├── admin.api.ts
│   │   │   └── public.api.ts
│   │   ├── utils/
│   │   │   ├── emailTemplates.ts
│   │   │   └── helpers.ts
│   │   └── index.ts
│   ├── .env
│   ├── package.json
│   └── README.md
│
├── tools/                              # Build Tools & Scripts
│   ├── scripts/
│   │   ├── build-all.sh
│   │   ├── deploy.sh
│   │   ├── setup-dev.sh
│   │   └── generate-types.js
│   ├── config/
│   │   ├── webpack.base.js
│   │   └── jest.config.js
│   └── README.md
│
├── docs/                               # Documentation
│   ├── api/
│   │   ├── rest-api.md
│   │   └── graphql-schema.md
│   ├── guides/
│   │   ├── getting-started.md
│   │   ├── deployment.md
│   │   └── troubleshooting.md
│   └── architecture/
│       ├── overview.md
│       └── decisions.md
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── deploy-production.yml
│   │   └── security-scan.yml
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── .vscode/
│   ├── settings.json
│   ├── launch.json
│   └── extensions.json
│
├── infrastructure/                     # [NEU] IaC
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── kubernetes/
│       ├── deployment.yaml
│       └── service.yaml
│
├── tests/                             # E2E Tests
│   ├── cypress/
│   │   ├── integration/
│   │   │   ├── customer-flow.spec.js
│   │   │   ├── admin-flow.spec.js
│   │   │   └── payment.spec.js
│   │   └── support/
│   │       └── commands.js
│   └── playwright/
│       └── smoke-tests.spec.ts
│
├── .env.example
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── firebase.json
├── firestore.rules
├── lerna.json
├── package.json
├── README.md                          # Dieses Dokument
├── tsconfig.json
└── turbo.json
```

### Tech Stack Details
```javascript
const techStack = {
  frontend: {
    framework: 'Next.js 14 (App Router)',
    ui: 'React 18',
    styling: 'CSS Modules + Tailwind CSS',
    state: 'Zustand + React Query + Context',
    routing: 'Next.js App Router',
    pwa: 'next-pwa + Workbox 7',
    bundler: 'Turbopack'
  },
  backend: {
    database: 'Firebase Firestore',
    auth: 'Firebase Auth (Multi-Tenant)',
    storage: 'Firebase Storage + Cloudflare R2',
    functions: 'Firebase Functions (Node.js 18)',
    hosting: 'Vercel Edge + Firebase Hosting',
    cdn: 'Cloudflare (Global)'
  },
  services: {
    payments: 'Stripe + Twint + PostFinance',
    sms: 'Twilio',
    email: 'SendGrid',
    push: 'Firebase Cloud Messaging',
    monitoring: 'Sentry + LogRocket',
    analytics: 'Plausible + Custom Analytics',
    search: 'Algolia',
    maps: 'Mapbox + Google Maps'
  },
  ai: {
    llm: 'OpenAI GPT-4 Turbo',
    vision: 'Google Vision API',
    speech: 'Web Speech API + Whisper',
    ml: 'TensorFlow.js',
    embeddings: 'OpenAI Ada-2'
  },
  dev: {
    language: 'TypeScript 5.3',
    testing: 'Jest + Cypress + Playwright',
    ci: 'GitHub Actions',
    monitoring: 'Datadog + Grafana',
    errorTracking: 'Sentry',
    abTesting: 'Optimizely'
  }
};
```

### Service Worker Strategy
```javascript
// Aggressive Caching für Offline-First
const cacheStrategy = {
  static: {
    strategy: 'CacheFirst',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    includes: ['/fonts/', '/images/', '/icons/']
  },
  api: {
    strategy: 'NetworkFirst',
    timeout: 3000,
    fallback: 'offlineData',
    includes: ['/api/menu/', '/api/products/']
  },
  images: {
    strategy: 'StaleWhileRevalidate',
    maxEntries: 100,
    maxAgeSeconds: 7 * 24 * 60 * 60,
    plugins: ['WebP', 'AVIF', 'lazyLoad']
  }
};
```

---

## 🗄️ FIREBASE DATENSTRUKTUR (KOMPLETT)

### 1. Tenants Collection (Foodtrucks)
```javascript
{
  tenants: {
    [tenantId]: {
      // === BASIC INFO ===
      name: 'Burger Paradise',
      slug: 'burger-paradise',
      type: 'foodtruck', // foodtruck, restaurant, chain, ghost-kitchen
      status: 'active', // active, suspended, trial, cancelled, setup
      
      // === CONTACT & LOCATION ===
      contact: {
        email: 'info@burgerparadise.ch',
        phone: '+41791234567',
        whatsapp: '+41791234567',
        address: {
          street: 'Bahnhofstrasse 1',
          city: 'Zürich',
          canton: 'ZH',
          zip: '8001',
          country: 'CH',
          coordinates: { lat: 47.3667, lng: 8.5500 }
        }
      },
      
      // === BUSINESS DETAILS ===
      business: {
        registrationNumber: 'CHE-123.456.789',
        vatNumber: 'CHE-123.456.789 MWST',
        iban: 'CH93 0076 2011 6238 5295 7',
        bankName: 'PostFinance',
        cuisine: ['burger', 'american', 'streetfood'],
        priceRange: 2, // 1-4 (€-€€€€)
        capacity: 50, // simultaneous orders
        averagePreparationTime: 15, // minutes
        founded: '2020-03-15'
      },
      
      // === SUBSCRIPTION & BILLING ===
      subscription: {
        plan: 'premium', // free, basic, premium, enterprise
        status: 'active',
        startDate: '2025-01-01',
        billingCycle: 'monthly', // monthly, yearly
        nextBillingDate: '2025-02-01',
        price: 49.00,
        currency: 'CHF',
        paymentMethod: 'card',
        features: {
          maxProducts: -1, // unlimited
          maxOrders: -1,
          maxStaff: 10,
          analytics: true,
          ai: true,
          multiLocation: true,
          whiteLabel: false,
          customDomain: false,
          apiAccess: true,
          prioritySupport: true
        }
      },
      
      // === OPERATING HOURS ===
      operatingHours: {
        regular: {
          monday: { open: '11:00', close: '14:00', open2: '17:00', close2: '21:00' },
          tuesday: { open: '11:00', close: '14:00', open2: '17:00', close2: '21:00' },
          wednesday: { open: '11:00', close: '14:00', open2: '17:00', close2: '21:00' },
          thursday: { open: '11:00', close: '14:00', open2: '17:00', close2: '21:00' },
          friday: { open: '11:00', close: '22:00' },
          saturday: { open: '11:00', close: '22:00' },
          sunday: { closed: true }
        },
        specialDays: {
          '2025-08-01': { closed: true, reason: 'Nationalfeiertag' },
          '2025-12-25': { closed: true, reason: 'Weihnachten' },
          '2025-12-31': { open: '11:00', close: '03:00', reason: 'Silvester' }
        }
      },
      
      // === FEATURES & SETTINGS ===
      settings: {
        language: 'de',
        languages: ['de', 'fr', 'en'],
        timezone: 'Europe/Zurich',
        currency: 'CHF',
        orderPrefix: 'BP',
        orderNumberFormat: 'PREFIX-YYYY-NNNN',
        taxRate: 7.7,
        taxIncluded: true,
        serviceFee: 0,
        minimumOrder: 0,
        maxAdvanceOrderDays: 7,
        orderTimeout: 300, // seconds
        
        // Feature Toggles
        features: {
          allowPreorders: true,
          allowTakeaway: true,
          allowDelivery: false,
          allowTableService: true,
          allowGroupOrders: true,
          allowReservations: false,
          allowCatering: true,
          requirePhoneNumber: true,
          requireEmail: false,
          autoAcceptOrders: false,
          kitchenDisplay: true,
          customerDisplay: true,
          loyaltyProgram: true,
          giftCards: true,
          subscriptions: false,
          marketplace: false
        },
        
        // Notifications
        notifications: {
          channels: {
            push: true,
            sms: true,
            email: true,
            whatsapp: false
          },
          sounds: {
            newOrder: 'ding.mp3',
            orderReady: 'bell.mp3',
            alert: 'alert.mp3'
          },
          recipients: {
            newOrder: ['manager', 'kitchen'],
            lowStock: ['manager'],
            dailyReport: ['owner']
          }
        },
        
        // Payment Settings
        payments: {
          methods: {
            cash: true,
            card: true,
            twint: true,
            postfinance: false,
            invoice: false,
            crypto: false
          },
          tipping: {
            enabled: true,
            suggestions: [5, 10, 15], // percentage
            custom: true
          }
        }
      },
      
      // === THEME & BRANDING ===
      branding: {
        colors: {
          primary: '#FF6B35',
          secondary: '#004E89',
          accent: '#F7931E',
          background: '#FFFFFF',
          text: '#333333'
        },
        fonts: {
          heading: 'Bebas Neue',
          body: 'Open Sans',
          custom: null
        },
        assets: {
          logo: 'https://storage.eatech.ch/tenants/123/logo.png',
          logoWhite: 'https://storage.eatech.ch/tenants/123/logo-white.png',
          favicon: 'https://storage.eatech.ch/tenants/123/favicon.ico',
          coverImage: 'https://storage.eatech.ch/tenants/123/cover.jpg',
          menuBackground: 'https://storage.eatech.ch/tenants/123/menu-bg.jpg'
        },
        customCSS: '',
        theme: 'modern' // modern, classic, minimal, bold
      },
      
      // === SEO & MARKETING ===
      seo: {
        metaTitle: 'Burger Paradise - Die besten Burger in Zürich',
        metaDescription: 'Frische, handgemachte Burger vom Foodtruck. Täglich in Zürich.',
        keywords: ['burger', 'zürich', 'foodtruck', 'streetfood'],
        ogImage: 'https://storage.eatech.ch/tenants/123/og.jpg',
        structuredData: {
          type: 'FoodEstablishment',
          priceRange: '$$',
          servesCuisine: 'American'
        }
      },
      
      // === INTEGRATIONS ===
      integrations: {
        payment: {
          stripe: {
            accountId: 'acct_123',
            publicKey: 'pk_live_123',
            secretKey: '[ENCRYPTED]',
            webhookSecret: 'whsec_123',
            enabled: true
          },
          twint: {
            merchantId: 'M123456',
            apiKey: '[ENCRYPTED]',
            enabled: true
          }
        },
        social: {
          google: {
            businessId: 'ChIJ123',
            apiKey: '[ENCRYPTED]',
            enabled: true
          },
          facebook: {
            pageId: '123456789',
            accessToken: '[ENCRYPTED]',
            pixelId: 'FB123',
            enabled: true
          },
          instagram: {
            businessId: 'IG123',
            accessToken: '[ENCRYPTED]',
            enabled: true
          }
        },
        accounting: {
          bexio: {
            apiKey: '[ENCRYPTED]',
            companyId: 'BX123',
            enabled: false
          },
          abacus: {
            apiKey: '[ENCRYPTED]',
            mandant: 'AB123',
            enabled: false
          }
        },
        delivery: {
          uber: { enabled: false },
          justeat: { enabled: false }
        }
      },
      
      // === LOCATIONS (Multi-Location Support) ===
      locations: [
        {
          id: 'loc_main',
          name: 'Hauptstandort',
          type: 'mobile', // mobile, fixed, both
          schedule: {
            monday: { location: 'Paradeplatz', time: '11:00-14:00' },
            tuesday: { location: 'Technopark', time: '11:00-14:00' },
            wednesday: { location: 'Universität', time: '11:00-14:00' },
            thursday: { location: 'Hauptbahnhof', time: '11:00-14:00' },
            friday: { location: 'Seefeld', time: '11:00-22:00' }
          },
          coordinates: {
            current: { lat: 47.3667, lng: 8.5500 },
            updated: '2025-01-07T12:00:00Z'
          }
        }
      ],
      
      // === STATS & METRICS ===
      stats: {
        lifetime: {
          orders: 15234,
          revenue: 456789.50,
          customers: 3456,
          products: 89234
        },
        current: {
          rating: 4.8,
          reviewCount: 234,
          responseTime: 45, // seconds average
          fulfillmentRate: 0.98,
          repeatCustomerRate: 0.34
        },
        rankings: {
          city: 3, // #3 in Zürich
          category: 1, // #1 in Burgers
          overall: 12 // #12 overall
        }
      },
      
      // === METADATA ===
      metadata: {
        createdAt: '2024-06-15T10:00:00Z',
        updatedAt: '2025-01-07T15:30:00Z',
        createdBy: 'uid_owner123',
        lastLoginAt: '2025-01-07T14:00:00Z',
        onboardingCompleted: true,
        flags: ['beta-tester', 'early-adopter'],
        notes: 'Premium customer, sehr zufrieden'
      }
    }
  }
}
```

### 2. Products Collection
```javascript
{
  'tenants/{tenantId}/products': {
    [productId]: {
      // === BASIC INFO ===
      name: {
        de: 'Classic Burger',
        fr: 'Burger Classique',
        it: 'Burger Classico',
        en: 'Classic Burger'
      },
      description: {
        de: 'Saftiges Rindfleisch mit frischen Zutaten',
        fr: 'Bœuf juteux avec des ingrédients frais',
        it: 'Manzo succoso con ingredienti freschi',
        en: 'Juicy beef with fresh ingredients'
      },
      shortDescription: {
        de: '200g Beef, Salat, Tomate, Zwiebel',
        // ...other languages
      },
      
      // === CATEGORIZATION ===
      category: 'main',
      subcategory: 'burgers',
      tags: ['bestseller', 'spicy', 'glutenfree-option', 'halal'],
      collections: ['summer-menu', 'festival-specials'],
      
      // === PRICING ===
      pricing: {
        basePrice: 16.90,
        compareAtPrice: 19.90, // for showing discount
        cost: 5.50, // for margin calculation
        currency: 'CHF',
        taxRate: 7.7,
        taxIncluded: true,
        
        // Dynamic Pricing
        dynamicPricing: {
          enabled: true,
          rules: [
            {
              type: 'happyHour',
              discount: 20,
              schedule: { daily: { start: '14:00', end: '17:00' } }
            },
            {
              type: 'bulkOrder',
              minQuantity: 5,
              discount: 10
            }
          ]
        }
      },
      
      // === VARIANTS ===
      variants: [
        {
          id: 'var_small',
          sku: 'BRG-001-S',
          name: { de: 'Klein (150g)', en: 'Small (150g)' },
          price: 14.90,
          cost: 4.50,
          inventory: { quantity: 50, trackInventory: true },
          isDefault: false
        },
        {
          id: 'var_regular',
          sku: 'BRG-001-M',
          name: { de: 'Normal (200g)', en: 'Regular (200g)' },
          price: 16.90,
          cost: 5.50,
          inventory: { quantity: 100, trackInventory: true },
          isDefault: true
        },
        {
          id: 'var_large',
          sku: 'BRG-001-L',
          name: { de: 'Gross (300g)', en: 'Large (300g)' },
          price: 19.90,
          cost: 7.50,
          inventory: { quantity: 30, trackInventory: true },
          isDefault: false
        }
      ],
      
      // === MODIFIERS ===
      modifierGroups: [
        {
          id: 'meat_choice',
          name: { de: 'Fleisch wählen', en: 'Choose Meat' },
          required: true,
          min: 1,
          max: 1,
          options: [
            {
              id: 'beef',
              name: { de: 'Rindfleisch', en: 'Beef' },
              price: 0,
              isDefault: true,
              allergens: []
            },
            {
              id: 'chicken',
              name: { de: 'Poulet', en: 'Chicken' },
              price: 0,
              allergens: []
            },
            {
              id: 'veggie',
              name: { de: 'Vegetarisch (Beyond Meat)', en: 'Vegetarian' },
              price: 2,
              allergens: ['soy']
            }
          ]
        },
        {
          id: 'toppings',
          name: { de: 'Extras', en: 'Extras' },
          required: false,
          min: 0,
          max: 5,
          options: [
            {
              id: 'bacon',
              name: { de: 'Bacon', en: 'Bacon' },
              price: 3.50,
              inventory: { quantity: 20, trackInventory: true }
            },
            {
              id: 'cheese_extra',
              name: { de: 'Extra Käse', en: 'Extra Cheese' },
              price: 2.00,
              allergens: ['milk']
            },
            {
              id: 'avocado',
              name: { de: 'Avocado', en: 'Avocado' },
              price: 3.00,
              seasonal: true
            },
            {
              id: 'jalapenos',
              name: { de: 'Jalapeños', en: 'Jalapeños' },
              price: 1.50,
              tags: ['spicy']
            },
            {
              id: 'onion_rings',
              name: { de: 'Zwiebelringe', en: 'Onion Rings' },
              price: 2.50,
              allergens: ['gluten']
            }
          ]
        },
        {
          id: 'sauce',
          name: { de: 'Sauce', en: 'Sauce' },
          required: false,
          min: 0,
          max: 2,
          options: [
            {
              id: 'ketchup',
              name: { de: 'Ketchup', en: 'Ketchup' },
              price: 0,
              isDefault: true
            },
            {
              id: 'mayo',
              name: { de: 'Mayonnaise', en: 'Mayonnaise' },
              price: 0,
              allergens: ['egg']
            },
            {
              id: 'bbq',
              name: { de: 'BBQ Sauce', en: 'BBQ Sauce' },
              price: 0
            },
            {
              id: 'special',
              name: { de: 'Spezial Sauce', en: 'Special Sauce' },
              price: 1,
              allergens: ['egg', 'mustard']
            }
          ]
        }
      ],
      
      // === INVENTORY ===
      inventory: {
        management: 'variant', // simple, variant, bundle
        trackInventory: true,
        quantity: 180, // sum of all variants
        lowStockThreshold: 20,
        outOfStockBehavior: 'hide', // hide, disable, backorder
        restockAlert: true,
        supplier: {
          name: 'Metro AG',
          contactPerson: 'Hans Müller',
          phone: '+41441234567',
          email: 'bestellung@metro.ch',
          leadTime: 2 // days
        }
      },
      
      // === AVAILABILITY ===
      availability: {
        status: 'available', // available, unavailable, scheduled
        schedule: {
          always: false,
          rules: [
            {
              type: 'daily',
              startTime: '11:00',
              endTime: '21:00'
            },
            {
              type: 'dayOfWeek',
              days: [6, 0], // Weekend special
              startTime: '11:00',
              endTime: '22:00'
            }
          ]
        },
        locations: ['all'], // or specific location IDs
        channels: ['pos', 'online', 'phone'],
        startDate: null,
        endDate: null, // for limited time offers
        maxPerOrder: 10,
        maxPerCustomer: null
      },
      
      // === MEDIA ===
      media: {
        images: [
          {
            id: 'img_main',
            url: 'https://storage.eatech.ch/products/123/burger-main.jpg',
            thumbnails: {
              small: 'https://storage.eatech.ch/products/123/burger-small.jpg',
              medium: 'https://storage.eatech.ch/products/123/burger-medium.jpg',
              large: 'https://storage.eatech.ch/products/123/burger-large.jpg'
            },
            alt: { de: 'Classic Burger Hauptbild', en: 'Classic Burger Main Image' },
            width: 1200,
            height: 800,
            format: 'jpg',
            size: 245678, // bytes
            isMain: true,
            sortOrder: 1
          },
          {
            id: 'img_detail',
            url: 'https://storage.eatech.ch/products/123/burger-detail.jpg',
            // ... more images
          }
        ],
        videos: [
          {
            id: 'vid_prep',
            url: 'https://storage.eatech.ch/products/123/preparation.mp4',
            thumbnail: 'https://storage.eatech.ch/products/123/prep-thumb.jpg',
            duration: 30, // seconds
            title: { de: 'Zubereitung', en: 'Preparation' }
          }
        ],
        badges: ['bestseller', 'chefs-choice', 'spicy-level-2']
      },
      
      // === NUTRITION & ALLERGENS ===
      nutrition: {
        servingSize: '1 burger (350g)',
        calories: 650,
        caloriesFromFat: 270,
        totalFat: 30, // grams
        saturatedFat: 12,
        transFat: 0.5,
        cholesterol: 95, // mg
        sodium: 890,
        totalCarbs: 45,
        dietaryFiber: 3,
        sugars: 8,
        protein: 35,
        vitaminA: 15, // % daily value
        vitaminC: 20,
        calcium: 25,
        iron: 30
      },
      allergens: {
        contains: ['gluten', 'milk', 'egg', 'sesame'],
        mayContain: ['soy', 'nuts'],
        certified: ['halal']
      },
      dietary: {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        lactoseFree: false,
        organic: false,
        nonGMO: true,
        sustainable: true
      },
      
      // === PREPARATION ===
      preparation: {
        time: {
          prep: 5, // minutes
          cook: 7,
          total: 12
        },
        difficulty: 'medium',
        equipment: ['grill', 'fryer'],
        steps: [
          {
            order: 1,
            instruction: 'Preheat grill to 200°C',
            duration: 2
          },
          {
            order: 2,
            instruction: 'Season patty with salt and pepper',
            duration: 1
          },
          {
            order: 3,
            instruction: 'Grill patty 3-4 minutes per side',
            duration: 7
          },
          {
            order: 4,
            instruction: 'Toast bun lightly',
            duration: 1
          },
          {
            order: 5,
            instruction: 'Assemble with toppings',
            duration: 1
          }
        ],
        servingTemperature: 'hot',
        holdingTime: 10, // minutes max
        packagingInstructions: 'Wrap in branded paper, place in box'
      },
      
      // === ANALYTICS & PERFORMANCE ===
      analytics: {
        views: {
          total: 12543,
          unique: 8934,
          lastMonth: 1234,
          trend: 'up' // up, down, stable
        },
        orders: {
          total: 3421,
          lastMonth: 234,
          conversionRate: 0.27,
          averageRating: 4.7,
          repeatOrderRate: 0.45
        },
        revenue: {
          total: 57895.90,
          lastMonth: 3456.70,
          averageOrderValue: 16.91,
          profitMargin: 0.67
        },
        rankings: {
          category: 1, // #1 in burgers
          overall: 3, // #3 overall
          trending: 2 // #2 trending this week
        }
      },
      
      // === AI INSIGHTS ===
      ai: {
        priceOptimization: {
          currentPrice: 16.90,
          optimalPrice: 17.50,
          elasticity: -1.2,
          projectedRevenueLift: 0.08,
          confidence: 0.87,
          lastAnalyzed: '2025-01-06T10:00:00Z'
        },
        demandForecast: {
          tomorrow: 45,
          nextWeek: 280,
          accuracy: 0.89,
          factors: ['weather', 'dayOfWeek', 'events']
        },
        crossSell: {
          recommendations: ['fries', 'cola', 'dessert'],
          attachRate: 0.67,
          averageLift: 8.50
        }
      },
      
      // === METADATA ===
      metadata: {
        status: 'active', // active, inactive, archived
        visibility: 'public', // public, private, scheduled
        featured: true,
        sortOrder: 1,
        internalNotes: 'Bestseller, margin gut',
        createdAt: '2024-07-01T10:00:00Z',
        updatedAt: '2025-01-07T12:00:00Z',
        createdBy: 'uid_staff456',
        lastModifiedBy: 'uid_manager789',
        version: 12,
        changeLog: [
          {
            date: '2025-01-07T12:00:00Z',
            user: 'uid_manager789',
            changes: ['price update', 'new image']
          }
        ]
      }
    }
  }
}
```

### 3. Orders Collection
```javascript
{
  'tenants/{tenantId}/orders': {
    [orderId]: {
      // === ORDER BASICS ===
      orderNumber: 'BP-2025-0001',
      type: 'pickup', // pickup, delivery, dinein, catering
      channel: 'web', // web, app, pos, phone, kiosk, api
      status: 'confirmed', // draft, pending, confirmed, preparing, ready, picked_up, delivered, completed, cancelled, refunded
      
      // === CUSTOMER ===
      customer: {
        id: 'cust_123',
        firebaseUid: 'uid_456',
        name: 'Max Mustermann',
        phone: '+41791234567',
        phoneVerified: true,
        email: 'max@example.com',
        language: 'de',
        notes: 'Stammkunde, mag es scharf',
        tags: ['vip', 'regular'],
        marketingConsent: true
      },
      
      // === ORDER ITEMS ===
      items: [
        {
          id: 'item_1',
          productId: 'prod_123',
          productName: 'Classic Burger',
          variantId: 'var_regular',
          variantName: 'Normal (200g)',
          modifiers: [
            {
              groupId: 'meat_choice',
              groupName: 'Fleisch',
              optionId: 'beef',
              optionName: 'Rindfleisch',
              price: 0
            },
            {
              groupId: 'toppings',
              groupName: 'Extras',
              optionId: 'bacon',
              optionName: 'Bacon',
              price: 3.50
            }
          ],
          quantity: 2,
          unitPrice: 16.90,
          modifiersPrice: 3.50,
          itemPrice: 20.40,
          totalPrice: 40.80,
          taxRate: 7.7,
          taxAmount: 3.14,
          notes: 'Ohne Zwiebeln bitte',
          status: 'preparing',
          preparedBy: 'staff_789',
          preparedAt: null
        },
        {
          id: 'item_2',
          productId: 'prod_456',
          productName: 'Pommes Frites',
          // ... more items
        }
      ],
      
      // === PRICING & PAYMENT ===
      pricing: {
        subtotal: 75.60,
        itemsTotal: 75.60,
        modifiersTotal: 7.00,
        
        // Discounts
        discounts: [
          {
            type: 'promocode',
            code: 'SUMMER10',
            description: '10% Summer Rabatt',
            amount: 7.56,
            percentage: 10
          }
        ],
        discountTotal: 7.56,
        
        // Fees & Charges
        deliveryFee: 0,
        serviceFee: 0,
        packagingFee: 0.50,
        
        // Tax
        taxRate: 7.7,
        taxAmount: 5.83,
        taxIncluded: true,
        
        // Tip
        tip: {
          amount: 5.00,
          percentage: 6.6,
          method: 'percentage' // percentage, fixed
        },
        
        // Totals
        total: 73.54,
        totalPaid: 73.54,
        totalDue: 0,
        currency: 'CHF'
      },
      
      payment: {
        method: 'card', // card, cash, twint, invoice, voucher, mixed
        status: 'paid', // pending, processing, paid, failed, refunded, partially_refunded
        
        // Primary Transaction
        transactions: [
          {
            id: 'txn_1',
            method: 'card',
            amount: 73.54,
            status: 'success',
            processor: 'stripe',
            processorTransactionId: 'ch_3ABC123',
            card: {
              brand: 'visa',
              last4: '4242',
              expMonth: 12,
              expYear: 2027,
              country: 'CH'
            },
            processedAt: '2025-01-07T12:35:00Z',
            fee: 2.20 // payment processor fee
          }
        ],
        
        // Refunds
        refunds: [],
        
        // Invoice Details
        invoice: {
          required: false,
          number: null,
          issuedAt: null,
          url: null
        }
      },
      
      // === FULFILLMENT ===
      fulfillment: {
        type: 'pickup',
        
        // Timing
        timing: {
          requestedAt: '2025-01-07T13:00:00Z',
          requestedType: 'asap', // asap, scheduled
          promisedAt: '2025-01-07T13:15:00Z',
          estimatedAt: '2025-01-07T13:12:00Z',
          
          // Actual Times
          confirmedAt: '2025-01-07T12:36:00Z',
          startedAt: '2025-01-07T12:40:00Z',
          readyAt: '2025-01-07T12:52:00Z',
          pickedUpAt: '2025-01-07T12:55:00Z',
          completedAt: '2025-01-07T12:55:00Z'
        },
        
        // Pickup Details
        pickup: {
          location: 'main',
          instructions: 'Am Fenster abholen',
          code: '4321',
          qrCode: 'data:image/png;base64,...'
        },
        
        // Delivery Details (if applicable)
        delivery: null,
        
        // Table Service (if applicable)
        table: {
          number: 5,
          zone: 'terrasse',
          server: 'staff_456'
        }
      },
      
      // === LOCATION & CONTEXT ===
      context: {
        location: {
          type: 'coordinates',
          source: 'gps', // gps, manual, ip
          accuracy: 10, // meters
          coordinates: {
            lat: 47.3699,
            lng: 8.5380
          },
          address: 'Paradeplatz, 8001 Zürich',
          plusCode: '8FVC9G9Q+R6'
        },
        
        device: {
          type: 'mobile', // mobile, tablet, desktop
          os: 'ios',
          browser: 'safari',
          ip: '85.1.2.3',
          userAgent: 'Mozilla/5.0...'
        },
        
        weather: {
          condition: 'sunny',
          temperature: 22,
          impact: 'positive'
        },
        
        event: {
          id: 'event_123',
          name: 'Street Food Festival',
          type: 'festival'
        }
      },
      
      // === COMMUNICATIONS ===
      communications: {
        notifications: [
          {
            type: 'order_confirmed',
            channel: 'sms',
            sentAt: '2025-01-07T12:36:05Z',
            delivered: true,
            content: 'Bestellung BP-2025-0001 bestätigt. Abholung ca. 13:00'
          },
          {
            type: 'order_ready',
            channel: 'push',
            sentAt: '2025-01-07T12:52:00Z',
            delivered: true,
            opened: true
          }
        ],
        
        customerMessages: [
          {
            from: 'customer',
            message: 'Kann ich Zwiebeln weglassen?',
            sentAt: '2025-01-07T12:35:30Z'
          },
          {
            from: 'restaurant',
            message: 'Klar, kein Problem!',
            sentBy: 'staff_456',
            sentAt: '2025-01-07T12:36:00Z'
          }
        ]
      },
      
      // === FEEDBACK & RATING ===
      feedback: {
        requested: true,
        requestedAt: '2025-01-07T13:10:00Z',
        
        rating: {
          overall: 5,
          food: 5,
          service: 5,
          speed: 4,
          value: 5
        },
        
        review: {
          title: 'Perfekt!',
          comment: 'Wie immer ausgezeichnet. Burger war heiss und saftig.',
          wouldRecommend: true,
          tags: ['tasty', 'fast', 'friendly']
        },
        
        response: {
          message: 'Danke für das tolle Feedback!',
          respondedBy: 'staff_456',
          respondedAt: '2025-01-07T14:00:00Z'
        },
        
        submittedAt: '2025-01-07T13:30:00Z'
      },
      
      // === ANALYTICS & TRACKING ===
      analytics: {
        source: {
          utm_source: 'instagram',
          utm_medium: 'social',
          utm_campaign: 'summer2025',
          referrer: 'instagram.com'
        },
        
        journey: {
          sessionId: 'sess_abc123',
          landingPage: '/menu',
          viewedProducts: ['prod_123', 'prod_456', 'prod_789'],
          cartAbandoned: false,
          timeToOrder: 245, // seconds
          clicks: 12
        },
        
        performance: {
          preparationTime: 12, // minutes
          promiseTimeAccuracy: true,
          customerWaitTime: 3,
          kitchenEfficiency: 0.92
        },
        
        loyalty: {
          pointsEarned: 74,
          tierProgress: 0.15,
          campaignsTriggered: ['welcome_back']
        }
      },
      
      // === INTERNAL OPERATIONS ===
      operations: {
        kitchen: {
          station: 'grill',
          assignedTo: 'staff_789',
          priority: 'normal', // low, normal, high, urgent
          printedAt: '2025-01-07T12:36:30Z',
          bumpedAt: '2025-01-07T12:52:00Z'
        },
        
        pos: {
          terminal: 'POS-01',
          shift: 'shift_morning',
          cashier: 'staff_456',
          drawer: 'drawer_1'
        },
        
        inventory: {
          depleted: [
            { productId: 'prod_123', quantity: 2 },
            { modifierId: 'bacon', quantity: 2 }
          ],
          warnings: ['beef patty low stock']
        }
      },
      
      // === COMPLIANCE & AUDIT ===
      compliance: {
        taxInvoice: {
          required: false,
          number: null,
          issuedAt: null
        },
        
        hygiene: {
          temperatureChecked: true,
          allergenWarnings: ['gluten', 'milk'],
          certifications: ['haccp']
        },
        
        dataProtection: {
          consentGiven: true,
          marketingOptIn: true,
          retentionPeriod: 730 // days
        }
      },
      
      // === METADATA ===
      metadata: {
        version: 3,
        createdAt: '2025-01-07T12:34:00Z',
        updatedAt: '2025-01-07T12:55:00Z',
        
        // Audit Trail
        history: [
          {
            timestamp: '2025-01-07T12:34:00Z',
            action: 'created',
            by: 'customer',
            details: { source: 'web' }
          },
          {
            timestamp: '2025-01-07T12:36:00Z',
            action: 'confirmed',
            by: 'system',
            details: { autoConfirm: true }
          },
          {
            timestamp: '2025-01-07T12:40:00Z',
            action: 'preparing',
            by: 'staff_789',
            details: { station: 'grill' }
          },
          {
            timestamp: '2025-01-07T12:52:00Z',
            action: 'ready',
            by: 'staff_789',
            details: {}
          },
          {
            timestamp: '2025-01-07T12:55:00Z',
            action: 'completed',
            by: 'staff_456',
            details: { pickupCode: '4321' }
          }
        ],
        
        flags: [],
        tags: ['repeat_customer', 'vip'],
        customFields: {}
      }
    }
  }
}
```

### 4. Master Control Collections
```javascript
{
  // === MASTER USERS ===
  masterUsers: {
    [userId]: {
      email: 'admin@eatech.ch',
      role: 'superadmin', // superadmin, admin, support, analyst
      permissions: ['all'], // or specific permissions array
      name: 'Master Admin',
      phone: '+41791234567',
      twoFactorEnabled: true,
      lastLogin: '2025-01-07T10:00:00Z',
      createdAt: '2024-01-01T00:00:00Z'
    }
  },
  
  // === SYSTEM CONFIGURATION ===
  systemConfig: {
    general: {
      maintenanceMode: false,
      maintenanceMessage: null,
      systemVersion: '3.0.0',
      environment: 'production'
    },
    features: {
      globalFeatureFlags: {
        aiPricing: true,
        voiceCommerce: true,
        blockchain: false,
        eventManagement: true
      },
      rolloutPercentages: {
        newCheckout: 100,
        aiRecommendations: 75
      }
    },
    limits: {
      maxTenants: 1000,
      maxOrdersPerMinute: 1000,
      maxAPICallsPerHour: 100000
    },
    monitoring: {
      errorThreshold: 0.01,
      alertEmails: ['alerts@eatech.ch'],
      slackWebhook: 'https://hooks.slack.com/...'
    }
  },
  
  // === PLATFORM ANALYTICS ===
  platformAnalytics: {
    daily: {
      '2025-01-07': {
        tenants: {
          total: 234,
          active: 198,
          new: 5,
          churned: 1
        },
        orders: {
          total: 12456,
          value: 387654.32,
          average: 31.12
        },
        revenue: {
          subscriptions: 11566.00,
          commissions: 11629.63,
          total: 23195.63
        },
        performance: {
          uptime: 0.9999,
          avgResponseTime: 145, // ms
          errorRate: 0.0003
        }
      }
    }
  }
}
```

---

## 📋 FEATURE-LISTE (200+ FEATURES)

### 🎯 CORE FEATURES (Phase 1-2) ✅

#### 1. Multi-Tenant Architektur
- [x] Tenant Isolation
- [x] Custom Domains Support
- [x] White Label Möglichkeit
- [x] Tenant-spezifische Konfiguration
- [x] Datenbank-Sharding
- [x] Resource Quotas

#### 2. Bestell-Management
- [x] QR-Code Scanning
- [x] Table Service
- [x] Pickup Orders
- [x] Delivery Integration
- [x] Vorbestellungen
- [x] Gruppen-Bestellungen
- [x] Order Modifications
- [x] Stornierungen & Refunds

#### 3. Menü-Verwaltung
- [x] Multi-Language Support (DE/FR/IT/EN)
- [x] Kategorien & Unterkategorien
- [x] Produkt-Varianten
- [x] Modifier-Gruppen
- [x] Kombi-Angebote
- [x] Zeitbasierte Verfügbarkeit
- [x] Allergen-Management
- [x] Nährwert-Informationen

#### 4. Zahlungssystem
- [x] Stripe Integration
- [x] Twint Support
- [x] PostFinance
- [x] Cash Management
- [x] Split Payments
- [x] Trinkgeld-System
- [x] Rechnungs-Export
- [x] QR-Rechnung

#### 5. Echtzeit-Features
- [x] Live Order Updates
- [x] Kitchen Display System
- [x] Customer Display
- [x] Push Notifications
- [x] SMS Benachrichtigungen
- [x] E-Mail Notifications
- [x] WebSocket Connections
- [x] Server-Sent Events

### 📊 ANALYTICS & REPORTING (Phase 3) ✅

#### 6. Business Intelligence
- [x] Revenue Analytics
- [x] Product Performance
- [x] Customer Analytics
- [x] Zeitbasierte Reports
- [x] Vergleichs-Reports
- [x] Trend-Analysen
- [x] Export-Funktionen
- [x] Custom Dashboards

#### 7. Predictive Analytics
- [x] Demand Forecasting
- [x] Revenue Predictions
- [x] Inventory Forecasting
- [x] Staff Planning
- [x] Weather Impact Analysis
- [x] Event Impact Prediction
- [x] Seasonal Trends
- [x] Customer Lifetime Value

#### 8. Real-Time Monitoring
- [x] Live Sales Dashboard
- [x] Order Flow Visualization
- [x] Kitchen Performance
- [x] Wait Time Analytics
- [x] Customer Satisfaction
- [x] System Health
- [x] API Performance
- [x] Error Tracking

### 🤖 KI-FEATURES (Phase 5) 🚧

#### 9. Notfall-KI System ⭐
- [ ] Ein-Knopf Aktivierung
- [ ] Automatische Problem-Erkennung
- [ ] Sofort-Lösungsvorschläge
- [ ] Auto-Menü-Anpassung
- [ ] Notfall-Pricing
- [ ] Staff-Koordination
- [ ] Kunden-Kommunikation
- [ ] Post-Mortem Analyse

#### 10. Preis-KI Insights ⭐
- [ ] Dynamische Preisempfehlungen
- [ ] A/B Testing Automation
- [ ] Elastizitäts-Analyse
- [ ] Regional-Vergleiche
- [ ] Konkurrenz-Monitoring
- [ ] Margen-Optimierung
- [ ] Bundle-Vorschläge
- [ ] Promotion-Timing

#### 11. Intelligente Wartezeiten ⭐
- [ ] ML-basierte Vorhersagen
- [ ] Echtzeit-Anpassungen
- [ ] Küchen-Kapazitäts-AI
- [ ] Rush-Hour Prediction
- [ ] Smart Queue Management
- [ ] Customer ETA Updates
- [ ] Bottleneck Detection
- [ ] Auto-Staffing Alerts

#### 12. Voice Commerce ⭐
- [x] "Hey EATECH" Wake Word
- [ ] Mehrsprachig (DE/FR/IT/EN)
- [ ] Schweizerdeutsch Support
- [ ] Natürliche Bestellaufnahme
- [ ] Küchen-Sprachbefehle
- [ ] Emotions-Erkennung
- [ ] Bestell-Bestätigung
- [ ] Upselling via Voice

### 📅 EVENT MANAGEMENT (Phase 5) 🚧

#### 13. Multi-Day Events ⭐
- [x] Event-Kalender
- [x] Standort-Planung
- [ ] Lageplan-Integration
- [ ] Revenue Sharing Modelle
- [ ] Live Entertainment Schedule
- [ ] Besucher-Tracking
- [ ] Event-spezifische Menüs
- [ ] Partner-Koordination

#### 14. Festival Analytics ⭐
- [ ] Echtzeit-Besucherzahlen
- [ ] Verkaufs-Heatmaps
- [ ] Peak-Time Analysis
- [ ] Wetter-Impact
- [ ] Bühnenprogramm-Korrelation
- [ ] Social Media Monitoring
- [ ] Competitor Analysis
- [ ] ROI Berechnung

#### 15. Standort-Intelligence ⭐
- [ ] GPS-basiertes Check-In
- [ ] Geo-Fencing
- [ ] Route-Optimization
- [ ] Standort-History
- [ ] Hotspot-Analyse
- [ ] Kannibalisierungs-Check
- [ ] Permit-Management
- [ ] Parking-Finder

### 🎨 CMS & THEMES (Phase 5) 🚧

#### 16. Theme Builder ⭐
- [x] Drag & Drop Editor
- [ ] Template Library
- [ ] Custom CSS Support
- [ ] Font Management
- [ ] Color Schemes
- [ ] Animation Builder
- [ ] Responsive Preview
- [ ] Version Control

#### 17. Menu Designer ⭐
- [ ] Print-Ready Layouts
- [ ] QR-Code Integration
- [ ] Bleed/Anschnitt Support
- [ ] Multi-Format Export
- [ ] Template System
- [ ] Seasonal Variations
- [ ] Price Update Sync
- [ ] Digital Signage Export

#### 18. Marketing Tools
- [ ] Landing Page Builder
- [ ] Email Campaign Manager
- [ ] SMS Marketing
- [ ] Social Media Integration
- [ ] Loyalty Program Builder
- [ ] Referral System
- [ ] Review Management
- [ ] SEO Optimization

### 💰 FINANCIAL FEATURES

#### 19. Buchhaltungs-Export ⭐
- [x] Bexio Integration
- [ ] Abacus Support
- [ ] Banana Buchhaltung
- [ ] Custom Export Formats
- [ ] Automatische Synchronisation
- [ ] Kostenstellen-Zuordnung
- [ ] MWST-Reporting
- [ ] Jahresabschluss-Support

#### 20. Advanced Pricing
- [ ] Happy Hour Automation
- [ ] Surge Pricing
- [ ] Bundle Deals
- [ ] Loyalty Discounts
- [ ] Group Pricing
- [ ] Student/Senior Discounts
- [ ] Corporate Rates
- [ ] Subscription Models

### 🔧 OPERATIONS

#### 21. Inventory Management
- [x] Real-Time Tracking
- [x] Low Stock Alerts
- [x] Supplier Management
- [ ] Auto-Reordering
- [ ] Waste Tracking
- [ ] Recipe Management
- [ ] Cost Calculation
- [ ] Expiry Tracking

#### 22. Staff Management
- [x] Role-Based Access
- [x] Shift Planning
- [x] Performance Tracking
- [ ] Tip Distribution
- [ ] Training Modules
- [ ] Communication Hub
- [ ] Task Management
- [ ] Payroll Integration

#### 23. Kitchen Optimization
- [x] KDS (Kitchen Display)
- [x] Order Prioritization
- [ ] Prep List Generation
- [ ] Station Management
- [ ] Recipe Display
- [ ] Allergen Alerts
- [ ] Batch Cooking
- [ ] Equipment Monitoring

### 🔐 SECURITY & COMPLIANCE

#### 24. Datenschutz (DSGVO/DSG) ⭐
- [x] Consent Management
- [x] Data Export (Art. 20)
- [x] Right to Delete (Art. 17)
- [x] Anonymisierung
- [ ] Audit Logs
- [ ] Cookie Management
- [ ] Privacy Center
- [ ] DPA Generator

#### 25. Payment Security
- [x] PCI DSS Compliance
- [x] 3D Secure
- [x] Tokenization
- [ ] Fraud Detection
- [ ] Chargeback Management
- [ ] Risk Scoring
- [ ] Blacklist Management
- [ ] Compliance Reporting

### 🚀 INNOVATIVE FEATURES

#### 26. Blockchain Integration ⭐
- [ ] Transaction Recording
- [ ] Smart Contracts
- [ ] Loyalty Token
- [ ] Supply Chain Tracking
- [ ] Immutable Receipts
- [ ] Decentralized Reviews
- [ ] Crypto Payments
- [ ] NFT Rewards

#### 27. Edge Computing ⭐
- [ ] Local Processing
- [ ] Offline Transactions
- [ ] Distributed Analytics
- [ ] Mesh Networking
- [ ] Peer-to-Peer Sync
- [ ] Latency Optimization
- [ ] Bandwidth Saving
- [ ] Resilience Mode

#### 28. AR/VR Features
- [ ] AR Menu Preview
- [ ] Virtual Restaurant Tour
- [ ] 3D Food Models
- [ ] AR Navigation
- [ ] VR Training
- [ ] Mixed Reality Orders
- [ ] Holographic Displays
- [ ] MetaVerse Integration

### 📱 CUSTOMER EXPERIENCE

#### 29. Loyalty & Rewards
- [x] Points System
- [x] Tier Management
- [ ] Gamification
- [ ] Challenges
- [ ] Badges
- [ ] Referral Rewards
- [ ] Birthday Specials
- [ ] VIP Perks

#### 30. Social Features
- [ ] Order Sharing
- [ ] Group Orders
- [ ] Social Login
- [ ] Friend Recommendations
- [ ] Community Feed
- [ ] Food Photos
- [ ] Check-Ins
- [ ] Influencer Tools

#### 31. Accessibility
- [x] Screen Reader Support
- [x] Keyboard Navigation
- [x] High Contrast Mode
- [ ] Voice Control
- [ ] Sign Language Videos
- [ ] Easy Read Mode
- [ ] Dyslexia Font
- [ ] Cognitive Assistance

### 🌐 PLATFORM FEATURES

#### 32. API & Integrations
- [x] RESTful API
- [x] GraphQL Endpoint
- [x] Webhook System
- [ ] SDK (JS/TS)
- [ ] Zapier Integration
- [ ] IFTTT Support
- [ ] API Marketplace
- [ ] Custom Integrations

#### 33. Performance
- [x] CDN Integration
- [x] Image Optimization
- [x] Lazy Loading
- [ ] WebAssembly Modules
- [ ] Service Worker
- [ ] Progressive Enhancement
- [ ] Resource Hints
- [ ] Critical CSS

#### 34. Developer Tools
- [ ] CLI Tool
- [ ] Local Development
- [ ] Staging Environment
- [ ] API Playground
- [ ] Debug Mode
- [ ] Performance Profiler
- [ ] A/B Testing Framework
- [ ] Feature Flags

### 🎯 MASTER CONTROL FEATURES

#### 35. Platform Management
- [x] Tenant Overview
- [x] Global Analytics
- [x] System Monitoring
- [ ] Feature Control
- [ ] Billing Management
- [ ] Support Tickets
- [ ] Announcement System
- [ ] Migration Tools

#### 36. AI Training & Optimization
- [ ] Model Management
- [ ] Training Pipeline
- [ ] A/B Test Results
- [ ] Performance Metrics
- [ ] Data Labeling
- [ ] Feedback Loop
- [ ] Model Versioning
- [ ] Experiment Tracking

---

## 📈 IMPLEMENTIERUNGSSTATUS

### Phase Übersicht
```
Phase 1 (Core):          ████████████████████ 100%
Phase 2 (Orders):        ████████████████████ 100%
Phase 3 (Analytics):     ████████████████████ 100%
Phase 4 (Enhancement):   ████████████████████ 100%
Phase 5 (Innovation):    ███████████████░░░░░ 75%
-------------------------------------------------
GESAMT:                  █████████████████░░░ 85%
```

### Detaillierter Status Phase 5

#### ✅ Bereits implementiert:
1. **Master Control Base** (`/apps/master/`)
   - Login System
   - Dashboard
   - Navigation
   - Tenant Overview

2. **Komponenten** (`/apps/master/src/`)
   - NotificationCenter
   - ReviewTracker  
   - PreOrderManager
   - CalendarManager
   - TenantControl

3. **Event System** (Teilweise)
   - Event Model
   - Basic CRUD
   - Calendar Integration

#### 🚧 In Arbeit:
1. **KI-System Core**
   - OpenAI Integration
   - Notfall-KI Logic
   - Price Optimization
   - Demand Forecasting

2. **Voice Commerce**
   - Web Speech API
   - Wake Word Detection
   - Multi-Language Support

3. **CMS & Themes**
   - Theme Builder UI
   - Menu Designer
   - Print Support

#### ⬜ Noch zu implementieren:
1. **Feature Flag System**
2. **System Monitoring Dashboard**
3. **Blockchain Integration**
4. **Edge Computing**
5. **Advanced Event Features**

---

## 🔌 API DOKUMENTATION

### REST API Endpoints

#### Authentication
```typescript
POST   /api/auth/login
POST   /api/auth/logout  
POST   /api/auth/refresh
POST   /api/auth/verify-phone
POST   /api/auth/verify-otp
GET    /api/auth/me
```

#### Tenants
```typescript
GET    /api/tenants
GET    /api/tenants/:id
POST   /api/tenants
PUT    /api/tenants/:id
DELETE /api/tenants/:id
GET    /api/tenants/:id/stats
POST   /api/tenants/:id/upload-logo
```

#### Products
```typescript
GET    /api/tenants/:tenantId/products
GET    /api/tenants/:tenantId/products/:id
POST   /api/tenants/:tenantId/products
PUT    /api/tenants/:tenantId/products/:id
DELETE /api/tenants/:tenantId/products/:id
POST   /api/tenants/:tenantId/products/:id/duplicate
PATCH  /api/tenants/:tenantId/products/:id/availability
POST   /api/tenants/:tenantId/products/bulk-update
POST   /api/tenants/:tenantId/products/import
```

#### Orders
```typescript
GET    /api/tenants/:tenantId/orders
GET    /api/tenants/:tenantId/orders/:id
POST   /api/tenants/:tenantId/orders
PUT    /api/tenants/:tenantId/orders/:id
PATCH  /api/tenants/:tenantId/orders/:id/status
POST   /api/tenants/:tenantId/orders/:id/refund
GET    /api/tenants/:tenantId/orders/:id/receipt
POST   /api/tenants/:tenantId/orders/:id/resend-notification
```

#### Analytics
```typescript
GET    /api/tenants/:tenantId/analytics/overview
GET    /api/tenants/:tenantId/analytics/revenue
GET    /api/tenants/:tenantId/analytics/products
GET    /api/tenants/:tenantId/analytics/customers
GET    /api/tenants/:tenantId/analytics/trends
GET    /api/tenants/:tenantId/analytics/predictions
POST   /api/tenants/:tenantId/analytics/export
```

#### AI Endpoints
```typescript
POST   /api/ai/emergency-mode
POST   /api/ai/price-optimization
POST   /api/ai/demand-forecast
POST   /api/ai/menu-suggestions
POST   /api/ai/wait-time-prediction
POST   /api/ai/voice-order
GET    /api/ai/insights/:tenantId
```

### GraphQL Schema

```graphql
type Query {
  # Tenant Queries
  tenant(id: ID!): Tenant
  tenants(filter: TenantFilter, limit: Int, offset: Int): TenantConnection!
  
  # Product Queries
  products(tenantId: ID!, filter: ProductFilter): [Product!]!
  product(id: ID!): Product
  
  # Order Queries
  orders(tenantId: ID!, filter: OrderFilter): OrderConnection!
  order(id: ID!): Order
  
  # Analytics Queries
  analytics(tenantId: ID!, dateRange: DateRange!): Analytics!
  predictions(tenantId: ID!): Predictions!
  
  # Event Queries
  events(filter: EventFilter): [Event!]!
  event(id: ID!): Event
}

type Mutation {
  # Tenant Mutations
  createTenant(input: CreateTenantInput!): Tenant!
  updateTenant(id: ID!, input: UpdateTenantInput!): Tenant!
  deleteTenant(id: ID!): Boolean!
  
  # Product Mutations
  createProduct(tenantId: ID!, input: CreateProductInput!): Product!
  updateProduct(id: ID!, input: UpdateProductInput!): Product!
  deleteProduct(id: ID!): Boolean!
  
  # Order Mutations
  createOrder(tenantId: ID!, input: CreateOrderInput!): Order!
  updateOrderStatus(id: ID!, status: OrderStatus!): Order!
  refundOrder(id: ID!, amount: Float): Order!
  
  # AI Mutations
  activateEmergencyMode(tenantId: ID!): EmergencyModeResult!
  optimizePrice(productId: ID!): PriceOptimizationResult!
}

type Subscription {
  # Order Subscriptions
  orderCreated(tenantId: ID!): Order!
  orderUpdated(tenantId: ID!): Order!
  
  # Live Updates
  queueUpdated(tenantId: ID!): QueueStatus!
  kitchenUpdated(tenantId: ID!): KitchenStatus!
  
  # Event Updates
  eventMetrics(eventId: ID!): EventMetrics!
}
```

### WebSocket Events

```javascript
// Client -> Server
socket.emit('join-tenant', { tenantId, role });
socket.emit('join-kitchen', { tenantId, station });
socket.emit('update-order-status', { orderId, status });
socket.emit('request-help', { type, message });

// Server -> Client
socket.on('new-order', (order) => {});
socket.on('order-updated', (order) => {});
socket.on('kitchen-alert', (alert) => {});
socket.on('wait-time-updated', (data) => {});
socket.on('emergency-activated', (mode) => {});
```

---

## 📱 PWA IMPLEMENTATION

### Service Worker Configuration
```javascript
// /apps/web/service-worker.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Aggressive Caching für statische Assets
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        maxEntries: 100,
      }),
    ],
  })
);

// Image CDN mit Optimierung
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        maxEntries: 100,
        purgeOnQuotaError: true,
      }),
      {
        // WebP/AVIF Support mit Fallback
        requestWillFetch: async ({ request }) => {
          const url = new URL(request.url);
          
          // Check browser support
          const supportsWebP = self.clients.matchAll()
            .then(clients => clients[0]?.postMessage({ type: 'CHECK_WEBP' }));
          
          if (await supportsWebP) {
            url.searchParams.set('format', 'webp');
          }
          
          return new Request(url.href, { 
            headers: request.headers 
          });
        },
      },
    ],
  })
);

// API Calls - Network First mit Offline Fallback
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 5 * 60, // 5 minutes
        maxEntries: 50,
      }),
      new BackgroundSyncPlugin('api-queue', {
        maxRetentionTime: 24 * 60, // 24 hours
      }),
    ],
  })
);

// Offline Fallback für Navigation
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigations',
    plugins: [
      {
        handlerDidError: async () => {
          return caches.match('/offline.html');
        },
      },
    ],
  })
);
registerRoute(navigationRoute);

// Background Sync für Orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      tag: data.tag,
      requireInteraction: data.priority === 'high',
      actions: data.actions || [],
      data: data.payload
    })
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view-order') {
    event.waitUntil(
      clients.openWindow(`/orders/${event.notification.data.orderId}`)
    );
  }
});
```

### Web App Manifest
```json
{
  "name": "EATECH - Foodtruck Bestellsystem",
  "short_name": "EATECH",
  "description": "Das revolutionäre Schweizer Foodtruck Bestellsystem",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#FF6B35",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "categories": ["food", "business", "productivity"],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/tablet-1.png",
      "sizes": "1366x1024",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "shortcuts": [
    {
      "name": "Neue Bestellung",
      "short_name": "Bestellen",
      "description": "Schnell eine neue Bestellung aufgeben",
      "url": "/order",
      "icons": [{ "src": "/icons/order.png", "sizes": "96x96" }]
    },
    {
      "name": "Menü",
      "short_name": "Menü",
      "description": "Speisekarte anzeigen",
      "url": "/menu",
      "icons": [{ "src": "/icons/menu.png", "sizes": "96x96" }]
    }
  ],
  "lang": "de-CH",
  "dir": "ltr",
  "scope": "/",
  "id": "ch.eatech.app",
  "prefer_related_applications": false
}
```

---

## 🔒 SECURITY & COMPLIANCE

### Schweizer Datenschutz-Konformität (DSG/DSGVO)

#### 1. Technische Maßnahmen
```javascript
// Verschlüsselung sensibler Daten
import crypto from 'crypto';

class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private secretKey = process.env.ENCRYPTION_KEY;
  
  encrypt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(data: EncryptedData): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Anonymisierung für Analytics
class AnonymizationService {
  anonymizeCustomerData(customer: Customer): AnonymizedCustomer {
    return {
      id: this.hashId(customer.id),
      age: this.generalizeAge(customer.birthdate),
      canton: customer.address.canton,
      orderCount: customer.stats.totalOrders,
      // Keine persönlichen Daten
    };
  }
  
  private hashId(id: string): string {
    return crypto
      .createHash('sha256')
      .update(id + process.env.SALT)
      .digest('hex');
  }
  
  private generalizeAge(birthdate: string): string {
    const age = calculateAge(birthdate);
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }
}
```

#### 2. GDPR Compliance Tools
```javascript
// Consent Management
class ConsentManager {
  async recordConsent(userId: string, consents: ConsentRecord) {
    await db.collection('consents').add({
      userId,
      timestamp: new Date(),
      consents: {
        necessary: true, // Always true
        analytics: consents.analytics || false,
        marketing: consents.marketing || false,
        thirdParty: consents.thirdParty || false
      },
      ipAddress: this.hashIp(request.ip),
      userAgent: request.headers['user-agent']
    });
  }
  
  async getActiveConsents(userId: string) {
    const latest = await db.collection('consents')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
      
    return latest.docs[0]?.data().consents || this.defaultConsents();
  }
}

// Data Export (Art. 20 DSGVO)
class DataExportService {
  async exportUserData(userId: string): Promise<UserDataExport> {
    const [
      profile,
      orders,
      reviews,
      loyalty,
      preferences,
      consents
    ] = await Promise.all([
      this.getProfile(userId),
      this.getOrders(userId),
      this.getReviews(userId),
      this.getLoyalty(userId),
      this.getPreferences(userId),
      this.getConsents(userId)
    ]);
    
    return {
      exportDate: new Date(),
      profile,
      orders: orders.map(o => this.sanitizeOrder(o)),
      reviews,
      loyalty,
      preferences,
      consents,
      format: 'json' // Also available as CSV, PDF
    };
  }
}

// Right to Deletion (Art. 17 DSGVO)  
class DeletionService {
  async deleteUser(userId: string, reason: string) {
    // Log deletion request
    await this.logDeletion(userId, reason);
    
    // Anonymize orders (keep for tax records)
    await this.anonymizeOrders(userId);
    
    // Delete personal data
    await Promise.all([
      db.collection('customers').doc(userId).delete(),
      db.collection('addresses').where('userId', '==', userId).delete(),
      db.collection('paymentMethods').where('userId', '==', userId).delete(),
      db.collection('preferences').doc(userId).delete()
    ]);
    
    // Delete from auth
    await admin.auth().deleteUser(userId);
    
    // Notify user
    await this.sendDeletionConfirmation(userId);
  }
}
```

#### 3. Security Headers & CSP
```javascript
// Security Headers Middleware
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(self)',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://api.eatech.ch wss://ws.eatech.ch https://o123456.ingest.sentry.io;
    frame-src 'self' https://js.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim()
};
```

---

## ⚡ PERFORMANCE OPTIMIERUNG

### 1. Image Optimization Pipeline
```javascript
// Next.js Image Component mit CDN
import Image from 'next/image';

export const OptimizedImage = ({ src, alt, ...props }) => {
  return (
    <Image
      src={src}
      alt={alt}
      loader={({ src, width, quality }) => {
        // Cloudflare Image Resizing
        const params = new URLSearchParams({
          width: width.toString(),
          quality: (quality || 85).toString(),
          format: 'auto', // WebP/AVIF wenn supported
          fit: 'cover',
          dpr: window.devicePixelRatio || 1
        });
        
        return `https://cdn.eatech.ch/cdn-cgi/image/${params}/${src}`;
      }}
      {...props}
    />
  );
};

// Responsive Images mit art direction
export const HeroImage = ({ image }) => {
  return (
    <picture>
      <source
        media="(max-width: 640px)"
        srcSet={`
          ${image.mobile}?w=640&f=avif 640w,
          ${image.mobile}?w=750&f=avif 750w,
          ${image.mobile}?w=828&f=avif 828w
        `}
        type="image/avif"
      />
      <source
        media="(max-width: 640px)"
        srcSet={`
          ${image.mobile}?w=640&f=webp 640w,
          ${image.mobile}?w=750&f=webp 750w,
          ${image.mobile}?w=828&f=webp 828w
        `}
        type="image/webp"
      />
      <source
        media="(min-width: 641px)"
        srcSet={`
          ${image.desktop}?w=1280&f=avif 1280w,
          ${image.desktop}?w=1536&f=avif 1536w,
          ${image.desktop}?w=1920&f=avif 1920w
        `}
        type="image/avif"
      />
      <img
        src={`${image.desktop}?w=1920&f=jpg`}
        alt={image.alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
};
```

### 2. Code Splitting & Lazy Loading
```javascript
// Route-based Code Splitting
const AdminDashboard = dynamic(
  () => import('@/modules/admin/Dashboard'),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false
  }
);

// Component-level Code Splitting
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  {
    loading: () => <Spinner />,
    ssr: false,
    // Preload on hover
    onLoad: () => {
      import('@/components/RelatedComponent');
    }
  }
);

// Intersection Observer für Lazy Loading
export const LazySection = ({ children, threshold = 0.1 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [threshold]);
  
  return (
    <div ref={ref}>
      {isVisible ? children : <Skeleton />}
    </div>
  );
};
```

### 3. Core Web Vitals Monitoring
```javascript
// Real User Monitoring
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

class VitalsMonitor {
  private metrics: Map<string, number> = new Map();
  
  init() {
    // Core Web Vitals
    getCLS(this.sendMetric);
    getFID(this.sendMetric);
    getLCP(this.sendMetric);
    
    // Additional metrics
    getFCP(this.sendMetric);
    getTTFB(this.sendMetric);
    
    // Custom metrics
    this.measureTimeToInteractive();
    this.measureResourceTiming();
  }
  
  private sendMetric = (metric: Metric) => {
    this.metrics.set(metric.name, metric.value);
    
    // Send to analytics
    if (window.plausible) {
      window.plausible('Web Vitals', {
        props: {
          metric: metric.name,
          value: Math.round(metric.value),
          rating: this.getRating(metric)
        }
      });
    }
    
    // Send to monitoring
    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        category: 'web-vitals',
        message: `${metric.name}: ${metric.value}`,
        level: this.getRating(metric) === 'poor' ? 'warning' : 'info',
        data: metric
      });
    }
  };
  
  private getRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      CLS: [0.1, 0.25],
      FID: [100, 300],
      LCP: [2500, 4000],
      FCP: [1800, 3000],
      TTFB: [800, 1800]
    };
    
    const [good, poor] = thresholds[metric.name] || [0, 0];
    
    if (metric.value <= good) return 'good';
    if (metric.value <= poor) return 'needs-improvement';
    return 'poor';
  }
}
```

### 4. Database Query Optimization
```javascript
// Firestore Query Optimization
class OptimizedQueries {
  // Composite Indexes für häufige Queries
  async getPopularProducts(tenantId: string, limit = 10) {
    // Index: tenantId ASC, analytics.orders DESC
    return await db
      .collection('products')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .orderBy('analytics.orders', 'desc')
      .limit(limit)
      .get();
  }
  
  // Batch Operations
  async updateMultipleProducts(updates: ProductUpdate[]) {
    const batch = db.batch();
    
    updates.forEach(update => {
      const ref = db.collection('products').doc(update.id);
      batch.update(ref, update.data);
    });
    
    await batch.commit();
  }
  
  // Pagination mit Cursor
  async getOrdersPaginated(tenantId: string, pageSize = 20, startAfter?: string) {
    let query = db
      .collection('orders')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .limit(pageSize);
      
    if (startAfter) {
      const lastDoc = await db.collection('orders').doc(startAfter).get();
      query = query.startAfter(lastDoc);
    }
    
    return await query.get();
  }
  
  // Denormalisierung für Performance
  async cacheProductAnalytics(productId: string) {
    const analytics = await this.calculateProductAnalytics(productId);
    
    // Cache in Product Document
    await db.collection('products').doc(productId).update({
      'analytics': analytics,
      'analytics.lastUpdated': FieldValue.serverTimestamp()
    });
    
    // Cache in Redis für schnellen Zugriff
    await redis.setex(
      `product:${productId}:analytics`,
      300, // 5 minutes
      JSON.stringify(analytics)
    );
  }
}
```

---

## 📝 DEVELOPMENT GUIDELINES

### 1. Code Style & Standards
```javascript
// ESLint Configuration
module.exports = {
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  rules: {
    // TypeScript
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    
    // React
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-duplicate-imports': 'error'
  }
};

// Prettier Configuration
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

### 2. Git Workflow
```bash
# Branch Naming Convention
feature/TICKET-description  # New features
bugfix/TICKET-description   # Bug fixes  
hotfix/TICKET-description   # Production hotfixes
chore/TICKET-description    # Maintenance tasks
refactor/TICKET-description # Code refactoring

# Commit Message Format
<type>(<scope>): <subject>

<body>

<footer>

# Examples:
feat(orders): add voice ordering support
fix(payment): resolve Twint integration issue
docs(api): update GraphQL schema documentation
style(ui): improve mobile responsiveness
refactor(auth): simplify token validation logic
perf(images): implement lazy loading
test(orders): add integration tests
chore(deps): update dependencies
```

### 3. Component Structure
```typescript
// Standard Component Template
import { FC, memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import styles from './ComponentName.module.css';

interface ComponentNameProps {
  required: string;
  optional?: number;
  children?: React.ReactNode;
  onAction?: (value: string) => void;
}

export const ComponentName: FC<ComponentNameProps> = memo(({
  required,
  optional = 0,
  children,
  onAction
}) => {
  const { t } = useTranslation('common');
  
  // Memoized values
  const computedValue = useMemo(() => {
    return expensiveComputation(required, optional);
  }, [required, optional]);
  
  // Callbacks
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    onAction?.(computedValue);
  }, [computedValue, onAction]);
  
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('component.title')}</h2>
      <button onClick={handleClick} className={styles.button}>
        {t('component.action')}
      </button>
      {children}
    </div>
  );
});

ComponentName.displayName = 'ComponentName';
```

### 4. File Organization
```
/apps/web/src/
├── components/          # Shared components
│   ├── common/         # Basic UI components
│   ├── forms/          # Form components
│   ├── layouts/        # Layout components
│   └── features/       # Feature-specific components
├── hooks/              # Custom React hooks
├── lib/                # External library configs
├── modules/            # Feature modules
│   ├── auth/
│   ├── orders/
│   ├── products/
│   └── analytics/
├── pages/              # Next.js pages
├── services/           # API services
├── store/              # State management
├── styles/             # Global styles
├── types/              # TypeScript types
└── utils/              # Utility functions
```

---

## 🧪 TESTING STRATEGY

### 1. Unit Tests (Jest + React Testing Library)
```javascript
// Component Test Example
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderForm } from '@/components/OrderForm';

describe('OrderForm', () => {
  const mockSubmit = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render all required fields', () => {
    render(<OrderForm onSubmit={mockSubmit} />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });
  
  it('should validate phone number format', async () => {
    const user = userEvent.setup();
    render(<OrderForm onSubmit={mockSubmit} />);
    
    const phoneInput = screen.getByLabelText(/phone/i);
    await user.type(phoneInput, '123'); // Invalid
    await user.tab(); // Trigger blur
    
    expect(screen.getByText(/invalid phone/i)).toBeInTheDocument();
  });
  
  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    render(<OrderForm onSubmit={mockSubmit} />);
    
    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/phone/i), '+41791234567');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'Test User',
        phone: '+41791234567'
      });
    });
  });
});
```

### 2. Integration Tests (Cypress)
```javascript
// E2E Test Example
describe('Customer Order Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.intercept('GET', '/api/products*', { fixture: 'products.json' });
    cy.intercept('POST', '/api/orders', { fixture: 'order-response.json' });
  });
  
  it('should complete order from menu to confirmation', () => {
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
    cy.contains('Bestellung bestätigt').should('be.visible');
    cy.contains('BP-2025-0001').should('be.visible');
  });
});
```

### 3. API Tests (Supertest)
```javascript
// API Test Example
import request from 'supertest';
import { app } from '@/server';
import { createTestTenant, createTestUser } from '@/test/factories';

describe('Orders API', () => {
  let tenant: Tenant;
  let authToken: string;
  
  beforeAll(async () => {
    tenant = await createTestTenant();
    const user = await createTestUser(tenant.id);
    authToken = await getAuthToken(user);
  });
  
  describe('POST /api/tenants/:tenantId/orders', () => {
    it('should create order with valid data', async () => {
      const orderData = {
        type: 'pickup',
        items: [{
          productId: 'prod_123',
          quantity: 2,
          modifiers: []
        }],
        customer: {
          name: 'Test User',
          phone: '+41791234567'
        }
      };
      
      const response = await request(app)
        .post(`/api/tenants/${tenant.id}/orders`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);
        
      expect(response.body).toMatchObject({
        orderNumber: expect.stringMatching(/^BP-\d{4}-\d{4}$/),
        status: 'pending',
        total: expect.any(Number)
      });
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`/api/tenants/${tenant.id}/orders`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
        
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'items',
          message: 'Items are required'
        })
      );
    });
  });
});
```

### 4. Performance Tests
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
        'categories:pwa': ['error', { minScore: 0.9 }],
        
        // Specific metrics
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

---

## 🚀 DEPLOYMENT GUIDE

### 1. Environment Setup
```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.eatech.ch
NEXT_PUBLIC_API_URL=https://api.eatech.ch

# Firebase
FIREBASE_PROJECT_ID=eatech-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@eatech-prod.iam.gserviceaccount.com

# Services
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
SENDGRID_API_KEY=SG...
OPENAI_API_KEY=sk-...

# Monitoring
SENTRY_DSN=https://...@o123456.ingest.sentry.io/...
PLAUSIBLE_DOMAIN=app.eatech.ch

# Security
ENCRYPTION_KEY=... # 32 bytes hex
JWT_SECRET=... # Random string
COOKIE_SECRET=... # Random string
```

### 2. Build & Deploy Process
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Type check
        run: npm run type-check

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build applications
        run: npm run build
        env:
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            apps/web/.next
            apps/admin/.next
            apps/master/.next

  deploy-vercel:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: build-artifacts
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-firebase:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Functions
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
          PROJECT_ID: eatech-prod
      
      - name: Deploy Firestore Rules
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only firestore:rules
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
          PROJECT_ID: eatech-prod

  post-deploy:
    needs: [deploy-vercel, deploy-firebase]
    runs-on: ubuntu-latest
    steps:
      - name: Purge CDN Cache
        run: |
          curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache" \
            -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}'
      
      - name: Run smoke tests
        run: |
          npx playwright test tests/smoke --reporter=github
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 3. Infrastructure as Code
```terraform
# infrastructure/main.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 3.0"
    }
  }
}

# Firebase Project
resource "google_project" "eatech" {
  name       = "EATECH Production"
  project_id = "eatech-prod"
  org_id     = var.org_id
}

# Enable APIs
resource "google_project_service" "firebase" {
  project = google_project.eatech.project_id
  service = "firebase.googleapis.com"
}

resource "google_project_service" "firestore" {
  project = google_project.eatech.project_id
  service = "firestore.googleapis.com"
}

# Firestore Database
resource "google_firestore_database" "main" {
  project     = google_project.eatech.project_id
  name        = "(default)"
  location_id = "eur3" # Zurich
  type        = "FIRESTORE_NATIVE"
}

# Cloud Functions
resource "google_cloudfunctions_function" "api" {
  name        = "api"
  description = "Main API endpoint"
  runtime     = "nodejs18"
  
  available_memory_mb   = 1024
  timeout               = 60
  entry_point          = "api"
  
  source_archive_bucket = google_storage_bucket.functions.name
  source_archive_object = google_storage_bucket_object.api.name
  
  trigger_http = true
  
  environment_variables = {
    NODE_ENV = "production"
  }
}

# Cloudflare Configuration
resource "cloudflare_zone" "eatech" {
  zone = "eatech.ch"
}

resource "cloudflare_record" "app" {
  zone_id = cloudflare_zone.eatech.id
  name    = "app"
  value   = var.vercel_ip
  type    = "A"
  proxied = true
}

resource "cloudflare_page_rule" "cache" {
  zone_id = cloudflare_zone.eatech.id
  target  = "*.eatech.ch/assets/*"
  
  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 2592000 # 30 days
  }
}

resource "cloudflare_firewall_rule" "rate_limit" {
  zone_id     = cloudflare_zone.eatech.id
  description = "Rate limit API"
  expression  = "(http.request.uri.path contains \"/api/\")"
  action      = "challenge"
  
  ratelimit {
    threshold = 100
    period    = 60
  }
}
```

### 4. Monitoring Setup
```javascript
// Sentry Configuration
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.cookies) {
      event.request.cookies = '[FILTERED]';
    }
    
    // Filter known issues
    if (event.exception?.values?.[0]?.type === 'NetworkError') {
      return null;
    }
    
    return event;
  },
  
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.nextRouterInstrumentation,
      tracingOrigins: ['app.eatech.ch', /^\//],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

// Custom Error Boundary
export class ErrorBoundary extends Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error);
    
    Sentry.withScope((scope) => {
      scope.setExtras(errorInfo);
      scope.setLevel('error');
      Sentry.captureException(error);
    });
    
    // Log to custom analytics
    if (window.plausible) {
      window.plausible('Error', {
        props: {
          message: error.message,
          stack: error.stack?.substring(0, 200)
        }
      });
    }
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }
    
    return this.props.children;
  }
}
```

---

## 📊 MONITORING & ANALYTICS

### 1. Real-Time Dashboard
```typescript
// Master Dashboard Metrics
interface DashboardMetrics {
  // System Health
  system: {
    uptime: number; // percentage
    responseTime: number; // ms
    errorRate: number; // percentage
    activeUsers: number;
    serverLoad: number; // percentage
  };
  
  // Business Metrics
  business: {
    ordersToday: number;
    revenueToday: number;
    averageOrderValue: number;
    conversionRate: number;
    customerSatisfaction: number;
  };
  
  // Tenant Overview
  tenants: {
    total: number;
    active: number;
    trial: number;
    churned: number;
    mrr: number; // Monthly Recurring Revenue
  };
  
  // Live Activity
  live: {
    ordersPerMinute: number;
    currentQueueLength: number;
    averageWaitTime: number;
    kitchenUtilization: number;
    peakHourPrediction: string;
  };
}

// WebSocket Real-Time Updates
const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  
  useEffect(() => {
    const socket = io('wss://ws.eatech.ch/master');
    
    socket.on('metrics:update', (data: Partial<DashboardMetrics>) => {
      setMetrics(prev => ({ ...prev, ...data }));
    });
    
    socket.on('alert:critical', (alert: Alert) => {
      toast.error(alert.message, {
        duration: Infinity,
        action: {
          label: 'Investigate',
          onClick: () => router.push(`/alerts/${alert.id}`)
        }
      });
    });
    
    return () => socket.disconnect();
  }, []);
  
  return metrics;
};
```

### 2. Analytics Pipeline
```javascript
// Event Collection
class AnalyticsCollector {
  private queue: AnalyticsEvent[] = [];
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds
  
  track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      event,
      properties: {
        ...properties,
        ...this.getDefaultProperties()
      },
      context: this.getContext()
    };
    
    this.queue.push(analyticsEvent);
    
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }
  
  private getDefaultProperties() {
    return {
      tenant_id: getCurrentTenantId(),
      user_id: getCurrentUserId(),
      session_id: getSessionId(),
      platform: 'web',
      version: APP_VERSION
    };
  }
  
  private getContext() {
    return {
      page: {
        path: window.location.pathname,
        referrer: document.referrer,
        search: window.location.search,
        title: document.title,
        url: window.location.href
      },
      device: {
        type: getDeviceType(),
        os: getOS(),
        browser: getBrowser()
      },
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
  
  private async flush() {
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      // Re-queue events on failure
      this.queue.unshift(...events);
      console.error('Failed to send analytics:', error);
    }
  }
}

// Usage
const analytics = new AnalyticsCollector();

// Track events
analytics.track('order_placed', {
  order_id: 'BP-2025-0001',
  total: 73.54,
  items_count: 3,
  payment_method: 'card'
});

analytics.track('product_viewed', {
  product_id: 'prod_123',
  product_name: 'Classic Burger',
  category: 'main',
  price: 16.90
});
```

### 3. A/B Testing Framework
```typescript
// A/B Test Configuration
interface ABTest {
  id: string;
  name: string;
  variants: Variant[];
  targeting: Targeting;
  metrics: string[];
  status: 'draft' | 'running' | 'completed';
}

interface Variant {
  id: string;
  name: string;
  weight: number; // 0-100
  changes: Record<string, any>;
}

// A/B Testing Service
class ABTestingService {
  private tests: Map<string, ABTest> = new Map();
  private assignments: Map<string, string> = new Map();
  
  async getVariant(testId: string, userId: string): Promise<Variant> {
    // Check existing assignment
    const assignmentKey = `${testId}:${userId}`;
    const existingVariant = this.assignments.get(assignmentKey);
    
    if (existingVariant) {
      return this.getVariantById(testId, existingVariant);
    }
    
    // Get test configuration
    const test = await this.getTest(testId);
    
    // Check targeting
    if (!this.matchesTargeting(test.targeting, userId)) {
      return test.variants[0]; // Control variant
    }
    
    // Assign variant
    const variant = this.assignVariant(test, userId);
    this.assignments.set(assignmentKey, variant.id);
    
    // Track assignment
    analytics.track('experiment_assigned', {
      experiment_id: testId,
      variant_id: variant.id,
      variant_name: variant.name
    });
    
    return variant;
  }
  
  private assignVariant(test: ABTest, userId: string): Variant {
    // Use consistent hashing for assignment
    const hash = this.hash(`${test.id}:${userId}`);
    const bucket = hash % 100;
    
    let cumulative = 0;
    for (const variant of test.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant;
      }
    }
    
    return test.variants[test.variants.length - 1];
  }
  
  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// React Hook for A/B Testing
export const useABTest = (testId: string) => {
  const [variant, setVariant] = useState<Variant | null>(null);
  const userId = useUserId();
  
  useEffect(() => {
    if (!userId) return;
    
    abTestingService
      .getVariant(testId, userId)
      .then(setVariant)
      .catch(console.error);
  }, [testId, userId]);
  
  return {
    variant: variant?.name || 'control',
    isLoading: !variant,
    trackConversion: (metric: string, value?: number) => {
      analytics.track('experiment_conversion', {
        experiment_id: testId,
        variant_id: variant?.id,
        metric,
        value
      });
    }
  };
};

// Usage Example
const CheckoutPage = () => {
  const { variant, trackConversion } = useABTest('checkout-flow-v2');
  
  const handleCheckout = () => {
    // Track conversion
    trackConversion('checkout_completed', orderTotal);
  };
  
  if (variant === 'one-page') {
    return <OnePageCheckout onComplete={handleCheckout} />;
  }
  
  return <MultiStepCheckout onComplete={handleCheckout} />;
};
```

### 4. Heatmap Integration
```javascript
// Heatmap Tracking
class HeatmapTracker {
  private clicks: ClickEvent[] = [];
  private scrolls: ScrollEvent[] = [];
  private moves: MouseMove[] = [];
  private sessionId = generateSessionId();
  
  init() {
    // Click tracking
    document.addEventListener('click', this.handleClick);
    
    // Scroll tracking
    document.addEventListener('scroll', this.handleScroll);
    
    // Mouse move tracking (throttled)
    document.addEventListener('mousemove', 
      throttle(this.handleMouseMove, 100)
    );
    
    // Send data periodically
    setInterval(() => this.flush(), 10000); // 10 seconds
    
    // Send on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }
  
  private handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    
    this.clicks.push({
      timestamp: Date.now(),
      x: event.pageX,
      y: event.pageY,
      element: {
        tag: target.tagName,
        id: target.id,
        className: target.className,
        text: target.innerText?.substring(0, 50)
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  };
  
  private handleScroll = throttle(() => {
    this.scrolls.push({
      timestamp: Date.now(),
      scrollY: window.scrollY,
      scrollX: window.scrollX,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight
    });
  }, 500);
  
  private handleMouseMove = (event: MouseEvent) => {
    this.moves.push({
      timestamp: Date.now(),
      x: event.pageX,
      y: event.pageY
    });
    
    // Keep only last 100 moves
    if (this.moves.length > 100) {
      this.moves = this.moves.slice(-100);
    }
  };
  
  private async flush() {
    if (this.clicks.length === 0 && 
        this.scrolls.length === 0 && 
        this.moves.length === 0) {
      return;
    }
    
    const data = {
      sessionId: this.sessionId,
      page: window.location.pathname,
      clicks: [...this.clicks],
      scrolls: [...this.scrolls],
      moves: [...this.moves]
    };
    
    // Clear arrays
    this.clicks = [];
    this.scrolls = [];
    this.moves = [];
    
    try {
      await fetch('/api/analytics/heatmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Failed to send heatmap data:', error);
    }
  }
}

// Initialize on page load
if (typeof window !== 'undefined') {
  const heatmapTracker = new HeatmapTracker();
  heatmapTracker.init();
}
```

---

## 🆘 SUPPORT & MAINTENANCE

### Support Information
- **E-Mail**: benedikt@thomma.ch
- **Telefon**: [Noch anzugeben]
- **Dokumentation**: https://docs.eatech.ch
- **Status Page**: https://status.eatech.ch

### Maintenance Schedule
- **Updates**: Dienstag 02:00-04:00 MEZ
- **Backups**: Täglich 03:00 MEZ
- **Security Patches**: Sofort bei Bedarf

### SLA (Service Level Agreement)
- **Uptime**: 99.9% (43.2 Minuten Downtime/Monat)
- **Response Time**: < 200ms (95th percentile)
- **Support Response**: < 4 Stunden (Business Hours)

---

## 📅 RELEASE NOTES

### Version 3.0.0 (Launch - 1. August 2025)
- 🎉 Initial Release
- ✅ Complete Multi-Tenant System
- ✅ PWA Implementation
- ✅ Core Features (Phase 1-4)
- ✅ Basic AI Features
- ✅ Swiss Payment Methods

### Roadmap 2025
**Q3 2025**
- Voice Commerce Launch
- Advanced AI Features
- Blockchain Integration
- 100+ Foodtrucks

**Q4 2025**
- Edge Computing
- International Expansion (AT/DE)
- Enterprise Features
- 500+ Foodtrucks

---

## 🏁 ZUSAMMENFASSUNG

EATECH V3.0 ist bereit, die Schweizer Foodtruck-Industrie zu revolutionieren. Mit 85% Fortschritt und einem klaren Weg zum Launch am 1. August 2025 sind wir auf Kurs.

### Nächste Schritte:

#### A) Bestehende Dateien aktualisieren:
1. ⬜ `/apps/admin/src/pages/Products/Products.jsx` - AI Pricing Integration
2. ⬜ `/apps/admin/src/pages/OrderManagement/OrderManagement.jsx` - Voice Order Support
3. ⬜ `/apps/admin/src/pages/Analytics/Analytics.jsx` - KI-Insights einbauen
4. ⬜ `/apps/admin/src/pages/Events/Events.jsx` - Multi-Day Support & Lageplan
5. ⬜ `/apps/master/src/pages/FeatureControl/FeatureControl.jsx` - Vollständig implementieren
6. ⬜ `/apps/master/src/pages/Dashboard.jsx` - Erweiterte Metriken
7. ⬜ `/apps/web/src/app/layout.tsx` - PWA Meta Tags & Service Worker
8. ⬜ `/packages/core/src/config/firebase.js` - Neue Collections hinzufügen

#### B) Neue Features implementieren:
1. ⬜ KI-System Core (`/packages/ai/`)
2. ⬜ Voice Commerce (`/apps/web/src/features/voice/`)
3. ⬜ Feature Flag System (`/packages/core/src/features/`)
4. ⬜ System Monitoring Dashboard (`/apps/master/src/pages/Monitoring/`)
5. ⬜ Blockchain Integration (`/packages/blockchain/`)
6. ⬜ Edge Computing Setup (`/packages/edge/`)
7. ⬜ Service Worker (`/apps/web/public/service-worker.js`)
8. ⬜ Image CDN Integration (`/packages/core/src/services/cdn/`)
9. ⬜ A/B Testing Framework (`/packages/analytics/src/ab-testing/`)
10. ⬜ Heatmap Tracking (`/packages/analytics/src/heatmap/`)

#### C) Testing & Launch:
1. ⬜ Beta Testing mit Nachbar's Foodtruck
2. ⬜ Performance Optimierung
3. ⬜ Security Audit
4. ⬜ Launch Vorbereitung

### Kontakt
**Technische Fragen & Support:**
- 📧 E-Mail: benedikt@thomma.ch
- 📱 Telefon: [Noch anzugeben]
- 💬 Discord: [Coming Soon]
- 📚 Docs: https://docs.eatech.ch

---

**🍴 EATECH - Die Zukunft des Foodtruck-Business beginnt hier!**

*Dieses Dokument wird kontinuierlich aktualisiert. Letzte Änderung: Januar 2025*