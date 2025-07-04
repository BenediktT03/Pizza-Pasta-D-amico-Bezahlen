/**
 * EATECH - ORDER MANAGEMENT SYSTEM
 * Version: 5.0.0
 * Description: Echtzeit-Bestellverwaltung mit Kitchen Display & Customer Tracking
 * Features: Live Updates, Multi-Channel, Smart Routing, Voice Announcements
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * 
 * 📍 Dateipfad: public/js/order-management.js
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
import { firebaseManager } from './firebase-config.js';
import { soundSystem } from './sound-system.js';
import { voiceCommands } from './voice-commands.js';
import { notificationManager } from './notification-manager.js';
import { analyticsEngine } from './analytics/analytics-engine.js';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const ORDER_CONFIG = {
    version: '5.0.0',
    
    // Order Status Flow
    statusFlow: {
        'new': {
            next: ['confirmed', 'cancelled'],
            color: '#4ECDC4',
            icon: 'fas fa-clock',
            sound: 'newOrder',
            customerMessage: {
                'de-CH': 'Ihre Bestellung wurde empfangen',
                'fr-CH': 'Votre commande a été reçue',
                'it-CH': 'Il tuo ordine è stato ricevuto'
            }
        },
        'confirmed': {
            next: ['preparing', 'cancelled'],
            color: '#45B7AA',
            icon: 'fas fa-check-circle',
            sound: 'orderConfirmed',
            customerMessage: {
                'de-CH': 'Bestellung bestätigt - Zubereitung beginnt gleich',
                'fr-CH': 'Commande confirmée - La préparation commence bientôt',
                'it-CH': 'Ordine confermato - La preparazione inizierà presto'
            }
        },
        'preparing': {
            next: ['ready', 'cancelled'],
            color: '#FF6B6B',
            icon: 'fas fa-fire',
            sound: 'kitchenBell',
            customerMessage: {
                'de-CH': 'Ihre Bestellung wird zubereitet',
                'fr-CH': 'Votre commande est en préparation',
                'it-CH': 'Il tuo ordine è in preparazione'
            }
        },
        'ready': {
            next: ['completed'],
            color: '#00E676',
            icon: 'fas fa-bell',
            sound: 'orderReady',
            announcement: true,
            customerMessage: {
                'de-CH': 'Ihre Bestellung ist bereit zur Abholung!',
                'fr-CH': 'Votre commande est prête!',
                'it-CH': 'Il tuo ordine è pronto!'
            }
        },
        'completed': {
            next: [],
            color: '#9E9E9E',
            icon: 'fas fa-check-double',
            sound: 'orderComplete',
            customerMessage: {
                'de-CH': 'Vielen Dank für Ihre Bestellung!',
                'fr-CH': 'Merci pour votre commande!',
                'it-CH': 'Grazie per il tuo ordine!'
            }
        },
        'cancelled': {
            next: [],
            color: '#F44336',
            icon: 'fas fa-times-circle',
            sound: 'orderCancelled',
            customerMessage: {
                'de-CH': 'Bestellung wurde storniert',
                'fr-CH': 'Commande annulée',
                'it-CH': 'Ordine cancellato'
            }
        }
    },
    
    // Timing Configuration
    timing: {
        defaultPrepTime: 15, // minutes
        rushHourMultiplier: 1.5,
        minPrepTime: 5,
        maxPrepTime: 45,
        
        // Auto-actions
        autoConfirmAfter: 30, // seconds
        autoReadyReminder: 300, // 5 minutes
        autoCancelAfter: 3600, // 1 hour
        
        // Notifications
        notifyBeforeReady: 120, // 2 minutes before
        repeatReadyNotification: 180 // 3 minutes
    },
    
    // Display Settings
    display: {
        itemsPerPage: 20,
        refreshInterval: 5000, // 5 seconds
        animationDuration: 300,
        
        // Kitchen Display
        kitchen: {
            columns: 4,
            autoScroll: true,
            fontSize: 'large',
            showTimer: true,
            alertOldOrders: 600 // 10 minutes
        },
        
        // Customer Display
        customer: {
            showEstimatedTime: true,
            showPosition: true,
            updateInterval: 10000 // 10 seconds
        }
    }
};

// ============================================================================
// ORDER MANAGER CLASS
// ============================================================================
class OrderManager {
    constructor() {
        this.orders = new Map();
        this.activeOrders = new Map();
        this.orderSubscriptions = new Map();
        this.kitchenDisplay = null;
        this.customerDisplay = null;
        this.currentFilter = 'active';
        this.isRushHour = false;
        
        // Performance optimization
        this.updateQueue = [];
        this.batchUpdateTimer = null;
        
        this.init();
    }
    
    /**
     * Initialize Order Management System
     */
    async init() {
        console.log('📦 Initializing EATECH Order Management System...');
        
        try {
            // Setup real-time listeners
            this.setupRealtimeListeners();
            
            // Initialize displays
            this.initializeDisplays();
            
            // Setup auto-actions
            this.setupAutoActions();
            
            // Load active orders
            await this.loadActiveOrders();
            
            // Setup performance monitoring
            this.setupPerformanceMonitoring();
            
            // Initialize order analytics
            this.initializeAnalytics();
            
            console.log('✅ Order Management System initialized');
            
        } catch (error) {
            console.error('❌ Order system initialization failed:', error);
        }
    }
    
    /**
     * Create new order
     */
    async createOrder(orderData) {
        const perfStart = performance.now();
        
        try {
            // Generate order number
            const orderNumber = this.generateOrderNumber();
            
            // Create order object
            const order = {
                id: firebaseManager.ref('orders').push().key,
                number: orderNumber,
                status: 'new',
                items: orderData.items,
                customer: orderData.customer,
                totals: orderData.totals,
                payment: orderData.payment,
                type: orderData.type || 'takeaway',
                notes: orderData.notes || '',
                
                // Timestamps
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                statusHistory: [{
                    status: 'new',
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    by: 'system'
                }],
                
                // Timing
                estimatedReadyTime: this.calculateEstimatedTime(orderData.items),
                actualPrepTime: null,
                
                // Metadata
                deviceInfo: this.getDeviceInfo(),
                source: orderData.source || 'web',
                tenantId: firebaseManager.tenantId
            };
            
            // Validate order
            if (!this.validateOrder(order)) {
                throw new Error('Invalid order data');
            }
            
            // Save to database
            await firebaseManager.ref(`orders/${order.id}`).set(order);
            
            // Add to local cache
            this.orders.set(order.id, order);
            this.activeOrders.set(order.id, order);
            
            // Trigger notifications
            this.notifyNewOrder(order);
            
            // Play sound
            soundSystem.play('newOrder');
            
            // Analytics
            const perfEnd = performance.now();
            analyticsEngine.track('order_created', {
                orderId: order.id,
                orderNumber: orderNumber,
                itemCount: order.items.length,
                total: order.totals.total,
                processingTime: perfEnd - perfStart
            });
            
            return {
                success: true,
                orderId: order.id,
                orderNumber: orderNumber,
                estimatedTime: order.estimatedReadyTime
            };
            
        } catch (error) {
            console.error('Order creation failed:', error);
            throw error;
        }
    }
    
    /**
     * Generate unique order number (6 digits)
     */
    generateOrderNumber() {
        const date = new Date();
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        
        return `${day}${hour}${minute.charAt(0)}${random}`;
    }
    
    /**
     * Update order status
     */
    async updateOrderStatus(orderId, newStatus, metadata = {}) {
        try {
            const order = this.orders.get(orderId);
            if (!order) {
                throw new Error('Order not found');
            }
            
            // Validate status transition
            const currentStatus = order.status;
            const allowedTransitions = ORDER_CONFIG.statusFlow[currentStatus].next;
            
            if (!allowedTransitions.includes(newStatus)) {
                throw new Error(`Invalid status transition: ${currentStatus} → ${newStatus}`);
            }
            
            // Update order
            const updates = {
                status: newStatus,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                [`statusHistory/${order.statusHistory.length}`]: {
                    status: newStatus,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    by: metadata.updatedBy || 'system',
                    note: metadata.note
                }
            };
            
            // Special handling for 'ready' status
            if (newStatus === 'ready') {
                updates.actualPrepTime = Date.now() - order.createdAt;
                updates.readyAt = firebase.database.ServerValue.TIMESTAMP;
            }
            
            // Special handling for 'completed' status
            if (newStatus === 'completed') {
                updates.completedAt = firebase.database.ServerValue.TIMESTAMP;
                updates.pickupTime = Date.now() - order.readyAt;
            }
            
            // Update in database
            await firebaseManager.ref(`orders/${orderId}`).update(updates);
            
            // Update local cache
            Object.assign(order, updates);
            order.status = newStatus;
            
            // Handle status-specific actions
            await this.handleStatusChange(order, currentStatus, newStatus);
            
            // Analytics
            analyticsEngine.track('order_status_updated', {
                orderId: orderId,
                fromStatus: currentStatus,
                toStatus: newStatus,
                duration: Date.now() - order.createdAt
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Status update failed:', error);
            throw error;
        }
    }
    
    /**
     * Handle status-specific actions
     */
    async handleStatusChange(order, fromStatus, toStatus) {
        const statusConfig = ORDER_CONFIG.statusFlow[toStatus];
        
        // Play status sound
        if (statusConfig.sound) {
            soundSystem.play(statusConfig.sound);
        }
        
        // Send customer notification
        await this.notifyCustomer(order, toStatus);
        
        // Voice announcement for ready orders
        if (toStatus === 'ready' && statusConfig.announcement) {
            this.announceOrderReady(order);
        }
        
        // Remove from active orders if completed/cancelled
        if (toStatus === 'completed' || toStatus === 'cancelled') {
            this.activeOrders.delete(order.id);
        }
        
        // Update displays
        this.updateDisplays();
        
        // Trigger webhooks
        await this.triggerWebhooks(order, toStatus);
    }
    
    /**
     * Calculate estimated preparation time
     */
    calculateEstimatedTime(items) {
        let baseTime = 0;
        
        // Calculate base time from items
        items.forEach(item => {
            const itemTime = this.getItemPrepTime(item);
            baseTime = Math.max(baseTime, itemTime);
        });
        
        // Apply rush hour multiplier
        if (this.isRushHour) {
            baseTime *= ORDER_CONFIG.timing.rushHourMultiplier;
        }
        
        // Add current queue time
        const queueTime = this.calculateQueueTime();
        baseTime += queueTime;
        
        // Apply limits
        baseTime = Math.max(ORDER_CONFIG.timing.minPrepTime, baseTime);
        baseTime = Math.min(ORDER_CONFIG.timing.maxPrepTime, baseTime);
        
        // Round to 5 minutes
        return Math.ceil(baseTime / 5) * 5;
    }
    
    /**
     * Real-time order tracking for customers
     */
    trackOrder(orderNumber, callbacks) {
        // Find order by number
        const order = Array.from(this.orders.values())
            .find(o => o.number === orderNumber);
        
        if (!order) {
            callbacks.onError?.('Order not found');
            return null;
        }
        
        // Create subscription
        const subscription = firebaseManager.ref(`orders/${order.id}`)
            .on('value', snapshot => {
                const updatedOrder = snapshot.val();
                if (!updatedOrder) return;
                
                // Update local cache
                this.orders.set(order.id, updatedOrder);
                
                // Calculate position in queue
                const position = this.calculateQueuePosition(order.id);
                
                // Estimate remaining time
                const remainingTime = this.estimateRemainingTime(updatedOrder);
                
                // Trigger callbacks
                callbacks.onUpdate?.({
                    order: updatedOrder,
                    position: position,
                    remainingTime: remainingTime,
                    statusConfig: ORDER_CONFIG.statusFlow[updatedOrder.status]
                });
                
                // Special callbacks for status changes
                if (updatedOrder.status === 'ready') {
                    callbacks.onReady?.(updatedOrder);
                }
                
                if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
                    callbacks.onComplete?.(updatedOrder);
                    // Unsubscribe
                    firebaseManager.ref(`orders/${order.id}`).off('value', subscription);
                }
            });
        
        // Store subscription
        this.orderSubscriptions.set(orderNumber, subscription);
        
        // Return unsubscribe function
        return () => {
            firebaseManager.ref(`orders/${order.id}`).off('value', subscription);
            this.orderSubscriptions.delete(orderNumber);
        };
    }
    
    /**
     * Kitchen Display System
     */
    initializeKitchenDisplay() {
        this.kitchenDisplay = new KitchenDisplay(this);
        return this.kitchenDisplay;
    }
    
    /**
     * Voice announcement for ready orders
     */
    announceOrderReady(order) {
        // Multi-language announcement
        const announcements = [
            { lang: 'de-CH', text: `Bestellung Nummer ${order.number} ist bereit zur Abholung.` },
            { lang: 'fr-CH', text: `Commande numéro ${order.number} est prête.` },
            { lang: 'it-CH', text: `Ordine numero ${order.number} è pronto.` }
        ];
        
        // Play attention sound
        soundSystem.play('orderReadyChime');
        
        // Sequential voice announcements
        let delay = 1000;
        announcements.forEach(announcement => {
            setTimeout(() => {
                voiceCommands.speak(announcement.text, { 
                    lang: announcement.lang,
                    volume: 1.0,
                    rate: 0.9
                });
            }, delay);
            delay += 3000;
        });
        
        // Visual alert
        this.showReadyAlert(order);
    }
    
    /**
     * Batch update optimization
     */
    queueUpdate(updateFn) {
        this.updateQueue.push(updateFn);
        
        // Debounce batch updates
        if (this.batchUpdateTimer) {
            clearTimeout(this.batchUpdateTimer);
        }
        
        this.batchUpdateTimer = setTimeout(() => {
            this.processBatchUpdates();
        }, 100);
    }
    
    processBatchUpdates() {
        const updates = this.updateQueue.splice(0);
        
        // Process all queued updates
        updates.forEach(update => update());
        
        // Update UI once
        this.updateDisplays();
    }
    
    /**
     * Analytics and reporting
     */
    async generateOrderReport(dateRange) {
        const report = {
            period: dateRange,
            metrics: {
                totalOrders: 0,
                completedOrders: 0,
                cancelledOrders: 0,
                averagePrepTime: 0,
                averageWaitTime: 0,
                peakHours: [],
                popularItems: [],
                revenue: {
                    total: 0,
                    byPaymentMethod: {},
                    byOrderType: {}
                }
            },
            performance: {
                onTimeRate: 0,
                customerSatisfaction: 0,
                kitchenEfficiency: 0
            }
        };
        
        // Analyze orders in date range
        const orders = await this.getOrdersInRange(dateRange);
        
        orders.forEach(order => {
            report.metrics.totalOrders++;
            
            if (order.status === 'completed') {
                report.metrics.completedOrders++;
                report.metrics.revenue.total += order.totals.total;
                
                // Calculate prep time
                if (order.actualPrepTime) {
                    report.metrics.averagePrepTime += order.actualPrepTime;
                }
            }
            
            if (order.status === 'cancelled') {
                report.metrics.cancelledOrders++;
            }
        });
        
        // Calculate averages
        if (report.metrics.completedOrders > 0) {
            report.metrics.averagePrepTime /= report.metrics.completedOrders;
        }
        
        // Calculate performance metrics
        report.performance.onTimeRate = this.calculateOnTimeRate(orders);
        report.performance.kitchenEfficiency = this.calculateKitchenEfficiency(orders);
        
        return report;
    }
}

// ============================================================================
// KITCHEN DISPLAY COMPONENT
// ============================================================================
class KitchenDisplay {
    constructor(orderManager) {
        this.orderManager = orderManager;
        this.displayElement = null;
        this.updateInterval = null;
        this.audioEnabled = true;
        this.currentView = 'grid';
        
        this.init();
    }
    
    init() {
        this.render();
        this.startAutoUpdate();
        this.setupEventListeners();
    }
    
    render() {
        this.displayElement = document.createElement('div');
        this.displayElement.className = 'kitchen-display';
        this.displayElement.innerHTML = `
            <div class="kitchen-header">
                <h1>Kitchen Display System</h1>
                <div class="kitchen-controls">
                    <button onclick="this.toggleView()" class="btn-view">
                        <i class="fas fa-th"></i> View
                    </button>
                    <button onclick="this.toggleSound()" class="btn-sound">
                        <i class="fas fa-volume-up"></i> Sound
                    </button>
                    <div class="kitchen-stats">
                        <span class="stat">
                            <i class="fas fa-fire"></i>
                            <span id="activeOrders">0</span> Active
                        </span>
                        <span class="stat">
                            <i class="fas fa-clock"></i>
                            <span id="avgTime">0</span> min avg
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="kitchen-orders" id="kitchenOrders">
                <!-- Orders will be rendered here -->
            </div>
        `;
        
        // Add styles
        this.addStyles();
    }
    
    updateDisplay() {
        const ordersContainer = document.getElementById('kitchenOrders');
        if (!ordersContainer) return;
        
        // Get active orders
        const activeOrders = Array.from(this.orderManager.activeOrders.values())
            .filter(order => ['confirmed', 'preparing'].includes(order.status))
            .sort((a, b) => a.createdAt - b.createdAt);
        
        // Clear and render
        ordersContainer.innerHTML = '';
        
        activeOrders.forEach(order => {
            const orderCard = this.createOrderCard(order);
            ordersContainer.appendChild(orderCard);
        });
        
        // Update stats
        this.updateStats(activeOrders);
        
        // Alert for old orders
        this.checkOldOrders(activeOrders);
    }
    
    createOrderCard(order) {
        const card = document.createElement('div');
        card.className = `kitchen-order-card status-${order.status}`;
        card.dataset.orderId = order.id;
        
        // Calculate elapsed time
        const elapsedMinutes = Math.floor((Date.now() - order.createdAt) / 60000);
        const isUrgent = elapsedMinutes > 10;
        
        if (isUrgent) {
            card.classList.add('urgent');
        }
        
        card.innerHTML = `
            <div class="order-header">
                <h3 class="order-number">#${order.number}</h3>
                <span class="order-time ${isUrgent ? 'urgent' : ''}">
                    <i class="fas fa-clock"></i> ${elapsedMinutes} min
                </span>
            </div>
            
            <div class="order-type">
                <span class="badge badge-${order.type}">
                    ${order.type === 'delivery' ? '🚚' : '🛍️'} ${order.type}
                </span>
            </div>
            
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span class="item-quantity">${item.quantity}x</span>
                        <span class="item-name">${item.name}</span>
                        ${item.modifications ? `
                            <div class="item-mods">${item.modifications.join(', ')}</div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            ${order.notes ? `
                <div class="order-notes">
                    <i class="fas fa-sticky-note"></i> ${order.notes}
                </div>
            ` : ''}
            
            <div class="order-actions">
                <button onclick="orderManager.updateOrderStatus('${order.id}', 'preparing')" 
                        class="btn-status btn-preparing" 
                        ${order.status === 'preparing' ? 'disabled' : ''}>
                    <i class="fas fa-fire"></i> Start
                </button>
                <button onclick="orderManager.updateOrderStatus('${order.id}', 'ready')" 
                        class="btn-status btn-ready">
                    <i class="fas fa-check"></i> Ready
                </button>
            </div>
        `;
        
        // Add click handler for details
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.order-actions')) {
                this.showOrderDetails(order);
            }
        });
        
        return card;
    }
    
    checkOldOrders(orders) {
        const urgentOrders = orders.filter(order => {
            const elapsed = (Date.now() - order.createdAt) / 60000;
            return elapsed > ORDER_CONFIG.display.kitchen.alertOldOrders / 60;
        });
        
        if (urgentOrders.length > 0 && this.audioEnabled) {
            soundSystem.play('urgentAlert');
        }
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .kitchen-display {
                background: #1a1a1a;
                color: white;
                min-height: 100vh;
                padding: 1rem;
                font-family: -apple-system, sans-serif;
            }
            
            .kitchen-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                padding: 1rem;
                background: #2a2a2a;
                border-radius: 1rem;
            }
            
            .kitchen-controls {
                display: flex;
                gap: 1rem;
                align-items: center;
            }
            
            .kitchen-stats {
                display: flex;
                gap: 2rem;
                margin-left: 2rem;
            }
            
            .stat {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.1rem;
            }
            
            .kitchen-orders {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 1.5rem;
            }
            
            .kitchen-order-card {
                background: #2a2a2a;
                border-radius: 1rem;
                padding: 1.5rem;
                border: 2px solid transparent;
                transition: all 0.3s ease;
            }
            
            .kitchen-order-card.status-confirmed {
                border-color: #4ECDC4;
            }
            
            .kitchen-order-card.status-preparing {
                border-color: #FF6B6B;
                animation: pulse 2s infinite;
            }
            
            .kitchen-order-card.urgent {
                border-color: #FF5252;
                animation: urgent-pulse 1s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
            
            @keyframes urgent-pulse {
                0%, 100% { 
                    border-color: #FF5252;
                    box-shadow: 0 0 20px rgba(255, 82, 82, 0.5);
                }
                50% { 
                    border-color: #FF8A80;
                    box-shadow: 0 0 30px rgba(255, 82, 82, 0.8);
                }
            }
            
            .order-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .order-number {
                font-size: 1.5rem;
                margin: 0;
            }
            
            .order-time {
                font-size: 1.1rem;
                color: #4ECDC4;
            }
            
            .order-time.urgent {
                color: #FF5252;
                font-weight: bold;
            }
            
            .order-type {
                margin-bottom: 1rem;
            }
            
            .badge {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                border-radius: 2rem;
                font-size: 0.875rem;
                background: #3a3a3a;
            }
            
            .badge-delivery {
                background: #FF6B6B;
                color: white;
            }
            
            .badge-takeaway {
                background: #4ECDC4;
                color: white;
            }
            
            .order-items {
                margin-bottom: 1rem;
            }
            
            .order-item {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
                font-size: 1.1rem;
            }
            
            .item-quantity {
                font-weight: bold;
                color: #FFE66D;
                min-width: 30px;
            }
            
            .item-mods {
                margin-left: 35px;
                font-size: 0.9rem;
                color: #999;
                font-style: italic;
            }
            
            .order-notes {
                background: #3a3a3a;
                padding: 0.75rem;
                border-radius: 0.5rem;
                margin-bottom: 1rem;
                font-size: 0.9rem;
                color: #FFE66D;
            }
            
            .order-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .btn-status {
                flex: 1;
                padding: 0.75rem;
                border: none;
                border-radius: 0.5rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .btn-preparing {
                background: #FF6B6B;
                color: white;
            }
            
            .btn-preparing:hover:not(:disabled) {
                background: #FF5252;
                transform: translateY(-2px);
            }
            
            .btn-ready {
                background: #00E676;
                color: white;
            }
            
            .btn-ready:hover {
                background: #00C853;
                transform: translateY(-2px);
            }
            
            .btn-status:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================================================
// CUSTOMER DISPLAY COMPONENT
// ============================================================================
class CustomerDisplay {
    constructor(orderManager) {
        this.orderManager = orderManager;
        this.displayElement = null;
        this.currentOrders = new Map();
        
        this.init();
    }
    
    init() {
        this.render();
        this.startUpdates();
    }
    
    render() {
        this.displayElement = document.createElement('div');
        this.displayElement.className = 'customer-display';
        this.displayElement.innerHTML = `
            <div class="display-header">
                <h1>Bestellstatus</h1>
                <div class="display-time">
                    <i class="fas fa-clock"></i>
                    <span id="currentTime"></span>
                </div>
            </div>
            
            <div class="display-sections">
                <div class="display-section preparing">
                    <h2><i class="fas fa-fire"></i> In Zubereitung</h2>
                    <div class="order-list" id="preparingOrders"></div>
                </div>
                
                <div class="display-section ready">
                    <h2><i class="fas fa-check-circle"></i> Bereit zur Abholung</h2>
                    <div class="order-list" id="readyOrders"></div>
                </div>
            </div>
            
            <div class="display-footer">
                <div class="ticker" id="infoTicker">
                    <!-- Info messages -->
                </div>
            </div>
        `;
        
        this.addCustomerDisplayStyles();
    }
    
    updateDisplay() {
        // Group orders by status
        const preparing = [];
        const ready = [];
        
        this.orderManager.activeOrders.forEach(order => {
            if (order.status === 'confirmed' || order.status === 'preparing') {
                preparing.push(order);
            } else if (order.status === 'ready') {
                ready.push(order);
            }
        });
        
        // Update sections
        this.updateSection('preparingOrders', preparing, 'preparing');
        this.updateSection('readyOrders', ready, 'ready');
        
        // Update time
        document.getElementById('currentTime').textContent = 
            new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    }
    
    updateSection(elementId, orders, status) {
        const container = document.getElementById(elementId);
        if (!container) return;
        
        container.innerHTML = orders.map(order => `
            <div class="display-order ${status}" data-order="${order.number}">
                <div class="order-number">${order.number}</div>
                ${status === 'preparing' ? `
                    <div class="order-progress">
                        <div class="progress-bar" style="width: ${this.calculateProgress(order)}%"></div>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        // Animate new orders
        orders.forEach(order => {
            if (!this.currentOrders.has(order.number)) {
                const element = container.querySelector(`[data-order="${order.number}"]`);
                element?.classList.add('new-order');
                this.currentOrders.set(order.number, order);
            }
        });
    }
    
    calculateProgress(order) {
        const elapsed = Date.now() - order.createdAt;
        const estimated = order.estimatedReadyTime * 60000;
        return Math.min(100, Math.round((elapsed / estimated) * 100));
    }
    
    addCustomerDisplayStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .customer-display {
                background: linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%);
                color: white;
                min-height: 100vh;
                padding: 2rem;
                font-family: -apple-system, sans-serif;
            }
            
            .display-header {
                text-align: center;
                margin-bottom: 3rem;
            }
            
            .display-header h1 {
                font-size: 3rem;
                margin-bottom: 1rem;
                background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .display-time {
                font-size: 2rem;
                color: #4ECDC4;
            }
            
            .display-sections {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 3rem;
                margin-bottom: 3rem;
            }
            
            .display-section {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 2rem;
                padding: 2rem;
                backdrop-filter: blur(10px);
            }
            
            .display-section h2 {
                margin-bottom: 2rem;
                font-size: 1.5rem;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .display-section.preparing h2 {
                color: #FF6B6B;
            }
            
            .display-section.ready h2 {
                color: #00E676;
            }
            
            .order-list {
                display: grid;
                gap: 1rem;
            }
            
            .display-order {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 1rem;
                padding: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                transition: all 0.5s ease;
            }
            
            .display-order.new-order {
                animation: slideIn 0.5s ease;
            }
            
            .display-order.ready {
                background: rgba(0, 230, 118, 0.2);
                border: 2px solid #00E676;
                animation: pulse-ready 2s infinite;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes pulse-ready {
                0%, 100% {
                    transform: scale(1);
                    box-shadow: 0 0 20px rgba(0, 230, 118, 0.5);
                }
                50% {
                    transform: scale(1.02);
                    box-shadow: 0 0 30px rgba(0, 230, 118, 0.8);
                }
            }
            
            .order-number {
                font-size: 3rem;
                font-weight: bold;
            }
            
            .order-progress {
                flex: 1;
                height: 10px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 5px;
                margin-left: 2rem;
                overflow: hidden;
            }
            
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #4ECDC4 0%, #44A08D 100%);
                transition: width 1s ease;
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================================================
// EXPORT & INITIALIZATION
// ============================================================================

// Create singleton instance
const orderManager = new OrderManager();

// Export for use
export { orderManager, KitchenDisplay, CustomerDisplay };

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
    window.EATECH_ORDERS = orderManager;
    
    // Make available globally for easy access
    window.orderManager = orderManager;
}