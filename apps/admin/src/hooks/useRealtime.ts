import { useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  DocumentData, 
  QueryConstraint,
  Unsubscribe,
  FirestoreError
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';

interface UseRealtimeOptions {
  enabled?: boolean;
  onError?: (error: FirestoreError) => void;
}

interface UseRealtimeReturn<T> {
  subscribe: (callback: (data: T[]) => void) => Unsubscribe;
  unsubscribe: () => void;
}

export function useRealtime<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options: UseRealtimeOptions = {}
): UseRealtimeReturn<T> {
  const { user } = useAuth();
  const { enabled = true, onError } = options;
  
  let unsubscribeFn: Unsubscribe | null = null;

  const subscribe = useCallback((callback: (data: T[]) => void) => {
    if (!enabled || !user) {
      return () => {};
    }

    // Add tenant constraint for multi-tenant data
    const tenantConstraints = user.tenantId 
      ? [...constraints, where('tenantId', '==', user.tenantId)]
      : constraints;

    const q = query(collection(db, collectionName), ...tenantConstraints);

    unsubscribeFn = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as T));
        
        callback(data);
      },
      (error) => {
        console.error(`Realtime subscription error for ${collectionName}:`, error);
        onError?.(error);
      }
    );

    return unsubscribeFn;
  }, [collectionName, constraints, enabled, user, onError]);

  const unsubscribe = useCallback(() => {
    if (unsubscribeFn) {
      unsubscribeFn();
      unsubscribeFn = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return { subscribe, unsubscribe };
}

// Specialized hooks for specific collections
export function useRealtimeOrders(options?: UseRealtimeOptions) {
  return useRealtime('orders', [
    where('status', 'in', ['pending', 'confirmed', 'preparing']),
    where('createdAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
  ], options);
}

export function useRealtimeInventory(options?: UseRealtimeOptions) {
  return useRealtime('inventory', [
    where('stockLevel', '<=', 10) // Low stock items
  ], options);
}

export function useRealtimeAnalytics(options?: UseRealtimeOptions) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return useRealtime('analytics', [
    where('date', '>=', today)
  ], options);
}

// Hook for realtime presence (online/offline status)
export function useRealtimePresence(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;

    const presenceRef = doc(db, 'presence', targetUserId);
    const updatePresence = async (isOnline: boolean) => {
      try {
        await setDoc(presenceRef, {
          isOnline,
          lastSeen: serverTimestamp(),
          userId: targetUserId
        }, { merge: true });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Set online
    updatePresence(true);

    // Listen for window events
    const handleOnline = () => updatePresence(true);
    const handleOffline = () => updatePresence(false);
    const handleBeforeUnload = () => updatePresence(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Set offline on cleanup
    return () => {
      updatePresence(false);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [targetUserId]);
}

// Hook for realtime notifications
export function useRealtimeNotifications(onNotification?: (notification: any) => void) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      where('read', '==', false),
      where('createdAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = {
            id: change.doc.id,
            ...change.doc.data()
          };
          
          onNotification?.(notification);
        }
      });
    });

    return unsubscribe;
  }, [user, onNotification]);
}

// Import fixes
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
