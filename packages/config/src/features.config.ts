import { z } from 'zod';

// Feature flags schema
export const featuresConfigSchema = z.object({
  // Core features
  core: z.object({
    multiTenant: z.object({
      enabled: z.boolean().default(true),
      maxTenantsPerAccount: z.number().default(10),
      customDomains: z.boolean().default(true),
      whiteLabel: z.boolean().default(true)
    }).default({}),
    
    ordering: z.object({
      enabled: z.boolean().default(true),
      types: z.array(z.enum(['dine-in', 'takeaway', 'delivery'])).default(['dine-in', 'takeaway', 'delivery']),
      minOrderAmount: z.number().default(0),
      maxOrderAmount: z.number().default(10000),
      allowGuestOrders: z.boolean().default(true),
      requirePhoneVerification: z.boolean().default(false),
      orderNumberPrefix: z.string().default('ORD-'),
      qrCodeOrdering: z.boolean().default(true),
      tableOrdering: z.boolean().default(true)
    }).default({}),
    
    menu: z.object({
      enabled: z.boolean().default(true),
      digitalMenu: z.boolean().default(true),
      categorization: z.boolean().default(true),
      modifiers: z.boolean().default(true),
      variants: z.boolean().default(true),
      combos: z.boolean().default(true),
      recommendations: z.boolean().default(true),
      nutritionInfo: z.boolean().default(true),
      allergenInfo: z.boolean().default(true),
      images: z.boolean().default(true),
      descriptions: z.boolean().default(true),
      pricing: z.object({
        dynamic: z.boolean().default(false),
        tiered: z.boolean().default(false),
        happy_hour: z.boolean().default(true),
        bulk_discount: z.boolean().default(true)
      }).default({})
    }).default({}),
    
    payment: z.object({
      enabled: z.boolean().default(true),
      providers: z.array(z.enum(['stripe', 'twint', 'paypal', 'cash'])).default(['stripe', 'twint', 'cash']),
      splitPayment: z.boolean().default(true),
      tipping: z.boolean().default(true),
      deposits: z.boolean().default(false),
      invoicing: z.boolean().default(true),
      refunds: z.boolean().default(true)
    }).default({})
  }).default({}),
  
  // Advanced features
  advanced: z.object({
    voiceOrdering: z.object({
      enabled: z.boolean().default(true),
      languages: z.array(z.enum(['de-CH', 'de', 'fr', 'it', 'en'])).default(['de-CH', 'de', 'fr', 'it', 'en']),
      aiAssistant: z.boolean().default(true),
      naturalLanguageProcessing: z.boolean().default(true),
      voiceConfirmation: z.boolean().default(true),
      accessibility: z.boolean().default(true)
    }).default({}),
    
    ai: z.object({
      enabled: z.boolean().default(true),
      dynamicPricing: z.boolean().default(true),
      demandForecasting: z.boolean().default(true),
      inventoryOptimization: z.boolean().default(true),
      personalization: z.boolean().default(true),
      chatbot: z.boolean().default(true),
      imageRecognition: z.boolean().default(false),
      sentimentAnalysis: z.boolean().default(true)
    }).default({}),
    
    analytics: z.object({
      enabled: z.boolean().default(true),
      realtime: z.boolean().default(true),
      historical: z.boolean().default(true),
      predictive: z.boolean().default(true),
      customReports: z.boolean().default(true),
      dataExport: z.boolean().default(true),
      apiAccess: z.boolean().default(false),
      dashboards: z.array(z.string()).default(['sales', 'customers', 'products', 'staff'])
    }).default({}),
    
    marketing: z.object({
      enabled: z.boolean().default(true),
      emailCampaigns: z.boolean().default(true),
      smsCampaigns: z.boolean().default(true),
      pushNotifications: z.boolean().default(true),
      loyalty: z.object({
        enabled: z.boolean().default(true),
        pointsSystem: z.boolean().default(true),
        tiers: z.boolean().default(true),
        rewards: z.boolean().default(true),
        referrals: z.boolean().default(true)
      }).default({}),
      promotions: z.object({
        enabled: z.boolean().default(true),
        coupons: z.boolean().default(true),
        discounts: z.boolean().default(true),
        bundles: z.boolean().default(true),
        flashSales: z.boolean().default(true),
        happyHour: z.boolean().default(true)
      }).default({}),
      reviews: z.object({
        enabled: z.boolean().default(true),
        moderation: z.boolean().default(true),
        responses: z.boolean().default(true),
        incentives: z.boolean().default(true)
      }).default({})
    }).default({})
  }).default({}),
  
  // Operations features
  operations: z.object({
    inventory: z.object({
      enabled: z.boolean().default(true),
      tracking: z.boolean().default(true),
      alerts: z.boolean().default(true),
      autoReorder: z.boolean().default(false),
      suppliers: z.boolean().default(true),
      wastage: z.boolean().default(true),
      recipes: z.boolean().default(true),
      barcoding: z.boolean().default(false)
    }).default({}),
    
    kitchen: z.object({
      enabled: z.boolean().default(true),
      display: z.boolean().default(true),
      routing: z.boolean().default(true),
      timing: z.boolean().default(true),
      prioritization: z.boolean().default(true),
      stations: z.boolean().default(true),
      printers: z.boolean().default(true),
      notifications: z.boolean().default(true)
    }).default({}),
    
    staff: z.object({
      enabled: z.boolean().default(true),
      roles: z.boolean().default(true),
      permissions: z.boolean().default(true),
      shifts: z.boolean().default(true),
      timeTracking: z.boolean().default(true),
      performance: z.boolean().default(true),
      training: z.boolean().default(false),
      communication: z.boolean().default(true)
    }).default({}),
    
    delivery: z.object({
      enabled: z.boolean().default(true),
      inHouse: z.boolean().default(true),
      thirdParty: z.array(z.string()).default([]),
      tracking: z.boolean().default(true),
      routing: z.boolean().default(true),
      zones: z.boolean().default(true),
      fees: z.boolean().default(true),
      timeEstimates: z.boolean().default(true)
    }).default({})
  }).default({}),
  
  // Integration features
  integrations: z.object({
    pos: z.object({
      enabled: z.boolean().default(false),
      providers: z.array(z.string()).default([]),
      sync: z.object({
        products: z.boolean().default(true),
        orders: z.boolean().default(true),
        customers: z.boolean().default(true),
        inventory: z.boolean().default(true)
      }).default({})
    }).default({}),
    
    accounting: z.object({
      enabled: z.boolean().default(false),
      providers: z.array(z.string()).default([]),
      autoSync: z.boolean().default(false),
      taxReporting: z.boolean().default(true)
    }).default({}),
    
    crm: z.object({
      enabled: z.boolean().default(false),
      providers: z.array(z.string()).default([]),
      customerSync: z.boolean().default(true),
      marketingSync: z.boolean().default(true)
    }).default({}),
    
    delivery: z.object({
      enabled: z.boolean().default(false),
      providers: z.array(z.string()).default([]),
      autoDispatch: z.boolean().default(false)
    }).default({}),
    
    social: z.object({
      enabled: z.boolean().default(true),
      facebook: z.boolean().default(true),
      instagram: z.boolean().default(true),
      google: z.boolean().default(true),
      autoPost: z.boolean().default(false),
      reviewManagement: z.boolean().default(true)
    }).default({}),
    
    calendar: z.object({
      enabled: z.boolean().default(true),
      reservations: z.boolean().default(true),
      events: z.boolean().default(true),
      catering: z.boolean().default(true),
      googleCalendar: z.boolean().default(true),
      outlookCalendar: z.boolean().default(false)
    }).default({})
  }).default({}),
  
  // Experimental features
  experimental: z.object({
    enabled: z.boolean().default(false),
    features: z.array(z.string()).default([]),
    betaFeatures: z.object({
      ar_menu: z.boolean().default(false),
      blockchain_payments: z.boolean().default(false),
      drone_delivery: z.boolean().default(false),
      holographic_display: z.boolean().default(false),
      robot_service: z.boolean().default(false),
      biometric_payments: z.boolean().default(false)
    }).default({})
  }).default({})
});

// Feature availability by plan
export const featurePlans = {
  starter: {
    core: {
      multiTenant: { enabled: false },
      ordering: { types: ['dine-in', 'takeaway'] },
      menu: { pricing: { dynamic: false } },
      payment: { providers: ['cash'] }
    },
    advanced: {
      voiceOrdering: { enabled: false },
      ai: { enabled: false },
      analytics: { predictive: false, customReports: false },
      marketing: { loyalty: { enabled: false } }
    },
    operations: {
      inventory: { autoReorder: false },
      delivery: { enabled: false }
    },
    integrations: {
      pos: { enabled: false },
      accounting: { enabled: false }
    }
  },
  
  professional: {
    core: {
      multiTenant: { enabled: true, maxTenantsPerAccount: 3 },
      ordering: { types: ['dine-in', 'takeaway', 'delivery'] },
      menu: { pricing: { dynamic: true } },
      payment: { providers: ['stripe', 'twint', 'cash'] }
    },
    advanced: {
      voiceOrdering: { enabled: true },
      ai: { enabled: true, imageRecognition: false },
      analytics: { predictive: true, customReports: true, apiAccess: false },
      marketing: { loyalty: { enabled: true } }
    },
    operations: {
      inventory: { autoReorder: true },
      delivery: { enabled: true, thirdParty: [] }
    },
    integrations: {
      pos: { enabled: true },
      accounting: { enabled: true }
    }
  },
  
  enterprise: {
    core: {
      multiTenant: { enabled: true, maxTenantsPerAccount: -1 }, // Unlimited
      ordering: { types: ['dine-in', 'takeaway', 'delivery'] },
      menu: { pricing: { dynamic: true } },
      payment: { providers: ['stripe', 'twint', 'paypal', 'cash'] }
    },
    advanced: {
      voiceOrdering: { enabled: true },
      ai: { enabled: true, imageRecognition: true },
      analytics: { predictive: true, customReports: true, apiAccess: true },
      marketing: { loyalty: { enabled: true } }
    },
    operations: {
      inventory: { autoReorder: true, barcoding: true },
      delivery: { enabled: true, thirdParty: ['uber-eats', 'deliveroo', 'just-eat'] }
    },
    integrations: {
      pos: { enabled: true },
      accounting: { enabled: true, autoSync: true },
      crm: { enabled: true }
    },
    experimental: {
      enabled: true
    }
  }
};

// Get features configuration
export const getFeaturesConfig = (plan: 'starter' | 'professional' | 'enterprise' = 'professional') => {
  const baseConfig = {
    core: {
      multiTenant: { enabled: true },
      ordering: { enabled: true },
      menu: { enabled: true },
      payment: { enabled: true }
    },
    advanced: {
      voiceOrdering: { enabled: true },
      ai: { enabled: true },
      analytics: { enabled: true },
      marketing: { enabled: true }
    },
    operations: {
      inventory: { enabled: true },
      kitchen: { enabled: true },
      staff: { enabled: true },
      delivery: { enabled: true }
    },
    integrations: {
      social: { enabled: true },
      calendar: { enabled: true }
    },
    experimental: {
      enabled: false
    }
  };
  
  // Merge with plan-specific features
  const planFeatures = featurePlans[plan] || {};
  const mergedConfig = deepMerge(baseConfig, planFeatures);
  
  try {
    return featuresConfigSchema.parse(mergedConfig);
  } catch (error) {
    console.error('Invalid features configuration:', error);
    return baseConfig;
  }
};

// Deep merge utility
function deepMerge(target: any, source: any): any {
  if (!source) return target;
  
  const output = { ...target };
  
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  });
  
  return output;
}

// Feature checking utilities
export const isFeatureEnabled = (
  featurePath: string,
  config = getFeaturesConfig()
): boolean => {
  const paths = featurePath.split('.');
  let current: any = config;
  
  for (const path of paths) {
    if (!current || typeof current !== 'object') return false;
    current = current[path];
  }
  
  return current?.enabled === true || current === true;
};

export const getEnabledFeatures = (config = getFeaturesConfig()): string[] => {
  const features: string[] = [];
  
  const traverse = (obj: any, path: string[] = []) => {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = [...path, key];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (value.enabled === true) {
          features.push(currentPath.join('.'));
        }
        traverse(value, currentPath);
      } else if (value === true && key === 'enabled') {
        features.push(path.join('.'));
      }
    });
  };
  
  traverse(config);
  return features;
};

// Export default configuration
export default getFeaturesConfig(
  (process.env.VITE_PLAN as 'starter' | 'professional' | 'enterprise') || 'professional'
);
