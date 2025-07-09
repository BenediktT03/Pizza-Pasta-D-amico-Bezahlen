// Real-time data hooks for Master Admin
import { useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  usePlatformStore,
  useSystemStatus 
} from '../stores/platformStore';
import { platformAnalyticsService } from '../services/analyticsService';
import { systemMonitoringService } from '../services/monitoringService';

// Real-time platform metrics
export const useRealtimeMetrics = () => {
  const { setLiveMetrics } = usePlatformStore();
  
  useEffect(() => {
    const unsubscribe = platformAnalyticsService.subscribeLiveMetrics((metrics) => {
      setLiveMetrics(metrics);
    });
    
    return () => unsubscribe();
  }, [setLiveMetrics]);
};

// Real-time system health monitoring
export const useSystemHealthMonitoring = () => {
  const { setSystemHealth, setSystemAlerts } = usePlatformStore();
  
  useEffect(() => {
    // Subscribe to health updates
    const healthUnsubscribe = systemMonitoringService.subscribeToHealth((health) => {
      setSystemHealth(health);
    });
    
    // Subscribe to alerts
    const alertsUnsubscribe = systemMonitoringService.subscribeToAlerts((alerts) => {
      setSystemAlerts(alerts);
    });
    
    return () => {
      healthUnsubscribe();
      alertsUnsubscribe();
      systemMonitoringService.cleanup();
    };
  }, [setSystemHealth, setSystemAlerts]);
};

// Real-time tenant activity
export const useRealtimeTenantActivity = (limit = 10) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const q = query(
      collection(db, 'tenant_activities'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limit)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newActivities: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newActivities.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate()
        });
      });
      setActivities(newActivities);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [limit]);
  
  return { activities, loading };
};

// Real-time order monitoring
export const useRealtimeOrders = (filters?: {
  tenantId?: string;
  status?: string;
  limit?: number;
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    completed: 0
  });
  
  useEffect(() => {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc')
    ];
    
    if (filters?.tenantId) {
      constraints.push(where('tenantId', '==', filters.tenantId));
    }
    
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }
    
    if (filters?.limit) {
      constraints.push(firestoreLimit(filters.limit));
    }
    
    const q = query(collection(db, 'orders_live'), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newOrders: any[] = [];
      const newStats = {
        total: 0,
        pending: 0,
        preparing: 0,
        ready: 0,
        completed: 0
      };
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const order = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()
        };
        newOrders.push(order);
        
        // Update stats
        newStats.total++;
        if (data.status in newStats) {
          newStats[data.status as keyof typeof newStats]++;
        }
      });
      
      setOrders(newOrders);
      setStats(newStats);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [filters?.tenantId, filters?.status, filters?.limit]);
  
  return { orders, stats, loading };
};

// Real-time payment monitoring
export const useRealtimePayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalToday: 0,
    platformFeesToday: 0,
    transactionsToday: 0,
    averageTransaction: 0
  });
  
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, 'transactions'),
      where('createdAt', '>=', today),
      orderBy('createdAt', 'desc'),
      firestoreLimit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPayments: any[] = [];
      let total = 0;
      let fees = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const payment = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()
        };
        newPayments.push(payment);
        
        if (data.status === 'succeeded') {
          total += data.amount;
          fees += data.platformFee;
        }
      });
      
      setPayments(newPayments);
      setStats({
        totalToday: total,
        platformFeesToday: fees,
        transactionsToday: newPayments.filter(p => p.status === 'succeeded').length,
        averageTransaction: newPayments.length > 0 ? total / newPayments.length : 0
      });
    });
    
    return () => unsubscribe();
  }, []);
  
  return { payments, stats };
};

// Real-time error monitoring
export const useRealtimeErrors = () => {
  const [errors, setErrors] = useState<any[]>([]);
  const [errorRate, setErrorRate] = useState(0);
  
  useEffect(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const q = query(
      collection(db, 'system_errors'),
      where('timestamp', '>=', fiveMinutesAgo),
      where('resolved', '==', false),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newErrors: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newErrors.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate()
        });
      });
      
      setErrors(newErrors);
      // Calculate error rate (errors per minute)
      setErrorRate(newErrors.length / 5);
    });
    
    return () => unsubscribe();
  }, []);
  
  return { errors, errorRate };
};

// Combined system status hook
export const useSystemDashboard = () => {
  const systemStatus = useSystemStatus();
  const { liveMetrics, systemHealth } = usePlatformStore();
  const { errors, errorRate } = useRealtimeErrors();
  const { payments, stats: paymentStats } = useRealtimePayments();
  
  return {
    systemStatus,
    liveMetrics,
    systemHealth,
    errors,
    errorRate,
    paymentStats,
    recentPayments: payments.slice(0, 5)
  };
};
