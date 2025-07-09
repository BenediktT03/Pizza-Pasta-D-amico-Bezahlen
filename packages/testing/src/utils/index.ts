// Export all utils
export * from './render';
export * from './test-ids';

// Re-export specific functions for convenience
export {
  renderWithProviders,
  renderHookWithProviders,
  createWrapper,
  waitForLoadingToFinish,
  createMockRouter,
  setMobileViewport,
  setTabletViewport,
  setDesktopViewport,
  fillForm,
  selectOption,
  uploadFile,
  createMockFile,
  checkA11y,
  debugDOM
} from './render';

export {
  testIds,
  createTestId,
  getTestIdSelector,
  queryByTestId,
  queryAllByTestId,
  getTestIdProps
} from './test-ids';

// Create test store utilities
import { create } from 'zustand';

export const createTestStore = <T>(initialState: T) => {
  const store = create<T>(() => initialState);
  
  return {
    store,
    getState: store.getState,
    setState: store.setState,
    subscribe: store.subscribe,
    destroy: store.destroy
  };
};

// Mock local storage
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {};
  
  const localStorageMock = {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(storage);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(storage).length;
    }
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
  
  return localStorageMock;
};

// Mock session storage
export const mockSessionStorage = () => {
  const storage: Record<string, string> = {};
  
  const sessionStorageMock = {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(storage);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(storage).length;
    }
  };
  
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
  });
  
  return sessionStorageMock;
};

// Mock fetch
export const mockFetch = (responses: Array<{ url: string | RegExp; response: any }>) => {
  const fetchMock = jest.fn(async (url: string, options?: RequestInit) => {
    const matchedResponse = responses.find(r => {
      if (typeof r.url === 'string') {
        return url.includes(r.url);
      }
      return r.url.test(url);
    });
    
    if (!matchedResponse) {
      throw new Error(`No mock response for ${url}`);
    }
    
    const response = typeof matchedResponse.response === 'function'
      ? matchedResponse.response(url, options)
      : matchedResponse.response;
    
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => response,
      text: async () => JSON.stringify(response),
      blob: async () => new Blob([JSON.stringify(response)]),
      headers: new Headers({
        'content-type': 'application/json'
      })
    };
  });
  
  global.fetch = fetchMock as any;
  return fetchMock;
};

// Wait for async updates
export const waitForAsync = async (ms: number = 0) => {
  await new Promise(resolve => setTimeout(resolve, ms));
};

// Mock console methods
export const mockConsole = () => {
  const originalConsole = { ...console };
  
  const consoleMock = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
  
  Object.assign(console, consoleMock);
  
  return {
    ...consoleMock,
    restore: () => Object.assign(console, originalConsole)
  };
};

// Performance mark utilities
export const measurePerformance = async (
  name: string,
  fn: () => Promise<void> | void
) => {
  performance.mark(`${name}-start`);
  await fn();
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);
  
  const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure;
  return measure.duration;
};

// Cleanup utilities
export const cleanup = () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear local storage
  if (window.localStorage) {
    window.localStorage.clear();
  }
  
  // Clear session storage
  if (window.sessionStorage) {
    window.sessionStorage.clear();
  }
  
  // Reset document body
  document.body.innerHTML = '';
  
  // Clear performance marks
  performance.clearMarks();
  performance.clearMeasures();
};
