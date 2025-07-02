// System Optimizations für Pizza&Pasta D'amico
// Performance, Security und UX Verbesserungen

// 1. PERFORMANCE OPTIMIERUNGEN
class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
    }
    
    // Firebase Query Caching
    async cachedQuery(path, duration = 60000) { // 1 Minute default
        const cacheKey = path;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < duration) {
            return cached.data;
        }
        
        // Deduplizierung paralleler Requests
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }
        
        const promise = firebase.database().ref(path).once('value')
            .then(snapshot => {
                const data = snapshot.val();
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                this.pendingRequests.delete(cacheKey);
                return data;
            });
        
        this.pendingRequests.set(cacheKey, promise);
        return promise;
    }
    
    // Lazy Loading für Bilder
    initializeLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const image = entry.target;
                        image.src = image.dataset.src;
                        image.classList.remove('lazy');
                        observer.unobserve(image);
                    }
                });
            });
            
            document.querySelectorAll('img.lazy').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    // Debounce für Such-Inputs
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Request Batching für Firebase
    batchRequests(requests) {
        return Promise.all(requests.map(req => 
            firebase.database().ref(req.path).once('value')
        ));
    }
    
    // Service Worker für Offline-Funktionalität
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registered:', registration))
                .catch(error => console.log('SW registration failed:', error));
        }
    }
}

// 2. SECURITY ENHANCEMENTS
class SecurityEnhancer {
    constructor() {
        this.rateLimiter = new Map();
    }
    
    // XSS Protection
    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    // SQL Injection Prevention für Firebase Queries
    sanitizeFirebasePath(path) {
        return path.replace(/[.#$\[\]]/g, '_');
    }
    
    // Rate Limiting
    checkRateLimit(userId, action, maxAttempts = 5, windowMs = 60000) {
        const key = `${userId}-${action}`;
        const now = Date.now();
        const attempts = this.rateLimiter.get(key) || [];
        
        // Entferne alte Versuche
        const recentAttempts = attempts.filter(time => now - time < windowMs);
        
        if (recentAttempts.length >= maxAttempts) {
            return false;
        }
        
        recentAttempts.push(now);
        this.rateLimiter.set(key, recentAttempts);
        return true;
    }
    
    // CSRF Token Management
    generateCSRFToken() {
        const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        sessionStorage.setItem('csrfToken', token);
        return token;
    }
    
    validateCSRFToken(token) {
        return token === sessionStorage.getItem('csrfToken');
    }
    
    // Input Validation
    validateOrderData(data) {
        const errors = [];
        
        // Name validation
        if (!data.customerName || data.customerName.length < 2) {
            errors.push('Name muss mindestens 2 Zeichen lang sein');
        }
        
        // Phone validation
        if (data.phone && !/^[+]?[0-9]{10,15}$/.test(data.phone.replace(/\s/g, ''))) {
            errors.push('Ungültige Telefonnummer');
        }
        
        // Email validation
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('Ungültige E-Mail-Adresse');
        }
        
        // Cart validation
        if (!data.items || data.items.length === 0) {
            errors.push('Warenkorb ist leer');
        }
        
        return errors;
    }
}

// 3. ERROR HANDLING & RECOVERY
class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.setupGlobalErrorHandling();
    }
    
    setupGlobalErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.logError({
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error
            });
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'unhandledRejection',
                reason: event.reason,
                promise: event.promise
            });
        });
    }
    
    logError(error) {
        this.errorLog.push({
            ...error,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
        
        // Send to Firebase (mit Rate Limiting)
        if (this.errorLog.length <= 10) { // Max 10 Fehler pro Session
            firebase.database().ref('error_logs').push({
                ...error,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        console.error('Logged error:', error);
    }
    
    // Retry-Mechanismus für fehlgeschlagene Requests
    async retryRequest(fn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }
    
    // User-friendly error messages
    getUserMessage(error) {
        const messages = {
            'auth/invalid-email': 'Ungültige E-Mail-Adresse',
            'auth/user-not-found': 'Benutzer nicht gefunden',
            'auth/wrong-password': 'Falsches Passwort',
            'network-error': 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
            'permission-denied': 'Zugriff verweigert',
            'unavailable': 'Service momentan nicht verfügbar'
        };
        
        return messages[error.code] || 'Ein unerwarteter Fehler ist aufgetreten';
    }
}

// 4. UX IMPROVEMENTS
class UXEnhancer {
    constructor() {
        this.initializeEnhancements();
    }
    
    initializeEnhancements() {
        this.addLoadingStates();
        this.improveFormValidation();
        this.addKeyboardShortcuts();
        this.enhanceAccessibility();
    }
    
    // Loading States für alle Aktionen
    addLoadingStates() {
        // Globaler Loading Indicator
        const loadingHTML = `
            <div id="global-loading" class="global-loading" style="display: none;">
                <div class="loading-spinner"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        
        // Intercept alle Firebase Calls
        const originalRef = firebase.database().ref;
        firebase.database().ref = function(...args) {
            const ref = originalRef.apply(this, args);
            const originalOnce = ref.once;
            
            ref.once = function(...onceArgs) {
                UXEnhancer.showLoading();
                return originalOnce.apply(this, onceArgs)
                    .finally(() => UXEnhancer.hideLoading());
            };
            
            return ref;
        };
    }
    
    static showLoading() {
        document.getElementById('global-loading').style.display = 'flex';
    }
    
    static hideLoading() {
        document.getElementById('global-loading').style.display = 'none';
    }
    
    // Verbesserte Form Validation mit Live-Feedback
    improveFormValidation() {
        document.querySelectorAll('input, textarea').forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.clearFieldError(field));
        });
    }
    
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';
        
        switch (field.type) {
            case 'email':
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                message = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
                break;
            case 'tel':
                isValid = /^[+]?[0-9]{10,15}$/.test(value.replace(/\s/g, ''));
                message = 'Bitte geben Sie eine gültige Telefonnummer ein';
                break;
            case 'number':
                isValid = !isNaN(value) && value !== '';
                message = 'Bitte geben Sie eine gültige Zahl ein';
                break;
        }
        
        if (field.required && !value) {
            isValid = false;
            message = 'Dieses Feld ist erforderlich';
        }
        
        this.showFieldFeedback(field, isValid, message);
    }
    
    showFieldFeedback(field, isValid, message) {
        const wrapper = field.parentElement;
        wrapper.classList.toggle('has-error', !isValid);
        wrapper.classList.toggle('has-success', isValid && field.value);
        
        let feedback = wrapper.querySelector('.field-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'field-feedback';
            wrapper.appendChild(feedback);
        }
        
        feedback.textContent = isValid ? '' : message;
    }
    
    clearFieldError(field) {
        const wrapper = field.parentElement;
        wrapper.classList.remove('has-error');
    }
    
    // Keyboard Shortcuts
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S: Speichern
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const saveBtn = document.querySelector('[type="submit"]');
                if (saveBtn) saveBtn.click();
            }
            
            // ESC: Modal schließen
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal[style*="block"]');
                modals.forEach(modal => modal.style.display = 'none');
            }
            
            // Ctrl/Cmd + K: Suche fokussieren
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('input[type="search"]');
                if (searchInput) searchInput.focus();
            }
        });
    }
    
    // Accessibility Improvements
    enhanceAccessibility() {
        // ARIA Labels
        document.querySelectorAll('button:not([aria-label])').forEach(btn => {
            if (btn.textContent.trim()) {
                btn.setAttribute('aria-label', btn.textContent.trim());
            }
        });
        
        // Focus Management
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            
            // Trap focus in modal
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const focusable = modal.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            });
        });
    }
    
    // Smooth Scroll
    smoothScrollTo(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// 5. OFFLINE SUPPORT
class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        this.setupListeners();
    }
    
    setupListeners() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }
    
    handleOnline() {
        this.isOnline = true;
        this.showNotification('Verbindung wiederhergestellt', 'success');
        this.processOfflineQueue();
    }
    
    handleOffline() {
        this.isOnline = false;
        this.showNotification('Keine Internetverbindung', 'warning');
    }
    
    queueRequest(request) {
        this.offlineQueue.push({
            ...request,
            timestamp: Date.now()
        });
        
        // Speichere in LocalStorage
        localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
    }
    
    async processOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
        
        for (const request of queue) {
            try {
                await this.executeRequest(request);
            } catch (error) {
                console.error('Failed to process offline request:', error);
            }
        }
        
        // Clear queue
        this.offlineQueue = [];
        localStorage.removeItem('offlineQueue');
    }
    
    async executeRequest(request) {
        switch (request.type) {
            case 'order':
                return firebase.database().ref('orders').push(request.data);
            case 'update':
                return firebase.database().ref(request.path).update(request.data);
            // Weitere Request-Typen...
        }
    }
    
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `offline-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 5000);
    }
}

// 6. ANALYTICS & MONITORING
class AnalyticsTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.events = [];
    }
    
    generateSessionId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    track(eventName, data = {}) {
        const event = {
            name: eventName,
            data: data,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            page: window.location.pathname
        };
        
        this.events.push(event);
        
        // Send to Firebase
        firebase.database().ref('analytics').push(event);
        
        // Google Analytics Integration (wenn vorhanden)
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, data);
        }
    }
    
    // Automatisches Tracking
    setupAutoTracking() {
        // Page Views
        this.track('page_view');
        
        // Clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('button, a')) {
                this.track('click', {
                    element: e.target.tagName,
                    text: e.target.textContent,
                    href: e.target.href
                });
            }
        });
        
        // Form Submissions
        document.addEventListener('submit', (e) => {
            this.track('form_submit', {
                formId: e.target.id,
                formAction: e.target.action
            });
        });
        
        // Errors
        window.addEventListener('error', (e) => {
            this.track('error', {
                message: e.message,
                source: e.filename,
                line: e.lineno
            });
        });
    }
}

// INITIALISIERUNG
document.addEventListener('DOMContentLoaded', () => {
    // Performance
    const perfOptimizer = new PerformanceOptimizer();
    perfOptimizer.initializeLazyLoading();
    perfOptimizer.registerServiceWorker();
    
    // Security
    window.security = new SecurityEnhancer();
    
    // Error Handling
    window.errorHandler = new ErrorHandler();
    
    // UX
    new UXEnhancer();
    
    // Offline Support
    window.offlineManager = new OfflineManager();
    
    // Analytics
    const analytics = new AnalyticsTracker();
    analytics.setupAutoTracking();
    
    console.log('System optimizations loaded successfully');
});

// Export für globale Nutzung
window.SystemOptimizations = {
    PerformanceOptimizer,
    SecurityEnhancer,
    ErrorHandler,
    UXEnhancer,
    OfflineManager,
    AnalyticsTracker
};