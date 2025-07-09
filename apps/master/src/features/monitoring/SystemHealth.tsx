import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Network,
  RefreshCw,
  Server,
  Shield,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: {
    warning: number;
    critical: number;
  };
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: number;
  responseTime: number;
  lastChecked: Date;
  endpoints: {
    name: string;
    status: 'ok' | 'slow' | 'error';
    responseTime: number;
  }[];
}

interface SystemIncident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  startTime: Date;
  endTime?: Date;
  affectedServices: string[];
  description: string;
}

export const SystemHealth: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSystemData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSystemData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchSystemData = async () => {
    try {
      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock metrics data
      setMetrics([
        {
          name: 'CPU Auslastung',
          value: 42,
          unit: '%',
          status: 'healthy',
          threshold: { warning: 70, critical: 90 },
        },
        {
          name: 'Arbeitsspeicher',
          value: 68,
          unit: '%',
          status: 'warning',
          threshold: { warning: 65, critical: 85 },
        },
        {
          name: 'Festplatte',
          value: 35,
          unit: '%',
          status: 'healthy',
          threshold: { warning: 75, critical: 90 },
        },
        {
          name: 'Netzwerk',
          value: 120,
          unit: 'ms',
          status: 'healthy',
          threshold: { warning: 200, critical: 500 },
        },
      ]);

      // Mock services data
      setServices([
        {
          name: 'Web Application',
          status: 'operational',
          uptime: 99.98,
          responseTime: 142,
          lastChecked: new Date(),
          endpoints: [
            { name: 'Homepage', status: 'ok', responseTime: 120 },
            { name: 'API Gateway', status: 'ok', responseTime: 85 },
            { name: 'CDN', status: 'ok', responseTime: 45 },
          ],
        },
        {
          name: 'Admin Dashboard',
          status: 'operational',
          uptime: 99.95,
          responseTime: 235,
          lastChecked: new Date(),
          endpoints: [
            { name: 'Dashboard', status: 'ok', responseTime: 210 },
            { name: 'Analytics', status: 'slow', responseTime: 380 },
            { name: 'Reports', status: 'ok', responseTime: 195 },
          ],
        },
        {
          name: 'Firebase Services',
          status: 'operational',
          uptime: 100,
          responseTime: 78,
          lastChecked: new Date(),
          endpoints: [
            { name: 'Firestore', status: 'ok', responseTime: 65 },
            { name: 'Authentication', status: 'ok', responseTime: 82 },
            { name: 'Storage', status: 'ok', responseTime: 91 },
          ],
        },
        {
          name: 'Payment Gateway',
          status: 'degraded',
          uptime: 98.5,
          responseTime: 420,
          lastChecked: new Date(),
          endpoints: [
            { name: 'Stripe', status: 'slow', responseTime: 520 },
            { name: 'TWINT', status: 'ok', responseTime: 180 },
            { name: 'PostFinance', status: 'ok', responseTime: 220 },
          ],
        },
      ]);

      // Mock incidents
      setIncidents([
        {
          id: '1',
          title: 'Erhöhte Antwortzeiten bei Payment Gateway',
          severity: 'medium',
          status: 'monitoring',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          affectedServices: ['Payment Gateway'],
          description: 'Stripe API zeigt erhöhte Antwortzeiten. Zahlungen funktionieren, aber mit Verzögerung.',
        },
      ]);
    } catch (error) {
      console.error('Error fetching system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'ok':
        return 'text-green-500';
      case 'warning':
      case 'degraded':
      case 'slow':
        return 'text-yellow-500';
      case 'critical':
      case 'down':
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
      case 'degraded':
      case 'slow':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
      case 'down':
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'secondary';
      case 'medium':
        return 'warning';
      case 'high':
        return 'destructive';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Systemstatus...</p>
        </div>
      </div>
    );
  }

  const overallHealth = services.every(s => s.status === 'operational') && 
                       incidents.filter(i => i.status !== 'resolved').length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Echtzeit-Überwachung aller Systemkomponenten
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-Refresh aktiv' : 'Auto-Refresh aus'}
          </Button>
          <Button variant="outline" onClick={fetchSystemData}>
            Jetzt aktualisieren
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Alert className={overallHealth ? 'border-green-500' : 'border-yellow-500'}>
        <Shield className="h-4 w-4" />
        <AlertTitle>System Status</AlertTitle>
        <AlertDescription>
          {overallHealth ? (
            'Alle Systeme funktionieren normal. Keine bekannten Probleme.'
          ) : (
            'Es gibt derzeit Probleme mit einigen Diensten. Details siehe unten.'
          )}
        </AlertDescription>
      </Alert>

      {/* Active Incidents */}
      {incidents.filter(i => i.status !== 'resolved').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Aktive Vorfälle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incidents
                .filter(i => i.status !== 'resolved')
                .map(incident => (
                  <div key={incident.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{incident.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Betroffen: {incident.affectedServices.join(', ')}
                        </p>
                      </div>
                      <Badge variant={getSeverityBadgeVariant(incident.severity)}>
                        {incident.severity}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{incident.description}</p>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Beginn: {format(incident.startTime, 'dd.MM.yyyy HH:mm', { locale: de })}
                      </span>
                      <span>Status: {incident.status}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold">
                  {metric.value}{metric.unit}
                </div>
                {getStatusIcon(metric.status)}
              </div>
              <Progress 
                value={metric.value} 
                className={`h-2 ${
                  metric.status === 'critical' ? 'bg-red-100' :
                  metric.status === 'warning' ? 'bg-yellow-100' : 'bg-green-100'
                }`}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Warnung: {metric.threshold.warning}{metric.unit} • 
                Kritisch: {metric.threshold.critical}{metric.unit}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>
            Verfügbarkeit und Performance aller Dienste
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {services.map((service) => (
              <div key={service.name} className="border-b last:border-0 pb-6 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Uptime: {service.uptime}% • Response: {service.responseTime}ms
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={service.status === 'operational' ? 'success' : 'warning'}
                  >
                    {service.status === 'operational' ? 'Betriebsbereit' : 
                     service.status === 'degraded' ? 'Beeinträchtigt' : 'Ausgefallen'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-3 ml-8">
                  {service.endpoints.map((endpoint) => (
                    <div 
                      key={endpoint.name} 
                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                    >
                      <span>{endpoint.name}</span>
                      <span className={getStatusColor(endpoint.status)}>
                        {endpoint.responseTime}ms
                      </span>
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-muted-foreground mt-2 ml-8">
                  Zuletzt geprüft: {format(service.lastChecked, 'HH:mm:ss', { locale: de })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemHealth;
