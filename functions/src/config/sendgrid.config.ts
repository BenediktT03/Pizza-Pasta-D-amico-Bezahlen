/**
 * EATECH - SendGrid Email Configuration
 * Version: 1.0.0
 * Description: SendGrid email service configuration and templates
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/config/sendgrid.config.ts
 */

import * as sgMail from '@sendgrid/mail';
import * as functions from 'firebase-functions';

// ============================================================================
// SENDGRID CONFIGURATION
// ============================================================================

/**
 * SendGrid service configuration
 */
export const SENDGRID_CONFIG = {
  // API Configuration
  apiVersion: 'v3',
  host: 'https://api.sendgrid.com',
  
  // Sender addresses
  senders: {
    noreply: {
      email: 'noreply@eatech.ch',
      name: 'EATECH'
    },
    support: {
      email: 'support@eatech.ch',
      name: 'EATECH Support'
    },
    orders: {
      email: 'orders@eatech.ch',
      name: 'EATECH Orders'
    },
    events: {
      email: 'events@eatech.ch',
      name: 'EATECH Events'
    }
  },
  
  // Reply-to addresses
  replyTo: {
    support: 'support@eatech.ch',
    sales: 'sales@eatech.ch',
    info: 'info@eatech.ch'
  },
  
  // Email categories for analytics
  categories: {
    transactional: 'transactional',
    marketing: 'marketing',
    notification: 'notification',
    system: 'system',
    report: 'report'
  },
  
  // Rate limiting
  rateLimits: {
    perSecond: 100,
    perDay: 100000
  },
  
  // Tracking settings
  tracking: {
    clickTracking: {
      enable: true,
      enableText: false
    },
    openTracking: {
      enable: true,
      substitutionTag: '%open-track%'
    },
    subscriptionTracking: {
      enable: true,
      text: 'Abmelden',
      html: '<a href="<%asm_group_unsubscribe_raw_url%>">Abmelden</a>'
    }
  },
  
  // Compliance
  compliance: {
    gdprEnabled: true,
    footerRequired: true,
    unsubscribeRequired: true
  }
};

// ============================================================================
// SENDGRID CLIENT INITIALIZATION
// ============================================================================

let sendGridClient: typeof sgMail | null = null;

/**
 * Gets or creates SendGrid client instance
 */
export function getSendGridClient(): typeof sgMail {
  if (!sendGridClient) {
    const apiKey = functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }
    
    sgMail.setApiKey(apiKey);
    sendGridClient = sgMail;
    
    functions.logger.info('SendGrid client initialized');
  }
  
  return sendGridClient;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Dynamic template IDs
 */
export const TEMPLATE_IDS = {
  // Transactional
  ORDER_CONFIRMATION: 'd-xxxxxxxxxxxxxxxxxxxxx',
  ORDER_STATUS_UPDATE: 'd-xxxxxxxxxxxxxxxxxxxxx',
  ORDER_CANCELLED: 'd-xxxxxxxxxxxxxxxxxxxxx',
  ORDER_REFUNDED: 'd-xxxxxxxxxxxxxxxxxxxxx',
  
  // Authentication
  WELCOME: 'd-xxxxxxxxxxxxxxxxxxxxx',
  PASSWORD_RESET: 'd-xxxxxxxxxxxxxxxxxxxxx',
  EMAIL_VERIFICATION: 'd-xxxxxxxxxxxxxxxxxxxxx',
  TWO_FACTOR_CODE: 'd-xxxxxxxxxxxxxxxxxxxxx',
  
  // Notifications
  PAYMENT_RECEIVED: 'd-xxxxxxxxxxxxxxxxxxxxx',
  PAYMENT_FAILED: 'd-xxxxxxxxxxxxxxxxxxxxx',
  SUBSCRIPTION_RENEWAL: 'd-xxxxxxxxxxxxxxxxxxxxx',
  SUBSCRIPTION_CANCELLED: 'd-xxxxxxxxxxxxxxxxxxxxx',
  
  // Events
  EVENT_CONFIRMATION: 'd-xxxxxxxxxxxxxxxxxxxxx',
  EVENT_REMINDER: 'd-xxxxxxxxxxxxxxxxxxxxx',
  EVENT_CANCELLED: 'd-xxxxxxxxxxxxxxxxxxxxx',
  EVENT_INVOICE: 'd-xxxxxxxxxxxxxxxxxxxxx',
  
  // Reports
  DAILY_REPORT: 'd-xxxxxxxxxxxxxxxxxxxxx',
  WEEKLY_REPORT: 'd-xxxxxxxxxxxxxxxxxxxxx',
  MONTHLY_REPORT: 'd-xxxxxxxxxxxxxxxxxxxxx',
  CUSTOM_REPORT: 'd-xxxxxxxxxxxxxxxxxxxxx',
  
  // Marketing
  NEWSLETTER: 'd-xxxxxxxxxxxxxxxxxxxxx',
  PROMOTION: 'd-xxxxxxxxxxxxxxxxxxxxx',
  SURVEY: 'd-xxxxxxxxxxxxxxxxxxxxx',
  PRODUCT_UPDATE: 'd-xxxxxxxxxxxxxxxxxxxxx'
};

/**
 * Email template data interfaces
 */
export interface OrderEmailData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
    modifiers?: string[];
  }>;
  subtotal: string;
  deliveryFee?: string;
  tax: string;
  total: string;
  deliveryAddress?: string;
  deliveryTime?: string;
  trackingUrl?: string;
  specialInstructions?: string;
  tenantInfo: {
    name: string;
    logo: string;
    address: string;
    phone: string;
    email: string;
  };
}

export interface EventEmailData {
  customerName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: {
    name: string;
    address: string;
    mapUrl?: string;
  };
  guests: number;
  menu?: Array<{
    course: string;
    items: string[];
  }>;
  totalAmount: string;
  depositAmount?: string;
  remainingBalance?: string;
  specialRequests?: string;
  contactPerson: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface ReportEmailData {
  recipientName: string;
  reportType: string;
  reportPeriod: string;
  generatedDate: string;
  summary: {
    totalRevenue: string;
    totalOrders: number;
    averageOrderValue: string;
    topProducts: Array<{
      name: string;
      quantity: number;
      revenue: string;
    }>;
  };
  downloadUrl: string;
  expiryDate: string;
}

// ============================================================================
// EMAIL BUILDER
// ============================================================================

/**
 * Base email options
 */
export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: {
    email: string;
    name: string;
  };
  replyTo?: string;
  subject?: string;
  templateId?: string;
  dynamicTemplateData?: any;
  html?: string;
  text?: string;
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: number;
  batchId?: string;
  asm?: {
    groupId: number;
    groupsToDisplay?: number[];
  };
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
    contentId?: string;
  }>;
}

/**
 * Builds SendGrid email message
 */
export function buildEmailMessage(options: EmailOptions): sgMail.MailDataRequired {
  const message: sgMail.MailDataRequired = {
    to: options.to,
    from: options.from || SENDGRID_CONFIG.senders.noreply,
    trackingSettings: SENDGRID_CONFIG.tracking
  };
  
  // Add optional fields
  if (options.cc) message.cc = options.cc;
  if (options.bcc) message.bcc = options.bcc;
  if (options.replyTo) message.replyTo = options.replyTo;
  if (options.subject) message.subject = options.subject;
  
  // Template or content
  if (options.templateId) {
    message.templateId = options.templateId;
    if (options.dynamicTemplateData) {
      message.dynamicTemplateData = options.dynamicTemplateData;
    }
  } else {
    if (options.html) message.html = options.html;
    if (options.text) message.text = options.text;
  }
  
  // Categories for analytics
  if (options.categories) {
    message.categories = options.categories;
  }
  
  // Custom arguments for webhook data
  if (options.customArgs) {
    message.customArgs = options.customArgs;
  }
  
  // Scheduled sending
  if (options.sendAt && options.sendAt > Date.now() / 1000) {
    message.sendAt = options.sendAt;
  }
  
  // Batch ID for grouped sending
  if (options.batchId) {
    message.batchId = options.batchId;
  }
  
  // Unsubscribe groups
  if (options.asm) {
    message.asm = options.asm;
  }
  
  // Attachments
  if (options.attachments) {
    message.attachments = options.attachments;
  }
  
  return message;
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Validates email address format
 */
export function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates multiple email addresses
 */
export function validateEmailAddresses(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  emails.forEach(email => {
    if (validateEmailAddress(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  });
  
  return { valid, invalid };
}

/**
 * Checks if email domain is blacklisted
 */
export function isDomainBlacklisted(email: string): boolean {
  const blacklistedDomains = [
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return blacklistedDomains.includes(domain);
}

// ============================================================================
// EMAIL CONTENT HELPERS
// ============================================================================

/**
 * Generates email footer
 */
export function generateEmailFooter(language: string = 'de'): string {
  const footers = {
    de: `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
        <p>EATECH GmbH<br>
        Musterstrasse 123<br>
        8000 Zürich, Schweiz<br>
        Tel: +41 44 123 45 67<br>
        Email: info@eatech.ch</p>
        
        <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
        
        <p><a href="{{{unsubscribe}}}">Von diesen E-Mails abmelden</a> | 
        <a href="https://eatech.ch/privacy">Datenschutzerklärung</a> | 
        <a href="https://eatech.ch/terms">AGB</a></p>
      </div>
    `,
    fr: `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
        <p>EATECH GmbH<br>
        Rue Example 123<br>
        8000 Zurich, Suisse<br>
        Tél: +41 44 123 45 67<br>
        Email: info@eatech.ch</p>
        
        <p>Cet e-mail a été généré automatiquement. Veuillez ne pas répondre directement à cet e-mail.</p>
        
        <p><a href="{{{unsubscribe}}}">Se désabonner de ces e-mails</a> | 
        <a href="https://eatech.ch/privacy">Politique de confidentialité</a> | 
        <a href="https://eatech.ch/terms">CGV</a></p>
      </div>
    `,
    it: `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
        <p>EATECH GmbH<br>
        Via Esempio 123<br>
        8000 Zurigo, Svizzera<br>
        Tel: +41 44 123 45 67<br>
        Email: info@eatech.ch</p>
        
        <p>Questa e-mail è stata generata automaticamente. Si prega di non rispondere direttamente a questa e-mail.</p>
        
        <p><a href="{{{unsubscribe}}}">Annulla l'iscrizione a queste e-mail</a> | 
        <a href="https://eatech.ch/privacy">Informativa sulla privacy</a> | 
        <a href="https://eatech.ch/terms">Termini e condizioni</a></p>
      </div>
    `,
    en: `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
        <p>EATECH GmbH<br>
        Example Street 123<br>
        8000 Zurich, Switzerland<br>
        Tel: +41 44 123 45 67<br>
        Email: info@eatech.ch</p>
        
        <p>This email was generated automatically. Please do not reply directly to this email.</p>
        
        <p><a href="{{{unsubscribe}}}">Unsubscribe from these emails</a> | 
        <a href="https://eatech.ch/privacy">Privacy Policy</a> | 
        <a href="https://eatech.ch/terms">Terms & Conditions</a></p>
      </div>
    `
  };
  
  return footers[language as keyof typeof footers] || footers.de;
}

/**
 * Generates preview text for email
 */
export function generatePreviewText(content: string, maxLength: number = 150): string {
  // Remove HTML tags
  const text = content.replace(/<[^>]*>/g, '');
  
  // Truncate to max length
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// WEBHOOK HANDLING
// ============================================================================

/**
 * Webhook event types
 */
export const WEBHOOK_EVENTS = {
  BOUNCE: 'bounce',
  DEFERRED: 'deferred',
  DELIVERED: 'delivered',
  DROPPED: 'dropped',
  PROCESSED: 'processed',
  OPEN: 'open',
  CLICK: 'click',
  SPAM_REPORT: 'spam_report',
  UNSUBSCRIBE: 'unsubscribe',
  GROUP_UNSUBSCRIBE: 'group_unsubscribe',
  GROUP_RESUBSCRIBE: 'group_resubscribe'
} as const;

/**
 * Verifies SendGrid webhook signature
 */
export function verifyWebhookSignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const crypto = require('crypto');
  const timestampPayload = timestamp + payload;
  const encoded = crypto
    .createHmac('sha256', publicKey)
    .update(timestampPayload)
    .digest('base64');
  
  return encoded === signature;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Maps SendGrid error to user-friendly message
 */
export function mapSendGridError(error: any): {
  code: string;
  message: string;
  isRetryable: boolean;
} {
  const statusCode = error.code || error.response?.status;
  
  const errorMap: Record<number, { code: string; message: string; isRetryable: boolean }> = {
    400: {
      code: 'BAD_REQUEST',
      message: 'Ungültige E-Mail-Anfrage',
      isRetryable: false
    },
    401: {
      code: 'UNAUTHORIZED',
      message: 'E-Mail-Dienst nicht autorisiert',
      isRetryable: false
    },
    403: {
      code: 'FORBIDDEN',
      message: 'E-Mail-Versand nicht erlaubt',
      isRetryable: false
    },
    413: {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'E-Mail zu groß',
      isRetryable: false
    },
    429: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Zu viele E-Mails gesendet',
      isRetryable: true
    },
    500: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'E-Mail-Server-Fehler',
      isRetryable: true
    },
    503: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'E-Mail-Dienst vorübergehend nicht verfügbar',
      isRetryable: true
    }
  };
  
  return errorMap[statusCode] || {
    code: 'EMAIL_SEND_FAILED',
    message: 'Fehler beim Senden der E-Mail',
    isRetryable: true
  };
}

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

/**
 * Email analytics data structure
 */
export interface EmailAnalytics {
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  spamReports: number;
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

/**
 * Calculates email statistics
 */
export function calculateEmailStats(events: any[]): EmailAnalytics {
  const stats = {
    sent: 0,
    delivered: 0,
    bounced: 0,
    opened: 0,
    clicked: 0,
    spamReports: 0,
    unsubscribed: 0
  };
  
  events.forEach(event => {
    switch (event.event) {
      case 'processed':
        stats.sent++;
        break;
      case 'delivered':
        stats.delivered++;
        break;
      case 'bounce':
        stats.bounced++;
        break;
      case 'open':
        stats.opened++;
        break;
      case 'click':
        stats.clicked++;
        break;
      case 'spamreport':
        stats.spamReports++;
        break;
      case 'unsubscribe':
        stats.unsubscribed++;
        break;
    }
  });
  
  return {
    ...stats,
    deliveryRate: stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0,
    openRate: stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0,
    clickRate: stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0,
    bounceRate: stats.sent > 0 ? (stats.bounced / stats.sent) * 100 : 0
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Configuration
  SENDGRID_CONFIG,
  TEMPLATE_IDS,
  WEBHOOK_EVENTS,
  
  // Client
  getSendGridClient,
  
  // Email building
  buildEmailMessage,
  
  // Validation
  validateEmailAddress,
  validateEmailAddresses,
  isDomainBlacklisted,
  
  // Content helpers
  generateEmailFooter,
  generatePreviewText,
  
  // Webhook handling
  verifyWebhookSignature,
  
  // Error handling
  mapSendGridError,
  
  // Analytics
  calculateEmailStats
};