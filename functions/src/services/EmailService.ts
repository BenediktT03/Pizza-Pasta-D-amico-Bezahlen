/**
 * EATECH Firebase Functions - Email Service
 * Version: 1.0.0
 * 
 * Email sending service using SendGrid
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/services/EmailService.ts
 */

import * as functions from 'firebase-functions';
import * as sgMail from '@sendgrid/mail';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

// Initialize SendGrid
sgMail.setApiKey(functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY || '');

// ============================================================================
// EMAIL SERVICE CLASS
// ============================================================================

export class EmailService {
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private fromEmail: string;
  private fromName: string;
  private replyTo: string;

  constructor() {
    this.fromEmail = functions.config().email?.from || 'noreply@eatech.ch';
    this.fromName = functions.config().email?.from_name || 'EATECH';
    this.replyTo = functions.config().email?.reply_to || 'support@eatech.ch';
    
    // Load email templates
    this.loadTemplates();
  }

  /**
   * Load and compile email templates
   */
  private loadTemplates() {
    const templatesDir = path.join(__dirname, '../../templates/emails');
    const templateFiles = [
      'welcome',
      'order-confirmation',
      'order-status',
      'order-ready',
      'password-reset',
      'email-verification',
      'subscription-renewal',
      'review-request',
      'newsletter',
      'low-stock-alert',
      'weekly-report'
    ];

    templateFiles.forEach(templateName => {
      try {
        const templatePath = path.join(templatesDir, `${templateName}.hbs`);
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          this.templates.set(templateName, handlebars.compile(templateContent));
        }
      } catch (error) {
        logger.error(`Failed to load email template: ${templateName}`, { error });
      }
    });

    // Register Handlebars helpers
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers() {
    handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'CHF') => {
      return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });

    handlebars.registerHelper('formatDate', (date: Date | string) => {
      return new Date(date).toLocaleDateString('de-CH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    handlebars.registerHelper('formatTime', (date: Date | string) => {
      return new Date(date).toLocaleTimeString('de-CH', {
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    handlebars.registerHelper('and', (a: any, b: any) => a && b);
    handlebars.registerHelper('or', (a: any, b: any) => a || b);
  }

  /**
   * Send email using template
   */
  private async sendEmail(params: {
    to: string | string[];
    subject: string;
    template: string;
    data: any;
    attachments?: any[];
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    categories?: string[];
    customArgs?: any;
  }): Promise<void> {
    try {
      const template = this.templates.get(params.template);
      if (!template) {
        throw new Error(`Email template not found: ${params.template}`);
      }

      const html = template(params.data);

      const msg: sgMail.MailDataRequired = {
        to: params.to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: params.subject,
        html,
        replyTo: params.replyTo || this.replyTo,
        categories: params.categories || [params.template],
        customArgs: params.customArgs,
        attachments: params.attachments,
        cc: params.cc,
        bcc: params.bcc,
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: false
          },
          openTracking: {
            enable: true
          }
        }
      };

      await sgMail.send(msg);
      
      logger.info('Email sent successfully', {
        template: params.template,
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject: params.subject
      });
    } catch (error) {
      logger.error('Failed to send email', {
        error,
        template: params.template,
        to: params.to
      });
      throw error;
    }
  }

  // ============================================================================
  // PUBLIC METHODS - USER EMAILS
  // ============================================================================

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(params: {
    to: string;
    name: string;
    data?: {
      discountCode?: string;
      validUntil?: Date;
    };
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: 'Willkommen bei EATECH! 🎉',
      template: 'welcome',
      data: {
        name: params.name,
        discountCode: params.data?.discountCode,
        validUntil: params.data?.validUntil,
        currentYear: new Date().getFullYear()
      },
      categories: ['welcome', 'transactional']
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(params: {
    to: string;
    orderNumber: string;
    items: any[];
    total: number;
    estimatedTime?: Date;
    tenantName: string;
    orderType: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Bestellung bestätigt - #${params.orderNumber}`,
      template: 'order-confirmation',
      data: {
        orderNumber: params.orderNumber,
        items: params.items,
        total: params.total,
        estimatedTime: params.estimatedTime,
        tenantName: params.tenantName,
        orderType: params.orderType,
        currentYear: new Date().getFullYear()
      },
      categories: ['order', 'transactional']
    });
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusEmail(params: {
    to: string;
    orderNumber: string;
    status: string;
    estimatedTime?: Date;
    tenantName: string;
  }): Promise<void> {
    const statusMessages: Record<string, string> = {
      confirmed: 'Deine Bestellung wurde bestätigt',
      preparing: 'Deine Bestellung wird zubereitet',
      ready: 'Deine Bestellung ist abholbereit',
      delivered: 'Deine Bestellung wurde geliefert',
      cancelled: 'Deine Bestellung wurde storniert'
    };

    await this.sendEmail({
      to: params.to,
      subject: `${statusMessages[params.status]} - #${params.orderNumber}`,
      template: 'order-status',
      data: {
        orderNumber: params.orderNumber,
        status: params.status,
        statusMessage: statusMessages[params.status],
        estimatedTime: params.estimatedTime,
        tenantName: params.tenantName,
        currentYear: new Date().getFullYear()
      },
      categories: ['order', 'transactional']
    });
  }

  /**
   * Send order ready for pickup email
   */
  async sendOrderReadyEmail(params: {
    to: string;
    orderNumber: string;
    pickupLocation: string;
    tenantName: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Bestellung bereit zur Abholung - #${params.orderNumber}`,
      template: 'order-ready',
      data: {
        orderNumber: params.orderNumber,
        pickupLocation: params.pickupLocation,
        tenantName: params.tenantName,
        currentYear: new Date().getFullYear()
      },
      categories: ['order', 'transactional']
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(params: {
    to: string;
    resetLink: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: 'Passwort zurücksetzen - EATECH',
      template: 'password-reset',
      data: {
        resetLink: params.resetLink,
        validityHours: 1,
        currentYear: new Date().getFullYear()
      },
      categories: ['auth', 'transactional']
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(params: {
    to: string;
    name: string;
    verificationLink: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: 'E-Mail-Adresse bestätigen - EATECH',
      template: 'email-verification',
      data: {
        name: params.name,
        verificationLink: params.verificationLink,
        currentYear: new Date().getFullYear()
      },
      categories: ['auth', 'transactional']
    });
  }

  // ============================================================================
  // BUSINESS EMAILS
  // ============================================================================

  /**
   * Send low stock alert
   */
  async sendLowStockAlert(params: {
    to: string;
    tenantName: string;
    items: Array<{
      name: string;
      currentStock: number;
      threshold: number;
    }>;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: '⚠️ Niedriger Lagerbestand - Aktion erforderlich',
      template: 'low-stock-alert',
      data: {
        tenantName: params.tenantName,
        items: params.items,
        currentDate: new Date(),
        currentYear: new Date().getFullYear()
      },
      categories: ['alert', 'inventory']
    });
  }

  /**
   * Send weekly report
   */
  async sendWeeklyReport(params: {
    to: string | string[];
    tenantName: string;
    reportData: any;
    reportUrl: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Wochenbericht - ${params.tenantName}`,
      template: 'weekly-report',
      data: {
        tenantName: params.tenantName,
        ...params.reportData,
        reportUrl: params.reportUrl,
        currentYear: new Date().getFullYear()
      },
      categories: ['report', 'analytics']
    });
  }

  /**
   * Send subscription reminder
   */
  async sendSubscriptionReminder(params: {
    to: string;
    tenantName: string;
    daysUntilExpiry: number;
    renewalUrl: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Abonnement läuft in ${params.daysUntilExpiry} Tagen ab - ${params.tenantName}`,
      template: 'subscription-renewal',
      data: {
        tenantName: params.tenantName,
        daysUntilExpiry: params.daysUntilExpiry,
        renewalUrl: params.renewalUrl,
        currentYear: new Date().getFullYear()
      },
      categories: ['billing', 'reminder']
    });
  }

  /**
   * Send subscription expired notification
   */
  async sendSubscriptionExpired(params: {
    to: string;
    tenantName: string;
    reactivateUrl: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Abonnement abgelaufen - ${params.tenantName}`,
      template: 'subscription-expired',
      data: {
        tenantName: params.tenantName,
        reactivateUrl: params.reactivateUrl,
        currentYear: new Date().getFullYear()
      },
      categories: ['billing', 'alert']
    });
  }

  // ============================================================================
  // CUSTOMER ENGAGEMENT EMAILS
  // ============================================================================

  /**
   * Send review request email
   */
  async sendReviewRequestEmail(params: {
    to: string;
    orderNumber: string;
    tenantId: string;
    orderId: string;
  }): Promise<void> {
    const reviewUrl = `${functions.config().app.url}/review?tenant=${params.tenantId}&order=${params.orderId}`;
    
    await this.sendEmail({
      to: params.to,
      subject: 'Wie war deine Bestellung? Wir würden uns über dein Feedback freuen! ⭐',
      template: 'review-request',
      data: {
        orderNumber: params.orderNumber,
        reviewUrl,
        currentYear: new Date().getFullYear()
      },
      categories: ['review', 'engagement']
    });
  }

  /**
   * Send newsletter
   */
  async sendNewsletter(params: {
    to: string | string[];
    subject: string;
    content: {
      headline: string;
      body: string;
      cta?: {
        text: string;
        url: string;
      };
      footer?: string;
    };
    tenantId: string;
  }): Promise<void> {
    const unsubscribeToken = Buffer.from(`${params.tenantId}:${params.to}`).toString('base64');
    const unsubscribeUrl = `${functions.config().app.url}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
    
    await this.sendEmail({
      to: params.to,
      subject: params.subject,
      template: 'newsletter',
      data: {
        ...params.content,
        unsubscribeUrl,
        currentYear: new Date().getFullYear()
      },
      categories: ['newsletter', 'marketing']
    });
  }

  /**
   * Send newsletter welcome
   */
  async sendNewsletterWelcome(params: {
    to: string;
    name: string;
    tenantId: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: 'Willkommen zu unserem Newsletter! 📧',
      template: 'newsletter-welcome',
      data: {
        name: params.name,
        currentYear: new Date().getFullYear()
      },
      categories: ['newsletter', 'welcome']
    });
  }

  // ============================================================================
  // TRANSACTIONAL EMAILS
  // ============================================================================

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(params: {
    to: string;
    orderNumber: string;
    amount: number;
    currency: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Zahlung erhalten - #${params.orderNumber}`,
      template: 'payment-confirmation',
      data: {
        orderNumber: params.orderNumber,
        amount: params.amount,
        currency: params.currency,
        currentYear: new Date().getFullYear()
      },
      categories: ['payment', 'transactional']
    });
  }

  /**
   * Send refund confirmation
   */
  async sendRefundConfirmationEmail(params: {
    to: string;
    orderNumber: string;
    refundAmount: number;
    refundId: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Rückerstattung verarbeitet - #${params.orderNumber}`,
      template: 'refund-confirmation',
      data: {
        orderNumber: params.orderNumber,
        refundAmount: params.refundAmount,
        refundId: params.refundId,
        processingDays: '3-5',
        currentYear: new Date().getFullYear()
      },
      categories: ['payment', 'transactional']
    });
  }

  /**
   * Send order cancellation email
   */
  async sendOrderCancellationEmail(params: {
    to: string;
    orderNumber: string;
    reason?: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Bestellung storniert - #${params.orderNumber}`,
      template: 'order-cancellation',
      data: {
        orderNumber: params.orderNumber,
        reason: params.reason || 'Auf Kundenwunsch',
        currentYear: new Date().getFullYear()
      },
      categories: ['order', 'transactional']
    });
  }

  // ============================================================================
  // SUPPORT EMAILS
  // ============================================================================

  /**
   * Send contact form notification
   */
  async sendContactFormNotification(params: {
    to: string;
    tenantName: string;
    submission: {
      name: string;
      email: string;
      phone?: string;
      subject: string;
      message: string;
    };
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Neue Kontaktanfrage - ${params.submission.subject}`,
      template: 'contact-form-notification',
      data: {
        tenantName: params.tenantName,
        submission: params.submission,
        currentYear: new Date().getFullYear()
      },
      categories: ['contact', 'notification']
    });
  }

  /**
   * Send contact form confirmation
   */
  async sendContactFormConfirmation(params: {
    to: string;
    name: string;
    tenantName: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: 'Wir haben deine Nachricht erhalten',
      template: 'contact-form-confirmation',
      data: {
        name: params.name,
        tenantName: params.tenantName,
        currentYear: new Date().getFullYear()
      },
      categories: ['contact', 'confirmation']
    });
  }

  /**
   * Send subscription cancellation
   */
  async sendSubscriptionCancellation(params: {
    to: string;
    tenantName: string;
  }): Promise<void> {
    await this.sendEmail({
      to: params.to,
      subject: `Abonnement gekündigt - ${params.tenantName}`,
      template: 'subscription-cancellation',
      data: {
        tenantName: params.tenantName,
        currentYear: new Date().getFullYear()
      },
      categories: ['billing', 'cancellation']
    });
  }
}