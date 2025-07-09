import { vi } from 'vitest';
import type { User, Auth, Unsubscribe } from 'firebase/auth';
import type { 
  Firestore, 
  DocumentReference, 
  CollectionReference,
  QuerySnapshot,
  DocumentSnapshot,
  Query,
  DocumentData
} from 'firebase/firestore';

// Mock User
export const mockUser: Partial<User> = {
  uid: 'test-user-123',
  email: 'test@eatech.ch',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  phoneNumber: '+41 79 123 45 67',
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  } as any,
  providerData: [],
  refreshToken: 'mock-refresh-token',
  tenantId: 'tenant-123',
  delete: vi.fn(),
  getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-id-token',
    claims: {
      role: 'admin',
      tenantId: 'tenant-123',
    },
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    signInProvider: 'password',
    signInSecondFactor: null,
  }),
  reload: vi.fn(),
  toJSON: vi.fn(),
};

// Mock Auth
export const mockAuth: Partial<Auth> = {
  currentUser: mockUser as User,
  languageCode: 'de',
  settings: {
    appVerificationDisabledForTesting: true,
  },
  tenantId: 'tenant-123',
  onAuthStateChanged: vi.fn((callback) => {
    callback(mockUser as User);
    return vi.fn(); // unsubscribe function
  }),
  onIdTokenChanged: vi.fn((callback) => {
    callback(mockUser as User);
    return vi.fn(); // unsubscribe function
  }),
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: mockUser,
    credential: null,
    operationType: 'signIn',
  }),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: mockUser,
    credential: null,
    operationType: 'signIn',
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  confirmPasswordReset: vi.fn().mockResolvedValue(undefined),
  updateCurrentUser: vi.fn().mockResolvedValue(undefined),
  setPersistence: vi.fn().mockResolvedValue(undefined),
};

// Mock Firestore Document
export const createMockDocument = <T = DocumentData>(
  id: string,
  data: T,
  exists = true
): Partial<DocumentSnapshot<T>> => ({
  id,
  exists: () => exists,
  data: () => (exists ? data : undefined),
  get: (field: string) => (exists ? (data as any)[field] : undefined),
  ref: {
    id,
    path: `collection/${id}`,
    parent: {} as CollectionReference,
  } as DocumentReference,
});

// Mock Firestore Query Snapshot
export const createMockQuerySnapshot = <T = DocumentData>(
  docs: Array<{ id: string; data: T }>
): Partial<QuerySnapshot<T>> => ({
  docs: docs.map(doc => createMockDocument(doc.id, doc.data) as DocumentSnapshot<T>),
  size: docs.length,
  empty: docs.length === 0,
  forEach: function(callback: any) {
    this.docs?.forEach(callback);
  },
});

// Mock Firestore
export const mockFirestore: Partial<Firestore> = {
  collection: vi.fn((path: string) => ({
    doc: vi.fn((id?: string) => ({
      id: id || 'generated-id',
      get: vi.fn().mockResolvedValue(createMockDocument(id || 'generated-id', {})),
      set: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      onSnapshot: vi.fn((callback) => {
        callback(createMockDocument(id || 'generated-id', {}));
        return vi.fn(); // unsubscribe function
      }),
    })),
    add: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    get: vi.fn().mockResolvedValue(createMockQuerySnapshot([])),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
    endBefore: vi.fn().mockReturnThis(),
    onSnapshot: vi.fn((callback) => {
      callback(createMockQuerySnapshot([]));
      return vi.fn(); // unsubscribe function
    }),
  })),
  doc: vi.fn((path: string) => ({
    id: path.split('/').pop(),
    path,
    get: vi.fn().mockResolvedValue(createMockDocument(path.split('/').pop() || '', {})),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    onSnapshot: vi.fn((callback) => {
      callback(createMockDocument(path.split('/').pop() || '', {}));
      return vi.fn(); // unsubscribe function
    }),
  })),
  batch: vi.fn(() => ({
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  runTransaction: vi.fn(async (updateFunction) => {
    const transaction = {
      get: vi.fn().mockResolvedValue(createMockDocument('trans-doc', {})),
      set: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
    return await updateFunction(transaction);
  }),
};

// Mock Firebase Functions
export const mockFunctions = {
  httpsCallable: vi.fn((name: string) => 
    vi.fn().mockResolvedValue({ data: { success: true } })
  ),
};

// Mock Firebase Storage
export const mockStorage = {
  ref: vi.fn((path?: string) => ({
    child: vi.fn((childPath: string) => mockStorage.ref(`${path}/${childPath}`)),
    put: vi.fn().mockResolvedValue({
      ref: {
        getDownloadURL: vi.fn().mockResolvedValue('https://mock-url.com/file.jpg'),
      },
    }),
    putString: vi.fn().mockResolvedValue({
      ref: {
        getDownloadURL: vi.fn().mockResolvedValue('https://mock-url.com/file.jpg'),
      },
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    getDownloadURL: vi.fn().mockResolvedValue('https://mock-url.com/file.jpg'),
    list: vi.fn().mockResolvedValue({
      items: [],
      prefixes: [],
    }),
  })),
};

// Mock Firebase Analytics
export const mockAnalytics = {
  logEvent: vi.fn(),
  setUserId: vi.fn(),
  setUserProperties: vi.fn(),
  setCurrentScreen: vi.fn(),
};

// Firebase App Mock
export const mockFirebaseApp = {
  name: '[DEFAULT]',
  options: {
    apiKey: 'mock-api-key',
    authDomain: 'mock.firebaseapp.com',
    projectId: 'mock-project',
    storageBucket: 'mock.appspot.com',
    messagingSenderId: '123456789',
    appId: 'mock-app-id',
  },
  automaticDataCollectionEnabled: false,
};

// Helper to reset all mocks
export const resetFirebaseMocks = () => {
  vi.clearAllMocks();
  // Reset currentUser
  (mockAuth as any).currentUser = mockUser;
};

// Helper to set custom user
export const setMockUser = (user: Partial<User> | null) => {
  (mockAuth as any).currentUser = user;
};

// Helper to mock Firestore collection data
export const mockCollectionData = <T = DocumentData>(
  collectionPath: string,
  data: Array<{ id: string; data: T }>
) => {
  const snapshot = createMockQuerySnapshot(data);
  vi.mocked(mockFirestore.collection!).mockImplementation((path: string) => {
    if (path === collectionPath) {
      return {
        get: vi.fn().mockResolvedValue(snapshot),
        onSnapshot: vi.fn((callback) => {
          callback(snapshot);
          return vi.fn();
        }),
      } as any;
    }
    return mockFirestore.collection!(path);
  });
};

// Helper to mock Firestore document data
export const mockDocumentData = <T = DocumentData>(
  documentPath: string,
  data: T,
  exists = true
) => {
  const doc = createMockDocument(documentPath.split('/').pop() || '', data, exists);
  vi.mocked(mockFirestore.doc!).mockImplementation((path: string) => {
    if (path === documentPath) {
      return {
        get: vi.fn().mockResolvedValue(doc),
        onSnapshot: vi.fn((callback) => {
          callback(doc);
          return vi.fn();
        }),
      } as any;
    }
    return mockFirestore.doc!(path);
  });
};

// Export all mocks
export default {
  auth: mockAuth,
  firestore: mockFirestore,
  functions: mockFunctions,
  storage: mockStorage,
  analytics: mockAnalytics,
  app: mockFirebaseApp,
  // Helpers
  resetFirebaseMocks,
  setMockUser,
  mockCollectionData,
  mockDocumentData,
  createMockDocument,
  createMockQuerySnapshot,
};
