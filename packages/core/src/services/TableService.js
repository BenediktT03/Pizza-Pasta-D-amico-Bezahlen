/**
 * EATECH - Table Management Service
 * Version: 1.0.0
 * Description: Service für Tischverwaltung, Reservierungen und QR-Code Management
 * Features: Table CRUD, Reservations, Real-time Status, QR Integration
 * 
 * Kapitel: Phase 4 - Advanced Features - Table Management
 */

import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  get, 
  update,
  remove,
  onValue, 
  off,
  query,
  orderByChild,
  equalTo,
  serverTimestamp
} from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { format, addMinutes, isWithinInterval } from 'date-fns';

// ============================================================================
// CONSTANTS
// ============================================================================
const TABLE_STATUSES = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  CLEANING: 'cleaning',
  BLOCKED: 'blocked'
};

const RESERVATION_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SEATED: 'seated',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
};

const DEFAULT_RESERVATION_DURATION = 120; // minutes
const RESERVATION_BUFFER_TIME = 30; // minutes between reservations

// ============================================================================
// TABLE SERVICE CLASS
// ============================================================================
export class TableService {
  constructor(firebaseApp) {
    this.db = getDatabase(firebaseApp);
    this.currentTenantId = null;
    this.listeners = new Map();
    this.tableCache = new Map();
  }
  
  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================
  setTenant(tenantId) {
    this.currentTenantId = tenantId;
  }
  
  validateTenant() {
    if (!this.currentTenantId) {
      throw new Error('Tenant ID not set');
    }
  }
  
  // ==========================================================================
  // TABLE MANAGEMENT
  // ==========================================================================
  async createTable(tableData) {
    this.validateTenant();
    
    const tableId = uuidv4();
    const newTable = {
      id: tableId,
      ...tableData,
      tenantId: this.currentTenantId,
      status: tableData.status || TABLE_STATUSES.AVAILABLE,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const tableRef = ref(this.db, `tenants/${this.currentTenantId}/tables/${tableId}`);
    await set(tableRef, newTable);
    
    // Update cache
    this.tableCache.set(tableId, newTable);
    
    // Track event
    this.trackTableEvent('table_created', { tableId, tableNumber: newTable.number });
    
    return { ...newTable, id: tableId };
  }
  
  async updateTable(tableId, updates) {
    this.validateTenant();
    
    const tableRef = ref(this.db, `tenants/${this.currentTenantId}/tables/${tableId}`);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await update(tableRef, updateData);
    
    // Update cache
    const cachedTable = this.tableCache.get(tableId);
    if (cachedTable) {
      this.tableCache.set(tableId, { ...cachedTable, ...updateData });
    }
    
    // Track event
    this.trackTableEvent('table_updated', { tableId, updates });
    
    return updateData;
  }
  
  async deleteTable(tableId) {
    this.validateTenant();
    
    // Check if table has active orders or reservations
    const hasActiveOrders = await this.checkActiveOrders(tableId);
    const hasActiveReservations = await this.checkActiveReservations(tableId);
    
    if (hasActiveOrders) {
      throw new Error('Cannot delete table with active orders');
    }
    
    if (hasActiveReservations) {
      throw new Error('Cannot delete table with active reservations');
    }
    
    const tableRef = ref(this.db, `tenants/${this.currentTenantId}/tables/${tableId}`);
    await remove(tableRef);
    
    // Remove from cache
    this.tableCache.delete(tableId);
    
    // Remove QR code data
    await this.removeQRCode(tableId);
    
    // Track event
    this.trackTableEvent('table_deleted', { tableId });
  }
  
  async getTables() {
    this.validateTenant();
    
    const tablesRef = ref(this.db, `tenants/${this.currentTenantId}/tables`);
    const snapshot = await get(tablesRef);
    
    const tables = [];
    
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const table = {
          id: child.key,
          ...child.val()
        };
        tables.push(table);
        
        // Update cache
        this.tableCache.set(table.id, table);
      });
    }
    
    return tables;
  }
  
  async getTable(tableId) {
    this.validateTenant();
    
    // Check cache first
    if (this.tableCache.has(tableId)) {
      return this.tableCache.get(tableId);
    }
    
    const tableRef = ref(this.db, `tenants/${this.currentTenantId}/tables/${tableId}`);
    const snapshot = await get(tableRef);
    
    if (!snapshot.exists()) {
      throw new Error('Table not found');
    }
    
    const table = {
      id: tableId,
      ...snapshot.val()
    };
    
    // Update cache
    this.tableCache.set(tableId, table);
    
    return table;
  }
  
  async getTableByNumber(tableNumber) {
    this.validateTenant();
    
    const tablesRef = ref(this.db, `tenants/${this.currentTenantId}/tables`);
    const tableQuery = query(tablesRef, orderByChild('number'), equalTo(tableNumber));
    const snapshot = await get(tableQuery);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    let table = null;
    snapshot.forEach(child => {
      table = {
        id: child.key,
        ...child.val()
      };
    });
    
    return table;
  }
  
  // ==========================================================================
  // STATUS MANAGEMENT
  // ==========================================================================
  async updateTableStatus(tableId, status, metadata = {}) {
    this.validateTenant();
    
    const updates = {
      status,
      statusUpdatedAt: serverTimestamp(),
      ...metadata
    };
    
    if (status === TABLE_STATUSES.OCCUPIED) {
      updates.occupiedAt = serverTimestamp();
      updates.currentOrder = metadata.orderId || null;
    } else if (status === TABLE_STATUSES.AVAILABLE) {
      updates.occupiedAt = null;
      updates.currentOrder = null;
      updates.lastCleanedAt = serverTimestamp();
    }
    
    await this.updateTable(tableId, updates);
    
    // Send notification if table becomes available
    if (status === TABLE_STATUSES.AVAILABLE) {
      await this.notifyTableAvailable(tableId);
    }
  }
  
  async occupyTable(tableId, orderId, guests = null) {
    await this.updateTableStatus(tableId, TABLE_STATUSES.OCCUPIED, {
      orderId,
      guests,
      occupiedBy: orderId
    });
  }
  
  async freeTable(tableId) {
    await this.updateTableStatus(tableId, TABLE_STATUSES.CLEANING);
    
    // Auto-mark as available after cleaning time (configurable)
    setTimeout(async () => {
      const table = await this.getTable(tableId);
      if (table.status === TABLE_STATUSES.CLEANING) {
        await this.updateTableStatus(tableId, TABLE_STATUSES.AVAILABLE);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  // ==========================================================================
  // RESERVATION MANAGEMENT
  // ==========================================================================
  async createReservation(tableId, reservationData) {
    this.validateTenant();
    
    const reservationId = uuidv4();
    const reservation = {
      id: reservationId,
      tableId,
      tenantId: this.currentTenantId,
      ...reservationData,
      status: RESERVATION_STATUSES.CONFIRMED,
      duration: reservationData.duration || DEFAULT_RESERVATION_DURATION,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Check availability
    const isAvailable = await this.checkTableAvailability(
      tableId,
      reservation.date,
      reservation.time,
      reservation.duration
    );
    
    if (!isAvailable) {
      throw new Error('Table not available for selected time');
    }
    
    // Save reservation
    const reservationRef = ref(this.db, `tenants/${this.currentTenantId}/reservations/${reservationId}`);
    await set(reservationRef, reservation);
    
    // Update table if reservation is for now
    await this.updateTableForReservation(tableId, reservation);
    
    // Send confirmation
    await this.sendReservationConfirmation(reservation);
    
    // Track event
    this.trackTableEvent('reservation_created', { reservationId, tableId });
    
    return { ...reservation, id: reservationId };
  }
  
  async updateReservation(reservationId, updates) {
    this.validateTenant();
    
    const reservationRef = ref(this.db, `tenants/${this.currentTenantId}/reservations/${reservationId}`);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await update(reservationRef, updateData);
    
    // Track event
    this.trackTableEvent('reservation_updated', { reservationId, updates });
    
    return updateData;
  }
  
  async cancelReservation(tableId, reservationId) {
    this.validateTenant();
    
    await this.updateReservation(reservationId, {
      status: RESERVATION_STATUSES.CANCELLED,
      cancelledAt: serverTimestamp()
    });
    
    // Update table status if needed
    const table = await this.getTable(tableId);
    if (table.status === TABLE_STATUSES.RESERVED && table.reservation?.id === reservationId) {
      await this.updateTableStatus(tableId, TABLE_STATUSES.AVAILABLE, {
        reservation: null
      });
    }
    
    // Track event
    this.trackTableEvent('reservation_cancelled', { reservationId, tableId });
  }
  
  async getReservations(filters = {}) {
    this.validateTenant();
    
    const reservationsRef = ref(this.db, `tenants/${this.currentTenantId}/reservations`);
    let reservationQuery = reservationsRef;
    
    if (filters.tableId) {
      reservationQuery = query(reservationsRef, orderByChild('tableId'), equalTo(filters.tableId));
    } else if (filters.date) {
      reservationQuery = query(reservationsRef, orderByChild('date'), equalTo(filters.date));
    }
    
    const snapshot = await get(reservationQuery);
    const reservations = [];
    
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const reservation = {
          id: child.key,
          ...child.val()
        };
        
        // Apply additional filters
        let include = true;
        
        if (filters.status && reservation.status !== filters.status) {
          include = false;
        }
        
        if (filters.customerPhone && !reservation.customerPhone?.includes(filters.customerPhone)) {
          include = false;
        }
        
        if (include) {
          reservations.push(reservation);
        }
      });
    }
    
    return reservations;
  }
  
  async checkTableAvailability(tableId, date, time, duration = DEFAULT_RESERVATION_DURATION) {
    const existingReservations = await this.getReservations({
      tableId,
      date
    });
    
    const requestedStart = new Date(`${date} ${time}`);
    const requestedEnd = addMinutes(requestedStart, duration);
    
    for (const reservation of existingReservations) {
      if (reservation.status === RESERVATION_STATUSES.CANCELLED) {
        continue;
      }
      
      const existingStart = new Date(`${reservation.date} ${reservation.time}`);
      const existingEnd = addMinutes(existingStart, reservation.duration + RESERVATION_BUFFER_TIME);
      
      // Check for overlap
      if (
        isWithinInterval(requestedStart, { start: existingStart, end: existingEnd }) ||
        isWithinInterval(requestedEnd, { start: existingStart, end: existingEnd }) ||
        isWithinInterval(existingStart, { start: requestedStart, end: requestedEnd })
      ) {
        return false;
      }
    }
    
    return true;
  }
  
  async updateTableForReservation(tableId, reservation) {
    const now = new Date();
    const reservationStart = new Date(`${reservation.date} ${reservation.time}`);
    const reservationEnd = addMinutes(reservationStart, reservation.duration);
    
    // Update table status if reservation is active
    if (isWithinInterval(now, { start: reservationStart, end: reservationEnd })) {
      await this.updateTableStatus(tableId, TABLE_STATUSES.RESERVED, {
        reservation: {
          id: reservation.id,
          customerName: reservation.customerName,
          guests: reservation.guests,
          time: reservation.time,
          endTime: format(reservationEnd, 'HH:mm')
        }
      });
    }
  }
  
  // ==========================================================================
  // QR CODE MANAGEMENT
  // ==========================================================================
  async generateQRData(tableId) {
    this.validateTenant();
    
    const table = await this.getTable(tableId);
    const qrId = uuidv4();
    
    const qrData = {
      id: qrId,
      tableId,
      tableNumber: table.number,
      tenantId: this.currentTenantId,
      url: `${process.env.VITE_APP_URL}/scan?qr=${qrId}`,
      createdAt: serverTimestamp()
    };
    
    const qrRef = ref(this.db, `qr_codes/${qrId}`);
    await set(qrRef, qrData);
    
    // Update table with QR code
    await this.updateTable(tableId, { qrCodeId: qrId });
    
    return qrData;
  }
  
  async getQRData(qrId) {
    const qrRef = ref(this.db, `qr_codes/${qrId}`);
    const snapshot = await get(qrRef);
    
    if (!snapshot.exists()) {
      throw new Error('Invalid QR code');
    }
    
    return snapshot.val();
  }
  
  async removeQRCode(tableId) {
    const table = await this.getTable(tableId);
    
    if (table.qrCodeId) {
      const qrRef = ref(this.db, `qr_codes/${table.qrCodeId}`);
      await remove(qrRef);
    }
  }
  
  // ==========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================================================
  subscribeToTables(tenantId, callback) {
    const tablesRef = ref(this.db, `tenants/${tenantId}/tables`);
    
    const listener = onValue(tablesRef, (snapshot) => {
      const tables = [];
      
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const table = {
            id: child.key,
            ...child.val()
          };
          tables.push(table);
          
          // Update cache
          this.tableCache.set(table.id, table);
        });
      }
      
      callback(tables);
    });
    
    this.listeners.set(`tables_${tenantId}`, { ref: tablesRef, listener });
    
    return () => this.unsubscribeFromTables(tenantId);
  }
  
  unsubscribeFromTables(tenantId) {
    const key = `tables_${tenantId}`;
    const subscription = this.listeners.get(key);
    
    if (subscription) {
      off(subscription.ref, 'value', subscription.listener);
      this.listeners.delete(key);
    }
  }
  
  subscribeToTableStatus(tableId, callback) {
    const tableRef = ref(this.db, `tenants/${this.currentTenantId}/tables/${tableId}`);
    
    const listener = onValue(tableRef, (snapshot) => {
      if (snapshot.exists()) {
        const table = {
          id: tableId,
          ...snapshot.val()
        };
        
        // Update cache
        this.tableCache.set(tableId, table);
        
        callback(table);
      }
    });
    
    this.listeners.set(`table_${tableId}`, { ref: tableRef, listener });
    
    return () => {
      const subscription = this.listeners.get(`table_${tableId}`);
      if (subscription) {
        off(subscription.ref, 'value', subscription.listener);
        this.listeners.delete(`table_${tableId}`);
      }
    };
  }
  
  subscribeToReservations(filters = {}, callback) {
    const reservationsRef = ref(this.db, `tenants/${this.currentTenantId}/reservations`);
    
    const listener = onValue(reservationsRef, async (snapshot) => {
      const reservations = [];
      
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const reservation = {
            id: child.key,
            ...child.val()
          };
          
          // Apply filters
          let include = true;
          
          if (filters.tableId && reservation.tableId !== filters.tableId) {
            include = false;
          }
          
          if (filters.date && reservation.date !== filters.date) {
            include = false;
          }
          
          if (filters.status && reservation.status !== filters.status) {
            include = false;
          }
          
          if (include) {
            reservations.push(reservation);
          }
        });
      }
      
      callback(reservations);
    });
    
    this.listeners.set('reservations', { ref: reservationsRef, listener });
    
    return () => {
      const subscription = this.listeners.get('reservations');
      if (subscription) {
        off(subscription.ref, 'value', subscription.listener);
        this.listeners.delete('reservations');
      }
    };
  }
  
  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  async checkActiveOrders(tableId) {
    const table = await this.getTable(tableId);
    return table.status === TABLE_STATUSES.OCCUPIED && table.currentOrder != null;
  }
  
  async checkActiveReservations(tableId) {
    const reservations = await this.getReservations({
      tableId,
      status: RESERVATION_STATUSES.CONFIRMED
    });
    
    const now = new Date();
    
    return reservations.some(reservation => {
      const reservationDate = new Date(`${reservation.date} ${reservation.time}`);
      return reservationDate > now;
    });
  }
  
  async notifyTableAvailable(tableId) {
    // This would integrate with notification service
    console.log(`Table ${tableId} is now available`);
  }
  
  async sendReservationConfirmation(reservation) {
    // This would integrate with notification service
    console.log(`Sending confirmation for reservation ${reservation.id}`);
  }
  
  trackTableEvent(event, data) {
    // This would integrate with analytics service
    console.log('Table event:', event, data);
  }
  
  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  async getTableStatistics(timeRange = 'today') {
    this.validateTenant();
    
    const tables = await this.getTables();
    const stats = {
      totalTables: tables.length,
      occupiedTables: 0,
      availableTables: 0,
      reservedTables: 0,
      occupancyRate: 0,
      averageOccupancyTime: 0,
      turnoverRate: 0,
      peakHours: [],
      popularTables: []
    };
    
    // Calculate current status
    tables.forEach(table => {
      switch (table.status) {
        case TABLE_STATUSES.OCCUPIED:
          stats.occupiedTables++;
          break;
        case TABLE_STATUSES.AVAILABLE:
          stats.availableTables++;
          break;
        case TABLE_STATUSES.RESERVED:
          stats.reservedTables++;
          break;
      }
    });
    
    stats.occupancyRate = stats.totalTables > 0
      ? Math.round((stats.occupiedTables / stats.totalTables) * 100)
      : 0;
    
    // TODO: Calculate historical metrics based on timeRange
    
    return stats;
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  clearCache() {
    this.tableCache.clear();
  }
  
  destroy() {
    // Unsubscribe from all listeners
    this.listeners.forEach((subscription) => {
      off(subscription.ref, 'value', subscription.listener);
    });
    this.listeners.clear();
    this.clearCache();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================
let tableServiceInstance = null;

export function initializeTableService(firebaseApp) {
  if (!tableServiceInstance) {
    tableServiceInstance = new TableService(firebaseApp);
  }
  return tableServiceInstance;
}

export function getTableService() {
  if (!tableServiceInstance) {
    throw new Error('TableService not initialized. Call initializeTableService first.');
  }
  return tableServiceInstance;
}