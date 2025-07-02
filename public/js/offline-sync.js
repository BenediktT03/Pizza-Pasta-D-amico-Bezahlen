// ============================================================================
// FLOWBITE PRO - OFFLINE SYNC MANAGER
// Version: 1.0.0
// Description: Offline-First Queue System mit automatischer Synchronisation
// Features: Order Queue, Background Sync, Conflict Resolution, Status Indicators
// ============================================================================

class OfflineSyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.db = null;
        this.offlineIndicator = null;
        
        // Configuration
        this.config = {
            dbName: 'FlowBiteOfflineDB',
            dbVersion: 1,
            syncInterval: 30000, // 30 seconds
            maxRetries: 3,
            retryDelay: 5000
        };
        
        // Queue Statistics
        this.stats = {
            queued: 0,
            synced: 0,
            failed: 0
        };
        
        this.init();
    }
    
    // Initialize IndexedDB and Event Listeners
    async init() {
        try {
            // Open IndexedDB
            await this.openDatabase();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Create UI indicator
            this.createOfflineIndicator();
            
            // Load existing queue
            await this.loadQueueStats();
            
            // Start sync interval
            this.startSyncInterval();
            
            // Register service worker for background sync
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                this.registerBackgroundSync();
            }
            
            console.log('✅ Offline Sync Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Offline Sync:', error);
        }
    }
    
    // Open IndexedDB
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.dbName, this.config.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('orders')) {
                    const orderStore = db.createObjectStore('orders', { 
                        keyPath: 'localId', 
                        autoIncrement: true 
                    });
                    orderStore.createIndex('timestamp', 'timestamp');
                    orderStore.createIndex('status', 'status');
                    orderStore.createIndex('syncStatus', 'syncStatus');
                }
                
                if (!db.objectStoreNames.contains('updates')) {
                    const updateStore = db.createObjectStore('updates', { 
                        keyPath: 'localId', 
                        autoIncrement: true 
                    });
                    updateStore.createIndex('timestamp', 'timestamp');
                    updateStore.createIndex('orderId', 'orderId');
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }
    
    // Setup Event Listeners
    setupEventListeners() {
        // Online/Offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Visibility change (when app comes to foreground)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                this.syncQueue();
            }
        });
        
        // Before unload - try quick sync
        window.addEventListener('beforeunload', (e) => {
            if (this.stats.queued > 0) {
                e.preventDefault();
                e.returnValue = 'Sie haben ungesendete Bestellungen. Trotzdem verlassen?';
            }
        });
    }
    
    // Handle online event
    handleOnline() {
        this.isOnline = true;
        this.updateIndicator();
        this.showNotification('Verbindung wiederhergestellt! Synchronisiere...', 'success');
        
        // Start syncing immediately
        this.syncQueue();
    }
    
    // Handle offline event
    handleOffline() {
        this.isOnline = false;
        this.updateIndicator();
        this.showNotification('Offline-Modus aktiviert. Bestellungen werden gespeichert.', 'warning');
    }
    
    // Create offline indicator UI
    createOfflineIndicator() {
        this.offlineIndicator = document.createElement('div');
        this.offlineIndicator.id = 'offline-indicator';
        this.offlineIndicator.className = 'offline-indicator';
        this.offlineIndicator.innerHTML = `
            <div class="indicator-content">
                <i class="fas fa-wifi"></i>
                <span class="indicator-text">Online</span>
                <div class="queue-badge" style="display: none;">
                    <span class="queue-count">0</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.offlineIndicator);
        this.updateIndicator();
    }
    
    // Update indicator UI
    updateIndicator() {
        if (!this.offlineIndicator) return;
        
        const icon = this.offlineIndicator.querySelector('.fas');
        const text = this.offlineIndicator.querySelector('.indicator-text');
        const badge = this.offlineIndicator.querySelector('.queue-badge');
        const count = this.offlineIndicator.querySelector('.queue-count');
        
        if (this.isOnline) {
            this.offlineIndicator.classList.remove('offline');
            icon.className = 'fas fa-wifi';
            text.textContent = 'Online';
            
            if (this.syncInProgress) {
                this.offlineIndicator.classList.add('syncing');
                text.textContent = 'Synchronisiere...';
                icon.className = 'fas fa-sync fa-spin';
            }
        } else {
            this.offlineIndicator.classList.add('offline');
            icon.className = 'fas fa-wifi-slash';
            text.textContent = 'Offline';
        }
        
        // Queue badge
        if (this.stats.queued > 0) {
            badge.style.display = 'flex';
            count.textContent = this.stats.queued;
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Queue a new order
    async queueOrder(orderData) {
        const order = {
            ...orderData,
            localId: Date.now() + Math.random(), // Temp ID
            timestamp: Date.now(),
            syncStatus: 'pending',
            retryCount: 0
        };
        
        try {
            const transaction = this.db.transaction(['orders'], 'readwrite');
            const store = transaction.objectStore('orders');
            await store.add(order);
            
            this.stats.queued++;
            this.updateIndicator();
            
            // Try immediate sync if online
            if (this.isOnline) {
                this.syncQueue();
            }
            
            return order.localId;
        } catch (error) {
            console.error('Failed to queue order:', error);
            throw error;
        }
    }
    
    // Queue an update (status change, etc.)
    async queueUpdate(orderId, updates) {
        const update = {
            orderId: orderId,
            updates: updates,
            timestamp: Date.now(),
            syncStatus: 'pending',
            retryCount: 0
        };
        
        try {
            const transaction = this.db.transaction(['updates'], 'readwrite');
            const store = transaction.objectStore('updates');
            await store.add(update);
            
            this.stats.queued++;
            this.updateIndicator();
            
            if (this.isOnline) {
                this.syncQueue();
            }
        } catch (error) {
            console.error('Failed to queue update:', error);
            throw error;
        }
    }
    
    // Sync all queued items
    async syncQueue() {
        if (!this.isOnline || this.syncInProgress) return;
        
        this.syncInProgress = true;
        this.updateIndicator();
        
        try {
            // Sync orders first
            await this.syncOrders();
            
            // Then sync updates
            await this.syncUpdates();
            
            // Update stats
            await this.loadQueueStats();
            
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            this.syncInProgress = false;
            this.updateIndicator();
        }
    }
    
    // Sync pending orders
    async syncOrders() {
        const transaction = this.db.transaction(['orders'], 'readwrite');
        const store = transaction.objectStore('orders');
        const index = store.index('syncStatus');
        
        const pendingOrders = await index.getAll('pending');
        
        for (const order of pendingOrders) {
            try {
                // Remove local fields
                const orderData = { ...order };
                delete orderData.localId;
                delete orderData.syncStatus;
                delete orderData.retryCount;
                
                // Send to Firebase
                const newRef = await firebase.database().ref('orders').push(orderData);
                
                // Mark as synced
                order.syncStatus = 'synced';
                order.firebaseId = newRef.key;
                await store.put(order);
                
                this.stats.synced++;
                this.showNotification(`Bestellung #${order.orderNumber} synchronisiert`, 'success');
                
            } catch (error) {
                console.error('Failed to sync order:', error);
                
                // Increment retry count
                order.retryCount++;
                
                if (order.retryCount >= this.config.maxRetries) {
                    order.syncStatus = 'failed';
                    this.stats.failed++;
                }
                
                await store.put(order);
            }
        }
    }
    
    // Sync pending updates
    async syncUpdates() {
        const transaction = this.db.transaction(['updates'], 'readwrite');
        const store = transaction.objectStore('updates');
        
        const pendingUpdates = await store.getAll();
        const pending = pendingUpdates.filter(u => u.syncStatus === 'pending');
        
        for (const update of pending) {
            try {
                // Apply update to Firebase
                await firebase.database().ref(`orders/${update.orderId}`).update(update.updates);
                
                // Remove from queue
                await store.delete(update.localId);
                
                this.stats.synced++;
                
            } catch (error) {
                console.error('Failed to sync update:', error);
                
                update.retryCount++;
                
                if (update.retryCount >= this.config.maxRetries) {
                    update.syncStatus = 'failed';
                    this.stats.failed++;
                }
                
                await store.put(update);
            }
        }
    }
    
    // Load queue statistics
    async loadQueueStats() {
        const orderTransaction = this.db.transaction(['orders'], 'readonly');
        const orderStore = orderTransaction.objectStore('orders');
        const orderIndex = orderStore.index('syncStatus');
        
        const updateTransaction = this.db.transaction(['updates'], 'readonly');
        const updateStore = updateTransaction.objectStore('updates');
        
        const pendingOrders = await orderIndex.count('pending');
        const pendingUpdates = await updateStore.count();
        
        this.stats.queued = pendingOrders + pendingUpdates;
        this.updateIndicator();
    }
    
    // Start periodic sync
    startSyncInterval() {
        setInterval(() => {
            if (this.isOnline && this.stats.queued > 0) {
                this.syncQueue();
            }
        }, this.config.syncInterval);
    }
    
    // Register background sync
    async registerBackgroundSync() {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-orders');
            console.log('Background sync registered');
        } catch (error) {
            console.log('Background sync registration failed:', error);
        }
    }
    
    // Get offline orders for display
    async getOfflineOrders() {
        const transaction = this.db.transaction(['orders'], 'readonly');
        const store = transaction.objectStore('orders');
        const orders = await store.getAll();
        
        return orders.filter(o => o.syncStatus === 'pending');
    }
    
    // Clear synced items
    async clearSyncedItems() {
        const orderTransaction = this.db.transaction(['orders'], 'readwrite');
        const orderStore = orderTransaction.objectStore('orders');
        const orderIndex = orderStore.index('syncStatus');
        
        const syncedOrders = await orderIndex.getAll('synced');
        
        for (const order of syncedOrders) {
            await orderStore.delete(order.localId);
        }
        
        await this.loadQueueStats();
    }
    
    // Manual retry for failed items
    async retryFailedItems() {
        const transaction = this.db.transaction(['orders'], 'readwrite');
        const store = transaction.objectStore('orders');
        const index = store.index('syncStatus');
        
        const failedOrders = await index.getAll('failed');
        
        for (const order of failedOrders) {
            order.syncStatus = 'pending';
            order.retryCount = 0;
            await store.put(order);
        }
        
        this.stats.failed = 0;
        await this.loadQueueStats();
        
        if (this.isOnline) {
            this.syncQueue();
        }
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `sync-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    // Create admin panel for offline queue
    createAdminPanel() {
        const panel = document.createElement('div');
        panel.className = 'offline-admin-panel';
        panel.innerHTML = `
            <h3><i class="fas fa-sync"></i> Offline Queue Status</h3>
            <div class="queue-stats">
                <div class="stat">
                    <span class="label">Wartend:</span>
                    <span class="value" id="queuedCount">${this.stats.queued}</span>
                </div>
                <div class="stat">
                    <span class="label">Synchronisiert:</span>
                    <span class="value success" id="syncedCount">${this.stats.synced}</span>
                </div>
                <div class="stat">
                    <span class="label">Fehlgeschlagen:</span>
                    <span class="value error" id="failedCount">${this.stats.failed}</span>
                </div>
            </div>
            <div class="queue-actions">
                <button onclick="window.offlineSync.syncQueue()" ${!this.isOnline ? 'disabled' : ''}>
                    <i class="fas fa-sync"></i> Jetzt synchronisieren
                </button>
                <button onclick="window.offlineSync.retryFailedItems()" ${this.stats.failed === 0 ? 'disabled' : ''}>
                    <i class="fas fa-redo"></i> Fehlgeschlagene wiederholen
                </button>
                <button onclick="window.offlineSync.clearSyncedItems()">
                    <i class="fas fa-trash"></i> Synchronisierte löschen
                </button>
            </div>
            <div id="offlineOrdersList" class="offline-orders-list"></div>
        `;
        
        return panel;
    }
}

// CSS Styles
const offlineStyles = `
<style>
/* Offline Indicator */
.offline-indicator {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 100px;
    padding: 8px 20px;
    z-index: 9999;
    transition: all 0.3s ease;
}

.offline-indicator.offline {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
}

.offline-indicator.syncing {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
}

.indicator-content {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #22c55e;
}

.offline-indicator.offline .indicator-content {
    color: #ef4444;
}

.offline-indicator.syncing .indicator-content {
    color: #3b82f6;
}

.indicator-text {
    font-weight: 500;
    font-size: 14px;
}

.queue-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(245, 158, 11, 0.2);
    border-radius: 100px;
    padding: 2px 8px;
    margin-left: 5px;
}

.queue-count {
    font-size: 12px;
    font-weight: bold;
    color: #f59e0b;
}

/* Sync Notifications */
.sync-notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(17, 24, 39, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    transform: translateY(100px);
    transition: transform 0.3s ease;
    z-index: 2000;
    max-width: 400px;
}

.sync-notification.show {
    transform: translateY(0);
}

.sync-notification.success {
    border: 1px solid rgba(34, 197, 94, 0.3);
}

.sync-notification.warning {
    border: 1px solid rgba(245, 158, 11, 0.3);
}

.sync-notification.error {
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.sync-notification i {
    font-size: 20px;
}

.sync-notification.success i { color: #22c55e; }
.sync-notification.warning i { color: #f59e0b; }
.sync-notification.error i { color: #ef4444; }

.sync-notification span {
    color: #e5e7eb;
    font-size: 14px;
}

/* Admin Panel */
.offline-admin-panel {
    background: rgba(17, 24, 39, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
}

.offline-admin-panel h3 {
    color: #e5e7eb;
    margin-bottom: 15px;
}

.queue-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-bottom: 20px;
}

.queue-stats .stat {
    text-align: center;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
}

.queue-stats .label {
    display: block;
    font-size: 12px;
    color: #9ca3af;
    margin-bottom: 5px;
}

.queue-stats .value {
    display: block;
    font-size: 24px;
    font-weight: bold;
    color: #3b82f6;
}

.queue-stats .value.success { color: #22c55e; }
.queue-stats .value.error { color: #ef4444; }

.queue-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.queue-actions button {
    flex: 1;
    padding: 10px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    color: #3b82f6;
    cursor: pointer;
    transition: all 0.3s ease;
}

.queue-actions button:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.2);
}

.queue-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .offline-indicator {
        top: auto;
        bottom: 70px;
        transform: translateX(-50%);
    }
    
    .sync-notification {
        right: 10px;
        left: 10px;
        bottom: 90px;
    }
    
    .queue-stats {
        grid-template-columns: 1fr;
    }
    
    .queue-actions {
        flex-direction: column;
    }
}
</style>`;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Add styles
    document.head.insertAdjacentHTML('beforeend', offlineStyles);
    
    // Initialize offline sync
    window.offlineSync = new OfflineSyncManager();
    
    console.log('✅ Offline Sync Manager loaded');
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineSyncManager;
}