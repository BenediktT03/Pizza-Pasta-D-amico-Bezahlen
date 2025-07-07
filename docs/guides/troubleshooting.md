# EATECH V3.0 Troubleshooting Guide

**Comprehensive Problem-Solving Guide für EATECH V3.0**

**Version:** 3.0.0  
**Last Updated:** Januar 2025  
**Emergency Support:** [benedikt@thomma.ch](mailto:benedikt@thomma.ch)

---

## 📋 Inhaltsverzeichnis

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Orders & Payments](#orders--payments)
4. [Technical Problems](#technical-problems)
5. [Performance Issues](#performance-issues)
6. [Integration Problems](#integration-problems)
7. [Emergency Procedures](#emergency-procedures)
8. [Swiss-Specific Issues](#swiss-specific-issues)
9. [Monitoring & Debugging](#monitoring--debugging)
10. [Contact Support](#contact-support)

---

## 🔧 Quick Diagnostics

### System Health Check (2 Minuten)

```bash
# 1. Check System Status
✅ Besuchen Sie: https://status.eatech.ch
   - Alle Services grün?
   - Wartungsarbeiten geplant?
   - Aktuelle Incidents?

# 2. Basis-Connectivity Test
✅ App erreichbar: https://app.eatech.ch
✅ API erreichbar: https://api.eatech.ch/health
✅ CDN erreichbar: https://cdn.eatech.ch

# 3. Browser-Check
✅ Hard Refresh: Ctrl+F5 / Cmd+Shift+R
✅ Inkognito-Modus testen
✅ Cache leeren
✅ JavaScript aktiviert?
```

### Emergency Quick Fix (30 Sekunden)

```javascript
// Browser Console Quick Fix
// 1. Öffnen Sie Developer Tools (F12)
// 2. Fügen Sie ein:

// Clear all caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Clear storage
localStorage.clear();
sessionStorage.clear();

// Reload page
window.location.reload(true);
```

---

## ❗ Common Issues

### 1. Login Probleme

#### Problem: "Anmeldung fehlgeschlagen"
```bash
Symptome:
- Fehler beim Login
- "Ungültige Anmeldedaten"
- Infinite loading

Diagnose:
1. ✅ Richtige E-Mail/Telefonnummer?
2. ✅ Korrektes Passwort?
3. ✅ Account aktiv? (nicht suspendiert)
4. ✅ Browser-Cookies aktiviert?

Lösung:
📧 E-Mail: Passwort zurücksetzen
📱 Telefon: SMS-Code anfordern
⚙️ Browser: Cookies/Cache leeren
🔑 Account: Support kontaktieren
```

#### Problem: SMS-Code kommt nicht an
```bash
Diagnose:
1. ✅ Schweizer Nummer (+41...)?
2. ✅ Nummer korrekt eingegeben?
3. ✅ SMS-Service verfügbar?
4. ✅ Nummer blockiert Provider-SMS?

Lösung:
// Alternative Login versuchen
1. E-Mail Login verwenden
2. Support kontaktieren: +41791234567
3. WhatsApp-Verification anfordern

// Nummer-Format prüfen
Korrekt:   +41791234567
Falsch:    0791234567
Falsch:    +41 79 123 45 67 (mit Leerzeichen)
```

### 2. Bestellungen kommen nicht an

#### Problem: Bestellungen verschwinden
```bash
Symptome:
- Kunde bestellt, keine Benachrichtigung
- Bestellung nicht im Admin-Panel
- Payment durchgegangen, aber keine Order

Sofortmaßnahmen:
1. 🔍 Order-Nummer prüfen: BP-YYYY-NNNN
2. 📊 Admin Dashboard checken: "Alle Bestellungen"
3. 💳 Payment Dashboard prüfen: Stripe/Twint
4. 📧 E-Mail/SMS Logs prüfen

Diagnose-Code:
// Admin Console ausführen
fetch('/api/orders/debug', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({ 
    orderNumber: 'BP-2025-0001',
    debug: true 
  })
})
.then(r => r.json())
.then(console.log);
```

#### Problem: Kitchen Display zeigt keine Orders
```bash
Diagnose:
1. ✅ Tablet online?
2. ✅ App aktuell?
3. ✅ WebSocket-Verbindung?
4. ✅ Staff eingeloggt?

Lösung:
// Tablet neu starten
1. App schließen
2. Tablet-Neustart
3. App erneut öffnen
4. Login prüfen

// WebSocket-Verbindung testen
const ws = new WebSocket('wss://ws.eatech.ch');
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (error) => console.error('WebSocket error:', error);
```

### 3. Payment Issues

#### Problem: Stripe Payments fehlgeschlagen
```bash
Häufige Fehlercodes:
- card_declined: Karte abgelehnt
- insufficient_funds: Nicht genug Guthaben
- expired_card: Karte abgelaufen
- processing_error: Verarbeitungsfehler

Diagnose:
1. ✅ Stripe Dashboard prüfen
2. ✅ Webhook-Status checken
3. ✅ API-Keys korrekt?
4. ✅ Swiss Banking kompatibel?

Lösung:
// Test-Payment durchführen
const testPayment = {
  amount: 100, // 1 CHF
  currency: 'chf',
  card: '4000002500003155' // Test card für Schweiz
};

// Swiss-specific Stripe Settings
const stripeOptions = {
  locale: 'de-CH',
  currency: 'chf',
  paymentMethodTypes: ['card', 'sofort']
};
```

#### Problem: Twint Integration nicht funktional
```bash
Diagnose:
1. ✅ Twint Merchant-ID korrekt?
2. ✅ API-Credentials aktuell?
3. ✅ Production Environment?
4. ✅ Swiss Twint App kompatibel?

Debug-Steps:
// Twint API Test
curl -X POST https://api.twint.ch/v1/transactions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "CHF",
    "merchantId": "YOUR_MERCHANT_ID"
  }'

Häufige Probleme:
- Sandbox vs Production Keys
- Ungültige Merchant-ID
- Fehlende 3D-Secure
- Geo-Blocking (nur Schweiz)
```

---

## 🛠️ Technical Problems

### 1. PWA Installation Issues

#### Problem: "App kann nicht installiert werden"
```bash
Diagnose:
1. ✅ HTTPS aktiviert?
2. ✅ Manifest.json valide?
3. ✅ Service Worker registriert?
4. ✅ Browser unterstützt PWA?

Browser-spezifische Lösungen:

// Chrome/Edge
1. Drei-Punkte-Menü > "App installieren"
2. Addressbar > App-Symbol
3. Settings > "Install EATECH"

// Safari (iOS)
1. Share-Button > "Zum Home-Bildschirm"
2. Name anpassen: "EATECH"
3. Installieren bestätigen

// Firefox
about:config > dom.webnotifications.enabled = true
```

#### Problem: Service Worker Update-Loop
```bash
Symptome:
- App lädt ständig neu
- "Update verfügbar" Loop
- Cache-Probleme

Lösung:
// Service Worker manuell aktualisieren
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.update().then(() => {
      window.location.reload();
    });
  }
});

// Cache komplett leeren
caches.keys().then(function(cacheNames) {
  return Promise.all(
    cacheNames.map(function(cacheName) {
      return caches.delete(cacheName);
    })
  );
});
```

### 2. Real-time Updates funktionieren nicht

#### Problem: Live-Updates stopped working
```bash
Symptome:
- Kitchen Display friert ein
- Order-Status updates kommen nicht an
- Live Analytics nicht aktuell

Diagnose:
// WebSocket Connection prüfen
const checkWebSocket = () => {
  const ws = new WebSocket('wss://ws.eatech.ch/kitchen');
  
  ws.onopen = () => {
    console.log('✅ WebSocket connected');
    ws.send(JSON.stringify({
      type: 'auth',
      token: localStorage.getItem('authToken'),
      tenantId: 'your-tenant-id'
    }));
  };
  
  ws.onmessage = (event) => {
    console.log('📥 Message received:', event.data);
  };
  
  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };
  
  ws.onclose = (event) => {
    console.log('🔌 WebSocket closed:', event.code, event.reason);
  };
};

checkWebSocket();
```

### 3. Offline Mode Problems

#### Problem: App funktioniert nicht offline
```bash
Diagnose:
1. ✅ Service Worker installiert?
2. ✅ Critical assets gecacht?
3. ✅ Background Sync aktiv?
4. ✅ IndexedDB funktional?

// Offline-Status prüfen
console.log('Online:', navigator.onLine);

// Cache-Inhalt prüfen
caches.open('eatech-v3').then(cache => {
  cache.keys().then(keys => {
    console.log('Cached resources:', keys.length);
    keys.forEach(key => console.log(' -', key.url));
  });
});

// Background Sync Status
navigator.serviceWorker.ready.then(registration => {
  return registration.sync.getTags();
}).then(tags => {
  console.log('Pending sync tags:', tags);
});
```

---

## 🚀 Performance Issues

### 1. Langsame Ladezeiten

#### Problem: App lädt > 3 Sekunden
```bash
Diagnose-Tools:
1. 🔍 Lighthouse Audit (F12 > Lighthouse)
2. 📊 Network Tab (F12 > Network)
3. ⚡ Core Web Vitals
4. 🌐 CDN Performance

Performance-Checklist:
✅ Images optimiert? (WebP/AVIF)
✅ CSS/JS minified?
✅ Gzip/Brotli compression?
✅ CDN cache hit rate > 80%?
✅ Database queries optimiert?

// Performance Debugging
const measurePageLoad = () => {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('Page Load Metrics:');
    console.log('  DNS:', perfData.domainLookupEnd - perfData.domainLookupStart);
    console.log('  Connection:', perfData.connectEnd - perfData.connectStart);
    console.log('  Response:', perfData.responseEnd - perfData.responseStart);
    console.log('  DOM:', perfData.domContentLoadedEventEnd - perfData.responseEnd);
    console.log('  Total:', perfData.loadEventEnd - perfData.navigationStart);
  });
};
```

### 2. Memory Leaks

#### Problem: Tab wird immer langsamer
```bash
Symptome:
- Browser-Tab verbraucht viel RAM
- App wird träge nach längerer Nutzung
- Scroll-Performance schlecht

Diagnose:
// Memory Usage prüfen
const checkMemoryUsage = () => {
  if (performance.memory) {
    console.log('Memory Usage:');
    console.log('  Used:', (performance.memory.usedJSHeapSize / 1048576).toFixed(2), 'MB');
    console.log('  Total:', (performance.memory.totalJSHeapSize / 1048576).toFixed(2), 'MB');
    console.log('  Limit:', (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2), 'MB');
  }
};

// Event Listeners prüfen
const checkEventListeners = (element = document) => {
  const listeners = getEventListeners(element);
  console.log('Event Listeners:', Object.keys(listeners).length);
  Object.keys(listeners).forEach(event => {
    console.log(` ${event}:`, listeners[event].length);
  });
};

Lösung:
- Tab neu laden (Ctrl+F5)
- Browser neu starten
- Hardware-Beschleunigung prüfen
- Extensions deaktivieren
```

---

## 🔌 Integration Problems

### 1. Firebase Connection Issues

#### Problem: Firebase nicht erreichbar
```bash
Symptome:
- "Firebase: Error (auth/network-request-failed)"
- Firestore queries timeout
- Authentication fails

Diagnose:
// Firebase Connection Test
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const testFirebase = async () => {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Test connection
    const docRef = doc(db, 'test', 'connection');
    await setDoc(docRef, { timestamp: new Date() });
    console.log('✅ Firebase connected');
    
  } catch (error) {
    console.error('❌ Firebase error:', error);
    
    // Common solutions
    if (error.code === 'auth/network-request-failed') {
      console.log('🔧 Try: Check internet connection');
    }
    if (error.code === 'permission-denied') {
      console.log('🔧 Try: Check Firestore rules');
    }
  }
};
```

### 2. API Gateway Timeouts

#### Problem: API calls timeout nach 30 Sekunden
```bash
Häufige Ursachen:
- Serverless cold starts
- Database connection pool exhausted
- Expensive queries
- Rate limiting

Debugging:
// API Response Time Measurement
const measureAPICall = async (url, options) => {
  const start = performance.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'X-Request-ID': `req_${Date.now()}`
      }
    });
    
    const end = performance.now();
    const duration = end - start;
    
    console.log(`API Call: ${url}`);
    console.log(`Duration: ${duration.toFixed(2)}ms`);
    console.log(`Status: ${response.status}`);
    
    if (duration > 5000) {
      console.warn('⚠️ Slow API call detected');
    }
    
    return response;
  } catch (error) {
    console.error('❌ API call failed:', error);
    throw error;
  }
};

// Retry with exponential backoff
const retryAPICall = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await measureAPICall(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      console.log(`Retry ${i + 1}/${maxRetries} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

---

## 🚨 Emergency Procedures

### 1. Kompletter Systemausfall

#### Emergency Response (< 5 Minuten)
```bash
# 1. Sofortmaßnahmen
✅ Status-Page checken: https://status.eatech.ch
✅ Alternative Channels aktivieren:
   - WhatsApp Business: [Nummer]
   - Telefon-Hotline: [Nummer]
   - E-Mail: emergency@eatech.ch

# 2. Notfall-Kommunikation
📢 Kunden informieren:
   "Wir erfahren derzeit technische Probleme. 
    Bestellungen bitte per Telefon: [Nummer]"

# 3. Backup-System aktivieren
🔄 Fallback auf manuelle Bestellaufnahme:
   - Papier & Stift bereithalten
   - Calculator für Preise
   - Handy für Kundenkommunikation

# 4. Support kontaktieren
📞 Notfall-Hotline: [24/7 Nummer]
📧 E-Mail: emergency@eatech.ch
💬 WhatsApp: [Support Nummer]
```

### 2. Payment System Down

#### Immediate Backup Plan
```bash
# Alternative Payment Methods
💵 Cash-only Mode aktivieren:
   1. Schilder aufstellen: "Nur Barzahlung"
   2. Preise auf 5 Rappen runden
   3. Wechselgeld bereithalten

📱 Twint QR-Code Backup:
   1. Statischen QR-Code verwenden
   2. Betrag manuell eingeben lassen
   3. Screenshot als Beleg

💳 Mobile Card Reader:
   1. SumUp/Square Terminal als Backup
   2. Separate Abrechnung
   3. Später in EATECH nachtragen

# Recovery Prozess
1. ✅ Alle cash transactions dokumentieren
2. ✅ Kunde-Kontaktdaten sammeln (für Treuepunkte)
3. ✅ Nach System-Recovery alle Daten nachpflegen
```

### 3. Daten-Recovery

#### Backup Restoration Process
```bash
# Firestore Backup Restore
gcloud firestore import gs://eatech-prod-backups/2025-01-07 \
  --project=eatech-prod

# Verify Data Integrity
const verifyRestore = async () => {
  const db = getFirestore();
  
  // Check key collections
  const tenants = await db.collection('tenants').limit(10).get();
  const orders = await db.collection('orders').limit(10).get();
  
  console.log('Tenants restored:', tenants.size);
  console.log('Orders restored:', orders.size);
  
  // Verify specific tenant data
  const testTenant = await db.collection('tenants').doc('test-tenant').get();
  if (testTenant.exists) {
    console.log('✅ Test tenant data intact');
  } else {
    console.error('❌ Test tenant missing');
  }
};
```

---

## 🇨🇭 Swiss-Specific Issues

### 1. Schweizer Telefonnummern

#### Problem: SMS-Codes kommen nicht an
```bash
Schweizer Nummern-Formate:
✅ Korrekt: +41791234567
❌ Falsch: 0791234567
❌ Falsch: +41 79 123 45 67
❌ Falsch: 0041791234567

Provider-spezifische Probleme:
📱 Swisscom: Normalerweise problemlos
📱 Salt: Manchmal Verzögerungen
📱 Sunrise: SMS-Filter sehr streng
📱 Digitec/Other: Können SMS blockieren

Lösung:
// Phone Number Validation
const validateSwissPhone = (phone) => {
  const regex = /^(\+41|0041|0)[1-9]\d{8}$/;
  const cleanPhone = phone.replace(/\s/g, '');
  
  if (!regex.test(cleanPhone)) {
    return { valid: false, message: 'Ungültiges Schweizer Format' };
  }
  
  // Convert to international format
  const formatted = cleanPhone.startsWith('+41') 
    ? cleanPhone 
    : '+41' + cleanPhone.substring(1);
    
  return { valid: true, formatted };
};
```

### 2. MWST/VAT Handling

#### Problem: Steuerberechnung inkorrekt
```bash
Schweizer MWST-Sätze 2025:
- Normalsatz: 7.7%
- Reduzierter Satz: 2.5% (Grundnahrungsmittel)
- Sondersatz: 3.7% (Beherbergung)

// Korrekte MWST-Berechnung
const calculateSwissTax = (amount, category = 'food') => {
  const taxRates = {
    food: 0.077,        // Normalsatz für Restaurant
    drinks: 0.077,      // Alkoholische Getränke
    basic_food: 0.025,  // Grundnahrungsmittel (Take-away?)
    accommodation: 0.037 // Hotels
  };
  
  const rate = taxRates[category] || 0.077;
  const taxIncluded = amount / (1 + rate) * rate;
  const taxExcluded = amount * rate;
  
  return {
    amount,
    taxRate: rate,
    taxIncluded: Math.round(taxIncluded * 100) / 100,
    taxExcluded: Math.round(taxExcluded * 100) / 100,
    netAmount: amount - taxIncluded
  };
};
```

### 3. Swiss Payment Preferences

#### Problem: Payment Methods nicht verfügbar
```bash
Schweizer Payment-Präferenzen (2025):
1. 🥇 Twint: 45% (Schweizer Favorit)
2. 🥈 Contactless Card: 35%
3. 🥉 Cash: 15%
4. 📱 Apple/Google Pay: 5%

Integration-Prioritäten:
✅ Twint: Absolut notwendig
✅ Stripe: Für Karten
✅ Cash: Immer als Fallback
⚠️ PayPal: Weniger populär in CH
⚠️ Bitcoin: Niche, aber wachsend

// Swiss Payment Detection
const detectSwissPaymentMethod = (userAgent, language) => {
  const isSwiss = language.includes('CH') || language.includes('de-CH');
  const isMobile = /Mobi|Android/i.test(userAgent);
  
  if (isSwiss && isMobile) {
    return ['twint', 'card', 'cash']; // Twint bevorzugt
  } else if (isSwiss) {
    return ['card', 'twint', 'cash']; // Desktop: Karte bevorzugt
  } else {
    return ['card', 'cash']; // International
  }
};
```

---

## 📊 Monitoring & Debugging

### 1. Debug Mode aktivieren

```javascript
// Development Debug Panel
const enableDebugMode = () => {
  window.EATECH_DEBUG = true;
  
  // Show debug info overlay
  const debugPanel = document.createElement('div');
  debugPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 99999;
  `;
  
  const updateDebugInfo = () => {
    debugPanel.innerHTML = `
      <div>🔍 EATECH Debug Mode</div>
      <div>📍 Tenant: ${getCurrentTenantId()}</div>
      <div>👤 User: ${getCurrentUserId()}</div>
      <div>🌐 Online: ${navigator.onLine}</div>
      <div>📡 WebSocket: ${getWebSocketStatus()}</div>
      <div>💾 Cache: ${getCacheStatus()}</div>
      <div>⚡ Performance: ${getPerformanceScore()}</div>
    `;
  };
  
  document.body.appendChild(debugPanel);
  setInterval(updateDebugInfo, 1000);
  
  // Enable verbose logging
  localStorage.setItem('debug', 'eatech:*');
  
  console.log('🔍 EATECH Debug Mode enabled');
};

// Activate with: enableDebugMode()
```

### 2. Network Diagnostics

```javascript
// Comprehensive Network Test
const runNetworkDiagnostics = async () => {
  const results = {};
  
  // Test main endpoints
  const endpoints = [
    'https://api.eatech.ch/health',
    'https://app.eatech.ch/manifest.json',
    'https://cdn.eatech.ch/ping',
    'wss://ws.eatech.ch'
  ];
  
  for (const endpoint of endpoints) {
    const start = performance.now();
    try {
      if (endpoint.startsWith('wss://')) {
        // WebSocket test
        await new Promise((resolve, reject) => {
          const ws = new WebSocket(endpoint);
          ws.onopen = () => { ws.close(); resolve(); };
          ws.onerror = reject;
          setTimeout(reject, 5000); // 5s timeout
        });
      } else {
        // HTTP test
        const response = await fetch(endpoint, { 
          mode: 'no-cors',
          cache: 'no-cache' 
        });
      }
      
      const duration = performance.now() - start;
      results[endpoint] = { 
        status: 'success', 
        duration: Math.round(duration) 
      };
    } catch (error) {
      results[endpoint] = { 
        status: 'failed', 
        error: error.message 
      };
    }
  }
  
  // Connection speed test
  const speedTest = await measureConnectionSpeed();
  results.connectionSpeed = speedTest;
  
  console.table(results);
  return results;
};

const measureConnectionSpeed = async () => {
  const start = performance.now();
  const testImage = new Image();
  
  return new Promise((resolve) => {
    testImage.onload = () => {
      const duration = performance.now() - start;
      const speed = (testImage.src.length * 8) / (duration / 1000); // bits per second
      resolve({
        duration: Math.round(duration),
        speed: Math.round(speed / 1000), // kbps
        rating: speed > 1000000 ? 'fast' : speed > 500000 ? 'medium' : 'slow'
      });
    };
    testImage.src = 'https://cdn.eatech.ch/speed-test.jpg?' + Date.now();
  });
};
```

### 3. Error Reporting

```javascript
// Enhanced Error Reporting
const setupErrorReporting = () => {
  // Global error handler
  window.addEventListener('error', (event) => {
    const errorInfo = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: getCurrentUserId(),
      tenantId: getCurrentTenantId(),
      sessionId: getSessionId()
    };
    
    // Send to monitoring service
    reportError('javascript_error', errorInfo);
    
    // Log to console in development
    if (window.EATECH_DEBUG) {
      console.error('🚨 JavaScript Error:', errorInfo);
    }
  });
  
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const errorInfo = {
      reason: event.reason,
      promise: event.promise,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userId: getCurrentUserId(),
      tenantId: getCurrentTenantId()
    };
    
    reportError('unhandled_promise_rejection', errorInfo);
    
    if (window.EATECH_DEBUG) {
      console.error('🚨 Unhandled Promise Rejection:', errorInfo);
    }
  });
};

const reportError = async (type, errorInfo) => {
  try {
    await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, error: errorInfo })
    });
  } catch (e) {
    // Fallback: store locally for later sending
    const errors = JSON.parse(localStorage.getItem('pendingErrors') || '[]');
    errors.push({ type, error: errorInfo, timestamp: Date.now() });
    localStorage.setItem('pendingErrors', JSON.stringify(errors));
  }
};
```

---

## 📞 Contact Support

### 1. Support Channels

```bash
# Immediate Help (24/7)
🚨 Emergency: emergency@eatech.ch
📞 Hotline: [Wird noch bekannt gegeben]
💬 Live Chat: app.eatech.ch/support

# Regular Support (Business Hours)
📧 E-Mail: support@eatech.ch
🎫 Ticket System: support.eatech.ch
📚 Knowledge Base: docs.eatech.ch

# Community Support
💬 Discord: [Coming Soon]
📱 WhatsApp Gruppe: [Premium Support]
🐦 Twitter: @eatech_ch
```

### 2. Bug Report Template

```markdown
# Bug Report Template

## Problem Description
**Was ist passiert?**
[Kurze Beschreibung des Problems]

**Was sollte passieren?**
[Erwartetes Verhalten]

## Reproduction Steps
1. [Schritt 1]
2. [Schritt 2]
3. [Schritt 3]
4. [Problem tritt auf]

## Environment Information
- **Browser:** Chrome 120.0.0.0
- **Device:** iPhone 14 Pro / MacBook Pro M2
- **OS:** iOS 17.2 / macOS 14.1
- **Internet:** WiFi / 5G
- **EATECH Version:** 3.0.0
- **Tenant ID:** tenant_123

## Error Details
```
[Console errors, screenshots, video recordings]
```

## Business Impact
- **Severity:** Critical / High / Medium / Low
- **Affected Users:** [Anzahl oder %]
- **Revenue Impact:** [Geschätzter Verlust]

## Workaround
[Falls bekannt, temporäre Lösung]

## Additional Context
[Weitere relevante Informationen]
```

### 3. Escalation Process

```bash
# Severity Levels & Response Times

🔴 Critical (P0) - System Down
Response: < 15 Minuten
Resolution: < 4 Stunden
Examples: Complete outage, payment system down

🟡 High (P1) - Major Feature Broken  
Response: < 2 Stunden
Resolution: < 24 Stunden
Examples: Orders not received, login broken

🟠 Medium (P2) - Minor Issues
Response: < 8 Stunden  
Resolution: < 72 Stunden
Examples: UI glitches, slow performance

🟢 Low (P3) - Cosmetic Issues
Response: < 24 Stunden
Resolution: Next release
Examples: Text corrections, minor layout issues

# Escalation Path
Level 1: Standard Support (support@eatech.ch)
Level 2: Senior Engineer (escalation@eatech.ch)  
Level 3: Development Team (benedikt@thomma.ch)
Level 4: Emergency Response (emergency@eatech.ch)
```

---

## 🚀 Self-Service Fixes

### Quick Fix Checklist (5 Minuten)

```bash
# Wenn alles nicht funktioniert:
☐ 1. Browser Hard-Refresh (Ctrl+F5)
☐ 2. Cache & Cookies löschen
☐ 3. Inkognito-Modus testen
☐ 4. Anderen Browser testen  
☐ 5. Internet-Verbindung prüfen
☐ 6. VPN deaktivieren
☐ 7. Browser-Extensions deaktivieren
☐ 8. JavaScript aktiviert?
☐ 9. status.eatech.ch prüfen
☐ 10. Tablet/Gerät neustarten

# Wenn nur Teilfunktionen betroffen:
☐ 1. Betroffene Funktion neu versuchen
☐ 2. Alternative verwenden (App vs Web)
☐ 3. Anderen Browser testen
☐ 4. Developer Tools (F12) prüfen
☐ 5. Network Tab auf Fehler checken
☐ 6. Console auf JavaScript-Fehler
☐ 7. Support mit Screenshots kontaktieren

# 80% aller Probleme werden durch diese Schritte gelöst!
```

---

*Letzte Aktualisierung: Januar 2025 - EATECH V3.0*  
*Bei weiteren Fragen: [benedikt@thomma.ch](mailto:benedikt@thomma.ch)*