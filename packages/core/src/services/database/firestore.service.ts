import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  runTransaction,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  UpdateData,
  DocumentSnapshot,
  QuerySnapshot,
  CollectionReference,
  DocumentReference,
  Query,
  Unsubscribe,
  WhereFilterOp,
  OrderByDirection,
  FieldValue,
  Transaction,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface QueryOptions {
  where?: Array<{
    field: string;
    operator: WhereFilterOp;
    value: any;
  }>;
  orderBy?: Array<{
    field: string;
    direction?: OrderByDirection;
  }>;
  limit?: number;
  startAfter?: any;
  endBefore?: any;
}

export interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  ref: DocumentReference;
  data?: any;
}

export class FirestoreService {
  private db: Firestore;

  constructor() {
    this.db = db;
  }

  /**
   * Get a document by ID
   */
  async getDocument<T = DocumentData>(
    collectionPath: string,
    documentId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(this.db, collectionPath, documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  /**
   * Get multiple documents by IDs
   */
  async getDocuments<T = DocumentData>(
    collectionPath: string,
    documentIds: string[]
  ): Promise<T[]> {
    try {
      const documents = await Promise.all(
        documentIds.map(id => this.getDocument<T>(collectionPath, id))
      );
      return documents.filter(doc => doc !== null) as T[];
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  }

  /**
   * Query documents with filters
   */
  async queryDocuments<T = DocumentData>(
    collectionPath: string,
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Add where clauses
      if (options?.where) {
        options.where.forEach(({ field, operator, value }) => {
          constraints.push(where(field, operator, value));
        });
      }

      // Add orderBy clauses
      if (options?.orderBy) {
        options.orderBy.forEach(({ field, direction = 'asc' }) => {
          constraints.push(orderBy(field, direction));
        });
      }

      // Add limit
      if (options?.limit) {
        constraints.push(limit(options.limit));
      }

      // Add pagination
      if (options?.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }
      if (options?.endBefore) {
        constraints.push(endBefore(options.endBefore));
      }

      const q = query(collection(this.db, collectionPath), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));
    } catch (error) {
      console.error('Error querying documents:', error);
      throw error;
    }
  }

  /**
   * Create a new document
   */
  async createDocument<T = DocumentData>(
    collectionPath: string,
    data: WithFieldValue<T>,
    documentId?: string
  ): Promise<string> {
    try {
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (documentId) {
        const docRef = doc(this.db, collectionPath, documentId);
        await setDoc(docRef, docData);
        return documentId;
      } else {
        const collectionRef = collection(this.db, collectionPath);
        const docRef = doc(collectionRef);
        await setDoc(docRef, docData);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async updateDocument<T = DocumentData>(
    collectionPath: string,
    documentId: string,
    data: UpdateData<T>
  ): Promise<void> {
    try {
      const docRef = doc(this.db, collectionPath, documentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(
    collectionPath: string,
    documentId: string
  ): Promise<void> {
    try {
      const docRef = doc(this.db, collectionPath, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Listen to a document changes
   */
  onDocument<T = DocumentData>(
    collectionPath: string,
    documentId: string,
    callback: (data: T | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const docRef = doc(this.db, collectionPath, documentId);
    
    return onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() } as T);
        } else {
          callback(null);
        }
      },
      onError
    );
  }

  /**
   * Listen to collection changes
   */
  onCollection<T = DocumentData>(
    collectionPath: string,
    callback: (data: T[]) => void,
    options?: QueryOptions,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const constraints: QueryConstraint[] = [];

    // Add where clauses
    if (options?.where) {
      options.where.forEach(({ field, operator, value }) => {
        constraints.push(where(field, operator, value));
      });
    }

    // Add orderBy clauses
    if (options?.orderBy) {
      options.orderBy.forEach(({ field, direction = 'asc' }) => {
        constraints.push(orderBy(field, direction));
      });
    }

    // Add limit
    if (options?.limit) {
      constraints.push(limit(options.limit));
    }

    const q = query(collection(this.db, collectionPath), ...constraints);
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as T));
        callback(data);
      },
      onError
    );
  }

  /**
   * Batch write operations
   */
  async batchWrite(operations: BatchOperation[]): Promise<void> {
    try {
      const batch = writeBatch(this.db);

      operations.forEach(({ type, ref, data }) => {
        switch (type) {
          case 'set':
            batch.set(ref, {
              ...data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            break;
          case 'update':
            batch.update(ref, {
              ...data,
              updatedAt: serverTimestamp(),
            });
            break;
          case 'delete':
            batch.delete(ref);
            break;
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error in batch write:', error);
      throw error;
    }
  }

  /**
   * Run a transaction
   */
  async runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    try {
      return await runTransaction(this.db, updateFunction);
    } catch (error) {
      console.error('Error in transaction:', error);
      throw error;
    }
  }

  /**
   * Get a collection reference
   */
  getCollectionRef(collectionPath: string): CollectionReference {
    return collection(this.db, collectionPath);
  }

  /**
   * Get a document reference
   */
  getDocumentRef(collectionPath: string, documentId: string): DocumentReference {
    return doc(this.db, collectionPath, documentId);
  }

  /**
   * Generate a new document ID
   */
  generateId(collectionPath: string): string {
    const collectionRef = collection(this.db, collectionPath);
    return doc(collectionRef).id;
  }

  /**
   * Get server timestamp
   */
  getServerTimestamp(): FieldValue {
    return serverTimestamp();
  }

  /**
   * Convert Firestore timestamp to Date
   */
  timestampToDate(timestamp: any): Date {
    return timestamp?.toDate() || new Date();
  }

  /**
   * Paginate query results
   */
  async paginateQuery<T = DocumentData>(
    collectionPath: string,
    pageSize: number,
    lastDoc?: DocumentSnapshot,
    options?: Omit<QueryOptions, 'limit' | 'startAfter'>
  ): Promise<{
    data: T[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      const constraints: QueryConstraint[] = [];

      // Add where clauses
      if (options?.where) {
        options.where.forEach(({ field, operator, value }) => {
          constraints.push(where(field, operator, value));
        });
      }

      // Add orderBy clauses
      if (options?.orderBy) {
        options.orderBy.forEach(({ field, direction = 'asc' }) => {
          constraints.push(orderBy(field, direction));
        });
      }

      // Add pagination
      constraints.push(limit(pageSize + 1));
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collection(this.db, collectionPath), ...constraints);
      const querySnapshot = await getDocs(q);

      const docs = querySnapshot.docs;
      const hasMore = docs.length > pageSize;
      const data = docs.slice(0, pageSize).map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));

      return {
        data,
        lastDoc: docs[pageSize - 1] || null,
        hasMore,
      };
    } catch (error) {
      console.error('Error paginating query:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();
