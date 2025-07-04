/**
 * EATECH Mobile App - Apple Watch Service
 * Version: 25.0.0
 * Description: Apple Watch Integration für die EATECH Admin App
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/services/watchService.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import { Platform } from 'react-native';
import {
  getApplicationContext,
  watchEvents,
  sendMessage,
  transferUserInfo,
  transferFile,
  transferCurrentComplicationUserInfo,
  updateApplicationContext,
} from 'react-native-watch-connectivity';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config
import { EATECH_CONFIG } from '../config/constants';

// ============================================================================
// WATCH SERVICE CLASS
// ============================================================================
class WatchService {
  constructor() {
    this.isAvailable = Platform.OS === 'ios';
    this.isConnected = false;
    this.listeners = [];
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  async initialize() {
    if (!this.isAvailable) {
      console.log('Watch connectivity not available on this platform');
      return false;
    }

    try {
      // Check if watch is paired
      const isPaired = await this.checkWatchPaired();
      if (!isPaired) {
        console.log('No Apple Watch paired');
        return false;
      }

      // Setup listeners
      this.setupListeners();

      // Send initial data
      await this.sendInitialData();

      console.log('Watch service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing watch service:', error);
      return false;
    }
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================
  async checkWatchPaired() {
    try {
      // This would use native module to check
      // For now, we'll simulate
      return true;
    } catch (error) {
      console.error('Error checking watch pairing:', error);
      return false;
    }
  }

  // ============================================================================
  // LISTENERS
  // ============================================================================
  setupListeners() {
    // Message received from watch
    this.listeners.push(
      watchEvents.on('message', (message) => {
        console.log('Message from watch:', message);
        this.handleWatchMessage(message);
      })
    );

    // File received from watch
    this.listeners.push(
      watchEvents.on('file', (file) => {
        console.log('File from watch:', file);
        this.handleWatchFile(file);
      })
    );

    // User info received
    this.listeners.push(
      watchEvents.on('userInfo', (userInfo) => {
        console.log('User info from watch:', userInfo);
        this.handleWatchUserInfo(userInfo);
      })
    );

    // Application context
    this.listeners.push(
      watchEvents.on('applicationContext', (context) => {
        console.log('Application context from watch:', context);
        this.handleApplicationContext(context);
      })
    );

    // Reachability changed
    this.listeners.push(
      watchEvents.on('reachability', (reachable) => {
        this.isConnected = reachable;
        console.log('Watch reachability:', reachable);
      })
    );
  }

  removeListeners() {
    this.listeners.forEach(listener => listener.remove());
    this.listeners = [];
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================
  async handleWatchMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'REQUEST_UPDATE':
        await this.sendDataUpdate();
        break;
        
      case 'ACCEPT_ORDER':
        await this.handleAcceptOrder(payload.orderId);
        break;
        
      case 'REJECT_ORDER':
        await this.handleRejectOrder(payload.orderId);
        break;
        
      case 'TOGGLE_STORE':
        await this.handleToggleStore();
        break;
        
      case 'REQUEST_SUMMARY':
        await this.sendDailySummary();
        break;
        
      default:
        console.warn('Unknown watch message type:', type);
    }
  }

  async handleWatchFile(file) {
    // Handle file transfers from watch
    console.log('Received file from watch:', file);
  }

  async handleWatchUserInfo(userInfo) {
    // Handle user info updates
    console.log('Received user info from watch:', userInfo);
  }

  async handleApplicationContext(context) {
    // Handle application context updates
    console.log('Received application context:', context);
  }

  // ============================================================================
  // SEND DATA TO WATCH
  // ============================================================================
  async sendInitialData() {
    try {
      const context = {
        storeStatus: await this.getStoreStatus(),
        ordersCount: await this.getOrdersCount(),
        todayRevenue: await this.getTodayRevenue(),
        lastUpdate: new Date().toISOString(),
      };

      await updateApplicationContext(context);
      console.log('Sent initial data to watch');
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  async sendDataUpdate() {
    try {
      const update = {
        type: 'DATA_UPDATE',
        payload: {
          orders: await this.getRecentOrders(),
          revenue: await this.getTodayRevenue(),
          inventory: await this.getLowInventoryItems(),
          timestamp: Date.now(),
        },
      };

      if (this.isConnected) {
        await sendMessage(update);
      } else {
        await transferUserInfo(update);
      }

      console.log('Sent data update to watch');
    } catch (error) {
      console.error('Error sending data update:', error);
    }
  }

  async sendOrderNotification(order) {
    try {
      const notification = {
        type: 'NEW_ORDER',
        payload: {
          orderId: order.id,
          customerName: order.customerName,
          total: order.total,
          items: order.items.length,
          timestamp: Date.now(),
        },
      };

      // Send as complication update for immediate display
      await transferCurrentComplicationUserInfo(notification);

      // Also send as regular message
      if (this.isConnected) {
        await sendMessage(notification);
      }

      console.log('Sent order notification to watch');
    } catch (error) {
      console.error('Error sending order notification:', error);
    }
  }

  async sendDailySummary() {
    try {
      const summary = {
        type: 'DAILY_SUMMARY',
        payload: {
          date: new Date().toISOString().split('T')[0],
          orders: await this.getOrdersCount(),
          revenue: await this.getTodayRevenue(),
          topProducts: await this.getTopProducts(),
          busyHours: await this.getBusyHours(),
        },
      };

      await transferUserInfo(summary);
      console.log('Sent daily summary to watch');
    } catch (error) {
      console.error('Error sending daily summary:', error);
    }
  }

  // ============================================================================
  // COMPLICATION DATA
  // ============================================================================
  async updateComplications() {
    try {
      const complications = {
        ordersCount: await this.getOrdersCount(),
        revenue: await this.getTodayRevenue(),
        storeStatus: await this.getStoreStatus() ? 'Open' : 'Closed',
        lastUpdate: Date.now(),
      };

      await transferCurrentComplicationUserInfo(complications);
      console.log('Updated watch complications');
    } catch (error) {
      console.error('Error updating complications:', error);
    }
  }

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================
  async handleAcceptOrder(orderId) {
    console.log('Accepting order from watch:', orderId);
    // Implementation would update order status
    
    // Send confirmation back to watch
    await sendMessage({
      type: 'ORDER_ACCEPTED',
      payload: { orderId, success: true },
    });
  }

  async handleRejectOrder(orderId) {
    console.log('Rejecting order from watch:', orderId);
    // Implementation would update order status
    
    // Send confirmation back to watch
    await sendMessage({
      type: 'ORDER_REJECTED',
      payload: { orderId, success: true },
    });
  }

  async handleToggleStore() {
    console.log('Toggling store status from watch');
    const currentStatus = await this.getStoreStatus();
    const newStatus = !currentStatus;
    
    // Update store status
    await AsyncStorage.setItem('storeStatus', newStatus ? 'open' : 'closed');
    
    // Send confirmation back to watch
    await sendMessage({
      type: 'STORE_STATUS_UPDATED',
      payload: { status: newStatus ? 'open' : 'closed' },
    });
    
    // Update complications
    await this.updateComplications();
  }

  // ============================================================================
  // DATA HELPERS
  // ============================================================================
  async getStoreStatus() {
    const status = await AsyncStorage.getItem('storeStatus');
    return status === 'open';
  }

  async getOrdersCount() {
    const count = await AsyncStorage.getItem('pendingOrdersCount');
    return parseInt(count || '0');
  }

  async getTodayRevenue() {
    const revenue = await AsyncStorage.getItem('todayRevenue');
    return parseFloat(revenue || '0');
  }

  async getRecentOrders() {
    // Mock implementation
    return [
      { id: '1', customer: 'Max M.', total: 45.50, time: '12:30' },
      { id: '2', customer: 'Anna S.', total: 32.00, time: '12:45' },
      { id: '3', customer: 'Peter K.', total: 28.75, time: '13:00' },
    ];
  }

  async getLowInventoryItems() {
    // Mock implementation
    return [
      { name: 'Burger Buns', stock: 12 },
      { name: 'Pommes', stock: 8 },
      { name: 'Cola', stock: 15 },
    ];
  }

  async getTopProducts() {
    // Mock implementation
    return [
      { name: 'Classic Burger', count: 45 },
      { name: 'Cheeseburger', count: 38 },
      { name: 'Pommes groß', count: 52 },
    ];
  }

  async getBusyHours() {
    // Mock implementation
    return [
      { hour: '12:00', orders: 15 },
      { hour: '13:00', orders: 22 },
      { hour: '18:00', orders: 18 },
    ];
  }

  // ============================================================================
  // FILE TRANSFER
  // ============================================================================
  async sendReportToWatch(reportData) {
    try {
      const fileName = `report_${Date.now()}.json`;
      const fileData = JSON.stringify(reportData);
      
      await transferFile(fileName, fileData);
      console.log('Sent report to watch');
    } catch (error) {
      console.error('Error sending report to watch:', error);
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================
  cleanup() {
    this.removeListeners();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
const watchService = new WatchService();

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================
export const initializeWatchApp = async () => {
  return await watchService.initialize();
};

export const sendOrderToWatch = (order) => {
  return watchService.sendOrderNotification(order);
};

export const updateWatchComplications = () => {
  return watchService.updateComplications();
};

// ============================================================================
// EXPORT
// ============================================================================
export { watchService };
export default watchService;