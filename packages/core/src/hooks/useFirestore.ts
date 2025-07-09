import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  DocumentData,
  DocumentReference,
  CollectionReference,
  Unsubscribe,
  FirestoreError
} from 'firebase/firestore';
import { db } from '../services/database/firestore.service';

// Types
export interface UseDocumentOptions {
  subscribe?: boolean;
  initialData?: any;
  onError?: (error: FirestoreError) => void;
  transform?: (data: any) => any;
}

export interface UseCollectionOptions {
  subscribe?: boolean;
  initialData?: any[];
  onError?: (error: FirestoreError) => void;
  transform?: (data: any) => any;
  filters?: QueryConstraint[];
}

export interface FirestoreState<T> {
  data: T | null;
  loading: boolean;
  error: FirestoreError | null;
}

export interface FirestoreCollectionState<T> {
  data: T[];
  loading: boolean;
  error: FirestoreError | null;
  hasMore: boolean;
}

/**
 * Hook to manage a single Firestore document
 */
export function useDocument<T = DocumentData>(
  path: string | null,
  options: UseDocumentOptions = {}
): FirestoreState<T> & {
  refresh: () => Promise<void>;
  update: (data: Partial<T>) => Promise<void>;
  remove: () => Promise<void>;
} {
  const [state, setState] = useState<FirestoreState<T>>({
    data: options.initialData || null,
    loading: true,
    error: null,
  });

  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  // Fetch document
  const fetchDocument = useCallback(async () => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const docRef = doc(db, path);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        const transformed = options.transform ? options.transform(data) : data;
        setState({ data: transformed as T, loading: false, error: null });
      } else {
        setState({ data: null, loading: false, error: null });
      }
    } catch (error) {
      const firestoreError = error as FirestoreError;
      setState({ data: null, loading: false, error: firestoreError });
      options.onError?.(firestoreError);
    }
  }, [path, options]);

  // Subscribe to document
  const subscribeToDocument = useCallback(() => {
    if (!path || !options.subscribe) return;

    const docRef = doc(db, path);
    
    unsubscribeRef.current = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          const transformed = options.transform ? options.transform(data) : data;
          setState({ data: transformed as T, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: null });
        }
      },
      (error) => {
        setState({ data: null, loading: false, error });
        options.onError?.(error);
      }
    );

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [path, options]);

  // Update document
  const update = useCallback(async (data: Partial<T>) => {
    if (!path) throw new Error('No document path provided');

    try {
      const docRef = doc(db, path);
      await updateDoc(docRef, data as DocumentData);
      
      if (!options.subscribe) {
        await fetchDocument();
      }
    } catch (error) {
      const firestoreError = error as FirestoreError;
      setState(prev => ({ ...prev, error: firestoreError }));
      options.onError?.(firestoreError);
      throw error;
    }
  }, [path, options, fetchDocument]);

  // Delete document
  const remove = useCallback(async () => {
    if (!path) throw new Error('No document path provided');

    try {
      const docRef = doc(db, path);
      await deleteDoc(docRef);
      setState({ data: null, loading: false, error: null });
    } catch (error) {
      const firestoreError = error as FirestoreError;
      setState(prev => ({ ...prev, error: firestoreError }));
      options.onError?.(firestoreError);
      throw error;
    }
  }, [path, options]);

  // Effect to fetch or subscribe
  useEffect(() => {
    if (options.subscribe) {
      return subscribeToDocument();
    } else {
      fetchDocument();
    }

    return () => {
      unsubscribeRef.current?.();
    };
  }, [path, options.subscribe]);

  return {
    ...state,
    refresh: fetchDocument,
    update,
    remove,
  };
}

/**
 * Hook to manage a Firestore collection
 */
export function useCollection<T = DocumentData>(
  path: string | null,
  options: UseCollectionOptions = {}
): FirestoreCollectionState<T> & {
  refresh: () => Promise<void>;
  add: (data: Omit<T, 'id'>) => Promise<DocumentReference>;
  update: (id: string, data: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  loadMore: () => Promise<void>;
} {
  const [state, setState] = useState<FirestoreCollectionState<T>>({
    data: options.initialData || [],
    loading: true,
    error: null,
    hasMore: false,
  });

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const lastDocRef = useRef<any>(null);

  // Build query
  const buildQuery = useCallback((startAfter?: any) => {
    if (!path) return null;

    const collectionRef = collection(db, path);
    const constraints: QueryConstraint[] = [...(options.filters || [])];

    if (startAfter) {
      constraints.push(limit(20)); // Default page size
    }

    return query(collectionRef, ...constraints);
  }, [path, options.filters]);

  // Fetch collection
  const fetchCollection = useCallback(async (append = false) => {
    if (!path) {
      setState({ data: [], loading: false, error: null, hasMore: false });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const q = buildQuery(append ? lastDocRef.current : undefined);
      if (!q) return;

      const querySnapshot = await getDocs(q);
      const docs: T[] = [];

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        const transformed = options.transform ? options.transform(data) : data;
        docs.push(transformed as T);
      });

      if (querySnapshot.docs.length > 0) {
        lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1];
      }

      setState({
        data: append ? [...state.data, ...docs] : docs,
        loading: false,
        error: null,
        hasMore: querySnapshot.docs.length === 20, // Matches page size
      });
    } catch (error) {
      const firestoreError = error as FirestoreError;
      setState(prev => ({ ...prev, loading: false, error: firestoreError }));
      options.onError?.(firestoreError);
    }
  }, [path, buildQuery, options, state.data]);

  // Subscribe to collection
  const subscribeToCollection = useCallback(() => {
    if (!path || !options.subscribe) return;

    const q = buildQuery();
    if (!q) return;

    unsubscribeRef.current = onSnapshot(
      q,
      (querySnapshot) => {
        const docs: T[] = [];

        querySnapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          const transformed = options.transform ? options.transform(data) : data;
          docs.push(transformed as T);
        });

        setState({
          data: docs,
          loading: false,
          error: null,
          hasMore: false, // Subscription doesn't support pagination
        });
      },
      (error) => {
        setState(prev => ({ ...prev, loading: false, error }));
        options.onError?.(error);
      }
    );

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [path, options, buildQuery]);

  // Add document
  const add = useCallback(async (data: Omit<T, 'id'>) => {
    if (!path) throw new Error('No collection path provided');

    try {
      const collectionRef = collection(db, path);
      const docRef = doc(collectionRef);
      await setDoc(docRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (!options.subscribe) {
        await fetchCollection();
      }

      return docRef;
    } catch (error) {
      const firestoreError = error as FirestoreError;
      setState(prev => ({ ...prev, error: firestoreError }));
      options.onError?.(firestoreError);
      throw error;
    }
  }, [path, options, fetchCollection]);

  // Update document
  const update = useCallback(async (id: string, data: Partial<T>) => {
    if (!path) throw new Error('No collection path provided');

    try {
      const docRef = doc(db, path, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date(),
      } as DocumentData);

      if (!options.subscribe) {
        setState(prev => ({
          ...prev,
          data: prev.data.map(item => 
            (item as any).id === id 
              ? { ...(item as any), ...data, updatedAt: new Date() }
              : item
          ),
        }));
      }
    } catch (error) {
      const firestoreError = error as FirestoreError;
      setState(prev => ({ ...prev, error: firestoreError }));
      options.onError?.(firestoreError);
      throw error;
    }
  }, [path, options]);

  // Delete document
  const remove = useCallback(async (id: string) => {
    if (!path) throw new Error('No collection path provided');

    try {
      const docRef = doc(db, path, id);
      await deleteDoc(docRef);

      if (!options.subscribe) {
        setState(prev => ({
          ...prev,
          data: prev.data.filter(item => (item as any).id !== id),
        }));
      }
    } catch (error) {
      const firestoreError = error as FirestoreError;
      setState(prev => ({ ...prev, error: firestoreError }));
      options.onError?.(firestoreError);
      throw error;
    }
  }, [path, options]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.loading) return;
    await fetchCollection(true);
  }, [state.hasMore, state.loading, fetchCollection]);

  // Effect to fetch or subscribe
  useEffect(() => {
    if (options.subscribe) {
      return subscribeToCollection();
    } else {
      fetchCollection();
    }

    return () => {
      unsubscribeRef.current?.();
    };
  }, [path, options.subscribe]);

  return {
    ...state,
    refresh: () => fetchCollection(false),
    add,
    update,
    remove,
    loadMore,
  };
}

/**
 * Hook for Firestore queries with pagination
 */
export function useFirestoreQuery<T = DocumentData>(
  queryBuilder: (() => any) | null,
  options: UseCollectionOptions = {}
) {
  const [state, setState] = useState<FirestoreCollectionState<T>>({
    data: options.initialData || [],
    loading: true,
    error: null,
    hasMore: false,
  });

  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  // Execute query
  const executeQuery = useCallback(async () => {
    if (!queryBuilder) {
      setState({ data: [], loading: false, error: null, hasMore: false });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const q = queryBuilder();
      const querySnapshot = await getDocs(q);
      const docs: T[] = [];

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        const transformed = options.transform ? options.transform(data) : data;
        docs.push(transformed as T);
      });

      setState({
        data: docs,
        loading: false,
        error: null,
        hasMore: false,
      });
    } catch (error) {
      const firestoreError = error as FirestoreError;
      setState({ data: [], loading: false, error: firestoreError, hasMore: false });
      options.onError?.(firestoreError);
    }
  }, [queryBuilder, options]);

  // Subscribe to query
  const subscribeToQuery = useCallback(() => {
    if (!queryBuilder || !options.subscribe) return;

    const q = queryBuilder();

    unsubscribeRef.current = onSnapshot(
      q,
      (querySnapshot) => {
        const docs: T[] = [];

        querySnapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          const transformed = options.transform ? options.transform(data) : data;
          docs.push(transformed as T);
        });

        setState({
          data: docs,
          loading: false,
          error: null,
          hasMore: false,
        });
      },
      (error) => {
        setState({ data: [], loading: false, error, hasMore: false });
        options.onError?.(error);
      }
    );

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [queryBuilder, options]);

  // Effect
  useEffect(() => {
    if (options.subscribe) {
      return subscribeToQuery();
    } else {
      executeQuery();
    }

    return () => {
      unsubscribeRef.current?.();
    };
  }, [queryBuilder, options.subscribe]);

  return {
    ...state,
    refresh: executeQuery,
  };
}

/**
 * Hook for batch operations
 */
export function useFirestoreBatch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | null>(null);

  const batchWrite = useCallback(async (operations: Array<{
    type: 'set' | 'update' | 'delete';
    path: string;
    data?: any;
  }>) => {
    setLoading(true);
    setError(null);

    try {
      // Firestore batch has a limit of 500 operations
      const chunks = [];
      for (let i = 0; i < operations.length; i += 500) {
        chunks.push(operations.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = db.batch();

        chunk.forEach(op => {
          const docRef = doc(db, op.path);

          switch (op.type) {
            case 'set':
              batch.set(docRef, op.data);
              break;
            case 'update':
              batch.update(docRef, op.data);
              break;
            case 'delete':
              batch.delete(docRef);
              break;
          }
        });

        await batch.commit();
      }

      setLoading(false);
    } catch (err) {
      const firestoreError = err as FirestoreError;
      setError(firestoreError);
      setLoading(false);
      throw err;
    }
  }, []);

  return {
    batchWrite,
    loading,
    error,
  };
}
