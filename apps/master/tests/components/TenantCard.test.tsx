import { TenantCard } from '@/components/Dashboard/TenantCard';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('next/router', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/hooks/useMasterAuth', () => ({
  useMasterAuth: () => ({
    user: { role: 'superadmin', permissions: ['all'] },
    hasPermission: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock('@/services/masterApi.service', () => ({
  updateTenantStatus: vi.fn(),
  getTenantMetrics: vi.fn(),
}));

const mockRouterPush = vi.fn();
(useRouter as any).mockReturnValue({
  push: mockRouterPush,
});

describe('TenantCard Component', () => {
  const mockTenant = {
    id: 'tenant_123',
    name: 'Burger Paradise',
    slug: 'burger-paradise',
    email: 'info@burgerparadise.ch',
    phone: '+41791234567',
    status: 'active' as const,
    subscription: {
      plan: 'premium',
      status: 'active',
      nextBillingDate: '2025-02-01',
    },
    stats: {
      ordersToday: 45,
      revenueToday: 1234.50,
      monthlyRevenue: 15678.90,
      rating: 4.7,
    },
    location: {
      city: 'Zürich',
      canton: 'ZH',
    },
    lastLogin: '2025-01-07T14:30:00Z',
    createdAt: '2024-06-15T10:00:00Z',
    operatingHours: {
      isOpen: true,
      nextOpen: null,
      nextClose: '21:00',
    },
  };

  const defaultProps = {
    tenant: mockTenant,
    onStatusChange: vi.fn(),
    onViewDetails: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render tenant basic information correctly', () => {
      render(<TenantCard {...defaultProps} />);

      expect(screen.getByText('Burger Paradise')).toBeInTheDocument();
      expect(screen.getByText('burger-paradise')).toBeInTheDocument();
      expect(screen.getByText('info@burgerparadise.ch')).toBeInTheDocument();
      expect(screen.getByText('+41791234567')).toBeInTheDocument();
      expect(screen.getByText('Zürich, ZH')).toBeInTheDocument();
    });

    it('should display correct status badge for active tenant', () => {
      render(<TenantCard {...defaultProps} />);

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveClass('status-active');
      expect(statusBadge).toHaveTextContent('Aktiv');
    });

    it('should display correct status badge for suspended tenant', () => {
      const suspendedTenant = { ...mockTenant, status: 'suspended' as const };
      render(<TenantCard {...defaultProps} tenant={suspendedTenant} />);

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveClass('status-suspended');
      expect(statusBadge).toHaveTextContent('Gesperrt');
    });

    it('should show subscription information', () => {
      render(<TenantCard {...defaultProps} />);

      expect(screen.getByText('Premium')).toBeInTheDocument();
      expect(screen.getByText(/Nächste Rechnung:/)).toBeInTheDocument();
      expect(screen.getByText('01.02.2025')).toBeInTheDocument();
    });

    it('should display operational status - open', () => {
      render(<TenantCard {...defaultProps} />);

      expect(screen.getByTestId('operational-status')).toHaveTextContent('Geöffnet');
      expect(screen.getByTestId('operational-status')).toHaveClass('status-open');
    });

    it('should display operational status - closed', () => {
      const closedTenant = {
        ...mockTenant,
        operatingHours: {
          isOpen: false,
          nextOpen: '11:00',
          nextClose: null,
        },
      };
      render(<TenantCard {...defaultProps} tenant={closedTenant} />);

      expect(screen.getByTestId('operational-status')).toHaveTextContent('Geschlossen');
      expect(screen.getByTestId('operational-status')).toHaveClass('status-closed');
    });
  });

  describe('Statistics Display', () => {
    it('should show today statistics', () => {
      render(<TenantCard {...defaultProps} />);

      expect(screen.getByText('45')).toBeInTheDocument(); // orders
      expect(screen.getByText('CHF 1\'234.50')).toBeInTheDocument(); // revenue today
      expect(screen.getByText('CHF 15\'678.90')).toBeInTheDocument(); // monthly revenue
      expect(screen.getByText('4.7')).toBeInTheDocument(); // rating
    });

    it('should handle zero values gracefully', () => {
      const zeroStatsTenant = {
        ...mockTenant,
        stats: {
          ordersToday: 0,
          revenueToday: 0,
          monthlyRevenue: 0,
          rating: 0,
        },
      };
      render(<TenantCard {...defaultProps} tenant={zeroStatsTenant} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('CHF 0.00')).toBeInTheDocument();
    });

    it('should display last login information', () => {
      render(<TenantCard {...defaultProps} />);

      expect(screen.getByText(/Letzter Login:/)).toBeInTheDocument();
      expect(screen.getByText('07.01.2025 15:30')).toBeInTheDocument();
    });

    it('should show account age', () => {
      render(<TenantCard {...defaultProps} />);

      expect(screen.getByText(/Mitglied seit:/)).toBeInTheDocument();
      expect(screen.getByText('Juni 2024')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onViewDetails when card is clicked', async () => {
      const user = userEvent.setup();
      render(<TenantCard {...defaultProps} />);

      const card = screen.getByTestId('tenant-card');
      await user.click(card);

      expect(defaultProps.onViewDetails).toHaveBeenCalledWith(mockTenant.id);
    });

    it('should handle status change dropdown', async () => {
      const user = userEvent.setup();
      render(<TenantCard {...defaultProps} />);

      const statusDropdown = screen.getByTestId('status-dropdown');
      await user.click(statusDropdown);

      const suspendOption = screen.getByText('Sperren');
      await user.click(suspendOption);

      expect(defaultProps.onStatusChange).toHaveBeenCalledWith(
        mockTenant.id,
        'suspended'
      );
    });

    it('should show action menu on more button click', async () => {
      const user = userEvent.setup();
      render(<TenantCard {...defaultProps} />);

      const moreButton = screen.getByTestId('more-actions-button');
      await user.click(moreButton);

      expect(screen.getByText('Details anzeigen')).toBeInTheDocument();
      expect(screen.getByText('Bearbeiten')).toBeInTheDocument();
      expect(screen.getByText('Support kontaktieren')).toBeInTheDocument();
    });

    it('should navigate to tenant details page', async () => {
      const user = userEvent.setup();
      render(<TenantCard {...defaultProps} />);

      const moreButton = screen.getByTestId('more-actions-button');
      await user.click(moreButton);

      const detailsLink = screen.getByText('Details anzeigen');
      await user.click(detailsLink);

      expect(mockRouterPush).toHaveBeenCalledWith(`/tenants/${mockTenant.id}`);
    });
  });

  describe('Swiss-specific Features', () => {
    it('should format Swiss phone numbers correctly', () => {
      render(<TenantCard {...defaultProps} />);

      expect(screen.getByText('+41 79 123 45 67')).toBeInTheDocument();
    });

    it('should display CHF currency formatting', () => {
      render(<TenantCard {...defaultProps} />);

      const revenueElements = screen.getAllByText(/CHF/);
      expect(revenueElements.length).toBeGreaterThan(0);

      // Check proper Swiss currency formatting
      expect(screen.getByText('CHF 1\'234.50')).toBeInTheDocument();
      expect(screen.getByText('CHF 15\'678.90')).toBeInTheDocument();
    });

    it('should show Swiss canton information', () => {
      render(<TenantCard {...defaultProps} />);

      expect(screen.getByText('ZH')).toBeInTheDocument();
    });

    it('should handle Swiss date formatting', () => {
      render(<TenantCard {...defaultProps} />);

      // DD.MM.YYYY format
      expect(screen.getByText('01.02.2025')).toBeInTheDocument();
      expect(screen.getByText('07.01.2025 15:30')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TenantCard {...defaultProps} />);

      expect(screen.getByLabelText(`Tenant Karte für ${mockTenant.name}`)).toBeInTheDocument();
      expect(screen.getByLabelText('Status ändern')).toBeInTheDocument();
      expect(screen.getByLabelText('Weitere Aktionen')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<TenantCard {...defaultProps} />);

      const card = screen.getByTestId('tenant-card');

      // Focus the card
      await user.tab();
      expect(card).toHaveFocus();

      // Enter should trigger view details
      await user.keyboard('{Enter}');
      expect(defaultProps.onViewDetails).toHaveBeenCalledWith(mockTenant.id);
    });

    it('should have proper heading hierarchy', () => {
      render(<TenantCard {...defaultProps} />);

      const tenantName = screen.getByRole('heading', { level: 3 });
      expect(tenantName).toHaveTextContent('Burger Paradise');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing statistics gracefully', () => {
      const tenantWithoutStats = {
        ...mockTenant,
        stats: undefined,
      };

      expect(() => {
        render(<TenantCard {...defaultProps} tenant={tenantWithoutStats} />);
      }).not.toThrow();

      expect(screen.getByText('--')).toBeInTheDocument();
    });

    it('should handle invalid dates gracefully', () => {
      const tenantWithInvalidDate = {
        ...mockTenant,
        lastLogin: 'invalid-date',
      };

      expect(() => {
        render(<TenantCard {...defaultProps} tenant={tenantWithInvalidDate} />);
      }).not.toThrow();

      expect(screen.getByText('Unbekannt')).toBeInTheDocument();
    });

    it('should show loading state when updating status', async () => {
      const user = userEvent.setup();
      render(<TenantCard {...defaultProps} />);

      const statusDropdown = screen.getByTestId('status-dropdown');
      await user.click(statusDropdown);

      const suspendOption = screen.getByText('Sperren');
      await user.click(suspendOption);

      // Should show loading spinner
      expect(screen.getByTestId('status-loading')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with many tenants', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const tenant = { ...mockTenant, id: `tenant_${i}` };
        render(<TenantCard {...defaultProps} tenant={tenant} />);
      }

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 100 cards in under 1 second
      expect(renderTime).toBeLessThan(1000);
    });

    it('should not cause memory leaks', () => {
      const { unmount } = render(<TenantCard {...defaultProps} />);

      // Component should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Voice Commerce Integration', () => {
    it('should show voice order indicator when available', () => {
      const voiceTenant = {
        ...mockTenant,
        features: {
          voiceCommerce: true,
        },
      };

      render(<TenantCard {...defaultProps} tenant={voiceTenant} />);

      expect(screen.getByTestId('voice-indicator')).toBeInTheDocument();
      expect(screen.getByLabelText('Voice Commerce aktiviert')).toBeInTheDocument();
    });

    it('should not show voice indicator when disabled', () => {
      const noVoiceTenant = {
        ...mockTenant,
        features: {
          voiceCommerce: false,
        },
      };

      render(<TenantCard {...defaultProps} tenant={noVoiceTenant} />);

      expect(screen.queryByTestId('voice-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Emergency Mode', () => {
    it('should show emergency mode indicator', () => {
      const emergencyTenant = {
        ...mockTenant,
        emergencyMode: {
          active: true,
          reason: 'Hohes Bestellaufkommen',
          activatedAt: '2025-01-07T12:00:00Z',
        },
      };

      render(<TenantCard {...defaultProps} tenant={emergencyTenant} />);

      expect(screen.getByTestId('emergency-indicator')).toBeInTheDocument();
      expect(screen.getByText('Notfallmodus')).toBeInTheDocument();
      expect(screen.getByText('Hohes Bestellaufkommen')).toBeInTheDocument();
    });

    it('should handle emergency mode deactivation', async () => {
      const user = userEvent.setup();
      const emergencyTenant = {
        ...mockTenant,
        emergencyMode: {
          active: true,
          reason: 'Test',
          activatedAt: '2025-01-07T12:00:00Z',
        },
      };

      render(<TenantCard {...defaultProps} tenant={emergencyTenant} />);

      const deactivateButton = screen.getByText('Deaktivieren');
      await user.click(deactivateButton);

      await waitFor(() => {
        expect(defaultProps.onStatusChange).toHaveBeenCalledWith(
          mockTenant.id,
          'emergency_deactivate'
        );
      });
    });
  });
});
