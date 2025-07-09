import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Download,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  ShoppingBag,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  MessageSquare,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { useOrdersStore, OrderStatus, Order } from '../../stores/orders.store';
import { useTenantStore } from '../../stores/tenant.store';
import { useAuth } from '../../hooks/useAuth';

interface OrderFiltersState {
  search: string;
  status: OrderStatus[];
  type: Order['type'][];
  dateRange: 'today' | 'week' | 'month' | 'custom';
  customDateFrom?: Date;
  customDateTo?: Date;
}

export function OrderManagement() {
  const { user } = useAuth();
  const { tenant } = useTenantStore();
  const {
    orders,
    loading,
    filters,
    subscribeToOrders,
    unsubscribeFromOrders,
    loadOrders,
    setFilters,
    updateOrderStatus,
    updatePreparationTime,
    cancelOrder,
    assignStaff
  } = useOrdersStore();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<OrderFiltersState>({
    search: '',
    status: [],
    type: [],
    dateRange: 'today'
  });
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [preparationTimeInput, setPreparationTimeInput] = useState<string>('');

  useEffect(() => {
    if (tenant?.id) {
      // Subscribe to realtime orders
      subscribeToOrders(tenant.id);
      
      return () => {
        unsubscribeFromOrders();
      };
    }
  }, [tenant?.id]);

  const handleFilterChange = (key: keyof OrderFiltersState, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    
    // Apply filters to store
    const storeFilters: any = {
      searchTerm: newFilters.search,
      status: newFilters.status,
      type: newFilters.type
    };
    
    // Handle date filters
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (newFilters.dateRange) {
      case 'today':
        storeFilters.dateFrom = today;
        break;
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        storeFilters.dateFrom = weekAgo;
        break;
      case 'month':
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        storeFilters.dateFrom = monthAgo;
        break;
      case 'custom':
        if (newFilters.customDateFrom) storeFilters.dateFrom = newFilters.customDateFrom;
        if (newFilters.customDateTo) storeFilters.dateTo = newFilters.customDateTo;
        break;
    }
    
    setFilters(storeFilters);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setShowStatusDropdown(null);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      try {
        await cancelOrder(orderId, reason);
      } catch (error) {
        console.error('Error cancelling order:', error);
      }
    }
  };

  const handleUpdatePreparationTime = async (orderId: string) => {
    const minutes = parseInt(preparationTimeInput);
    if (!isNaN(minutes) && minutes > 0) {
      try {
        await updatePreparationTime(orderId, minutes);
        setPreparationTimeInput('');
      } catch (error) {
        console.error('Error updating preparation time:', error);
      }
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'preparing':
        return <Clock className="w-4 h-4" />;
      case 'ready':
        return <ShoppingBag className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'confirmed':
        return 'text-blue-600 bg-blue-100';
      case 'preparing':
        return 'text-orange-600 bg-orange-100';
      case 'ready':
        return 'text-green-600 bg-green-100';
      case 'completed':
        return 'text-gray-600 bg-gray-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: Order['type']) => {
    switch (type) {
      case 'dine-in':
        return <User className="w-4 h-4" />;
      case 'takeaway':
        return <ShoppingBag className="w-4 h-4" />;
      case 'delivery':
        return <Truck className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const exportOrders = () => {
    // TODO: Implement export functionality
    console.log('Exporting orders...');
  };

  return (
    <div className="flex h-full">
      {/* Orders List */}
      <div className={`flex-1 p-6 ${selectedOrder ? 'border-r' : ''}`}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Manage and track all orders</p>
        </div>

        {/* Toolbar */}
        <div className="mb-4 space-y-4">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders..."
                value={localFilters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            <button
              onClick={() => tenant && loadOrders(tenant.id, filters)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={exportOrders}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'] as OrderStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        const newStatuses = localFilters.status.includes(status)
                          ? localFilters.status.filter(s => s !== status)
                          : [...localFilters.status, status];
                        handleFilterChange('status', newStatuses);
                      }}
                      className={`px-3 py-1 rounded-full text-sm capitalize ${
                        localFilters.status.includes(status)
                          ? getStatusColor(status)
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Type
                </label>
                <div className="flex gap-2">
                  {(['dine-in', 'takeaway', 'delivery'] as Order['type'][]).map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const newTypes = localFilters.type.includes(type)
                          ? localFilters.type.filter(t => t !== type)
                          : [...localFilters.type, type];
                        handleFilterChange('type', newTypes);
                      }}
                      className={`px-3 py-1 rounded-lg text-sm capitalize flex items-center gap-2 ${
                        localFilters.type.includes(type)
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {getTypeIcon(type)}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="flex gap-2">
                  {(['today', 'week', 'month'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => handleFilterChange('dateRange', range)}
                      className={`px-3 py-1 rounded-lg text-sm capitalize ${
                        localFilters.dateRange === range
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{order.orderNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(order.createdAt, 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customerName}</div>
                      {order.customerPhone && (
                        <div className="text-sm text-gray-500">{order.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(order.type)}
                        <span className="text-sm text-gray-900 capitalize">{order.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowStatusDropdown(showStatusDropdown === order.id ? null : order.id);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status}</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        
                        {showStatusDropdown === order.id && (
                          <div className="absolute z-10 mt-1 w-48 bg-white border rounded-lg shadow-lg">
                            {(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'] as OrderStatus[])
                              .filter(status => status !== order.status)
                              .map(status => (
                                <button
                                  key={status}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(order.id, status);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 capitalize"
                                >
                                  {status}
                                </button>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        CHF {order.total.toFixed(2)}
                      </div>
                      <div className={`text-xs ${
                        order.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {order.paymentStatus}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(order.createdAt, 'HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Sidebar */}
      {selectedOrder && (
        <div className="w-96 p-6 bg-gray-50 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Order Details</h2>
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-lg font-semibold">#{selectedOrder.orderNumber}</p>
                <p className="text-sm text-gray-500">
                  {format(selectedOrder.createdAt, 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                {getStatusIcon(selectedOrder.status)}
                <span className="capitalize">{selectedOrder.status}</span>
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {selectedOrder.status === 'pending' && (
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'confirmed')}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Confirm Order
                </button>
              )}
              {selectedOrder.status === 'confirmed' && (
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'preparing')}
                  className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
                >
                  Start Preparing
                </button>
              )}
              {selectedOrder.status === 'preparing' && (
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'ready')}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                >
                  Mark Ready
                </button>
              )}
              {['pending', 'confirmed', 'preparing'].includes(selectedOrder.status) && (
                <button
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  className="px-3 py-2 border border-red-600 text-red-600 rounded-lg text-sm hover:bg-red-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Customer Information
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Name</p>
                <p className="font-medium">{selectedOrder.customerName}</p>
              </div>
              {selectedOrder.customerPhone && (
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedOrder.customerPhone}
                  </p>
                </div>
              )}
              {selectedOrder.customerEmail && (
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {selectedOrder.customerEmail}
                  </p>
                </div>
              )}
              {selectedOrder.type === 'delivery' && selectedOrder.deliveryAddress && (
                <div>
                  <p className="text-gray-500">Delivery Address</p>
                  <p className="font-medium flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5" />
                    <span>
                      {selectedOrder.deliveryAddress.street}<br />
                      {selectedOrder.deliveryAddress.postalCode} {selectedOrder.deliveryAddress.city}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-3">Order Items</h3>
            <div className="space-y-3">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.quantity}x {item.name}</p>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {item.modifiers.map(m => m.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-gray-500 italic">{item.notes}</p>
                    )}
                  </div>
                  <p className="font-medium">CHF {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>CHF {selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>CHF {selectedOrder.tax.toFixed(2)}</span>
              </div>
              {selectedOrder.serviceFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Service Fee</span>
                  <span>CHF {selectedOrder.serviceFee.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.deliveryFee && selectedOrder.deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span>CHF {selectedOrder.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.discount && selectedOrder.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-CHF {selectedOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total</span>
                <span>CHF {selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-medium capitalize">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium capitalize ${
                  selectedOrder.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {selectedOrder.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Preparation Time */}
          {['confirmed', 'preparing'].includes(selectedOrder.status) && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Preparation Time
              </h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Minutes"
                  value={preparationTimeInput}
                  onChange={(e) => setPreparationTimeInput(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleUpdatePreparationTime(selectedOrder.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update
                </button>
              </div>
              {selectedOrder.estimatedTime && (
                <p className="text-sm text-gray-500 mt-2">
                  Current: {selectedOrder.estimatedTime} minutes
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {(selectedOrder.notes || selectedOrder.specialInstructions) && (
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Notes
              </h3>
              {selectedOrder.specialInstructions && (
                <div className="mb-3">
                  <p className="text-sm text-gray-500">Special Instructions</p>
                  <p className="text-sm">{selectedOrder.specialInstructions}</p>
                </div>
              )}
              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-gray-500">Internal Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
