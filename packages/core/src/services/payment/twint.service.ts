import axios from 'axios';
import { 
  PaymentIntent, 
  PaymentStatus, 
  PaymentMethod,
  TwintPaymentRequest,
  TwintPaymentResponse,
  TwintRefundRequest,
} from './payment.types';

export interface TwintConfig {
  merchantId: string;
  storeId: string;
  terminalId: string;
  apiKey: string;
  apiEndpoint: string;
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
}

export interface TwintQRCodeRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerInfo?: {
    email?: string;
    phone?: string;
  };
  expirationMinutes?: number;
}

export interface TwintQRCodeResponse {
  qrCode: string;
  token: string;
  expiresAt: Date;
  pollingUrl: string;
}

export interface TwintPaymentStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  timestamp?: Date;
  errorCode?: string;
  errorMessage?: string;
}

export class TwintService {
  private config: TwintConfig;
  private axiosInstance: any;

  constructor(config: TwintConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: this.config.apiEndpoint,
      headers: {
        'X-API-Key': this.config.apiKey,
        'X-Merchant-Id': this.config.merchantId,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate TWINT QR Code for payment
   */
  async generateQRCode(request: TwintQRCodeRequest): Promise<TwintQRCodeResponse> {
    try {
      const payload: TwintPaymentRequest = {
        merchantId: this.config.merchantId,
        storeId: this.config.storeId,
        terminalId: this.config.terminalId,
        amount: this.formatAmount(request.amount),
        currency: request.currency.toUpperCase(),
        refNo: request.orderId,
        purpose: `Order ${request.orderId}`,
        customerInfo: request.customerInfo,
        webhookUrl: this.config.webhookUrl,
        expirationTime: this.calculateExpirationTime(request.expirationMinutes || 10),
      };

      const response = await this.axiosInstance.post('/qr-code/generate', payload);
      
      return {
        qrCode: response.data.qrCodeData,
        token: response.data.token,
        expiresAt: new Date(response.data.expiresAt),
        pollingUrl: response.data.pollingUrl,
      };
    } catch (error) {
      console.error('Error generating TWINT QR code:', error);
      throw this.handleTwintError(error);
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(token: string): Promise<TwintPaymentStatus> {
    try {
      const response = await this.axiosInstance.get(`/payments/${token}/status`);
      
      return {
        status: this.mapTwintStatus(response.data.status),
        transactionId: response.data.transactionId,
        timestamp: response.data.timestamp ? new Date(response.data.timestamp) : undefined,
        errorCode: response.data.errorCode,
        errorMessage: response.data.errorMessage,
      };
    } catch (error) {
      console.error('Error checking TWINT payment status:', error);
      throw this.handleTwintError(error);
    }
  }

  /**
   * Poll payment status until completion or timeout
   */
  async pollPaymentStatus(
    token: string,
    intervalMs: number = 2000,
    timeoutMs: number = 300000 // 5 minutes
  ): Promise<TwintPaymentStatus> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const status = await this.checkPaymentStatus(token);
          
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
            resolve(status);
            return;
          }
          
          if (Date.now() - startTime > timeoutMs) {
            reject(new Error('Payment status polling timeout'));
            return;
          }
          
          setTimeout(checkStatus, intervalMs);
        } catch (error) {
          reject(error);
        }
      };
      
      checkStatus();
    });
  }

  /**
   * Create direct payment (app-to-app)
   */
  async createDirectPayment(request: TwintQRCodeRequest): Promise<TwintPaymentResponse> {
    try {
      const payload: TwintPaymentRequest = {
        merchantId: this.config.merchantId,
        storeId: this.config.storeId,
        terminalId: this.config.terminalId,
        amount: this.formatAmount(request.amount),
        currency: request.currency.toUpperCase(),
        refNo: request.orderId,
        purpose: `Order ${request.orderId}`,
        customerInfo: request.customerInfo,
        webhookUrl: this.config.webhookUrl,
        paymentMethod: 'APP',
      };

      const response = await this.axiosInstance.post('/payments/direct', payload);
      
      return {
        paymentId: response.data.paymentId,
        status: this.mapTwintStatus(response.data.status),
        redirectUrl: response.data.redirectUrl,
        token: response.data.token,
      };
    } catch (error) {
      console.error('Error creating TWINT direct payment:', error);
      throw this.handleTwintError(error);
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(
    transactionId: string,
    amount: number,
    reason?: string
  ): Promise<any> {
    try {
      const payload: TwintRefundRequest = {
        merchantId: this.config.merchantId,
        originalTransactionId: transactionId,
        amount: this.formatAmount(amount),
        reason: reason || 'Customer refund request',
        refNo: `REFUND-${transactionId}-${Date.now()}`,
      };

      const response = await this.axiosInstance.post('/refunds', payload);
      
      return {
        refundId: response.data.refundId,
        status: response.data.status,
        amount: response.data.amount,
        timestamp: new Date(response.data.timestamp),
      };
    } catch (error) {
      console.error('Error processing TWINT refund:', error);
      throw this.handleTwintError(error);
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting TWINT transaction:', error);
      throw this.handleTwintError(error);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // TODO: Implement TWINT webhook signature verification
    // This would typically involve HMAC validation
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.apiKey)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  }

  /**
   * Handle webhook notification
   */
  async handleWebhook(payload: any, signature: string): Promise<void> {
    // Verify signature
    if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
      throw new Error('Invalid webhook signature');
    }

    // Process webhook based on event type
    switch (payload.eventType) {
      case 'payment.completed':
        await this.handlePaymentCompleted(payload);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;
      case 'refund.completed':
        await this.handleRefundCompleted(payload);
        break;
      default:
        console.warn('Unknown TWINT webhook event type:', payload.eventType);
    }
  }

  /**
   * Format amount for TWINT (in cents/rappen)
   */
  private formatAmount(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Calculate expiration time
   */
  private calculateExpirationTime(minutes: number): string {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + minutes);
    return expirationTime.toISOString();
  }

  /**
   * Map TWINT status to internal status
   */
  private mapTwintStatus(twintStatus: string): TwintPaymentStatus['status'] {
    const statusMap: Record<string, TwintPaymentStatus['status']> = {
      'PENDING': 'pending',
      'IN_PROGRESS': 'processing',
      'AUTHORIZED': 'processing',
      'COMPLETED': 'completed',
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'cancelled',
    };

    return statusMap[twintStatus] || 'pending';
  }

  /**
   * Handle TWINT-specific errors
   */
  private handleTwintError(error: any): Error {
    if (error.response?.data) {
      const { errorCode, errorMessage } = error.response.data;
      const errorMessages: Record<string, string> = {
        'INVALID_MERCHANT': 'Ungültige Händler-Konfiguration',
        'INVALID_AMOUNT': 'Ungültiger Betrag',
        'PAYMENT_EXPIRED': 'Zahlung abgelaufen',
        'PAYMENT_CANCELLED': 'Zahlung wurde abgebrochen',
        'INSUFFICIENT_FUNDS': 'Unzureichende Deckung',
        'TECHNICAL_ERROR': 'Technischer Fehler bei TWINT',
        'DUPLICATE_REFERENCE': 'Doppelte Referenznummer',
      };

      const message = errorMessages[errorCode] || errorMessage || 'TWINT Zahlungsfehler';
      const err = new Error(message);
      (err as any).code = errorCode;
      return err;
    }

    return error;
  }

  /**
   * Handle payment completed webhook
   */
  private async handlePaymentCompleted(payload: any): Promise<void> {
    // TODO: Implement payment completed logic
    console.log('TWINT payment completed:', payload);
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(payload: any): Promise<void> {
    // TODO: Implement payment failed logic
    console.log('TWINT payment failed:', payload);
  }

  /**
   * Handle refund completed webhook
   */
  private async handleRefundCompleted(payload: any): Promise<void> {
    // TODO: Implement refund completed logic
    console.log('TWINT refund completed:', payload);
  }

  /**
   * Generate TWINT payment button HTML
   */
  generatePaymentButton(
    amount: number,
    orderId: string,
    options?: {
      size?: 'small' | 'medium' | 'large';
      theme?: 'light' | 'dark';
      language?: 'de' | 'fr' | 'it' | 'en';
    }
  ): string {
    const size = options?.size || 'medium';
    const theme = options?.theme || 'light';
    const language = options?.language || 'de';

    const sizeClasses = {
      small: 'twint-btn-sm',
      medium: 'twint-btn-md',
      large: 'twint-btn-lg',
    };

    return `
      <button 
        class="twint-payment-button ${sizeClasses[size]} twint-${theme}"
        data-amount="${amount}"
        data-order-id="${orderId}"
        data-merchant-id="${this.config.merchantId}"
        data-language="${language}"
      >
        <img src="https://www.twint.ch/content/uploads/2019/04/twint-logo.svg" alt="TWINT" />
        <span>Mit TWINT bezahlen</span>
      </button>
    `;
  }
}

// Export factory function
export function createTwintService(config: TwintConfig): TwintService {
  return new TwintService(config);
}
