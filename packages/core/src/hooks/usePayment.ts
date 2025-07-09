import { useState, useCallback, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { 
  PaymentMethod,
  PaymentIntent,
  PaymentStatus,
  PaymentProvider,
  CreatePaymentIntentParams,
  ProcessPaymentParams,
  RefundParams,
  PaymentError
} from '../services/payment/payment.types';
import { stripeService } from '../services/payment/stripe.service';
import { twintService } from '../services/payment/twint.service';
import { useAuth } from './useAuth';
import { useTenant } from './useTenant';

// Payment state
interface PaymentState {
  stripe: Stripe | null;
  elements: StripeElements | null;
  paymentMethods: PaymentMethod[];
  activePaymentMethod: PaymentMethod | null;
  paymentIntent: PaymentIntent | null;
  processing: boolean;
  error: PaymentError | null;
}

/**
 * Hook for payment processing
 */
export function usePayment() {
  const { user, profile } = useAuth();
  const { tenant } = useTenant();
  
  const [state, setState] = useState<PaymentState>({
    stripe: null,
    elements: null,
    paymentMethods: [],
    activePaymentMethod: null,
    paymentIntent: null,
    processing: false,
    error: null,
  });

  // Initialize Stripe
  useEffect(() => {
    const initStripe = async () => {
      if (!tenant?.settings.paymentMethods.card) return;
      
      try {
        const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
        if (!stripeKey) {
          throw new Error('Stripe publishable key not found');
        }
        
        const stripe = await loadStripe(stripeKey, {
          stripeAccount: tenant.metadata?.stripeAccountId,
        });
        
        setState(prev => ({ ...prev, stripe }));
      } catch (error) {
        console.error('Error initializing Stripe:', error);
        setState(prev => ({ 
          ...prev, 
          error: { code: 'STRIPE_INIT_ERROR', message: 'Failed to initialize Stripe' }
        }));
      }
    };
    
    initStripe();
  }, [tenant]);

  // Load payment methods
  const loadPaymentMethods = useCallback(async () => {
    if (!user || !tenant) return;
    
    try {
      const methods: PaymentMethod[] = [];
      
      // Add available payment methods based on tenant settings
      if (tenant.settings.paymentMethods.cash) {
        methods.push({
          id: 'cash',
          type: 'cash',
          provider: 'internal' as PaymentProvider,
          label: 'Bargeld',
          icon: 'cash',
          enabled: true,
        });
      }
      
      if (tenant.settings.paymentMethods.card && state.stripe) {
        methods.push({
          id: 'card',
          type: 'card',
          provider: 'stripe' as PaymentProvider,
          label: 'Kredit-/Debitkarte',
          icon: 'credit-card',
          enabled: true,
        });
      }
      
      if (tenant.settings.paymentMethods.twint) {
        methods.push({
          id: 'twint',
          type: 'twint',
          provider: 'twint' as PaymentProvider,
          label: 'TWINT',
          icon: 'twint',
          enabled: true,
        });
      }
      
      if (tenant.settings.paymentMethods.invoice) {
        methods.push({
          id: 'invoice',
          type: 'invoice',
          provider: 'internal' as PaymentProvider,
          label: 'Rechnung',
          icon: 'invoice',
          enabled: true,
          metadata: {
            termsInDays: 30,
            requiresApproval: true,
          },
        });
      }
      
      // Load saved payment methods from Stripe
      if (state.stripe && profile?.stripeCustomerId) {
        const savedMethods = await stripeService.listPaymentMethods(
          profile.stripeCustomerId
        );
        
        savedMethods.forEach(method => {
          methods.push({
            id: method.id,
            type: 'saved_card',
            provider: 'stripe' as PaymentProvider,
            label: `•••• ${method.card?.last4}`,
            icon: method.card?.brand || 'card',
            enabled: true,
            metadata: {
              brand: method.card?.brand,
              last4: method.card?.last4,
              expMonth: method.card?.exp_month,
              expYear: method.card?.exp_year,
            },
          });
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        paymentMethods: methods,
        activePaymentMethod: methods[0] || null,
      }));
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setState(prev => ({ 
        ...prev, 
        error: { code: 'LOAD_METHODS_ERROR', message: 'Failed to load payment methods' }
      }));
    }
  }, [user, tenant, profile, state.stripe]);

  // Create payment intent
  const createPaymentIntent = useCallback(async (
    params: CreatePaymentIntentParams
  ): Promise<PaymentIntent | null> => {
    if (!tenant) {
      setState(prev => ({ 
        ...prev, 
        error: { code: 'NO_TENANT', message: 'No tenant context' }
      }));
      return null;
    }
    
    setState(prev => ({ ...prev, processing: true, error: null }));
    
    try {
      let paymentIntent: PaymentIntent;
      
      switch (params.provider) {
        case 'stripe':
          paymentIntent = await stripeService.createPaymentIntent({
            ...params,
            currency: tenant.settings.currency || 'CHF',
            metadata: {
              ...params.metadata,
              tenantId: tenant.id,
              userId: user?.uid,
            },
          });
          break;
          
        case 'twint':
          paymentIntent = await twintService.createPayment({
            amount: params.amount,
            currency: tenant.settings.currency || 'CHF',
            orderId: params.orderId,
            returnUrl: params.returnUrl || window.location.origin,
          });
          break;
          
        default:
          // For cash and invoice, create a simple intent
          paymentIntent = {
            id: `${params.provider}_${Date.now()}`,
            amount: params.amount,
            currency: tenant.settings.currency || 'CHF',
            status: 'requires_payment_method' as PaymentStatus,
            provider: params.provider,
            metadata: params.metadata,
            createdAt: new Date(),
          };
      }
      
      setState(prev => ({ 
        ...prev, 
        paymentIntent,
        processing: false,
      }));
      
      return paymentIntent;
    } catch (error) {
      const paymentError = error as PaymentError;
      setState(prev => ({ 
        ...prev, 
        error: paymentError,
        processing: false,
      }));
      throw error;
    }
  }, [tenant, user]);

  // Process payment
  const processPayment = useCallback(async (
    params: ProcessPaymentParams
  ): Promise<PaymentIntent> => {
    if (!state.paymentIntent) {
      throw new Error('No payment intent created');
    }
    
    setState(prev => ({ ...prev, processing: true, error: null }));
    
    try {
      let result: PaymentIntent;
      
      switch (params.paymentMethod.provider) {
        case 'stripe':
          if (!state.stripe) {
            throw new Error('Stripe not initialized');
          }
          
          if (params.paymentMethod.type === 'saved_card') {
            // Use saved payment method
            result = await stripeService.confirmPaymentIntent(
              state.paymentIntent.id,
              params.paymentMethod.id
            );
          } else {
            // Use new card with Elements
            if (!state.elements) {
              throw new Error('Stripe Elements not initialized');
            }
            
            const { error, paymentIntent } = await state.stripe.confirmCardPayment(
              state.paymentIntent.clientSecret!,
              {
                payment_method: params.paymentMethodDetails,
              }
            );
            
            if (error) {
              throw error;
            }
            
            result = {
              ...state.paymentIntent,
              status: paymentIntent!.status as PaymentStatus,
            };
          }
          break;
          
        case 'twint':
          // TWINT payment is handled via redirect
          window.location.href = state.paymentIntent.redirectUrl!;
          result = state.paymentIntent;
          break;
          
        case 'internal':
          // For cash and invoice, just mark as succeeded
          result = {
            ...state.paymentIntent,
            status: 'succeeded' as PaymentStatus,
            paidAt: new Date(),
          };
          break;
          
        default:
          throw new Error(`Unsupported payment provider: ${params.paymentMethod.provider}`);
      }
      
      setState(prev => ({ 
        ...prev, 
        paymentIntent: result,
        processing: false,
      }));
      
      return result;
    } catch (error) {
      const paymentError = error as PaymentError;
      setState(prev => ({ 
        ...prev, 
        error: paymentError,
        processing: false,
      }));
      throw error;
    }
  }, [state.paymentIntent, state.stripe, state.elements]);

  // Refund payment
  const refundPayment = useCallback(async (
    params: RefundParams
  ): Promise<void> => {
    setState(prev => ({ ...prev, processing: true, error: null }));
    
    try {
      switch (params.provider) {
        case 'stripe':
          await stripeService.createRefund({
            paymentIntentId: params.paymentIntentId,
            amount: params.amount,
            reason: params.reason,
          });
          break;
          
        case 'twint':
          await twintService.refundPayment({
            transactionId: params.paymentIntentId,
            amount: params.amount,
            reason: params.reason,
          });
          break;
          
        default:
          // For cash and invoice, just record the refund
          console.log('Refund recorded for:', params);
      }
      
      setState(prev => ({ ...prev, processing: false }));
    } catch (error) {
      const paymentError = error as PaymentError;
      setState(prev => ({ 
        ...prev, 
        error: paymentError,
        processing: false,
      }));
      throw error;
    }
  }, []);

  // Set active payment method
  const setActivePaymentMethod = useCallback((method: PaymentMethod) => {
    setState(prev => ({ ...prev, activePaymentMethod: method }));
  }, []);

  // Initialize Stripe Elements
  const initializeElements = useCallback(async (
    clientSecret: string
  ): Promise<StripeElements | null> => {
    if (!state.stripe) {
      console.error('Stripe not initialized');
      return null;
    }
    
    try {
      const elements = state.stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: tenant?.settings.branding.primaryColor || '#7c3aed',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        },
      });
      
      setState(prev => ({ ...prev, elements }));
      return elements;
    } catch (error) {
      console.error('Error initializing Elements:', error);
      return null;
    }
  }, [state.stripe, tenant]);

  // Load payment methods on mount
  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  return {
    ...state,
    createPaymentIntent,
    processPayment,
    refundPayment,
    setActivePaymentMethod,
    initializeElements,
    loadPaymentMethods,
  };
}

/**
 * Hook for payment method management
 */
export function usePaymentMethods() {
  const { profile } = useAuth();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load saved payment methods
  const loadMethods = useCallback(async () => {
    if (!profile?.stripeCustomerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const paymentMethods = await stripeService.listPaymentMethods(
        profile.stripeCustomerId
      );
      setMethods(paymentMethods);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Add payment method
  const addMethod = useCallback(async (paymentMethodId: string) => {
    if (!profile?.stripeCustomerId) {
      throw new Error('No Stripe customer ID');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await stripeService.attachPaymentMethod(
        paymentMethodId,
        profile.stripeCustomerId
      );
      await loadMethods();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [profile, loadMethods]);

  // Remove payment method
  const removeMethod = useCallback(async (paymentMethodId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await stripeService.detachPaymentMethod(paymentMethodId);
      setMethods(prev => prev.filter(m => m.id !== paymentMethodId));
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Set default payment method
  const setDefaultMethod = useCallback(async (paymentMethodId: string) => {
    if (!profile?.stripeCustomerId) {
      throw new Error('No Stripe customer ID');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await stripeService.updateCustomerDefaultPaymentMethod(
        profile.stripeCustomerId,
        paymentMethodId
      );
      await loadMethods();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [profile, loadMethods]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  return {
    methods,
    loading,
    error,
    addMethod,
    removeMethod,
    setDefaultMethod,
    refresh: loadMethods,
  };
}

/**
 * Hook for payment history
 */
export function usePaymentHistory(filters?: {
  status?: PaymentStatus;
  provider?: PaymentProvider;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const { user, tenant } = useAuth();
  const [history, setHistory] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user || !tenant) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch from your backend
      const response = await fetch('/api/payments/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          userId: user.uid,
          ...filters,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to load payment history');
      }
      
      const data = await response.json();
      setHistory(data.payments);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user, tenant, filters]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    error,
    refresh: loadHistory,
  };
}

/**
 * Hook for Swiss QR-Bill generation
 */
export function useSwissQRBill() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateQRBill = useCallback(async (params: {
    amount: number;
    reference: string;
    message?: string;
    debtor?: {
      name: string;
      address: string;
      city: string;
      postalCode: string;
    };
  }): Promise<string> => {
    if (!tenant) {
      throw new Error('No tenant context');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate Swiss QR-Bill
      const qrData = {
        creditor: {
          name: tenant.name,
          address: tenant.contact.address,
          city: tenant.contact.city,
          postalCode: tenant.contact.postalCode,
          country: 'CH',
          account: tenant.metadata?.iban || '', // IBAN from tenant settings
        },
        amount: params.amount,
        currency: 'CHF',
        reference: params.reference,
        message: params.message,
        debtor: params.debtor,
      };
      
      // In a real implementation, this would call a QR-Bill generation service
      const response = await fetch('/api/payments/qr-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qrData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate QR-Bill');
      }
      
      const { qrCode } = await response.json();
      return qrCode;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  return {
    generateQRBill,
    loading,
    error,
  };
}
