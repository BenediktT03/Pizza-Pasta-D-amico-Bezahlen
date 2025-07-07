import { AnalyticsCollector } from '@/lib/analytics';
import { ApiClient } from '@/lib/apiClient';
import { WebSocketManager } from '@/lib/websocket';
import { SystemService } from '@/services/systemService';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/apiClient');
vi.mock('@/lib/websocket');
vi.mock('@/lib/analytics');
vi.mock('@/lib/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
    batch: vi.fn(),
  },
  FieldValue: {
    serverTimestamp: vi.fn(),
    increment: vi.fn(),
  },
}));

describe('SystemService', () => {
  let systemService: SystemService;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockWebSocket: jest.Mocked<WebSocketManager>;
  let mockAnalytics: jest.Mocked<AnalyticsCollector>;

  const mockSystemMetrics = {
    system: {
      uptime: 99.97,
      responseTime: 142,
      errorRate: 0.003,
      activeUsers: 1247,
      serverLoad: 34.2,
      memoryUsage: 68.5,
      cpuUsage: 23.8,
      diskUsage: 45.2,
    },
    business: {
      ordersToday: 2847,
      revenueToday: 89456.30,
      averageOrderValue: 31.42,
      conversionRate: 12.7,
      customerSatisfaction: 4.6,
      repeatCustomerRate: 34.8,
    },
    tenants: {
      total: 234,
      active: 198,
      trial: 12,
      churned: 3,
      mrr: 11566.00,
      newSignups: 5,
      cancellations: 1,
    },
    timestamp: '2025-01-07T15:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    } as any;

    mockWebSocket = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      isConnected: true,
    } as any;

    mockAnalytics = {
      track: vi.fn(),
      identify: vi.fn(),
      page: vi.fn(),
    } as any;

    (ApiClient as any).mockImplementation(() => mockApiClient);
    (WebSocketManager as any).mockImplementation(() => mockWebSocket);
    (AnalyticsCollector as any).mockImplementation(() => mockAnalytics);

    systemService = new SystemService();
  });

  describe('System Metrics', () => {
    describe('getSystemMetrics', () => {
      it('should fetch current system metrics successfully', async () => {
        mockApiClient.get.mockResolvedValue({ data: mockSystemMetrics });

        const result = await systemService.getSystemMetrics();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/master/metrics');
        expect(result).toEqual(mockSystemMetrics);
        expect(mockAnalytics.track).toHaveBeenCalledWith('system_metrics_fetched');
      });

      it('should fetch metrics for specific time period', async () => {
        const period = '7d';
        mockApiClient.get.mockResolvedValue({ data: mockSystemMetrics });

        await systemService.getSystemMetrics(period);

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/master/metrics', {
          params: { period }
        });
      });

      it('should handle API errors gracefully', async () => {
        const error = new Error('Network error');
        mockApiClient.get.mockRejectedValue(error);

        await expect(systemService.getSystemMetrics()).rejects.toThrow('Network error');
        expect(mockAnalytics.track).toHaveBeenCalledWith('system_metrics_error', {
          error: error.message
        });
      });

      it('should cache metrics for short periods', async () => {
        mockApiClient.get.mockResolvedValue({ data: mockSystemMetrics });

        // First call
        await systemService.getSystemMetrics();
        // Second call within cache window
        await systemService.getSystemMetrics();

        // Should only make one API call
        expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      });

      it('should validate metric data structure', async () => {
        const invalidMetrics = { incomplete: 'data' };
        mockApiClient.get.mockResolvedValue({ data: invalidMetrics });

        await expect(systemService.getSystemMetrics()).rejects.toThrow('Invalid metrics format');
      });
    });

    describe('getHistoricalMetrics', () => {
      it('should fetch historical data with proper parameters', async () => {
        const historicalData = {
          metrics: [mockSystemMetrics],
          timeRange: { start: '2025-01-01', end: '2025-01-07' },
        };
        mockApiClient.get.mockResolvedValue({ data: historicalData });

        const result = await systemService.getHistoricalMetrics('7d', '1h');

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/master/metrics/historical', {
          params: { period: '7d', granularity: '1h' }
        });
        expect(result).toEqual(historicalData);
      });

      it('should handle granularity validation', async () => {
        await expect(
          systemService.getHistoricalMetrics('30d', 'invalid_granularity' as any)
        ).rejects.toThrow('Invalid granularity');
      });
    });
  });

  describe('Real-time Monitoring', () => {
    describe('subscribeToMetrics', () => {
      it('should establish WebSocket connection for real-time updates', () => {
        const callback = vi.fn();

        systemService.subscribeToMetrics(callback);

        expect(mockWebSocket.connect).toHaveBeenCalledWith('wss://ws.eatech.ch/master');
        expect(mockWebSocket.on).toHaveBeenCalledWith('metrics:update', callback);
      });

      it('should handle WebSocket connection errors', () => {
        const callback = vi.fn();
        const errorCallback = vi.fn();

        systemService.subscribeToMetrics(callback, errorCallback);

        // Simulate connection error
        const errorHandler = mockWebSocket.on.mock.calls.find(
          call => call[0] === 'connect_error'
        )?.[1];

        const error = new Error('Connection failed');
        errorHandler?.(error);

        expect(errorCallback).toHaveBeenCalledWith(error);
        expect(mockAnalytics.track).toHaveBeenCalledWith('realtime_connection_error', {
          error: error.message
        });
      });

      it('should reconnect automatically on connection loss', () => {
        const callback = vi.fn();

        systemService.subscribeToMetrics(callback);

        // Simulate disconnect
        const disconnectHandler = mockWebSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )?.[1];

        disconnectHandler?.();

        // Should attempt reconnection after delay
        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
      });
    });

    describe('unsubscribeFromMetrics', () => {
      it('should properly clean up WebSocket connection', () => {
        const callback = vi.fn();

        systemService.subscribeToMetrics(callback);
        systemService.unsubscribeFromMetrics();

        expect(mockWebSocket.off).toHaveBeenCalledWith('metrics:update');
        expect(mockWebSocket.disconnect).toHaveBeenCalled();
      });
    });
  });

  describe('Tenant Management', () => {
    describe('getAllTenants', () => {
      const mockTenants = [
        {
          id: 'tenant_1',
          name: 'Burger Paradise',
          status: 'active',
          subscription: { plan: 'premium' },
        },
        {
          id: 'tenant_2',
          name: 'Pizza Corner',
          status: 'trial',
          subscription: { plan: 'basic' },
        },
      ];

      it('should fetch all tenants with pagination', async () => {
        mockApiClient.get.mockResolvedValue({
          data: { tenants: mockTenants, total: 234, hasMore: true }
        });

        const result = await systemService.getAllTenants({ page: 1, limit: 20 });

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/master/tenants', {
          params: { page: 1, limit: 20 }
        });
        expect(result.tenants).toEqual(mockTenants);
        expect(result.total).toBe(234);
      });

      it('should apply filters when provided', async () => {
        const filters = { status: 'active', plan: 'premium' };
        mockApiClient.get.mockResolvedValue({ data: { tenants: [mockTenants[0]] } });

        await systemService.getAllTenants({ page: 1, limit: 20, filters });

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/master/tenants', {
          params: { page: 1, limit: 20, ...filters }
        });
      });

      it('should handle search queries', async () => {
        const searchQuery = 'burger';
        mockApiClient.get.mockResolvedValue({ data: { tenants: [mockTenants[0]] } });

        await systemService.getAllTenants({ page: 1, limit: 20, search: searchQuery });

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/master/tenants', {
          params: { page: 1, limit: 20, search: searchQuery }
        });
      });
    });

    describe('getTenantDetails', () => {
      it('should fetch detailed tenant information', async () => {
        const tenantId = 'tenant_123';
        const detailedTenant = {
          ...mockTenants[0],
          stats: mockSystemMetrics.business,
          locations: [],
          staff: [],
        };
        mockApiClient.get.mockResolvedValue({ data: detailedTenant });

        const result = await systemService.getTenantDetails(tenantId);

        expect(mockApiClient.get).toHaveBeenCalledWith(`/api/master/tenants/${tenantId}`);
        expect(result).toEqual(detailedTenant);
      });

      it('should handle non-existent tenant', async () => {
        const tenantId = 'non_existent';
        mockApiClient.get.mockRejectedValue(new Error('Tenant not found'));

        await expect(systemService.getTenantDetails(tenantId)).rejects.toThrow('Tenant not found');
      });
    });

    describe('updateTenantStatus', () => {
      it('should update tenant status successfully', async () => {
        const tenantId = 'tenant_123';
        const newStatus = 'suspended';
        const reason = 'Policy violation';

        mockApiClient.patch.mockResolvedValue({ data: { success: true } });

        await systemService.updateTenantStatus(tenantId, newStatus, reason);

        expect(mockApiClient.patch).toHaveBeenCalledWith(
          `/api/master/tenants/${tenantId}/status`,
          { status: newStatus, reason, updatedBy: expect.any(String) }
        );
        expect(mockAnalytics.track).toHaveBeenCalledWith('tenant_status_updated', {
          tenantId,
          oldStatus: expect.any(String),
          newStatus,
          reason
        });
      });

      it('should validate status transitions', async () => {
        const tenantId = 'tenant_123';
        const invalidStatus = 'invalid_status' as any;

        await expect(
          systemService.updateTenantStatus(tenantId, invalidStatus)
        ).rejects.toThrow('Invalid status');
      });
    });
  });

  describe('Emergency Mode', () => {
    describe('activateEmergencyMode', () => {
      it('should activate emergency mode for specific tenant', async () => {
        const tenantId = 'tenant_123';
        const reason = 'High order volume';
        mockApiClient.post.mockResolvedValue({ data: { success: true } });

        await systemService.activateEmergencyMode(tenantId, reason);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          `/api/master/tenants/${tenantId}/emergency`,
          { reason, activatedBy: expect.any(String) }
        );
        expect(mockAnalytics.track).toHaveBeenCalledWith('emergency_mode_activated', {
          tenantId,
          reason
        });
      });

      it('should activate global emergency mode', async () => {
        const reason = 'System overload';
        mockApiClient.post.mockResolvedValue({ data: { success: true } });

        await systemService.activateEmergencyMode('global', reason);

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/master/emergency/global', {
          reason,
          activatedBy: expect.any(String)
        });
      });

      it('should send emergency notifications', async () => {
        const tenantId = 'tenant_123';
        const reason = 'High order volume';
        mockApiClient.post.mockResolvedValue({ data: { success: true } });

        await systemService.activateEmergencyMode(tenantId, reason);

        expect(mockWebSocket.emit).toHaveBeenCalledWith('emergency:activated', {
          tenantId,
          reason,
          timestamp: expect.any(String)
        });
      });
    });

    describe('deactivateEmergencyMode', () => {
      it('should deactivate emergency mode', async () => {
        const tenantId = 'tenant_123';
        mockApiClient.delete.mockResolvedValue({ data: { success: true } });

        await systemService.deactivateEmergencyMode(tenantId);

        expect(mockApiClient.delete).toHaveBeenCalledWith(
          `/api/master/tenants/${tenantId}/emergency`
        );
        expect(mockAnalytics.track).toHaveBeenCalledWith('emergency_mode_deactivated', {
          tenantId
        });
      });
    });
  });

  describe('Feature Flag Management', () => {
    describe('updateFeatureFlag', () => {
      it('should update global feature flag', async () => {
        const flagName = 'voiceCommerce';
        const enabled = true;
        const rolloutPercentage = 75;

        mockApiClient.put.mockResolvedValue({ data: { success: true } });

        await systemService.updateFeatureFlag(flagName, enabled, rolloutPercentage);

        expect(mockApiClient.put).toHaveBeenCalledWith('/api/master/feature-flags', {
          flagName,
          enabled,
          rolloutPercentage,
          updatedBy: expect.any(String)
        });
      });

      it('should validate rollout percentage', async () => {
        const flagName = 'testFeature';
        const enabled = true;
        const invalidPercentage = 150;

        await expect(
          systemService.updateFeatureFlag(flagName, enabled, invalidPercentage)
        ).rejects.toThrow('Invalid rollout percentage');
      });
    });

    describe('getTenantFeatureFlags', () => {
      it('should fetch feature flags for specific tenant', async () => {
        const tenantId = 'tenant_123';
        const flags = {
          voiceCommerce: true,
          aiPricing: false,
          blockchain: true,
        };
        mockApiClient.get.mockResolvedValue({ data: flags });

        const result = await systemService.getTenantFeatureFlags(tenantId);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          `/api/master/tenants/${tenantId}/feature-flags`
        );
        expect(result).toEqual(flags);
      });
    });
  });

  describe('System Maintenance', () => {
    describe('scheduleMaintenanceWindow', () => {
      it('should schedule maintenance window', async () => {
        const maintenance = {
          startTime: '2025-01-08T02:00:00Z',
          endTime: '2025-01-08T04:00:00Z',
          reason: 'Database migration',
          affectedServices: ['api', 'websocket'],
        };
        mockApiClient.post.mockResolvedValue({ data: { id: 'maint_123' } });

        const result = await systemService.scheduleMaintenanceWindow(maintenance);

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/master/maintenance', maintenance);
        expect(result.id).toBe('maint_123');
        expect(mockAnalytics.track).toHaveBeenCalledWith('maintenance_scheduled', {
          maintenanceId: 'maint_123',
          duration: 2 // hours
        });
      });

      it('should validate maintenance window timing', async () => {
        const invalidMaintenance = {
          startTime: '2025-01-08T02:00:00Z',
          endTime: '2025-01-08T01:00:00Z', // End before start
          reason: 'Invalid timing',
          affectedServices: ['api'],
        };

        await expect(
          systemService.scheduleMaintenanceWindow(invalidMaintenance)
        ).rejects.toThrow('Invalid maintenance window timing');
      });
    });

    describe('notifyMaintenanceWindow', () => {
      it('should send maintenance notifications to all tenants', async () => {
        const maintenanceId = 'maint_123';
        mockApiClient.post.mockResolvedValue({ data: { notificationsSent: 234 } });

        await systemService.notifyMaintenanceWindow(maintenanceId);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          `/api/master/maintenance/${maintenanceId}/notify`
        );
      });
    });
  });

  describe('Data Export', () => {
    describe('exportSystemData', () => {
      it('should export system data in specified format', async () => {
        const exportConfig = {
          format: 'csv' as const,
          dateRange: { start: '2025-01-01', end: '2025-01-07' },
          sections: ['system', 'business', 'tenants'],
        };
        const exportUrl = 'https://storage.eatech.ch/exports/system_2025-01-07.csv';

        mockApiClient.post.mockResolvedValue({ data: { downloadUrl: exportUrl } });

        const result = await systemService.exportSystemData(exportConfig);

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/master/export', exportConfig);
        expect(result.downloadUrl).toBe(exportUrl);
        expect(mockAnalytics.track).toHaveBeenCalledWith('system_data_exported', {
          format: 'csv',
          sections: exportConfig.sections
        });
      });

      it('should handle large export requests', async () => {
        const largeExportConfig = {
          format: 'json' as const,
          dateRange: { start: '2024-01-01', end: '2025-01-07' }, // 1 year
          sections: ['system', 'business', 'tenants', 'analytics'],
        };

        mockApiClient.post.mockResolvedValue({
          data: {
            jobId: 'export_job_123',
            estimatedCompletion: '2025-01-07T16:00:00Z'
          }
        });

        const result = await systemService.exportSystemData(largeExportConfig);

        expect(result.jobId).toBe('export_job_123');
        expect(result.estimatedCompletion).toBeDefined();
      });
    });

    describe('getExportStatus', () => {
      it('should check export job status', async () => {
        const jobId = 'export_job_123';
        const status = {
          id: jobId,
          status: 'completed',
          progress: 100,
          downloadUrl: 'https://storage.eatech.ch/exports/system_2025-01-07.json',
        };
        mockApiClient.get.mockResolvedValue({ data: status });

        const result = await systemService.getExportStatus(jobId);

        expect(mockApiClient.get).toHaveBeenCalledWith(`/api/master/export/${jobId}/status`);
        expect(result).toEqual(status);
      });
    });
  });

  describe('Swiss-specific Compliance', () => {
    describe('generateDSGVOReport', () => {
      it('should generate DSGVO compliance report', async () => {
        const reportConfig = {
          tenantId: 'tenant_123',
          dateRange: { start: '2025-01-01', end: '2025-01-07' },
          includePersonalData: false,
        };
        const reportUrl = 'https://storage.eatech.ch/compliance/dsgvo_tenant_123.pdf';

        mockApiClient.post.mockResolvedValue({ data: { reportUrl } });

        const result = await systemService.generateDSGVOReport(reportConfig);

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/master/compliance/dsgvo', reportConfig);
        expect(result.reportUrl).toBe(reportUrl);
      });

      it('should handle personal data anonymization', async () => {
        const reportConfig = {
          tenantId: 'tenant_123',
          dateRange: { start: '2025-01-01', end: '2025-01-07' },
          includePersonalData: true,
          anonymize: true,
        };

        mockApiClient.post.mockResolvedValue({ data: { reportUrl: 'test.pdf' } });

        await systemService.generateDSGVOReport(reportConfig);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/master/compliance/dsgvo',
          expect.objectContaining({ anonymize: true })
        );
      });
    });

    describe('validateSwissCompliance', () => {
      it('should validate tenant Swiss compliance', async () => {
        const tenantId = 'tenant_123';
        const complianceStatus = {
          dsgvo: true,
          dsg: true,
          fatca: false,
          mwst: true,
          issues: ['FATCA registration required'],
        };
        mockApiClient.get.mockResolvedValue({ data: complianceStatus });

        const result = await systemService.validateSwissCompliance(tenantId);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          `/api/master/compliance/${tenantId}/validate`
        );
        expect(result).toEqual(complianceStatus);
      });
    });
  });

  describe('Error Handling and Logging', () => {
    it('should log all API calls for audit purposes', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockSystemMetrics });

      await systemService.getSystemMetrics();

      expect(mockAnalytics.track).toHaveBeenCalledWith('api_call', {
        endpoint: '/api/master/metrics',
        method: 'GET',
        success: true,
        responseTime: expect.any(Number)
      });
    });

    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockApiClient.get.mockRejectedValue(timeoutError);

      await expect(systemService.getSystemMetrics()).rejects.toThrow('Request timeout');
      expect(mockAnalytics.track).toHaveBeenCalledWith('api_timeout', {
        endpoint: '/api/master/metrics'
      });
    });

    it('should retry failed requests with exponential backoff', async () => {
      mockApiClient.get
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({ data: mockSystemMetrics });

      const result = await systemService.getSystemMetrics();

      expect(mockApiClient.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockSystemMetrics);
    });

    it('should respect rate limits', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockApiClient.get.mockRejectedValue(rateLimitError);

      await expect(systemService.getSystemMetrics()).rejects.toThrow('Rate limit exceeded');
      expect(mockAnalytics.track).toHaveBeenCalledWith('rate_limit_exceeded', {
        endpoint: '/api/master/metrics'
      });
    });
  });

  describe('Caching and Performance', () => {
    it('should implement intelligent caching based on data type', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockSystemMetrics });

      // Real-time metrics should have short cache
      await systemService.getSystemMetrics();
      await systemService.getSystemMetrics();

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);

      // Wait for cache expiry (using fake timers)
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      await systemService.getSystemMetrics();
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cache on data updates', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockSystemMetrics });
      mockApiClient.patch.mockResolvedValue({ data: { success: true } });

      // Populate cache
      await systemService.getSystemMetrics();
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);

      // Update data
      await systemService.updateTenantStatus('tenant_123', 'suspended');

      // Should fetch fresh data
      await systemService.getSystemMetrics();
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
