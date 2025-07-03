// Eatech Warenkorb-System - Vollständige Komponente
// Diese Datei kann in allen Seiten eingebunden werden

class EatechCart {
    constructor() {
        this.cart = this.loadCart();
        this.listeners = [];
        this.init();
    }

    // Initialisierung
    init() {
        // Event Listener für Storage Changes (Tab-Sync)
        window.addEventListener('storage', (e) => {
            if (e.key === 'eatechCart') {
                this.cart = this.loadCart();
                this.notifyListeners();
            }
        });

        // Theme Support
        this.currentTheme = localStorage.getItem('eatechTheme') || 'noir-excellence';
    }

    // Cart Management
    loadCart() {
        const saved = localStorage.getItem('eatechCart');
        return saved ? JSON.parse(saved) : [];
    }

    saveCart() {
        localStorage.setItem('eatechCart', JSON.stringify(this.cart));
        this.notifyListeners();
    }

    // Produkt hinzufügen
    addItem(product, quantity = 1) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                ...product,
                quantity: quantity,
                addedAt: new Date().toISOString()
            });
        }
        
        this.saveCart();
        this.showNotification(`${product.name} wurde zum Warenkorb hinzugefügt`);
        return true;
    }

    // Produkt entfernen
    removeItem(productId) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            this.cart = this.cart.filter(item => item.id !== productId);
            this.saveCart();
            this.showNotification(`${item.name} wurde entfernt`);
        }
    }

    // Menge aktualisieren
    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = quantity;
                this.saveCart();
            }
        }
    }

    // Menge erhöhen/verringern
    incrementQuantity(productId) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity++;
            this.saveCart();
        }
    }

    decrementQuantity(productId) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            if (item.quantity > 1) {
                item.quantity--;
                this.saveCart();
            } else {
                this.removeItem(productId);
            }
        }
    }

    // Warenkorb leeren
    clearCart() {
        if (this.cart.length > 0) {
            this.cart = [];
            this.saveCart();
            this.showNotification('Warenkorb wurde geleert');
        }
    }

    // Getter Methoden
    getItems() {
        return this.cart;
    }

    getItemCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    getTotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getItemQuantity(productId) {
        const item = this.cart.find(item => item.id === productId);
        return item ? item.quantity : 0;
    }

    isEmpty() {
        return this.cart.length === 0;
    }

    // Event System
    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback(this.cart));
    }

    // UI Rendering
    renderDesktopCart(containerId = 'cartContent') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (this.isEmpty()) {
            container.innerHTML = `
                <div class="cart-empty">
                    <div class="cart-empty-icon">🛒</div>
                    <p>Ihr Warenkorb ist leer</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="cart-items">
                ${this.cart.map(item => `
                    <div class="cart-item" data-item-id="${item.id}">
                        <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                        <div class="cart-item-details">
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-quantity">
                                <button class="quantity-btn small" onclick="eatechCart.decrementQuantity(${item.id})">−</button>
                                <span>${item.quantity}</span>
                                <button class="quantity-btn small" onclick="eatechCart.incrementQuantity(${item.id})">+</button>
                            </div>
                        </div>
                        <div class="cart-item-price">
                            <div>CHF ${(item.price * item.quantity).toFixed(2)}</div>
                            <button class="remove-btn" onclick="eatechCart.removeItem(${item.id})">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="cart-total">
                <div class="cart-total-row">
                    <span>Zwischensumme:</span>
                    <span>CHF ${this.getTotal().toFixed(2)}</span>
                </div>
                <div class="cart-total-row">
                    <span>Liefergebühr:</span>
                    <span>CHF 0.00</span>
                </div>
                <div class="cart-total-row final">
                    <span>Gesamt:</span>
                    <span>CHF ${this.getTotal().toFixed(2)}</span>
                </div>
            </div>
            <div class="cart-actions">
                <button class="cart-action-btn secondary" onclick="eatechCart.clearCart()">
                    Warenkorb leeren
                </button>
                <button class="checkout-btn" onclick="eatechCart.checkout()">
                    Zur Kasse (CHF ${this.getTotal().toFixed(2)})
                </button>
            </div>
        `;
    }

    renderMobileCart(containerId = 'mobileCartContent') {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Gleicher Content wie Desktop
        this.renderDesktopCart(containerId);
    }

    updateBadges() {
        const itemCount = this.getItemCount();
        
        // Desktop Badge
        const cartBadge = document.querySelector('.cart-badge');
        if (cartBadge) {
            cartBadge.textContent = itemCount;
        }

        // Mobile Badge
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = itemCount;
            cartCount.style.display = itemCount > 0 ? 'flex' : 'none';
        }

        // Update Button Text
        const mobileCartBtn = document.querySelector('.mobile-cart-btn');
        if (mobileCartBtn && itemCount > 0) {
            mobileCartBtn.classList.add('has-items');
        }
    }

    // Checkout
    checkout() {
        if (this.isEmpty()) {
            this.showNotification('Ihr Warenkorb ist leer', 'error');
            return;
        }

        // Warenkorb-Daten für Checkout vorbereiten
        const checkoutData = {
            items: this.cart,
            total: this.getTotal(),
            itemCount: this.getItemCount(),
            timestamp: new Date().toISOString()
        };

        // In Session Storage für Checkout-Seite
        sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));

        // Weiterleitung zur Checkout-Seite
        window.location.href = '/checkout.html';
    }

    // Benachrichtigungen
    showNotification(message, type = 'success') {
        // Existierende Notification entfernen
        const existing = document.querySelector('.cart-notification');
        if (existing) {
            existing.remove();
        }

        // Neue Notification erstellen
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✓' : '⚠️'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animation
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Mini Cart für Header
    renderMiniCart(containerId = 'miniCart') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const itemCount = this.getItemCount();
        const total = this.getTotal();

        container.innerHTML = `
            <button class="mini-cart-btn" onclick="eatechCart.toggleMiniCart()">
                <span class="mini-cart-icon">🛒</span>
                ${itemCount > 0 ? `<span class="mini-cart-count">${itemCount}</span>` : ''}
            </button>
            <div class="mini-cart-dropdown" id="miniCartDropdown">
                <div class="mini-cart-header">
                    <h3>Warenkorb (${itemCount})</h3>
                    <button class="close-btn" onclick="eatechCart.closeMiniCart()">✕</button>
                </div>
                ${this.isEmpty() ? `
                    <div class="mini-cart-empty">
                        <p>Ihr Warenkorb ist leer</p>
                    </div>
                ` : `
                    <div class="mini-cart-items">
                        ${this.cart.slice(0, 3).map(item => `
                            <div class="mini-cart-item">
                                <img src="${item.image}" alt="${item.name}">
                                <div class="mini-item-details">
                                    <div class="mini-item-name">${item.name}</div>
                                    <div class="mini-item-quantity">${item.quantity}x CHF ${item.price.toFixed(2)}</div>
                                </div>
                                <div class="mini-item-price">CHF ${(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                        `).join('')}
                        ${this.cart.length > 3 ? `
                            <div class="mini-cart-more">
                                + ${this.cart.length - 3} weitere Artikel
                            </div>
                        ` : ''}
                    </div>
                    <div class="mini-cart-footer">
                        <div class="mini-cart-total">
                            <span>Gesamt:</span>
                            <span>CHF ${total.toFixed(2)}</span>
                        </div>
                        <button class="mini-checkout-btn" onclick="eatechCart.checkout()">
                            Zur Kasse
                        </button>
                    </div>
                `}
            </div>
        `;
    }

    toggleMiniCart() {
        const dropdown = document.getElementById('miniCartDropdown');
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    }

    closeMiniCart() {
        const dropdown = document.getElementById('miniCartDropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    }

    // Preis-Formatierung
    formatPrice(price) {
        return `CHF ${price.toFixed(2)}`;
    }

    // Speichern für spätere Bestellung
    saveForLater(productId) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            let savedItems = JSON.parse(localStorage.getItem('eatechSavedItems') || '[]');
            savedItems.push(item);
            localStorage.setItem('eatechSavedItems', JSON.stringify(savedItems));
            
            this.removeItem(productId);
            this.showNotification('Artikel wurde für später gespeichert');
        }
    }

    // Gutschein-System
    applyPromoCode(code) {
        // Hier würde die Gutschein-Validierung stattfinden
        const promoCodes = {
            'EATECH10': { discount: 0.1, type: 'percentage' },
            'GRATIS5': { discount: 5, type: 'fixed' }
        };

        const promo = promoCodes[code.toUpperCase()];
        if (promo) {
            sessionStorage.setItem('activePromo', JSON.stringify({ code, ...promo }));
            this.showNotification(`Gutschein "${code}" wurde angewendet`);
            return true;
        } else {
            this.showNotification('Ungültiger Gutscheincode', 'error');
            return false;
        }
    }

    // Mindestbestellwert prüfen
    checkMinimumOrder(minimum = 15) {
        const total = this.getTotal();
        if (total < minimum) {
            const remaining = minimum - total;
            this.showNotification(
                `Mindestbestellwert: CHF ${minimum.toFixed(2)}. Noch CHF ${remaining.toFixed(2)} bis zur Lieferung.`,
                'error'
            );
            return false;
        }
        return true;
    }

    // Export für Analytics
    exportCartData() {
        return {
            items: this.cart.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity
            })),
            total: this.getTotal(),
            itemCount: this.getItemCount(),
            averageItemValue: this.cart.length > 0 ? this.getTotal() / this.cart.length : 0
        };
    }
}

// Globale Instanz erstellen
const eatechCart = new EatechCart();

// Auto-Update UI wenn sich Cart ändert
eatechCart.addListener(() => {
    eatechCart.updateBadges();
    eatechCart.renderDesktopCart();
    eatechCart.renderMobileCart();
    eatechCart.renderMiniCart();
});

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    eatechCart.updateBadges();
    eatechCart.renderDesktopCart();
    eatechCart.renderMobileCart();
    eatechCart.renderMiniCart();
});

// CSS für Cart-Komponenten (in style.css einfügen)
const cartStyles = `
<style>
/* Cart Item Styles */
.cart-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--darker);
    border-radius: 10px;
    margin-bottom: 0.5rem;
    align-items: center;
    transition: all 0.3s ease;
}

.cart-item:hover {
    transform: translateX(5px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.cart-item-image {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
}

.cart-item-details {
    flex: 1;
}

.cart-item-name {
    font-weight: bold;
    margin-bottom: 0.25rem;
    color: var(--text);
}

.cart-item-quantity {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.quantity-btn.small {
    width: 24px;
    height: 24px;
    font-size: 0.9rem;
}

.cart-item-price {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
}

.remove-btn {
    background: none;
    border: none;
    color: var(--danger);
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.7;
    transition: opacity 0.3s ease;
}

.remove-btn:hover {
    opacity: 1;
}

/* Cart Actions */
.cart-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.cart-action-btn {
    flex: 1;
    padding: 0.75rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.cart-action-btn.secondary {
    background: var(--darker);
    color: var(--text);
}

.cart-action-btn.secondary:hover {
    background: var(--dark);
}

/* Mini Cart Styles */
.mini-cart-btn {
    position: relative;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
}

.mini-cart-icon {
    font-size: 1.5rem;
}

.mini-cart-count {
    position: absolute;
    top: -5px;
    right: -5px;
    background: var(--primary);
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: bold;
}

.mini-cart-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    width: 350px;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    display: none;
    z-index: 100;
}

.mini-cart-dropdown.active {
    display: block;
}

.mini-cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border);
}

.mini-cart-items {
    max-height: 300px;
    overflow-y: auto;
    padding: 1rem;
}

.mini-cart-item {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
}

.mini-cart-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
}

.mini-cart-item img {
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 6px;
}

.mini-item-details {
    flex: 1;
}

.mini-item-name {
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
}

.mini-item-quantity {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.mini-item-price {
    font-weight: 600;
    color: var(--primary);
}

.mini-cart-more {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
    padding: 0.5rem;
}

.mini-cart-footer {
    padding: 1rem;
    border-top: 1px solid var(--border);
}

.mini-cart-total {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    font-size: 1.1rem;
    margin-bottom: 1rem;
}

.mini-checkout-btn {
    width: 100%;
    background: var(--primary);
    color: white;
    border: none;
    padding: 0.75rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.mini-checkout-btn:hover {
    background: var(--primary-dark);
}

.mini-cart-empty {
    padding: 3rem 1rem;
    text-align: center;
    color: var(--text-muted);
}

/* Cart Notification */
.cart-notification {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--success);
    color: white;
    padding: 1rem 2rem;
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    z-index: 1000;
    opacity: 0;
    transition: all 0.3s ease;
    min-width: 300px;
}

.cart-notification.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}

.cart-notification.error {
    background: var(--danger);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.notification-icon {
    font-size: 1.2rem;
}

.notification-message {
    flex: 1;
}

/* Mobile Specific */
@media (max-width: 768px) {
    .mini-cart-dropdown {
        width: 90vw;
        right: 5vw;
        left: 5vw;
    }
    
    .cart-notification {
        bottom: 80px;
        width: 90%;
        min-width: auto;
    }
}
</style>
`;

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EatechCart;
}