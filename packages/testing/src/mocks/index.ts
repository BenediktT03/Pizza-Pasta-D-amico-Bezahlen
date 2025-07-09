// Export all mocks
export * from './firebase.mock';
export * from './payment.mock';

// Default exports
export { default as mockFirebase } from './firebase.mock';
export { default as mockPayment } from './payment.mock';

// Combined mock setup
export const setupAllMocks = () => {
  require('./firebase.mock').setupFirebaseMocks();
  require('./payment.mock').setupPaymentMocks();
};

export const resetAllMocks = () => {
  require('./firebase.mock').resetFirebaseMocks();
  require('./payment.mock').resetPaymentMocks();
};
