/**
 * EATECH - PAYMENT INTEGRATION SYSTEM
 * Version: 5.0.0
 * Description: Vollständige Schweizer Zahlungsintegration mit Stripe & TWINT
 * Features: Multi-Currency, VAT Calculation, QR-Bill, Fraud Prevention
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
import { firebaseManager } from './firebase-config.js';
import { encryptionService } from './security.js';
import { analyticsEngine } from './analytics.js';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const PAYMENT_CONFIG = {
    version: '5.0.0',
    
    // Stripe Configuration
    stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        apiVersion: '2023-10-16',
        locale: 'de-CH',
        
        // Supported payment methods for Switzerland
        paymentMethods: {
            card: {
                enabled: true,
                brands: ['visa', 'mastercard', 'amex'],
                requirePostalCode: true,
                require3DS: true
            },
            twint: {
                enabled: true,
                provider: 'stripe',
                fee: {
                    percentage: 2.9,
                    fixed: 0.30,
                    currency: 'CHF'
                }
            },
            sepa_debit: {
                enabled: true,
                countries: ['CH', 'LI'],
                iban: {
                    minLength: 21,
                    maxLength: 21,
                    pattern: /^CH\d{2}\d{5}[A-Z0-9]{12}$/
                }
            },
            postfinance: {
                enabled: false, // Coming soon
                provider: 'postfinance',
                integration: 'redirect'
            },
            paypal: {
                enabled: true,
                integration: 'stripe'
            },
            klarna: {
                enabled: true,
                countries: ['CH'],
                minAmount: 20,
                maxAmount: 5000
            }
        }
    },
    
    // Swiss VAT Configuration
    vat: {
        rates: {
            standard: 8.1,      // Normalsatz 2024
            reduced: 2.6,       // Reduzierter Satz (Takeaway)
            accommodation: 3.8, // Beherbergung
            exempt: 0.0        // Steuerbefreit
        },
        
        // Product category VAT mapping
        categoryRates: {
            'food_takeaway': 2.6,
            'food_delivery': 8.1,
            'food_dinein': 8.1,
            'beverages_soft': 2.6,
            'beverages_alcoholic': 8.1,
            'services': 8.1,
            'merchandise': 8.1
        }
    },
    
    // Currency Configuration
    currencies: {
        default: 'CHF',
        supported: ['CHF', 'EUR', 'USD'],
        exchangeRates: {
            'CHF': 1.0,
            'EUR': 1.08,
            'USD': 1.12
        },
        format: {
            'CHF': { symbol: 'CHF', position: 'before', decimals: 2 },
            'EUR': { symbol: '€', position: 'after', decimals: 2 },
            'USD': { symbol: '$', position: 'before', decimals: 2 }
        }
    },
    
    // Security & Fraud Prevention
    security: {
        pciCompliant: true,
        tokenization: true,
        encryption: 'AES-256-GCM',
        fraudDetection: {
            enabled: true,
            rules: [
                'block_if_high_risk_score',
                'request_3d_secure_if_recommended',
                'verify_zip_code',
                'check_velocity_limits'
            ],
            velocityLimits: {
                maxTransactionsPerHour: 10,
                maxAmountPerDay: 5000
            }
        }
    }
};

// ============================================================================
// PAYMENT MANAGER CLASS
// ============================================================================
class PaymentManager {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.currentPaymentMethod = 'card';
        this.currentCurrency = 'CHF';
        this.paymentIntent = null;
        this.customerInfo = {};
        
        this.init();
    }
    
    /**
     * Initialize Payment System
     */
    async init() {
        console.log('💳 Initializing EATECH Payment System...');
        
        try {
            // Load Stripe
            await this.loadStripe();
            
            // Initialize payment methods
            this.initializePaymentMethods();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load saved payment preferences
            this.loadPaymentPreferences();
            
            // Initialize fraud detection
            this.initializeFraudDetection();
            
            console.log('✅ Payment System initialized');
            
        } catch (error) {
            console.error('❌ Payment initialization failed:', error);
            this.handleInitError(error);
        }
    }
    
    /**
     * Load Stripe.js
     */
    async loadStripe() {
        if (window.Stripe) {
            this.stripe = window.Stripe(PAYMENT_CONFIG.stripe.publishableKey, {
                apiVersion: PAYMENT_CONFIG.stripe.apiVersion,
                locale: PAYMENT_CONFIG.stripe.locale
            });
        } else {
            throw new Error('Stripe.js not loaded');
        }
    }
    
    /**
     * Create payment intent
     */
    async createPaymentIntent(amount, currency = 'CHF', metadata = {}) {
        try {
            // Validate amount
            if (amount < 0.50) {
                throw new Error('Mindestbetrag ist CHF 0.50');
            }
            
            // Create payment intent on server
            const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': firebaseManager.tenantId
                },
                body: JSON.stringify({
                    amount: Math.round(amount * 100), // Convert to cents
                    currency: currency.toLowerCase(),
                    metadata: {
                        ...metadata,
                        tenantId: firebaseManager.tenantId,
                        timestamp: Date.now()
                    },
                    automatic_payment_methods: {
                        enabled: true
                    },
                    setup_future_usage: metadata.saveCard ? 'off_session' : null
                })
            });
            
            if (!response.ok) {
                throw new Error('Payment intent creation failed');
            }
            
            const data = await response.json();
            this.paymentIntent = data;
            
            return data;
            
        } catch (error) {
            console.error('Payment intent error:', error);
            throw error;
        }
    }
    
    /**
     * Initialize Stripe Elements
     */
    async initializeElements(clientSecret, options = {}) {
        // Elements options
        const appearance = {
            theme: options.theme || 'stripe',
            variables: {
                colorPrimary: options.primaryColor || '#FF6B6B',
                colorBackground: options.backgroundColor || '#ffffff',
                colorSurface: options.surfaceColor || '#ffffff',
                colorText: options.textColor || '#30313d',
                colorDanger: options.dangerColor || '#df1b41',
                fontFamily: 'system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '8px'
            },
            rules: {
                '.Label': {
                    marginBottom: '8px'
                },
                '.Input': {
                    padding: '12px',
                    fontSize: '16px'
                }
            }
        };
        
        // Create Elements instance
        this.elements = this.stripe.elements({
            clientSecret,
            appearance,
            locale: PAYMENT_CONFIG.stripe.locale
        });
        
        // Create Payment Element
        const paymentElement = this.elements.create('payment', {
            layout: 'tabs',
            defaultValues: {
                billingDetails: {
                    name: this.customerInfo.name,
                    email: this.customerInfo.email,
                    phone: this.customerInfo.phone,
                    address: {
                        country: 'CH'
                    }
                }
            },
            paymentMethodOrder: ['card', 'twint', 'sepa_debit', 'paypal'],
            fields: {
                billingDetails: {
                    name: 'auto',
                    email: 'auto',
                    phone: 'auto',
                    address: {
                        country: 'never',
                        postalCode: 'auto'
                    }
                }
            },
            wallets: {
                applePay: 'auto',
                googlePay: 'auto'
            }
        });
        
        // Mount element
        paymentElement.mount('#payment-element');
        
        // Listen for changes
        paymentElement.on('change', (event) => {
            this.handlePaymentElementChange(event);
        });
        
        return paymentElement;
    }
    
    /**
     * Process payment
     */
    async processPayment(orderData) {
        try {
            // Show loading state
            this.showPaymentProcessing();
            
            // Validate order data
            this.validateOrderData(orderData);
            
            // Calculate final amount with VAT
            const finalAmount = this.calculateFinalAmount(orderData);
            
            // Create or update payment intent
            if (!this.paymentIntent) {
                await this.createPaymentIntent(
                    finalAmount.total,
                    this.currentCurrency,
                    {
                        orderId: orderData.orderId,
                        customerEmail: orderData.customer.email
                    }
                );
            }
            
            // Confirm payment
            const { error, paymentIntent } = await this.stripe.confirmPayment({
                elements: this.elements,
                confirmParams: {
                    return_url: `${window.location.origin}/success`,
                    receipt_email: orderData.customer.email,
                    payment_method_data: {
                        billing_details: {
                            name: orderData.customer.name,
                            email: orderData.customer.email,
                            phone: orderData.customer.phone,
                            address: {
                                line1: orderData.customer.address?.line1,
                                postal_code: orderData.customer.address?.postalCode,
                                city: orderData.customer.address?.city,
                                country: 'CH'
                            }
                        }
                    }
                },
                redirect: 'if_required'
            });
            
            if (error) {
                // Handle payment error
                this.handlePaymentError(error);
                return { success: false, error };
            }
            
            // Payment successful
            if (paymentIntent.status === 'succeeded') {
                // Generate receipt
                const receipt = await this.generateReceipt(paymentIntent, orderData);
                
                // Log transaction
                await this.logTransaction(paymentIntent, orderData);
                
                // Send confirmation
                await this.sendPaymentConfirmation(orderData, receipt);
                
                return {
                    success: true,
                    paymentIntent,
                    receipt
                };
            }
            
            // Handle other statuses
            return this.handlePaymentStatus(paymentIntent);
            
        } catch (error) {
            console.error('Payment processing error:', error);
            this.hidePaymentProcessing();
            throw error;
        }
    }
    
    /**
     * TWINT Integration
     */
    async processTwintPayment(amount, orderData) {
        try {
            // TWINT specific validation
            if (amount < 0.01 || amount > 5000) {
                throw new Error('TWINT: Betrag muss zwischen CHF 0.01 und CHF 5000 liegen');
            }
            
            // Create TWINT payment source
            const twintSource = await this.stripe.createSource({
                type: 'twint',
                amount: Math.round(amount * 100),
                currency: 'chf',
                owner: {
                    name: orderData.customer.name,
                    email: orderData.customer.email
                },
                redirect: {
                    return_url: `${window.location.origin}/twint-return`
                }
            });
            
            if (twintSource.error) {
                throw new Error(twintSource.error.message);
            }
            
            // Store payment info
            await this.storePendingPayment(twintSource.source.id, orderData);
            
            // Redirect to TWINT
            window.location.href = twintSource.source.redirect.url;
            
        } catch (error) {
            console.error('TWINT payment error:', error);
            throw error;
        }
    }
    
    /**
     * Calculate VAT and final amount
     */
    calculateFinalAmount(orderData) {
        const vatCalculation = {
            items: [],
            subtotal: 0,
            vatAmounts: {},
            totalVat: 0,
            total: 0
        };
        
        // Calculate VAT for each item
        orderData.items.forEach(item => {
            const vatRate = this.getVatRate(item);
            const itemTotal = item.price * item.quantity;
            const vatAmount = (itemTotal * vatRate) / (100 + vatRate);
            
            vatCalculation.items.push({
                ...item,
                vatRate,
                vatAmount: Math.round(vatAmount * 100) / 100,
                totalIncVat: itemTotal
            });
            
            vatCalculation.subtotal += itemTotal;
            
            // Group VAT by rate
            if (!vatCalculation.vatAmounts[vatRate]) {
                vatCalculation.vatAmounts[vatRate] = 0;
            }
            vatCalculation.vatAmounts[vatRate] += vatAmount;
        });
        
        // Add delivery fee if applicable
        if (orderData.deliveryFee) {
            const deliveryVat = (orderData.deliveryFee * 8.1) / 108.1;
            vatCalculation.vatAmounts[8.1] = (vatCalculation.vatAmounts[8.1] || 0) + deliveryVat;
            vatCalculation.subtotal += orderData.deliveryFee;
        }
        
        // Calculate totals
        vatCalculation.totalVat = Object.values(vatCalculation.vatAmounts)
            .reduce((sum, amount) => sum + amount, 0);
        
        vatCalculation.total = vatCalculation.subtotal;
        
        // Apply discounts
        if (orderData.discount) {
            vatCalculation.discount = orderData.discount;
            vatCalculation.total -= orderData.discount.amount;
        }
        
        // Add tip
        if (orderData.tip) {
            vatCalculation.tip = orderData.tip;
            vatCalculation.total += orderData.tip;
        }
        
        // Round to 5 cents (Swiss rounding)
        vatCalculation.total = this.roundToFiveCents(vatCalculation.total);
        
        return vatCalculation;
    }
    
    /**
     * Get VAT rate for item
     */
    getVatRate(item) {
        // Check item-specific VAT rate
        if (item.vatRate !== undefined) {
            return item.vatRate;
        }
        
        // Check category-based rate
        const categoryRate = PAYMENT_CONFIG.vat.categoryRates[item.category];
        if (categoryRate !== undefined) {
            return categoryRate;
        }
        
        // Default to standard rate
        return PAYMENT_CONFIG.vat.rates.standard;
    }
    
    /**
     * Swiss rounding to 5 cents
     */
    roundToFiveCents(amount) {
        return Math.round(amount * 20) / 20;
    }
    
    /**
     * Generate Swiss QR-Bill
     */
    async generateQRBill(invoiceData) {
        const qrBillData = {
            // Header
            qrType: 'SPC',
            version: '0200',
            coding: '1',
            
            // Creditor information
            iban: invoiceData.creditor.iban,
            creditor: {
                type: 'S', // Structured address
                name: invoiceData.creditor.name,
                street: invoiceData.creditor.street,
                postalCode: invoiceData.creditor.postalCode,
                city: invoiceData.creditor.city,
                country: 'CH'
            },
            
            // Payment information
            amount: invoiceData.amount,
            currency: 'CHF',
            
            // Debtor information
            debtor: {
                type: 'S',
                name: invoiceData.debtor.name,
                street: invoiceData.debtor.street || '',
                postalCode: invoiceData.debtor.postalCode || '',
                city: invoiceData.debtor.city || '',
                country: 'CH'
            },
            
            // Reference
            referenceType: 'QRR',
            reference: this.generateQRReference(invoiceData.invoiceNumber),
            
            // Additional information
            unstructuredMessage: invoiceData.message || '',
            billInformation: '',
            
            // Alternative procedures
            alternativeProcedures: []
        };
        
        // Generate QR code
        const qrString = this.formatQRBillData(qrBillData);
        const qrCode = await this.generateQRCode(qrString);
        
        return {
            qrCode,
            data: qrBillData,
            reference: qrBillData.reference
        };
    }
    
    /**
     * Generate QR reference number
     */
    generateQRReference(invoiceNumber) {
        // QR-Reference format: 26 digits + 1 check digit
        const baseNumber = invoiceNumber.toString().padStart(26, '0');
        const checkDigit = this.calculateMod10(baseNumber);
        
        return baseNumber + checkDigit;
    }
    
    /**
     * Calculate MOD10 check digit
     */
    calculateMod10(number) {
        const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
        let carry = 0;
        
        for (let i = 0; i < number.length; i++) {
            carry = table[(carry + parseInt(number[i])) % 10];
        }
        
        return ((10 - carry) % 10).toString();
    }
    
    /**
     * Payment receipt generation
     */
    async generateReceipt(paymentIntent, orderData) {
        const receipt = {
            // Receipt header
            header: {
                title: 'Zahlungsbestätigung',
                logo: '/images/eatech-logo.png',
                date: new Date().toLocaleDateString('de-CH'),
                time: new Date().toLocaleTimeString('de-CH'),
                receiptNumber: this.generateReceiptNumber(),
                language: 'de-CH'
            },
            
            // Merchant information
            merchant: {
                name: orderData.merchant.name,
                address: orderData.merchant.address,
                uid: orderData.merchant.uid,
                vatNumber: orderData.merchant.vatNumber
            },
            
            // Customer information
            customer: {
                name: orderData.customer.name,
                email: orderData.customer.email,
                phone: orderData.customer.phone
            },
            
            // Order details
            order: {
                number: orderData.orderId,
                items: orderData.items,
                subtotal: orderData.subtotal,
                vatDetails: this.calculateFinalAmount(orderData).vatAmounts,
                total: orderData.total
            },
            
            // Payment details
            payment: {
                method: this.getPaymentMethodDisplay(paymentIntent.payment_method_types[0]),
                status: 'Erfolgreich',
                transactionId: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
                last4: paymentIntent.payment_method?.card?.last4
            },
            
            // Footer
            footer: {
                message: 'Vielen Dank für Ihre Bestellung!',
                website: 'www.eatech.ch',
                supportEmail: 'support@eatech.ch'
            }
        };
        
        // Generate PDF
        const pdf = await this.generateReceiptPDF(receipt);
        
        // Store receipt
        await this.storeReceipt(receipt);
        
        return {
            data: receipt,
            pdf: pdf,
            url: await this.uploadReceiptPDF(pdf)
        };
    }
    
    /**
     * Fraud detection and prevention
     */
    async checkFraudRisk(paymentData) {
        const riskFactors = {
            score: 0,
            factors: [],
            action: 'allow'
        };
        
        // Check velocity limits
        const recentTransactions = await this.getRecentTransactions(
            paymentData.customer.email,
            60 // Last 60 minutes
        );
        
        if (recentTransactions.count > PAYMENT_CONFIG.security.fraudDetection.velocityLimits.maxTransactionsPerHour) {
            riskFactors.score += 30;
            riskFactors.factors.push('high_transaction_velocity');
        }
        
        // Check daily amount limit
        if (recentTransactions.totalAmount > PAYMENT_CONFIG.security.fraudDetection.velocityLimits.maxAmountPerDay) {
            riskFactors.score += 40;
            riskFactors.factors.push('daily_limit_exceeded');
        }
        
        // Check for suspicious patterns
        if (this.checkSuspiciousPatterns(paymentData)) {
            riskFactors.score += 20;
            riskFactors.factors.push('suspicious_pattern');
        }
        
        // Check device fingerprint
        const deviceRisk = await this.checkDeviceFingerprint(paymentData.deviceId);
        if (deviceRisk.score > 50) {
            riskFactors.score += 25;
            riskFactors.factors.push('suspicious_device');
        }
        
        // Determine action based on score
        if (riskFactors.score >= 70) {
            riskFactors.action = 'block';
        } else if (riskFactors.score >= 40) {
            riskFactors.action = 'challenge'; // Require 3D Secure
        }
        
        // Log risk assessment
        await this.logRiskAssessment(paymentData, riskFactors);
        
        return riskFactors;
    }
    
    /**
     * Handle payment webhooks
     */
    async handleWebhook(event) {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentSuccess(event.data.object);
                break;
                
            case 'payment_intent.payment_failed':
                await this.handlePaymentFailure(event.data.object);
                break;
                
            case 'charge.dispute.created':
                await this.handleDispute(event.data.object);
                break;
                
            case 'charge.refunded':
                await this.handleRefund(event.data.object);
                break;
                
            default:
                console.log('Unhandled webhook event:', event.type);
        }
    }
    
    /**
     * Refund processing
     */
    async processRefund(paymentIntentId, amount, reason) {
        try {
            const response = await fetch('/api/create-refund', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify({
                    payment_intent: paymentIntentId,
                    amount: amount ? Math.round(amount * 100) : undefined,
                    reason: reason || 'requested_by_customer',
                    metadata: {
                        refundedBy: this.getCurrentUser(),
                        timestamp: Date.now()
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error('Refund creation failed');
            }
            
            const refund = await response.json();
            
            // Update order status
            await this.updateOrderRefundStatus(paymentIntentId, refund);
            
            // Send refund confirmation
            await this.sendRefundConfirmation(refund);
            
            return refund;
            
        } catch (error) {
            console.error('Refund error:', error);
            throw error;
        }
    }
    
    /**
     * Payment analytics
     */
    async getPaymentAnalytics(dateRange) {
        const analytics = {
            period: dateRange,
            metrics: {
                totalRevenue: 0,
                transactionCount: 0,
                averageTransaction: 0,
                successRate: 0,
                refundRate: 0
            },
            paymentMethods: {},
            hourlyDistribution: new Array(24).fill(0),
            topProducts: [],
            conversionFunnel: {
                initiated: 0,
                attempted: 0,
                succeeded: 0
            }
        };
        
        // Fetch transaction data
        const transactions = await this.getTransactions(dateRange);
        
        // Calculate metrics
        transactions.forEach(transaction => {
            analytics.metrics.totalRevenue += transaction.amount;
            analytics.metrics.transactionCount++;
            
            // Payment method distribution
            const method = transaction.payment_method;
            analytics.paymentMethods[method] = (analytics.paymentMethods[method] || 0) + 1;
            
            // Hourly distribution
            const hour = new Date(transaction.created).getHours();
            analytics.hourlyDistribution[hour]++;
        });
        
        // Calculate averages and rates
        analytics.metrics.averageTransaction = 
            analytics.metrics.totalRevenue / analytics.metrics.transactionCount;
        
        // Get success rate
        const successful = transactions.filter(t => t.status === 'succeeded').length;
        analytics.metrics.successRate = (successful / analytics.metrics.transactionCount) * 100;
        
        // Get refund rate
        const refunded = transactions.filter(t => t.refunded).length;
        analytics.metrics.refundRate = (refunded / successful) * 100;
        
        return analytics;
    }
}

// ============================================================================
// PAYMENT UI COMPONENTS
// ============================================================================

/**
 * Payment form component
 */
class PaymentForm {
    constructor(paymentManager) {
        this.payment = paymentManager;
        this.form = null;
        this.selectedMethod = 'card';
        
        this.render();
    }
    
    render() {
        this.form = document.createElement('div');
        this.form.className = 'payment-form';
        this.form.innerHTML = `
            <div class="payment-header">
                <h2>Zahlungsmethode wählen</h2>
                <div class="secure-badge">
                    <i class="fas fa-lock"></i>
                    <span>Sichere Zahlung</span>
                </div>
            </div>
            
            <div class="payment-methods">
                <label class="payment-method-option">
                    <input type="radio" name="payment-method" value="card" checked>
                    <div class="method-content">
                        <i class="fas fa-credit-card"></i>
                        <span>Kredit- / Debitkarte</span>
                        <img src="/images/card-brands.png" alt="Visa, Mastercard, Amex">
                    </div>
                </label>
                
                <label class="payment-method-option">
                    <input type="radio" name="payment-method" value="twint">
                    <div class="method-content">
                        <img src="/images/twint-logo.svg" alt="TWINT" class="twint-logo">
                        <span>TWINT</span>
                        <span class="badge">Beliebt</span>
                    </div>
                </label>
                
                <label class="payment-method-option">
                    <input type="radio" name="payment-method" value="paypal">
                    <div class="method-content">
                        <img src="/images/paypal-logo.svg" alt="PayPal" class="paypal-logo">
                        <span>PayPal</span>
                    </div>
                </label>
                
                <label class="payment-method-option">
                    <input type="radio" name="payment-method" value="invoice">
                    <div class="method-content">
                        <i class="fas fa-file-invoice"></i>
                        <span>Rechnung</span>
                        <span class="info">Nur für Stammkunden</span>
                    </div>
                </label>
            </div>
            
            <div id="payment-element">
                <!-- Stripe Elements will be inserted here -->
            </div>
            
            <div class="payment-summary">
                <div class="summary-row">
                    <span>Zwischensumme:</span>
                    <span id="subtotal">CHF 0.00</span>
                </div>
                <div class="summary-row">
                    <span>MwSt. (2.6%):</span>
                    <span id="vat">CHF 0.00</span>
                </div>
                <div class="summary-row">
                    <span>Liefergebühr:</span>
                    <span id="delivery">CHF 0.00</span>
                </div>
                <div class="summary-row total">
                    <span>Gesamt:</span>
                    <span id="total">CHF 0.00</span>
                </div>
            </div>
            
            <div class="payment-actions">
                <button type="button" class="btn-back" onclick="history.back()">
                    <i class="fas fa-arrow-left"></i>
                    Zurück
                </button>
                <button type="submit" class="btn-pay" id="submit-payment">
                    <i class="fas fa-lock"></i>
                    <span id="pay-button-text">Jetzt bezahlen</span>
                </button>
            </div>
            
            <div class="payment-footer">
                <p class="security-info">
                    <i class="fas fa-shield-alt"></i>
                    Ihre Zahlungsdaten werden verschlüsselt übertragen und sicher verarbeitet.
                </p>
                <div class="payment-logos">
                    <img src="/images/pci-dss.svg" alt="PCI DSS">
                    <img src="/images/ssl-secure.svg" alt="SSL Secure">
                    <img src="/images/swiss-made.svg" alt="Swiss Made">
                </div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Payment method selection
        this.form.querySelectorAll('input[name="payment-method"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.selectedMethod = e.target.value;
                this.updatePaymentUI();
            });
        });
        
        // Form submission
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .payment-form {
                max-width: 600px;
                margin: 0 auto;
                padding: 2rem;
                background: var(--bg-card);
                border-radius: 1rem;
                box-shadow: var(--shadow-lg);
            }
            
            .payment-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
            }
            
            .secure-badge {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: var(--primary);
                font-size: 0.875rem;
            }
            
            .payment-methods {
                display: grid;
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .payment-method-option {
                position: relative;
                cursor: pointer;
            }
            
            .payment-method-option input {
                position: absolute;
                opacity: 0;
            }
            
            .method-content {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                border: 2px solid var(--border-color);
                border-radius: 0.5rem;
                transition: all 0.3s ease;
            }
            
            .payment-method-option input:checked + .method-content {
                border-color: var(--primary);
                background: rgba(255, 107, 107, 0.1);
            }
            
            .method-content:hover {
                border-color: var(--primary-light);
            }
            
            .twint-logo,
            .paypal-logo {
                height: 24px;
                width: auto;
            }
            
            .badge {
                margin-left: auto;
                padding: 0.25rem 0.5rem;
                background: var(--primary);
                color: white;
                border-radius: 1rem;
                font-size: 0.75rem;
            }
            
            .payment-summary {
                background: var(--bg-secondary);
                padding: 1.5rem;
                border-radius: 0.5rem;
                margin: 2rem 0;
            }
            
            .summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
            }
            
            .summary-row.total {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 2px solid var(--border-color);
                font-size: 1.25rem;
                font-weight: bold;
                color: var(--primary);
            }
            
            .payment-actions {
                display: flex;
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .btn-back {
                flex: 1;
                padding: 1rem;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 0.5rem;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .btn-pay {
                flex: 2;
                padding: 1rem;
                background: var(--gradient-primary);
                color: white;
                border: none;
                border-radius: 0.5rem;
                font-size: 1.125rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .btn-pay:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-lg);
            }
            
            .btn-pay:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .payment-footer {
                text-align: center;
                color: var(--text-secondary);
                font-size: 0.875rem;
            }
            
            .security-info {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                margin-bottom: 1rem;
            }
            
            .payment-logos {
                display: flex;
                justify-content: center;
                gap: 2rem;
                opacity: 0.6;
            }
            
            .payment-logos img {
                height: 30px;
                width: auto;
            }
            
            /* Loading state */
            .payment-form.loading {
                position: relative;
                pointer-events: none;
                opacity: 0.6;
            }
            
            .payment-form.loading::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 40px;
                height: 40px;
                border: 3px solid var(--primary);
                border-top-color: transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to { transform: translate(-50%, -50%) rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================================================
// EXPORT & INITIALIZATION
// ============================================================================

// Create singleton instance
const paymentManager = new PaymentManager();

// Export for use
export { paymentManager, PaymentForm };

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
    window.EATECH_PAYMENT = paymentManager;
}