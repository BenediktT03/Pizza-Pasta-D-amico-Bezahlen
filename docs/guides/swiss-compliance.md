# 🇨🇭 Swiss Compliance Guide

## Overview

This guide covers legal, regulatory, and compliance requirements for operating EATECH in Switzerland. It includes data protection (DSG/revDSG), payment regulations, food safety, accessibility standards, and language requirements.

## Table of Contents

1. [Data Protection (DSG/revDSG)](#data-protection-dsgrevdsg)
2. [Payment Compliance](#payment-compliance)
3. [Food Safety & Hygiene](#food-safety--hygiene)
4. [Language Requirements](#language-requirements)
5. [Accessibility Standards](#accessibility-standards)
6. [Tax Compliance](#tax-compliance)
7. [Consumer Protection](#consumer-protection)
8. [Employment Law](#employment-law)

## Data Protection (DSG/revDSG)

### Overview

The revised Swiss Federal Act on Data Protection (revDSG) came into effect on September 1, 2023. EATECH must comply with these regulations.

### Key Requirements

#### 1. Data Processing Principles

```typescript
// packages/core/src/compliance/data-protection.ts
export class DataProtectionService {
  // Lawfulness, good faith, and proportionality
  async validateDataCollection(purpose: string, dataFields: string[]): boolean {
    const allowedPurposes = [
      'order_processing',
      'customer_service',
      'legal_compliance',
      'legitimate_interest',
    ];
    
    if (!allowedPurposes.includes(purpose)) {
      throw new Error('Invalid data collection purpose');
    }
    
    // Check proportionality
    const requiredFields = this.getRequiredFieldsForPurpose(purpose);
    const unnecessaryFields = dataFields.filter(
      field => !requiredFields.includes(field)
    );
    
    if (unnecessaryFields.length > 0) {
      console.warn(`Unnecessary fields for ${purpose}:`, unnecessaryFields);
      return false;
    }
    
    return true;
  }
  
  private getRequiredFieldsForPurpose(purpose: string): string[] {
    const fieldMap: Record<string, string[]> = {
      order_processing: ['name', 'email', 'phone', 'delivery_address'],
      customer_service: ['name', 'email', 'order_history'],
      legal_compliance: ['name', 'email', 'transaction_records'],
      legitimate_interest: ['email', 'order_preferences'],
    };
    
    return fieldMap[purpose] || [];
  }
}
```

#### 2. Privacy by Design

```typescript
// Implement privacy by design principles
interface PrivacySettings {
  dataMinimization: boolean;
  purposeLimitation: boolean;
  storageLimit: number; // days
  encryption: boolean;
  anonymization: boolean;
}

export const defaultPrivacySettings: PrivacySettings = {
  dataMinimization: true,
  purposeLimitation: true,
  storageLimit: 730, // 2 years
  encryption: true,
  anonymization: true,
};

// User model with privacy considerations
interface User {
  id: string;
  // Required data
  email: string; // Encrypted
  
  // Optional data (with explicit consent)
  profile?: {
    name?: string;
    phone?: string;
    dateOfBirth?: Date; // Only year stored
    preferences?: UserPreferences;
  };
  
  // Consent tracking
  consent: {
    marketing: boolean;
    analytics: boolean;
    dataProcessing: boolean;
    timestamp: Date;
    ip?: string; // Anonymized
  };
  
  // Data lifecycle
  createdAt: Date;
  lastActive: Date;
  dataRetentionDate: Date;
  deletionRequested?: Date;
}
```

#### 3. User Rights Implementation

```typescript
// packages/core/src/compliance/user-rights.ts
export class UserRightsService {
  // Right to Information (Art. 25 revDSG)
  async getDataPortability(userId: string): Promise<UserDataExport> {
    const userData = await this.collectAllUserData(userId);
    
    return {
      format: 'json',
      generatedAt: new Date(),
      data: {
        profile: userData.profile,
        orders: userData.orders,
        preferences: userData.preferences,
        activityLog: userData.activityLog,
      },
      metadata: {
        purpose: 'Data portability request',
        requestId: generateRequestId(),
      },
    };
  }
  
  // Right to Rectification (Art. 32 revDSG)
  async updateUserData(
    userId: string,
    updates: Partial<User>,
    reason: string
  ): Promise<void> {
    // Validate updates
    const allowedFields = [
      'email', 'profile.name', 'profile.phone', 'preferences'
    ];
    
    // Log the change for audit
    await this.auditLog.record({
      action: 'user_data_update',
      userId,
      changes: updates,
      reason,
      timestamp: new Date(),
    });
    
    // Apply updates
    await db.collection('users').doc(userId).update(updates);
  }
  
  // Right to Deletion (Art. 32 revDSG)
  async deleteUserData(userId: string, reason: string): Promise<void> {
    // Check if deletion is allowed
    const canDelete = await this.checkDeletionEligibility(userId);
    if (!canDelete.eligible) {
      throw new Error(`Cannot delete: ${canDelete.reason}`);
    }
    
    // Start deletion process
    await this.beginDeletionProcess(userId, reason);
  }
  
  private async checkDeletionEligibility(userId: string): Promise<{
    eligible: boolean;
    reason?: string;
  }> {
    // Check for active orders
    const activeOrders = await db.collection('orders')
      .where('userId', '==', userId)
      .where('status', 'in', ['pending', 'preparing'])
      .get();
      
    if (!activeOrders.empty) {
      return { eligible: false, reason: 'Active orders exist' };
    }
    
    // Check legal retention requirements
    const lastOrder = await db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
      
    if (!lastOrder.empty) {
      const orderDate = lastOrder.docs[0].data().createdAt.toDate();
      const retentionPeriod = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
      
      if (Date.now() - orderDate.getTime() < retentionPeriod) {
        return {
          eligible: false,
          reason: 'Legal retention period not expired',
        };
      }
    }
    
    return { eligible: true };
  }
  
  private async beginDeletionProcess(userId: string, reason: string) {
    const batch = db.batch();
    
    // Anonymize orders (keep for accounting)
    const orders = await db.collection('orders')
      .where('userId', '==', userId)
      .get();
      
    orders.forEach(doc => {
      batch.update(doc.ref, {
        userId: 'DELETED',
        customerData: null,
        anonymizedAt: new Date(),
      });
    });
    
    // Delete user profile
    batch.delete(db.collection('users').doc(userId));
    
    // Delete from auth
    await admin.auth().deleteUser(userId);
    
    // Commit changes
    await batch.commit();
    
    // Log deletion
    await this.auditLog.record({
      action: 'user_deletion',
      userId: 'DELETED',
      reason,
      timestamp: new Date(),
    });
  }
}
```

#### 4. Consent Management

```typescript
// apps/web/src/components/consent/ConsentManager.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ConsentManager.module.css';

interface ConsentOptions {
  necessary: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

export const ConsentManager: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentOptions>({
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false,
  });
  
  useEffect(() => {
    const savedConsent = localStorage.getItem('cookie_consent');
    if (!savedConsent) {
      setShowBanner(true);
    }
  }, []);
  
  const handleAcceptAll = () => {
    const fullConsent: ConsentOptions = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
    };
    
    saveConsent(fullConsent);
  };
  
  const handleAcceptSelected = () => {
    saveConsent(consent);
  };
  
  const handleRejectOptional = () => {
    const minimalConsent: ConsentOptions = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
    };
    
    saveConsent(minimalConsent);
  };
  
  const saveConsent = async (consentOptions: ConsentOptions) => {
    // Save to localStorage
    localStorage.setItem('cookie_consent', JSON.stringify({
      options: consentOptions,
      timestamp: new Date().toISOString(),
      version: '1.0',
    }));
    
    // Save to backend
    await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consent: consentOptions,
        timestamp: new Date(),
        ip: 'anonymized',
      }),
    });
    
    // Apply consent choices
    applyConsentChoices(consentOptions);
    
    setShowBanner(false);
  };
  
  const applyConsentChoices = (consentOptions: ConsentOptions) => {
    // Google Analytics
    if (consentOptions.analytics) {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
      });
    } else {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'denied',
      });
    }
    
    // Marketing cookies
    if (!consentOptions.marketing) {
      // Remove marketing cookies
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.startsWith('_fb') || name.startsWith('_ga')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    }
  };
  
  if (!showBanner) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className={styles.banner}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
      >
        <div className={styles.content}>
          <h3>Datenschutz-Einstellungen</h3>
          <p>
            Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung zu bieten.
            Sie können Ihre Einstellungen jederzeit anpassen.
          </p>
          
          {!showDetails ? (
            <div className={styles.actions}>
              <button onClick={handleRejectOptional} className={styles.reject}>
                Nur notwendige
              </button>
              <button onClick={() => setShowDetails(true)} className={styles.settings}>
                Einstellungen
              </button>
              <button onClick={handleAcceptAll} className={styles.accept}>
                Alle akzeptieren
              </button>
            </div>
          ) : (
            <div className={styles.details}>
              <div className={styles.option}>
                <label>
                  <input
                    type="checkbox"
                    checked={consent.necessary}
                    disabled
                  />
                  <div>
                    <strong>Notwendige Cookies</strong>
                    <p>Erforderlich für die Grundfunktionen der Website</p>
                  </div>
                </label>
              </div>
              
              <div className={styles.option}>
                <label>
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={(e) => setConsent({
                      ...consent,
                      analytics: e.target.checked,
                    })}
                  />
                  <div>
                    <strong>Analyse-Cookies</strong>
                    <p>Helfen uns, die Website zu verbessern</p>
                  </div>
                </label>
              </div>
              
              <div className={styles.option}>
                <label>
                  <input
                    type="checkbox"
                    checked={consent.marketing}
                    onChange={(e) => setConsent({
                      ...consent,
                      marketing: e.target.checked,
                    })}
                  />
                  <div>
                    <strong>Marketing-Cookies</strong>
                    <p>Für personalisierte Werbung</p>
                  </div>
                </label>
              </div>
              
              <div className={styles.option}>
                <label>
                  <input
                    type="checkbox"
                    checked={consent.personalization}
                    onChange={(e) => setConsent({
                      ...consent,
                      personalization: e.target.checked,
                    })}
                  />
                  <div>
                    <strong>Personalisierung</strong>
                    <p>Für personalisierte Empfehlungen</p>
                  </div>
                </label>
              </div>
              
              <div className={styles.detailActions}>
                <button onClick={() => setShowDetails(false)}>Zurück</button>
                <button onClick={handleAcceptSelected} className={styles.save}>
                  Auswahl speichern
                </button>
              </div>
            </div>
          )}
          
          <div className={styles.links}>
            <a href="/privacy">Datenschutzerklärung</a>
            <a href="/cookies">Cookie-Richtlinie</a>
            <a href="/impressum">Impressum</a>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
```

### Data Breach Notification

```typescript
// packages/core/src/compliance/breach-notification.ts
export class DataBreachHandler {
  async handleDataBreach(breach: DataBreach): Promise<void> {
    // 1. Contain the breach
    await this.containBreach(breach);
    
    // 2. Assess the risk
    const riskAssessment = await this.assessRisk(breach);
    
    // 3. Document the breach
    await this.documentBreach(breach, riskAssessment);
    
    // 4. Notify authorities (within 72 hours)
    if (riskAssessment.severity === 'high') {
      await this.notifyFDPIC(breach, riskAssessment);
    }
    
    // 5. Notify affected individuals
    if (riskAssessment.requiresUserNotification) {
      await this.notifyAffectedUsers(breach);
    }
  }
  
  private async notifyFDPIC(breach: DataBreach, assessment: RiskAssessment) {
    const notification = {
      reportDate: new Date(),
      breachDate: breach.discoveredAt,
      affectedRecords: breach.affectedRecords,
      dataTypes: breach.dataTypes,
      description: breach.description,
      measures: breach.containmentMeasures,
      riskAssessment: assessment,
    };
    
    // Send to Federal Data Protection and Information Commissioner
    await sendSecureEmail('breach@edoeb.admin.ch', notification);
  }
}
```

## Payment Compliance

### Swiss Payment Regulations

#### 1. Payment Service Provider Requirements

```typescript
// Ensure compliance with Swiss Financial Market Supervisory Authority (FINMA)
interface PaymentProviderConfig {
  provider: string;
  license: string;
  finmaRegistration: string;
  dataLocation: 'switzerland' | 'eu';
  encryptionStandard: 'AES-256' | 'RSA-2048';
}

export const approvedProviders: PaymentProviderConfig[] = [
  {
    provider: 'Stripe',
    license: 'EMI_EU_2021_001',
    finmaRegistration: 'FINMA_2021_PSP_042',
    dataLocation: 'eu',
    encryptionStandard: 'AES-256',
  },
  {
    provider: 'TWINT',
    license: 'CH_PSP_2019_001',
    finmaRegistration: 'FINMA_2019_PSP_001',
    dataLocation: 'switzerland',
    encryptionStandard: 'AES-256',
  },
];
```

#### 2. Transaction Limits

```typescript
// Swiss anti-money laundering regulations
export const transactionLimits = {
  cash: {
    singleTransaction: 100000, // CHF 100,000
    requiresIdentification: 15000, // CHF 15,000
  },
  digital: {
    dailyLimit: 10000, // CHF 10,000 without additional verification
    monthlyLimit: 50000, // CHF 50,000
  },
};

export async function validateTransaction(
  amount: number,
  method: PaymentMethod,
  customerId: string
): Promise<ValidationResult> {
  // Check limits
  if (method === 'cash' && amount >= transactionLimits.cash.requiresIdentification) {
    return {
      valid: false,
      reason: 'Identification required for cash transactions over CHF 15,000',
      action: 'require_id_verification',
    };
  }
  
  // Check daily limits for digital payments
  if (method !== 'cash') {
    const dailyTotal = await getDailyTransactionTotal(customerId);
    if (dailyTotal + amount > transactionLimits.digital.dailyLimit) {
      return {
        valid: false,
        reason: 'Daily transaction limit exceeded',
        action: 'require_additional_verification',
      };
    }
  }
  
  return { valid: true };
}
```

## Food Safety & Hygiene

### Allergen Declaration

```typescript
// Mandatory allergen declaration according to Swiss food law (LGV Art. 11)
export enum Allergen {
  GLUTEN = 'gluten',           // Cereals containing gluten
  CRUSTACEANS = 'crustaceans',
  EGGS = 'eggs',
  FISH = 'fish',
  PEANUTS = 'peanuts',
  SOYBEANS = 'soybeans',
  MILK = 'milk',               // Including lactose
  NUTS = 'nuts',               // Tree nuts
  CELERY = 'celery',
  MUSTARD = 'mustard',
  SESAME = 'sesame',
  SULPHITES = 'sulphites',     // SO2 > 10 mg/kg
  LUPIN = 'lupin',
  MOLLUSCS = 'molluscs',
}

interface ProductAllergenInfo {
  contains: Allergen[];
  mayContain: Allergen[]; // Cross-contamination risk
  freeFrom: Allergen[];
}

// Product display component with allergen info
export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  return (
    <div className={styles.product}>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      
      {/* Mandatory allergen display */}
      <div className={styles.allergens}>
        {product.allergens.contains.length > 0 && (
          <div className={styles.contains}>
            <strong>Enthält:</strong>
            {product.allergens.contains.map(allergen => (
              <span key={allergen} className={styles.allergen}>
                {getAllergenName(allergen)}
              </span>
            ))}
          </div>
        )}
        
        {product.allergens.mayContain.length > 0 && (
          <div className={styles.mayContain}>
            <strong>Kann Spuren enthalten von:</strong>
            {product.allergens.mayContain.map(allergen => (
              <span key={allergen} className={styles.trace}>
                {getAllergenName(allergen)}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Nutritional information (optional but recommended) */}
      {product.nutrition && (
        <button onClick={() => showNutritionInfo(product.nutrition)}>
          Nährwertangaben
        </button>
      )}
    </div>
  );
};
```

### Origin Declaration

```typescript
// Country of origin declaration for meat (LIV Art. 16)
interface OriginInfo {
  country: string;
  region?: string;
  certifications?: string[]; // Bio, IP-Suisse, etc.
}

interface MeatProduct {
  type: 'beef' | 'pork' | 'chicken' | 'lamb' | 'fish';
  origin: OriginInfo;
  rearing?: OriginInfo; // Where animal was raised
  slaughter?: OriginInfo; // Where animal was slaughtered
}

// Display origin information
export const MeatOriginLabel: React.FC<{ meat: MeatProduct }> = ({ meat }) => {
  return (
    <div className={styles.origin}>
      <span className={styles.flag}>
        {getCountryFlag(meat.origin.country)}
      </span>
      <div className={styles.details}>
        <p>Herkunft: {meat.origin.country}</p>
        {meat.rearing && meat.rearing.country !== meat.origin.country && (
          <p>Aufzucht: {meat.rearing.country}</p>
        )}
        {meat.certifications?.map(cert => (
          <span key={cert} className={styles.certification}>
            {cert}
          </span>
        ))}
      </div>
    </div>
  );
};
```

## Language Requirements

### Multilingual Support

```typescript
// Official Swiss languages support
export const SWISS_LANGUAGES = {
  'de-CH': 'Deutsch',
  'fr-CH': 'Français',
  'it-CH': 'Italiano',
  'rm-CH': 'Rumantsch', // Romansh (optional)
  'en': 'English', // For international customers
} as const;

// Language detection and routing
export function detectUserLanguage(): string {
  // 1. Check user preference
  const savedLang = localStorage.getItem('preferred_language');
  if (savedLang && SWISS_LANGUAGES[savedLang]) return savedLang;
  
  // 2. Check browser language
  const browserLang = navigator.language;
  if (SWISS_LANGUAGES[browserLang]) return browserLang;
  
  // 3. Check location (canton-based)
  const canton = getUserCanton();
  return getCantonDefaultLanguage(canton);
}

// Canton to language mapping
function getCantonDefaultLanguage(canton: string): string {
  const cantonLanguages: Record<string, string> = {
    'ZH': 'de-CH', 'BE': 'de-CH', 'LU': 'de-CH',
    'GE': 'fr-CH', 'VD': 'fr-CH', 'NE': 'fr-CH',
    'TI': 'it-CH',
    'GR': 'de-CH', // Graubünden is multilingual
  };
  
  return cantonLanguages[canton] || 'de-CH';
}
```

### Legal Document Translations

```typescript
// All legal documents must be available in official languages
export const legalDocuments = {
  privacy: {
    'de-CH': '/legal/datenschutz',
    'fr-CH': '/legal/protection-donnees',
    'it-CH': '/legal/protezione-dati',
  },
  terms: {
    'de-CH': '/legal/agb',
    'fr-CH': '/legal/cgv',
    'it-CH': '/legal/termini',
  },
  imprint: {
    'de-CH': '/legal/impressum',
    'fr-CH': '/legal/mentions-legales',
    'it-CH': '/legal/imprint',
  },
};
```

## Accessibility Standards

### Swiss Accessibility Requirements

```typescript
// Implement Swiss eCH-0059 standard (based on WCAG 2.1 AA)
export const accessibilityChecklist = {
  // Perceivable
  textAlternatives: true,
  captions: true,
  contrast: {
    normal: 4.5, // Minimum contrast ratio
    large: 3.0,
  },
  
  // Operable
  keyboardAccess: true,
  timeouts: {
    warning: 20, // Seconds before timeout warning
    extension: 60, // Additional seconds if requested
  },
  
  // Understandable
  languageDeclaration: true,
  errorIdentification: true,
  
  // Robust
  validHTML: true,
  ariaLabels: true,
};

// Accessibility component wrapper
export const AccessibleButton: React.FC<ButtonProps> = ({
  children,
  onClick,
  ariaLabel,
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel || children?.toString()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
};
```

## Tax Compliance

### Swiss VAT Implementation

```typescript
// Swiss VAT rates as of 2024
export const VAT_RATES = {
  standard: 0.081,    // 8.1% (January 1, 2024)
  reduced: 0.026,     // 2.6% (food, non-alcoholic beverages)
  lodging: 0.038,     // 3.8% (accommodation)
  exempt: 0,          // 0% (certain services)
} as const;

export function calculateVAT(
  amount: number,
  category: ProductCategory,
  isTakeaway: boolean
): VATCalculation {
  let rate = VAT_RATES.standard;
  
  // Food and beverages
  if (category === 'food' || category === 'beverages') {
    // Different rates for eat-in vs takeaway
    rate = isTakeaway ? VAT_RATES.reduced : VAT_RATES.standard;
  }
  
  const vatAmount = amount * rate;
  const totalAmount = amount + vatAmount;
  
  return {
    netAmount: amount,
    vatRate: rate,
    vatAmount: Math.round(vatAmount * 100) / 100, // Round to cents
    grossAmount: Math.round(totalAmount * 100) / 100,
  };
}

// VAT reporting
export async function generateVATReport(
  tenantId: string,
  period: { start: Date; end: Date }
): Promise<VATReport> {
  const orders = await getOrdersForPeriod(tenantId, period);
  
  const vatByRate = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      const rate = item.vatRate;
      if (!acc[rate]) {
        acc[rate] = { net: 0, vat: 0, gross: 0 };
      }
      
      acc[rate].net += item.netAmount;
      acc[rate].vat += item.vatAmount;
      acc[rate].gross += item.grossAmount;
    });
    
    return acc;
  }, {} as Record<number, VATSummary>);
  
  return {
    period,
    tenantId,
    summary: vatByRate,
    totalVAT: Object.values(vatByRate).reduce((sum, r) => sum + r.vat, 0),
    generatedAt: new Date(),
  };
}
```

### Invoice Requirements

```typescript
// Swiss invoice requirements (MwStG Art. 26)
interface SwissInvoice {
  // Mandatory fields
  invoiceNumber: string;
  invoiceDate: Date;
  
  // Supplier information
  supplier: {
    name: string;
    address: Address;
    uid: string; // UID number (CHE-xxx.xxx.xxx)
    vatNumber?: string; // If different from UID
  };
  
  // Customer information
  customer: {
    name: string;
    address: Address;
    customerNumber?: string;
  };
  
  // Line items
  items: InvoiceItem[];
  
  // VAT summary
  vatSummary: {
    rate: number;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  }[];
  
  // Totals
  totalNet: number;
  totalVAT: number;
  totalGross: number;
  
  // Payment terms
  paymentTerms: string;
  dueDate: Date;
}

// Generate compliant invoice
export async function generateInvoice(order: Order): Promise<SwissInvoice> {
  const tenant = await getTenant(order.tenantId);
  
  return {
    invoiceNumber: generateInvoiceNumber(tenant.invoicePrefix),
    invoiceDate: new Date(),
    
    supplier: {
      name: tenant.legalName,
      address: tenant.address,
      uid: tenant.uid, // e.g., "CHE-123.456.789"
      vatNumber: tenant.vatNumber,
    },
    
    customer: {
      name: order.customer.name,
      address: order.deliveryAddress || order.customer.address,
      customerNumber: order.customer.id,
    },
    
    items: order.items.map(item => ({
      description: item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      vatRate: item.vatRate,
      netAmount: item.netAmount,
      vatAmount: item.vatAmount,
      grossAmount: item.grossAmount,
    })),
    
    vatSummary: calculateVATSummary(order.items),
    
    totalNet: order.subtotal,
    totalVAT: order.tax,
    totalGross: order.total,
    
    paymentTerms: '30 Tage netto',
    dueDate: addDays(new Date(), 30),
  };
}
```

## Consumer Protection

### Price Display Requirements

```typescript
// Prices must include all mandatory charges (PBV Art. 10)
interface PriceDisplay {
  amount: number;
  currency: 'CHF';
  includesVAT: boolean;
  includesServiceCharge: boolean;
  additionalFees?: {
    name: string;
    amount: number;
  }[];
}

export const PriceLabel: React.FC<{ price: PriceDisplay }> = ({ price }) => {
  return (
    <div className={styles.price}>
      <span className={styles.amount}>
        CHF {price.amount.toFixed(2)}
      </span>
      <span className={styles.info}>
        {price.includesVAT ? 'inkl. MwSt.' : 'exkl. MwSt.'}
        {!price.includesServiceCharge && ' + Service'}
      </span>
      {price.additionalFees && (
        <div className={styles.fees}>
          {price.additionalFees.map(fee => (
            <span key={fee.name}>
              + {fee.name}: CHF {fee.amount.toFixed(2)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Cancellation Rights

```typescript
// Online orders cancellation policy
export const cancellationPolicy = {
  // Right to cancel within reasonable time
  cancellationWindow: 30, // minutes after order
  
  // Conditions for cancellation
  canCancel: (order: Order): boolean => {
    const minutesSinceOrder = 
      (Date.now() - order.createdAt.getTime()) / 1000 / 60;
    
    return (
      minutesSinceOrder < cancellationPolicy.cancellationWindow &&
      order.status === 'pending'
    );
  },
  
  // Refund policy
  refundPolicy: {
    full: 'Before preparation starts',
    partial: 'During preparation (50%)',
    none: 'After preparation complete',
  },
};
```

## Employment Law

### Working Time Tracking

```typescript
// Swiss labor law compliance (ArG)
interface WorkingTime {
  employeeId: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  breaks: Break[];
  totalHours: number;
  overtime?: number;
}

export class WorkingTimeService {
  // Maximum daily working hours
  private readonly MAX_DAILY_HOURS = 9;
  private readonly MAX_WEEKLY_HOURS = 45; // Or 50 for certain industries
  
  async recordWorkTime(entry: WorkingTime): Promise<void> {
    // Validate working hours
    if (entry.totalHours > this.MAX_DAILY_HOURS) {
      await this.recordOvertime(entry);
    }
    
    // Check weekly limit
    const weeklyHours = await this.getWeeklyHours(
      entry.employeeId,
      entry.date
    );
    
    if (weeklyHours + entry.totalHours > this.MAX_WEEKLY_HOURS) {
      await this.alertManagement(entry.employeeId, 'Weekly limit exceeded');
    }
    
    // Store record
    await db.collection('working_time').add(entry);
  }
  
  // Mandatory break times
  validateBreaks(workingHours: number, breaks: Break[]): boolean {
    const totalBreakMinutes = breaks.reduce(
      (sum, b) => sum + b.duration,
      0
    );
    
    // Swiss law requirements
    if (workingHours > 5.5 && totalBreakMinutes < 15) return false;
    if (workingHours > 7 && totalBreakMinutes < 30) return false;
    if (workingHours > 9 && totalBreakMinutes < 60) return false;
    
    return true;
  }
}
```

## Compliance Monitoring

### Audit Trail

```typescript
// Comprehensive audit logging
export class ComplianceAuditService {
  async logComplianceEvent(event: ComplianceEvent): Promise<void> {
    const auditEntry = {
      id: generateId(),
      timestamp: new Date(),
      type: event.type,
      userId: event.userId,
      action: event.action,
      details: event.details,
      ipAddress: hashIP(event.ipAddress), // Anonymized
      userAgent: event.userAgent,
      result: event.result,
    };
    
    // Store in immutable audit log
    await db.collection('compliance_audit').add(auditEntry);
    
    // Alert on critical events
    if (event.severity === 'critical') {
      await this.alertComplianceTeam(auditEntry);
    }
  }
  
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const events = await db.collection('compliance_audit')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();
    
    return {
      period: { start: startDate, end: endDate },
      summary: this.summarizeEvents(events),
      incidents: this.identifyIncidents(events),
      recommendations: this.generateRecommendations(events),
    };
  }
}
```

### Regular Compliance Checks

```typescript
// Automated compliance monitoring
export const complianceChecks = {
  daily: [
    'checkDataRetention',
    'validatePriceDisplay',
    'auditAccessLogs',
  ],
  
  weekly: [
    'reviewConsentRecords',
    'checkEmployeeWorkingHours',
    'validateTaxCalculations',
  ],
  
  monthly: [
    'generateVATReport',
    'reviewDataSubjectRequests',
    'updateLegalDocuments',
    'securityAudit',
  ],
  
  yearly: [
    'fullComplianceAudit',
    'updatePrivacyPolicy',
    'renewCertifications',
    'employeeTraining',
  ],
};
```

## Resources & Contacts

### Regulatory Bodies

- **FDPIC** (Federal Data Protection and Information Commissioner)
  - Website: https://www.edoeb.admin.ch
  - Email: info@edoeb.admin.ch
  
- **FINMA** (Swiss Financial Market Supervisory Authority)
  - Website: https://www.finma.ch
  - Phone: +41 31 327 91 00
  
- **SECO** (State Secretariat for Economic Affairs)
  - Website: https://www.seco.admin.ch
  - Employment law inquiries
  
- **FRC** (Fédération Romande des Consommateurs)
  - Consumer protection guidance

### Legal Requirements Checklist

- [ ] Data Protection Impact Assessment (DPIA) completed
- [ ] Privacy Policy in all official languages
- [ ] Cookie consent mechanism implemented
- [ ] Data breach response plan established
- [ ] VAT registration completed
- [ ] Payment provider compliance verified
- [ ] Allergen information displayed
- [ ] Accessibility standards met (eCH-0059)
- [ ] Employee time tracking system compliant
- [ ] Regular compliance audits scheduled

---

For technical implementation details, see the [Development Guide](./getting-started.md).
