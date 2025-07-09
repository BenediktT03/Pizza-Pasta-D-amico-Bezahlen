import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Package,
  Clock,
  AlertCircle,
  Activity,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenantStore } from '../../stores/tenant.store';
import { useOrdersStore } from '../../stores/orders.store';
import { analyticsService } from '../../services/analytics';
import { format } from 'date-fns';

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }>;
}

export function Dashboard() {
  const { user } = useAuth();
  const { tenant } = useTenantStore();
  const { 
    stats, 
    getActiveOrders, 
    subscribeToOrders, 
    unsubscribeFromOrders 
  } = useOrdersStore();
  
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [revenueChart, setRevenueChart] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant?.id) {
      // Subscribe to realtime orders
      subscribeToOrders(tenant.id);
      
      // Load dashboard metrics
      loadDashboardMetrics();
      
      // Refresh metrics every 5 minutes
      const interval = setInterval(loadDashboardMetrics, 5 * 60 * 1000);
      
      return () => {
        unsubscribeFromOrders();
        clearInterval(interval);
      };
    }
  }, [tenant?.id]);

  const loadDashboardMetrics = async () => {
    if (!tenant?.id) return;
    
    try {
      setLoading(true);
      
      // Get dashboard metrics
      const metrics = await analyticsService.getDashboardMetrics(tenant.id);
      setDashboardMetrics(metrics);
      
      // Get revenue trend for chart
      const revenueTrend = await analyticsService.getRevenueTrend(tenant.id, 7);
      
      setRevenueChart({
        labels: revenueTrend.map(day => format(new Date(day.date), 'MMM dd')),
        datasets: [{
          label: 'Revenue',
          data: revenueTrend.map(day => day.revenue),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        }]
      });
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = getActiveOrders();

  const metricCards: MetricCard[] = [
    {
      title: 'Today\'s Revenue',
      value: `CHF ${dashboardMetrics?.today.revenue.toFixed(2) || '0.00'}`,
      change: dashboardMetrics?.changes.revenue,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500',
      loading
    },
    {
      title: 'Orders Today',
      value: dashboardMetrics?.today.orders || 0,
      change: dashboardMetrics?.changes.orders,
      icon: <ShoppingCart className="w-6 h-6" />,
      color: 'bg-blue-500',
      loading
    },
    {
      title: 'Active Orders',
      value: activeOrders.length,
      icon: <Clock className="w-6 h-6" />,
      color: 'bg-orange-500'
    },
    {
      title: 'Avg Order Value',
      value: `CHF ${dashboardMetrics?.today.averageOrderValue.toFixed(2) || '0.00'}`,
      change: dashboardMetrics?.changes.averageOrderValue,
      icon: <CreditCard className="w-6 h-6" />,
      color: 'bg-purple-500',
      loading
    }
  ];

  const getChangeIcon = (change?: number) => {
    if (!change) return null;
    
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    
    return null;
  };

  const getChangeColor = (change?: number) => {
    if (!change) return 'text-gray-500';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with {tenant?.name} today.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${metric.color} bg-opacity-10`}>
                <div className={`${metric.color} text-white`}>
                  {metric.icon}
                </div>
              </div>
              {metric.change !== undefined && (
                <div className="flex items-center gap-1">
                  {getChangeIcon(metric.change)}
                  <span className={`text-sm font-medium ${getChangeColor(metric.change)}`}>
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">{metric.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {metric.loading ? (
                  <span className="animate-pulse bg-gray-200 rounded w-20 h-8 block"></span>
                ) : (
                  metric.value
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trend (7 Days)
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : revenueChart ? (
            <div className="h-64">
              {/* Chart would be rendered here using a charting library */}
              <div className="flex items-center justify-center h-full text-gray-400">
                Chart Component
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Order Status Distribution
          </h2>
          <div className="space-y-3">
            {[
              { status: 'Pending', count: stats.pending, color: 'bg-yellow-500' },
              { status: 'Confirmed', count: stats.confirmed, color: 'bg-blue-500' },
              { status: 'Preparing', count: stats.preparing, color: 'bg-orange-500' },
              { status: 'Ready', count: stats.ready, color: 'bg-green-500' },
              { status: 'Completed', count: stats.completed, color: 'bg-gray-500' },
              { status: 'Cancelled', count: stats.cancelled, color: 'bg-red-500' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm text-gray-600">{item.status}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Orders Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Orders</h2>
          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {activeOrders.length} Active
          </span>
        </div>
        
        {activeOrders.length > 0 ? (
          <div className="space-y-3">
            {activeOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    order.status === 'pending' ? 'bg-yellow-500' :
                    order.status === 'confirmed' ? 'bg-blue-500' :
                    order.status === 'preparing' ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.customerName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">CHF {order.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    {format(order.createdAt, 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-2" />
            <p>No active orders</p>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Store Status</p>
              <p className="font-medium text-gray-900">
                {tenant?.isActive ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Plan</p>
              <p className="font-medium text-gray-900 capitalize">
                {tenant?.subscription.plan}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600">Order Limit</p>
              <p className="font-medium text-gray-900">
                {tenant?.subscription.monthlyOrderLimit ? 
                  `${tenant.subscription.currentMonthOrders} / ${tenant.subscription.monthlyOrderLimit}` : 
                  'Unlimited'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
