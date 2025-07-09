import { z } from 'zod';

// Payment provider types
export type PaymentProvider = 'stripe' | 'twint' | 'paypal' | 'cash';
export type PaymentMethod = 'card' | 'twint' | 'paypal' | 'cash' | 'invoice';

// Payment configuration schema
export const paymentConfigSchema = z.object({
  // Available payment providers
  providers: z.object({
    stripe: z.object({
      enabled: z.boolean().default(true),
      publicKey: z.string(),
      secretKey: z.string().optional(), // Only for server-side
      webhookSecret: z.string().optional(),
      
      // Stripe-specific settings
      options: z.object({
        apiVersion: z.string().default('2023-10-16'),
        locale: z.enum(['de', 'fr', 'it', 'en']).default('de'),
        
        // Payment methods
        paymentMethods: z.array(z.enum([
          'card',
          'sepa_debit',
          'ideal',
          'bancontact',
          'giropay',
          'eps',
          'p24',
          'sofort'
        ])).default(['card', 'sepa_debit']),
        
        // Card options
        card: z.object({
          hidePostalCode: z.boolean().default(false),
          iconStyle: z.enum(['solid', 'default']).default('default'),
          style: z.object({
            base: z.object({
              fontSize: z.string().default('16px'),
              color: z.string().default('#32325d'),
              fontFamily: z.string().default('"Helvetica Neue", Helvetica, sans-serif'),
              '::placeholder': z.object({
                color: z.string().default('#aab7c4')
              }).optional()
            }).optional(),
            invalid: z.object({
              color: z.string().default('#fa755a'),
              iconColor: z.string().default('#fa755a')
            }).optional()
          }).optional()
        }).default({}),
        
        // 3D Secure
        threeDSecure: z.object({
          enabled: z.boolean().default(true),
          requireForAll: z.boolean().default(false),
          minimumAmount: z.number().default(50) // CHF
        }).default({}),
        
        // Payment request button (Apple Pay, Google Pay)
        paymentRequestButton: z.object({
          enabled: z.boolean().default(true),
          country: z.string().default('CH'),
          currency: z.string().default('CHF'),
          style: z.object({
            type: z.enum(['default', 'donate', 'buy', 'book']).default('default'),
            theme: z.enum(['dark', 'light', 'light-outline']).default('dark'),
            height: z.string().default('40px')
          }).optional()
        }).default({})
      }).default({})
    }).optional(),
    
    twint: z.object({
      enabled: z.boolean().default(true),
      merchantId: z.string(),
      merchantName: z.string(),
      apiKey: z.string().optional(),
      apiSecret: z.string().optional(),
      
      // TWINT-specific settings
      options: z.object({
        environment: z.enum(['production', 'sandbox']).default('production'),
        currency: z.enum(['CHF']).default('CHF'),
        
        // QR code options
        qrCode: z.object({
          size: z.number().default(300),
          margin: z.number().default(0),
          color: z.object({
            dark: z.string().default('#000000'),
            light: z.string().default('#FFFFFF')
          }).default({})
        }).default({}),
        
        // Checkout options
        checkout: z.object({
          showLogo: z.boolean().default(true),
          showAmount: z.boolean().default(true),
          autoRedirect: z.boolean().default(true),
          redirectDelay: z.number().default(3000) // ms
        }).default({})
      }).default({})
    }).optional(),
    
    paypal: z.object({
      enabled: z.boolean().default(false),
      clientId: z.string(),
      clientSecret: z.string().optional(),
      
      // PayPal-specific settings
      options: z.object({
        environment: z.enum(['production', 'sandbox']).default('production'),
        locale: z.string().default('de_CH'),
        currency: z.string().default('CHF'),
        
        // Button styling
        style: z.object({
          layout: z.enum(['vertical', 'horizontal']).default('vertical'),
          color: z.enum(['gold', 'blue', 'silver', 'white', 'black']).default('gold'),
          shape: z.enum(['rect', 'pill']).default('rect'),
          label: z.enum(['paypal', 'checkout', 'buynow', 'pay']).default('paypal'),
          height: z.number().min(25).max(55).optional()
        }).default({})
      }).default({})
    }).optional(),
    
    cash: z.object({
      enabled: z.boolean().default(true),
      acceptedNotes: z.array(z.number()).default([10, 20, 50, 100, 200]),
      acceptedCoins: z.array(z.number()).default([0.05, 0.10, 0.20, 0.50, 1, 2, 5]),
      
      // Cash handling options
      options: z.object({
        requireExactAmount: z.boolean().default(false),
        maxCashAmount: z.number().default(1000),
        roundTo: z.number().default(0.05), // Swiss rounding
        provideChange: z.boolean().default(true)
      }).default({})
    }).optional()
  }),
  
  // General payment settings
  settings: z.object({
    // Default payment method
    defaultMethod: z.enum(['card', 'twint', 'paypal', 'cash']).default('card'),
    
    // Currency settings
    currency: z.object({
      default: z.string().default('CHF'),
      supported: z.array(z.string()).default(['CHF', 'EUR']),
      exchangeRates: z.record(z.string(), z.number()).optional()
    }).default({}),
    
    // Transaction limits
    limits: z.object({
      minAmount: z.number().default(1), // Minimum transaction amount
      maxAmount: z.number().default(10000), // Maximum transaction amount
      dailyLimit: z.number().default(50000), // Daily transaction limit per customer
      monthlyLimit: z.number().default(200000) // Monthly transaction limit
    }).default({}),
    
    // Tax settings
    tax: z.object({
      included: z.boolean().default(true), // Tax included in prices
      rate: z.number().default(7.7), // Swiss VAT rate
      reducedRate: z.number().default(2.5), // Reduced VAT rate (food)
      specialRate: z.number().default(3.7) // Special rate (accommodation)
    }).default({}),
    
    // Fee settings
    fees: z.object({
      // Processing fees (can be passed to customer)
      processingFee: z.object({
        enabled: z.boolean().default(false),
        amount: z.number().default(0),
        percentage: z.number().default(0),
        minAmount: z.number().default(0),
        maxAmount: z.number().default(0)
      }).default({}),
      
      // Payment method specific fees
      methodFees: z.record(z.string(), z.object({
        fixed: z.number().default(0),
        percentage: z.number().default(0)
      })).default({})
    }).default({}),
    
    // Security settings
    security: z.object({
      requireCVV: z.boolean().default(true),
      require3DS: z.boolean().default(true),
      fraudDetection: z.boolean().default(true),
      ipWhitelist: z.array(z.string()).optional(),
      ipBlacklist: z.array(z.string()).optional()
    }).default({}),
    
    // Refund settings
    refunds: z.object({
      enabled: z.boolean().default(true),
      autoApprove: z.boolean().default(false),
      maxDays: z.number().default(30), // Max days after payment
      reasons: z.array(z.string()).default([
        'customer_request',
        'duplicate',
        'fraudulent',
        'product_not_received',
        'product_unacceptable',
        'other'
      ])
    }).default({}),
    
    // Invoice settings
    invoice: z.object({
      enabled: z.boolean().default(true),
      autoGenerate: z.boolean().default(true),
      prefix: z.string().default('INV-'),
      startNumber: z.number().default(1000),
      paymentTerms: z.number().default(30), // Days
      template: z.string().optional()
    }).default({})
  }).default({})
});

// Get payment configuration
export const getPaymentConfig = () => {
  const config = {
    providers: {
      stripe: {
        enabled: true,
        publicKey: process.env.VITE_STRIPE_PUBLIC_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        options: {
          apiVersion: '2023-10-16',
          locale: 'de',
          paymentMethods: ['card', 'sepa_debit'],
          card: {
            hidePostalCode: false,
            iconStyle: 'default'
          },
          threeDSecure: {
            enabled: true,
            requireForAll: false,
            minimumAmount: 50
          },
          paymentRequestButton: {
            enabled: true,
            country: 'CH',
            currency: 'CHF'
          }
        }
      },
      
      twint: {
        enabled: true,
        merchantId: process.env.VITE_TWINT_MERCHANT_ID || '',
        merchantName: 'Eatech',
        apiKey: process.env.TWINT_API_KEY,
        apiSecret: process.env.TWINT_API_SECRET,
        options: {
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
          currency: 'CHF',
          qrCode: {
            size: 300,
            margin: 0
          },
          checkout: {
            showLogo: true,
            showAmount: true,
            autoRedirect: true,
            redirectDelay: 3000
          }
        }
      },
      
      cash: {
        enabled: true,
        acceptedNotes: [10, 20, 50, 100, 200],
        acceptedCoins: [0.05, 0.10, 0.20, 0.50, 1, 2, 5],
        options: {
          requireExactAmount: false,
          maxCashAmount: 1000,
          roundTo: 0.05,
          provideChange: true
        }
      }
    },
    
    settings: {
      defaultMethod: 'card' as const,
      currency: {
        default: 'CHF',
        supported: ['CHF', 'EUR']
      },
      limits: {
        minAmount: 1,
        maxAmount: 10000,
        dailyLimit: 50000,
        monthlyLimit: 200000
      },
      tax: {
        included: true,
        rate: 8.1,
        reducedRate: 2.6,
        specialRate: 3.8
      },
      fees: {
        processingFee: {
          enabled: false,
          amount: 0,
          percentage: 0,
          minAmount: 0,
          maxAmount: 0
        },
        methodFees: {}
      },
      security: {
        requireCVV: true,
        require3DS: true,
        fraudDetection: true
      },
      refunds: {
        enabled: true,
        autoApprove: false,
        maxDays: 30,
        reasons: [
          'customer_request',
          'duplicate',
          'fraudulent',
          'product_not_received',
          'product_unacceptable',
          'other'
        ]
      },
      invoice: {
        enabled: true,
        autoGenerate: true,
        prefix: 'INV-',
        startNumber: 1000,
        paymentTerms: 30
      }
    }
  };
  
  try {
    return paymentConfigSchema.parse(config);
  } catch (error) {
    console.error('Invalid payment configuration:', error);
    throw error;
  }
};

// Payment utilities
export const isPaymentMethodAvailable = (
  method: PaymentMethod,
  config = getPaymentConfig()
): boolean => {
  switch (method) {
    case 'card':
      return config.providers.stripe?.enabled || false;
    case 'twint':
      return config.providers.twint?.enabled || false;
    case 'paypal':
      return config.providers.paypal?.enabled || false;
    case 'cash':
      return config.providers.cash?.enabled || false;
    case 'invoice':
      return config.settings.invoice.enabled;
    default:
      return false;
  }
};

export const getAvailablePaymentMethods = (
  config = getPaymentConfig()
): PaymentMethod[] => {
  const methods: PaymentMethod[] = [];
  
  if (config.providers.stripe?.enabled) methods.push('card');
  if (config.providers.twint?.enabled) methods.push('twint');
  if (config.providers.paypal?.enabled) methods.push('paypal');
  if (config.providers.cash?.enabled) methods.push('cash');
  if (config.settings.invoice.enabled) methods.push('invoice');
  
  return methods;
};

export const calculateTransactionFee = (
  amount: number,
  method: PaymentMethod,
  config = getPaymentConfig()
): number => {
  const methodFee = config.settings.fees.methodFees[method];
  if (!methodFee) return 0;
  
  const fixedFee = methodFee.fixed || 0;
  const percentageFee = (amount * (methodFee.percentage || 0)) / 100;
  
  return fixedFee + percentageFee;
};

// Export default configuration
export default getPaymentConfig();
