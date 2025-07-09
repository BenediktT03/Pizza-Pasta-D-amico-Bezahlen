// Services
export * from './services/auth/auth.service';
export * from './services/auth/auth.types';
export * from './services/auth/auth.utils';

export * from './services/database/firestore.service';
export * from './services/database/realtime.service';

export * from './services/payment/stripe.service';
export * from './services/payment/twint.service';
export * from './services/payment/payment.types';

export * from './services/order/order.service';
export * from './services/order/order.validator';
export * from './services/order/order.types';

export * from './services/tenant/tenant.service';
export * from './services/tenant/tenant.types';
export * from './services/tenant/tenant.middleware';

export * from './services/voice/voice.service';
export * from './services/voice/voice.parser';
export * from './services/voice/voice.types';

export * from './services/ai/pricing.service';
export * from './services/ai/prediction.service';
export * from './services/ai/ai.types';

// Hooks
export * from './hooks/useFirestore';
export * from './hooks/useAuth';
export * from './hooks/usePayment';
export * from './hooks/useTenant';

// Utils
export * from './utils/validators';
export * from './utils/formatters';
export * from './utils/errors';
export * from './utils/helpers';

// Re-export Firebase types that are commonly used
export type {
  User,
  UserCredential,
  AuthError,
} from 'firebase/auth';

export type {
  DocumentData,
  DocumentReference,
  CollectionReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot,
  Timestamp,
  FieldValue,
  FirestoreError,
} from 'firebase/firestore';
