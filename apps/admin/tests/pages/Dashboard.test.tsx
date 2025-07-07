/**
 * File: /apps/admin/tests/pages/Dashboard.test.tsx
 * EATECH V3.0 - Admin Dashboard Page Tests
 * Swiss foodtruck admin dashboard with real-time metrics and KDS integration
 */

import { useAnalytics } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { useRealtime } from '@/hooks/useRealtime';
import { useTenant } from '@/hooks/useTenant';
import { Dashboard } from '@/pages/Dashboard/Dashboard';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSwissTenant } from '../../__mocks__/mockData';

// Mock dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useTenant');
jest.mock('@/hooks/useAnalytics');
jest.mock('@/hooks/useRealtime');
jest.mock('@/hooks/useOrders');
jest.mock('@/components/Charts/RevenueChart');
jest.mock('@/components/Orders/LiveOrderQueue');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseTenant = useTenant as jest.MockedFunction<typeof useTenant>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseRealtime = useRealtime as jest.MockedFunction<typeof useRealtime>;
const mockUseOrders = useOrders as jest.MockedFunction<typeof useOrders>;

// Mock WebSocket for real-time updates
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null
};

// Mock Notification API
const mockNotification = {
  permission: 'granted' as NotificationPermission,
  requestPermission: jest.fn().mockResolvedValue('granted')
};

Object.defineProperty(window, 'Notification', {
  value: jest.fn().mockImplementation((title, options) => ({
    title,
    ...options,
    close: jest.fn()
  })),
  configurable: true
});

Object.defineProperty(window.Notification, 'permission', {
  value: 'granted',
  configurable: true
});

Object.defineProperty(window.Notification, 'requestPermission', {
  value: jest.fn().mockResolvedValue('granted'),
  configurable: true
});

// Swiss dashboard metrics data
const swissDashboardData = {
  today: {
    revenue: 1847.60,
    orders: 47,
    averageOrderValue: 39.31,
    conversionRate: 12.3,
    customerSatisfaction: 4.7
  },
  live: {
    activeOrders: 8,
    queueLength: 3,
    averageWaitTime: 14,
    kitchenUtilization: 0.85,
    onlineCustomers: 23
  },
  trends: {
    revenueChange: 8.5,
    ordersChange: 12.1,
    avgOrderValueChange: -2.3
  },
  topProducts: [
    {
      id: 'prod_geschnetzeltes',
      name: 'Zürcher Geschnetzeltes',
      orderCount: 23,
      revenue: 573.70,
      margin: 0.68
    },
    {
      id: 'prod_rosti',
      name: 'Rösti mit Speck',
      orderCount: 18,
      revenue: 333.00,
      margin: 0.72
    }
  ],
  hourlyData: [
    { time: '11:00', orders: 5, revenue: 187.50 },
    { time: '12:00', orders: 12, revenue: 456.80 },
    { time: '13:00', orders: 15, revenue: 623.25 },
    { time: '14:00', orders: 8, revenue: 298.60 }
  ]
};

const mockLiveOrdersData = [
  {
    id: 'ord_123',
    orderNumber: 'ZG-2025-0042',
    customer: { name: 'Hans Müller', phone: '+41791234567' },
    items: [
      { name: 'Zürcher Geschnetzeltes', quantity: 1, modifiers: ['+ Rösti'] }
    ],
    total: 29.40,
    status: 'preparing',
    orderTime: '2025-01-07T12:30:00Z',
    estimatedReadyTime: '2025-01-07T12:45:00Z',
    elapsedTime: 8, // minutes
    priority: 'normal'
  },
  {
    id: 'ord_124',
    orderNumber: 'ZG-2025-0043',
    customer: { name: 'Maria Schmidt' },
    items: [
      { name: 'Rösti mit Speck', quantity: 2 }
    ],
    total: 37.00,
    status: 'pending',
    orderTime: '2025-01-07T12:35:00Z',
    estimatedReadyTime: '2025-01-07T12:47:00Z',
    elapsedTime: 3,
    priority: 'high'
  }
];

describe('Admin Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin_123',
        email: 'admin@zuercher-genuss.ch',
        role: 'admin',
        permissions: ['dashboard:read', 'orders:write', 'analytics:read']
      },
      isAuthenticated: true,
      isLoading: false
    });

    mockUseTenant.mockReturnValue({
      tenant: {
        ...mockSwissTenant,
        id: 'zuercher-genuss',
        name: 'Zürcher Genuss',
        settings: {
          currency: 'CHF',
          timezone: 'Europe/Zurich',
          language: 'de'
        }
      },
      isLoading: false
    });

    mockUseAnalytics.mockReturnValue({
      dashboardMetrics: swissDashboardData,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    mockUseRealtime.mockReturnValue({
      isConnected: true,
      lastUpdate: new Date(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });

    mockUseOrders.mockReturnValue({
      liveOrders: mockLiveOrdersData,
      updateOrderStatus: jest.fn(),
      isLoading: false
    });

    // Mock WebSocket
    Object.defineProperty(window, 'WebSocket', {
      value: jest.fn().mockImplementation(() => mockWebSocket),
      configurable: true
    });
  });

  describe('Dashboard Layout and Navigation', () => {
    it('should render dashboard header with tenant information', () => {
      render(<Dashboard />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Zürcher Genuss')).toBeInTheDocument();
      expect(screen.getByText('Willkommen, Admin')).toBeInTheDocument();
    });

    it('should display current date and time in Swiss format', () => {
      render(<Dashboard />);

      // Should show Swiss date format (DD.MM.YYYY)
      const dateElement = screen.getByTestId('current-date');
      expect(dateElement).toHaveTextContent(/\d{2}\.\d{2}\.\d{4}/);

      // Should show current time
      const timeElement = screen.getByTestId('current-time');
      expect(timeElement).toHaveTextContent(/\d{2}:\d{2}/);
    });

    it('should show connection status indicator', () => {
      render(<Dashboard />);

      // Should show connected status
      const connectionStatus = screen.getByTestId('connection-status');
      expect(connectionStatus).toHaveTextContent('Verbunden');
      expect(connectionStatus).toHaveClass('connected');
    });

    it('should display quick action buttons', () => {
      render(<Dashboard />);

      expect(screen.getByRole('button', { name: /Neue Bestellung/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Küchen-Display/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Einstellungen/i })).toBeInTheDocument();
    });
  });

  describe('Key Metrics Display', () => {
    beforeEach(() => {
      render(<Dashboard />);
    });

    it('should display today\'s revenue with Swiss formatting', () => {
      const revenueCard = screen.getByTestId('revenue-today');

      expect(revenueCard).toHaveTextContent('CHF 1\'847.60');
      expect(revenueCard).toHaveTextContent('Umsatz heute');

      // Should show trend indicator
      expect(revenueCard).toHaveTextContent('+8.5%');
      expect(revenueCard).toHaveClass('trend-positive');
    });

    it('should display order metrics', () => {
      const ordersCard = screen.getByTestId('orders-today');

      expect(ordersCard).toHaveTextContent('47');
      expect(ordersCard).toHaveTextContent('Bestellungen heute');
      expect(ordersCard).toHaveTextContent('+12.1%');
    });

    it('should display average order value', () => {
      const aovCard = screen.getByTestId('average-order-value');

      expect(aovCard).toHaveTextContent('CHF 39.31');
      expect(aovCard).toHaveTextContent('Durchschnittlicher Warenkorbwert');
      expect(aovCard).toHaveTextContent('-2.3%');
      expect(aovCard).toHaveClass('trend-negative');
    });

    it('should display conversion rate', () => {
      const conversionCard = screen.getByTestId('conversion-rate');

      expect(conversionCard).toHaveTextContent('12.3%');
      expect(conversionCard).toHaveTextContent('Conversion Rate');
    });

    it('should display customer satisfaction', () => {
      const satisfactionCard = screen.getByTestId('customer-satisfaction');

      expect(satisfactionCard).toHaveTextContent('4.7');
      expect(satisfactionCard).toHaveTextContent('Kundenzufriedenheit');

      // Should show star rating
      const stars = screen.getAllByTestId('satisfaction-star');
      expect(stars).toHaveLength(5);
    });
  });

  describe('Live Metrics', () => {
    beforeEach(() => {
      render(<Dashboard />);
    });

    it('should display live order queue information', () => {
      const liveSection = screen.getByTestId('live-metrics');

      expect(within(liveSection).getByText('8')).toBeInTheDocument(); // Active orders
      expect(within(liveSection).getByText('Aktive Bestellungen')).toBeInTheDocument();

      expect(within(liveSection).getByText('3')).toBeInTheDocument(); // Queue length
      expect(within(liveSection).getByText('In der Warteschlange')).toBeInTheDocument();
    });

    it('should display average wait time', () => {
      const waitTimeElement = screen.getByTestId('average-wait-time');

      expect(waitTimeElement).toHaveTextContent('14 Min');
      expect(waitTimeElement).toHaveTextContent('Durchschnittliche Wartezeit');
    });

    it('should display kitchen utilization', () => {
      const utilizationElement = screen.getByTestId('kitchen-utilization');

      expect(utilizationElement).toHaveTextContent('85%');
      expect(utilizationElement).toHaveTextContent('Küchen-Auslastung');

      // Should show utilization bar
      const utilizationBar = screen.getByTestId('utilization-bar');
      expect(utilizationBar).toHaveStyle('width: 85%');
    });

    it('should display online customers count', () => {
      const onlineCustomers = screen.getByTestId('online-customers');

      expect(onlineCustomers).toHaveTextContent('23');
      expect(onlineCustomers).toHaveTextContent('Online-Kunden');
    });
  });

  describe('Revenue Chart', () => {
    beforeEach(() => {
      render(<Dashboard />);
    });

    it('should display hourly revenue chart', () => {
      const chartContainer = screen.getByTestId('revenue-chart');
      expect(chartContainer).toBeInTheDocument();

      // Should show chart title
      expect(screen.getByText('Umsatz heute (stündlich)')).toBeInTheDocument();
    });

    it('should allow switching chart time periods', async () => {
      const user = userEvent.setup();

      // Should have time period buttons
      const todayButton = screen.getByRole('button', { name: /Heute/i });
      const weekButton = screen.getByRole('button', { name: /Woche/i });
      const monthButton = screen.getByRole('button', { name: /Monat/i });

      expect(todayButton).toHaveClass('active');

      // Switch to week view
      await user.click(weekButton);

      expect(weekButton).toHaveClass('active');
      expect(todayButton).not.toHaveClass('active');
    });

    it('should display chart in Swiss number format', () => {
      const chartContainer = screen.getByTestId('revenue-chart');

      // Chart should format numbers with Swiss conventions
      expect(chartContainer).toHaveTextContent(/CHF/);
    });
  });

  describe('Live Order Queue', () => {
    beforeEach(() => {
      render(<Dashboard />);
    });

    it('should display live order cards', () => {
      const orderQueue = screen.getByTestId('live-order-queue');

      // Should show order cards
      expect(within(orderQueue).getByText('ZG-2025-0042')).toBeInTheDocument();
      expect(within(orderQueue).getByText('ZG-2025-0043')).toBeInTheDocument();

      // Should show customer names
      expect(within(orderQueue).getByText('Hans Müller')).toBeInTheDocument();
      expect(within(orderQueue).getByText('Maria Schmidt')).toBeInTheDocument();
    });

    it('should display order status and timing', () => {
      const orderQueue = screen.getByTestId('live-order-queue');

      // Should show status badges
      expect(within(orderQueue).getByText('In Zubereitung')).toBeInTheDocument();
      expect(within(orderQueue).getByText('Ausstehend')).toBeInTheDocument();

      // Should show elapsed time
      expect(within(orderQueue).getByText('8 Min')).toBeInTheDocument();
      expect(within(orderQueue).getByText('3 Min')).toBeInTheDocument();
    });

    it('should show order items and modifiers', () => {
      const orderQueue = screen.getByTestId('live-order-queue');

      expect(within(orderQueue).getByText('1x Zürcher Geschnetzeltes')).toBeInTheDocument();
      expect(within(orderQueue).getByText('+ Rösti')).toBeInTheDocument();
      expect(within(orderQueue).getByText('2x Rösti mit Speck')).toBeInTheDocument();
    });

    it('should display order totals in CHF', () => {
      const orderQueue = screen.getByTestId('live-order-queue');

      expect(within(orderQueue).getByText('CHF 29.40')).toBeInTheDocument();
      expect(within(orderQueue).getByText('CHF 37.00')).toBeInTheDocument();
    });

    it('should highlight priority orders', () => {
      const orderQueue = screen.getByTestId('live-order-queue');

      // High priority order should be highlighted
      const highPriorityOrder = within(orderQueue).getByTestId('order-ord_124');
      expect(highPriorityOrder).toHaveClass('priority-high');
    });

    it('should allow updating order status', async () => {
      const user = userEvent.setup();

      const orderCard = screen.getByTestId('order-ord_123');
      const statusButton = within(orderCard).getByRole('button', { name: /Status ändern/i });

      await user.click(statusButton);

      // Should show status options
      expect(screen.getByText('Bereit')).toBeInTheDocument();
      expect(screen.getByText('Fertig')).toBeInTheDocument();

      // Update to ready
      const readyButton = screen.getByText('Bereit');
      await user.click(readyButton);

      expect(mockUseOrders().updateOrderStatus).toHaveBeenCalledWith('ord_123', 'ready');
    });
  });

  describe('Top Products Section', () => {
    beforeEach(() => {
      render(<Dashboard />);
    });

    it('should display top selling products', () => {
      const topProducts = screen.getByTestId('top-products');

      expect(within(topProducts).getByText('Beliebteste Produkte')).toBeInTheDocument();
      expect(within(topProducts).getByText('Zürcher Geschnetzeltes')).toBeInTheDocument();
      expect(within(topProducts).getByText('Rösti mit Speck')).toBeInTheDocument();
    });

    it('should show product metrics', () => {
      const topProducts = screen.getByTestId('top-products');

      // Should show order counts
      expect(within(topProducts).getByText('23 verkauft')).toBeInTheDocument();
      expect(within(topProducts).getByText('18 verkauft')).toBeInTheDocument();

      // Should show revenue
      expect(within(topProducts).getByText('CHF 573.70')).toBeInTheDocument();
      expect(within(topProducts).getByText('CHF 333.00')).toBeInTheDocument();

      // Should show margin
      expect(within(topProducts).getByText('68%')).toBeInTheDocument();
      expect(within(topProducts).getByText('72%')).toBeInTheDocument();
    });

    it('should rank products by performance', () => {
      const topProducts = screen.getByTestId('top-products');

      // Should show ranking
      const productRanks = within(topProducts).getAllByTestId(/product-rank/);
      expect(productRanks[0]).toHaveTextContent('1');
      expect(productRanks[1]).toHaveTextContent('2');
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      render(<Dashboard />);
    });

    it('should connect to WebSocket for real-time updates', () => {
      expect(mockUseRealtime().subscribe).toHaveBeenCalledWith('dashboard');
    });

    it('should handle new order notifications', async () => {
      // Simulate new order via WebSocket
      const newOrderEvent = {
        type: 'NEW_ORDER',
        data: {
          id: 'ord_125',
          orderNumber: 'ZG-2025-0044',
          customer: { name: 'Peter Weber' },
          total: 22.50,
          status: 'pending'
        }
      };

      // Trigger WebSocket message
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: JSON.stringify(newOrderEvent) } as MessageEvent);
      }

      // Should show notification
      await waitFor(() => {
        expect(window.Notification).toHaveBeenCalledWith(
          'Neue Bestellung',
          expect.objectContaining({
            body: 'ZG-2025-0044 von Peter Weber - CHF 22.50'
          })
        );
      });

      // Should play notification sound
      const audioElement = screen.getByTestId('notification-audio');
      expect(audioElement).toHaveAttribute('src', expect.stringContaining('new-order.mp3'));
    });

    it('should update metrics in real-time', async () => {
      // Simulate metrics update
      const metricsUpdate = {
        type: 'METRICS_UPDATE',
        data: {
          today: {
            revenue: 1875.90,
            orders: 48,
            averageOrderValue: 39.08
          }
        }
      };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: JSON.stringify(metricsUpdate) } as MessageEvent);
      }

      // Should update displayed metrics
      await waitFor(() => {
        expect(screen.getByTestId('revenue-today')).toHaveTextContent('CHF 1\'875.90');
        expect(screen.getByTestId('orders-today')).toHaveTextContent('48');
      });
    });

    it('should handle connection loss gracefully', () => {
      // Simulate connection loss
      mockUseRealtime.mockReturnValue({
        isConnected: false,
        lastUpdate: new Date(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn()
      });

      render(<Dashboard />);

      // Should show disconnected status
      const connectionStatus = screen.getByTestId('connection-status');
      expect(connectionStatus).toHaveTextContent('Verbindung unterbrochen');
      expect(connectionStatus).toHaveClass('disconnected');

      // Should show retry button
      expect(screen.getByRole('button', { name: /Neu verbinden/i })).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<Dashboard />);

      // Should use mobile layout classes
      const dashboard = screen.getByTestId('dashboard-container');
      expect(dashboard).toHaveClass('mobile-layout');

      // Should stack metrics cards vertically
      const metricsGrid = screen.getByTestId('metrics-grid');
      expect(metricsGrid).toHaveClass('mobile-stack');
    });

    it('should hide certain elements on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<Dashboard />);

      // Should hide detailed analytics on mobile
      expect(screen.queryByTestId('detailed-analytics')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when analytics fail to load', () => {
      mockUseAnalytics.mockReturnValue({
        dashboardMetrics: null,
        isLoading: false,
        error: new Error('Failed to load analytics'),
        refetch: jest.fn()
      });

      render(<Dashboard />);

      expect(screen.getByText(/Fehler beim Laden der Dashboard-Daten/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Erneut versuchen/i })).toBeInTheDocument();
    });

    it('should show loading state while data is being fetched', () => {
      mockUseAnalytics.mockReturnValue({
        dashboardMetrics: null,
        isLoading: true,
        error: null,
        refetch: jest.fn()
      });

      render(<Dashboard />);

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
      expect(screen.getByText(/Dashboard wird geladen/i)).toBeInTheDocument();
    });

    it('should handle missing permissions gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'staff_123',
          email: 'staff@zuercher-genuss.ch',
          role: 'staff',
          permissions: ['orders:read'] // Missing dashboard:read
        },
        isAuthenticated: true,
        isLoading: false
      });

      render(<Dashboard />);

      expect(screen.getByText(/Keine Berechtigung für Dashboard-Zugriff/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      render(<Dashboard />);
    });

    it('should have proper heading structure', () => {
      expect(screen.getByRole('heading', { level: 1, name: /Dashboard/i })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4); // Sections
    });

    it('should have descriptive labels for metrics', () => {
      const revenueCard = screen.getByTestId('revenue-today');
      expect(revenueCard).toHaveAttribute('aria-label',
        expect.stringContaining('Umsatz heute: CHF 1847.60'));
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      // Should be able to tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /Neue Bestellung/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /Küchen-Display/i })).toHaveFocus();
    });

    it('should announce live updates to screen readers', async () => {
      // Should have aria-live regions for real-time updates
      const liveMetrics = screen.getByTestId('live-metrics');
      expect(liveMetrics).toHaveAttribute('aria-live', 'polite');

      const orderQueue = screen.getByTestId('live-order-queue');
      expect(orderQueue).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide alternative text for visual elements', () => {
      // Charts should have accessible descriptions
      const revenueChart = screen.getByTestId('revenue-chart');
      expect(revenueChart).toHaveAttribute('aria-label',
        expect.stringContaining('Umsatzverlauf'));

      // Trend indicators should be readable
      const trendIndicators = screen.getAllByTestId('trend-indicator');
      trendIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<Dashboard />);

      const renderSpy = jest.fn();
      jest.spyOn(React, 'memo').mockImplementation(() => renderSpy);

      // Re-render with same props
      rerender(<Dashboard />);

      // Should be memoized
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should debounce real-time updates', async () => {
      render(<Dashboard />);

      // Simulate rapid updates
      const updates = Array.from({ length: 10 }, (_, i) => ({
        type: 'METRICS_UPDATE',
        data: { today: { revenue: 1000 + i } }
      }));

      updates.forEach(update => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({ data: JSON.stringify(update) } as MessageEvent);
        }
      });

      // Should debounce updates
      await waitFor(() => {
        expect(screen.getByTestId('revenue-today')).toHaveTextContent('CHF 1\'009.00');
      });
    });
  });
});
