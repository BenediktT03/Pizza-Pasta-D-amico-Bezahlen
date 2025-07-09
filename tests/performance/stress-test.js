/**
 * EATECH Stress Test
 * 
 * Testet die Grenzen des Systems mit extremen Lastszenarien:
 * - Bis zu 1000 gleichzeitige Nutzer (simuliert grosses Festival)
 * - Spike-Tests für plötzliche Lastspitzen
 * - Dauerlast-Tests für Stabilität
 * - Recovery-Tests nach Überlastung
 * 
 * WARNUNG: Dieser Test kann das System überlasten!
 * Nur in Staging-Umgebung ausführen!
 * 
 * Ausführung: k6 run tests/performance/stress-test.js --env STRESS_LEVEL=high
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom Metrics für Stress-Monitoring
const systemErrors = new Counter('system_errors');
const timeouts = new Counter('request_timeouts');
const serverErrors = new Counter('server_errors_5xx');
const recoveryTime = new Trend('system_recovery_time');
const concurrentOrders = new Counter('concurrent_orders');
const dbConnectionErrors = new Counter('db_connection_errors');

// Stress Level Configuration
const STRESS_LEVEL = __ENV.STRESS_LEVEL || 'medium';
const STRESS_CONFIGS = {
  low: {
    maxVUs: 300,
    spikeTo: 400,
    sustainedLoad: 250,
    testDuration: '10m'
  },
  medium: {
    maxVUs: 600,
    spikeTo: 800,
    sustainedLoad: 500,
    testDuration: '20m'
  },
  high: {
    maxVUs: 1000,
    spikeTo: 1500,
    sustainedLoad: 800,
    testDuration: '30m'
  },
  extreme: {
    maxVUs: 2000,
    spikeTo: 3000,
    sustainedLoad: 1500,
    testDuration: '45m'
  }
};

const config = STRESS_CONFIGS[STRESS_LEVEL];

// Test Scenarios
export const options = {
  scenarios: {
    // Scenario 1: Gradual Ramp-up Test
    gradual_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: config.maxVUs * 0.25 },  // 25% Last
        { duration: '3m', target: config.maxVUs * 0.5 },   // 50% Last
        { duration: '3m', target: config.maxVUs * 0.75 },  // 75% Last
        { duration: '5m', target: config.maxVUs },         // 100% Last
        { duration: '3m', target: config.maxVUs },         // Sustained
        { duration: '2m', target: 0 },                     // Ramp-down
      ],
      gracefulRampDown: '30s',
    },
    
    // Scenario 2: Spike Test (Festival-Start Simulation)
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '30s', target: 50 },                   // Baseline
        { duration: '30s', target: config.spikeTo },       // Massive spike!
        { duration: '1m', target: config.spikeTo },        // Hold spike
        { duration: '2m', target: 100 },                   // Recovery
      ],
      startTime: '5m', // Start after gradual test
    },
    
    // Scenario 3: Sustained High Load (Lunch Rush Simulation)
    sustained_load: {
      executor: 'constant-vus',
      vus: config.sustainedLoad,
      duration: '10m',
      startTime: '12m', // Start after spike test
    },
    
    // Scenario 4: Chaos Test (Random Load Patterns)
    chaos_test: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: generateChaosStages(),
      startTime: '23m',
    },
    
    // Scenario 5: Recovery Test
    recovery_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: config.maxVUs * 1.5 },   // Overload
        { duration: '2m', target: config.maxVUs * 1.5 },   // Maintain overload
        { duration: '30s', target: 50 },                   // Sudden drop
        { duration: '2m', target: 200 },                   // Normal load
      ],
      startTime: '28m',
    },
  },
  
  // Stress Test Thresholds (mehr tolerant als Load Test)
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],     // Erlaubt längere Response Times
    http_req_failed: ['rate<0.1'],                       // Bis zu 10% Fehler toleriert
    system_errors: ['count<100'],                         // Max 100 System-Fehler
    timeouts: ['count<50'],                               // Max 50 Timeouts
    server_errors_5xx: ['count<20'],                      // Max 20 Server-Fehler
  },
  
  // Erweiterte HTTP Einstellungen für Stress
  httpDebug: 'full',
  noConnectionReuse: false,
  userAgent: 'EATECH-StressTest/1.0',
  
  // Batch Konfiguration für realistische Last
  batch: 10,
  batchPerHost: 5,
};

// Test Data
const API_BASE = __ENV.API_URL || 'https://api-staging.eatech.ch';
const FESTIVAL_TRUCKS = generateTruckIds(50); // 50 Trucks auf einem Festival

// Chaos Stage Generator
function generateChaosStages() {
  const stages = [];
  for (let i = 0; i < 10; i++) {
    stages.push({
      duration: `${randomIntBetween(10, 60)}s`,
      target: randomIntBetween(50, config.maxVUs)
    });
  }
  return stages;
}

// Generate Festival Truck IDs
function generateTruckIds(count) {
  const trucks = [];
  for (let i = 1; i <= count; i++) {
    trucks.push(`festival-truck-${i}`);
  }
  return trucks;
}

// Heavy Order Generator (für Stress)
function generateHeavyOrder() {
  const items = [];
  const itemCount = randomIntBetween(5, 15); // Viele Items!
  
  for (let i = 0; i < itemCount; i++) {
    items.push({
      productId: `product-${randomIntBetween(1, 20)}`,
      quantity: randomIntBetween(1, 5),
      modifiers: Array(randomIntBetween(0, 5)).fill('Extra'),
      specialInstructions: 'A'.repeat(randomIntBetween(0, 200)) // Lange Texte
    });
  }
  
  return items;
}

// Main Stress Test Function
export default function() {
  const scenario = __ENV.SCENARIO_NAME || 'general';
  const truckId = randomItem(FESTIVAL_TRUCKS);
  
  // Aggressive Request Pattern
  const requests = [];
  
  // Batch Request 1: Multiple Menu Loads
  group('Concurrent Menu Loads', () => {
    for (let i = 0; i < 3; i++) {
      requests.push([
        'GET',
        `${API_BASE}/trucks/${truckId}/menu?lang=${randomItem(['de', 'fr', 'it', 'en'])}`,
        null,
        { tags: { name: 'menu_load' } }
      ]);
    }
  });
  
  // Batch Request 2: Heavy Orders
  group('Heavy Order Creation', () => {
    const orderData = {
      truckId: truckId,
      items: generateHeavyOrder(),
      customerName: `Stress Test ${__VU}-${__ITER}`,
      customerPhone: `+4179${randomIntBetween(1000000, 9999999)}`,
      rushOrder: true, // Priorität für Stress
    };
    
    requests.push([
      'POST',
      `${API_BASE}/orders`,
      JSON.stringify(orderData),
      { 
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'create_order' },
        timeout: '10s' // Timeout für Stress-Erkennung
      }
    ]);
  });
  
  // Execute Batch Requests
  const responses = http.batch(requests);
  
  // Check for stress indicators
  responses.forEach(res => {
    // Timeout Detection
    if (res.timings.duration > 10000) {
      timeouts.add(1);
    }
    
    // Server Error Detection
    if (res.status >= 500) {
      serverErrors.add(1);
      console.error(`Server Error: ${res.status} - ${res.url}`);
    }
    
    // Database Connection Errors
    if (res.body && res.body.includes('database connection')) {
      dbConnectionErrors.add(1);
    }
    
    // General System Errors
    if (res.status === 0 || res.error) {
      systemErrors.add(1);
    }
  });
  
  // Concurrent Order Simulation
  if (scenario === 'sustained_load') {
    group('Concurrent Order Processing', () => {
      concurrentOrders.add(1);
      
      // Simulate payment processing under stress
      const paymentRes = http.post(
        `${API_BASE}/payments/process`,
        JSON.stringify({
          amount: randomIntBetween(1000, 10000),
          method: randomItem(['card', 'twint']),
          truckId: truckId
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: '5s'
        }
      );
      
      check(paymentRes, {
        'payment under stress': (r) => r.status === 200 || r.status === 202, // Akzeptiert auch Queued
      });
    });
  }
  
  // Database Stress Test
  if (Math.random() < 0.2) { // 20% chance
    group('Database Stress', () => {
      // Complex query simulation
      const analyticsRes = http.get(
        `${API_BASE}/analytics/complex?` +
        `trucks=${FESTIVAL_TRUCKS.slice(0, 10).join(',')}` +
        `&dateFrom=2024-01-01&dateTo=2024-12-31` +
        `&groupBy=hour&includeDetails=true`,
        { timeout: '15s' }
      );
      
      if (analyticsRes.status !== 200) {
        console.warn('Analytics query failed under stress');
      }
    });
  }
  
  // Voice Order Stress (resource intensive)
  if (Math.random() < 0.05) { // 5% chance
    group('Voice Processing Stress', () => {
      const largeAudio = new ArrayBuffer(1024 * 1024); // 1MB audio file
      
      const voiceRes = http.post(
        `${API_BASE}/voice/process`,
        largeAudio,
        {
          headers: { 'Content-Type': 'audio/webm' },
          timeout: '30s' // Longer timeout for voice
        }
      );
      
      if (voiceRes.status === 503) {
        console.log('Voice service at capacity - expected under stress');
      }
    });
  }
  
  // Minimal sleep to maximize stress
  sleep(Math.random() * 0.5); // 0-500ms
}

// Recovery Monitoring
export function handleSummary(data) {
  // Calculate recovery metrics
  const stressMetrics = {
    totalErrors: data.metrics.system_errors?.values?.count || 0,
    timeouts: data.metrics.timeouts?.values?.count || 0,
    serverErrors: data.metrics.server_errors_5xx?.values?.count || 0,
    dbErrors: data.metrics.db_connection_errors?.values?.count || 0,
    
    // Performance degradation
    avgResponseTime: data.metrics.http_req_duration?.values?.avg || 0,
    p95ResponseTime: data.metrics.http_req_duration?.values['p(95)'] || 0,
    p99ResponseTime: data.metrics.http_req_duration?.values['p(99)'] || 0,
    
    // Success rates
    successRate: 1 - (data.metrics.http_req_failed?.values?.rate || 0),
    
    // Stress level reached
    maxVUs: data.metrics.vus_max?.values?.value || 0,
    totalRequests: data.metrics.http_reqs?.values?.count || 0,
  };
  
  // Generate stress report
  const stressReport = generateStressReport(stressMetrics);
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'stress-report.json': JSON.stringify(stressMetrics, null, 2),
    'stress-report.html': stressReport,
    'raw-data.json': JSON.stringify(data),
  };
}

function generateStressReport(metrics) {
  const status = getSystemStatus(metrics);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>EATECH Stress Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .status { font-size: 24px; padding: 20px; text-align: center; border-radius: 8px; }
          .status.healthy { background: #4ade80; color: white; }
          .status.degraded { background: #fb923c; color: white; }
          .status.critical { background: #f87171; color: white; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
          .metric-card { border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; }
          .metric-value { font-size: 36px; font-weight: bold; margin: 10px 0; }
          .metric-label { color: #6b7280; }
          .chart { margin-top: 40px; }
          .recommendations { margin-top: 40px; padding: 20px; background: #f3f4f6; border-radius: 8px; }
          .recommendation { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #3b82f6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>EATECH Stress Test Report</h1>
            <p>Stress Level: ${STRESS_LEVEL.toUpperCase()} | Max VUs: ${metrics.maxVUs}</p>
          </div>
          
          <div class="status ${status.level}">
            System Status: ${status.message}
          </div>
          
          <h2>Key Metrics</h2>
          <div class="metrics">
            <div class="metric-card">
              <div class="metric-label">Total Errors</div>
              <div class="metric-value">${metrics.totalErrors}</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Success Rate</div>
              <div class="metric-value">${(metrics.successRate * 100).toFixed(2)}%</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Avg Response Time</div>
              <div class="metric-value">${metrics.avgResponseTime.toFixed(0)}ms</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">P95 Response Time</div>
              <div class="metric-value">${metrics.p95ResponseTime.toFixed(0)}ms</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Timeouts</div>
              <div class="metric-value">${metrics.timeouts}</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Server Errors (5xx)</div>
              <div class="metric-value">${metrics.serverErrors}</div>
            </div>
          </div>
          
          <div class="recommendations">
            <h2>Recommendations</h2>
            ${generateRecommendations(metrics).map(rec => `
              <div class="recommendation">
                <strong>${rec.title}:</strong> ${rec.description}
              </div>
            `).join('')}
          </div>
        </div>
      </body>
    </html>
  `;
}

function getSystemStatus(metrics) {
  if (metrics.totalErrors > 100 || metrics.successRate < 0.8) {
    return { level: 'critical', message: 'CRITICAL - System showing signs of failure' };
  } else if (metrics.totalErrors > 50 || metrics.successRate < 0.9) {
    return { level: 'degraded', message: 'DEGRADED - System under stress but operational' };
  } else {
    return { level: 'healthy', message: 'HEALTHY - System handling stress well' };
  }
}

function generateRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.avgResponseTime > 1000) {
    recommendations.push({
      title: 'Response Time Optimization',
      description: 'Consider implementing caching, database query optimization, or horizontal scaling.'
    });
  }
  
  if (metrics.timeouts > 10) {
    recommendations.push({
      title: 'Timeout Configuration',
      description: 'Increase timeout thresholds or implement circuit breakers for failing services.'
    });
  }
  
  if (metrics.dbErrors > 0) {
    recommendations.push({
      title: 'Database Scaling',
      description: 'Database connection pool may be exhausted. Consider increasing pool size or adding read replicas.'
    });
  }
  
  if (metrics.serverErrors > 5) {
    recommendations.push({
      title: 'Server Stability',
      description: 'Server errors indicate application crashes. Review error logs and implement better error handling.'
    });
  }
  
  if (metrics.maxVUs > 500 && metrics.successRate < 0.95) {
    recommendations.push({
      title: 'Infrastructure Scaling',
      description: 'System struggles with high load. Consider auto-scaling policies or larger instance types.'
    });
  }
  
  return recommendations;
}

// Stress Test Setup
export function setup() {
  console.log(`Starting EATECH Stress Test - Level: ${STRESS_LEVEL}`);
  console.log(`Configuration:`, JSON.stringify(config, null, 2));
  
  // Warm up the system
  const warmupRes = http.get(`${API_BASE}/health`);
  if (warmupRes.status !== 200) {
    throw new Error('System health check failed before stress test');
  }
  
  return {
    startTime: new Date(),
    config: config
  };
}

// Cleanup after stress test
export function teardown(data) {
  console.log('Stress test completed');
  console.log(`Duration: ${(new Date() - data.startTime) / 1000}s`);
  
  // Give system time to recover
  console.log('Monitoring system recovery...');
  
  // Check system health after stress
  const healthRes = http.get(`${API_BASE}/health`);
  if (healthRes.status === 200) {
    console.log('System recovered successfully');
  } else {
    console.log('System still recovering from stress');
  }
}
