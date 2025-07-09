import React, { ReactElement, ReactNode } from 'react';
import { render as rtlRender, RenderOptions, RenderResult } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter, MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@eatech/ui';
import { AuthProvider, TenantProvider } from '@eatech/core';
import { ToastProvider } from '@eatech/ui';
import type { User } from '@eatech/types';

// Mock providers props
interface MockProvidersProps {
  children: ReactNode;
  user?: Partial<User> | null;
  tenantId?: string;
  theme?: 'default' | 'dark' | 'swiss';
  locale?: 'de' | 'en' | 'fr' | 'it';
  routerProps?: MemoryRouterProps;
}

// Create a custom render function that includes all providers
const createMockProviders = ({
  user = null,
  tenantId = 'tenant-123',
  theme = 'default',
  locale = 'de',
  routerProps = {},
}: Partial<MockProvidersProps> = {}) => {
  // Create a new QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  // Mock auth context value
  const authContextValue = {
    user: user as User | null,
    loading: false,
    error: null,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    updateEmail: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    refreshToken: vi.fn().mockResolvedValue('new-token'),
  };

  // Mock tenant context value
  const tenantContextValue = {
    tenantId,
    tenant: {
      id: tenantId,
      name: 'Test Restaurant',
      domain: 'test.eatech.ch',
      settings: {
        currency: 'CHF',
        locale,
        timezone: 'Europe/Zurich',
        businessHours: {
          monday: { open: '08:00', close: '22:00' },
          tuesday: { open: '08:00', close: '22:00' },
          wednesday: { open: '08:00', close: '22:00' },
          thursday: { open: '08:00', close: '22:00' },
          friday: { open: '08:00', close: '23:00' },
          saturday: { open: '08:00', close: '23:00' },
          sunday: { open: '10:00', close: '21:00' },
        },
      },
      features: {
        ordering: true,
        reservations: true,
        loyalty: true,
        voice: true,
        delivery: true,
        pickup: true,
        payments: {
          card: true,
          twint: true,
          postFinance: true,
          cash: true,
        },
      },
    },
    loading: false,
    error: null,
  };

  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter {...routerProps}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme} locale={locale}>
          <AuthProvider value={authContextValue}>
            <TenantProvider value={tenantContextValue}>
              <ToastProvider position="bottom-right">
                {children}
              </ToastProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

// Custom render options
export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: Partial<User> | null;
  tenantId?: string;
  theme?: 'default' | 'dark' | 'swiss';
  locale?: 'de' | 'en' | 'fr' | 'it';
  routerProps?: MemoryRouterProps;
}

// Custom render function
export function render(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const {
    user,
    tenantId,
    theme,
    locale,
    routerProps,
    ...renderOptions
  } = options;

  const Wrapper = createMockProviders({
    user,
    tenantId,
    theme,
    locale,
    routerProps,
  });

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// Render with router only (no other providers)
export function renderWithRouter(
  ui: ReactElement,
  routerProps: MemoryRouterProps = {}
): RenderResult {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter {...routerProps}>{children}</MemoryRouter>
  );

  return rtlRender(ui, { wrapper: Wrapper });
}

// Render with theme only
export function renderWithTheme(
  ui: ReactElement,
  theme: 'default' | 'dark' | 'swiss' = 'default'
): RenderResult {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  );

  return rtlRender(ui, { wrapper: Wrapper });
}

// Render with authenticated user
export function renderAuthenticated(
  ui: ReactElement,
  userOverrides: Partial<User> = {},
  options: Omit<CustomRenderOptions, 'user'> = {}
): RenderResult {
  const defaultUser: Partial<User> = {
    id: 'user-123',
    email: 'test@eatech.ch',
    displayName: 'Test User',
    role: 'customer',
    tenantId: options.tenantId || 'tenant-123',
    emailVerified: true,
    phoneNumber: '+41 79 123 45 67',
    photoURL: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...userOverrides,
  };

  return render(ui, { ...options, user: defaultUser });
}

// Render with admin user
export function renderAsAdmin(
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'user'> = {}
): RenderResult {
  return renderAuthenticated(ui, { role: 'admin' }, options);
}

// Render with staff user
export function renderAsStaff(
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'user'> = {}
): RenderResult {
  return renderAuthenticated(ui, { role: 'staff' }, options);
}

// Re-export everything from testing library
export * from '@testing-library/react';

// Export custom utilities
export { createMockProviders };
