import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  settings: TenantSettings;
  subscription: TenantSubscription;
  contact: TenantContact;
  location: TenantLocation;
  businessHours: BusinessHours;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  currency: string;
  timezone: string;
  language: string;
  dateFormat: string;
  orderPrefix: string;
  taxRate: number;
  serviceFee: number;
  minimumOrder: number;
  deliveryRadius: number;
  preparationTime: number; // in minutes
  autoAcceptOrders: boolean;
  enableTableOrdering: boolean;
  enableDelivery: boolean;
  enablePickup: boolean;
  enableReservations: boolean;
  maxReservationSize: number;
  reservationDuration: number; // in minutes
  paymentMethods: PaymentMethod[];
  emailNotifications: boolean;
  smsNotifications: boolean;
  orderNotificationEmail: string;
}

export interface TenantSubscription {
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  trialEndsAt?: Date;
  seats: number;
  features: string[];
  monthlyOrderLimit?: number;
  currentMonthOrders: number;
}

export interface TenantContact {
  email: string;
  phone: string;
  website?: string;
  supportEmail?: string;
  whatsapp?: string;
}

export interface TenantLocation {
  address: string;
  city: string;
  canton: string;
  postalCode: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface BusinessHours {
  [key: string]: DayHours; // monday, tuesday, etc.
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string; // HH:mm format
  closeTime?: string; // HH:mm format
  breaks?: Array<{
    start: string;
    end: string;
  }>;
}

export interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  processingFee?: number;
  minAmount?: number;
  maxAmount?: number;
}

interface TenantStore {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadTenant: (tenantId: string) => Promise<void>;
  updateTenantSettings: (settings: Partial<TenantSettings>) => Promise<void>;
  updateBusinessHours: (hours: BusinessHours) => Promise<void>;
  updateTenantContact: (contact: Partial<TenantContact>) => Promise<void>;
  updateTenantLocation: (location: Partial<TenantLocation>) => Promise<void>;
  updateTenantBranding: (branding: Partial<Pick<Tenant, 'name' | 'logo' | 'primaryColor' | 'secondaryColor' | 'accentColor'>>) => Promise<void>;
  togglePaymentMethod: (methodId: string, enabled: boolean) => Promise<void>;
  updateSubscription: (subscription: Partial<TenantSubscription>) => Promise<void>;
  
  // Computed
  isBusinessOpen: () => boolean;
  getNextOpenTime: () => Date | null;
  canAcceptOrders: () => boolean;
  getRemainingOrders: () => number | null;
}

export const useTenantStore = create<TenantStore>()(
  devtools(
    persist(
      (set, get) => ({
        tenant: null,
        loading: false,
        error: null,

        loadTenant: async (tenantId: string) => {
          set({ loading: true, error: null });
          
          try {
            const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
            
            if (!tenantDoc.exists()) {
              throw new Error('Tenant not found');
            }

            const data = tenantDoc.data();
            const tenant: Tenant = {
              id: tenantDoc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              subscription: {
                ...data.subscription,
                startDate: data.subscription?.startDate?.toDate() || new Date(),
                endDate: data.subscription?.endDate?.toDate(),
                trialEndsAt: data.subscription?.trialEndsAt?.toDate()
              }
            };

            set({ tenant, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        updateTenantSettings: async (settings: Partial<TenantSettings>) => {
          const { tenant } = get();
          if (!tenant) throw new Error('No tenant loaded');

          set({ loading: true });

          try {
            const updatedSettings = { ...tenant.settings, ...settings };
            
            await updateDoc(doc(db, 'tenants', tenant.id), {
              settings: updatedSettings,
              updatedAt: serverTimestamp()
            });

            set({
              tenant: { ...tenant, settings: updatedSettings },
              loading: false
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        updateBusinessHours: async (hours: BusinessHours) => {
          const { tenant } = get();
          if (!tenant) throw new Error('No tenant loaded');

          set({ loading: true });

          try {
            await updateDoc(doc(db, 'tenants', tenant.id), {
              businessHours: hours,
              updatedAt: serverTimestamp()
            });

            set({
              tenant: { ...tenant, businessHours: hours },
              loading: false
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        updateTenantContact: async (contact: Partial<TenantContact>) => {
          const { tenant } = get();
          if (!tenant) throw new Error('No tenant loaded');

          set({ loading: true });

          try {
            const updatedContact = { ...tenant.contact, ...contact };
            
            await updateDoc(doc(db, 'tenants', tenant.id), {
              contact: updatedContact,
              updatedAt: serverTimestamp()
            });

            set({
              tenant: { ...tenant, contact: updatedContact },
              loading: false
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        updateTenantLocation: async (location: Partial<TenantLocation>) => {
          const { tenant } = get();
          if (!tenant) throw new Error('No tenant loaded');

          set({ loading: true });

          try {
            const updatedLocation = { ...tenant.location, ...location };
            
            await updateDoc(doc(db, 'tenants', tenant.id), {
              location: updatedLocation,
              updatedAt: serverTimestamp()
            });

            set({
              tenant: { ...tenant, location: updatedLocation },
              loading: false
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        updateTenantBranding: async (branding) => {
          const { tenant } = get();
          if (!tenant) throw new Error('No tenant loaded');

          set({ loading: true });

          try {
            await updateDoc(doc(db, 'tenants', tenant.id), {
              ...branding,
              updatedAt: serverTimestamp()
            });

            set({
              tenant: { ...tenant, ...branding },
              loading: false
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        togglePaymentMethod: async (methodId: string, enabled: boolean) => {
          const { tenant } = get();
          if (!tenant) throw new Error('No tenant loaded');

          set({ loading: true });

          try {
            const updatedMethods = tenant.settings.paymentMethods.map(method =>
              method.id === methodId ? { ...method, enabled } : method
            );

            await updateDoc(doc(db, 'tenants', tenant.id), {
              'settings.paymentMethods': updatedMethods,
              updatedAt: serverTimestamp()
            });

            set({
              tenant: {
                ...tenant,
                settings: {
                  ...tenant.settings,
                  paymentMethods: updatedMethods
                }
              },
              loading: false
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        updateSubscription: async (subscription: Partial<TenantSubscription>) => {
          const { tenant } = get();
          if (!tenant) throw new Error('No tenant loaded');

          set({ loading: true });

          try {
            const updatedSubscription = { ...tenant.subscription, ...subscription };
            
            await updateDoc(doc(db, 'tenants', tenant.id), {
              subscription: updatedSubscription,
              updatedAt: serverTimestamp()
            });

            set({
              tenant: { ...tenant, subscription: updatedSubscription },
              loading: false
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        isBusinessOpen: () => {
          const { tenant } = get();
          if (!tenant) return false;

          const now = new Date();
          const dayName = now.toLocaleLowerCase('en-US', { weekday: 'long' });
          const currentTime = now.toTimeString().slice(0, 5); // HH:mm format

          const todayHours = tenant.businessHours[dayName];
          if (!todayHours?.isOpen || !todayHours.openTime || !todayHours.closeTime) {
            return false;
          }

          // Check if within open hours
          if (currentTime < todayHours.openTime || currentTime > todayHours.closeTime) {
            return false;
          }

          // Check if in a break period
          if (todayHours.breaks) {
            for (const breakPeriod of todayHours.breaks) {
              if (currentTime >= breakPeriod.start && currentTime <= breakPeriod.end) {
                return false;
              }
            }
          }

          return true;
        },

        getNextOpenTime: () => {
          const { tenant } = get();
          if (!tenant) return null;

          const now = new Date();
          const currentDayIndex = now.getDay();
          const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

          // Check next 7 days
          for (let i = 0; i < 7; i++) {
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() + i);
            
            const dayIndex = (currentDayIndex + i) % 7;
            const dayName = daysOfWeek[dayIndex];
            const dayHours = tenant.businessHours[dayName];

            if (dayHours?.isOpen && dayHours.openTime) {
              const openTime = new Date(checkDate);
              const [hours, minutes] = dayHours.openTime.split(':');
              openTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

              // If it's today and we're past opening time, skip
              if (i === 0 && openTime <= now) {
                continue;
              }

              return openTime;
            }
          }

          return null;
        },

        canAcceptOrders: () => {
          const { tenant, isBusinessOpen } = get();
          if (!tenant) return false;

          // Check if tenant is active
          if (!tenant.isActive) return false;

          // Check subscription status
          if (tenant.subscription.status !== 'active' && tenant.subscription.status !== 'trial') {
            return false;
          }

          // Check order limit
          if (tenant.subscription.monthlyOrderLimit) {
            if (tenant.subscription.currentMonthOrders >= tenant.subscription.monthlyOrderLimit) {
              return false;
            }
          }

          // Check business hours
          if (!tenant.settings.autoAcceptOrders && !isBusinessOpen()) {
            return false;
          }

          return true;
        },

        getRemainingOrders: () => {
          const { tenant } = get();
          if (!tenant || !tenant.subscription.monthlyOrderLimit) return null;

          return tenant.subscription.monthlyOrderLimit - tenant.subscription.currentMonthOrders;
        }
      }),
      {
        name: 'tenant-store',
        partialize: (state) => ({ tenant: state.tenant })
      }
    )
  )
);
