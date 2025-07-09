import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Activity,
  Calendar,
  Download,
  Filter,
  Globe,
  Smartphone,
  Monitor,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface PlatformMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  activeUsers: number;
  usersGrowth: number;
  averageOrderValue: number;
  aovGrowth: number;
  conversionRate: number;
  conversionGrowth: number;
}

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
  newUsers: number;
}

interface TenantPerformance {
  tenantId: string;
  tenantName: string;
  revenue: number;
  orders: number;
  growth: number;
  churn: number;
}

interface DeviceStats {
  device: string;
  users: number;
  percentage: number;
}

interface LocationStats {
  canton: string;
  revenue: number;
  orders: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const PlatformAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [tenantPerformance, setTenantPerformance] = useState<TenantPerformance[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock metrics
      setMetrics({
        totalRevenue: 245680,
        revenueGrowth: 12.5,
        totalOrders: 8432,
        ordersGrowth: 8.3,
        activeUsers: 15234,
        usersGrowth: 5.7,
        averageOrderValue: 29.14,
        aovGrowth: 3.2,
        conversionRate: 3.8,
        conversionGrowth: 0.5,
      });

      // Mock revenue data
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const revenue: RevenueData[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        revenue.push({
          date: format(date, 'dd.MM'),
          revenue: Math.floor(Math.random() * 10000) + 5000,
          orders: Math.floor(Math.random() * 300) + 200,
          newUsers: Math.floor(Math.random() * 100) + 50,
        });
      }
      setRevenueData(revenue);

      // Mock tenant performance
      setTenantPerformance([
        {
          tenantId: 'rest-001',
          tenantName: 'Restaurant Alpenhof',
          revenue: 45230,
          orders: 1250,
          growth: 15.2,
          churn: 2.1,
        },
        {
          tenantId: 'cafe-002',
          tenantName: 'Café Zentral',
          revenue: 28950,
          orders: 980,
          growth: 8.5,
          churn: 1.8,
        },
        {
          tenantId: 'bar-003',
          tenantName: 'Sports Bar Arena',
          revenue: 35670,
          orders: 890,
          growth: 22.3,
          churn: 3.2,
        },
        {
          tenantId: 'pizza-004',
          tenantName: 'Pizza Express',
          revenue: 52340,
          orders: 2150,
          growth: -5.2,
          churn: 4.5,
        },
        {
          tenantId: 'bist-005',
          tenantName: 'Bistro Milano',
          revenue: 18900,
          orders: 620,
          growth: 12.8,
          churn: 1.5,
        },
      ]);

      // Mock device stats
      setDeviceStats([
        { device: 'Mobile', users: 9140, percentage: 60 },
        { device: 'Desktop', users: 4571, percentage: 30 },
        { device: 'Tablet', users: 1523, percentage: 10 },
      ]);

      // Mock location stats
      setLocationStats([
        { canton: 'Zürich', revenue: 78450, orders: 2890 },
        { canton: 'Bern', revenue: 56230, orders: 1950 },
        { canton: 'Basel', revenue: 42180, orders: 1420 },
        { canton: 'Genf', revenue: 38900, orders: 1280 },
        { canton: 'Luzern', revenue: 30120, orders: 892 },
      ]);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    // TODO: Implement data export
    console.log('Exporting analytics data...');
  };

  const formatCurrency = (value: number) => {
    return `CHF ${value.toLocaleString('de-CH')}`;
  };

  const formatPercentage = (value: number) => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Analytics-Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">
            Umfassende Einblicke in die Plattform-Performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Zeitraum wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Letzte 7 Tage</SelectItem>
              <SelectItem value="30d">Letzte 30 Tage</SelectItem>
              <SelectItem value="90d">Letzte 90 Tage</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Daten exportieren
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Gesamtumsatz
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(metrics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                {metrics.revenueGrowth > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {formatPercentage(metrics.revenueGrowth)} zum Vorzeitraum
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Bestellungen
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.totalOrders.toLocaleString('de-CH')}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                {metrics.ordersGrowth > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {formatPercentage(metrics.ordersGrowth)} zum Vorzeitraum
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Aktive Nutzer
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.activeUsers.toLocaleString('de-CH')}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                {metrics.usersGrowth > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {formatPercentage(metrics.usersGrowth)} zum Vorzeitraum
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ø Bestellwert
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                CHF {metrics.averageOrderValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                {metrics.aovGrowth > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {formatPercentage(metrics.aovGrowth)} zum Vorzeitraum
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conversion Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.conversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                {metrics.conversionGrowth > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {formatPercentage(metrics.conversionGrowth)} Punkte
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Umsatz & Bestellungen</TabsTrigger>
          <TabsTrigger value="tenants">Tenant Performance</TabsTrigger>
          <TabsTrigger value="devices">Geräte & Standorte</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Umsatzentwicklung</CardTitle>
              <CardDescription>
                Tägliche Umsätze, Bestellungen und neue Nutzer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="revenue" orientation="left" />
                  <YAxis yAxisId="orders" orientation="right" />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'Umsatz') return formatCurrency(value);
                      return value;
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                    name="Umsatz"
                  />
                  <Area
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orders"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                    name="Bestellungen"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Tenants nach Umsatz</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tenantPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tenantName" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tenant Wachstum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenantPerformance.map((tenant) => (
                    <div key={tenant.tenantId} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{tenant.tenantName}</span>
                          <span className={`text-sm font-medium flex items-center ${
                            tenant.growth > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {tenant.growth > 0 ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {formatPercentage(tenant.growth)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{tenant.orders} Bestellungen</span>
                          <span>Churn: {tenant.churn}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Geräteverteilung</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deviceStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.device}: ${entry.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="users"
                    >
                      {deviceStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Umsatz nach Kantonen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {locationStats.map((location, index) => (
                    <div key={location.canton}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{location.canton}</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(location.revenue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2"
                            style={{
                              width: `${(location.revenue / locationStats[0].revenue) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {location.orders} Orders
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlatformAnalytics;
