/**
 * EATECH - Complete App with Sidebar and All Routes (Fixed)
 * File Path: /apps/admin/src/App.jsx
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ThemeSwitcher, { ThemeProvider } from './components/theme-system/ThemeSystem';
import Sidebar from './components/layout/Sidebar';
import './styles/globals.css';

// Existing pages - lazy load
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Products = lazy(() => import('./pages/Products/Products'));

// Loading Component
const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '60px',
        height: '60px',
        margin: '0 auto 20px',
        border: '3px solid var(--border-color)',
        borderTopColor: 'var(--primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <h2>Wird geladen...</h2>
    </div>
  </div>
);

// Placeholder Component for pages not yet created
const PlaceholderPage = ({ title, emoji, description }) => (
  <div style={{
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    padding: '2rem'
  }}>
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      textAlign: 'center',
      paddingTop: '4rem'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{emoji}</div>
      <h1 style={{
        fontSize: '2.5rem',
        marginBottom: '1rem',
        background: 'var(--gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        {title}
      </h1>
      <p style={{
        fontSize: '1.25rem',
        color: 'var(--text-secondary)',
        marginBottom: '2rem'
      }}>
        {description}
      </p>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '2rem'
      }}>
        <p style={{ color: 'var(--text-tertiary)' }}>
          Diese Seite wird bald verfügbar sein...
        </p>
      </div>
    </div>
  </div>
);

// Create placeholder components for all routes that don't exist yet
const createPlaceholder = (title, emoji, description) => {
  return () => <PlaceholderPage title={title} emoji={emoji} description={description} />;
};

// Define all placeholder components
const OrdersActive = createPlaceholder('Aktive Bestellungen', '📋', 'Verwalte alle aktuellen Bestellungen in Echtzeit');
const OrdersHistory = createPlaceholder('Bestellverlauf', '📚', 'Durchsuche und analysiere vergangene Bestellungen');
const OrdersPOS = createPlaceholder('POS Terminal', '💳', 'Point-of-Sale System für Vor-Ort-Bestellungen');

const KitchenDisplay = createPlaceholder('Kitchen Display', '📺', 'Digitales Küchendisplay-System');
const KitchenQueue = createPlaceholder('Warteschlange', '⏱️', 'Verwalte die Küchenauslastung');
const KitchenRecipes = createPlaceholder('Rezepte', '📖', 'Digitales Rezeptbuch und Anleitungen');

const ProductCategories = createPlaceholder('Kategorien', '🗂️', 'Organisiere Produkte in Kategorien');
const ProductModifiers = createPlaceholder('Extras & Optionen', '➕', 'Verwalte Zusätze und Anpassungen');
const ProductInventory = createPlaceholder('Lagerbestand', '📊', 'Inventarverwaltung in Echtzeit');

const MenuBuilder = createPlaceholder('Menü Builder', '🎨', 'Gestalte dein digitales Menü');
const MenuQR = createPlaceholder('QR-Code Menü', '📱', 'Kontaktloses Menü via QR-Code');
const MenuDaily = createPlaceholder('Tagesmenü', '📅', 'Tägliche Spezialangebote');

const Customers = createPlaceholder('Kundenliste', '📋', 'Verwalte deine Kundendatenbank');
const CustomersLoyalty = createPlaceholder('Treueprogramm', '⭐', 'Belohne deine Stammkunden');
const CustomersReviews = createPlaceholder('Bewertungen', '💬', 'Kundenrezensionen und Feedback');

const MarketingCampaigns = createPlaceholder('Kampagnen', '📢', 'Plane und führe Marketingkampagnen durch');
const MarketingDiscounts = createPlaceholder('Rabatte & Coupons', '🎟️', 'Erstelle Rabattaktionen');
const MarketingNotifications = createPlaceholder('Push Benachrichtigungen', '🔔', 'Sende gezielte Nachrichten');

const DeliveryZones = createPlaceholder('Lieferzonen', '🗺️', 'Definiere Liefergebiete und Preise');
const DeliveryDrivers = createPlaceholder('Fahrer-Management', '🚗', 'Verwalte deine Lieferfahrer');
const DeliveryTracking = createPlaceholder('Live Tracking', '📍', 'Verfolge Lieferungen in Echtzeit');

const AnalyticsSales = createPlaceholder('Umsatzanalyse', '💰', 'Detaillierte Umsatzberichte');
const AnalyticsProducts = createPlaceholder('Produktanalyse', '📈', 'Beliebte Produkte und Trends');
const AnalyticsCustomers = createPlaceholder('Kundenanalyse', '👤', 'Kundenverhalten verstehen');
const AnalyticsAI = createPlaceholder('AI Insights', '🤖', 'KI-gestützte Geschäftseinblicke');

const FinanceReports = createPlaceholder('Finanzberichte', '📊', 'Umfassende Finanzübersichten');
const FinancePayments = createPlaceholder('Zahlungen', '💳', 'Zahlungsverwaltung und Abrechnung');
const FinanceTaxes = createPlaceholder('Steuern', '🧾', 'Steuerberichte und MwSt-Verwaltung');

const SettingsGeneral = createPlaceholder('Allgemeine Einstellungen', '🔧', 'Grundlegende Systemeinstellungen');
const SettingsHours = createPlaceholder('Öffnungszeiten', '🕐', 'Geschäftszeiten verwalten');
const SettingsPayments = createPlaceholder('Zahlungsmethoden', '💳', 'Akzeptierte Zahlungsarten');
const SettingsIntegrations = createPlaceholder('Integrationen', '🔌', 'Externe Services verbinden');
const SettingsTeam = createPlaceholder('Team & Berechtigungen', '👨‍💼', 'Mitarbeiter und Rollen verwalten');
const SettingsTheme = createPlaceholder('Design & Themes', '🎨', 'Anpassung des Erscheinungsbilds');

// Main App Component
function App() {
  return (
    <ThemeProvider>
      <Router>
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content Area */}
          <main style={{
            flex: 1,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'auto'
          }}>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                {/* Dashboard */}
                <Route path="/" element={<Dashboard />} />
                
                {/* Orders */}
                <Route path="/orders/active" element={<OrdersActive />} />
                <Route path="/orders/history" element={<OrdersHistory />} />
                <Route path="/orders/pos" element={<OrdersPOS />} />
                
                {/* Kitchen */}
                <Route path="/kitchen/display" element={<KitchenDisplay />} />
                <Route path="/kitchen/queue" element={<KitchenQueue />} />
                <Route path="/kitchen/recipes" element={<KitchenRecipes />} />
                
                {/* Products */}
                <Route path="/products" element={<Products />} />
                <Route path="/products/categories" element={<ProductCategories />} />
                <Route path="/products/modifiers" element={<ProductModifiers />} />
                <Route path="/products/inventory" element={<ProductInventory />} />
                
                {/* Menu */}
                <Route path="/menu/builder" element={<MenuBuilder />} />
                <Route path="/menu/qr" element={<MenuQR />} />
                <Route path="/menu/daily" element={<MenuDaily />} />
                
                {/* Customers */}
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/loyalty" element={<CustomersLoyalty />} />
                <Route path="/customers/reviews" element={<CustomersReviews />} />
                
                {/* Marketing */}
                <Route path="/marketing/campaigns" element={<MarketingCampaigns />} />
                <Route path="/marketing/discounts" element={<MarketingDiscounts />} />
                <Route path="/marketing/notifications" element={<MarketingNotifications />} />
                
                {/* Delivery */}
                <Route path="/delivery/zones" element={<DeliveryZones />} />
                <Route path="/delivery/drivers" element={<DeliveryDrivers />} />
                <Route path="/delivery/tracking" element={<DeliveryTracking />} />
                
                {/* Analytics */}
                <Route path="/analytics/sales" element={<AnalyticsSales />} />
                <Route path="/analytics/products" element={<AnalyticsProducts />} />
                <Route path="/analytics/customers" element={<AnalyticsCustomers />} />
                <Route path="/analytics/ai" element={<AnalyticsAI />} />
                
                {/* Finance */}
                <Route path="/finance/reports" element={<FinanceReports />} />
                <Route path="/finance/payments" element={<FinancePayments />} />
                <Route path="/finance/taxes" element={<FinanceTaxes />} />
                
                {/* Settings */}
                <Route path="/settings/general" element={<SettingsGeneral />} />
                <Route path="/settings/hours" element={<SettingsHours />} />
                <Route path="/settings/payments" element={<SettingsPayments />} />
                <Route path="/settings/integrations" element={<SettingsIntegrations />} />
                <Route path="/settings/team" element={<SettingsTeam />} />
                <Route path="/settings/theme" element={<SettingsTheme />} />
                
                {/* Catch all - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

// Add spin animation to global styles
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);