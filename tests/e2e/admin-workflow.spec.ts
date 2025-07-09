import { test, expect } from '@playwright/test';
import { addDays, format } from 'date-fns';

test.describe('Admin Workflow - Food Truck Dashboard', () => {
  // Test credentials
  const adminCredentials = {
    email: 'admin@burgertruck.ch',
    password: 'Test123!',
    truckId: 'burger-truck-001'
  };

  const testProduct = {
    name: {
      de: 'Schweizer Burger Deluxe',
      fr: 'Burger Suisse Deluxe',
      it: 'Burger Svizzero Deluxe',
      en: 'Swiss Burger Deluxe'
    },
    description: {
      de: 'Saftiger Rindfleisch-Burger mit Schweizer Käse',
      fr: 'Burger juteux au bœuf avec fromage suisse',
      it: 'Hamburger succoso di manzo con formaggio svizzero',
      en: 'Juicy beef burger with Swiss cheese'
    },
    price: 18.90,
    category: 'mains',
    allergens: ['gluten', 'milk', 'eggs'],
    originCountry: 'Schweiz'
  };

  test.beforeEach(async ({ page }) => {
    // Login as food truck admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', adminCredentials.email);
    await page.fill('[data-testid="password-input"]', adminCredentials.password);
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard
    await expect(page).toHaveURL('/admin/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Willkommen zurück');
  });

  test('Dashboard overview', async ({ page }) => {
    // Check main metrics
    await expect(page.locator('[data-testid="todays-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-wait-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="popular-items"]')).toBeVisible();

    // Live orders widget
    const liveOrders = page.locator('[data-testid="live-orders-widget"]');
    await expect(liveOrders).toBeVisible();
    
    // Check if order numbers start at 100
    const firstOrderNumber = await liveOrders.locator('[data-testid="order-number"]').first().textContent();
    expect(parseInt(firstOrderNumber || '0')).toBeGreaterThanOrEqual(100);

    // AI insights
    await expect(page.locator('[data-testid="ai-insights"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-insights"]')).toContainText(/Dienstags verkaufst du|Bei Regen|Rush Hour/);

    // Trial period notice (if in trial)
    const trialNotice = page.locator('[data-testid="trial-notice"]');
    if (await trialNotice.isVisible()) {
      await expect(trialNotice).toContainText('Gratis-Testphase');
      await expect(trialNotice).toContainText(/noch \d+ Tage/);
    }
  });

  test('Product management - Create new product', async ({ page }) => {
    // Navigate to products
    await page.click('[data-testid="nav-products"]');
    await expect(page).toHaveURL('/admin/products');

    // Click add product
    await page.click('[data-testid="add-product-button"]');

    // Fill product form - German
    await page.fill('[data-testid="product-name-de"]', testProduct.name.de);
    await page.fill('[data-testid="product-description-de"]', testProduct.description.de);

    // Switch to French tab
    await page.click('[data-testid="lang-tab-fr"]');
    await page.fill('[data-testid="product-name-fr"]', testProduct.name.fr);
    await page.fill('[data-testid="product-description-fr"]', testProduct.description.fr);

    // Switch to Italian tab
    await page.click('[data-testid="lang-tab-it"]');
    await page.fill('[data-testid="product-name-it"]', testProduct.name.it);
    await page.fill('[data-testid="product-description-it"]', testProduct.description.it);

    // Switch to English tab
    await page.click('[data-testid="lang-tab-en"]');
    await page.fill('[data-testid="product-name-en"]', testProduct.name.en);
    await page.fill('[data-testid="product-description-en"]', testProduct.description.en);

    // Back to main tab for other fields
    await page.click('[data-testid="lang-tab-general"]');

    // Set price (psychological pricing)
    await page.fill('[data-testid="product-price"]', testProduct.price.toString());

    // Select category
    await page.selectOption('[data-testid="product-category"]', testProduct.category);

    // Select allergens
    for (const allergen of testProduct.allergens) {
      await page.click(`[data-testid="allergen-${allergen}"]`);
    }

    // Set origin (required for meat)
    await page.fill('[data-testid="origin-country"]', testProduct.originCountry);

    // Upload image
    await page.setInputFiles('[data-testid="product-image"]', 'tests/fixtures/burger.jpg');

    // Add modifiers
    await page.click('[data-testid="add-modifier-button"]');
    await page.fill('[data-testid="modifier-name-0"]', 'Extra Käse');
    await page.fill('[data-testid="modifier-price-0"]', '2.50');

    await page.click('[data-testid="add-modifier-button"]');
    await page.fill('[data-testid="modifier-name-1"]', 'Ohne Zwiebeln');
    await page.fill('[data-testid="modifier-price-1"]', '0');

    // Save product
    await page.click('[data-testid="save-product-button"]');

    // Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Produkt erfolgreich erstellt');
    await expect(page.locator('[data-testid="product-list"]')).toContainText(testProduct.name.de);
  });

  test('Order management workflow', async ({ page }) => {
    // Navigate to orders
    await page.click('[data-testid="nav-orders"]');
    await expect(page).toHaveURL('/admin/orders');

    // Check order filters
    await expect(page.locator('[data-testid="order-filter-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-filter-pending"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-filter-preparing"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-filter-ready"]')).toBeVisible();

    // Find a pending order
    const pendingOrder = page.locator('[data-testid="order-card"][data-status="pending"]').first();
    await expect(pendingOrder).toBeVisible();

    // Check order details
    const orderNumber = await pendingOrder.locator('[data-testid="order-number"]').textContent();
    expect(parseInt(orderNumber || '0')).toBeGreaterThanOrEqual(100);

    // Start preparing
    await pendingOrder.locator('[data-testid="start-preparing-button"]').click();
    await expect(pendingOrder).toHaveAttribute('data-status', 'preparing');

    // Check timer started
    await expect(pendingOrder.locator('[data-testid="preparation-timer"]')).toBeVisible();

    // Mark as ready
    await pendingOrder.locator('[data-testid="mark-ready-button"]').click();
    await expect(pendingOrder).toHaveAttribute('data-status', 'ready');

    // Should trigger customer notification
    await expect(page.locator('[data-testid="notification-sent-indicator"]')).toBeVisible();

    // Complete order
    await pendingOrder.locator('[data-testid="complete-order-button"]').click();
    await expect(pendingOrder).toHaveAttribute('data-status', 'completed');
  });

  test('Location and schedule management', async ({ page }) => {
    // Navigate to locations
    await page.click('[data-testid="nav-locations"]');
    await expect(page).toHaveURL('/admin/locations');

    // Add new location
    await page.click('[data-testid="add-location-button"]');

    // Fill location details
    await page.fill('[data-testid="location-name"]', 'Bahnhofplatz Bern');
    await page.fill('[data-testid="location-address"]', 'Bahnhofplatz 1, 3011 Bern');

    // Set coordinates (or use map picker)
    await page.click('[data-testid="use-map-picker"]');
    await page.click('[data-testid="map"]', { position: { x: 200, y: 200 } }); // Click on map

    // Set schedule
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    for (const day of days) {
      await page.click(`[data-testid="schedule-${day}-active"]`);
      await page.fill(`[data-testid="schedule-${day}-open"]`, '11:30');
      await page.fill(`[data-testid="schedule-${day}-close"]`, '14:00');
    }

    // Save location
    await page.click('[data-testid="save-location-button"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Standort erfolgreich hinzugefügt');

    // Set as current location
    const newLocation = page.locator('[data-testid="location-card"]').filter({ hasText: 'Bahnhofplatz Bern' });
    await newLocation.locator('[data-testid="set-active-button"]').click();
    await expect(newLocation).toHaveAttribute('data-active', 'true');
  });

  test('HACCP compliance features', async ({ page }) => {
    // Navigate to HACCP
    await page.click('[data-testid="nav-haccp"]');
    await expect(page).toHaveURL('/admin/haccp');

    // Temperature monitoring
    const tempWidget = page.locator('[data-testid="temperature-monitoring"]');
    await expect(tempWidget).toBeVisible();

    // Check sensor readings
    const fridgeTemp = await tempWidget.locator('[data-testid="sensor-fridge"]').textContent();
    expect(parseFloat(fridgeTemp || '0')).toBeGreaterThan(2);
    expect(parseFloat(fridgeTemp || '0')).toBeLessThan(5);

    // Check for alerts
    const alerts = page.locator('[data-testid="temperature-alerts"]');
    if (await alerts.isVisible()) {
      // Acknowledge alert
      await alerts.locator('[data-testid="acknowledge-alert-button"]').first().click();
      await expect(page.locator('[data-testid="signature-modal"]')).toBeVisible();
      
      // Sign with PIN
      await page.fill('[data-testid="signature-pin"]', '1234');
      await page.click('[data-testid="confirm-signature"]');
    }

    // Daily checklist
    await page.click('[data-testid="tab-checklists"]');
    
    const todaysChecklist = page.locator('[data-testid="daily-checklist"]');
    await expect(todaysChecklist).toBeVisible();

    // Complete morning temperature check
    const morningCheck = todaysChecklist.locator('[data-testid="task-morning_temp"]');
    await morningCheck.locator('[data-testid="complete-task-button"]').click();

    // Digital signature
    await page.fill('[data-testid="signature-pin"]', '1234');
    await page.click('[data-testid="sign-task"]');

    await expect(morningCheck).toHaveAttribute('data-completed', 'true');

    // Export records
    await page.click('[data-testid="export-records-button"]');
    await page.selectOption('[data-testid="export-format"]', 'pdf');
    await page.selectOption('[data-testid="export-period"]', 'last_month');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-export"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/HACCP_Records_.*\.pdf/);
  });

  test('Analytics and AI insights', async ({ page }) => {
    // Navigate to analytics
    await page.click('[data-testid="nav-analytics"]');
    await expect(page).toHaveURL('/admin/analytics');

    // Date range selector
    await page.click('[data-testid="date-range-selector"]');
    await page.click('[data-testid="date-range-last-7-days"]');

    // Revenue chart
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();

    // Popular items
    const popularItems = page.locator('[data-testid="popular-items-list"]');
    await expect(popularItems).toBeVisible();
    await expect(popularItems.locator('[data-testid="item-rank-1"]')).toContainText('Burger');

    // Peak hours heatmap
    await expect(page.locator('[data-testid="peak-hours-heatmap"]')).toBeVisible();

    // AI Insights section
    const aiInsights = page.locator('[data-testid="ai-insights-section"]');
    await expect(aiInsights).toBeVisible();

    // Check for specific insights
    await expect(aiInsights).toContainText(/Rush Hour|Wetter|Umsatz|Empfehlung/);

    // Dynamic pricing suggestions
    const pricingSuggestions = page.locator('[data-testid="pricing-suggestions"]');
    if (await pricingSuggestions.isVisible()) {
      // Apply suggestion
      const firstSuggestion = pricingSuggestions.locator('[data-testid="price-suggestion"]').first();
      const productName = await firstSuggestion.locator('[data-testid="suggestion-product"]').textContent();
      
      await firstSuggestion.locator('[data-testid="apply-suggestion-button"]').click();
      await expect(page.locator('[data-testid="success-toast"]')).toContainText(`Preis für ${productName} aktualisiert`);
    }

    // Export analytics
    await page.click('[data-testid="export-analytics-button"]');
    await page.selectOption('[data-testid="export-type"]', 'bexio');
    await page.click('[data-testid="generate-export"]');
    
    // Should show export ready
    await expect(page.locator('[data-testid="export-ready-notification"]')).toBeVisible();
  });

  test('Inventory management', async ({ page }) => {
    // Navigate to inventory
    await page.click('[data-testid="nav-inventory"]');
    await expect(page).toHaveURL('/admin/inventory');

    // Check low stock alerts
    const lowStockAlerts = page.locator('[data-testid="low-stock-alerts"]');
    if (await lowStockAlerts.isVisible()) {
      await expect(lowStockAlerts).toContainText(/Niedriger Bestand/);
    }

    // Update stock
    const firstItem = page.locator('[data-testid="inventory-item"]').first();
    await firstItem.locator('[data-testid="quick-update-button"]').click();

    // Quick update modal
    const updateModal = page.locator('[data-testid="quick-update-modal"]');
    await page.fill('[data-testid="new-quantity"]', '50');
    await page.selectOption('[data-testid="update-reason"]', 'delivery');
    await page.fill('[data-testid="update-note"]', 'Lieferung von Supplier AG');
    await page.click('[data-testid="confirm-update"]');

    // Verify update
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Bestand aktualisiert');
    await expect(firstItem.locator('[data-testid="current-stock"]')).toContainText('50');

    // AI demand prediction
    await page.click('[data-testid="show-predictions-button"]');
    const predictions = page.locator('[data-testid="demand-predictions"]');
    await expect(predictions).toBeVisible();
    await expect(predictions).toContainText(/Morgen brauchst du etwa/);
  });

  test('Promotion and discount management', async ({ page }) => {
    // Navigate to promotions
    await page.click('[data-testid="nav-promotions"]');
    await expect(page).toHaveURL('/admin/promotions');

    // Create new promotion
    await page.click('[data-testid="create-promotion-button"]');

    // Fill promotion details
    await page.fill('[data-testid="promotion-name"]', 'Mittags-Special');
    await page.fill('[data-testid="promotion-description"]', '20% Rabatt auf alle Burger');
    
    // Set discount
    await page.selectOption('[data-testid="discount-type"]', 'percentage');
    await page.fill('[data-testid="discount-value"]', '20');

    // Set time restrictions
    await page.click('[data-testid="time-restricted"]');
    await page.fill('[data-testid="valid-from-time"]', '11:30');
    await page.fill('[data-testid="valid-to-time"]', '14:00');

    // Select applicable products
    await page.click('[data-testid="select-products-button"]');
    await page.click('[data-testid="product-category-mains"]');
    await page.click('[data-testid="apply-selection"]');

    // Set validity period
    await page.fill('[data-testid="valid-from-date"]', format(new Date(), 'yyyy-MM-dd'));
    await page.fill('[data-testid="valid-to-date"]', format(addDays(new Date(), 30), 'yyyy-MM-dd'));

    // Save promotion
    await page.click('[data-testid="save-promotion-button"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Aktion erfolgreich erstellt');

    // Verify promotion appears
    await expect(page.locator('[data-testid="promotion-list"]')).toContainText('Mittags-Special');
  });

  test('Settings and configuration', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="nav-settings"]');
    await expect(page).toHaveURL('/admin/settings');

    // Business information
    await page.click('[data-testid="tab-business"]');
    
    // Update opening hours
    await page.fill('[data-testid="default-open-time"]', '11:00');
    await page.fill('[data-testid="default-close-time"]', '20:00');
    
    // Payment settings
    await page.click('[data-testid="tab-payment"]');
    
    // Check Stripe connection status
    await expect(page.locator('[data-testid="stripe-status"]')).toContainText('Verbunden');
    
    // Notification settings
    await page.click('[data-testid="tab-notifications"]');
    
    // Enable/disable notifications
    await page.click('[data-testid="notify-new-order"]');
    await page.click('[data-testid="notify-low-stock"]');
    
    // Voice settings
    await page.click('[data-testid="tab-voice"]');
    
    // Select voice for announcements
    await page.selectOption('[data-testid="announcement-voice"]', 'swiss-german-female');
    await page.fill('[data-testid="announcement-volume"]', '80');
    
    // Test voice
    await page.click('[data-testid="test-voice-button"]');
    
    // Save all settings
    await page.click('[data-testid="save-settings-button"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Einstellungen gespeichert');
  });

  test('Multi-language product preview', async ({ page }) => {
    // Navigate to products
    await page.click('[data-testid="nav-products"]');
    
    // Select a product
    const productCard = page.locator('[data-testid="product-card"]').first();
    await productCard.click();
    
    // Open preview
    await page.click('[data-testid="preview-product-button"]');
    
    // Preview modal
    const previewModal = page.locator('[data-testid="product-preview-modal"]');
    await expect(previewModal).toBeVisible();
    
    // Switch between languages
    const languages = ['de', 'fr', 'it', 'en'];
    for (const lang of languages) {
      await previewModal.locator(`[data-testid="preview-lang-${lang}"]`).click();
      
      // Check content changes
      await expect(previewModal.locator('[data-testid="preview-name"]')).not.toBeEmpty();
      await expect(previewModal.locator('[data-testid="preview-description"]')).not.toBeEmpty();
    }
    
    // Check QR code preview
    await expect(previewModal.locator('[data-testid="qr-code-preview"]')).toBeVisible();
  });
});
