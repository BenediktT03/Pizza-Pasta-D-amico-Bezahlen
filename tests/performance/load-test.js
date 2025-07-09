/**
 * EATECH Load Test
 * 
 * Testet die normale Last des Systems mit realistischen Szenarien:
 * - 100-200 gleichzeitige Food Trucks
 * - Rush Hour Simulation (12-13 Uhr)
 * - Verschiedene Benutzeraktionen (Bestellungen, Menü-Abrufe, etc.)
 * 
 * Verwendet K6 für Load Testing
 * Installation: https://k6.io/docs/getting-started/installation/
 * Ausführung: k6 run tests/performance/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom Metrics
const orderSuccess = new Rate('order_success_rate');
const orderDuration = new Trend('order_duration');
const menuLoadTime = new Trend('menu_load_time');
const paymentProcessTime = new Trend('payment_process_time');

// Test Configuration
export const options = {
  // Simuliert einen typischen Tag mit Rush Hour
  stages: [
    { duration: '2m', target: 50 },   // Morgens: Langsamer Start
    { duration: '3m', target: 100 },  // Vormittags: Normale Last
    { duration: '5m', target: 200 },  // Rush Hour: Maximale Last
    { duration: '3m', target: 150 },  // Nachmittags: Absteigende Last
    { duration: '2m', target: 50 },   // Abends: Weniger Aktivität
    { duration: '1m', target: 0 },    // Feierabend
  ],
  
  // Performance Thresholds (basierend auf Requirements)
  thresholds: {
    http_req_duration: ['p(95)<500'],      // 95% aller Requests unter 500ms
    http_req_failed: ['rate<0.02'],        // Fehlerrate unter 2%
    order_success_rate: ['rate>0.98'],     // 98% erfolgreiche Bestellungen
    order_duration: ['p(95)<3000'],        // 95% der Bestellungen unter 3s
    menu_load_time: ['p(95)<300'],         // Menü lädt in unter 300ms
    payment_process_time: ['p(95)<2000'],  // Payment in unter 2s
  },
  
  // Simuliert verschiedene Regionen der Schweiz
  ext: {
    loadimpact: {
      distribution: {
        'amazon:ch:zurich': { loadZone: 'amazon:ch:zurich', percent: 40 },
        'amazon:ch:geneva': { loadZone: 'amazon:ch:geneva', percent: 30 },
        'amazon:ch:basel': { loadZone: 'amazon:ch:basel', percent: 20 },
        'amazon:ch:bern': { loadZone: 'amazon:ch:bern', percent: 10 },
      },
    },
  },
};

// Test Data
const API_BASE = __ENV.API_URL || 'https://api.eatech.ch';
const TRUCK_IDS = generateTruckIds(20); // 20 verschiedene Food Trucks
const PRODUCTS = [
  { id: 'burger', name: 'Classic Burger', price: 1590 },
  { id: 'cheeseburger', name: 'Cheeseburger', price: 1790 },
  { id: 'fries', name: 'Pommes Frites', price: 650 },
  { id: 'salad', name: 'Gemischter Salat', price: 890 },
  { id: 'cola', name: 'Cola', price: 450 },
  { id: 'water', name: 'Mineralwasser', price: 350 },
];
const LANGUAGES = ['de', 'fr', 'it', 'en'];
const PAYMENT_METHODS = ['card', 'twint', 'apple_pay', 'google_pay'];

// Helper Functions
function generateTruckIds(count) {
  const trucks = [];
  for (let i = 1; i <= count; i++) {
    trucks.push(`truck-${i.toString().padStart(3, '0')}`);
  }
  return trucks;
}

function generateSwissPhoneNumber() {
  const prefixes = ['76', '77', '78', '79'];
  const prefix = randomItem(prefixes);
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+417${prefix}${number}`;
}

function generateOrderItems() {
  const itemCount = Math.floor(Math.random() * 4) + 1; // 1-4 Items
  const items = [];
  
  for (let i = 0; i < itemCount; i++) {
    const product = randomItem(PRODUCTS);
    items.push({
      productId: product.id,
      quantity: Math.floor(Math.random() * 3) + 1, // 1-3 Stück
      modifiers: Math.random() > 0.7 ? ['ohne Zwiebeln'] : [],
      specialInstructions: Math.random() > 0.9 ? 'Extra scharf bitte' : ''
    });
  }
  
  return items;
}

// Main Test Scenario
export default function() {
  const truckId = randomItem(TRUCK_IDS);
  const language = randomItem(LANGUAGES);
  
  // Scenario 1: Kunde durchsucht Menü (60% der Nutzer)
  if (Math.random() < 0.6) {
    group('Browse Menu Flow', () => {
      // 1. Load truck page
      const menuStart = new Date();
      const menuRes = http.get(`${API_BASE}/trucks/${truckId}/menu?lang=${language}`, {
        headers: { 'Accept-Language': language }
      });
      menuLoadTime.add(new Date() - menuStart);
      
      check(menuRes, {
        'menu loaded successfully': (r) => r.status === 200,
        'menu has products': (r) => JSON.parse(r.body).products.length > 0,
      });
      
      sleep(randomItem([2, 3, 4, 5])); // User browses menu
      
      // 2. View product details (70% chance)
      if (Math.random() < 0.7) {
        const product = randomItem(PRODUCTS);
        const detailRes = http.get(`${API_BASE}/trucks/${truckId}/products/${product.id}?lang=${language}`);
        
        check(detailRes, {
          'product details loaded': (r) => r.status === 200,
          'allergen info present': (r) => JSON.parse(r.body).allergens !== undefined,
        });
        
        sleep(randomItem([1, 2])); // User reads details
      }
    });
  }
  
  // Scenario 2: Kunde bestellt (40% der Nutzer)
  if (Math.random() < 0.4) {
    group('Order Flow', () => {
      const orderStart = new Date();
      
      // 1. Create order
      const orderData = {
        truckId: truckId,
        items: generateOrderItems(),
        customerName: `Test User ${__VU}`,
        customerPhone: generateSwissPhoneNumber(),
        language: language,
        orderType: 'takeaway', // 2.5% MwSt
      };
      
      const orderRes = http.post(
        `${API_BASE}/orders`,
        JSON.stringify(orderData),
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept-Language': language
          }
        }
      );
      
      const orderSuccessful = check(orderRes, {
        'order created': (r) => r.status === 201,
        'order number assigned': (r) => {
          const body = JSON.parse(r.body);
          return body.orderNumber >= 100;
        },
        'platform fee calculated': (r) => {
          const body = JSON.parse(r.body);
          return body.platformFee >= 0; // 0 during trial, 3% after
        }
      });
      
      orderSuccess.add(orderSuccessful);
      
      if (orderSuccessful) {
        const order = JSON.parse(orderRes.body);
        
        // 2. Process payment
        sleep(1); // User enters payment details
        
        const paymentStart = new Date();
        const paymentMethod = randomItem(PAYMENT_METHODS);
        
        const paymentRes = http.post(
          `${API_BASE}/orders/${order.id}/payment`,
          JSON.stringify({
            paymentMethodId: `pm_test_${paymentMethod}`,
            amount: order.totalAmount,
            tip: Math.random() > 0.3 ? Math.floor(Math.random() * 500) + 100 : 0 // 30% add tip
          }),
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        paymentProcessTime.add(new Date() - paymentStart);
        
        check(paymentRes, {
          'payment successful': (r) => r.status === 200,
          'payment confirmed': (r) => JSON.parse(r.body).status === 'succeeded'
        });
      }
      
      orderDuration.add(new Date() - orderStart);
    });
  }
  
  // Scenario 3: Voice Order (5% der Nutzer)
  if (Math.random() < 0.05) {
    group('Voice Order Flow', () => {
      // Simulate audio file upload
      const audioData = new ArrayBuffer(1024 * 50); // 50KB fake audio
      
      const voiceRes = http.post(
        `${API_BASE}/trucks/${truckId}/orders/voice`,
        audioData,
        {
          headers: {
            'Content-Type': 'audio/webm',
            'Accept-Language': language === 'de' ? 'de-CH' : language // Swiss German
          }
        }
      );
      
      check(voiceRes, {
        'voice order processed': (r) => r.status === 200,
        'transcription successful': (r) => JSON.parse(r.body).transcription !== undefined,
        'confidence above 80%': (r) => JSON.parse(r.body).confidence > 0.8
      });
    });
  }
  
  // Scenario 4: Kitchen Display Update (Truck Owner, 10%)
  if (Math.random() < 0.1) {
    group('Kitchen Operations', () => {
      // Get active orders
      const ordersRes = http.get(`${API_BASE}/trucks/${truckId}/orders/active`, {
        headers: { 'Authorization': `Bearer ${generateMockToken('truck_owner')}` }
      });
      
      check(ordersRes, {
        'active orders loaded': (r) => r.status === 200
      });
      
      const orders = JSON.parse(ordersRes.body).orders || [];
      
      if (orders.length > 0) {
        // Mark order as ready
        const order = randomItem(orders);
        const updateRes = http.patch(
          `${API_BASE}/orders/${order.id}/status`,
          JSON.stringify({ status: 'ready' }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${generateMockToken('truck_owner')}`
            }
          }
        );
        
        check(updateRes, {
          'order status updated': (r) => r.status === 200,
          'notification sent': (r) => JSON.parse(r.body).notificationSent === true
        });
      }
    });
  }
  
  // Scenario 5: Analytics Check (Manager/Admin, 2%)
  if (Math.random() < 0.02) {
    group('Analytics Dashboard', () => {
      const statsRes = http.get(`${API_BASE}/trucks/${truckId}/analytics/today`, {
        headers: { 'Authorization': `Bearer ${generateMockToken('manager')}` }
      });
      
      check(statsRes, {
        'analytics loaded': (r) => r.status === 200,
        'has revenue data': (r) => JSON.parse(r.body).revenue !== undefined,
        'has order count': (r) => JSON.parse(r.body).orderCount !== undefined
      });
    });
  }
  
  // Realistic think time between actions
  sleep(randomItem([1, 2, 3, 5, 8]));
}

// Helper function to generate mock JWT tokens
function generateMockToken(role) {
  // In real tests, these would be valid JWTs
  return `mock_${role}_token_${__VU}`;
}

// Setup function - runs once per VU
export function setup() {
  // Verify API is reachable
  const res = http.get(`${API_BASE}/health`);
  if (res.status !== 200) {
    throw new Error(`API health check failed: ${res.status}`);
  }
  
  return {
    startTime: new Date(),
    apiVersion: JSON.parse(res.body).version
  };
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log(`Test completed. Duration: ${new Date() - data.startTime}ms`);
  console.log(`API Version tested: ${data.apiVersion}`);
}

// Custom summary for better reporting
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlReport(data),
  };
}

// Helper to generate HTML report
function htmlReport(data) {
  // Simple HTML report generator
  return `
    <html>
      <head>
        <title>EATECH Load Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .metric { margin: 10px 0; padding: 10px; background: #f0f0f0; }
          .pass { color: green; }
          .fail { color: red; }
        </style>
      </head>
      <body>
        <h1>EATECH Load Test Results</h1>
        <div class="metric">
          <h3>Order Success Rate</h3>
          <p class="${data.metrics.order_success_rate > 0.98 ? 'pass' : 'fail'}">
            ${(data.metrics.order_success_rate * 100).toFixed(2)}%
          </p>
        </div>
        <div class="metric">
          <h3>Average Response Time</h3>
          <p>${data.metrics.http_req_duration.avg.toFixed(2)}ms</p>
        </div>
        <div class="metric">
          <h3>Errors</h3>
          <p class="${data.metrics.http_req_failed < 0.02 ? 'pass' : 'fail'}">
            ${(data.metrics.http_req_failed * 100).toFixed(2)}%
          </p>
        </div>
      </body>
    </html>
  `;
}
