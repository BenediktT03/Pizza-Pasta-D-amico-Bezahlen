import {
  Database,
  ref,
  set,
  get,
  update,
  remove,
  push,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  off,
  query,
  orderByChild,
  orderByKey,
  orderByValue,
  limitToFirst,
  limitToLast,
  startAt,
  endAt,
  equalTo,
  DataSnapshot,
  DatabaseReference,
  Query,
  Unsubscribe,
  serverTimestamp as rtdbServerTimestamp,
} from 'firebase/database';
import { realtimeDb } from '@/config/firebase';

export interface RealtimeQueryOptions {
  orderBy?: 'child' | 'key' | 'value';
  orderByField?: string;
  limitToFirst?: number;
  limitToLast?: number;
  startAt?: any;
  endAt?: any;
  equalTo?: any;
}

export interface RealtimeListener {
  type: 'value' | 'child_added' | 'child_changed' | 'child_removed';
  callback: (snapshot: DataSnapshot) => void;
  error?: (error: Error) => void;
}

export class RealtimeService {
  private db: Database;
  private activeListeners: Map<string, DatabaseReference> = new Map();

  constructor() {
    this.db = realtimeDb;
  }

  /**
   * Get data once
   */
  async get<T = any>(path: string): Promise<T | null> {
    try {
      const snapshot = await get(ref(this.db, path));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error('Error getting data:', error);
      throw error;
    }
  }

  /**
   * Set data at path
   */
  async set<T = any>(path: string, data: T): Promise<void> {
    try {
      await set(ref(this.db, path), {
        ...data,
        updatedAt: rtdbServerTimestamp(),
      });
    } catch (error) {
      console.error('Error setting data:', error);
      throw error;
    }
  }

  /**
   * Update data at path
   */
  async update(path: string, updates: { [key: string]: any }): Promise<void> {
    try {
      await update(ref(this.db, path), {
        ...updates,
        updatedAt: rtdbServerTimestamp(),
      });
    } catch (error) {
      console.error('Error updating data:', error);
      throw error;
    }
  }

  /**
   * Remove data at path
   */
  async remove(path: string): Promise<void> {
    try {
      await remove(ref(this.db, path));
    } catch (error) {
      console.error('Error removing data:', error);
      throw error;
    }
  }

  /**
   * Push new data to list
   */
  async push<T = any>(path: string, data: T): Promise<string> {
    try {
      const newRef = push(ref(this.db, path));
      await set(newRef, {
        ...data,
        createdAt: rtdbServerTimestamp(),
        updatedAt: rtdbServerTimestamp(),
      });
      return newRef.key!;
    } catch (error) {
      console.error('Error pushing data:', error);
      throw error;
    }
  }

  /**
   * Listen to value changes
   */
  onValue<T = any>(
    path: string,
    callback: (data: T | null) => void,
    error?: (error: Error) => void
  ): Unsubscribe {
    const reference = ref(this.db, path);
    
    const unsubscribe = onValue(
      reference,
      (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
      },
      error
    );

    // Store reference for cleanup
    this.activeListeners.set(path, reference);

    return () => {
      unsubscribe();
      this.activeListeners.delete(path);
    };
  }

  /**
   * Listen to child events
   */
  onChild(
    path: string,
    listeners: RealtimeListener[]
  ): Unsubscribe {
    const reference = ref(this.db, path);
    const unsubscribes: Unsubscribe[] = [];

    listeners.forEach(({ type, callback, error }) => {
      switch (type) {
        case 'child_added':
          unsubscribes.push(onChildAdded(reference, callback, error));
          break;
        case 'child_changed':
          unsubscribes.push(onChildChanged(reference, callback, error));
          break;
        case 'child_removed':
          unsubscribes.push(onChildRemoved(reference, callback, error));
          break;
      }
    });

    // Store reference for cleanup
    this.activeListeners.set(path, reference);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      this.activeListeners.delete(path);
    };
  }

  /**
   * Query data with options
   */
  async query<T = any>(
    path: string,
    options: RealtimeQueryOptions
  ): Promise<T[]> {
    try {
      let q: Query = ref(this.db, path);

      // Apply ordering
      if (options.orderBy) {
        switch (options.orderBy) {
          case 'child':
            if (options.orderByField) {
              q = orderByChild(q, options.orderByField);
            }
            break;
          case 'key':
            q = orderByKey(q);
            break;
          case 'value':
            q = orderByValue(q);
            break;
        }
      }

      // Apply filters
      if (options.startAt !== undefined) {
        q = startAt(q, options.startAt);
      }
      if (options.endAt !== undefined) {
        q = endAt(q, options.endAt);
      }
      if (options.equalTo !== undefined) {
        q = equalTo(q, options.equalTo);
      }

      // Apply limits
      if (options.limitToFirst) {
        q = limitToFirst(q, options.limitToFirst);
      } else if (options.limitToLast) {
        q = limitToLast(q, options.limitToLast);
      }

      const snapshot = await get(q);
      const results: T[] = [];

      snapshot.forEach((child) => {
        results.push({
          id: child.key,
          ...child.val(),
        });
      });

      return results;
    } catch (error) {
      console.error('Error querying data:', error);
      throw error;
    }
  }

  /**
   * Listen to query changes
   */
  onQuery<T = any>(
    path: string,
    options: RealtimeQueryOptions,
    callback: (data: T[]) => void,
    error?: (error: Error) => void
  ): Unsubscribe {
    let q: Query = ref(this.db, path);

    // Apply ordering
    if (options.orderBy) {
      switch (options.orderBy) {
        case 'child':
          if (options.orderByField) {
            q = orderByChild(q, options.orderByField);
          }
          break;
        case 'key':
          q = orderByKey(q);
          break;
        case 'value':
          q = orderByValue(q);
          break;
      }
    }

    // Apply filters
    if (options.startAt !== undefined) {
      q = startAt(q, options.startAt);
    }
    if (options.endAt !== undefined) {
      q = endAt(q, options.endAt);
    }
    if (options.equalTo !== undefined) {
      q = equalTo(q, options.equalTo);
    }

    // Apply limits
    if (options.limitToFirst) {
      q = limitToFirst(q, options.limitToFirst);
    } else if (options.limitToLast) {
      q = limitToLast(q, options.limitToLast);
    }

    const unsubscribe = onValue(
      q,
      (snapshot) => {
        const results: T[] = [];
        snapshot.forEach((child) => {
          results.push({
            id: child.key,
            ...child.val(),
          });
        });
        callback(results);
      },
      error
    );

    return unsubscribe;
  }

  /**
   * Transaction update
   */
  async transaction<T = any>(
    path: string,
    updateFunction: (currentData: T | null) => T
  ): Promise<void> {
    try {
      const reference = ref(this.db, path);
      const snapshot = await get(reference);
      const currentData = snapshot.exists() ? snapshot.val() : null;
      const newData = updateFunction(currentData);
      await set(reference, newData);
    } catch (error) {
      console.error('Error in transaction:', error);
      throw error;
    }
  }

  /**
   * Get server timestamp
   */
  getServerTimestamp() {
    return rtdbServerTimestamp();
  }

  /**
   * Disconnect all listeners
   */
  disconnectAll(): void {
    this.activeListeners.forEach((ref, path) => {
      off(ref);
    });
    this.activeListeners.clear();
  }

  /**
   * Go online
   */
  goOnline(): void {
    // Firebase automatically manages online/offline state
    // This method is for explicit control if needed
  }

  /**
   * Go offline
   */
  goOffline(): void {
    // Firebase automatically manages online/offline state
    // This method is for explicit control if needed
  }

  /**
   * Create presence system for user
   */
  setupPresence(userId: string): Unsubscribe {
    const userStatusRef = ref(this.db, `status/${userId}`);
    const isOfflineForDatabase = {
      state: 'offline',
      lastSeen: rtdbServerTimestamp(),
    };

    const isOnlineForDatabase = {
      state: 'online',
      lastSeen: rtdbServerTimestamp(),
    };

    // Create a reference to the special '.info/connected' path
    const connectedRef = ref(this.db, '.info/connected');
    
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) {
        return;
      }

      // Set user as online
      set(userStatusRef, isOnlineForDatabase);

      // Set user as offline when they disconnect
      // Note: onDisconnect is not available in modular SDK
      // You might need to implement this differently
    });

    return () => {
      unsubscribe();
      set(userStatusRef, isOfflineForDatabase);
    };
  }

  /**
   * Listen to connection state
   */
  onConnectionStateChange(
    callback: (isConnected: boolean) => void
  ): Unsubscribe {
    const connectedRef = ref(this.db, '.info/connected');
    return onValue(connectedRef, (snapshot) => {
      callback(snapshot.val() === true);
    });
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
