// Testing utilities and helpers
export * from './utils/render';
export * from './utils/test-ids';

// Mock implementations
export * from './mocks/firebase.mock';
export * from './mocks/payment.mock';

// Test fixtures
export * from './fixtures/users';
export * from './fixtures/products';
export * from './fixtures/orders';

// Re-export commonly used testing library functions
export {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
  prettyDOM,
  queries,
  within,
  getDefaultNormalizer,
} from '@testing-library/react';

export {
  renderHook,
  act as hookAct,
} from '@testing-library/react-hooks';

export { default as userEvent } from '@testing-library/user-event';

// MSW exports
export { rest, graphql } from 'msw';
export { setupServer } from 'msw/node';

// Vitest utilities
export { vi, expect, describe, it, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Custom matchers
import '@testing-library/jest-dom';

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;

  // Mock scrollTo
  window.scrollTo = vi.fn();

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  });

  // Clean up after each test
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
  });
};

// Test data generators
export { faker } from 'faker';

// Utility types for testing
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type MockedFunction<T extends (...args: any[]) => any> = T & {
  mockClear: () => void;
  mockReset: () => void;
  mockRestore: () => void;
  mockReturnValue: (value: ReturnType<T>) => void;
  mockResolvedValue: (value: Awaited<ReturnType<T>>) => void;
  mockRejectedValue: (value: any) => void;
  mockImplementation: (fn: T) => void;
};

// Helper to create async test utilities
export const waitForAsync = async (callback: () => void | Promise<void>) => {
  await act(async () => {
    await callback();
  });
};

// Helper to suppress console errors in tests
export const suppressConsoleError = (testFn: () => void | Promise<void>) => {
  const originalError = console.error;
  console.error = vi.fn();
  
  const restore = () => {
    console.error = originalError;
  };

  if (testFn.constructor.name === 'AsyncFunction') {
    return (testFn() as Promise<void>).finally(restore);
  } else {
    try {
      testFn();
      restore();
    } catch (error) {
      restore();
      throw error;
    }
  }
};

// Default test timeout
export const DEFAULT_TEST_TIMEOUT = 5000;

// Common test IDs
export const TEST_IDS = {
  // Layout
  HEADER: 'header',
  FOOTER: 'footer',
  SIDEBAR: 'sidebar',
  MAIN_CONTENT: 'main-content',
  
  // Navigation
  NAV_MENU: 'nav-menu',
  NAV_LINK: 'nav-link',
  
  // Forms
  FORM: 'form',
  INPUT: 'input',
  BUTTON: 'button',
  SUBMIT_BUTTON: 'submit-button',
  CANCEL_BUTTON: 'cancel-button',
  
  // Feedback
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
  TOAST: 'toast',
  ALERT: 'alert',
  
  // Data display
  TABLE: 'table',
  LIST: 'list',
  CARD: 'card',
  MODAL: 'modal',
} as const;

// Export setup function to be called in test setup files
export const setup = setupTestEnvironment;
