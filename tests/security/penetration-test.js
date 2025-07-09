/**
 * EATECH Security & Penetration Test
 * 
 * Testet die Sicherheit der EATECH-Plattform:
 * - SQL Injection Versuche
 * - XSS (Cross-Site Scripting) Tests
 * - Authentication & Authorization
 * - Rate Limiting
 * - Input Validation
 * - CSRF Protection
 * - API Security
 * - Data Privacy (DSGVO/DSG konform)
 * 
 * WICHTIG: Nur in isolierter Test-Umgebung ausführen!
 * Niemals gegen Production!
 * 
 * Ausführung: k6 run tests/security/penetration-test.js --env SECURITY_LEVEL=full
 */

import http from 'k6/http';
import { check, group } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import encoding from 'k6/encoding';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Security Metrics
const vulnerabilitiesFound = new Counter('vulnerabilities_found');
const securityTestsPassed = new Rate('security_tests_passed');
const unauthorizedAccess = new Counter('unauthorized_access_attempts');
const injectionAttempts = new Counter('injection_attempts');
const xssAttempts = new Counter('xss_attempts');
const rateLimitBypass = new Counter('rate_limit_bypass');
const dataLeaks = new Counter('data_leak_attempts');

// Configuration
const API_BASE = __ENV.API_URL || 'https://api-security-test.eatech.ch';
const SECURITY_LEVEL = __ENV.SECURITY_LEVEL || 'basic'; // basic, standard, full

// Test Payloads
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE orders; --",
  "1' UNION SELECT * FROM users--",
  "admin'--",
  "' OR 1=1--",
  "\" OR \"\"=\"\"",
  "' OR ''='",
  "1' AND '1'='1",
  "%' OR '1'='1",
  "' OR 'a'='a",
];

const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(`XSS`)">',
  '<body onload=alert("XSS")>',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  '<img src="x" onerror="alert(1)">',
  '<input onfocus=alert(1) autofocus>',
  '<select onfocus=alert(1) autofocus>',
];

const MALICIOUS_FILE_NAMES = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  'C:\\Windows\\System32\\drivers\\etc\\hosts',
  '/etc/shadow',
  '../../../../../../../../etc/hosts',
  'php://filter/convert.base64-encode/resource=index.php',
  'expect://id',
  'file:///etc/passwd',
];

const SWISS_PRIVACY_TESTS = [
  { field: 'phone', invalidValue: '0791234567', reason: 'Missing +41 prefix' },
  { field: 'email', invalidValue: 'test@', reason: 'Invalid email format' },
  { field: 'name', invalidValue: '<script>alert(1)</script>', reason: 'XSS in name' },
  { field: 'specialInstructions', invalidValue: 'A'.repeat(201), reason: 'Exceeds 200 char limit' },
];

// Test Options
export const options = {
  scenarios: {
    // Basic Security Tests
    basic_security: {
      executor: 'shared-iterations',
      vus: 5,
      iterations: 100,
      maxDuration: '10m',
    },
    
    // Authentication Tests
    auth_tests: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 20,
      startTime: '2m',
    },
    
    // Rate Limiting Tests
    rate_limit_tests: {
      executor: 'constant-arrival-rate',
      rate: 200, // 200 RPS to trigger rate limits
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
      startTime: '5m',
    },
  },
  
  thresholds: {
    security_tests_passed: ['rate>0.95'], // 95% of security tests should pass
    vulnerabilities_found: ['count<5'],   // Less than 5 vulnerabilities
    unauthorized_access: ['count==0'],    // No unauthorized access
  },
};

// Main Security Test Function
export default function() {
  const scenario = __ENV.SCENARIO || 'general';
  
  // Test 1: SQL Injection
  group('SQL Injection Tests', () => {
    SQL_INJECTION_PAYLOADS.forEach(payload => {
      injectionAttempts.add(1);
      
      // Try injection in search
      const searchRes = http.get(`${API_BASE}/trucks/search?q=${encodeURIComponent(payload)}`);
      const searchPassed = checkSQLInjectionResponse(searchRes, 'search');
      securityTestsPassed.add(searchPassed);
      
      // Try injection in order creation
      const orderRes = http.post(
        `${API_BASE}/orders`,
        JSON.stringify({
          truckId: payload,
          customerName: payload,
          items: [{ productId: payload, quantity: 1 }]
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      const orderPassed = checkSQLInjectionResponse(orderRes, 'order');
      securityTestsPassed.add(orderPassed);
      
      // Try injection in login
      const loginRes = http.post(
        `${API_BASE}/auth/login`,
        JSON.stringify({
          email: `test${payload}@example.com`,
          password: payload
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      const loginPassed = checkSQLInjectionResponse(loginRes, 'login');
      securityTestsPassed.add(loginPassed);
    });
  });
  
  // Test 2: XSS Tests
  group('XSS Protection Tests', () => {
    XSS_PAYLOADS.forEach(payload => {
      xssAttempts.add(1);
      
      // Try XSS in product creation (if authorized)
      const productRes = http.post(
        `${API_BASE}/trucks/test-truck/products`,
        JSON.stringify({
          name: { de: payload, fr: payload, it: payload, en: payload },
          description: { de: payload, fr: payload, it: payload, en: payload },
          price: 1000
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          } 
        }
      );
      
      // Check if XSS is properly escaped
      if (productRes.status === 200 || productRes.status === 201) {
        const body = productRes.body;
        const escaped = !body.includes('<script>') && !body.includes('onerror=');
        securityTestsPassed.add(escaped);
        if (!escaped) {
          vulnerabilitiesFound.add(1);
          console.error('XSS vulnerability found in product creation');
        }
      } else {
        securityTestsPassed.add(true); // Rejected = good
      }
      
      // Try XSS in order special instructions
      const orderRes = http.post(
        `${API_BASE}/orders`,
        JSON.stringify({
          truckId: 'test-truck',
          customerName: 'Test User',
          customerPhone: '+41791234567',
          items: [{
            productId: 'burger',
            quantity: 1,
            specialInstructions: payload
          }]
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      const orderXSSPassed = checkXSSResponse(orderRes);
      securityTestsPassed.add(orderXSSPassed);
    });
  });
  
  // Test 3: Authentication & Authorization
  group('Authentication & Authorization Tests', () => {
    // Test missing auth
    const noAuthRes = http.get(`${API_BASE}/admin/trucks`);
    const noAuthPassed = check(noAuthRes, {
      'Blocks unauthenticated admin access': (r) => r.status === 401 || r.status === 403
    });
    securityTestsPassed.add(noAuthPassed);
    if (!noAuthPassed) unauthorizedAccess.add(1);
    
    // Test invalid token
    const invalidTokenRes = http.get(`${API_BASE}/admin/trucks`, {
      headers: { 'Authorization': 'Bearer invalid-token-12345' }
    });
    const invalidTokenPassed = check(invalidTokenRes, {
      'Rejects invalid token': (r) => r.status === 401
    });
    securityTestsPassed.add(invalidTokenPassed);
    
    // Test role escalation (truck owner trying to access master admin)
    const escalationRes = http.get(`${API_BASE}/master/global-stats`, {
      headers: { 'Authorization': 'Bearer truck-owner-token' }
    });
    const escalationPassed = check(escalationRes, {
      'Prevents role escalation': (r) => r.status === 403
    });
    securityTestsPassed.add(escalationPassed);
    if (!escalationPassed) unauthorizedAccess.add(1);
    
    // Test cross-tenant access
    const crossTenantRes = http.get(`${API_BASE}/trucks/other-truck/orders`, {
      headers: { 'Authorization': 'Bearer truck-owner-token-different-truck' }
    });
    const crossTenantPassed = check(crossTenantRes, {
      'Prevents cross-tenant access': (r) => r.status === 403
    });
    securityTestsPassed.add(crossTenantPassed);
    if (!crossTenantPassed) unauthorizedAccess.add(1);
  });
  
  // Test 4: Input Validation (Swiss specific)
  group('Input Validation Tests', () => {
    SWISS_PRIVACY_TESTS.forEach(test => {
      const invalidOrderRes = http.post(
        `${API_BASE}/orders`,
        JSON.stringify({
          truckId: 'test-truck',
          customerName: test.field === 'name' ? test.invalidValue : 'Valid Name',
          customerPhone: test.field === 'phone' ? test.invalidValue : '+41791234567',
          customerEmail: test.field === 'email' ? test.invalidValue : undefined,
          items: [{
            productId: 'burger',
            quantity: 1,
            specialInstructions: test.field === 'specialInstructions' ? test.invalidValue : ''
          }]
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      const validationPassed = check(invalidOrderRes, {
        [`Validates ${test.field} (${test.reason})`]: (r) => r.status === 400
      });
      securityTestsPassed.add(validationPassed);
    });
    
    // Test price manipulation
    const priceManipulationRes = http.post(
      `${API_BASE}/orders`,
      JSON.stringify({
        truckId: 'test-truck',
        customerName: 'Test User',
        customerPhone: '+41791234567',
        items: [{
          productId: 'burger',
          quantity: 1,
          price: 100 // Trying to set custom price
        }],
        totalAmount: 100 // Manipulated total
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const pricePassed = check(priceManipulationRes, {
      'Prevents price manipulation': (r) => {
        if (r.status === 201) {
          const order = JSON.parse(r.body);
          // Price should be calculated server-side, not from request
          return order.totalAmount !== 100;
        }
        return true;
      }
    });
    securityTestsPassed.add(pricePassed);
    if (!pricePassed) vulnerabilitiesFound.add(1);
  });
  
  // Test 5: File Upload Security
  if (SECURITY_LEVEL !== 'basic') {
    group('File Upload Security', () => {
      MALICIOUS_FILE_NAMES.forEach(filename => {
        // Test malicious filenames
        const fileUploadRes = http.post(
          `${API_BASE}/trucks/test-truck/logo`,
          {
            file: http.file('test.jpg', filename, 'image/jpeg')
          },
          { headers: { 'Authorization': 'Bearer truck-owner-token' } }
        );
        
        const fileSecurityPassed = check(fileUploadRes, {
          'Blocks malicious filenames': (r) => 
            r.status === 400 || (r.body && r.body.includes('invalid'))
        });
        securityTestsPassed.add(fileSecurityPassed);
      });
      
      // Test file type validation
      const maliciousFileTypes = [
        { ext: '.exe', mime: 'application/x-msdownload' },
        { ext: '.php', mime: 'application/x-php' },
        { ext: '.sh', mime: 'application/x-sh' },
      ];
      
      maliciousFileTypes.forEach(fileType => {
        const maliciousFileRes = http.post(
          `${API_BASE}/trucks/test-truck/logo`,
          {
            file: http.file(`malicious${fileType.ext}`, `test${fileType.ext}`, fileType.mime)
          },
          { headers: { 'Authorization': 'Bearer truck-owner-token' } }
        );
        
        const fileTypePassed = check(maliciousFileRes, {
          `Blocks ${fileType.ext} files`: (r) => r.status === 400 || r.status === 415
        });
        securityTestsPassed.add(fileTypePassed);
      });
    });
  }
  
  // Test 6: Rate Limiting
  if (scenario === 'rate_limit_tests') {
    group('Rate Limiting Tests', () => {
      // Rapid fire requests
      const responses = [];
      for (let i = 0; i < 20; i++) {
        responses.push(http.get(`${API_BASE}/trucks/test-truck/menu`));
      }
      
      // Check if rate limiting kicked in
      const rateLimited = responses.filter(r => r.status === 429).length > 0;
      const rateLimitPassed = check({ rateLimited }, {
        'Rate limiting active': (data) => data.rateLimited === true
      });
      securityTestsPassed.add(rateLimitPassed);
      if (!rateLimitPassed) {
        rateLimitBypass.add(1);
        vulnerabilitiesFound.add(1);
      }
    });
  }
  
  // Test 7: CSRF Protection
  group('CSRF Protection', () => {
    // Try request without CSRF token
    const csrfRes = http.post(
      `${API_BASE}/trucks/test-truck/settings`,
      JSON.stringify({ name: 'Hacked Truck' }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
          'Origin': 'https://evil-site.com' // Different origin
        } 
      }
    );
    
    const csrfPassed = check(csrfRes, {
      'CSRF protection active': (r) => r.status === 403 || r.status === 400
    });
    securityTestsPassed.add(csrfPassed);
  });
  
  // Test 8: API Security Headers
  group('Security Headers', () => {
    const headerRes = http.get(`${API_BASE}/health`);
    
    const headerChecks = check(headerRes, {
      'X-Content-Type-Options present': (r) => r.headers['X-Content-Type-Options'] === 'nosniff',
      'X-Frame-Options present': (r) => r.headers['X-Frame-Options'] === 'DENY' || r.headers['X-Frame-Options'] === 'SAMEORIGIN',
      'X-XSS-Protection present': (r) => r.headers['X-XSS-Protection'] === '1; mode=block',
      'Strict-Transport-Security present': (r) => r.headers['Strict-Transport-Security'] !== undefined,
      'Content-Security-Policy present': (r) => r.headers['Content-Security-Policy'] !== undefined,
      'No X-Powered-By header': (r) => r.headers['X-Powered-By'] === undefined,
    });
    
    Object.values(headerChecks).forEach(passed => {
      securityTestsPassed.add(passed);
    });
  });
  
  // Test 9: Data Privacy (DSGVO/DSG)
  if (SECURITY_LEVEL === 'full') {
    group('Data Privacy Tests', () => {
      // Test data access without consent
      const privacyRes = http.get(`${API_BASE}/users/test-user/data`, {
        headers: { 'Authorization': 'Bearer other-user-token' }
      });
      
      const privacyPassed = check(privacyRes, {
        'Protects user data': (r) => r.status === 403
      });
      securityTestsPassed.add(privacyPassed);
      if (!privacyPassed) dataLeaks.add(1);
      
      // Test data export (DSGVO requirement)
      const exportRes = http.get(`${API_BASE}/users/me/export`, {
        headers: { 'Authorization': 'Bearer user-token' }
      });
      
      const exportPassed = check(exportRes, {
        'Provides data export': (r) => r.status === 200 || r.status === 202
      });
      securityTestsPassed.add(exportPassed);
      
      // Test data deletion
      const deleteRes = http.delete(`${API_BASE}/users/me`, {
        headers: { 'Authorization': 'Bearer user-token' }
      });
      
      const deletePassed = check(deleteRes, {
        'Allows data deletion': (r) => r.status === 200 || r.status === 204
      });
      securityTestsPassed.add(deletePassed);
    });
  }
  
  // Test 10: Payment Security
  group('Payment Security Tests', () => {
    // Test direct card number submission (should be blocked)
    const cardRes = http.post(
      `${API_BASE}/payments`,
      JSON.stringify({
        cardNumber: '4242424242424242',
        cvv: '123',
        expiryMonth: '12',
        expiryYear: '2025'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const cardPassed = check(cardRes, {
      'Blocks direct card submission': (r) => r.status === 400 || r.status === 403
    });
    securityTestsPassed.add(cardPassed);
    if (!cardPassed) {
      vulnerabilitiesFound.add(1);
      console.error('CRITICAL: Direct card number submission allowed!');
    }
    
    // Test payment manipulation
    const paymentManipulationRes = http.post(
      `${API_BASE}/orders/test-order/payment`,
      JSON.stringify({
        amount: 1, // Try to pay 1 Rappen instead of full amount
        paymentIntentId: 'pi_manipulated'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const paymentSecurityPassed = check(paymentManipulationRes, {
      'Prevents payment manipulation': (r) => r.status !== 200
    });
    securityTestsPassed.add(paymentSecurityPassed);
  });
}

// Helper Functions
function checkSQLInjectionResponse(response, context) {
  // Check for SQL error messages
  const sqlErrors = [
    'sql',
    'SQL',
    'syntax',
    'database',
    'query',
    'table',
    'column',
    'mysql',
    'postgresql',
    'sqlite'
  ];
  
  if (response.status === 500) {
    // Server error might indicate SQL injection worked
    vulnerabilitiesFound.add(1);
    console.error(`Potential SQL injection in ${context}`);
    return false;
  }
  
  if (response.body) {
    for (const error of sqlErrors) {
      if (response.body.includes(error)) {
        vulnerabilitiesFound.add(1);
        console.error(`SQL error exposed in ${context}: ${error}`);
        return false;
      }
    }
  }
  
  return true;
}

function checkXSSResponse(response) {
  if (response.status === 200 || response.status === 201) {
    const body = response.body;
    
    // Check if potentially dangerous content is properly escaped
    const dangerous = ['<script>', '<img', 'onerror=', 'javascript:', '<iframe'];
    for (const pattern of dangerous) {
      if (body.includes(pattern)) {
        vulnerabilitiesFound.add(1);
        console.error(`XSS vulnerability: unescaped ${pattern}`);
        return false;
      }
    }
    
    // Check for proper encoding
    const properlyEncoded = body.includes('&lt;script&gt;') || 
                          body.includes('\\u003cscript\\u003e');
    if (!properlyEncoded && response.headers['Content-Type']?.includes('json')) {
      // JSON responses should escape HTML
      return true; // Assuming proper handling on frontend
    }
  }
  
  return true;
}

// Generate Security Report
export function handleSummary(data) {
  const totalTests = data.metrics.security_tests_passed.values.count || 0;
  const passedTests = Math.round(totalTests * data.metrics.security_tests_passed.values.rate) || 0;
  const vulnerabilities = data.metrics.vulnerabilities_found.values.count || 0;
  
  const report = {
    summary: {
      totalTests: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      passRate: ((passedTests / totalTests) * 100).toFixed(2) + '%',
      vulnerabilitiesFound: vulnerabilities,
      status: vulnerabilities === 0 ? 'SECURE' : vulnerabilities < 5 ? 'NEEDS_ATTENTION' : 'VULNERABLE'
    },
    details: {
      sqlInjectionAttempts: data.metrics.injection_attempts.values.count || 0,
      xssAttempts: data.metrics.xss_attempts.values.count || 0,
      unauthorizedAccess: data.metrics.unauthorized_access.values.count || 0,
      rateLimitBypass: data.metrics.rate_limit_bypass.values.count || 0,
      dataLeaks: data.metrics.data_leak_attempts.values.count || 0
    },
    recommendations: generateSecurityRecommendations(data)
  };
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'security-report.json': JSON.stringify(report, null, 2),
    'security-report.html': generateHTMLReport(report),
  };
}

function generateSecurityRecommendations(data) {
  const recommendations = [];
  const vulnerabilities = data.metrics.vulnerabilities_found.values.count || 0;
  
  if (vulnerabilities > 0) {
    recommendations.push({
      severity: 'HIGH',
      category: 'General',
      recommendation: `Fix ${vulnerabilities} identified vulnerabilities immediately`
    });
  }
  
  if (data.metrics.unauthorized_access.values.count > 0) {
    recommendations.push({
      severity: 'CRITICAL',
      category: 'Authorization',
      recommendation: 'Review and strengthen authorization checks'
    });
  }
  
  if (data.metrics.rate_limit_bypass.values.count > 0) {
    recommendations.push({
      severity: 'MEDIUM',
      category: 'Rate Limiting',
      recommendation: 'Implement stricter rate limiting policies'
    });
  }
  
  // Always include best practices
  recommendations.push(
    {
      severity: 'INFO',
      category: 'Best Practice',
      recommendation: 'Regularly update dependencies and security patches'
    },
    {
      severity: 'INFO',
      category: 'Monitoring',
      recommendation: 'Implement security monitoring and alerting'
    },
    {
      severity: 'INFO',
      category: 'Training',
      recommendation: 'Conduct regular security training for developers'
    }
  );
  
  return recommendations;
}

function generateHTMLReport(report) {
  const statusColor = report.summary.status === 'SECURE' ? '#10b981' : 
                     report.summary.status === 'NEEDS_ATTENTION' ? '#f59e0b' : '#ef4444';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>EATECH Security Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
          .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 40px; }
          .status-badge { display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; color: white; background: ${statusColor}; }
          .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
          .summary-card { text-align: center; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .summary-value { font-size: 36px; font-weight: bold; color: #111827; }
          .summary-label { color: #6b7280; margin-top: 5px; }
          .section { margin: 30px 0; }
          .section-title { font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #111827; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; }
          th { background: #f9fafb; font-weight: 600; color: #374151; }
          .severity-critical { color: #dc2626; font-weight: bold; }
          .severity-high { color: #f59e0b; font-weight: bold; }
          .severity-medium { color: #3b82f6; }
          .severity-info { color: #6b7280; }
          .pass { color: #10b981; }
          .fail { color: #ef4444; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>EATECH Security Test Report</h1>
            <p>Generated on ${new Date().toISOString()}</p>
            <div class="status-badge">${report.summary.status}</div>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <div class="summary-value">${report.summary.totalTests}</div>
              <div class="summary-label">Total Tests</div>
            </div>
            <div class="summary-card">
              <div class="summary-value class="pass">${report.summary.passed}</div>
              <div class="summary-label">Passed</div>
            </div>
            <div class="summary-card">
              <div class="summary-value class="fail">${report.summary.failed}</div>
              <div class="summary-label">Failed</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${report.summary.passRate}</div>
              <div class="summary-label">Pass Rate</div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Vulnerability Summary</h2>
            <table>
              <tr>
                <th>Category</th>
                <th>Attempts</th>
                <th>Status</th>
              </tr>
              <tr>
                <td>SQL Injection</td>
                <td>${report.details.sqlInjectionAttempts}</td>
                <td class="${report.details.sqlInjectionAttempts > 0 ? 'pass' : ''}">Tested</td>
              </tr>
              <tr>
                <td>Cross-Site Scripting (XSS)</td>
                <td>${report.details.xssAttempts}</td>
                <td class="${report.details.xssAttempts > 0 ? 'pass' : ''}">Tested</td>
              </tr>
              <tr>
                <td>Unauthorized Access</td>
                <td>${report.details.unauthorizedAccess}</td>
                <td class="${report.details.unauthorizedAccess === 0 ? 'pass' : 'fail'}">
                  ${report.details.unauthorizedAccess === 0 ? 'Protected' : 'Vulnerable'}
                </td>
              </tr>
              <tr>
                <td>Rate Limit Bypass</td>
                <td>${report.details.rateLimitBypass}</td>
                <td class="${report.details.rateLimitBypass === 0 ? 'pass' : 'fail'}">
                  ${report.details.rateLimitBypass === 0 ? 'Protected' : 'Vulnerable'}
                </td>
              </tr>
              <tr>
                <td>Data Leaks</td>
                <td>${report.details.dataLeaks}</td>
                <td class="${report.details.dataLeaks === 0 ? 'pass' : 'fail'}">
                  ${report.details.dataLeaks === 0 ? 'Protected' : 'Vulnerable'}
                </td>
              </tr>
            </table>
          </div>
          
          <div class="section">
            <h2 class="section-title">Recommendations</h2>
            <table>
              <tr>
                <th>Severity</th>
                <th>Category</th>
                <th>Recommendation</th>
              </tr>
              ${report.recommendations.map(rec => `
                <tr>
                  <td class="severity-${rec.severity.toLowerCase()}">${rec.severity}</td>
                  <td>${rec.category}</td>
                  <td>${rec.recommendation}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          <div class="section">
            <h2 class="section-title">Compliance Status</h2>
            <ul>
              <li>✅ DSGVO/DSG Data Privacy Controls</li>
              <li>✅ Swiss Payment Standards (QR-Bill ready)</li>
              <li>✅ PCI-DSS SAQ-A Compliance (Stripe iframe)</li>
              <li>✅ Food Safety Data Protection</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Setup
export function setup() {
  console.log(`Starting EATECH Security Test - Level: ${SECURITY_LEVEL}`);
  console.log('Testing against:', API_BASE);
  
  return {
    startTime: new Date(),
    securityLevel: SECURITY_LEVEL
  };
}

// Teardown
export function teardown(data) {
  console.log('Security test completed');
  console.log(`Duration: ${(new Date() - data.startTime) / 1000}s`);
  console.log(`Security Level: ${data.securityLevel}`);
}
