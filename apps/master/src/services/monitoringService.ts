// System Monitoring Service for Master Admin
import { 
  collection, 
  doc, 
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  services: ServiceStatus[];
  performance: PerformanceMetrics;
  errors: SystemError[];
  alerts: SystemAlert[];
  lastCheck: Date;
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  uptime: number;
  lastError?: string;
  lastCheck: Date;
}

export interface PerformanceMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    inbound: number;
    outbound: number;
    latency: number;
  };
  database: {
    reads: number;
    writes: number;
    connections: number;
    avgQueryTime: number;
  };
}

export interface SystemError {
  id: string;
  service: string;
  error: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  resolved: boolean;
}

export interface SystemAlert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  tenantId?: string;
}

export interface DeploymentInfo {
  id: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  deployedAt: Date;
  deployedBy: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  services: {
    name: string;
    version: string;
    status: string;
  }[];
  rollbackVersion?: string;
}

class SystemMonitoringService {
  private healthSubscription?: () => void;
  private alertSubscription?: () => void;

  // Get current system health
  async getSystemHealth(): Promise<SystemHealth> {
    const healthFunction = httpsCallable(functions, 'getSystemHealth');
    const result = await healthFunction();
    return result.data as SystemHealth;
  }

  // Subscribe to real-time health updates
  subscribeToHealth(callback: (health: SystemHealth) => void): () => void {
    const healthDoc = doc(db, 'system_monitoring', 'health');
    
    this.healthSubscription = onSnapshot(healthDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          ...data,
          lastCheck: data.lastCheck?.toDate()
        } as SystemHealth);
      }
    });

    return () => {
      if (this.healthSubscription) {
        this.healthSubscription();
      }
    };
  }

  // Get system errors
  async getSystemErrors(filters: {
    service?: string;
    severity?: string;
    resolved?: boolean;
    limit?: number;
  } = {}): Promise<SystemError[]> {
    let q = query(collection(db, 'system_errors'));

    if (filters.service) {
      q = query(q, where('service', '==', filters.service));
    }

    if (filters.severity) {
      q = query(q, where('severity', '==', filters.severity));
    }

    if (filters.resolved !== undefined) {
      q = query(q, where('resolved', '==', filters.resolved));
    }

    q = query(q, orderBy('lastOccurrence', 'desc'));

    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const snapshot = await getDocs(q);
    const errors: SystemError[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      errors.push({
        id: doc.id,
        ...data,
        firstOccurrence: data.firstOccurrence?.toDate(),
        lastOccurrence: data.lastOccurrence?.toDate()
      } as SystemError);
    });

    return errors;
  }

  // Subscribe to system alerts
  subscribeToAlerts(callback: (alerts: SystemAlert[]) => void): () => void {
    const alertsQuery = query(
      collection(db, 'system_alerts'),
      where('acknowledged', '==', false),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    this.alertSubscription = onSnapshot(alertsQuery, (snapshot) => {
      const alerts: SystemAlert[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        alerts.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate(),
          acknowledgedAt: data.acknowledgedAt?.toDate()
        } as SystemAlert);
      });
      callback(alerts);
    });

    return () => {
      if (this.alertSubscription) {
        this.alertSubscription();
      }
    };
  }

  // Acknowledge alert
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const acknowledgeFunction = httpsCallable(functions, 'acknowledgeSystemAlert');
    await acknowledgeFunction({ alertId, userId });
  }

  // Get system logs
  async getSystemLogs(filters: {
    service?: string;
    level?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    limit?: number;
  }): Promise<LogEntry[]> {
    const logsFunction = httpsCallable(functions, 'getSystemLogs');
    const result = await logsFunction({
      ...filters,
      startDate: filters.startDate?.toISOString(),
      endDate: filters.endDate?.toISOString()
    });
    
    const logs = result.data as any[];
    return logs.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp)
    }));
  }

  // Get deployment history
  async getDeployments(limit: number = 20): Promise<DeploymentInfo[]> {
    const deploymentsFunction = httpsCallable(functions, 'getDeployments');
    const result = await deploymentsFunction({ limit });
    
    const deployments = result.data as any[];
    return deployments.map(dep => ({
      ...dep,
      deployedAt: new Date(dep.deployedAt)
    }));
  }

  // Trigger deployment
  async triggerDeployment(environment: 'staging' | 'production', version?: string): Promise<{
    deploymentId: string;
    status: string;
  }> {
    const deployFunction = httpsCallable(functions, 'triggerDeployment');
    const result = await deployFunction({ environment, version });
    return result.data as any;
  }

  // Rollback deployment
  async rollbackDeployment(deploymentId: string): Promise<void> {
    const rollbackFunction = httpsCallable(functions, 'rollbackDeployment');
    await rollbackFunction({ deploymentId });
  }

  // Get resource usage trends
  async getResourceTrends(resource: 'cpu' | 'memory' | 'disk' | 'network', period: 'hour' | 'day' | 'week' = 'day'): Promise<{
    timestamps: Date[];
    values: number[];
    average: number;
    peak: number;
  }> {
    const trendsFunction = httpsCallable(functions, 'getResourceTrends');
    const result = await trendsFunction({ resource, period });
    
    const data = result.data as any;
    return {
      ...data,
      timestamps: data.timestamps.map((ts: string) => new Date(ts))
    };
  }

  // Run system diagnostic
  async runDiagnostic(type: 'quick' | 'full' = 'quick'): Promise<{
    id: string;
    status: 'running' | 'completed' | 'failed';
    results?: {
      category: string;
      status: 'pass' | 'warning' | 'fail';
      message: string;
      details?: any;
    }[];
    completedAt?: Date;
  }> {
    const diagnosticFunction = httpsCallable(functions, 'runSystemDiagnostic');
    const result = await diagnosticFunction({ type });
    return result.data as any;
  }

  // Configure monitoring alert
  async configureMonitoringAlert(alert: {
    metric: string;
    threshold: number;
    condition: 'above' | 'below';
    duration: number; // minutes
    recipients: string[];
  }): Promise<string> {
    const configureFunction = httpsCallable(functions, 'configureMonitoringAlert');
    const result = await configureFunction(alert);
    return result.data as string;
  }

  // Get backup status
  async getBackupStatus(): Promise<{
    lastBackup: Date;
    nextScheduled: Date;
    backups: {
      id: string;
      timestamp: Date;
      size: number;
      status: 'completed' | 'failed';
      location: string;
    }[];
  }> {
    const backupFunction = httpsCallable(functions, 'getBackupStatus');
    const result = await backupFunction();
    
    const data = result.data as any;
    return {
      lastBackup: new Date(data.lastBackup),
      nextScheduled: new Date(data.nextScheduled),
      backups: data.backups.map((b: any) => ({
        ...b,
        timestamp: new Date(b.timestamp)
      }))
    };
  }

  // Trigger manual backup
  async triggerBackup(): Promise<{
    backupId: string;
    status: string;
  }> {
    const backupFunction = httpsCallable(functions, 'triggerManualBackup');
    const result = await backupFunction();
    return result.data as any;
  }

  // Cleanup subscriptions
  cleanup(): void {
    if (this.healthSubscription) {
      this.healthSubscription();
    }
    if (this.alertSubscription) {
      this.alertSubscription();
    }
  }
}

export const systemMonitoringService = new SystemMonitoringService();
