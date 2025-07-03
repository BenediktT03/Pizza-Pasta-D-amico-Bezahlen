// Eatech Cart Management System
// Version: 2.0 - Mit Quantity Controls und Special Requests

class CartManager {
    constructor() {
        this.cart = this.loadCart();
        this.init();
    }

    init() {
        // Event Listener für Storage Changes (Tab-Sync)
        window.addEventListener('storage', (e) => {
            if (e.key === 'eatechCart') {
                this.cart = this.loadCart();
                this.updateAllDisplays();
            }
        });

        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.updateAllDisplays());
        } else {
            this.updateAllDisplays();
        }
    }

    // Load cart from localStorage
    loadCart() {
        try {
            return JSON.parse(localStorage.getItem('eatechCart')) || [];
        } catch {
            return [];
        }
    }

    // Save cart to localStorage
    saveCart() {
        localStorage.setItem('eatechCart', JSON.stringify(this.cart));
        this.updateAllDisplays();
    }

    // Add item to cart
    addToCart(productId, productData) {
        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                ...productData,
                id: productId,
                quantity: 1,
                specialRequest: ''
            });
        }
        
        this.saveCart();
        this.showNotification(`${productData.name} wurde hinzugefügt`);
        
        // Vibration feedback on mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }

    // Update item quantity
    updateQuantity(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
            return;
        }
        
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity = newQuantity;
            this.saveCart();
        }
    }

    // Update special request
    updateSpecialRequest(productId, request) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.specialRequest = request;
            this.saveCart();
        }
    }

    // Remove item from cart
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.showNotification('Produkt entfernt', 'info');
    }

    // Clear entire cart
    clearCart() {
        if (confirm('Möchten Sie wirklich den gesamten Warenkorb leeren?')) {
            this.cart = [];
            this.saveCart();
            this.showNotification('Warenkorb geleert', 'info');
        }
    }

    // Get cart totals
    getTotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getItemCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    // Update all displays
    updateAllDisplays() {
        this.updateDesktopCart();
        this.updateMobileCart();
        this.updateBadges();
    }

    // Update desktop cart display
    updateDesktopCart() {
        const container = document.getElementById('cartContent');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="cart-empty">
                    <div class="cart-empty-icon">🛒</div>
                    <p>Ihr Warenkorb ist leer</p>
                </div>
            `;
            return;
        }

        const itemsHtml = this.cart.map(item => this.createCartItemHtml(item)).join('');
        const total = this.getTotal();

        container.innerHTML = `
            <div class="cart-items">${itemsHtml}</div>
            <div class="cart-total">
                <div class="cart-total-row">
                    <span>Zwischensumme:</span>
                    <span>CHF ${total.toFixed(2)}</span>
                </div>
                <div class="cart-total-row final">
                    <span>Gesamt:</span>
                    <span>CHF ${total.toFixed(2)}</span>
                </div>
            </div>
            <button class="checkout-btn" onclick="cartManager.goToCheckout()">
                Zur Kasse (CHF ${total.toFixed(2)})
            </button>
            ${this.cart.length > 3 ? `
                <button class="clear-cart-btn" onclick="cartManager.clearCart()">
                    Warenkorb leeren
                </button>
            ` : ''}
        `;
    }

    // Update mobile cart display
    updateMobileCart() {
        const container = document.getElementById('mobileCartContent');
        if (!container) return;

        // Same content as desktop
        container.innerHTML = document.getElementById('cartContent')?.innerHTML || '';
    }

    // Create cart item HTML
    createCartItemHtml(item) {
        return `
            <div class="cart-item" data-item-id="${item.id}">
                <img src="${item.image || 'https://via.placeholder.com/60x60'}" 
                     alt="${item.name}" 
                     class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">CHF ${item.price.toFixed(2)}</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="cartManager.updateQuantity('${item.id}', ${item.quantity - 1})">
                            -
                        </button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="cartManager.updateQuantity('${item.id}', ${item.quantity + 1})">
                            +
                        </button>
                    </div>
                    <textarea 
                        class="special-request" 
                        placeholder="Spezielle Wünsche (z.B. ohne Zwiebeln)..."
                        rows="2"
                        onchange="cartManager.updateSpecialRequest('${item.id}', this.value)"
                    >${item.specialRequest || ''}</textarea>
                </div>
                <button class="remove-item" onclick="cartManager.removeFromCart('${item.id}')">
                    ×
                </button>
            </div>
        `;
    }

    // Update badges
    updateBadges() {
        const itemCount = this.getItemCount();
        
        // Desktop badge
        const cartBadge = document.querySelector('.cart-badge');
        if (cartBadge) {
            cartBadge.textContent = itemCount;
            cartBadge.style.display = itemCount > 0 ? 'flex' : 'none';
        }

        // Mobile badge
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = itemCount;
            cartCount.style.display = itemCount > 0 ? 'flex' : 'none';
        }

        // Animate badge on update
        [cartBadge, cartCount].forEach(badge => {
            if (badge && itemCount > 0) {
                badge.classList.add('bounce');
                setTimeout(() => badge.classList.remove('bounce'), 600);
            }
        });
    }

    // Show notification
    showNotification(message, type = 'success') {
        // Remove existing notification
        const existing = document.querySelector('.cart-notification');
        if (existing) existing.remove();

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ? '✓' : 'ℹ️'}
                </span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Go to checkout
    goToCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Ihr Warenkorb ist leer', 'error');
            return;
        }

        // Close mobile cart if open
        if (typeof closeMobileCart === 'function') {
            closeMobileCart();
        }

        // Redirect with animation
        document.body.style.opacity = '0';
        setTimeout(() => {
            window.location.href = '/checkout.html';
        }, 300);
    }
}

// Initialize cart manager globally
const cartManager = new CartManager();

// Global functions for onclick handlers
function addToCart(productId) {
    // Get product data from products array (assumes products array exists)
    const product = window.products?.find(p => p.id === productId);
    if (product) {
        cartManager.addToCart(productId, product);
    }
}

function updateQuantity(productId, quantity) {
    cartManager.updateQuantity(productId, quantity);
}

function updateSpecialRequest(productId, request) {
    cartManager.updateSpecialRequest(productId, request);
}

function removeFromCart(productId) {
    cartManager.removeFromCart(productId);
}

function clearCart() {
    cartManager.clearCart();
}

function goToCheckout() {
    cartManager.goToCheckout();
}

// Mobile cart functions
function openMobileCart() {
    document.querySelector('.modal-overlay')?.classList.add('active');
    document.querySelector('.mobile-cart-modal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Update mobile cart content
    cartManager.updateMobileCart();
}

function closeMobileCart() {
    document.querySelector('.modal-overlay')?.classList.remove('active');
    document.querySelector('.mobile-cart-modal')?.classList.remove('active');
    document.body.style.overflow = '';
}

// Add CSS for new features
const style = document.createElement('style');
style.textContent = `
    /* Cart Notification */
    .cart-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ECC71;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 9999;
        max-width: 300px;
    }

    .cart-notification.show {
        transform: translateX(0);
    }

    .cart-notification.error {
        background: #E74C3C;
    }

    .cart-notification.info {
        background: #3498DB;
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .notification-icon {
        font-size: 1.2rem;
    }

    /* Badge Animation */
    @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }

    .cart-badge.bounce,
    .cart-count.bounce {
        animation: bounce 0.6s ease;
    }

    /* Clear Cart Button */
    .clear-cart-btn {
        width: 100%;
        background: transparent;
        color: #E74C3C;
        border: 1px solid #E74C3C;
        padding: 0.75rem;
        border-radius: 8px;
        font-size: 0.9rem;
        cursor: pointer;
        margin-top: 0.5rem;
        transition: all 0.3s ease;
    }

    .clear-cart-btn:hover {
        background: #E74C3C;
        color: white;
    }

    /* Mobile Optimizations */
    @media (max-width: 768px) {
        .cart-notification {
            right: 10px;
            left: 10px;
            max-width: none;
        }

        .special-request {
            font-size: 0.9rem;
        }
    }
`;
document.head.appendChild(style);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartManager;
}