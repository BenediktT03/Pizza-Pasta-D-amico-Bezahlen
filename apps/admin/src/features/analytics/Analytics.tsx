import React, { useState, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  RefreshCw,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  CreditCard,
  Target,
  Activity
} from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useTenantStore } from '../../stores/tenant.store';
import { analyticsService, AnalyticsMetrics } from '../../services/analytics';

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }>;
}

export function Analytics() {
  const { tenant } = useTenantStore();
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
    label: 'Today'
  });
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'orders' | 'customers'>('revenue');
  const [comparisonPeriod, setComparisonPeriod] = useState<'previous' | 'lastYear'>('previous');

  // Chart data states
  const [revenueChart, setRevenueChart] = useState<ChartData | null>(null);
  const [ordersChart, setOrdersChart] = useState<ChartData | null>(null);
  const [hourlyChart, setHourlyChart] = useState<ChartData | null>(null);
  const [categoryChart, setCategoryChart] = useState<ChartData | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      loadAnalytics();
    }
  }, [tenant?.id, dateRange]);

  const loadAnalytics = async () => {
    if (!tenant?.id) return;
    
    try {
      setLoading(true);
      
      // Load metrics for current period
      const currentMetrics = await analyticsService.getMetrics(tenant.id, dateRange);
      setMetrics(currentMetrics);
      
      // Load comparison metrics
      const comparisonRange = getComparisonDateRange();
      const comparisonMetrics = await analyticsService.getMetrics(tenant.id, comparisonRange);
      
      // Calculate percentage changes
      const revenueChange = calculatePercentageChange(currentMetrics.revenue, comparisonMetrics.revenue);
      const ordersChange = calculatePercentageChange(currentMetrics.orders, comparisonMetrics.orders);
      const aovChange = calculatePercentageChange(currentMetrics.averageOrderValue, comparisonMetrics.averageOrderValue);
      const customersChange = calculatePercentageChange(currentMetrics.customers, comparisonMetrics.customers);
      
      // Update metrics with changes
      setMetrics({
        ...currentMetrics,
        revenueChange,
        ordersChange,
        aovChange,
        customersChange
      } as any);
      
      // Load chart data
      await loadChartData();
      
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    if (!tenant?.id) return;
    
    // Revenue trend chart
    const revenueTrend = await analyticsService.getRevenueTrend(tenant.id, 30);
    setRevenueChart({
      labels: revenueTrend.map(day => format(new Date(day.date), 'MMM dd')),
      datasets: [{
        label: 'Revenue',
        data: revenueTrend.map(day => day.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      }]
    });
    
    // Hourly distribution from metrics
    if (metrics) {
      setHourlyChart({
        labels: metrics.hourlyDistribution.map(h => `${h.hour}:00`),
        datasets: [{
          label: 'Orders',
          data: metrics.hourlyDistribution.map(h => h.orders),
          backgroundColor: 'rgba(59, 130, 246, 0.5)'
        }]
      });
    }
  };

  const getComparisonDateRange = (): DateRange => {
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (comparisonPeriod === 'previous') {
      return {
        start: subDays(dateRange.start, daysDiff),
        end: subDays(dateRange.end, daysDiff),
        label: 'Previous Period'
      };
    } else {
      return {
        start: subDays(dateRange.start, 365),
        end: subDays(dateRange.end, 365),
        label: 'Last Year'
      };
    }
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const handleDateRangeChange = (preset: string) => {
    const today = new Date();
    let newRange: DateRange;
    
    switch (preset) {
      case 'today':
        newRange = {
          start: startOfDay(today),
          end: endOfDay(today),
          label: 'Today'
        };
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        newRange = {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday),
          label: 'Yesterday'
        };
        break;
      case 'week':
        newRange = {
          start: startOfWeek(today),
          end: endOfWeek(today),
          label: 'This Week'
        };
        break;
      case 'month':
        newRange = {
          start: startOfMonth(today),
          end: endOfMonth(today),
          label: 'This Month'
        };
        break;
      case 'last7days':
        newRange = {
          start: subDays(today, 7),
          end: today,
          label: 'Last 7 Days'
        };
        break;
      case 'last30days':
        newRange = {
          start: subDays(today, 30),
          end: today,
          label: 'Last 30 Days'
        };
        break;
      default:
        return;
    }
    
    setDateRange(newRange);
    setShowDatePicker(false);
  };

  const handleCustomDateRange = () => {
    if (customDateRange.start && customDateRange.end) {
      setDateRange({
        start: new Date(customDateRange.start),
        end: new Date(customDateRange.end),
        label: 'Custom Range'
      });
      setShowDatePicker(false);
    }
  };

  const exportAnalytics = async () => {
    if (!tenant?.id || !metrics) return;
    
    try {
      const data = await analyticsService.exportAnalytics(tenant.id, dateRange, 'csv');
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  const metricCards: MetricCard[] = [
    {
      title: 'Total Revenue',
      value: `CHF ${metrics?.revenue.toFixed(2) || '0.00'}`,
      change: (metrics as any)?.revenueChange,
      changeLabel: 'vs ' + (comparisonPeriod === 'previous' ? 'previous period' : 'last year'),
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500',
      subtitle: `${metrics?.orders || 0} orders`
    },
    {
      title: 'Total Orders',
      value: metrics?.orders || 0,
      change: (metrics as any)?.ordersChange,
      changeLabel: 'vs ' + (comparisonPeriod === 'previous' ? 'previous period' : 'last year'),
      icon: <ShoppingCart className="w-6 h-6" />,
      color: 'bg-blue-500',
      subtitle: `${metrics?.customers || 0} customers`
    },
    {
      title: 'Average Order Value',
      value: `CHF ${metrics?.averageOrderValue.toFixed(2) || '0.00'}`,
      change: (metrics as any)?.aovChange,
      changeLabel: 'vs ' + (comparisonPeriod === 'previous' ? 'previous period' : 'last year'),
      icon: <CreditCard className="w-6 h-6" />,
      color: 'bg-purple-500'
    },
    {
      title: 'Conversion Rate',
      value: `${metrics?.conversionRate.toFixed(1) || 0}%`,
      change: (metrics as any)?.conversionChange,
      changeLabel: 'vs ' + (comparisonPeriod === 'previous' ? 'previous period' : 'last year'),
      icon: <Target className="w-6 h-6" />,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your business performance and insights</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportAnalytics}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {dateRange.label}
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showDatePicker && (
                <div className="absolute z-10 mt-2 w-64 bg-white border rounded-lg shadow-lg p-4">
                  <div className="space-y-2">
                    {['today', 'yesterday', 'week', 'month', 'last7days', 'last30days'].map(preset => (
                      <button
                        key={preset}
                        onClick={() => handleDateRangeChange(preset)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 capitalize"
                      >
                        {preset.replace(/(\d+)/, ' $1 ')}
                      </button>
                    ))}
                    
                    <div className="border-t pt-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Custom Range</p>
                      <input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                        className="w-full px-3 py-1 border rounded mb-2"
                      />
                      <input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                        className="w-full px-3 py-1 border rounded mb-2"
                      />
                      <button
                        onClick={handleCustomDateRange}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <select
              value={comparisonPeriod}
              onChange={(e) => setComparisonPeriod(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="previous">Compare to Previous Period</option>
              <option value="lastYear">Compare to Last Year</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-500">
            {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${metric.color} bg-opacity-10`}>
                <div className={`${metric.color} text-white`}>
                  {metric.icon}
                </div>
              </div>
              {metric.change !== undefined && (
                <div className={`flex items-center gap-1 ${
                  metric.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change > 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">{metric.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? (
                  <span className="animate-pulse bg-gray-200 rounded w-20 h-8 block"></span>
                ) : (
                  metric.value
                )}
              </p>
              {metric.subtitle && (
                <p className="text-sm text-gray-500 mt-1">{metric.subtitle}</p>
              )}
              {metric.changeLabel && (
                <p className="text-xs text-gray-400 mt-1">{metric.changeLabel}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <LineChart className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="h-64">
              {/* Chart would be rendered here */}
              <div className="flex items-center justify-center h-full text-gray-400">
                Revenue Chart Component
              </div>
            </div>
          )}
        </div>

        {/* Hourly Distribution Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Peak Hours</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="h-64">
              {/* Chart would be rendered here */}
              <div className="flex items-center justify-center h-full text-gray-400">
                Hourly Chart Component
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Products & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {metrics?.topProducts.slice(0, 10).map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.productName}</p>
                      <p className="text-xs text-gray-500">{product.quantity} sold</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    CHF {product.revenue.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {metrics?.paymentMethods.map((method, index) => {
                const percentage = metrics.revenue > 0 
                  ? (method.total / metrics.revenue) * 100 
                  : 0;
                
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {method.method}
                      </span>
                      <span className="text-sm text-gray-500">
                        {method.count} orders
                      </span>
                    </div>
                    <div className="relative">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">
                          {percentage.toFixed(1)}%
                        </span>
                        <span className="text-xs font-medium text-gray-700">
                          CHF {method.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Status Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {metrics?.orderStatuses.map((status, index) => (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 ${
                  status.status === 'completed' ? 'bg-green-100 text-green-600' :
                  status.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                  status.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                  status.status === 'preparing' ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <span className="text-xl font-bold">{status.count}</span>
                </div>
                <p className="text-sm font-medium text-gray-700 capitalize">{status.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
