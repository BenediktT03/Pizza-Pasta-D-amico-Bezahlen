// Authentication Hook for Kitchen App
import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface AuthState {
  user: User | null;
  truckId: string | null;
  truckName: string | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    truckId: null,
    truckName: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get truck information from user's custom claims or profile
          const idTokenResult = await user.getIdTokenResult();
          const truckId = idTokenResult.claims.truckId as string;
          
          if (truckId) {
            // Fetch truck details
            const truckDoc = await getDoc(doc(db, 'foodtrucks', truckId));
            const truckData = truckDoc.data();
            
            setAuthState({
              user,
              truckId,
              truckName: truckData?.name || 'Unknown Truck',
              loading: false,
              error: null
            });
          } else {
            setAuthState({
              user,
              truckId: null,
              truckName: null,
              loading: false,
              error: 'No truck associated with this account'
            });
          }
        } catch (error) {
          console.error('Error fetching truck data:', error);
          setAuthState({
            user,
            truckId: null,
            truckName: null,
            loading: false,
            error: 'Failed to load truck information'
          });
        }
      } else {
        setAuthState({
          user: null,
          truckId: null,
          truckName: null,
          loading: false,
          error: null
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return {
    ...authState,
    signIn,
    signOut
  };
};
