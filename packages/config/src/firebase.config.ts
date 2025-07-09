// Firebase Configuration for Eatech Food Truck System
// This file contains the shared Firebase configuration

export const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144",
  measurementId: "G-N0KHWJG9KP"
};

// Environment-specific configurations
export const config = {
  // Stripe
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  
  // App Configuration
  appUrl: process.env.VITE_APP_URL || 'https://eatech.ch',
  apiUrl: process.env.VITE_API_URL || 'https://api.eatech.ch',
  
  // Feature Flags
  features: {
    voiceOrdering: true,
    smartNotifications: true,
    dynamicPricing: true,
    predictiveMaintenance: true,
    multiLanguage: true,
    offlineMode: true,
    haccp: true
  },
  
  // Business Rules
  business: {
    platformFeePercentage: 3,
    trialPeriodDays: 90,
    dailyOrderNumberStart: 100,
    maxOrdersPerMinute: 10,
    temperatureCheckInterval: 15 * 60 * 1000, // 15 minutes
    supportedLanguages: ['de', 'fr', 'it', 'en'],
    defaultLanguage: 'de',
    vatRates: {
      takeaway: 2.5,
      dineIn: 7.7
    }
  },
  
  // Allergens (Swiss + EU)
  allergens: [
    'gluten',
    'crustaceans',
    'eggs',
    'fish',
    'peanuts',
    'soybeans',
    'milk',
    'nuts',
    'celery',
    'mustard',
    'sesame',
    'sulphites',
    'lupin',
    'molluscs'
  ]
};

// Export environment check
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';
