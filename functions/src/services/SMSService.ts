/**
 * EATECH Firebase Functions - SMS Service
 * Version: 1.0.0
 * 
 * SMS sending service using Twilio
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/services/SMSService.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as twilio from 'twilio';
import { logger } from '../utils/logger';

// ============================================================================
// SMS SERVICE CLASS
// ============================================================================

export class SMSService {
  private client: twilio.Twilio;
  private fromNumber: string;
  private messagingServiceSid?: string;
  private isEnabled: boolean;

  constructor() {
    const accountSid = functions.config().twilio?.account_sid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = functions.config().twilio?.auth_token || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = functions.config().twilio?.phone_number || process.env.TWILIO_PHONE_NUMBER || '';
    this.messagingServiceSid = functions.config().twilio?.messaging_service_sid;
    
    this.isEnabled = !!(accountSid && authToken && (this.fromNumber || this.messagingServiceSid));
    
    if (this.isEnabled) {
      this.client = twilio(accountSid, authToken);
      logger.info('SMS service initialized');
    } else {
      logger.warn('SMS service disabled - missing configuration');
    }
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Swiss numbers
    if (cleaned.startsWith('0')) {
      cleaned = '41' + cleaned.substring(1); // Swiss country code
    }
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number
   */
  private isValidPhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    // Basic E.164 validation
    return /^\+[1-9]\d{1,14}$/.test(formatted);
  }

  /**
   * Send SMS message
   */
  private async sendSMS(params: {
    to: string;
    body: string;
    mediaUrl?: string[];
    statusCallback?: string;
  }): Promise<string | null> {
    if (!this.isEnabled) {
      logger.warn('SMS service is disabled');
      return null;
    }

    try {
      const formattedNumber = this.formatPhoneNumber(params.to);
      
      if (!this.isValidPhoneNumber(formattedNumber)) {
        throw new Error(`Invalid phone number: ${params.to}`);
      }

      const messageOptions: any = {
        to: formattedNumber,
        body: params.body
      };

      // Use messaging service if configured, otherwise use from number
      if (this.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.messagingServiceSid;
      } else {
        messageOptions.from = this.fromNumber;
      }

      if (params.mediaUrl) {
        messageOptions.mediaUrl = params.mediaUrl;
      }

      if (params.statusCallback) {
        messageOptions.statusCallback = params.statusCallback;
      }

      const message = await this.client.messages.create(messageOptions);
      
      // Log SMS send
      await this.logSMS({
        messageId: message.sid,
        to: formattedNumber,
        body: params.body,
        status: message.status,
        direction: 'outbound'
      });
      
      logger.info('SMS sent successfully', {
        messageId: message.sid,
        to: formattedNumber
      });
      
      return message.sid;
    } catch (error) {
      logger.error('Failed to send SMS', {
        error,
        to: params.to
      });
      
      // Log failed attempt
      await this.logSMS({
        to: this.formatPhoneNumber(params.to),
        body: params.body,
        status: 'failed',
        direction: 'outbound',
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Log SMS message
   */
  private async logSMS(data: {
    messageId?: string;
    to: string;
    body: string;
    status: string;
    direction: 'inbound' | 'outbound';
    error?: string;
  }): Promise<void> {
    try {
      await admin.firestore()
        .collection('smsLogs')
        .doc(data.messageId || admin.firestore().collection('_').doc().id)
        .set({
          ...data,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      logger.error('Failed to log SMS', { error });
    }
  }

  /**
   * Verify webhook signature from Twilio
   */
  verifyWebhookSignature(signature: string, url: string, params: any): boolean {
    if (!this.isEnabled) return false;
    
    const authToken = functions.config().twilio?.auth_token || process.env.TWILIO_AUTH_TOKEN || '';
    return twilio.validateRequest(
      authToken,
      signature,
      url,
      params
    );
  }

  // ============================================================================
  // PUBLIC METHODS - ORDER NOTIFICATIONS
  // ============================================================================

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmationSMS(params: {
    to: string;
    orderNumber: string;
    total: number;
    estimatedTime?: Date;
  }): Promise<string | null> {
    const estimatedTimeStr = params.estimatedTime 
      ? ` Geschätzte Zeit: ${params.estimatedTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
      : '';
    
    const body = `EATECH: Bestellung #${params.orderNumber} bestätigt! ` +
                 `Total: CHF ${params.total.toFixed(2)}.${estimatedTimeStr} ` +
                 `Verfolge deine Bestellung: ${functions.config().app.url}/order/${params.orderNumber}`;
    
    return this.sendSMS({ to: params.to, body });
  }

  /**
   * Send order status SMS
   */
  async sendOrderStatusSMS(params: {
    to: string;
    orderNumber: string;
    status: string;
    estimatedTime?: Date;
  }): Promise<string | null> {
    const statusMessages: Record<string, string> = {
      confirmed: 'wurde bestätigt',
      preparing: 'wird zubereitet',
      ready: 'ist abholbereit',
      delivered: 'wurde geliefert',
      cancelled: 'wurde storniert'
    };
    
    const statusMessage = statusMessages[params.status] || params.status;
    const estimatedTimeStr = params.estimatedTime 
      ? ` Zeit: ${params.estimatedTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
      : '';
    
    const body = `EATECH: Deine Bestellung #${params.orderNumber} ${statusMessage}.${estimatedTimeStr}`;
    
    return this.sendSMS({ to: params.to, body });
  }

  /**
   * Send order ready SMS
   */
  async sendOrderReadySMS(params: {
    to: string;
    orderNumber: string;
  }): Promise<string | null> {
    const body = `EATECH: Deine Bestellung #${params.orderNumber} ist bereit zur Abholung! ` +
                 `Bitte hole sie zeitnah ab. Danke! 🍔`;
    
    return this.sendSMS({ to: params.to, body });
  }

  /**
   * Send delivery update SMS
   */
  async sendDeliveryUpdateSMS(params: {
    to: string;
    orderNumber: string;
    driverName: string;
    estimatedTime: Date;
    trackingUrl?: string;
  }): Promise<string | null> {
    const timeStr = params.estimatedTime.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let body = `EATECH: ${params.driverName} ist unterwegs mit deiner Bestellung #${params.orderNumber}. ` +
               `Ankunft ca. ${timeStr}.`;
    
    if (params.trackingUrl) {
      body += ` Verfolgen: ${params.trackingUrl}`;
    }
    
    return this.sendSMS({ to: params.to, body });
  }

  // ============================================================================
  // AUTHENTICATION & SECURITY
  // ============================================================================

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(params: {
    to: string;
    code: string;
  }): Promise<string | null> {
    const body = `EATECH: Dein Verifizierungscode ist ${params.code}. ` +
                 `Gültig für 10 Minuten. Teile diesen Code mit niemandem.`;
    
    return this.sendSMS({ to: params.to, body });
  }

  /**
   * Send login alert SMS
   */
  async sendLoginAlert(params: {
    to: string;
    device: string;
    location: string;
    time: Date;
  }): Promise<string | null> {
    const timeStr = params.time.toLocaleString('de-CH');
    
    const body = `EATECH Sicherheit: Neue Anmeldung von ${params.device} in ${params.location} um ${timeStr}. ` +
                 `Warst du das nicht? Ändere sofort dein Passwort!`;
    
    return this.sendSMS({ to: params.to, body });
  }

  // ============================================================================
  // MARKETING & PROMOTIONS
  // ============================================================================

  /**
   * Send promotional SMS
   */
  async sendPromotionalSMS(params: {
    to: string;
    message: string;
    optOutInfo?: boolean;
  }): Promise<string | null> {
    let body = params.message;
    
    if (params.optOutInfo !== false) {
      body += ' Abmelden: STOP an diese Nummer senden.';
    }
    
    return this.sendSMS({ to: params.to, body });
  }

  /**
   * Send discount code SMS
   */
  async sendDiscountCode(params: {
    to: string;
    code: string;
    discount: string;
    validUntil: Date;
  }): Promise<string | null> {
    const validUntilStr = params.validUntil.toLocaleDateString('de-CH');
    
    const body = `EATECH Angebot: ${params.discount} Rabatt mit Code ${params.code}! ` +
                 `Gültig bis ${validUntilStr}. Jetzt bestellen: ${functions.config().app.url}`;
    
    return this.sendSMS({ to: params.to, body });
  }

  // ============================================================================
  // REMINDERS & ALERTS
  // ============================================================================

  /**
   * Send pickup reminder SMS
   */
  async sendPickupReminder(params: {
    to: string;
    orderNumber: string;
    readySince: Date;
  }): Promise<string | null> {
    const timeSinceReady = Math.floor((Date.now() - params.readySince.getTime()) / 60000); // minutes
    
    const body = `EATECH Erinnerung: Deine Bestellung #${params.orderNumber} wartet seit ${timeSinceReady} Minuten ` +
                 `auf Abholung. Bitte hole sie zeitnah ab!`;
    
    return this.sendSMS({ to: params.to, body });
  }

  /**
   * Send reservation reminder SMS
   */
  async sendReservationReminder(params: {
    to: string;
    reservationTime: Date;
    partySize: number;
    location: string;
  }): Promise<string | null> {
    const timeStr = params.reservationTime.toLocaleString('de-CH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const body = `EATECH: Erinnerung an deine Reservation für ${params.partySize} Personen ` +
                 `am ${timeStr} bei ${params.location}. Bis bald!`;
    
    return this.sendSMS({ to: params.to, body });
  }

  /**
   * Send low balance alert SMS
   */
  async sendLowBalanceAlert(params: {
    to: string;
    balance: number;
    topUpUrl: string;
  }): Promise<string | null> {
    const body = `EATECH: Dein Guthaben beträgt nur noch CHF ${params.balance.toFixed(2)}. ` +
                 `Jetzt aufladen: ${params.topUpUrl}`;
    
    return this.sendSMS({ to: params.to, body });
  }

  // ============================================================================
  // STAFF NOTIFICATIONS
  // ============================================================================

  /**
   * Send new order alert to staff
   */
  async sendStaffOrderAlert(params: {
    to: string;
    orderNumber: string;
    orderType: string;
    items: number;
  }): Promise<string | null> {
    const body = `EATECH: Neue ${params.orderType}-Bestellung #${params.orderNumber} ` +
                 `(${params.items} Artikel). Bitte bearbeiten!`;
    
    return this.sendSMS({ to: params.to, body });
  }

  /**
   * Send staff schedule reminder
   */
  async sendStaffScheduleReminder(params: {
    to: string;
    shiftStart: Date;
    location: string;
  }): Promise<string | null> {
    const timeStr = params.shiftStart.toLocaleString('de-CH', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const body = `EATECH: Erinnerung - Deine Schicht beginnt ${timeStr} bei ${params.location}. ` +
                 `Bitte pünktlich erscheinen.`;
    
    return this.sendSMS({ to: params.to, body });
  }

  // ============================================================================
  // BULK SMS
  // ============================================================================

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(params: {
    recipients: Array<{ phone: string; name?: string }>;
    message: string;
    personalizable?: boolean;
  }): Promise<Array<{ phone: string; messageId: string | null; error?: string }>> {
    const results = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < params.recipients.length; i += batchSize) {
      const batch = params.recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          let body = params.message;
          
          // Personalize message if enabled
          if (params.personalizable && recipient.name) {
            body = body.replace(/\{name\}/g, recipient.name);
          }
          
          const messageId = await this.sendSMS({ to: recipient.phone, body });
          return { phone: recipient.phone, messageId };
        } catch (error) {
          return { phone: recipient.phone, messageId: null, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < params.recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    return results;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if SMS service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get remaining SMS credits (if applicable)
   */
  async getBalance(): Promise<{ balance: number; currency: string } | null> {
    if (!this.isEnabled) return null;
    
    try {
      const account = await this.client.balance.fetch();
      return {
        balance: parseFloat(account.balance),
        currency: account.currency
      };
    } catch (error) {
      logger.error('Failed to get SMS balance', { error });
      return null;
    }
  }

  /**
   * Get SMS logs for a phone number
   */
  async getSMSHistory(phoneNumber: string, limit: number = 50): Promise<any[]> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      const snapshot = await admin.firestore()
        .collection('smsLogs')
        .where('to', '==', formattedNumber)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Failed to get SMS history', { error });
      return [];
    }
  }
}