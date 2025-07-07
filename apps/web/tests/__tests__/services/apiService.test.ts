/**
 * File: /apps/web/tests/__tests__/services/apiService.test.ts
 * EATECH V3.0 - API Service Tests
 * Swiss multi-tenant API with authentication, caching, and error handling
 */

import { ApiService } from '@/services/api/apiService';
import { mockOrderData, mockProductData } from '../../__mocks__/mockData';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage for token management
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_API_URL: 'https://api.eatech.ch',
    NEXT_PUBLIC_APP_ENV: 'test'
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    apiService = new ApiService();

    // Mock successful authentication
    localStorageMock.setItem('eatech_auth_token', 'valid-jwt-token');
    localStorageMock.setItem('eatech_tenant_id', 'foodtruck_zurich');
  });

  describe('Initialization', () => {
    it('should initialize with correct base URL', () => {
      expect(apiService.baseURL).toBe('https://api.eatech.ch');
    });

    it('should set default headers', () => {
      const headers = apiService.getDefaultHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Version': 'v1',
        'X-Client-Type': 'web',
        'X-Country': 'CH'
      });
    });

    it('should include authentication header when token exists', () => {
      const headers = apiService.getHeaders();

      expect(headers.Authorization).toBe('Bearer valid-jwt-token');
    });

    it('should include tenant header when tenant is set', () => {
      const headers = apiService.getHeaders();

      expect(headers['X-Tenant-ID']).toBe('foodtruck_zurich');
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({ success: true }),
        text: jest.fn().mockResolvedValue('success'),
        headers: new Headers()
      } as any);
    });

    describe('GET Requests', () => {
      it('should make GET request with correct parameters', async () => {
        await apiService.get('/products');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.eatech.ch/products',
          {
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer valid-jwt-token',
              'X-Tenant-ID': 'foodtruck_zurich'
            })
          }
        );
      });

      it('should handle query parameters', async () => {
        await apiService.get('/products', {
          params: { category: 'mains', available: true }
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.eatech.ch/products?category=mains&available=true',
          expect.any(Object)
        );
      });

      it('should handle Swiss-specific date parameters', async () => {
        const swissDate = '2025-01-07';
        await apiService.get('/orders', {
          params: { date: swissDate, timezone: 'Europe/Zurich' }
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('date=2025-01-07'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('timezone=Europe%2FZurich'),
          expect.any(Object)
        );
      });
    });

    describe('POST Requests', () => {
      it('should make POST request with correct body', async () => {
        const orderData = {
          items: [{ productId: 'prod_123', quantity: 2 }],
          customer: {
            name: 'Hans Müller',
            phone: '+41791234567',
            email: 'hans@example.ch'
          },
          total: 49.80,
          currency: 'CHF'
        };

        await apiService.post('/orders', orderData);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.eatech.ch/orders',
          {
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify(orderData)
          }
        );
      });

      it('should handle FormData for file uploads', async () => {
        const formData = new FormData();
        formData.append('logo', new File([''], 'logo.png'));

        await apiService.post('/tenants/upload-logo', formData);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.eatech.ch/tenants/upload-logo',
          {
            method: 'POST',
            headers: expect.not.objectContaining({
              'Content-Type': 'application/json' // Should be omitted for FormData
            }),
            body: formData
          }
        );
      });
    });

    describe('PUT/PATCH Requests', () => {
      it('should make PUT request for full updates', async () => {
        const productUpdate = {
          name: 'Updated Product',
          price: 25.90,
          available: true
        };

        await apiService.put('/products/prod_123', productUpdate);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.eatech.ch/products/prod_123',
          {
            method: 'PUT',
            headers: expect.any(Object),
            body: JSON.stringify(productUpdate)
          }
        );
      });

      it('should make PATCH request for partial updates', async () => {
        const statusUpdate = { status: 'preparing' };

        await apiService.patch('/orders/ord_123/status', statusUpdate);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.eatech.ch/orders/ord_123/status',
          {
            method: 'PATCH',
            headers: expect.any(Object),
            body: JSON.stringify(statusUpdate)
          }
        );
      });
    });

    describe('DELETE Requests', () => {
      it('should make DELETE request', async () => {
        await apiService.delete('/products/prod_123');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.eatech.ch/products/prod_123',
          {
            method: 'DELETE',
            headers: expect.any(Object)
          }
        );
      });
    });
  });

  describe('Authentication Integration', () => {
    it('should refresh token when expired', async () => {
      // Mock expired token response
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: jest.fn().mockResolvedValue({ error: 'Token expired' })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            token: 'new-jwt-token',
            expiresIn: 3600
          })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ success: true })
        } as any);

      const result = await apiService.get('/protected-resource');

      // Should make 3 calls: failed request, token refresh, retry request
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'eatech_auth_token',
        'new-jwt-token'
      );
    });

    it('should redirect to login when refresh fails', async () => {
      const mockPush = jest.fn();
      // Mock router
      jest.doMock('next/router', () => ({
        useRouter: () => ({ push: mockPush })
      }));

      // Mock failed token and failed refresh
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        } as any);

      await expect(apiService.get('/protected-resource')).rejects.toThrow();

      // Should clear stored tokens
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('eatech_auth_token');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(apiService.get('/products')).rejects.toThrow(
        expect.objectContaining({
          message: 'Network error',
          type: 'network'
        })
      );
    });

    it('should handle 400 Bad Request with validation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({
          error: 'Validation failed',
          details: {
            phone: 'Invalid Swiss phone number format',
            email: 'Email address is required'
          }
        })
      } as any);

      await expect(apiService.post('/orders', {})).rejects.toThrow(
        expect.objectContaining({
          status: 400,
          message: 'Validation failed',
          details: expect.objectContaining({
            phone: 'Invalid Swiss phone number format'
          })
        })
      );
    });

    it('should handle 403 Forbidden errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: jest.fn().mockResolvedValue({
          error: 'Access denied to this tenant resource'
        })
      } as any);

      await expect(apiService.get('/admin/settings')).rejects.toThrow(
        expect.objectContaining({
          status: 403,
          message: 'Access denied to this tenant resource'
        })
      );
    });

    it('should handle 404 Not Found errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({
          error: 'Product not found'
        })
      } as any);

      await expect(apiService.get('/products/nonexistent')).rejects.toThrow(
        expect.objectContaining({
          status: 404,
          message: 'Product not found'
        })
      );
    });

    it('should handle 429 Rate Limiting with retry', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '2' }),
          json: jest.fn().mockResolvedValue({
            error: 'Rate limit exceeded'
          })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ success: true })
        } as any);

      const startTime = Date.now();
      await apiService.get('/products');
      const endTime = Date.now();

      // Should retry after delay
      expect(endTime - startTime).toBeGreaterThan(2000);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({
          error: 'Internal server error',
          requestId: 'req_123456'
        })
      } as any);

      await expect(apiService.get('/products')).rejects.toThrow(
        expect.objectContaining({
          status: 500,
          message: 'Internal server error',
          requestId: 'req_123456'
        })
      );
    });
  });

  describe('Caching', () => {
    it('should cache GET requests for specified duration', async () => {
      const cacheOptions = { cacheTTL: 60000 }; // 1 minute

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockProductData)
      } as any);

      // First request
      const result1 = await apiService.get('/products', cacheOptions);

      // Second request within cache period
      const result2 = await apiService.get('/products', cacheOptions);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should invalidate cache after TTL expires', async () => {
      const cacheOptions = { cacheTTL: 100 }; // 100ms

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockProductData)
      } as any);

      // First request
      await apiService.get('/products', cacheOptions);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second request after cache expiry
      await apiService.get('/products', cacheOptions);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not cache POST/PUT/DELETE requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true })
      } as any);

      await apiService.post('/orders', {});
      await apiService.post('/orders', {}); // Same request

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should invalidate related cache on mutations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockProductData)
      } as any);

      // Cache products
      await apiService.get('/products', { cacheTTL: 60000 });

      // Update a product (should invalidate cache)
      await apiService.put('/products/prod_123', { name: 'Updated' });

      // Next GET should hit the server again
      await apiService.get('/products', { cacheTTL: 60000 });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Request Interception', () => {
    it('should add request ID to all requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({})
      } as any);

      await apiService.get('/products');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-ID': expect.stringMatching(/^req_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)
          })
        })
      );
    });

    it('should add correlation ID for request tracing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({})
      } as any);

      await apiService.get('/products', {
        correlationId: 'trace_order_flow_123'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Correlation-ID': 'trace_order_flow_123'
          })
        })
      );
    });

    it('should add performance timing headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({})
      } as any);

      await apiService.get('/products');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Client-Timestamp': expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
          })
        })
      );
    });
  });

  describe('Swiss-specific Features', () => {
    it('should format Swiss phone numbers in requests', async () => {
      const customerData = {
        name: 'Hans Müller',
        phone: '079 123 45 67', // Swiss format
        email: 'hans@example.ch'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({})
      } as any);

      await apiService.post('/customers', customerData);

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);

      expect(requestBody.phone).toBe('+41791234567'); // Normalized format
    });

    it('should handle Swiss currency formatting', async () => {
      const orderData = {
        total: 49.80,
        currency: 'CHF'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({})
      } as any);

      await apiService.post('/orders', orderData);

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);

      expect(requestBody.total).toBe(4980); // Converted to Rappen
      expect(requestBody.currency).toBe('CHF');
    });

    it('should include Swiss locale in headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({})
      } as any);

      await apiService.get('/products');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept-Language': 'de-CH,de;q=0.9,en;q=0.8',
            'X-Timezone': 'Europe/Zurich'
          })
        })
      );
    });

    it('should handle FADP compliance headers', async () => {
      const personalData = {
        name: 'Hans Müller',
        email: 'hans@example.ch',
        consentGiven: true
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({})
      } as any);

      await apiService.post('/customers', personalData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-FADP-Consent': 'true',
            'X-Data-Retention': '730' // 2 years in days
          })
        })
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track request duration', async () => {
      const mockPerformanceNow = jest.spyOn(performance, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1500); // 500ms duration

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({})
      } as any);

      const result = await apiService.get('/products');

      expect(result.meta?.duration).toBe(500);
      mockPerformanceNow.mockRestore();
    });

    it('should warn on slow requests', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock slow response
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({})
          } as any), 3000) // 3 second delay
        )
      );

      await apiService.get('/products');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow API request detected'),
        expect.objectContaining({
          url: expect.stringContaining('/products'),
          duration: expect.any(Number)
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Offline Handling', () => {
    it('should detect offline state and queue requests', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const request = apiService.post('/orders', mockOrderData);

      await expect(request).rejects.toThrow(
        expect.objectContaining({
          type: 'offline',
          message: 'Request queued for when connection is restored'
        })
      );

      // Verify request was queued
      expect(apiService.getQueuedRequests()).toHaveLength(1);
    });

    it('should retry queued requests when online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      // Queue a request
      apiService.post('/orders', mockOrderData).catch(() => {});

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true })
      } as any);

      // Trigger online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/orders'),
        expect.any(Object)
      );
    });
  });
});
