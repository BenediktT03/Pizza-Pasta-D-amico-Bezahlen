/**
 * EATECH - ADMIN DASHBOARD UI COMPONENTS
 * Version: 5.0.0
 * Description: Real-time Admin Dashboard with Live Metrics & Controls
 * Features: Live Updates, Interactive Charts, Drag & Drop, Voice Control
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * 
 * 📍 Dateipfad: public/js/admin-dashboard-ui.js
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
import { firebaseManager } from './firebase-config.js';
import { orderManager } from './order-management.js';
import { analyticsEngine } from './analytics/analytics-engine.js';
import { notificationManager } from './notification-manager.js';
import { voiceCommands } from './voice-commands.js';
import { Chart } from 'chart.js';
import { Sortable } from 'sortablejs';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const DASHBOARD_CONFIG = {
    version: '5.0.0',
    
    // Update intervals
    updateIntervals: {
        realtime: 5000,      // 5 seconds
        metrics: 30000,      // 30 seconds
        charts: 60000,       // 1 minute
        analytics: 300000    // 5 minutes
    },
    
    // Chart configurations
    charts: {
        theme: {
            dark: {
                grid: 'rgba(255, 255, 255, 0.1)',
                text: '#FFFFFF',
                background: 'rgba(26, 26, 26, 0.8)'
            },
            light: {
                grid: 'rgba(0, 0, 0, 0.1)',
                text: '#333333',
                background: 'rgba(255, 255, 255, 0.9)'
            }
        },
        colors: {
            primary: '#FF6B6B',
            secondary: '#4ECDC4',
            accent: '#FFE66D',
            success: '#00E676',
            warning: '#FFC107',
            danger: '#F44336',
            series: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#00E676', '#9C27B0', '#FF5722']
        }
    },
    
    // Widget configurations
    widgets: {
        layout: {
            desktop: { columns: 4, rows: 3 },
            tablet: { columns: 2, rows: 4 },
            mobile: { columns: 1, rows: 6 }
        },
        available: [
            'revenue', 'orders', 'customers', 'efficiency',
            'realtimeOrders', 'salesChart', 'productRanking',
            'customerMap', 'staffSchedule', 'inventory',
            'notifications', 'weather', 'competitors'
        ]
    },
    
    // Notification priorities
    alerts: {
        critical: {
            sound: 'alert-critical',
            vibrate: [500, 250, 500],
            requireAction: true
        },
        warning: {
            sound: 'alert-warning',
            vibrate: [200, 100, 200]
        },
        info: {
            sound: 'notification',
            vibrate: [100]
        }
    }
};

// ============================================================================
// ADMIN DASHBOARD CLASS
// ============================================================================
class AdminDashboard {
    constructor() {
        this.widgets = new Map();
        this.charts = new Map();
        this.updateTimers = new Map();
        this.theme = localStorage.getItem('adminTheme') || 'dark';
        this.layout = this.loadLayout();
        this.filters = {
            dateRange: 'today',
            location: 'all',
            category: 'all'
        };
        
        this.init();
    }
    
    /**
     * Initialize dashboard
     */
    async init() {
        console.log('📊 Initializing EATECH Admin Dashboard...');
        
        try {
            // Setup theme
            this.applyTheme(this.theme);
            
            // Load user preferences
            await this.loadUserPreferences();
            
            // Initialize widgets
            this.initializeWidgets();
            
            // Setup real-time listeners
            this.setupRealtimeListeners();
            
            // Initialize charts
            this.initializeCharts();
            
            // Setup voice commands
            this.setupVoiceCommands();
            
            // Start updates
            this.startUpdates();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            console.log('✅ Admin Dashboard initialized');
            
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
        }
    }
    
    /**
     * Initialize widgets
     */
    initializeWidgets() {
        // Create widget instances
        this.widgets.set('revenue', new RevenueWidget(this));
        this.widgets.set('orders', new OrdersWidget(this));
        this.widgets.set('customers', new CustomersWidget(this));
        this.widgets.set('efficiency', new EfficiencyWidget(this));
        this.widgets.set('realtimeOrders', new RealtimeOrdersWidget(this));
        this.widgets.set('salesChart', new SalesChartWidget(this));
        this.widgets.set('productRanking', new ProductRankingWidget(this));
        this.widgets.set('notifications', new NotificationsWidget(this));
        
        // Render widgets based on layout
        this.renderDashboard();
    }
    
    /**
     * Render dashboard layout
     */
    renderDashboard() {
        const container = document.getElementById('dashboardContainer');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create grid container
        const grid = document.createElement('div');
        grid.className = 'dashboard-grid';
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${this.getGridColumns()}, 1fr);
            gap: 1.5rem;
            padding: 1.5rem;
        `;
        
        // Render widgets based on layout
        this.layout.forEach(widgetConfig => {
            const widget = this.widgets.get(widgetConfig.type);
            if (widget) {
                const element = widget.render();
                element.style.gridColumn = `span ${widgetConfig.width || 1}`;
                element.style.gridRow = `span ${widgetConfig.height || 1}`;
                grid.appendChild(element);
            }
        });
        
        container.appendChild(grid);
        
        // Make grid sortable
        this.makeGridSortable(grid);
    }
    
    /**
     * Make grid sortable with drag & drop
     */
    makeGridSortable(grid) {
        new Sortable(grid, {
            animation: 150,
            handle: '.widget-header',
            ghostClass: 'widget-ghost',
            chosenClass: 'widget-chosen',
            dragClass: 'widget-drag',
            
            onEnd: (evt) => {
                // Update layout
                this.updateLayout();
                this.saveLayout();
            }
        });
    }
    
    /**
     * Setup real-time listeners
     */
    setupRealtimeListeners() {
        // Orders listener
        firebaseManager.ref('orders')
            .orderByChild('status')
            .equalTo('new')
            .on('child_added', (snapshot) => {
                this.handleNewOrder(snapshot.val());
            });
        
        // Metrics listener
        firebaseManager.ref('analytics/realtime')
            .on('value', (snapshot) => {
                this.updateRealtimeMetrics(snapshot.val());
            });
        
        // Alerts listener
        firebaseManager.ref('alerts')
            .orderByChild('timestamp')
            .startAt(Date.now())
            .on('child_added', (snapshot) => {
                this.handleAlert(snapshot.val());
            });
    }
    
    /**
     * Handle new order notification
     */
    handleNewOrder(order) {
        // Update order widget
        const ordersWidget = this.widgets.get('orders');
        ordersWidget?.addNewOrder(order);
        
        // Show notification
        this.showNotification({
            title: 'Neue Bestellung',
            message: `Bestellung #${order.number} von ${order.customer.name}`,
            type: 'info',
            actions: [
                { label: 'Anzeigen', action: () => this.viewOrder(order) },
                { label: 'Bestätigen', action: () => this.confirmOrder(order) }
            ]
        });
        
        // Play sound
        this.playSound('new-order');
    }
    
    /**
     * Get grid columns based on device
     */
    getGridColumns() {
        const width = window.innerWidth;
        if (width < 768) return DASHBOARD_CONFIG.widgets.layout.mobile.columns;
        if (width < 1200) return DASHBOARD_CONFIG.widgets.layout.tablet.columns;
        return DASHBOARD_CONFIG.widgets.layout.desktop.columns;
    }
    
    /**
     * Load saved layout
     */
    loadLayout() {
        const saved = localStorage.getItem('dashboardLayout');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Default layout
        return [
            { type: 'revenue', width: 1, height: 1 },
            { type: 'orders', width: 1, height: 1 },
            { type: 'customers', width: 1, height: 1 },
            { type: 'efficiency', width: 1, height: 1 },
            { type: 'realtimeOrders', width: 2, height: 2 },
            { type: 'salesChart', width: 2, height: 2 },
            { type: 'productRanking', width: 1, height: 2 },
            { type: 'notifications', width: 1, height: 1 }
        ];
    }
}

// ============================================================================
// BASE WIDGET CLASS
// ============================================================================
class BaseWidget {
    constructor(dashboard, config = {}) {
        this.dashboard = dashboard;
        this.config = config;
        this.element = null;
        this.data = null;
        this.updateTimer = null;
    }
    
    /**
     * Render widget
     */
    render() {
        this.element = document.createElement('div');
        this.element.className = `dashboard-widget widget-${this.config.type || 'default'}`;
        this.element.innerHTML = this.getTemplate();
        
        this.attachEventListeners();
        this.update();
        
        return this.element;
    }
    
    /**
     * Get widget template
     */
    getTemplate() {
        return `
            <div class="widget-header">
                <h3 class="widget-title">${this.config.title || 'Widget'}</h3>
                <div class="widget-actions">
                    <button class="widget-action" data-action="refresh">
                        <i class="fas fa-sync"></i>
                    </button>
                    <button class="widget-action" data-action="expand">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            </div>
            <div class="widget-body">
                <div class="widget-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
            </div>
        `;
    }
    
    /**
     * Update widget data
     */
    async update() {
        try {
            this.showLoading();
            this.data = await this.fetchData();
            this.renderContent();
            this.hideLoading();
        } catch (error) {
            console.error(`Widget update error:`, error);
            this.showError();
        }
    }
    
    /**
     * Fetch widget data - to be overridden
     */
    async fetchData() {
        return null;
    }
    
    /**
     * Render widget content - to be overridden
     */
    renderContent() {
        // Override in subclasses
    }
    
    /**
     * Show loading state
     */
    showLoading() {
        this.element.classList.add('loading');
    }
    
    /**
     * Hide loading state
     */
    hideLoading() {
        this.element.classList.remove('loading');
    }
    
    /**
     * Show error state
     */
    showError() {
        const body = this.element.querySelector('.widget-body');
        body.innerHTML = `
            <div class="widget-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Fehler beim Laden</p>
                <button onclick="this.closest('.dashboard-widget').widget.update()">
                    Erneut versuchen
                </button>
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Store widget reference
        this.element.widget = this;
        
        // Action buttons
        this.element.querySelectorAll('.widget-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAction(action);
            });
        });
    }
    
    /**
     * Handle widget actions
     */
    handleAction(action) {
        switch (action) {
            case 'refresh':
                this.update();
                break;
            case 'expand':
                this.expand();
                break;
            case 'settings':
                this.showSettings();
                break;
        }
    }
    
    /**
     * Expand widget to fullscreen
     */
    expand() {
        this.element.classList.toggle('expanded');
        
        if (this.element.classList.contains('expanded')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

// ============================================================================
// REVENUE WIDGET
// ============================================================================
class RevenueWidget extends BaseWidget {
    constructor(dashboard) {
        super(dashboard, {
            type: 'revenue',
            title: 'Umsatz',
            icon: '💰',
            updateInterval: 30000
        });
    }
    
    async fetchData() {
        const metrics = await analyticsEngine.getRealtimeMetrics();
        return {
            today: metrics.business.revenue.today,
            hour: metrics.business.revenue.hour,
            growth: metrics.business.revenue.growth,
            target: 5000,
            history: await this.getRevenueHistory()
        };
    }
    
    renderContent() {
        const body = this.element.querySelector('.widget-body');
        const progress = (this.data.today / this.data.target) * 100;
        
        body.innerHTML = `
            <div class="metric-value">
                <span class="currency">CHF</span>
                <span class="amount">${this.formatCurrency(this.data.today)}</span>
            </div>
            
            <div class="metric-change ${this.data.growth >= 0 ? 'positive' : 'negative'}">
                <i class="fas fa-arrow-${this.data.growth >= 0 ? 'up' : 'down'}"></i>
                ${Math.abs(this.data.growth)}%
            </div>
            
            <div class="metric-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                </div>
                <div class="progress-label">
                    ${progress.toFixed(1)}% vom Tagesziel
                </div>
            </div>
            
            <canvas id="revenue-sparkline" height="60"></canvas>
        `;
        
        // Render sparkline
        this.renderSparkline();
    }
    
    renderSparkline() {
        const canvas = this.element.querySelector('#revenue-sparkline');
        if (!canvas || !this.data.history) return;
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.history.map(h => h.hour),
                datasets: [{
                    data: this.data.history.map(h => h.revenue),
                    borderColor: DASHBOARD_CONFIG.charts.colors.primary,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }
    
    formatCurrency(amount) {
        return amount.toLocaleString('de-CH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    async getRevenueHistory() {
        // Get last 24 hours of revenue data
        const hours = [];
        const now = new Date();
        
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now - i * 60 * 60 * 1000);
            hours.push({
                hour: hour.getHours(),
                revenue: Math.random() * 500 + 100 // Replace with real data
            });
        }
        
        return hours;
    }
}

// ============================================================================
// ORDERS WIDGET
// ============================================================================
class OrdersWidget extends BaseWidget {
    constructor(dashboard) {
        super(dashboard, {
            type: 'orders',
            title: 'Bestellungen',
            icon: '📦',
            updateInterval: 5000
        });
        
        this.orderCounts = {
            new: 0,
            preparing: 0,
            ready: 0,
            total: 0
        };
    }
    
    async fetchData() {
        const orders = await orderManager.getActiveOrders();
        
        // Count by status
        this.orderCounts = {
            new: 0,
            preparing: 0,
            ready: 0,
            total: orders.length
        };
        
        orders.forEach(order => {
            if (this.orderCounts.hasOwnProperty(order.status)) {
                this.orderCounts[order.status]++;
            }
        });
        
        return this.orderCounts;
    }
    
    renderContent() {
        const body = this.element.querySelector('.widget-body');
        
        body.innerHTML = `
            <div class="order-stats">
                <div class="order-stat new">
                    <div class="stat-icon">🆕</div>
                    <div class="stat-value">${this.orderCounts.new}</div>
                    <div class="stat-label">Neu</div>
                </div>
                
                <div class="order-stat preparing">
                    <div class="stat-icon">👨‍🍳</div>
                    <div class="stat-value">${this.orderCounts.preparing}</div>
                    <div class="stat-label">In Arbeit</div>
                </div>
                
                <div class="order-stat ready">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value">${this.orderCounts.ready}</div>
                    <div class="stat-label">Bereit</div>
                </div>
            </div>
            
            <div class="total-orders">
                <span class="total-label">Gesamt aktiv:</span>
                <span class="total-value">${this.orderCounts.total}</span>
            </div>
            
            <button class="widget-cta" onclick="location.href='/admin/orders'">
                Alle Bestellungen →
            </button>
        `;
        
        // Add pulse animation for new orders
        if (this.orderCounts.new > 0) {
            this.element.querySelector('.order-stat.new').classList.add('pulse');
        }
    }
    
    addNewOrder(order) {
        this.orderCounts.new++;
        this.orderCounts.total++;
        this.renderContent();
        
        // Animate addition
        this.element.classList.add('highlight');
        setTimeout(() => this.element.classList.remove('highlight'), 1000);
    }
}

// ============================================================================
// REALTIME ORDERS WIDGET
// ============================================================================
class RealtimeOrdersWidget extends BaseWidget {
    constructor(dashboard) {
        super(dashboard, {
            type: 'realtime-orders',
            title: 'Live Bestellungen',
            icon: '🔴',
            updateInterval: 5000
        });
        
        this.orders = new Map();
    }
    
    async fetchData() {
        return orderManager.getActiveOrders();
    }
    
    renderContent() {
        const body = this.element.querySelector('.widget-body');
        
        body.innerHTML = `
            <div class="orders-list">
                ${this.data.map(order => this.renderOrderCard(order)).join('')}
            </div>
        `;
        
        // Make orders draggable for status updates
        this.makeOrdersDraggable();
    }
    
    renderOrderCard(order) {
        const elapsed = Math.floor((Date.now() - order.createdAt) / 60000);
        const isUrgent = elapsed > 15;
        
        return `
            <div class="order-card status-${order.status} ${isUrgent ? 'urgent' : ''}" 
                 data-order-id="${order.id}"
                 draggable="true">
                <div class="order-header">
                    <span class="order-number">#${order.number}</span>
                    <span class="order-time">
                        <i class="fas fa-clock"></i> ${elapsed} min
                    </span>
                </div>
                
                <div class="order-customer">
                    <i class="fas fa-user"></i> ${order.customer.name}
                </div>
                
                <div class="order-items">
                    ${order.items.slice(0, 2).map(item => 
                        `<div class="item">${item.quantity}x ${item.name}</div>`
                    ).join('')}
                    ${order.items.length > 2 ? 
                        `<div class="item more">+${order.items.length - 2} weitere</div>` : 
                        ''
                    }
                </div>
                
                <div class="order-actions">
                    <button class="action-btn" onclick="adminDashboard.updateOrderStatus('${order.id}', 'preparing')">
                        <i class="fas fa-fire"></i>
                    </button>
                    <button class="action-btn" onclick="adminDashboard.updateOrderStatus('${order.id}', 'ready')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn" onclick="adminDashboard.viewOrder('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    makeOrdersDraggable() {
        const cards = this.element.querySelectorAll('.order-card');
        
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('orderId', card.dataset.orderId);
                card.classList.add('dragging');
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });
    }
}

// ============================================================================
// SALES CHART WIDGET
// ============================================================================
class SalesChartWidget extends BaseWidget {
    constructor(dashboard) {
        super(dashboard, {
            type: 'sales-chart',
            title: 'Umsatzentwicklung',
            icon: '📈',
            updateInterval: 60000
        });
        
        this.chart = null;
    }
    
    async fetchData() {
        // Get sales data for selected period
        const period = this.dashboard.filters.dateRange;
        return analyticsEngine.getSalesData(period);
    }
    
    renderContent() {
        const body = this.element.querySelector('.widget-body');
        
        body.innerHTML = `
            <div class="chart-controls">
                <select class="period-selector" onchange="this.closest('.dashboard-widget').widget.changePeriod(this.value)">
                    <option value="today">Heute</option>
                    <option value="week">Diese Woche</option>
                    <option value="month">Dieser Monat</option>
                    <option value="year">Dieses Jahr</option>
                </select>
            </div>
            <canvas id="sales-chart"></canvas>
        `;
        
        this.renderChart();
    }
    
    renderChart() {
        const canvas = this.element.querySelector('#sales-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.labels,
                datasets: [
                    {
                        label: 'Umsatz',
                        data: this.data.revenue,
                        borderColor: DASHBOARD_CONFIG.charts.colors.primary,
                        backgroundColor: `${DASHBOARD_CONFIG.charts.colors.primary}20`,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Bestellungen',
                        data: this.data.orders,
                        borderColor: DASHBOARD_CONFIG.charts.colors.secondary,
                        backgroundColor: `${DASHBOARD_CONFIG.charts.colors.secondary}20`,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: this.getChartTextColor(),
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: DASHBOARD_CONFIG.charts.colors.primary,
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: (context) => {
                                if (context.dataset.label === 'Umsatz') {
                                    return `Umsatz: CHF ${context.parsed.y.toFixed(2)}`;
                                }
                                return `Bestellungen: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: this.getGridColor(),
                            drawBorder: false
                        },
                        ticks: {
                            color: this.getChartTextColor()
                        }
                    },
                    y: {
                        position: 'left',
                        grid: {
                            color: this.getGridColor(),
                            drawBorder: false
                        },
                        ticks: {
                            color: this.getChartTextColor(),
                            callback: (value) => `CHF ${value}`
                        }
                    },
                    y1: {
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: this.getChartTextColor()
                        }
                    }
                }
            }
        });
    }
    
    changePeriod(period) {
        this.dashboard.filters.dateRange = period;
        this.update();
    }
    
    getChartTextColor() {
        return this.dashboard.theme === 'dark' ? '#FFFFFF' : '#333333';
    }
    
    getGridColor() {
        return this.dashboard.theme === 'dark' ? 
            'rgba(255, 255, 255, 0.1)' : 
            'rgba(0, 0, 0, 0.1)';
    }
}

// ============================================================================
// DASHBOARD STYLES
// ============================================================================
const dashboardStyles = `
<style>
/* Dashboard Grid */
.dashboard-grid {
    display: grid;
    gap: 1.5rem;
    padding: 1.5rem;
    background: var(--bg-primary);
    min-height: 100vh;
}

/* Base Widget Styles */
.dashboard-widget {
    background: var(--bg-card);
    border-radius: 1rem;
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    transition: all 0.3s ease;
    position: relative;
}

.dashboard-widget:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl);
}

.dashboard-widget.loading .widget-loading {
    display: flex;
}

.dashboard-widget.expanded {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    margin: 0;
    border-radius: 0;
}

/* Widget Header */
.widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    cursor: move;
}

.widget-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
}

.widget-actions {
    display: flex;
    gap: 0.5rem;
}

.widget-action {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
}

.widget-action:hover {
    background: var(--bg-hover);
    color: var(--primary);
}

/* Widget Body */
.widget-body {
    padding: 1.5rem;
    position: relative;
    min-height: 200px;
}

.widget-loading {
    position: absolute;
    inset: 0;
    background: var(--bg-card);
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: var(--primary);
}

.widget-error {
    text-align: center;
    color: var(--text-secondary);
}

.widget-error i {
    font-size: 3rem;
    color: var(--danger);
    margin-bottom: 1rem;
}

/* Revenue Widget */
.metric-value {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.currency {
    font-size: 1.5rem;
    color: var(--text-secondary);
}

.metric-change {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 2rem;
    font-size: 0.875rem;
    font-weight: 500;
}

.metric-change.positive {
    background: rgba(0, 230, 118, 0.1);
    color: var(--success);
}

.metric-change.negative {
    background: rgba(244, 67, 54, 0.1);
    color: var(--danger);
}

.metric-progress {
    margin: 1.5rem 0;
}

.progress-bar {
    height: 8px;
    background: var(--bg-secondary);
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--gradient-primary);
    transition: width 0.5s ease;
}

.progress-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-top: 0.5rem;
}

/* Orders Widget */
.order-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.order-stat {
    text-align: center;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 0.75rem;
    transition: all 0.3s ease;
}

.order-stat.pulse {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

.stat-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
}

.stat-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.total-orders {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
}

.widget-cta {
    width: 100%;
    padding: 0.75rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.widget-cta:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
}

/* Realtime Orders Widget */
.orders-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 500px;
    overflow-y: auto;
}

.order-card {
    background: var(--bg-secondary);
    border-radius: 0.75rem;
    padding: 1rem;
    border-left: 4px solid transparent;
    transition: all 0.3s ease;
    cursor: grab;
}

.order-card.dragging {
    opacity: 0.5;
    cursor: grabbing;
}

.order-card.status-new {
    border-left-color: var(--secondary);
}

.order-card.status-preparing {
    border-left-color: var(--primary);
}

.order-card.status-ready {
    border-left-color: var(--success);
}

.order-card.urgent {
    animation: urgent-pulse 1s infinite;
}

@keyframes urgent-pulse {
    0%, 100% { 
        background: var(--bg-secondary);
    }
    50% { 
        background: rgba(244, 67, 54, 0.1);
    }
}

.order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.order-number {
    font-weight: 700;
    font-size: 1.1rem;
}

.order-time {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.order-customer {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
}

.order-items {
    margin-bottom: 1rem;
}

.item {
    font-size: 0.875rem;
    padding: 0.25rem 0;
}

.item.more {
    color: var(--text-secondary);
    font-style: italic;
}

.order-actions {
    display: flex;
    gap: 0.5rem;
}

.action-btn {
    flex: 1;
    padding: 0.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
}

.action-btn:hover {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
}

/* Chart Controls */
.chart-controls {
    margin-bottom: 1rem;
    display: flex;
    justify-content: flex-end;
}

.period-selector {
    padding: 0.5rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    color: var(--text-primary);
    cursor: pointer;
}

/* Responsive */
@media (max-width: 1200px) {
    .dashboard-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
        padding: 1rem;
        gap: 1rem;
    }
    
    .order-stats {
        grid-template-columns: 1fr;
    }
}

/* Theme Variables */
[data-theme="dark"] {
    --bg-primary: #0A0A0A;
    --bg-secondary: #141414;
    --bg-card: #1A1A1A;
    --bg-hover: #252525;
    --text-primary: #FFFFFF;
    --text-secondary: #B0B0B0;
    --border-color: rgba(255, 255, 255, 0.1);
    --primary: #FF6B6B;
    --primary-dark: #FF5252;
    --secondary: #4ECDC4;
    --success: #00E676;
    --warning: #FFC107;
    --danger: #F44336;
    --gradient-primary: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
    --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.5);
    --shadow-xl: 0 40px 80px rgba(0, 0, 0, 0.6);
}

[data-theme="light"] {
    --bg-primary: #F5F5F5;
    --bg-secondary: #FFFFFF;
    --bg-card: #FFFFFF;
    --bg-hover: #F0F0F0;
    --text-primary: #333333;
    --text-secondary: #666666;
    --border-color: rgba(0, 0, 0, 0.1);
    --primary: #FF6B6B;
    --primary-dark: #FF5252;
    --secondary: #4ECDC4;
    --success: #00E676;
    --warning: #FFC107;
    --danger: #F44336;
    --gradient-primary: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
    --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 40px 80px rgba(0, 0, 0, 0.15);
}
</style>
`;

// ============================================================================
// EXPORT & INITIALIZATION
// ============================================================================

// Create singleton instance
const adminDashboard = new AdminDashboard();

// Export for use
export { adminDashboard, BaseWidget };

// Make available globally
if (typeof window !== 'undefined') {
    window.adminDashboard = adminDashboard;
    
    // Inject styles
    document.head.insertAdjacentHTML('beforeend', dashboardStyles);
}