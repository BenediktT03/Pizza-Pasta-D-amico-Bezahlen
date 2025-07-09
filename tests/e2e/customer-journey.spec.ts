import { test, expect } from '@playwright/test';
import { format } from 'date-fns';
import { de, fr, it, enGB } from 'date-fns/locale';

test.describe('Customer Journey - Complete Order Flow', () => {
  // Test data
  const testTruck = {
    id: 'test-food-truck',
    name: 'Burger Express',
    qrUrl: '/truck/test-food-truck'
  };

  const testCustomer = {
    name: 'Hans Müller',
    phone: '+41791234567',
    email: 'hans.mueller@example.ch'
  };

  test.beforeEach(async ({ page }) => {
    // Set viewport to mobile size (most customers will use mobile)
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
  });

  test('Complete order flow in German', async ({ page }) => {
    // 1. Customer scans QR code / visits truck page
    await page.goto(testTruck.qrUrl);
    await expect(page).toHaveTitle(/Burger Express/);

    // 2. Language selection (should default to German in CH)
    const languageSelector = page.locator('[data-testid="language-selector"]');
    await expect(languageSelector).toBeVisible();
    await page.click('[data-testid="language-de"]');
    await expect(page).toHaveURL(/.*lang=de/);

    // 3. View menu
    await expect(page.locator('h1')).toContainText('Speisekarte');
    await expect(page.locator('[data-testid="menu-categories"]')).toBeVisible();

    // 4. Browse products and check allergen info
    const burgerCard = page.locator('[data-testid="product-burger"]');
    await expect(burgerCard).toBeVisible();
    await burgerCard.click();

    // Check product details modal
    const productModal = page.locator('[data-testid="product-modal"]');
    await expect(productModal).toBeVisible();
    await expect(productModal.locator('[data-testid="allergen-info"]')).toContainText('Enthält: Gluten, Milch');
    await expect(productModal.locator('[data-testid="origin-info"]')).toContainText('Herkunft Fleisch: Schweiz');

    // 5. Add to cart with modifications
    await page.click('[data-testid="modifier-no-onions"]');
    await page.click('[data-testid="modifier-extra-cheese"]');
    await page.fill('[data-testid="special-instructions"]', 'Bitte gut durchgebraten');
    await page.click('[data-testid="add-to-cart"]');

    // Add more items
    await page.click('[data-testid="product-fries"]');
    await page.click('[data-testid="size-large"]');
    await page.click('[data-testid="add-to-cart"]');

    await page.click('[data-testid="product-cola"]');
    await page.click('[data-testid="add-to-cart"]');

    // 6. View cart
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toContainText('3');
    await page.click('[data-testid="cart-button"]');

    // Verify cart contents
    const cartModal = page.locator('[data-testid="cart-modal"]');
    await expect(cartModal).toBeVisible();
    await expect(cartModal).toContainText('Burger');
    await expect(cartModal).toContainText('ohne Zwiebeln');
    await expect(cartModal).toContainText('extra Käse');
    await expect(cartModal).toContainText('Pommes Frites (Gross)');
    await expect(cartModal).toContainText('Cola');

    // Check total with VAT
    await expect(cartModal.locator('[data-testid="subtotal"]')).toContainText('CHF');
    await expect(cartModal.locator('[data-testid="vat-info"]')).toContainText('inkl. 2.5% MwSt'); // Takeaway

    // 7. Proceed to checkout
    await page.click('[data-testid="checkout-button"]');

    // 8. Enter customer details
    await page.fill('[data-testid="customer-name"]', testCustomer.name);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);
    await page.fill('[data-testid="customer-email"]', testCustomer.email);

    // 9. Select payment method - TWINT (primary in CH)
    await expect(page.locator('[data-testid="payment-methods"]')).toBeVisible();
    await page.click('[data-testid="payment-twint"]');

    // TWINT QR should appear
    await expect(page.locator('[data-testid="twint-qr"]')).toBeVisible();
    await expect(page.locator('[data-testid="twint-instructions"]')).toContainText('QR-Code mit TWINT App scannen');

    // Simulate successful payment (in real test, would mock the webhook)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('payment-success', {
        detail: { paymentIntentId: 'pi_test_123' }
      }));
    });

    // 10. Order confirmation
    await expect(page.locator('[data-testid="order-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-success"]')).toContainText('Bestellung erfolgreich');
    
    // Check order number (should start at 100)
    const orderNumber = page.locator('[data-testid="order-number"]');
    await expect(orderNumber).toBeVisible();
    await expect(orderNumber).toContainText(/Bestellnummer: \d{3,}/);

    // Check estimated time
    await expect(page.locator('[data-testid="estimated-time"]')).toContainText(/Geschätzte Wartezeit: \d+ Minuten/);

    // 11. Real-time order status updates
    // Simulate order status change
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('order-status-update', {
        detail: { status: 'preparing' }
      }));
    });

    await expect(page.locator('[data-testid="order-status"]')).toContainText('Wird zubereitet');

    // Simulate order ready
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('order-status-update', {
        detail: { status: 'ready' }
      }));
    });

    await expect(page.locator('[data-testid="order-status"]')).toContainText('Ihre Bestellung ist fertig!');
    
    // Should trigger audio notification
    const audioPlayed = await page.evaluate(() => {
      return window.audioNotificationPlayed;
    });
    expect(audioPlayed).toBeTruthy();
  });

  test('Order flow in French', async ({ page }) => {
    await page.goto(testTruck.qrUrl);
    
    // Select French
    await page.click('[data-testid="language-fr"]');
    await expect(page).toHaveURL(/.*lang=fr/);
    await expect(page.locator('h1')).toContainText('Menu');

    // Quick order flow
    await page.click('[data-testid="product-burger"]');
    await page.click('[data-testid="add-to-cart"]');
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    // Verify French translations
    await expect(page.locator('[data-testid="name-label"]')).toContainText('Nom');
    await expect(page.locator('[data-testid="phone-label"]')).toContainText('Téléphone');
    await expect(page.locator('[data-testid="payment-title"]')).toContainText('Mode de paiement');
  });

  test('Order flow in Italian', async ({ page }) => {
    await page.goto(testTruck.qrUrl);
    
    // Select Italian
    await page.click('[data-testid="language-it"]');
    await expect(page).toHaveURL(/.*lang=it/);
    await expect(page.locator('h1')).toContainText('Menu');

    // Verify Italian UI
    await page.click('[data-testid="product-burger"]');
    await expect(page.locator('[data-testid="add-to-cart-button"]')).toContainText('Aggiungi al carrello');
  });

  test('Order flow in English', async ({ page }) => {
    await page.goto(testTruck.qrUrl);
    
    // Select English
    await page.click('[data-testid="language-en"]');
    await expect(page).toHaveURL(/.*lang=en/);
    await expect(page.locator('h1')).toContainText('Menu');

    // Verify English UI
    await page.click('[data-testid="cart-button"]');
    await expect(page.locator('[data-testid="empty-cart-message"]')).toContainText('Your cart is empty');
  });

  test('Handle sold out products', async ({ page }) => {
    await page.goto(testTruck.qrUrl);
    await page.click('[data-testid="language-de"]');

    // Find sold out product
    const soldOutProduct = page.locator('[data-testid="product-special-burger"]');
    await expect(soldOutProduct).toHaveAttribute('data-sold-out', 'true');
    await expect(soldOutProduct.locator('[data-testid="sold-out-badge"]')).toContainText('Ausverkauft');

    // Should not be clickable
    await soldOutProduct.click();
    await expect(page.locator('[data-testid="product-modal"]')).not.toBeVisible();
  });

  test('Add tip during checkout', async ({ page }) => {
    await page.goto(testTruck.qrUrl);
    await page.click('[data-testid="language-de"]');

    // Add product and go to checkout
    await page.click('[data-testid="product-burger"]');
    await page.click('[data-testid="add-to-cart"]');
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    // Fill customer details
    await page.fill('[data-testid="customer-name"]', testCustomer.name);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);

    // Add tip
    await expect(page.locator('[data-testid="tip-section"]')).toBeVisible();
    await page.click('[data-testid="tip-15-percent"]');

    // Verify tip is added to total
    const tipAmount = await page.locator('[data-testid="tip-amount"]').textContent();
    expect(tipAmount).toMatch(/CHF \d+\.\d{2}/);

    // Check transparency message
    await expect(page.locator('[data-testid="tip-transparency"]')).toContainText('97% an den Food Truck, 3% Servicegebühr');
  });

  test('Offline mode handling', async ({ page, context }) => {
    await page.goto(testTruck.qrUrl);
    await page.click('[data-testid="language-de"]');

    // Add items to cart
    await page.click('[data-testid="product-burger"]');
    await page.click('[data-testid="add-to-cart"]');

    // Go offline
    await context.setOffline(true);

    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Offline-Modus');

    // Cart should still work
    await page.click('[data-testid="cart-button"]');
    await expect(page.locator('[data-testid="cart-modal"]')).toBeVisible();

    // Try to checkout
    await page.click('[data-testid="checkout-button"]');
    
    // Should show offline payment message
    await expect(page.locator('[data-testid="offline-payment-notice"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-payment-notice"]')).toContainText('Zahlung wird gespeichert und übertragen sobald wieder online');

    // Go back online
    await context.setOffline(false);

    // Should sync automatically
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-indicator"]')).toContainText('Synchronisiere...');
  });

  test('PWA installation prompt', async ({ page }) => {
    await page.goto(testTruck.qrUrl);

    // Check if PWA install prompt appears (on supported browsers)
    const installButton = page.locator('[data-testid="pwa-install-button"]');
    
    if (await installButton.isVisible()) {
      await installButton.click();
      
      // Verify install dialog (mocked in test)
      await expect(page.locator('[data-testid="pwa-install-dialog"]')).toBeVisible();
    }
  });

  test('Responsive design on different devices', async ({ page }) => {
    const devices = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const device of devices) {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto(testTruck.qrUrl);

      // Menu should be visible and adapted
      await expect(page.locator('[data-testid="menu-container"]')).toBeVisible();
      
      // Check responsive layout
      if (device.width >= 768) {
        // Tablet and desktop should show grid layout
        await expect(page.locator('[data-testid="menu-grid"]')).toHaveCSS('display', 'grid');
      } else {
        // Mobile should show single column
        await expect(page.locator('[data-testid="menu-grid"]')).toHaveCSS('display', 'flex');
      }
    }
  });

  test('Follow favorite truck', async ({ page }) => {
    await page.goto(testTruck.qrUrl);
    await page.click('[data-testid="language-de"]');

    // Click follow button
    await page.click('[data-testid="follow-truck-button"]');

    // Should prompt for notification permission
    const notificationPrompt = page.locator('[data-testid="notification-prompt"]');
    await expect(notificationPrompt).toBeVisible();
    await expect(notificationPrompt).toContainText('Benachrichtigungen aktivieren');

    // Accept notifications
    await page.click('[data-testid="enable-notifications"]');

    // Verify truck is followed
    await expect(page.locator('[data-testid="follow-truck-button"]')).toContainText('Folge ich');
    await expect(page.locator('[data-testid="follow-truck-button"]')).toHaveAttribute('data-following', 'true');
  });
});
