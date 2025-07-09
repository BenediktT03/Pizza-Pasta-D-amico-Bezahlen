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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Rocket,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  GitBranch,
  GitCommit,
  GitMerge,
  Server,
  Activity,
  Terminal,
  Play,
  Pause,
  RotateCcw,
  Download,
  Eye,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Deployment {
  id: string;
  version: string;
  environment: 'production' | 'staging' | 'development';
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed' | 'rolled_back';
  application: string;
  branch: string;
  commit: string;
  commitMessage: string;
  author: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  logs?: DeploymentLog[];
  artifacts?: DeploymentArtifact[];
}

interface DeploymentLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
}

interface DeploymentArtifact {
  name: string;
  size: number;
  url: string;
}

interface Environment {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastDeployment?: Deployment;
  activeVersion: string;
  url: string;
  metrics: {
    cpu: number;
    memory: number;
    requests: number;
    errorRate: number;
  };
}

export const Deployments: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [deployTarget, setDeployTarget] = useState({
    environment: '',
    branch: '',
    application: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeploymentData();
    const interval = setInterval(fetchDeploymentData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDeploymentData = async () => {
    try {
      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock deployments
      const mockDeployments: Deployment[] = [
        {
          id: '1',
          version: 'v3.2.1',
          environment: 'production',
          status: 'success',
          application: 'web-app',
          branch: 'main',
          commit: 'a3f4b2c',
          commitMessage: 'feat: Add voice ordering support for Swiss German',
          author: 'Sarah Weber',
          startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
          duration: 1800,
        },
        {
          id: '2',
          version: 'v3.2.2-beta',
          environment: 'staging',
          status: 'deploying',
          application: 'admin-app',
          branch: 'feature/analytics-v2',
          commit: 'b5c6d7e',
          commitMessage: 'feat: New analytics dashboard with real-time metrics',
          author: 'Thomas Meier',
          startedAt: new Date(Date.now() - 5 * 60 * 1000),
        },
        {
          id: '3',
          version: 'v3.2.0',
          environment: 'production',
          status: 'failed',
          application: 'api-gateway',
          branch: 'hotfix/payment-timeout',
          commit: 'c8d9e0f',
          commitMessage: 'fix: Increase payment gateway timeout',
          author: 'Michael Braun',
          startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
          duration: 1800,
        },
        {
          id: '4',
          version: 'v3.1.9',
          environment: 'development',
          status: 'success',
          application: 'web-app',
          branch: 'develop',
          commit: 'd1e2f3g',
          commitMessage: 'test: Add E2E tests for checkout flow',
          author: 'Anna Schmidt',
          startedAt: new Date(Date.now() - 30 * 60 * 1000),
          completedAt: new Date(Date.now() - 25 * 60 * 1000),
          duration: 300,
        },
      ];

      // Mock environments
      const mockEnvironments: Environment[] = [
        {
          name: 'Production',
          status: 'healthy',
          activeVersion: 'v3.2.1',
          url: 'https://app.eatech.ch',
          lastDeployment: mockDeployments[0],
          metrics: {
            cpu: 42,
            memory: 68,
            requests: 1250,
            errorRate: 0.1,
          },
        },
        {
          name: 'Staging',
          status: 'healthy',
          activeVersion: 'v3.2.2-beta',
          url: 'https://staging.eatech.ch',
          metrics: {
            cpu: 35,
            memory: 52,
            requests: 450,
            errorRate: 0.3,
          },
        },
        {
          name: 'Development',
          status: 'healthy',
          activeVersion: 'v3.1.9',
          url: 'https://dev.eatech.ch',
          lastDeployment: mockDeployments[3],
          metrics: {
            cpu: 28,
            memory: 45,
            requests: 120,
            errorRate: 1.2,
          },
        },
      ];

      // Add mock logs to deploying deployment
      if (mockDeployments[1].status === 'deploying') {
        mockDeployments[1].logs = [
          {
            timestamp: new Date(Date.now() - 4 * 60 * 1000),
            level: 'info',
            message: 'Starting deployment process...',
          },
          {
            timestamp: new Date(Date.now() - 3 * 60 * 1000),
            level: 'info',
            message: 'Building Docker image...',
          },
          {
            timestamp: new Date(Date.now() - 2 * 60 * 1000),
            level: 'info',
            message: 'Pushing image to registry...',
          },
          {
            timestamp: new Date(Date.now() - 60 * 1000),
            level: 'info',
            message: 'Updating Kubernetes deployment...',
          },
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Waiting for pods to be ready...',
          },
        ];
      }

      setDeployments(mockDeployments);
      setEnvironments(mockEnvironments);
    } catch (error) {
      console.error('Error fetching deployment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    // TODO: Trigger deployment via API
    console.log('Deploying:', deployTarget);
    setShowDeployDialog(false);
  };

  const handleRollback = async (deploymentId: string) => {
    // TODO: Trigger rollback via API
    if (window.confirm('Möchten Sie wirklich zu dieser Version zurückkehren?')) {
      console.log('Rolling back deployment:', deploymentId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'deploying':
      case 'building':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rolled_back':
        return <RotateCcw className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'deploying':
      case 'building':
        return 'secondary';
      case 'pending':
        return 'warning';
      case 'rolled_back':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getEnvironmentBadgeVariant = (env: string) => {
    switch (env) {
      case 'production':
        return 'destructive';
      case 'staging':
        return 'warning';
      case 'development':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Deployment-Daten...</p>
        </div>
      </div>
    );
  }

  const activeDeployments = deployments.filter(d => 
    d.status === 'deploying' || d.status === 'building' || d.status === 'pending'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Deployments</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Deployments und Umgebungen
          </p>
        </div>
        <Button onClick={() => setShowDeployDialog(true)}>
          <Rocket className="mr-2 h-4 w-4" />
          Neues Deployment
        </Button>
      </div>

      {/* Active Deployments Alert */}
      {activeDeployments.length > 0 && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertTitle>Aktive Deployments</AlertTitle>
          <AlertDescription>
            {activeDeployments.length} Deployment{activeDeployments.length > 1 ? 's' : ''} läuft gerade.
          </AlertDescription>
        </Alert>
      )}

      {/* Environments Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {environments.map((env) => (
          <Card key={env.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{env.name}</CardTitle>
                <Badge 
                  variant={env.status === 'healthy' ? 'success' : 
                          env.status === 'degraded' ? 'warning' : 'destructive'}
                >
                  {env.status === 'healthy' ? 'Gesund' :
                   env.status === 'degraded' ? 'Beeinträchtigt' : 'Ausgefallen'}
                </Badge>
              </div>
              <CardDescription>
                Version: {env.activeVersion}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">CPU:</span>
                    <Progress value={env.metrics.cpu} className="mt-1 h-2" />
                    <span className="text-xs">{env.metrics.cpu}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Memory:</span>
                    <Progress value={env.metrics.memory} className="mt-1 h-2" />
                    <span className="text-xs">{env.metrics.memory}%</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Requests/min:</span>
                    <div className="font-medium">{env.metrics.requests}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Error Rate:</span>
                    <div className="font-medium">{env.metrics.errorRate}%</div>
                  </div>
                </div>

                {env.lastDeployment && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Letztes Deployment vor{' '}
                      {formatDistanceToNow(env.lastDeployment.startedAt, { 
                        locale: de,
                        addSuffix: false 
                      })}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(env.url, '_blank')}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Anzeigen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setDeployTarget(prev => ({ ...prev, environment: env.name.toLowerCase() }));
                      setShowDeployDialog(true);
                    }}
                  >
                    <Rocket className="mr-1 h-3 w-3" />
                    Deploy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deployments History */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Historie</CardTitle>
          <CardDescription>
            Alle Deployments der letzten 30 Tage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Umgebung</TableHead>
                <TableHead>Anwendung</TableHead>
                <TableHead>Branch / Commit</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Zeitpunkt</TableHead>
                <TableHead>Dauer</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(deployment.status)}
                      <Badge variant={getStatusBadgeVariant(deployment.status)}>
                        {deployment.status === 'success' ? 'Erfolgreich' :
                         deployment.status === 'failed' ? 'Fehlgeschlagen' :
                         deployment.status === 'deploying' ? 'Läuft' :
                         deployment.status === 'building' ? 'Baut' :
                         deployment.status === 'pending' ? 'Ausstehend' : 'Zurückgesetzt'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{deployment.version}</TableCell>
                  <TableCell>
                    <Badge variant={getEnvironmentBadgeVariant(deployment.environment)}>
                      {deployment.environment}
                    </Badge>
                  </TableCell>
                  <TableCell>{deployment.application}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      <span className="text-sm">{deployment.branch}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GitCommit className="h-3 w-3" />
                      <code>{deployment.commit}</code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{deployment.author}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {deployment.commitMessage}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(deployment.startedAt, 'dd.MM.yyyy HH:mm', { locale: de })}
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(deployment.duration)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDeployment(deployment)}
                      >
                        <Terminal className="h-4 w-4" />
                      </Button>
                      {deployment.status === 'success' && 
                       deployment.environment === 'production' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRollback(deployment.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Deployment Details Dialog */}
      <Dialog 
        open={!!selectedDeployment} 
        onOpenChange={() => setSelectedDeployment(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh]">
          {selectedDeployment && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Deployment Details - {selectedDeployment.version}
                </DialogTitle>
                <DialogDescription>
                  {selectedDeployment.application} auf {selectedDeployment.environment}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="logs" className="mt-4">
                <TabsList>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>

                <TabsContent value="logs">
                  <ScrollArea className="h-[400px] w-full rounded border p-4">
                    {selectedDeployment.logs ? (
                      <div className="space-y-2 font-mono text-sm">
                        {selectedDeployment.logs.map((log, index) => (
                          <div key={index} className="flex gap-2">
                            <span className="text-muted-foreground">
                              {format(log.timestamp, 'HH:mm:ss')}
                            </span>
                            <span className={
                              log.level === 'error' ? 'text-red-500' :
                              log.level === 'warning' ? 'text-yellow-500' :
                              'text-green-500'
                            }>
                              [{log.level.toUpperCase()}]
                            </span>
                            <span>{log.message}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Keine Logs verfügbar</p>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="details">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Deployment Info</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Version:</span>
                            <span>{selectedDeployment.version}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant={getStatusBadgeVariant(selectedDeployment.status)}>
                              {selectedDeployment.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Umgebung:</span>
                            <Badge variant={getEnvironmentBadgeVariant(selectedDeployment.environment)}>
                              {selectedDeployment.environment}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Anwendung:</span>
                            <span>{selectedDeployment.application}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Git Info</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Branch:</span>
                            <span>{selectedDeployment.branch}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Commit:</span>
                            <code className="text-xs">{selectedDeployment.commit}</code>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Autor:</span>
                            <span>{selectedDeployment.author}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Commit Message</h4>
                      <p className="text-sm bg-muted p-3 rounded">
                        {selectedDeployment.commitMessage}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Deployment Dialog */}
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Deployment starten</DialogTitle>
            <DialogDescription>
              Wählen Sie die Zielumgebung und den Branch für das Deployment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Umgebung</label>
              <Select 
                value={deployTarget.environment} 
                onValueChange={(value) => setDeployTarget(prev => ({ ...prev, environment: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Umgebung wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Anwendung</label>
              <Select 
                value={deployTarget.application} 
                onValueChange={(value) => setDeployTarget(prev => ({ ...prev, application: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Anwendung wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web-app">Web App</SelectItem>
                  <SelectItem value="admin-app">Admin App</SelectItem>
                  <SelectItem value="master-app">Master App</SelectItem>
                  <SelectItem value="api-gateway">API Gateway</SelectItem>
                  <SelectItem value="functions">Cloud Functions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Select 
                value={deployTarget.branch} 
                onValueChange={(value) => setDeployTarget(prev => ({ ...prev, branch: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Branch wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">main</SelectItem>
                  <SelectItem value="develop">develop</SelectItem>
                  <SelectItem value="staging">staging</SelectItem>
                  <SelectItem value="feature/analytics-v2">feature/analytics-v2</SelectItem>
                  <SelectItem value="hotfix/payment-timeout">hotfix/payment-timeout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeployDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleDeploy}
              disabled={!deployTarget.environment || !deployTarget.branch || !deployTarget.application}
            >
              <Rocket className="mr-2 h-4 w-4" />
              Deployment starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Deployments;
