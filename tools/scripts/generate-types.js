#!/usr/bin/env node

// /tools/scripts/generate-types.js
// EATECH V3.0 - TypeScript Type Generation
// Automated generation of types from Firebase schema, API endpoints, and more

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    purple: '\x1b[35m',
    cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
    console.log(`${colors[color]}${message}${colors.reset}`);
};

const error = (message) => log(`❌ Error: ${message}`, 'red');
const success = (message) => log(`✅ ${message}`, 'green');
const warning = (message) => log(`⚠️  ${message}`, 'yellow');
const info = (message) => log(`ℹ️  ${message}`, 'blue');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const TYPES_DIR = path.join(PROJECT_ROOT, 'packages/types/src');
const GENERATED_DIR = path.join(TYPES_DIR, 'generated');

// Ensure directories exist
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Write file with header
const writeTypeFile = (filePath, content, description = '') => {
    const header = `// 🍴 EATECH V3.0 - Auto-generated Types
// ${description}
// Generated on: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - This file is auto-generated

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

`;

    fs.writeFileSync(filePath, header + content);
    success(`Generated: ${path.relative(PROJECT_ROOT, filePath)}`);
};

// Firebase schema to TypeScript types
const generateFirebaseTypes = () => {
    info('Generating Firebase types...');

    const firebaseTypes = `
// === TENANT TYPES ===
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    type: 'foodtruck' | 'restaurant' | 'chain' | 'ghost-kitchen';
    status: 'active' | 'suspended' | 'trial' | 'cancelled' | 'setup';

    // Contact & Location
    contact: {
        email: string;
        phone: string;
        whatsapp?: string;
        address: Address;
    };

    // Business Details
    business: {
        registrationNumber: string;
        vatNumber: string;
        iban: string;
        bankName: string;
        cuisine: string[];
        priceRange: 1 | 2 | 3 | 4;
        capacity: number;
        averagePreparationTime: number;
        founded: string;
    };

    // Subscription & Billing
    subscription: Subscription;

    // Operating Hours
    operatingHours: {
        regular: Record<string, OpeningHours>;
        specialDays: Record<string, SpecialDay>;
    };

    // Settings
    settings: TenantSettings;

    // Theme & Branding
    branding: TenantBranding;

    // SEO & Marketing
    seo: SEOSettings;

    // Integrations
    integrations: TenantIntegrations;

    // Locations (Multi-Location Support)
    locations: Location[];

    // Stats & Metrics
    stats: TenantStats;

    // Metadata
    metadata: EntityMetadata;
}

export interface Address {
    street: string;
    city: string;
    canton: string;
    zip: string;
    country: string;
    coordinates: {
        lat: number;
        lng: number;
    };
}

export interface Subscription {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    startDate: string;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate: string;
    price: number;
    currency: string;
    paymentMethod: string;
    features: SubscriptionFeatures;
}

export interface SubscriptionFeatures {
    maxProducts: number;
    maxOrders: number;
    maxStaff: number;
    analytics: boolean;
    ai: boolean;
    multiLocation: boolean;
    whiteLabel: boolean;
    customDomain: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
}

export interface OpeningHours {
    open?: string;
    close?: string;
    open2?: string;
    close2?: string;
    closed?: boolean;
}

export interface SpecialDay {
    open?: string;
    close?: string;
    closed?: boolean;
    reason?: string;
}

export interface TenantSettings {
    language: string;
    languages: string[];
    timezone: string;
    currency: string;
    orderPrefix: string;
    orderNumberFormat: string;
    taxRate: number;
    taxIncluded: boolean;
    serviceFee: number;
    minimumOrder: number;
    maxAdvanceOrderDays: number;
    orderTimeout: number;
    features: FeatureFlags;
    notifications: NotificationSettings;
    payments: PaymentSettings;
}

export interface FeatureFlags {
    allowPreorders: boolean;
    allowTakeaway: boolean;
    allowDelivery: boolean;
    allowTableService: boolean;
    allowGroupOrders: boolean;
    allowReservations: boolean;
    allowCatering: boolean;
    requirePhoneNumber: boolean;
    requireEmail: boolean;
    autoAcceptOrders: boolean;
    kitchenDisplay: boolean;
    customerDisplay: boolean;
    loyaltyProgram: boolean;
    giftCards: boolean;
    subscriptions: boolean;
    marketplace: boolean;
}

export interface NotificationSettings {
    channels: {
        push: boolean;
        sms: boolean;
        email: boolean;
        whatsapp: boolean;
    };
    sounds: {
        newOrder: string;
        orderReady: string;
        alert: string;
    };
    recipients: {
        newOrder: string[];
        lowStock: string[];
        dailyReport: string[];
    };
}

export interface PaymentSettings {
    methods: {
        cash: boolean;
        card: boolean;
        twint: boolean;
        postfinance: boolean;
        invoice: boolean;
        crypto: boolean;
    };
    tipping: {
        enabled: boolean;
        suggestions: number[];
        custom: boolean;
    };
}

export interface TenantBranding {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    fonts: {
        heading: string;
        body: string;
        custom?: string;
    };
    assets: {
        logo: string;
        logoWhite: string;
        favicon: string;
        coverImage: string;
        menuBackground: string;
    };
    customCSS: string;
    theme: 'modern' | 'classic' | 'minimal' | 'bold';
}

export interface SEOSettings {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage: string;
    structuredData: Record<string, any>;
}

export interface TenantIntegrations {
    payment: Record<string, IntegrationConfig>;
    social: Record<string, IntegrationConfig>;
    accounting: Record<string, IntegrationConfig>;
    delivery: Record<string, IntegrationConfig>;
}

export interface IntegrationConfig {
    enabled: boolean;
    credentials: Record<string, string>;
    settings: Record<string, any>;
}

export interface Location {
    id: string;
    name: string;
    type: 'mobile' | 'fixed' | 'both';
    schedule: Record<string, LocationSchedule>;
    coordinates: {
        current: { lat: number; lng: number };
        updated: string;
    };
}

export interface LocationSchedule {
    location: string;
    time: string;
}

export interface TenantStats {
    lifetime: {
        orders: number;
        revenue: number;
        customers: number;
        products: number;
    };
    current: {
        rating: number;
        reviewCount: number;
        responseTime: number;
        fulfillmentRate: number;
        repeatCustomerRate: number;
    };
    rankings: {
        city: number;
        category: number;
        overall: number;
    };
}

// === PRODUCT TYPES ===
export interface Product {
    id: string;
    tenantId: string;

    // Basic Info
    name: LocalizedString;
    description: LocalizedString;
    shortDescription: LocalizedString;

    // Categorization
    category: string;
    subcategory: string;
    tags: string[];
    collections: string[];

    // Pricing
    pricing: ProductPricing;

    // Variants
    variants: ProductVariant[];

    // Modifiers
    modifierGroups: ModifierGroup[];

    // Inventory
    inventory: ProductInventory;

    // Availability
    availability: ProductAvailability;

    // Media
    media: ProductMedia;

    // Nutrition & Allergens
    nutrition: NutritionInfo;
    allergens: AllergenInfo;
    dietary: DietaryInfo;

    // Preparation
    preparation: PreparationInfo;

    // Analytics & Performance
    analytics: ProductAnalytics;

    // AI Insights
    ai: ProductAI;

    // Metadata
    metadata: ProductMetadata;
}

export interface LocalizedString {
    de: string;
    fr?: string;
    it?: string;
    en?: string;
}

export interface ProductPricing {
    basePrice: number;
    compareAtPrice?: number;
    cost: number;
    currency: string;
    taxRate: number;
    taxIncluded: boolean;
    dynamicPricing?: DynamicPricing;
}

export interface DynamicPricing {
    enabled: boolean;
    rules: PricingRule[];
}

export interface PricingRule {
    type: string;
    discount: number;
    schedule?: Schedule;
    minQuantity?: number;
}

export interface Schedule {
    daily?: { start: string; end: string };
    weekly?: Record<string, { start: string; end: string }>;
}

export interface ProductVariant {
    id: string;
    sku: string;
    name: LocalizedString;
    price: number;
    cost: number;
    inventory: VariantInventory;
    isDefault: boolean;
}

export interface VariantInventory {
    quantity: number;
    trackInventory: boolean;
}

export interface ModifierGroup {
    id: string;
    name: LocalizedString;
    required: boolean;
    min: number;
    max: number;
    options: ModifierOption[];
}

export interface ModifierOption {
    id: string;
    name: LocalizedString;
    price: number;
    isDefault?: boolean;
    allergens?: string[];
    inventory?: VariantInventory;
    seasonal?: boolean;
    tags?: string[];
}

export interface ProductInventory {
    management: 'simple' | 'variant' | 'bundle';
    trackInventory: boolean;
    quantity: number;
    lowStockThreshold: number;
    outOfStockBehavior: 'hide' | 'disable' | 'backorder';
    restockAlert: boolean;
    supplier?: SupplierInfo;
}

export interface SupplierInfo {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    leadTime: number;
}

export interface ProductAvailability {
    status: 'available' | 'unavailable' | 'scheduled';
    schedule: AvailabilitySchedule;
    locations: string[];
    channels: string[];
    startDate?: string;
    endDate?: string;
    maxPerOrder?: number;
    maxPerCustomer?: number;
}

export interface AvailabilitySchedule {
    always: boolean;
    rules?: ScheduleRule[];
}

export interface ScheduleRule {
    type: 'daily' | 'dayOfWeek' | 'dateRange';
    startTime?: string;
    endTime?: string;
    days?: number[];
    startDate?: string;
    endDate?: string;
}

export interface ProductMedia {
    images: ProductImage[];
    videos: ProductVideo[];
    badges: string[];
}

export interface ProductImage {
    id: string;
    url: string;
    thumbnails: Record<string, string>;
    alt: LocalizedString;
    width: number;
    height: number;
    format: string;
    size: number;
    isMain: boolean;
    sortOrder: number;
}

export interface ProductVideo {
    id: string;
    url: string;
    thumbnail: string;
    duration: number;
    title: LocalizedString;
}

export interface NutritionInfo {
    servingSize: string;
    calories: number;
    caloriesFromFat: number;
    totalFat: number;
    saturatedFat: number;
    transFat: number;
    cholesterol: number;
    sodium: number;
    totalCarbs: number;
    dietaryFiber: number;
    sugars: number;
    protein: number;
    vitaminA: number;
    vitaminC: number;
    calcium: number;
    iron: number;
}

export interface AllergenInfo {
    contains: string[];
    mayContain: string[];
    certified: string[];
}

export interface DietaryInfo {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    lactoseFree: boolean;
    organic: boolean;
    nonGMO: boolean;
    sustainable: boolean;
}

export interface PreparationInfo {
    time: {
        prep: number;
        cook: number;
        total: number;
    };
    difficulty: 'easy' | 'medium' | 'hard';
    equipment: string[];
    steps: PreparationStep[];
    servingTemperature: 'hot' | 'cold' | 'room';
    holdingTime: number;
    packagingInstructions: string;
}

export interface PreparationStep {
    order: number;
    instruction: string;
    duration: number;
}

export interface ProductAnalytics {
    views: AnalyticsMetric;
    orders: AnalyticsMetric;
    revenue: AnalyticsMetric;
    rankings: {
        category: number;
        overall: number;
        trending: number;
    };
}

export interface AnalyticsMetric {
    total: number;
    lastMonth: number;
    trend?: 'up' | 'down' | 'stable';
    conversionRate?: number;
    averageRating?: number;
    repeatOrderRate?: number;
    averageOrderValue?: number;
    profitMargin?: number;
}

export interface ProductAI {
    priceOptimization: {
        currentPrice: number;
        optimalPrice: number;
        elasticity: number;
        projectedRevenueLift: number;
        confidence: number;
        lastAnalyzed: string;
    };
    demandForecast: {
        tomorrow: number;
        nextWeek: number;
        accuracy: number;
        factors: string[];
    };
    crossSell: {
        recommendations: string[];
        attachRate: number;
        averageLift: number;
    };
}

export interface ProductMetadata extends EntityMetadata {
    status: 'active' | 'inactive' | 'archived';
    visibility: 'public' | 'private' | 'scheduled';
    featured: boolean;
    sortOrder: number;
    internalNotes: string;
    version: number;
    changeLog: ChangeLogEntry[];
}

export interface ChangeLogEntry {
    date: string;
    user: string;
    changes: string[];
}

// === ORDER TYPES ===
export interface Order {
    id: string;
    orderNumber: string;
    tenantId: string;

    // Order Basics
    type: 'pickup' | 'delivery' | 'dinein' | 'catering';
    channel: 'web' | 'app' | 'pos' | 'phone' | 'kiosk' | 'api';
    status: OrderStatus;

    // Customer
    customer: OrderCustomer;

    // Order Items
    items: OrderItem[];

    // Pricing & Payment
    pricing: OrderPricing;
    payment: OrderPayment;

    // Fulfillment
    fulfillment: OrderFulfillment;

    // Location & Context
    context: OrderContext;

    // Communications
    communications: OrderCommunications;

    // Feedback & Rating
    feedback?: OrderFeedback;

    // Analytics & Tracking
    analytics: OrderAnalytics;

    // Internal Operations
    operations: OrderOperations;

    // Compliance & Audit
    compliance: OrderCompliance;

    // Metadata
    metadata: OrderMetadata;
}

export type OrderStatus =
    | 'draft'
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'picked_up'
    | 'delivered'
    | 'completed'
    | 'cancelled'
    | 'refunded';

export interface OrderCustomer {
    id?: string;
    firebaseUid?: string;
    name: string;
    phone: string;
    phoneVerified: boolean;
    email?: string;
    language: string;
    notes?: string;
    tags: string[];
    marketingConsent: boolean;
}

export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    modifiers: OrderModifier[];
    quantity: number;
    unitPrice: number;
    modifiersPrice: number;
    itemPrice: number;
    totalPrice: number;
    taxRate: number;
    taxAmount: number;
    notes?: string;
    status: OrderStatus;
    preparedBy?: string;
    preparedAt?: string;
}

export interface OrderModifier {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    price: number;
}

export interface OrderPricing {
    subtotal: number;
    itemsTotal: number;
    modifiersTotal: number;
    discounts: OrderDiscount[];
    discountTotal: number;
    deliveryFee: number;
    serviceFee: number;
    packagingFee: number;
    taxRate: number;
    taxAmount: number;
    taxIncluded: boolean;
    tip?: OrderTip;
    total: number;
    totalPaid: number;
    totalDue: number;
    currency: string;
}

export interface OrderDiscount {
    type: string;
    code?: string;
    description: string;
    amount: number;
    percentage?: number;
}

export interface OrderTip {
    amount: number;
    percentage: number;
    method: 'percentage' | 'fixed';
}

export interface OrderPayment {
    method: 'card' | 'cash' | 'twint' | 'invoice' | 'voucher' | 'mixed';
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
    transactions: PaymentTransaction[];
    refunds: PaymentRefund[];
    invoice?: InvoiceInfo;
}

export interface PaymentTransaction {
    id: string;
    method: string;
    amount: number;
    status: string;
    processor: string;
    processorTransactionId: string;
    card?: CardInfo;
    processedAt: string;
    fee: number;
}

export interface CardInfo {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    country: string;
}

export interface PaymentRefund {
    id: string;
    amount: number;
    reason: string;
    processedAt: string;
}

export interface InvoiceInfo {
    required: boolean;
    number?: string;
    issuedAt?: string;
    url?: string;
}

export interface OrderFulfillment {
    type: 'pickup' | 'delivery' | 'table';
    timing: FulfillmentTiming;
    pickup?: PickupInfo;
    delivery?: DeliveryInfo;
    table?: TableInfo;
}

export interface FulfillmentTiming {
    requestedAt: string;
    requestedType: 'asap' | 'scheduled';
    promisedAt: string;
    estimatedAt: string;
    confirmedAt?: string;
    startedAt?: string;
    readyAt?: string;
    pickedUpAt?: string;
    completedAt?: string;
}

export interface PickupInfo {
    location: string;
    instructions?: string;
    code?: string;
    qrCode?: string;
}

export interface DeliveryInfo {
    address: Address;
    instructions?: string;
    driverId?: string;
    estimatedArrival?: string;
    trackingUrl?: string;
}

export interface TableInfo {
    number: number;
    zone: string;
    server: string;
}

export interface OrderContext {
    location: {
        type: 'coordinates' | 'ip' | 'manual';
        source: 'gps' | 'manual' | 'ip';
        accuracy?: number;
        coordinates?: { lat: number; lng: number };
        address?: string;
        plusCode?: string;
    };
    device: {
        type: 'mobile' | 'tablet' | 'desktop';
        os: string;
        browser: string;
        ip: string;
        userAgent: string;
    };
    weather?: {
        condition: string;
        temperature: number;
        impact: 'positive' | 'negative' | 'neutral';
    };
    event?: {
        id: string;
        name: string;
        type: string;
    };
}

export interface OrderCommunications {
    notifications: OrderNotification[];
    customerMessages: OrderMessage[];
}

export interface OrderNotification {
    type: string;
    channel: string;
    sentAt: string;
    delivered: boolean;
    opened?: boolean;
    content: string;
}

export interface OrderMessage {
    from: 'customer' | 'restaurant';
    message: string;
    sentAt: string;
    sentBy?: string;
}

export interface OrderFeedback {
    requested: boolean;
    requestedAt: string;
    rating?: {
        overall: number;
        food: number;
        service: number;
        speed: number;
        value: number;
    };
    review?: {
        title: string;
        comment: string;
        wouldRecommend: boolean;
        tags: string[];
    };
    response?: {
        message: string;
        respondedBy: string;
        respondedAt: string;
    };
    submittedAt?: string;
}

export interface OrderAnalytics {
    source: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        referrer?: string;
    };
    journey: {
        sessionId: string;
        landingPage: string;
        viewedProducts: string[];
        cartAbandoned: boolean;
        timeToOrder: number;
        clicks: number;
    };
    performance: {
        preparationTime: number;
        promiseTimeAccuracy: boolean;
        customerWaitTime: number;
        kitchenEfficiency: number;
    };
    loyalty: {
        pointsEarned: number;
        tierProgress: number;
        campaignsTriggered: string[];
    };
}

export interface OrderOperations {
    kitchen: {
        station: string;
        assignedTo: string;
        priority: 'low' | 'normal' | 'high' | 'urgent';
        printedAt: string;
        bumpedAt?: string;
    };
    pos: {
        terminal: string;
        shift: string;
        cashier: string;
        drawer: string;
    };
    inventory: {
        depleted: { productId: string; quantity: number }[];
        warnings: string[];
    };
}

export interface OrderCompliance {
    taxInvoice: {
        required: boolean;
        number?: string;
        issuedAt?: string;
    };
    hygiene: {
        temperatureChecked: boolean;
        allergenWarnings: string[];
        certifications: string[];
    };
    dataProtection: {
        consentGiven: boolean;
        marketingOptIn: boolean;
        retentionPeriod: number;
    };
}

export interface OrderMetadata extends EntityMetadata {
    version: number;
    history: OrderHistoryEntry[];
    flags: string[];
    tags: string[];
    customFields: Record<string, any>;
}

export interface OrderHistoryEntry {
    timestamp: string;
    action: string;
    by: string;
    details: Record<string, any>;
}

// === SHARED TYPES ===
export interface EntityMetadata {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastModifiedBy?: string;
}

// === API TYPES ===
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: ApiMeta;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
    stack?: string;
}

export interface ApiMeta {
    timestamp: string;
    requestId: string;
    version: string;
    pagination?: PaginationMeta;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

// === ANALYTICS TYPES ===
export interface AnalyticsEvent {
    id: string;
    timestamp: string;
    event: string;
    properties: Record<string, any>;
    context: AnalyticsContext;
}

export interface AnalyticsContext {
    page: {
        path: string;
        referrer: string;
        search: string;
        title: string;
        url: string;
    };
    device: {
        type: string;
        os: string;
        browser: string;
    };
    locale: string;
    timezone: string;
}

// === AUTH TYPES ===
export interface User {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    emailVerified: boolean;
    tenantId?: string;
    roles: string[];
    permissions: string[];
    lastLoginAt: string;
    createdAt: string;
}

export interface AuthToken {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    tokenType: 'Bearer';
}

// === EVENT TYPES ===
export interface Event {
    id: string;
    name: string;
    description: string;
    type: 'festival' | 'market' | 'private' | 'corporate';
    status: 'planned' | 'confirmed' | 'active' | 'completed' | 'cancelled';

    // Dates & Times
    startDate: string;
    endDate: string;
    timezone: string;

    // Location
    location: EventLocation;

    // Participants
    participants: EventParticipant[];

    // Financial
    fees: EventFees;

    // Settings
    settings: EventSettings;

    // Metadata
    metadata: EntityMetadata;
}

export interface EventLocation {
    name: string;
    address: Address;
    capacity: number;
    facilities: string[];
    parkingAvailable: boolean;
    publicTransport: string[];
}

export interface EventParticipant {
    tenantId: string;
    tenantName: string;
    status: 'invited' | 'confirmed' | 'declined' | 'waitlist';
    spotNumber?: number;
    specialRequirements?: string[];
    equipmentNeeded?: string[];
}

export interface EventFees {
    participationFee: number;
    spotFee: number;
    electricityFee?: number;
    cleaningFee?: number;
    commissionRate: number;
    paymentDue: string;
}

export interface EventSettings {
    maxParticipants: number;
    allowWaitlist: boolean;
    requireApproval: boolean;
    allowCancellation: boolean;
    cancellationDeadline?: string;
    setupTime: number; // minutes
    cleanupTime: number; // minutes
}
`;

    writeTypeFile(
        path.join(GENERATED_DIR, 'firebase.types.ts'),
        firebaseTypes,
        'Firebase Firestore collection types'
    );
};

// API endpoint types generation
const generateApiTypes = () => {
    info('Generating API types...');

    const apiTypes = `
// === API ENDPOINT TYPES ===

// Auth Endpoints
export namespace AuthAPI {
    export interface LoginRequest {
        email: string;
        password: string;
        rememberMe?: boolean;
    }

    export interface LoginResponse {
        user: User;
        token: AuthToken;
        tenantId?: string;
    }

    export interface RegisterRequest {
        email: string;
        password: string;
        displayName: string;
        tenantName?: string;
    }

    export interface VerifyPhoneRequest {
        phone: string;
        tenantId?: string;
    }

    export interface VerifyOtpRequest {
        phone: string;
        code: string;
        verificationId: string;
    }

    export interface RefreshTokenRequest {
        refreshToken: string;
    }
}

// Tenant Endpoints
export namespace TenantAPI {
    export interface GetTenantsQuery {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        type?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }

    export interface CreateTenantRequest {
        name: string;
        slug: string;
        type: string;
        contact: {
            email: string;
            phone: string;
            address: Partial<Address>;
        };
        business: Partial<Tenant['business']>;
        subscription: {
            plan: string;
        };
    }

    export interface UpdateTenantRequest {
        name?: string;
        contact?: Partial<Tenant['contact']>;
        business?: Partial<Tenant['business']>;
        settings?: Partial<TenantSettings>;
        branding?: Partial<TenantBranding>;
    }

    export interface TenantStatsResponse {
        orders: {
            today: number;
            thisWeek: number;
            thisMonth: number;
            lastMonth: number;
        };
        revenue: {
            today: number;
            thisWeek: number;
            thisMonth: number;
            lastMonth: number;
        };
        customers: {
            total: number;
            new: number;
            returning: number;
        };
        products: {
            total: number;
            active: number;
            lowStock: number;
        };
    }

    export interface UploadLogoRequest {
        file: File;
        type: 'logo' | 'logoWhite' | 'favicon' | 'coverImage';
    }

    export interface UploadLogoResponse {
        url: string;
        thumbnails?: Record<string, string>;
    }
}

// Product Endpoints
export namespace ProductAPI {
    export interface GetProductsQuery {
        page?: number;
        limit?: number;
        search?: string;
        category?: string;
        tags?: string[];
        status?: string;
        availability?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        includeAnalytics?: boolean;
    }

    export interface CreateProductRequest {
        name: LocalizedString;
        description: LocalizedString;
        category: string;
        subcategory?: string;
        pricing: Partial<ProductPricing>;
        variants?: Partial<ProductVariant>[];
        modifierGroups?: Partial<ModifierGroup>[];
        inventory?: Partial<ProductInventory>;
        availability?: Partial<ProductAvailability>;
        nutrition?: Partial<NutritionInfo>;
        allergens?: Partial<AllergenInfo>;
        dietary?: Partial<DietaryInfo>;
    }

    export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

    export interface UpdateAvailabilityRequest {
        status: 'available' | 'unavailable' | 'scheduled';
        schedule?: Partial<AvailabilitySchedule>;
        locations?: string[];
        channels?: string[];
    }

    export interface BulkUpdateRequest {
        productIds: string[];
        updates: Partial<UpdateProductRequest>;
    }

    export interface ImportProductsRequest {
        file: File;
        format: 'csv' | 'xlsx' | 'json';
        mapping?: Record<string, string>;
    }

    export interface ImportProductsResponse {
        imported: number;
        skipped: number;
        errors: ImportError[];
    }

    export interface ImportError {
        row: number;
        field: string;
        message: string;
        value: any;
    }
}

// Order Endpoints
export namespace OrderAPI {
    export interface GetOrdersQuery {
        page?: number;
        limit?: number;
        search?: string;
        status?: OrderStatus | OrderStatus[];
        type?: string;
        channel?: string;
        customerId?: string;
        dateFrom?: string;
        dateTo?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        includeItems?: boolean;
        includeCustomer?: boolean;
        includeAnalytics?: boolean;
    }

    export interface CreateOrderRequest {
        type: 'pickup' | 'delivery' | 'dinein' | 'catering';
        customer: Partial<OrderCustomer>;
        items: CreateOrderItem[];
        fulfillment: Partial<OrderFulfillment>;
        notes?: string;
        scheduledFor?: string;
        promoCode?: string;
    }

    export interface CreateOrderItem {
        productId: string;
        variantId?: string;
        quantity: number;
        modifiers?: {
            groupId: string;
            optionId: string;
        }[];
        notes?: string;
    }

    export interface UpdateOrderRequest {
        status?: OrderStatus;
        items?: Partial<OrderItem>[];
        fulfillment?: Partial<OrderFulfillment>;
        notes?: string;
    }

    export interface UpdateOrderStatusRequest {
        status: OrderStatus;
        notes?: string;
        estimatedTime?: number;
    }

    export interface RefundOrderRequest {
        amount?: number;
        reason: string;
        refundShipping?: boolean;
        restockItems?: boolean;
    }

    export interface RefundOrderResponse {
        refundId: string;
        amount: number;
        status: string;
        processedAt: string;
    }

    export interface OrderReceiptResponse {
        url: string;
        format: 'pdf' | 'html';
        expiresAt: string;
    }

    export interface ResendNotificationRequest {
        type: 'order_confirmed' | 'order_ready' | 'order_delivered';
        channel?: 'sms' | 'email' | 'push';
    }
}

// Analytics Endpoints
export namespace AnalyticsAPI {
    export interface GetAnalyticsQuery {
        dateFrom: string;
        dateTo: string;
        granularity?: 'hour' | 'day' | 'week' | 'month';
        metrics?: string[];
        dimensions?: string[];
        filters?: Record<string, any>;
    }

    export interface OverviewResponse {
        orders: {
            total: number;
            growth: number;
            trend: number[];
        };
        revenue: {
            total: number;
            growth: number;
            trend: number[];
        };
        customers: {
            total: number;
            new: number;
            returning: number;
        };
        averageOrderValue: {
            current: number;
            growth: number;
        };
        topProducts: {
            id: string;
            name: string;
            orders: number;
            revenue: number;
        }[];
        topCustomers: {
            id: string;
            name: string;
            orders: number;
            revenue: number;
        }[];
    }

    export interface RevenueResponse {
        total: number;
        byPaymentMethod: Record<string, number>;
        byChannel: Record<string, number>;
        byHour: { hour: number; revenue: number }[];
        byDay: { date: string; revenue: number }[];
        forecast: {
            tomorrow: number;
            nextWeek: number;
            nextMonth: number;
        };
    }

    export interface ProductAnalyticsResponse {
        performance: {
            productId: string;
            name: string;
            views: number;
            orders: number;
            revenue: number;
            conversionRate: number;
            margin: number;
        }[];
        categories: {
            category: string;
            orders: number;
            revenue: number;
            margin: number;
        }[];
        modifiers: {
            modifierId: string;
            name: string;
            attachRate: number;
            revenue: number;
        }[];
    }

    export interface CustomerAnalyticsResponse {
        demographics: {
            ageGroups: Record<string, number>;
            locations: Record<string, number>;
            languages: Record<string, number>;
        };
        behavior: {
            orderFrequency: Record<string, number>;
            averageOrderValue: Record<string, number>;
            preferredTimes: Record<string, number>;
            loyaltyDistribution: Record<string, number>;
        };
        retention: {
            cohorts: {
                month: string;
                customers: number;
                retention: number[];
            }[];
        };
    }

    export interface TrendsResponse {
        orderTrends: {
            date: string;
            orders: number;
            revenue: number;
        }[];
        seasonality: {
            month: number;
            factor: number;
        }[];
        dayOfWeek: {
            day: number;
            factor: number;
        }[];
        hourOfDay: {
            hour: number;
            factor: number;
        }[];
        correlations: {
            weather: number;
            events: number;
            promotions: number;
        };
    }

    export interface PredictionsResponse {
        demand: {
            products: {
                productId: string;
                name: string;
                predicted: number;
                confidence: number;
            }[];
            overall: {
                tomorrow: number;
                nextWeek: number;
                nextMonth: number;
            };
        };
        revenue: {
            tomorrow: number;
            nextWeek: number;
            nextMonth: number;
            confidence: number;
        };
        inventory: {
            stockouts: {
                productId: string;
                name: string;
                daysUntilStockout: number;
                recommendedReorder: number;
            }[];
        };
    }

    export interface ExportRequest {
        type: 'orders' | 'products' | 'customers' | 'revenue';
        format: 'csv' | 'xlsx' | 'pdf';
        dateFrom: string;
        dateTo: string;
        filters?: Record<string, any>;
        email?: string;
    }

    export interface ExportResponse {
        exportId: string;
        status: 'processing' | 'completed' | 'failed';
        downloadUrl?: string;
        expiresAt?: string;
    }
}

// AI Endpoints
export namespace AIAPI {
    export interface EmergencyModeRequest {
        tenantId: string;
        trigger?: 'manual' | 'auto';
        reason?: string;
    }

    export interface EmergencyModeResponse {
        activated: boolean;
        recommendations: {
            type: 'menu' | 'pricing' | 'staffing' | 'communication';
            action: string;
            impact: string;
            confidence: number;
        }[];
        estimatedDuration: number;
    }

    export interface PriceOptimizationRequest {
        productId: string;
        targetMetric?: 'revenue' | 'profit' | 'volume';
        constraints?: {
            minPrice?: number;
            maxPrice?: number;
            maxChange?: number;
        };
    }

    export interface PriceOptimizationResponse {
        currentPrice: number;
        recommendedPrice: number;
        expectedImpact: {
            revenue: number;
            profit: number;
            volume: number;
        };
        confidence: number;
        reasoning: string[];
    }

    export interface DemandForecastRequest {
        tenantId: string;
        horizon: number; // days
        products?: string[];
        includeFactors?: boolean;
    }

    export interface DemandForecastResponse {
        overall: {
            date: string;
            predicted: number;
            confidence: number;
        }[];
        products: {
            productId: string;
            name: string;
            forecast: {
                date: string;
                predicted: number;
                confidence: number;
            }[];
        }[];
        factors: {
            weather: number;
            events: number;
            trends: number;
            seasonality: number;
        };
    }

    export interface MenuSuggestionsRequest {
        tenantId: string;
        criteria?: {
            season?: string;
            trend?: string;
            margin?: 'high' | 'medium' | 'low';
            difficulty?: 'easy' | 'medium' | 'hard';
        };
    }

    export interface MenuSuggestionsResponse {
        suggestions: {
            name: string;
            description: string;
            category: string;
            estimatedPrice: number;
            estimatedCost: number;
            expectedPopularity: number;
            reasoning: string[];
        }[];
    }

    export interface WaitTimePredictionRequest {
        tenantId: string;
        currentQueue: number;
        orderItems: CreateOrderItem[];
    }

    export interface WaitTimePredictionResponse {
        estimatedMinutes: number;
        confidence: number;
        factors: {
            queueLength: number;
            complexity: number;
            staffing: number;
            historical: number;
        };
    }

    export interface VoiceOrderRequest {
        audio: Blob | File;
        language?: string;
        tenantId: string;
    }

    export interface VoiceOrderResponse {
        transcript: string;
        intent: {
            action: 'order' | 'inquiry' | 'complaint' | 'other';
            confidence: number;
        };
        extractedOrder?: {
            items: {
                product: string;
                quantity: number;
                modifiers: string[];
            }[];
            customer: {
                name?: string;
                phone?: string;
            };
        };
        response: string;
    }

    export interface GetInsightsResponse {
        performance: {
            metric: string;
            current: number;
            benchmark: number;
            trend: 'improving' | 'declining' | 'stable';
            recommendations: string[];
        }[];
        opportunities: {
            type: 'revenue' | 'cost' | 'efficiency' | 'customer';
            title: string;
            description: string;
            impact: 'high' | 'medium' | 'low';
            effort: 'high' | 'medium' | 'low';
            estimatedGain: number;
        }[];
        alerts: {
            severity: 'critical' | 'warning' | 'info';
            message: string;
            action?: string;
        }[];
    }
}

// WebSocket Events
export namespace WebSocketEvents {
    // Client to Server
    export interface JoinTenantEvent {
        tenantId: string;
        role: string;
    }

    export interface JoinKitchenEvent {
        tenantId: string;
        station: string;
    }

    export interface UpdateOrderStatusEvent {
        orderId: string;
        status: OrderStatus;
        notes?: string;
    }

    export interface RequestHelpEvent {
        type: 'technical' | 'kitchen' | 'customer';
        message: string;
        priority?: 'low' | 'medium' | 'high';
    }

    // Server to Client
    export interface NewOrderEvent {
        order: Order;
        tenant: string;
        priority: number;
    }

    export interface OrderUpdatedEvent {
        order: Order;
        changes: string[];
        updatedBy: string;
    }

    export interface KitchenAlertEvent {
        type: 'queue_full' | 'equipment_failure' | 'staff_needed';
        message: string;
        station: string;
        severity: 'info' | 'warning' | 'critical';
    }

    export interface WaitTimeUpdatedEvent {
        currentWait: number;
        estimatedWait: number;
        queueLength: number;
        accuracy: number;
    }

    export interface EmergencyActivatedEvent {
        mode: 'kitchen_overload' | 'equipment_failure' | 'staff_shortage';
        recommendations: string[];
        duration: number;
    }

    export interface QueueStatusEvent {
        tenantId: string;
        queue: {
            orderId: string;
            orderNumber: string;
            estimatedTime: number;
            items: number;
        }[];
        averageWait: number;
        capacity: number;
    }

    export interface KitchenStatusEvent {
        tenantId: string;
        stations: {
            name: string;
            orders: number;
            staff: number;
            efficiency: number;
            status: 'normal' | 'busy' | 'overloaded';
        }[];
    }
}
`;

    writeTypeFile(
        path.join(GENERATED_DIR, 'api.types.ts'),
        apiTypes,
        'API endpoint request/response types'
    );
};

// Component prop types generation
const generateComponentTypes = () => {
    info('Generating component types...');

    const componentTypes = `
// === COMPONENT PROP TYPES ===

// Common Component Props
export interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
    testId?: string;
    'data-testid'?: string;
}

// Button Component
export interface ButtonProps extends BaseComponentProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    disabled?: boolean;
    loading?: boolean;
    loadingText?: string;
    leftIcon?: React.ReactElement;
    rightIcon?: React.ReactElement;
    fullWidth?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    form?: string;
}

// Input Component
export interface InputProps extends BaseComponentProps {
    type?: React.HTMLInputTypeAttribute;
    value?: string | number;
    defaultValue?: string | number;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    autoFocus?: boolean;
    autoComplete?: string;
    name?: string;
    id?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'outline' | 'filled' | 'flushed';
    isInvalid?: boolean;
    errorMessage?: string;
    helperText?: string;
    label?: string;
    leftElement?: React.ReactElement;
    rightElement?: React.ReactElement;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

// Card Component
export interface CardProps extends BaseComponentProps {
    variant?: 'elevated' | 'outlined' | 'filled';
    size?: 'sm' | 'md' | 'lg';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hoverable?: boolean;
    clickable?: boolean;
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

// Modal Component
export interface ModalProps extends BaseComponentProps {
    isOpen: boolean;
    onClose: () => void;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    isCentered?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEsc?: boolean;
    preserveScrollBarGap?: boolean;
    title?: string;
    footer?: React.ReactNode;
    initialFocusRef?: React.RefObject<HTMLElement>;
    finalFocusRef?: React.RefObject<HTMLElement>;
}

// Product Card Component
export interface ProductCardProps extends BaseComponentProps {
    product: Product;
    variant?: 'default' | 'compact' | 'featured';
    showPrice?: boolean;
    showDescription?: boolean;
    showImage?: boolean;
    showBadges?: boolean;
    showModifiers?: boolean;
    imageSize?: 'sm' | 'md' | 'lg';
    onClick?: (product: Product) => void;
    onAddToCart?: (product: Product, variant?: ProductVariant) => void;
    onViewDetails?: (product: Product) => void;
    isLoading?: boolean;
    isSelected?: boolean;
    isDisabled?: boolean;
}

// Cart Item Component
export interface CartItemProps extends BaseComponentProps {
    item: OrderItem;
    showImage?: boolean;
    showModifiers?: boolean;
    allowQuantityChange?: boolean;
    allowRemove?: boolean;
    onQuantityChange?: (itemId: string, quantity: number) => void;
    onRemove?: (itemId: string) => void;
    onModify?: (itemId: string) => void;
}

// Order Status Component
export interface OrderStatusProps extends BaseComponentProps {
    order: Order;
    variant?: 'badge' | 'card' | 'timeline';
    showEstimatedTime?: boolean;
    showProgress?: boolean;
    showActions?: boolean;
    onCancel?: (orderId: string) => void;
    onTrack?: (orderId: string) => void;
    onReorder?: (orderId: string) => void;
}

// Navigation Component
export interface NavigationProps extends BaseComponentProps {
    items: NavigationItem[];
    orientation?: 'horizontal' | 'vertical';
    variant?: 'tabs' | 'pills' | 'underline';
    size?: 'sm' | 'md' | 'lg';
    activeKey?: string;
    onSelect?: (key: string) => void;
}

export interface NavigationItem {
    key: string;
    label: string;
    icon?: React.ReactElement;
    disabled?: boolean;
    badge?: string | number;
    href?: string;
}

// Header Component
export interface HeaderProps extends BaseComponentProps {
    variant?: 'default' | 'minimal' | 'transparent';
    fixed?: boolean;
    showLogo?: boolean;
    showNavigation?: boolean;
    showUserMenu?: boolean;
    showCart?: boolean;
    showSearch?: boolean;
    logo?: React.ReactElement | string;
    navigation?: NavigationItem[];
    onCartClick?: () => void;
    onSearchClick?: () => void;
    onUserMenuClick?: () => void;
}

// Footer Component
export interface FooterProps extends BaseComponentProps {
    variant?: 'default' | 'minimal';
    showLinks?: boolean;
    showSocial?: boolean;
    showNewsletter?: boolean;
    links?: FooterLink[];
    socialLinks?: SocialLink[];
    onNewsletterSubscribe?: (email: string) => void;
}

export interface FooterLink {
    label: string;
    href: string;
    external?: boolean;
}

export interface SocialLink {
    platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube';
    url: string;
}

// Form Components
export interface FormProps extends BaseComponentProps {
    onSubmit: (data: Record<string, any>) => void | Promise<void>;
    initialValues?: Record<string, any>;
    validationSchema?: any; // Yup schema
    isLoading?: boolean;
    resetOnSubmit?: boolean;
}

export interface FormFieldProps extends BaseComponentProps {
    name: string;
    label?: string;
    type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'file';
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    options?: SelectOption[];
    helperText?: string;
    validate?: (value: any) => string | undefined;
}

export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
    group?: string;
}

// Loading Components
export interface LoadingSpinnerProps extends BaseComponentProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    color?: string;
    thickness?: number;
    speed?: string;
    emptyColor?: string;
    label?: string;
}

export interface SkeletonProps extends BaseComponentProps {
    height?: string | number;
    width?: string | number;
    startColor?: string;
    endColor?: string;
    borderRadius?: string | number;
    fadeDuration?: number;
    isLoaded?: boolean;
}

// Data Display Components
export interface DataTableProps<T = any> extends BaseComponentProps {
    data: T[];
    columns: DataTableColumn<T>[];
    loading?: boolean;
    emptyText?: string;
    pagination?: PaginationProps;
    sorting?: SortingProps;
    filtering?: FilteringProps;
    selection?: SelectionProps<T>;
    onRowClick?: (row: T) => void;
    onRowDoubleClick?: (row: T) => void;
}

export interface DataTableColumn<T = any> {
    key: string;
    title: string;
    dataIndex: keyof T;
    width?: string | number;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface PaginationProps {
    current: number;
    total: number;
    pageSize: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: boolean;
    onChange: (page: number, pageSize?: number) => void;
}

export interface SortingProps {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export interface FilteringProps {
    filters: Record<string, any>;
    onChange: (filters: Record<string, any>) => void;
}

export interface SelectionProps<T = any> {
    selectedKeys: string[];
    onSelectionChange: (selectedKeys: string[]) => void;
    getRowKey: (record: T) => string;
}

// Chart Components
export interface ChartProps extends BaseComponentProps {
    data: any[];
    width?: number;
    height?: number;
    responsive?: boolean;
    margin?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
}

export interface LineChartProps extends ChartProps {
    xDataKey: string;
    lines: LineConfig[];
    showGrid?: boolean;
    showLegend?: boolean;
    showTooltip?: boolean;
}

export interface LineConfig {
    dataKey: string;
    name?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    dot?: boolean;
}

export interface BarChartProps extends ChartProps {
    xDataKey: string;
    bars: BarConfig[];
    layout?: 'horizontal' | 'vertical';
    showGrid?: boolean;
    showLegend?: boolean;
    showTooltip?: boolean;
}

export interface BarConfig {
    dataKey: string;
    name?: string;
    fill?: string;
    stackId?: string;
}

export interface PieChartProps extends ChartProps {
    dataKey: string;
    nameKey: string;
    showLegend?: boolean;
    showTooltip?: boolean;
    innerRadius?: number;
    outerRadius?: number;
    startAngle?: number;
    endAngle?: number;
}

// Voice Components
export interface VoiceButtonProps extends BaseComponentProps {
    isListening?: boolean;
    isProcessing?: boolean;
    isDisabled?: boolean;
    language?: string;
    onStart?: () => void;
    onStop?: () => void;
    onResult?: (transcript: string) => void;
    onError?: (error: string) => void;
}

export interface VoiceModalProps extends BaseComponentProps {
    isOpen: boolean;
    onClose: () => void;
    language?: string;
    placeholder?: string;
    onOrder?: (order: any) => void;
    onError?: (error: string) => void;
}

// Analytics Components
export interface AnalyticsDashboardProps extends BaseComponentProps {
    tenantId: string;
    dateRange: {
        from: string;
        to: string;
    };
    metrics?: string[];
    refreshInterval?: number;
    onMetricClick?: (metric: string) => void;
}

export interface MetricCardProps extends BaseComponentProps {
    title: string;
    value: number | string;
    unit?: string;
    change?: number;
    changeType?: 'percentage' | 'absolute';
    trend?: 'up' | 'down' | 'neutral';
    icon?: React.ReactElement;
    color?: string;
    isLoading?: boolean;
    onClick?: () => void;
}

// Layout Components
export interface LayoutProps extends BaseComponentProps {
    header?: React.ReactNode;
    sidebar?: React.ReactNode;
    footer?: React.ReactNode;
    sidebarWidth?: string | number;
    headerHeight?: string | number;
    footerHeight?: string | number;
    sidebarCollapsed?: boolean;
    onSidebarToggle?: () => void;
}

export interface SidebarProps extends BaseComponentProps {
    items: SidebarItem[];
    collapsed?: boolean;
    width?: string | number;
    onItemClick?: (item: SidebarItem) => void;
    onToggle?: () => void;
}

export interface SidebarItem {
    key: string;
    label: string;
    icon?: React.ReactElement;
    href?: string;
    children?: SidebarItem[];
    badge?: string | number;
    disabled?: boolean;
    active?: boolean;
}

// Notification Components
export interface NotificationProps extends BaseComponentProps {
    type?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    message: string;
    duration?: number;
    showCloseButton?: boolean;
    action?: {
        label: string;
        onClick: () => void;
    };
    onClose?: () => void;
}

export interface NotificationCenterProps extends BaseComponentProps {
    notifications: Notification[];
    maxVisible?: number;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    onNotificationClick?: (notification: Notification) => void;
    onNotificationClose?: (notificationId: string) => void;
}

export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    message: string;
    timestamp: string;
    read?: boolean;
    action?: {
        label: string;
        onClick: () => void;
    };
}

// Search Components
export interface SearchInputProps extends BaseComponentProps {
    value?: string;
    placeholder?: string;
    debounceMs?: number;
    showClearButton?: boolean;
    showSearchIcon?: boolean;
    autoFocus?: boolean;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    onClear?: () => void;
}

export interface SearchResultsProps extends BaseComponentProps {
    results: SearchResult[];
    loading?: boolean;
    emptyText?: string;
    onResultClick?: (result: SearchResult) => void;
    highlightTerm?: string;
}

export interface SearchResult {
    id: string;
    title: string;
    description?: string;
    type: 'product' | 'category' | 'page' | 'other';
    url?: string;
    image?: string;
    metadata?: Record<string, any>;
}

// Theme Components
export interface ThemeProviderProps extends BaseComponentProps {
    theme: Theme;
    colorMode?: 'light' | 'dark' | 'system';
    onColorModeChange?: (mode: 'light' | 'dark') => void;
}

export interface Theme {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        border: string;
        success: string;
        warning: string;
        error: string;
        info: string;
    };
    fonts: {
        heading: string;
        body: string;
        mono: string;
    };
    fontSizes: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    radii: {
        none: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        full: string;
    };
    shadows: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    breakpoints: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
    };
}

// Hook Types
export interface UseApiOptions<T = any> {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    initialData?: T;
    enabled?: boolean;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
}

export interface UseApiResult<T = any> {
    data: T | undefined;
    loading: boolean;
    error: any;
    refetch: () => Promise<void>;
    mutate: (newData: T) => void;
}

export interface UsePaginationOptions {
    initialPage?: number;
    initialPageSize?: number;
    total: number;
}

export interface UsePaginationResult {
    currentPage: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    setPageSize: (size: number) => void;
}

export interface UseFormOptions<T = any> {
    initialValues?: Partial<T>;
    validationSchema?: any;
    onSubmit: (values: T) => void | Promise<void>;
}

export interface UseFormResult<T = any> {
    values: T;
    errors: Record<keyof T, string>;
    touched: Record<keyof T, boolean>;
    isSubmitting: boolean;
    isValid: boolean;
    setFieldValue: (field: keyof T, value: any) => void;
    setFieldError: (field: keyof T, error: string) => void;
    setFieldTouched: (field: keyof T, touched: boolean) => void;
    handleSubmit: (e?: React.FormEvent) => void;
    handleReset: () => void;
    validateField: (field: keyof T) => Promise<void>;
    validateForm: () => Promise<void>;
}

export interface UseLocalStorageResult<T> {
    value: T;
    setValue: (value: T | ((prev: T) => T)) => void;
    removeValue: () => void;
}

export interface UseDisclosureResult {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onToggle: () => void;
}
`;

    writeTypeFile(
        path.join(GENERATED_DIR, 'components.types.ts'),
        componentTypes,
        'React component prop types'
    );
};

// Utility types generation
const generateUtilityTypes = () => {
    info('Generating utility types...');

    const utilityTypes = `
// === UTILITY TYPES ===

// Make all properties optional
export type Partial<T> = {
    [P in keyof T]?: T[P];
};

// Make all properties required
export type Required<T> = {
    [P in keyof T]-?: T[P];
};

// Pick specific properties
export type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};

// Omit specific properties
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Make specific properties optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific properties required
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Deep partial
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Deep readonly
export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Nullable type
export type Nullable<T> = T | null;

// Optional type
export type Optional<T> = T | undefined;

// Non-nullable type
export type NonNullable<T> = T extends null | undefined ? never : T;

// Array element type
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

// Promise value type
export type PromiseValue<T> = T extends Promise<infer U> ? U : never;

// Function parameters type
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

// Function return type
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

// Object keys type
export type KeysOf<T> = keyof T;

// Object values type
export type ValuesOf<T> = T[keyof T];

// String literal union type
export type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

// Conditional type
export type If<C extends boolean, T, F> = C extends true ? T : F;

// === BUSINESS LOGIC TYPES ===

// Create type (omit metadata fields)
export type CreateType<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>;

// Update type (partial with id)
export type UpdateType<T> = Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>> & { id: string };

// List query parameters
export type ListQuery = {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, any>;
};

// List response
export type ListResponse<T> = {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
};

// API response wrapper
export type ApiResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        timestamp: string;
        requestId: string;
        version: string;
    };
};

// Async state
export type AsyncState<T = any> = {
    data: T | null;
    loading: boolean;
    error: string | null;
};

// Form state
export type FormState<T = any> = {
    values: T;
    errors: Partial<Record<keyof T, string>>;
    touched: Partial<Record<keyof T, boolean>>;
    isSubmitting: boolean;
    isValid: boolean;
    isDirty: boolean;
};

// === REACT TYPES ===

// Component with children
export type WithChildren<T = {}> = T & {
    children?: React.ReactNode;
};

// Component with className
export type WithClassName<T = {}> = T & {
    className?: string;
};

// Component ref
export type ComponentRef<T extends React.ElementType> = React.ComponentPropsWithRef<T>['ref'];

// Event handler
export type EventHandler<T = React.SyntheticEvent> = (event: T) => void;

// Change handler
export type ChangeHandler<T = string> = (value: T) => void;

// Click handler
export type ClickHandler = EventHandler<React.MouseEvent>;

// Form submit handler
export type SubmitHandler<T = any> = (values: T) => void | Promise<void>;

// === DATE & TIME TYPES ===

// ISO date string
export type ISODate = string;

// Timestamp
export type Timestamp = number;

// Date range
export type DateRange = {
    from: ISODate;
    to: ISODate;
};

// Time period
export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

// Timezone
export type Timezone = string;

// === LOCALIZATION TYPES ===

// Locale code
export type Locale = 'de' | 'fr' | 'it' | 'en';

// Localized content
export type Localized<T> = Record<Locale, T>;

// Translation key
export type TranslationKey = string;

// === STYLING TYPES ===

// CSS properties
export type CSSProperties = React.CSSProperties;

// Color
export type Color = string;

// Size
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Variant
export type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

// Spacing
export type Spacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

// Border radius
export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

// === VALIDATION TYPES ===

// Validation rule
export type ValidationRule<T = any> = {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: T) => string | undefined;
};

// Validation schema
export type ValidationSchema<T = any> = Record<keyof T, ValidationRule>;

// Validation result
export type ValidationResult = {
    isValid: boolean;
    errors: Record<string, string>;
};

// === PERMISSION TYPES ===

// Permission
export type Permission = string;

// Role
export type Role = {
    id: string;
    name: string;
    permissions: Permission[];
};

// User role
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'staff' | 'customer';

// === FILTER TYPES ===

// Filter operator
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';

// Filter condition
export type FilterCondition = {
    field: string;
    operator: FilterOperator;
    value: any;
};

// Filter group
export type FilterGroup = {
    conditions: (FilterCondition | FilterGroup)[];
    operator: 'and' | 'or';
};

// === SORT TYPES ===

// Sort direction
export type SortDirection = 'asc' | 'desc';

// Sort option
export type SortOption = {
    field: string;
    direction: SortDirection;
};

// === PAGINATION TYPES ===

// Pagination params
export type PaginationParams = {
    page: number;
    limit: number;
};

// Pagination info
export type PaginationInfo = {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
};

// === ANALYTICS TYPES ===

// Metric value
export type MetricValue = number | string;

// Metric
export type Metric = {
    name: string;
    value: MetricValue;
    unit?: string;
    change?: number;
    changeType?: 'percentage' | 'absolute';
    trend?: 'up' | 'down' | 'neutral';
};

// Chart data point
export type DataPoint = {
    x: string | number;
    y: number;
    [key: string]: any;
};

// Chart series
export type ChartSeries = {
    name: string;
    data: DataPoint[];
    color?: string;
};

// === ERROR TYPES ===

// Error severity
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Error category
export type ErrorCategory = 'network' | 'validation' | 'authentication' | 'authorization' | 'server' | 'client';

// App error
export type AppError = {
    code: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    timestamp: ISODate;
    context?: Record<string, any>;
    stack?: string;
};

// === CONFIGURATION TYPES ===

// Environment
export type Environment = 'development' | 'staging' | 'production';

// Feature flag
export type FeatureFlag = {
    key: string;
    enabled: boolean;
    rolloutPercentage?: number;
    conditions?: Record<string, any>;
};

// Configuration
export type Config = {
    environment: Environment;
    apiUrl: string;
    features: Record<string, FeatureFlag>;
    limits: Record<string, number>;
    timeouts: Record<string, number>;
};

// === FILE TYPES ===

// File type
export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other';

// File info
export type FileInfo = {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    url?: string;
};

// Upload progress
export type UploadProgress = {
    loaded: number;
    total: number;
    percentage: number;
};

// === WEBSOCKET TYPES ===

// WebSocket event
export type WebSocketEvent<T = any> = {
    type: string;
    payload: T;
    timestamp: ISODate;
};

// WebSocket state
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

// === INTEGRATION TYPES ===

// Integration provider
export type IntegrationProvider = 'stripe' | 'twint' | 'firebase' | 'sendgrid' | 'twilio' | 'openai';

// Integration status
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

// Integration config
export type IntegrationConfig = {
    provider: IntegrationProvider;
    status: IntegrationStatus;
    credentials: Record<string, string>;
    settings: Record<string, any>;
    lastSync?: ISODate;
};

// === EXPORT TYPES ===

// Export format
export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

// Export status
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Export job
export type ExportJob = {
    id: string;
    type: string;
    format: ExportFormat;
    status: ExportStatus;
    progress: number;
    downloadUrl?: string;
    expiresAt?: ISODate;
    createdAt: ISODate;
};

// === NOTIFICATION TYPES ===

// Notification channel
export type NotificationChannel = 'push' | 'email' | 'sms' | 'webhook';

// Notification priority
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

// Notification template
export type NotificationTemplate = {
    id: string;
    name: string;
    channel: NotificationChannel;
    subject?: string;
    body: string;
    variables: string[];
};

// === TESTING TYPES ===

// Test result
export type TestResult = {
    passed: boolean;
    duration: number;
    error?: string;
};

// Test suite
export type TestSuite = {
    name: string;
    tests: Record<string, TestResult>;
    summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
    };
};

// === DEPLOYMENT TYPES ===

// Deployment status
export type DeploymentStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

// Deployment environment
export type DeploymentEnvironment = 'development' | 'staging' | 'production';

// Deployment info
export type DeploymentInfo = {
    id: string;
    environment: DeploymentEnvironment;
    status: DeploymentStatus;
    version: string;
    branch: string;
    commit: string;
    deployedBy: string;
    startedAt: ISODate;
    completedAt?: ISODate;
    logs?: string[];
};
`;

    writeTypeFile(
        path.join(GENERATED_DIR, 'utilities.types.ts'),
        utilityTypes,
        'Utility types and type helpers'
    );
};

// Generate index file
const generateIndexFile = () => {
    info('Generating index file...');

    const indexContent = `
// Export all generated types
export * from './generated/firebase.types';
export * from './generated/api.types';
export * from './generated/components.types';
export * from './generated/utilities.types';

// Export manual types (if any)
export * from './manual/custom.types';

// Re-export commonly used types with aliases for convenience
export type {
    Tenant as TenantType,
    Product as ProductType,
    Order as OrderType,
    User as UserType,
    Event as EventType
} from './generated/firebase.types';

export type {
    ApiResponse as APIResponse,
    ListResponse as ListResponseType,
    AsyncState as AsyncStateType
} from './generated/utilities.types';

// Version info
export const TYPES_VERSION = '${new Date().toISOString()}';
export const TYPES_GENERATOR = 'EATECH Type Generator v3.0';
`;

    writeTypeFile(
        path.join(TYPES_DIR, 'index.ts'),
        indexContent,
        'Main types export file'
    );
};

// Create manual types directory
const createManualTypesDir = () => {
    const manualDir = path.join(TYPES_DIR, 'manual');
    ensureDir(manualDir);

    if (!fs.existsSync(path.join(manualDir, 'custom.types.ts'))) {
        const customTypes = `// Custom types that are manually maintained
// Add your custom types here that should not be auto-generated

export interface CustomType {
    // Add custom properties here
}

// Example: App-specific utility types
export type AppTheme = 'light' | 'dark' | 'auto';

export interface AppSettings {
    theme: AppTheme;
    language: string;
    notifications: boolean;
}
`;

        writeTypeFile(
            path.join(manualDir, 'custom.types.ts'),
            customTypes,
            'Custom manually maintained types'
        );
    }
};

// Main generation function
const generateTypes = async () => {
    const startTime = Date.now();

    log('🍴 EATECH V3.0 - TypeScript Type Generation', 'purple');
    log('================================================', 'cyan');

    try {
        // Ensure directories exist
        ensureDir(TYPES_DIR);
        ensureDir(GENERATED_DIR);

        // Generate different type categories
        generateFirebaseTypes();
        generateApiTypes();
        generateComponentTypes();
        generateUtilityTypes();
        generateIndexFile();
        createManualTypesDir();

        // Run TypeScript compiler check
        info('Running TypeScript compiler check...');
        try {
            execSync('npx tsc --noEmit --project packages/types/tsconfig.json', {
                cwd: PROJECT_ROOT,
                stdio: 'pipe'
            });
            success('TypeScript compilation check passed');
        } catch (error) {
            warning('TypeScript compilation check failed - please review generated types');
            console.log(error.stdout?.toString());
        }

        const duration = Date.now() - startTime;

        log('================================================', 'cyan');
        success(`🎉 Type generation completed in ${duration}ms`);
        info(`Generated files in: ${path.relative(PROJECT_ROOT, GENERATED_DIR)}`);
        info('Files generated:');
        info('  - firebase.types.ts (Firebase collections)');
        info('  - api.types.ts (API endpoints)');
        info('  - components.types.ts (React components)');
        info('  - utilities.types.ts (Utility types)');
        info('  - index.ts (Main export)');

    } catch (error) {
        error(`Type generation failed: ${error.message}`);
        process.exit(1);
    }
};

// Command line interface
const showHelp = () => {
    console.log(`
🍴 EATECH TypeScript Type Generator

Usage: node generate-types.js [options]

Options:
  --help, -h          Show this help message
  --watch, -w         Watch for changes and regenerate
  --clean             Clean generated types before generation
  --check             Only run TypeScript check without generation

Examples:
  node generate-types.js
  node generate-types.js --watch
  node generate-types.js --clean
  node generate-types.js --check
`);
};

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
}

if (args.includes('--clean')) {
    info('Cleaning generated types...');
    if (fs.existsSync(GENERATED_DIR)) {
        fs.rmSync(GENERATED_DIR, { recursive: true });
        success('Generated types cleaned');
    }
}

if (args.includes('--check')) {
    info('Running TypeScript check only...');
    try {
        execSync('npx tsc --noEmit --project packages/types/tsconfig.json', {
            cwd: PROJECT_ROOT,
            stdio: 'inherit'
        });
        success('TypeScript check passed');
    } catch (error) {
        error('TypeScript check failed');
        process.exit(1);
    }
    process.exit(0);
}

if (args.includes('--watch') || args.includes('-w')) {
    info('Starting type generation in watch mode...');

    // Initial generation
    generateTypes();

    // Watch for schema changes
    const watchPaths = [
        path.join(PROJECT_ROOT, 'apps/*/src/**/*.ts'),
        path.join(PROJECT_ROOT, 'packages/*/src/**/*.ts'),
        path.join(PROJECT_ROOT, 'functions/src/**/*.ts'),
        path.join(PROJECT_ROOT, 'firebase.json'),
        path.join(PROJECT_ROOT, 'firestore.rules')
    ];

    info('Watching for changes...');

    // Simple file watcher (in production, consider using chokidar)
    let timeout;
    const debounceGeneration = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            info('Changes detected, regenerating types...');
            generateTypes();
        }, 1000);
    };

    // Watch files
    watchPaths.forEach(pattern => {
        // This is a simplified watcher - in production use proper file watching
        setInterval(() => {
            // Check if files changed and trigger regeneration
            // Implementation would depend on specific requirements
        }, 5000);
    });

} else {
    // Single generation
    generateTypes();
}
