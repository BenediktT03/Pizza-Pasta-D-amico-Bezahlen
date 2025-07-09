import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  CreditCard,
  TrendingUp,
  Users,
  AlertCircle,
  Download,
  Calendar,
  Euro,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TenantBilling {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'overdue' | 'cancelled';
  currentPeriod: {
    start: Date;
    end: Date;
  };
  usage: {
    orders: number;
    storage: number; // GB
    users: number;
  };
  amount: number;
  currency: string;
  nextBillingDate: Date;
  paymentMethod?: string;
}

interface BillingMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerTenant: number;
  growthRate: number;
  churnRate: number;
  activeSubscriptions: number;
  overduePayments: number;
}

export const BillingOverview: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [billingData, setBillingData] = useState<TenantBilling[]>([]);
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch billing data
    fetchBillingData();
  }, [selectedPeriod]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setBillingData([
        {
          id: '1',
          tenantId: 'rest-001',
          tenantName: 'Restaurant Alpenhof',
          plan: 'professional',
          status: 'active',
          currentPeriod: {
            start: new Date('2025-01-01'),
            end: new Date('2025-01-31'),
          },
          usage: {
            orders: 1250,
            storage: 2.5,
            users: 8,
          },
          amount: 149.00,
          currency: 'CHF',
          nextBillingDate: new Date('2025-02-01'),
          paymentMethod: 'VISA ****1234',
        },
        {
          id: '2',
          tenantId: 'cafe-002',
          tenantName: 'Café Zentral',
          plan: 'starter',
          status: 'active',
          currentPeriod: {
            start: new Date('2025-01-01'),
            end: new Date('2025-01-31'),
          },
          usage: {
            orders: 450,
            storage: 0.8,
            users: 3,
          },
          amount: 49.00,
          currency: 'CHF',
          nextBillingDate: new Date('2025-02-01'),
          paymentMethod: 'SEPA',
        },
        {
          id: '3',
          tenantId: 'bar-003',
          tenantName: 'Sports Bar Arena',
          plan: 'professional',
          status: 'overdue',
          currentPeriod: {
            start: new Date('2024-12-01'),
            end: new Date('2024-12-31'),
          },
          usage: {
            orders: 980,
            storage: 1.2,
            users: 5,
          },
          amount: 149.00,
          currency: 'CHF',
          nextBillingDate: new Date('2025-01-01'),
          paymentMethod: 'VISA ****5678',
        },
      ]);

      setMetrics({
        totalRevenue: 12450.00,
        monthlyRecurringRevenue: 2890.00,
        averageRevenuePerTenant: 98.50,
        growthRate: 12.5,
        churnRate: 2.3,
        activeSubscriptions: 28,
        overduePayments: 3,
      });
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'starter':
        return 'secondary';
      case 'professional':
        return 'default';
      case 'enterprise':
        return 'success';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'overdue':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleExportInvoices = () => {
    // TODO: Implement invoice export
    console.log('Exporting invoices...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Abrechnungsdaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Abrechnung</h1>
          <p className="text-muted-foreground">
            Übersicht über alle Tenant-Abrechnungen und Umsätze
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Zeitraum wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Heute</SelectItem>
              <SelectItem value="week">Diese Woche</SelectItem>
              <SelectItem value="month">Dieser Monat</SelectItem>
              <SelectItem value="quarter">Dieses Quartal</SelectItem>
              <SelectItem value="year">Dieses Jahr</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportInvoices} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Rechnungen exportieren
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Gesamtumsatz
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                CHF {metrics.totalRevenue.toLocaleString('de-CH')}
              </div>
              <p className="text-xs text-muted-foreground">
                +{metrics.growthRate}% zum Vormonat
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                MRR
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                CHF {metrics.monthlyRecurringRevenue.toLocaleString('de-CH')}
              </div>
              <p className="text-xs text-muted-foreground">
                Monatlich wiederkehrend
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Aktive Abos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.activeSubscriptions}
              </div>
              <p className="text-xs text-muted-foreground">
                Churn Rate: {metrics.churnRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Überfällige Zahlungen
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {metrics.overduePayments}
              </div>
              <p className="text-xs text-muted-foreground">
                Sofortige Aufmerksamkeit erforderlich
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant-Abrechnungen</CardTitle>
          <CardDescription>
            Übersicht aller Tenant-Abrechnungen und deren Status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nutzung</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Nächste Abrechnung</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingData.map((billing) => (
                <TableRow key={billing.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{billing.tenantName}</div>
                      <div className="text-sm text-muted-foreground">
                        {billing.tenantId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPlanBadgeVariant(billing.plan)}>
                      {billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(billing.status)}>
                      {billing.status === 'active' ? 'Aktiv' : 
                       billing.status === 'overdue' ? 'Überfällig' : 'Gekündigt'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{billing.usage.orders} Bestellungen</div>
                      <div className="text-muted-foreground">
                        {billing.usage.storage} GB • {billing.usage.users} Nutzer
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {billing.currency} {billing.amount.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(billing.nextBillingDate, 'dd. MMM yyyy', { locale: de })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/billing/${billing.tenantId}`)}
                    >
                      Details
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revenue Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Umsatzentwicklung</CardTitle>
          <CardDescription>
            Monatliche Umsatzentwicklung der letzten 12 Monate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-muted rounded">
            <p className="text-muted-foreground">
              Umsatz-Chart wird hier angezeigt
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingOverview;
