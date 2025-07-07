import { SystemAnalytics } from '@/pages/SystemAnalytics/SystemAnalytics';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import React from 'react';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('next/router', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/services/monitoring.service', () => ({
  getSystemMetrics: vi.fn(),
  getPlatformAnalytics: vi.fn(),
  getRealtimeData: vi.fn(),
  exportAnalyticsData: vi.fn(),
}));

vi.mock('@/services/ai.service', () => ({
  generateInsights: vi.fn(),
  predictSystemLoad: vi.fn(),
  getAnomalies: vi.fn(),
}));

vi.mock('@/hooks/useSystemMetrics', () => ({
  useSystemMetrics: () => ({
    data: mockSystemMetrics,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useRealtime', () => ({
  useRealtime: () => ({
    data: mockRealtimeData,
    isConnected: true,
  }),
}));

const mockRouterPush = vi.fn();
(useRouter as any).mockReturnValue({
  push: mockRouterPush,
  query: { period: '24h' },
});

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
  traffic: {
    pageViews: 45672,
    uniqueVisitors: 12847,
    bounceRate: 23.4,
    sessionDuration: 247,
    peakConcurrent: 456,
    apiCalls: 234567,
  },
};

const mockRealtimeData = {
  liveOrders: 23,
  queueLength: 12,
  averageWaitTime: 8.5,
  activeKitchens: 145,
  emergencyModeActive: 2,
  voiceOrdersToday: 456,
};

const mockAIInsights = {
  insights: [
    {
      type: 'performance',
      severity: 'info',
      title: 'Peak Hour Optimization',
      description: 'System performance optimal during peak hours',
      recommendation: 'Consider scaling for expected 20% growth',
      confidence: 0.89,
    },
    {
      type: 'business',
      severity: 'warning',
      title: 'Conversion Rate Drop',
      description: 'Conversion rate decreased by 2.3% this week',
      recommendation: 'Review checkout flow for potential issues',
      confidence: 0.76,
    },
  ],
  predictions: {
    nextHourLoad: 67.2,
    nextDayOrders: 3200,
    weeklyGrowth: 12.5,
    churnRisk: 2.1,
  },
  anomalies: [
    {
      metric: 'response_time',
      timestamp: '2025-01-07T14:30:00Z',
      value: 450,
      threshold: 200,
      severity: 'medium',
    },
  ],
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('SystemAnalytics Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Structure', () => {
    it('should render page header with title and controls', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('System Analytics');
      expect(screen.getByTestId('time-period-selector')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-button')).toBeInTheDocument();
    });

    it('should display all main metric sections', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByTestId('system-health-section')).toBeInTheDocument();
      expect(screen.getByTestId('business-metrics-section')).toBeInTheDocument();
      expect(screen.getByTestId('tenant-overview-section')).toBeInTheDocument();
      expect(screen.getByTestId('traffic-analytics-section')).toBeInTheDocument();
      expect(screen.getByTestId('realtime-dashboard')).toBeInTheDocument();
    });

    it('should show AI insights panel', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByTestId('ai-insights-panel')).toBeInTheDocument();
      expect(screen.getByText('KI-Erkenntnisse')).toBeInTheDocument();
    });
  });

  describe('System Health Metrics', () => {
    it('should display system uptime correctly', () => {
      renderWithProviders(<SystemAnalytics />);

      const uptimeCard = screen.getByTestId('uptime-metric');
      expect(within(uptimeCard).getByText('99.97%')).toBeInTheDocument();
      expect(within(uptimeCard).getByText('Verfügbarkeit')).toBeInTheDocument();
    });

    it('should show response time with proper formatting', () => {
      renderWithProviders(<SystemAnalytics />);

      const responseTimeCard = screen.getByTestId('response-time-metric');
      expect(within(responseTimeCard).getByText('142ms')).toBeInTheDocument();
      expect(within(responseTimeCard).getByText('Antwortzeit')).toBeInTheDocument();
    });

    it('should display error rate with color coding', () => {
      renderWithProviders(<SystemAnalytics />);

      const errorRateCard = screen.getByTestId('error-rate-metric');
      expect(within(errorRateCard).getByText('0.003%')).toBeInTheDocument();
      expect(errorRateCard).toHaveClass('metric-good'); // Low error rate = good
    });

    it('should show active users count', () => {
      renderWithProviders(<SystemAnalytics />);

      const usersCard = screen.getByTestId('active-users-metric');
      expect(within(usersCard).getByText('1\'247')).toBeInTheDocument();
      expect(within(usersCard).getByText('Aktive Benutzer')).toBeInTheDocument();
    });

    it('should display server load percentage', () => {
      renderWithProviders(<SystemAnalytics />);

      const loadCard = screen.getByTestId('server-load-metric');
      expect(within(loadCard).getByText('34.2%')).toBeInTheDocument();
      expect(loadCard).toHaveClass('metric-normal'); // Normal load
    });
  });

  describe('Business Metrics', () => {
    it('should show daily orders and revenue', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByText('2\'847')).toBeInTheDocument(); // orders
      expect(screen.getByText('CHF 89\'456.30')).toBeInTheDocument(); // revenue
    });

    it('should display conversion rate', () => {
      renderWithProviders(<SystemAnalytics />);

      const conversionCard = screen.getByTestId('conversion-rate-metric');
      expect(within(conversionCard).getByText('12.7%')).toBeInTheDocument();
    });

    it('should show customer satisfaction rating', () => {
      renderWithProviders(<SystemAnalytics />);

      const satisfactionCard = screen.getByTestId('satisfaction-metric');
      expect(within(satisfactionCard).getByText('4.6')).toBeInTheDocument();
      expect(within(satisfactionCard).getByText('⭐')).toBeInTheDocument();
    });

    it('should format Swiss currency correctly', () => {
      renderWithProviders(<SystemAnalytics />);

      // Check multiple currency formats
      expect(screen.getByText('CHF 89\'456.30')).toBeInTheDocument();
      expect(screen.getByText('CHF 31.42')).toBeInTheDocument(); // AOV
      expect(screen.getByText('CHF 11\'566.00')).toBeInTheDocument(); // MRR
    });
  });

  describe('Tenant Analytics', () => {
    it('should display tenant overview statistics', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByText('234')).toBeInTheDocument(); // total tenants
      expect(screen.getByText('198')).toBeInTheDocument(); // active
      expect(screen.getByText('12')).toBeInTheDocument(); // trial
      expect(screen.getByText('3')).toBeInTheDocument(); // churned
    });

    it('should show MRR with growth indicator', () => {
      renderWithProviders(<SystemAnalytics />);

      const mrrCard = screen.getByTestId('mrr-metric');
      expect(within(mrrCard).getByText('CHF 11\'566.00')).toBeInTheDocument();
      expect(within(mrrCard).getByText('MRR')).toBeInTheDocument();
    });

    it('should display new signups and cancellations', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByText('5')).toBeInTheDocument(); // new signups
      expect(screen.getByText('1')).toBeInTheDocument(); // cancellations
    });
  });

  describe('Traffic Analytics', () => {
    it('should show page views and unique visitors', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByText('45\'672')).toBeInTheDocument(); // page views
      expect(screen.getByText('12\'847')).toBeInTheDocument(); // unique visitors
    });

    it('should display bounce rate and session duration', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByText('23.4%')).toBeInTheDocument(); // bounce rate
      expect(screen.getByText('4:07')).toBeInTheDocument(); // session duration (247s)
    });

    it('should show API call statistics', () => {
      renderWithProviders(<SystemAnalytics />);

      const apiCard = screen.getByTestId('api-calls-metric');
      expect(within(apiCard).getByText('234\'567')).toBeInTheDocument();
    });
  });

  describe('Real-time Dashboard', () => {
    it('should display live order count', () => {
      renderWithProviders(<SystemAnalytics />);

      const liveOrdersCard = screen.getByTestId('live-orders-metric');
      expect(within(liveOrdersCard).getByText('23')).toBeInTheDocument();
      expect(within(liveOrdersCard).getByText('Live Bestellungen')).toBeInTheDocument();
    });

    it('should show queue length and wait time', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByText('12')).toBeInTheDocument(); // queue length
      expect(screen.getByText('8.5 min')).toBeInTheDocument(); // wait time
    });

    it('should display active kitchens count', () => {
      renderWithProviders(<SystemAnalytics />);

      const kitchensCard = screen.getByTestId('active-kitchens-metric');
      expect(within(kitchensCard).getByText('145')).toBeInTheDocument();
    });

    it('should show emergency mode status', () => {
      renderWithProviders(<SystemAnalytics />);

      const emergencyCard = screen.getByTestId('emergency-mode-metric');
      expect(within(emergencyCard).getByText('2')).toBeInTheDocument();
      expect(within(emergencyCard).getByText('Notfallmodus aktiv')).toBeInTheDocument();
    });

    it('should display voice orders count', () => {
      renderWithProviders(<SystemAnalytics />);

      const voiceCard = screen.getByTestId('voice-orders-metric');
      expect(within(voiceCard).getByText('456')).toBeInTheDocument();
      expect(within(voiceCard).getByText('Voice Bestellungen heute')).toBeInTheDocument();
    });
  });

  describe('Time Period Filtering', () => {
    it('should allow selecting different time periods', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SystemAnalytics />);

      const periodSelector = screen.getByTestId('time-period-selector');
      await user.click(periodSelector);

      const weekOption = screen.getByText('7 Tage');
      await user.click(weekOption);

      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: '/system-analytics',
        query: { period: '7d' },
      });
    });

    it('should display current period in selector', () => {
      renderWithProviders(<SystemAnalytics />);

      const periodSelector = screen.getByTestId('time-period-selector');
      expect(within(periodSelector).getByText('24 Stunden')).toBeInTheDocument();
    });

    it('should update charts when period changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SystemAnalytics />);

      const periodSelector = screen.getByTestId('time-period-selector');
      await user.click(periodSelector);

      const monthOption = screen.getByText('30 Tage');
      await user.click(monthOption);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-chart')).toHaveAttribute(
          'data-period',
          '30d'
        );
      });
    });
  });

  describe('AI Insights Integration', () => {
    it('should display AI-generated insights', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByText('Peak Hour Optimization')).toBeInTheDocument();
      expect(screen.getByText('Conversion Rate Drop')).toBeInTheDocument();
    });

    it('should show insight severity levels', () => {
      renderWithProviders(<SystemAnalytics />);

      const warningInsight = screen.getByText('Conversion Rate Drop').closest('[data-testid="insight-card"]');
      expect(warningInsight).toHaveClass('insight-warning');

      const infoInsight = screen.getByText('Peak Hour Optimization').closest('[data-testid="insight-card"]');
      expect(infoInsight).toHaveClass('insight-info');
    });

    it('should display confidence scores', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByText('89% Konfidenz')).toBeInTheDocument();
      expect(screen.getByText('76% Konfidenz')).toBeInTheDocument();
    });

    it('should show predictions section', () => {
      renderWithProviders(<SystemAnalytics />);

      const predictionsSection = screen.getByTestId('predictions-section');
      expect(within(predictionsSection).getByText('Nächste Stunde')).toBeInTheDocument();
      expect(within(predictionsSection).getByText('67.2%')).toBeInTheDocument(); // load prediction
    });

    it('should display anomaly alerts', () => {
      renderWithProviders(<SystemAnalytics />);

      const anomalyAlert = screen.getByTestId('anomaly-alert');
      expect(within(anomalyAlert).getByText('Antwortzeit Anomalie')).toBeInTheDocument();
      expect(within(anomalyAlert).getByText('450ms')).toBeInTheDocument();
    });
  });

  describe('Data Export', () => {
    it('should trigger export when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockExport = vi.fn();
      vi.mocked(require('@/services/monitoring.service').exportAnalyticsData).mockImplementation(mockExport);

      renderWithProviders(<SystemAnalytics />);

      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      expect(mockExport).toHaveBeenCalledWith({
        period: '24h',
        format: 'csv',
        sections: ['system', 'business', 'tenants', 'traffic'],
      });
    });

    it('should show export options modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SystemAnalytics />);

      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      const exportModal = screen.getByTestId('export-modal');
      expect(exportModal).toBeInTheDocument();
      expect(within(exportModal).getByText('Daten exportieren')).toBeInTheDocument();
    });

    it('should allow selecting export format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SystemAnalytics />);

      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      const pdfOption = screen.getByLabelText('PDF');
      await user.click(pdfOption);

      const confirmButton = screen.getByText('Exportieren');
      await user.click(confirmButton);

      expect(vi.mocked(require('@/services/monitoring.service').exportAnalyticsData))
        .toHaveBeenCalledWith(expect.objectContaining({ format: 'pdf' }));
    });
  });

  describe('Charts and Visualizations', () => {
    it('should render system metrics chart', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByTestId('system-metrics-chart')).toBeInTheDocument();
    });

    it('should display business metrics chart', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByTestId('business-metrics-chart')).toBeInTheDocument();
    });

    it('should show tenant growth chart', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByTestId('tenant-growth-chart')).toBeInTheDocument();
    });

    it('should handle chart interactions', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SystemAnalytics />);

      const chart = screen.getByTestId('system-metrics-chart');
      await user.hover(chart);

      // Should show tooltip
      await waitFor(() => {
        expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProviders(<SystemAnalytics />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('System Analytics');

      const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
      expect(sectionHeadings.length).toBeGreaterThan(0);
    });

    it('should provide screen reader friendly metric values', () => {
      renderWithProviders(<SystemAnalytics />);

      const uptimeMetric = screen.getByLabelText('Systemverfügbarkeit: 99,97 Prozent');
      expect(uptimeMetric).toBeInTheDocument();

      const responseMetric = screen.getByLabelText('Durchschnittliche Antwortzeit: 142 Millisekunden');
      expect(responseMetric).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SystemAnalytics />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByTestId('time-period-selector')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('refresh-button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('export-button')).toHaveFocus();
    });

    it('should have proper ARIA labels for metrics', () => {
      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByLabelText('System-Verfügbarkeit')).toBeInTheDocument();
      expect(screen.getByLabelText('Antwortzeit')).toBeInTheDocument();
      expect(screen.getByLabelText('Fehlerrate')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when data loading fails', () => {
      vi.mocked(require('@/hooks/useSystemMetrics').useSystemMetrics).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load data'),
        refetch: vi.fn(),
      });

      renderWithProviders(<SystemAnalytics />);

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText('Daten konnten nicht geladen werden')).toBeInTheDocument();
    });

    it('should show loading skeletons while data loads', () => {
      vi.mocked(require('@/hooks/useSystemMetrics').useSystemMetrics).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<SystemAnalytics />);

      expect(screen.getAllByTestId('metric-skeleton')).toHaveLength(12);
    });

    it('should handle partial data gracefully', () => {
      const partialData = {
        system: mockSystemMetrics.system,
        business: null,
        tenants: undefined,
        traffic: mockSystemMetrics.traffic,
      };

      vi.mocked(require('@/hooks/useSystemMetrics').useSystemMetrics).mockReturnValue({
        data: partialData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<SystemAnalytics />);

      // System metrics should render
      expect(screen.getByText('99.97%')).toBeInTheDocument();

      // Missing sections should show placeholder
      expect(screen.getByText('Daten nicht verfügbar')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should update metrics in real-time', async () => {
      const { rerender } = renderWithProviders(<SystemAnalytics />);

      // Initial render
      expect(screen.getByText('23')).toBeInTheDocument(); // live orders

      // Simulate real-time update
      const updatedRealtimeData = {
        ...mockRealtimeData,
        liveOrders: 25,
      };

      vi.mocked(require('@/hooks/useRealtime').useRealtime).mockReturnValue({
        data: updatedRealtimeData,
        isConnected: true,
      });

      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <SystemAnalytics />
        </QueryClientProvider>
      );

      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should show connection status indicator', () => {
      renderWithProviders(<SystemAnalytics />);

      const connectionStatus = screen.getByTestId('connection-status');
      expect(connectionStatus).toHaveClass('connected');
      expect(within(connectionStatus).getByText('Live')).toBeInTheDocument();
    });

    it('should handle connection loss gracefully', () => {
      vi.mocked(require('@/hooks/useRealtime').useRealtime).mockReturnValue({
        data: mockRealtimeData,
        isConnected: false,
      });

      renderWithProviders(<SystemAnalytics />);

      const connectionStatus = screen.getByTestId('connection-status');
      expect(connectionStatus).toHaveClass('disconnected');
      expect(within(connectionStatus).getByText('Offline')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with large datasets', () => {
      const startTime = performance.now();
      renderWithProviders(<SystemAnalytics />);
      const endTime = performance.now();

      // Should render in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not cause memory leaks', () => {
      const { unmount } = renderWithProviders(<SystemAnalytics />);

      expect(() => unmount()).not.toThrow();
    });
  });
});
