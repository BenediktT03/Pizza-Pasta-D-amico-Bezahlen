/**
 * File: /apps/web/tests/e2e/admin-flow.spec.ts
 * EATECH V3.0 - Admin Dashboard E2E Tests
 * Swiss foodtruck admin operations: orders, products, analytics
 */

describe('Admin Dashboard Flow', () => {
  const ADMIN_URL = 'http://localhost:3001'; // Admin app port
  const TEST_TENANT = 'zuercher-genuss';
  const ADMIN_CREDENTIALS = {
    email: 'admin@zuercher-genuss.ch',
    password: 'TestAdmin123!'
  };

  beforeEach(() => {
    // Mock admin authentication
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        token: 'admin-jwt-token',
        user: {
          id: 'admin_123',
          email: ADMIN_CREDENTIALS.email,
          role: 'admin',
          tenantId: TEST_TENANT,
          permissions: ['orders:read', 'orders:write', 'products:write', 'analytics:read']
        }
      }
    }).as('adminLogin');

    // Mock tenant data
    cy.intercept('GET', `/api/tenants/${TEST_TENANT}`, {
      fixture: 'swiss-tenant-admin.json'
    }).as('getTenant');

    // Mock orders data
    cy.intercept('GET', `/api/tenants/${TEST_TENANT}/orders*`, {
      fixture: 'swiss-orders.json'
    }).as('getOrders');

    // Mock products data
    cy.intercept('GET', `/api/tenants/${TEST_TENANT}/products*`, {
      fixture: 'swiss-products-admin.json'
    }).as('getProducts');

    // Mock analytics data
    cy.intercept('GET', `/api/tenants/${TEST_TENANT}/analytics*`, {
      fixture: 'swiss-analytics.json'
    }).as('getAnalytics');

    // Mock Kitchen Display System WebSocket
    cy.window().then((win) => {
      win.WebSocket = class MockWebSocket {
        constructor(url: string) {
          setTimeout(() => this.onopen?.({} as Event), 100);
        }
        onopen: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        send = cy.stub();
        close = cy.stub();
      };
    });
  });

  describe('Admin Authentication', () => {
    it('should login with valid credentials', () => {
      cy.visit(`${ADMIN_URL}/login`);

      // Should show login form
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.contains('EATECH Admin Login').should('be.visible');

      // Fill credentials
      cy.get('[data-testid="email-input"]').type(ADMIN_CREDENTIALS.email);
      cy.get('[data-testid="password-input"]').type(ADMIN_CREDENTIALS.password);

      // Submit login
      cy.get('[data-testid="login-submit"]').click();

      cy.wait('@adminLogin');

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('Willkommen, Admin').should('be.visible');
    });

    it('should handle invalid credentials', () => {
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 401,
        body: { error: 'Invalid credentials' }
      });

      cy.visit(`${ADMIN_URL}/login`);

      cy.get('[data-testid="email-input"]').type('wrong@email.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-submit"]').click();

      // Should show error
      cy.get('[data-testid="login-error"]')
        .should('be.visible')
        .should('contain', 'Ungültige Anmeldedaten');
    });

    it('should require authentication for protected routes', () => {
      // Try to access dashboard without login
      cy.visit(`${ADMIN_URL}/dashboard`);

      // Should redirect to login
      cy.url().should('include', '/login');
      cy.contains('Bitte melden Sie sich an').should('be.visible');
    });
  });

  describe('Dashboard Overview', () => {
    beforeEach(() => {
      // Login first
      cy.visit(`${ADMIN_URL}/login`);
      cy.get('[data-testid="email-input"]').type(ADMIN_CREDENTIALS.email);
      cy.get('[data-testid="password-input"]').type(ADMIN_CREDENTIALS.password);
      cy.get('[data-testid="login-submit"]').click();
      cy.wait('@adminLogin');

      cy.visit(`${ADMIN_URL}/dashboard`);
      cy.wait('@getTenant');
      cy.wait('@getAnalytics');
    });

    it('should display key metrics with Swiss formatting', () => {
      // Should show revenue metrics
      cy.get('[data-testid="revenue-today"]')
        .should('be.visible')
        .should('contain', 'CHF');

      cy.get('[data-testid="orders-today"]')
        .should('be.visible')
        .should('contain', '47'); // From fixture

      cy.get('[data-testid="average-order-value"]')
        .should('contain', 'CHF 28.45');

      // Should show conversion rate
      cy.get('[data-testid="conversion-rate"]')
        .should('contain', '12.3%');
    });

    it('should display live order queue', () => {
      cy.get('[data-testid="live-orders"]').should('be.visible');

      // Should show pending orders
      cy.get('[data-testid="order-queue"]')
        .find('[data-testid="order-card"]')
        .should('have.length.greaterThan', 0);

      // Should show order details
      cy.get('[data-testid="order-ZG-2025-0042"]').within(() => {
        cy.contains('ZG-2025-0042').should('be.visible');
        cy.contains('Hans Müller').should('be.visible');
        cy.contains('CHF 31.40').should('be.visible');
        cy.get('[data-testid="order-status"]')
          .should('contain', 'In Zubereitung');
      });
    });

    it('should show real-time updates', () => {
      // Simulate new order via WebSocket
      cy.window().then((win) => {
        const mockWS = new win.WebSocket('ws://localhost:8080/admin');
        setTimeout(() => {
          const newOrderEvent = {
            type: 'NEW_ORDER',
            data: {
              id: 'ord_new_123',
              orderNumber: 'ZG-2025-0048',
              customer: { name: 'Maria Schmidt' },
              total: 24.90,
              status: 'pending'
            }
          };
          mockWS.onmessage?.({ data: JSON.stringify(newOrderEvent) } as MessageEvent);
        }, 500);
      });

      // Should show new order
      cy.get('[data-testid="order-ZG-2025-0048"]', { timeout: 2000 })
        .should('be.visible');

      // Should play notification sound
      cy.window().its('Audio').should('exist');
    });

    it('should display revenue chart with Swiss formatting', () => {
      cy.get('[data-testid="revenue-chart"]').should('be.visible');

      // Should show chart with CHF formatting
      cy.get('[data-testid="chart-tooltip"]')
        .should('contain', 'CHF');

      // Should have date range selector
      cy.get('[data-testid="date-range-selector"]').should('be.visible');
      cy.get('[data-testid="range-today"]').should('be.visible');
      cy.get('[data-testid="range-week"]').should('be.visible');
      cy.get('[data-testid="range-month"]').should('be.visible');
    });

    it('should show popular products', () => {
      cy.get('[data-testid="popular-products"]').should('be.visible');

      // Should list top selling products
      cy.get('[data-testid="product-rank-1"]').within(() => {
        cy.contains('Zürcher Geschnetzeltes').should('be.visible');
        cy.contains('23 verkauft').should('be.visible');
      });

      cy.get('[data-testid="product-rank-2"]').within(() => {
        cy.contains('Rösti mit Speck').should('be.visible');
        cy.contains('18 verkauft').should('be.visible');
      });
    });
  });

  describe('Order Management', () => {
    beforeEach(() => {
      // Login and navigate to orders
      cy.visit(`${ADMIN_URL}/login`);
      cy.get('[data-testid="email-input"]').type(ADMIN_CREDENTIALS.email);
      cy.get('[data-testid="password-input"]').type(ADMIN_CREDENTIALS.password);
      cy.get('[data-testid="login-submit"]').click();
      cy.wait('@adminLogin');

      cy.visit(`${ADMIN_URL}/orders`);
      cy.wait('@getOrders');
    });

    it('should display order list with filtering', () => {
      // Should show order table
      cy.get('[data-testid="orders-table"]').should('be.visible');

      // Should display orders with Swiss formatting
      cy.get('[data-testid="order-row"]').first().within(() => {
        cy.get('[data-testid="order-number"]')
          .should('contain', 'ZG-2025-');
        cy.get('[data-testid="order-total"]')
          .should('contain', 'CHF');
        cy.get('[data-testid="order-time"]')
          .should('contain', ':');
      });

      // Should have status filters
      cy.get('[data-testid="filter-pending"]').should('be.visible');
      cy.get('[data-testid="filter-preparing"]').should('be.visible');
      cy.get('[data-testid="filter-ready"]').should('be.visible');
      cy.get('[data-testid="filter-completed"]').should('be.visible');
    });

    it('should filter orders by status', () => {
      // Filter by preparing status
      cy.get('[data-testid="filter-preparing"]').click();

      // Should show only preparing orders
      cy.get('[data-testid="order-row"]').each(($row) => {
        cy.wrap($row).find('[data-testid="order-status"]')
          .should('contain', 'Zubereitung');
      });

      // Clear filter
      cy.get('[data-testid="clear-filters"]').click();

      // Should show all orders again
      cy.get('[data-testid="order-row"]').should('have.length.greaterThan', 3);
    });

    it('should update order status', () => {
      // Mock status update
      cy.intercept('PATCH', '/api/tenants/*/orders/*/status', {
        statusCode: 200,
        body: { success: true, status: 'preparing' }
      }).as('updateOrderStatus');

      // Click on order to view details
      cy.get('[data-testid="order-ZG-2025-0042"]').click();

      // Should open order modal
      cy.get('[data-testid="order-modal"]').should('be.visible');

      // Update status
      cy.get('[data-testid="status-selector"]')
        .select('preparing');

      cy.get('[data-testid="update-status"]').click();

      cy.wait('@updateOrderStatus');

      // Should show success message
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Status aktualisiert');

      // Should close modal
      cy.get('[data-testid="order-modal"]').should('not.exist');
    });

    it('should handle order modifications', () => {
      cy.intercept('PUT', '/api/tenants/*/orders/*', {
        statusCode: 200,
        body: { success: true }
      }).as('updateOrder');

      cy.get('[data-testid="order-ZG-2025-0042"]').click();

      // Should show order items
      cy.get('[data-testid="order-items"]').within(() => {
        cy.contains('Zürcher Geschnetzeltes').should('be.visible');
        cy.contains('+ Rösti').should('be.visible');
      });

      // Modify quantity
      cy.get('[data-testid="item-quantity"]').clear().type('2');

      // Add special note
      cy.get('[data-testid="kitchen-notes"]')
        .type('Extra scharf zubereiten');

      cy.get('[data-testid="save-changes"]').click();

      cy.wait('@updateOrder');

      cy.get('[data-testid="success-message"]')
        .should('contain', 'Bestellung aktualisiert');
    });

    it('should print kitchen tickets', () => {
      // Mock print functionality
      cy.window().then((win) => {
        win.print = cy.stub().as('printStub');
      });

      cy.get('[data-testid="order-ZG-2025-0042"]').click();

      cy.get('[data-testid="print-kitchen-ticket"]').click();

      // Should trigger print
      cy.get('@printStub').should('have.been.called');
    });

    it('should handle refunds', () => {
      cy.intercept('POST', '/api/tenants/*/orders/*/refund', {
        statusCode: 200,
        body: {
          success: true,
          refundAmount: 31.40,
          refundId: 'ref_123456'
        }
      }).as('processRefund');

      cy.get('[data-testid="order-ZG-2025-0042"]').click();

      // Open refund modal
      cy.get('[data-testid="refund-order"]').click();

      cy.get('[data-testid="refund-modal"]').should('be.visible');

      // Select refund amount
      cy.get('[data-testid="refund-full"]').click();

      // Add refund reason
      cy.get('[data-testid="refund-reason"]')
        .select('customer-request');

      cy.get('[data-testid="refund-notes"]')
        .type('Kunde nicht zufrieden mit Zubereitung');

      cy.get('[data-testid="confirm-refund"]').click();

      cy.wait('@processRefund');

      // Should show refund confirmation
      cy.get('[data-testid="refund-success"]')
        .should('contain', 'Rückerstattung von CHF 31.40 verarbeitet');
    });
  });

  describe('Kitchen Display System (KDS)', () => {
    beforeEach(() => {
      cy.visit(`${ADMIN_URL}/login`);
      cy.get('[data-testid="email-input"]').type(ADMIN_CREDENTIALS.email);
      cy.get('[data-testid="password-input"]').type(ADMIN_CREDENTIALS.password);
      cy.get('[data-testid="login-submit"]').click();
      cy.wait('@adminLogin');

      cy.visit(`${ADMIN_URL}/kitchen`);
      cy.wait('@getOrders');
    });

    it('should display kitchen queue in preparation order', () => {
      // Should show kitchen display
      cy.get('[data-testid="kitchen-display"]').should('be.visible');

      // Should show orders sorted by time
      cy.get('[data-testid="kitchen-order"]').should('have.length.greaterThan', 0);

      // First order should be oldest
      cy.get('[data-testid="kitchen-order"]').first().within(() => {
        cy.get('[data-testid="order-time"]').should('be.visible');
        cy.get('[data-testid="wait-time"]').should('be.visible');
      });
    });

    it('should show order details with modifiers', () => {
      cy.get('[data-testid="kitchen-order-ZG-2025-0042"]').within(() => {
        // Should show order number
        cy.contains('ZG-2025-0042').should('be.visible');

        // Should show items with modifiers
        cy.contains('1x Zürcher Geschnetzeltes').should('be.visible');
        cy.contains('+ Rösti').should('be.visible');
        cy.contains('+ Extra Sauce').should('be.visible');

        // Should show special instructions
        cy.contains('Ohne Zwiebeln').should('be.visible');

        // Should show allergen warnings
        cy.get('[data-testid="allergen-warning"]')
          .should('contain', 'Enthält: Milch, Gluten');
      });
    });

    it('should bump orders when ready', () => {
      cy.intercept('PATCH', '/api/tenants/*/orders/*/status', {
        statusCode: 200,
        body: { success: true, status: 'ready' }
      }).as('bumpOrder');

      // Bump order
      cy.get('[data-testid="kitchen-order-ZG-2025-0042"]')
        .find('[data-testid="bump-order"]')
        .click();

      cy.wait('@bumpOrder');

      // Order should disappear from kitchen queue
      cy.get('[data-testid="kitchen-order-ZG-2025-0042"]')
        .should('not.exist');

      // Should show in ready queue
      cy.get('[data-testid="ready-orders"]').within(() => {
        cy.contains('ZG-2025-0042').should('be.visible');
      });
    });

    it('should highlight overdue orders', () => {
      // Mock overdue order
      cy.intercept('GET', `/api/tenants/${TEST_TENANT}/orders*`, {
        fixture: 'orders-with-overdue.json'
      });

      cy.reload();

      // Should highlight overdue orders
      cy.get('[data-testid="kitchen-order-overdue"]')
        .should('have.class', 'overdue')
        .should('have.css', 'background-color', 'rgb(255, 0, 0)'); // Red background
    });

    it('should show preparation times', () => {
      cy.get('[data-testid="kitchen-order"]').each(($order) => {
        cy.wrap($order).within(() => {
          // Should show elapsed time
          cy.get('[data-testid="elapsed-time"]').should('be.visible');

          // Should show target time
          cy.get('[data-testid="target-time"]').should('be.visible');
        });
      });
    });

    it('should support voice commands in kitchen', () => {
      // Mock speech recognition
      cy.window().then((win) => {
        win.SpeechRecognition = class {
          start = cy.stub();
          stop = cy.stub();
          onresult = null;
        };
      });

      // Enable voice commands
      cy.get('[data-testid="enable-voice"]').click();

      // Should show voice indicator
      cy.get('[data-testid="voice-active"]').should('be.visible');

      // Simulate voice command "Bump order forty-two"
      cy.window().then((win) => {
        const recognition = new win.SpeechRecognition();
        recognition.onresult?.({
          results: [{
            0: { transcript: 'Bump order ZG-2025-0042', confidence: 0.9 },
            isFinal: true
          }]
        } as any);
      });

      // Should bump the order
      cy.get('[data-testid="kitchen-order-ZG-2025-0042"]')
        .should('not.exist');
    });
  });

  describe('Product Management', () => {
    beforeEach(() => {
      cy.visit(`${ADMIN_URL}/login`);
      cy.get('[data-testid="email-input"]').type(ADMIN_CREDENTIALS.email);
      cy.get('[data-testid="password-input"]').type(ADMIN_CREDENTIALS.password);
      cy.get('[data-testid="login-submit"]').click();
      cy.wait('@adminLogin');

      cy.visit(`${ADMIN_URL}/products`);
      cy.wait('@getProducts');
    });

    it('should display product catalog', () => {
      // Should show product grid
      cy.get('[data-testid="product-grid"]').should('be.visible');

      // Should show products with Swiss formatting
      cy.get('[data-testid="product-card"]').first().within(() => {
        cy.get('[data-testid="product-name"]').should('be.visible');
        cy.get('[data-testid="product-price"]')
          .should('contain', 'CHF');
        cy.get('[data-testid="product-status"]').should('be.visible');
      });

      // Should have action buttons
      cy.get('[data-testid="add-product"]').should('be.visible');
      cy.get('[data-testid="bulk-edit"]').should('be.visible');
    });

    it('should create new product', () => {
      cy.intercept('POST', '/api/tenants/*/products', {
        statusCode: 201,
        body: {
          id: 'prod_new_123',
          name: 'Wiener Schnitzel',
          price: 26.90
        }
      }).as('createProduct');

      // Open new product modal
      cy.get('[data-testid="add-product"]').click();

      cy.get('[data-testid="product-modal"]').should('be.visible');

      // Fill product details
      cy.get('[data-testid="product-name-de"]')
        .type('Wiener Schnitzel');

      cy.get('[data-testid="product-name-fr"]')
        .type('Escalope viennoise');

      cy.get('[data-testid="product-description-de"]')
        .type('Klassisches Wiener Schnitzel mit Rösti');

      cy.get('[data-testid="product-price"]')
        .type('26.90');

      cy.get('[data-testid="product-category"]')
        .select('main-dishes');

      // Add allergens
      cy.get('[data-testid="allergen-gluten"]').check();
      cy.get('[data-testid="allergen-egg"]').check();

      // Set dietary options
      cy.get('[data-testid="dietary-halal"]').check();

      // Upload image
      cy.get('[data-testid="product-image"]')
        .selectFile('cypress/fixtures/schnitzel.jpg');

      cy.get('[data-testid="save-product"]').click();

      cy.wait('@createProduct');

      // Should show success message
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Produkt erstellt');

      // Should appear in product list
      cy.contains('Wiener Schnitzel').should('be.visible');
    });

    it('should edit existing product', () => {
      cy.intercept('PUT', '/api/tenants/*/products/*', {
        statusCode: 200,
        body: { success: true }
      }).as('updateProduct');

      // Click edit on first product
      cy.get('[data-testid="product-card"]')
        .first()
        .find('[data-testid="edit-product"]')
        .click();

      // Should open edit modal with existing data
      cy.get('[data-testid="product-modal"]').should('be.visible');
      cy.get('[data-testid="product-name-de"]')
        .should('have.value', 'Zürcher Geschnetzeltes');

      // Update price
      cy.get('[data-testid="product-price"]')
        .clear()
        .type('25.90');

      // Update availability
      cy.get('[data-testid="product-available"]').uncheck();

      cy.get('[data-testid="save-product"]').click();

      cy.wait('@updateProduct');

      cy.get('[data-testid="success-message"]')
        .should('contain', 'Produkt aktualisiert');
    });

    it('should manage product modifiers', () => {
      cy.get('[data-testid="product-card"]')
        .first()
        .find('[data-testid="edit-product"]')
        .click();

      // Open modifiers tab
      cy.get('[data-testid="tab-modifiers"]').click();

      // Should show existing modifier groups
      cy.get('[data-testid="modifier-group-sides"]').should('be.visible');

      // Add new modifier group
      cy.get('[data-testid="add-modifier-group"]').click();

      cy.get('[data-testid="modifier-group-name"]')
        .type('Sauce wählen');

      cy.get('[data-testid="modifier-required"]').check();
      cy.get('[data-testid="modifier-max-selections"]').type('1');

      // Add modifier options
      cy.get('[data-testid="add-modifier-option"]').click();

      cy.get('[data-testid="option-name"]').type('Béarnaise Sauce');
      cy.get('[data-testid="option-price"]').type('3.50');

      cy.get('[data-testid="save-modifier-group"]').click();

      // Should appear in modifier list
      cy.contains('Sauce wählen').should('be.visible');
    });

    it('should handle bulk operations', () => {
      // Select multiple products
      cy.get('[data-testid="product-checkbox"]').first().check();
      cy.get('[data-testid="product-checkbox"]').eq(1).check();

      // Should show bulk actions
      cy.get('[data-testid="bulk-actions"]').should('be.visible');

      // Bulk update availability
      cy.get('[data-testid="bulk-update-availability"]').click();
      cy.get('[data-testid="bulk-set-unavailable"]').click();
      cy.get('[data-testid="confirm-bulk-update"]').click();

      // Should update selected products
      cy.get('[data-testid="success-message"]')
        .should('contain', '2 Produkte aktualisiert');
    });

    it('should handle AI price optimization', () => {
      cy.intercept('POST', '/api/ai/price-optimization', {
        statusCode: 200,
        body: {
          productId: 'prod_123',
          currentPrice: 24.90,
          optimizedPrice: 26.50,
          projectedRevenueLift: 0.08,
          confidence: 0.87
        }
      }).as('priceOptimization');

      cy.get('[data-testid="product-card"]')
        .first()
        .find('[data-testid="optimize-price"]')
        .click();

      cy.wait('@priceOptimization');

      // Should show AI recommendations
      cy.get('[data-testid="price-optimization-modal"]').should('be.visible');
      cy.contains('Empfohlener Preis: CHF 26.50').should('be.visible');
      cy.contains('Geschätzte Umsatzsteigerung: 8%').should('be.visible');

      // Apply recommendation
      cy.get('[data-testid="apply-optimization"]').click();

      cy.get('[data-testid="product-price"]')
        .should('contain', 'CHF 26.50');
    });
  });

  describe('Analytics & Reports', () => {
    beforeEach(() => {
      cy.visit(`${ADMIN_URL}/login`);
      cy.get('[data-testid="email-input"]').type(ADMIN_CREDENTIALS.email);
      cy.get('[data-testid="password-input"]').type(ADMIN_CREDENTIALS.password);
      cy.get('[data-testid="login-submit"]').click();
      cy.wait('@adminLogin');

      cy.visit(`${ADMIN_URL}/analytics`);
      cy.wait('@getAnalytics');
    });

    it('should display sales analytics with Swiss formatting', () => {
      // Should show revenue chart
      cy.get('[data-testid="revenue-chart"]').should('be.visible');

      // Should format currency correctly
      cy.get('[data-testid="chart-axis"]')
        .should('contain', 'CHF');

      // Should show key metrics
      cy.get('[data-testid="total-revenue"]')
        .should('contain', 'CHF 12,345.67');

      cy.get('[data-testid="average-order-value"]')
        .should('contain', 'CHF 28.45');

      cy.get('[data-testid="order-count"]')
        .should('contain', '234');
    });

    it('should filter analytics by date range', () => {
      // Select last 7 days
      cy.get('[data-testid="date-range-picker"]').click();
      cy.get('[data-testid="range-7-days"]').click();

      // Should update charts
      cy.get('[data-testid="revenue-chart"]')
        .should('be.visible');

      // Select custom date range
      cy.get('[data-testid="date-range-picker"]').click();
      cy.get('[data-testid="custom-range"]').click();

      cy.get('[data-testid="start-date"]')
        .type('2025-01-01');
      cy.get('[data-testid="end-date"]')
        .type('2025-01-07');

      cy.get('[data-testid="apply-date-range"]').click();

      // Should update with new data
      cy.wait('@getAnalytics');
    });

    it('should show product performance analytics', () => {
      // Navigate to product analytics
      cy.get('[data-testid="tab-products"]').click();

      // Should show product table
      cy.get('[data-testid="product-analytics-table"]').should('be.visible');

      // Should show metrics for each product
      cy.get('[data-testid="product-row"]').first().within(() => {
        cy.get('[data-testid="product-name"]').should('be.visible');
        cy.get('[data-testid="units-sold"]').should('be.visible');
        cy.get('[data-testid="revenue"]').should('contain', 'CHF');
        cy.get('[data-testid="profit-margin"]').should('contain', '%');
      });

      // Should allow sorting
      cy.get('[data-testid="sort-by-revenue"]').click();

      // Should sort by revenue descending
      cy.get('[data-testid="product-row"]').first()
        .find('[data-testid="revenue"]')
        .invoke('text')
        .then((firstRevenue) => {
          cy.get('[data-testid="product-row"]').eq(1)
            .find('[data-testid="revenue"]')
            .invoke('text')
            .then((secondRevenue) => {
              // First should be higher than second
              const first = parseFloat(firstRevenue.replace(/[^\d.]/g, ''));
              const second = parseFloat(secondRevenue.replace(/[^\d.]/g, ''));
              expect(first).to.be.gte(second);
            });
        });
    });

    it('should export reports', () => {
      // Mock file download
      cy.window().then((win) => {
        const link = win.document.createElement('a');
        link.href = 'data:text/csv;charset=utf-8,mock-csv-data';
        link.download = 'sales-report.csv';
        cy.stub(win.document, 'createElement').returns(link);
        cy.stub(link, 'click');
      });

      // Export sales report
      cy.get('[data-testid="export-dropdown"]').click();
      cy.get('[data-testid="export-csv"]').click();

      // Should trigger download
      cy.window().its('document').invoke('createElement')
        .should('have.been.calledWith', 'a');
    });

    it('should show customer analytics', () => {
      cy.get('[data-testid="tab-customers"]').click();

      // Should show customer metrics
      cy.get('[data-testid="total-customers"]').should('be.visible');
      cy.get('[data-testid="new-customers"]').should('be.visible');
      cy.get('[data-testid="returning-customers"]').should('be.visible');

      // Should show customer list
      cy.get('[data-testid="customer-table"]').should('be.visible');

      // Should respect FADP privacy requirements
      cy.get('[data-testid="privacy-notice"]')
        .should('contain', 'Daten gemäß FADP verarbeitet');
    });
  });

  describe('Settings & Configuration', () => {
    beforeEach(() => {
      cy.visit(`${ADMIN_URL}/login`);
      cy.get('[data-testid="email-input"]').type(ADMIN_CREDENTIALS.email);
      cy.get('[data-testid="password-input"]').type(ADMIN_CREDENTIALS.password);
      cy.get('[data-testid="login-submit"]').click();
      cy.wait('@adminLogin');

      cy.visit(`${ADMIN_URL}/settings`);
    });

    it('should manage general settings', () => {
      // Should show settings form
      cy.get('[data-testid="settings-form"]').should('be.visible');

      // Update restaurant name
      cy.get('[data-testid="restaurant-name"]')
        .clear()
        .type('Zürcher Genuss - Updated');

      // Update contact information
      cy.get('[data-testid="phone-number"]')
        .clear()
        .type('+41 44 123 45 67');

      cy.get('[data-testid="email"]')
        .clear()
        .type('info@zuercher-genuss.ch');

      // Update operating hours
      cy.get('[data-testid="hours-monday-open"]')
        .clear()
        .type('11:00');

      cy.get('[data-testid="hours-monday-close"]')
        .clear()
        .type('21:00');

      cy.get('[data-testid="save-settings"]').click();

      // Should save successfully
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Einstellungen gespeichert');
    });

    it('should configure payment methods', () => {
      cy.get('[data-testid="tab-payments"]').click();

      // Should show Swiss payment methods
      cy.get('[data-testid="payment-card"]').should('be.checked');
      cy.get('[data-testid="payment-twint"]').should('be.checked');
      cy.get('[data-testid="payment-cash"]').should('be.checked');

      // Configure Twint
      cy.get('[data-testid="twint-merchant-id"]')
        .clear()
        .type('CH12345');

      // Configure Stripe
      cy.get('[data-testid="stripe-public-key"]')
        .clear()
        .type('pk_test_...');

      cy.get('[data-testid="save-payment-settings"]').click();

      cy.get('[data-testid="success-message"]')
        .should('contain', 'Zahlungseinstellungen aktualisiert');
    });

    it('should manage staff accounts', () => {
      cy.get('[data-testid="tab-staff"]').click();

      // Should show staff list
      cy.get('[data-testid="staff-table"]').should('be.visible');

      // Add new staff member
      cy.get('[data-testid="add-staff"]').click();

      cy.get('[data-testid="staff-modal"]').should('be.visible');

      cy.get('[data-testid="staff-name"]').type('Maria Müller');
      cy.get('[data-testid="staff-email"]').type('maria@zuercher-genuss.ch');
      cy.get('[data-testid="staff-role"]').select('kitchen');
      cy.get('[data-testid="staff-password"]').type('TempPassword123!');

      cy.get('[data-testid="create-staff"]').click();

      // Should appear in staff list
      cy.contains('Maria Müller').should('be.visible');
    });
  });

  describe('Error Handling & Edge Cases', () => {
    beforeEach(() => {
      cy.visit(`${ADMIN_URL}/login`);
      cy.get('[data-testid="email-input"]').type(ADMIN_CREDENTIALS.email);
      cy.get('[data-testid="password-input"]').type(ADMIN_CREDENTIALS.password);
      cy.get('[data-testid="login-submit"]').click();
      cy.wait('@adminLogin');
    });

    it('should handle API errors gracefully', () => {
      // Mock API error
      cy.intercept('GET', `/api/tenants/${TEST_TENANT}/orders*`, {
        statusCode: 500,
        body: { error: 'Internal server error' }
      });

      cy.visit(`${ADMIN_URL}/orders`);

      // Should show error message
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .should('contain', 'Fehler beim Laden der Bestellungen');

      // Should have retry button
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should handle offline scenarios', () => {
      cy.visit(`${ADMIN_URL}/dashboard`);
      cy.wait('@getAnalytics');

      // Simulate going offline
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'onLine', {
          writable: true,
          value: false
        });

        const offlineEvent = new Event('offline');
        win.dispatchEvent(offlineEvent);
      });

      // Should show offline indicator
      cy.get('[data-testid="offline-indicator"]')
        .should('be.visible')
        .should('contain', 'Offline');

      // Should queue operations
      cy.get('[data-testid="add-product"]').click();
      cy.get('[data-testid="offline-queue-notice"]')
        .should('contain', 'Wird synchronisiert wenn wieder online');
    });

    it('should validate form inputs', () => {
      cy.visit(`${ADMIN_URL}/products`);
      cy.wait('@getProducts');

      cy.get('[data-testid="add-product"]').click();

      // Try to save without required fields
      cy.get('[data-testid="save-product"]').click();

      // Should show validation errors
      cy.get('[data-testid="name-error"]')
        .should('contain', 'Name ist erforderlich');

      cy.get('[data-testid="price-error"]')
        .should('contain', 'Preis ist erforderlich');

      // Test invalid price format
      cy.get('[data-testid="product-price"]').type('invalid');
      cy.get('[data-testid="product-name-de"]').click();

      cy.get('[data-testid="price-error"]')
        .should('contain', 'Gültiger Preis erforderlich');
    });
  });
});
