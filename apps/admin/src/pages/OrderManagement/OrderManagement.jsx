/**
 * EATECH - Order Management Component
 * Version: 8.4.0
 * Description: Real-time Order Management Dashboard mit Lazy Loading & Advanced Features
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/OrderManagement/OrderManagement.jsx
 * 
 * Features: Real-time orders, kitchen display, delivery tracking, analytics
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Clock, CheckCircle, XCircle, AlertCircle,
  Truck, User, MapPin, Phone, Mail, MessageSquare,
  Filter, Search, MoreVertical, RefreshCw, Download,
  Calendar, DollarSign, Package, Utensils, Timer,
  Play, Pause, Check, X, Edit, Printer, Eye,
  ChefHat, Navigation, Star, Flag, Zap, Activity,
  BarChart3, TrendingUp, TrendingDown, Wifi, WifiOff
} from 'lucide-react';

// Hooks & Contexts
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { useRealtimeOrders } from '../../hooks/useRealtimeOrders';

// Lazy loaded components
const OrderCard = lazy(() => import('./components/OrderCard'));
const OrderDetailsModal = lazy(() => import('./components/OrderDetailsModal'));
const KitchenDisplay = lazy(() => import('./components/KitchenDisplay'));
const DeliveryTracker = lazy(() => import('./components/DeliveryTracker'));
const OrderFilters = lazy(() => import('./components/OrderFilters'));
const OrderStats = lazy(() => import('./components/OrderStats'));
const OrderTimeline = lazy(() => import('./components/OrderTimeline'));
const BulkActions = lazy(() => import('./components/BulkActions'));
const OrderExporter = lazy(() => import('./components/OrderExporter'));
const CustomerInfo = lazy(() => import('./components/CustomerInfo'));
const PaymentDetails = lazy(() => import('./components/PaymentDetails'));
const OrderNotes = lazy(() => import('./components/OrderNotes'));
const EstimationTool = lazy(() => import('./components/EstimationTool'));
const OrderAnalytics = lazy(() => import('./components/OrderAnalytics'));

// Lazy loaded services
const orderService = () => import('../../services/orderService');
const realtimeService = () => import('../../services/realtimeService');
const notificationService = () => import('../../services/notificationService');
const printService = () => import('../../services/printService');
const analyticsService = () => import('../../services/analyticsService');
const soundService = () => import('../../services/soundService');

// Lazy loaded utilities
const dateUtils = () => import('../../utils/dateUtils');
const formattersUtils = () => import('../../utils/formattersUtils');
const validationUtils = () => import('../../utils/validationUtils');
const calculationUtils = () => import('../../utils/calculationUtils');

// Order statuses
export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// Order types
export const ORDER_TYPES = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
  DINE_IN: 'dine_in'
};

// Priority levels
export const PRIORITY_LEVELS = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4
};

// View modes
export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
  KITCHEN: 'kitchen',
  DELIVERY: 'delivery',
  ANALYTICS: 'analytics'
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const OrderManagement = () => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    timeRange: 'today',
    searchTerm: '',
    assignedTo: 'all'
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showExporter, setShowExporter] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showEstimationTool, setShowEstimationTool] = useState(false);
  const [isKitchenMode, setIsKitchenMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(30000); // 30 seconds
  const [stats, setStats] = useState({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Hooks
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { 
    orders: realtimeOrders, 
    isConnected: realtimeConnected,
    subscribe,
    unsubscribe 
  } = useRealtimeOrders();

  // Refs
  const refreshIntervalRef = useRef(null);
  const soundsRef = useRef({});

  // Lazy loaded services refs
  const orderServiceRef = useRef(null);
  const realtimeServiceRef = useRef(null);
  const notificationServiceRef = useRef(null);
  const printServiceRef = useRef(null);
  const analyticsServiceRef = useRef(null);
  const soundServiceRef = useRef(null);
  const dateUtilsRef = useRef(null);
  const formattersRef = useRef(null);
  const validationUtilsRef = useRef(null);
  const calculationUtilsRef = useRef(null);

  // ============================================================================
  // LAZY LOADING SETUP
  // ============================================================================
  useEffect(() => {
    const initializeLazyServices = async () => {
      try {
        // Initialize utilities
        dateUtilsRef.current = await dateUtils();
        formattersRef.current = await formattersUtils();
        validationUtilsRef.current = await validationUtils();
        calculationUtilsRef.current = await calculationUtils();

        // Initialize services
        const OrderService = await orderService();
        orderServiceRef.current = new OrderService.default();

        const RealtimeService = await realtimeService();
        realtimeServiceRef.current = new RealtimeService.default();

        const NotificationService = await notificationService();
        notificationServiceRef.current = new NotificationService.default();

        const PrintService = await printService();
        printServiceRef.current = new PrintService.default();

        const AnalyticsService = await analyticsService();
        analyticsServiceRef.current = new AnalyticsService.default();

        const SoundService = await soundService();
        soundServiceRef.current = new SoundService.default();

        // Load initial data
        await loadOrders();
        await loadStats();
        setupRealtimeSubscriptions();
        setupSounds();

      } catch (error) {
        console.error('Failed to initialize order management services:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeLazyServices();
  }, []);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  const loadOrders = useCallback(async () => {
    if (!orderServiceRef.current) return;

    try {
      setIsLoading(true);
      const orderData = await orderServiceRef.current.getOrders({
        filters,
        sort: { [sortBy]: sortDirection },
        limit: 100
      });
      
      setOrders(orderData);
      
      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('orders_loaded', {
          count: orderData.length,
          filters: filters,
          view_mode: viewMode
        });
      }

    } catch (error) {
      console.error('Failed to load orders:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy, sortDirection, viewMode]);

  const loadStats = useCallback(async () => {
    if (!orderServiceRef.current) return;

    try {
      const statsData = await orderServiceRef.current.getOrderStats({
        timeRange: filters.timeRange
      });
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [filters.timeRange]);

  const setupRealtimeSubscriptions = useCallback(() => {
    if (!realtimeServiceRef.current) return;

    // Subscribe to new orders
    subscribe('new_order', (order) => {
      setOrders(prev => [order, ...prev]);
      showNewOrderNotification(order);
      playNewOrderSound();
    });

    // Subscribe to order status updates
    subscribe('order_status_changed', (update) => {
      setOrders(prev => prev.map(order => 
        order.id === update.orderId 
          ? { ...order, status: update.status, updatedAt: new Date().toISOString() }
          : order
      ));
      
      showStatusUpdateNotification(update);
    });

    // Subscribe to order cancellations
    subscribe('order_cancelled', (update) => {
      setOrders(prev => prev.map(order => 
        order.id === update.orderId 
          ? { ...order, status: ORDER_STATUSES.CANCELLED, cancelReason: update.reason }
          : order
      ));
      
      showCancellationNotification(update);
    });

  }, [subscribe]);

  const setupSounds = useCallback(async () => {
    if (!soundServiceRef.current) return;

    try {
      soundsRef.current = {
        newOrder: await soundServiceRef.current.loadSound('/sounds/new-order.mp3'),
        orderReady: await soundServiceRef.current.loadSound('/sounds/order-ready.mp3'),
        orderCancelled: await soundServiceRef.current.loadSound('/sounds/order-cancelled.mp3')
      };
    } catch (error) {
      console.error('Failed to load sounds:', error);
    }
  }, []);

  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================
  useEffect(() => {
    const filtered = filterAndSortOrders(orders);
    setFilteredOrders(filtered);
  }, [orders, filters, sortBy, sortDirection]);

  const filterAndSortOrders = useCallback((orderList) => {
    let filtered = [...orderList];

    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    if (filters.type !== 'all') {
      filtered = filtered.filter(order => order.type === filters.type);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(order => order.priority === filters.priority);
    }

    if (filters.assignedTo !== 'all') {
      filtered = filtered.filter(order => order.assignedTo === filters.assignedTo);
    }

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchTerm) ||
        order.customer.name.toLowerCase().includes(searchTerm) ||
        order.customer.email.toLowerCase().includes(searchTerm) ||
        order.items.some(item => item.name.toLowerCase().includes(searchTerm))
      );
    }

    // Apply time range filter
    if (filters.timeRange !== 'all' && dateUtilsRef.current) {
      const timeFilter = dateUtilsRef.current.getTimeRangeFilter(filters.timeRange);
      filtered = filtered.filter(order => 
        new Date(order.createdAt) >= timeFilter.start &&
        new Date(order.createdAt) <= timeFilter.end
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle nested properties
      if (sortBy.includes('.')) {
        const keys = sortBy.split('.');
        aValue = keys.reduce((obj, key) => obj?.[key], a);
        bValue = keys.reduce((obj, key) => obj?.[key], b);
      }

      // Handle different data types
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [filters, sortBy, sortDirection]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleSortChange = useCallback((field) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  }, [sortBy]);

  // ============================================================================
  // ORDER ACTIONS
  // ============================================================================
  const handleOrderStatusChange = useCallback(async (orderId, newStatus, options = {}) => {
    if (!orderServiceRef.current) return;

    try {
      await orderServiceRef.current.updateOrderStatus(orderId, newStatus, {
        reason: options.reason,
        estimatedTime: options.estimatedTime,
        notes: options.notes
      });

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
          : order
      ));

      // Show notification
      if (notificationServiceRef.current) {
        notificationServiceRef.current.showSuccess(
          `Order ${orderId} status updated to ${newStatus}`
        );
      }

      // Play sound
      if (newStatus === ORDER_STATUSES.READY && soundsRef.current.orderReady) {
        soundsRef.current.orderReady.play();
      }

      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('order_status_changed', {
          order_id: orderId,
          old_status: orders.find(o => o.id === orderId)?.status,
          new_status: newStatus,
          user_id: user?.uid
        });
      }

    } catch (error) {
      console.error('Failed to update order status:', error);
      if (notificationServiceRef.current) {
        notificationServiceRef.current.showError('Failed to update order status');
      }
    }
  }, [orders, user?.uid]);

  const handleOrderAssignment = useCallback(async (orderId, assignedTo) => {
    if (!orderServiceRef.current) return;

    try {
      await orderServiceRef.current.assignOrder(orderId, assignedTo);

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, assignedTo, updatedAt: new Date().toISOString() }
          : order
      ));

      if (notificationServiceRef.current) {
        notificationServiceRef.current.showSuccess(`Order assigned to ${assignedTo}`);
      }

    } catch (error) {
      console.error('Failed to assign order:', error);
    }
  }, []);

  const handleOrderCancel = useCallback(async (orderId, reason) => {
    if (!orderServiceRef.current) return;

    try {
      await orderServiceRef.current.cancelOrder(orderId, reason);

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              status: ORDER_STATUSES.CANCELLED, 
              cancelReason: reason,
              updatedAt: new Date().toISOString() 
            }
          : order
      ));

      // Play sound
      if (soundsRef.current.orderCancelled) {
        soundsRef.current.orderCancelled.play();
      }

    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  }, []);

  const handlePrintOrder = useCallback(async (orderId) => {
    if (!printServiceRef.current) return;

    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      await printServiceRef.current.printKitchenTicket(order);

      if (notificationServiceRef.current) {
        notificationServiceRef.current.showSuccess('Kitchen ticket printed');
      }

    } catch (error) {
      console.error('Failed to print order:', error);
    }
  }, [orders]);

  // ============================================================================
  // BULK ACTIONS
  // ============================================================================
  const handleBulkStatusUpdate = useCallback(async (orderIds, newStatus) => {
    const updates = orderIds.map(id => handleOrderStatusChange(id, newStatus));
    await Promise.all(updates);
    setSelectedOrders(new Set());
  }, [handleOrderStatusChange]);

  const handleBulkAssignment = useCallback(async (orderIds, assignedTo) => {
    const updates = orderIds.map(id => handleOrderAssignment(id, assignedTo));
    await Promise.all(updates);
    setSelectedOrders(new Set());
  }, [handleOrderAssignment]);

  const handleBulkPrint = useCallback(async (orderIds) => {
    const prints = orderIds.map(id => handlePrintOrder(id));
    await Promise.all(prints);
    setSelectedOrders(new Set());
  }, [handlePrintOrder]);

  // ============================================================================
  // NOTIFICATIONS & SOUNDS
  // ============================================================================
  const showNewOrderNotification = useCallback((order) => {
    if (!notificationServiceRef.current) return;

    notificationServiceRef.current.showInfo(
      `New order #${order.orderNumber}`,
      {
        description: `${order.customer.name} - ${formattersRef.current?.formatPrice(order.total)}`,
        action: 'View',
        onClick: () => setSelectedOrder(order)
      }
    );
  }, []);

  const showStatusUpdateNotification = useCallback((update) => {
    if (!notificationServiceRef.current) return;

    notificationServiceRef.current.showInfo(
      `Order #${update.orderNumber} ${update.status}`,
      { duration: 3000 }
    );
  }, []);

  const showCancellationNotification = useCallback((update) => {
    if (!notificationServiceRef.current) return;

    notificationServiceRef.current.showWarning(
      `Order #${update.orderNumber} cancelled`,
      { description: update.reason }
    );
  }, []);

  const playNewOrderSound = useCallback(() => {
    if (soundsRef.current.newOrder && tenant?.settings?.enableSounds) {
      soundsRef.current.newOrder.play();
    }
  }, [tenant?.settings?.enableSounds]);

  // ============================================================================
  // AUTO REFRESH
  // ============================================================================
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        if (!realtimeConnected) {
          loadOrders();
        }
        loadStats();
      }, refreshInterval);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, realtimeConnected, loadOrders, loadStats]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const ordersByStatus = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
  }, [filteredOrders]);

  const selectedOrdersArray = useMemo(() => {
    return Array.from(selectedOrders);
  }, [selectedOrders]);

  const canBulkUpdate = useMemo(() => {
    return selectedOrders.size > 0;
  }, [selectedOrders.size]);

  const urgentOrders = useMemo(() => {
    return filteredOrders.filter(order => 
      order.priority === PRIORITY_LEVELS.URGENT ||
      (order.estimatedReadyTime && new Date(order.estimatedReadyTime) < new Date())
    );
  }, [filteredOrders]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600">
          {filteredOrders.length} orders • {Object.keys(ordersByStatus).length} statuses
          {!realtimeConnected && (
            <span className="ml-2 text-red-500 flex items-center gap-1">
              <WifiOff className="w-4 h-4" />
              Offline
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {Object.values(VIEW_MODES).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title="Filters"
        >
          <Filter className="w-5 h-5" />
        </button>

        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`p-2 border rounded-lg transition-colors ${
            autoRefresh 
              ? 'bg-green-100 border-green-300 text-green-700' 
              : 'bg-white border-gray-300 hover:bg-gray-50'
          }`}
          title="Auto Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={() => setShowAnalytics(true)}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title="Analytics"
        >
          <BarChart3 className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowExporter(true)}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title="Export"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderStats = () => (
    <Suspense fallback={<div className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>}>
      <OrderStats
        stats={stats}
        ordersByStatus={ordersByStatus}
        urgentCount={urgentOrders.length}
        isOnline={realtimeConnected}
      />
    </Suspense>
  );

  const renderFilters = () => (
    <AnimatePresence>
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6"
        >
          <Suspense fallback={<LoadingSpinner />}>
            <OrderFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClear={() => setFilters({
                status: 'all',
                type: 'all',
                priority: 'all',
                timeRange: 'today',
                searchTerm: '',
                assignedTo: 'all'
              })}
            />
          </Suspense>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderBulkActions = () => (
    <AnimatePresence>
      {canBulkUpdate && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Suspense fallback={null}>
            <BulkActions
              selectedCount={selectedOrders.size}
              onStatusUpdate={handleBulkStatusUpdate}
              onAssignment={handleBulkAssignment}
              onPrint={handleBulkPrint}
              onCancel={() => setSelectedOrders(new Set())}
            />
          </Suspense>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderOrderGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredOrders.map(order => (
        <Suspense key={order.id} fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>}>
          <OrderCard
            order={order}
            selected={selectedOrders.has(order.id)}
            onSelect={() => {
              const newSelected = new Set(selectedOrders);
              if (newSelected.has(order.id)) {
                newSelected.delete(order.id);
              } else {
                newSelected.add(order.id);
              }
              setSelectedOrders(newSelected);
            }}
            onClick={() => setSelectedOrder(order)}
            onStatusChange={handleOrderStatusChange}
            onAssign={handleOrderAssignment}
            onPrint={handlePrintOrder}
            onCancel={handleOrderCancel}
          />
        </Suspense>
      ))}
    </div>
  );

  const renderKitchenDisplay = () => (
    <Suspense fallback={<LoadingSpinner />}>
      <KitchenDisplay
        orders={filteredOrders.filter(order => 
          [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.PREPARING].includes(order.status)
        )}
        onStatusChange={handleOrderStatusChange}
        onEstimateTime={(orderId, time) => {
          setOrders(prev => prev.map(order => 
            order.id === orderId 
              ? { ...order, estimatedReadyTime: time }
              : order
          ));
        }}
      />
    </Suspense>
  );

  const renderDeliveryTracker = () => (
    <Suspense fallback={<LoadingSpinner />}>
      <DeliveryTracker
        orders={filteredOrders.filter(order => 
          [ORDER_STATUSES.READY, ORDER_STATUSES.OUT_FOR_DELIVERY].includes(order.status)
        )}
        onStatusChange={handleOrderStatusChange}
        onLocationUpdate={(orderId, location) => {
          setOrders(prev => prev.map(order => 
            order.id === orderId 
              ? { ...order, deliveryLocation: location }
              : order
          ));
        }}
      />
    </Suspense>
  );

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Orders</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Found</h3>
          <p className="text-gray-600">
            {filters.searchTerm || filters.status !== 'all' 
              ? 'Try adjusting your filters to see more orders.'
              : 'Orders will appear here when customers place them.'
            }
          </p>
        </div>
      );
    }

    switch (viewMode) {
      case VIEW_MODES.KITCHEN:
        return renderKitchenDisplay();
      case VIEW_MODES.DELIVERY:
        return renderDeliveryTracker();
      case VIEW_MODES.LIST:
        // TODO: Implement list view
        return renderOrderGrid();
      default:
        return renderOrderGrid();
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* Header */}
      {renderHeader()}

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      {renderContent()}

      {/* Bulk Actions */}
      {renderBulkActions()}

      {/* Modals */}
      {selectedOrder && (
        <Suspense fallback={null}>
          <OrderDetailsModal
            order={selectedOrder}
            isOpen={!!selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onStatusChange={handleOrderStatusChange}
            onAssign={handleOrderAssignment}
            onPrint={handlePrintOrder}
            onCancel={handleOrderCancel}
          />
        </Suspense>
      )}

      {showAnalytics && (
        <Suspense fallback={null}>
          <OrderAnalytics
            isOpen={showAnalytics}
            orders={orders}
            stats={stats}
            onClose={() => setShowAnalytics(false)}
          />
        </Suspense>
      )}

      {showExporter && (
        <Suspense fallback={null}>
          <OrderExporter
            isOpen={showExporter}
            orders={filteredOrders}
            filters={filters}
            onClose={() => setShowExporter(false)}
          />
        </Suspense>
      )}

      {showEstimationTool && (
        <Suspense fallback={null}>
          <EstimationTool
            isOpen={showEstimationTool}
            orders={filteredOrders}
            onClose={() => setShowEstimationTool(false)}
            onEstimate={(orderId, time) => {
              handleOrderStatusChange(orderId, ORDER_STATUSES.PREPARING, {
                estimatedTime: time
              });
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default OrderManagement;