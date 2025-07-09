// Master Admin Authentication Hook
import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { auth, verifyMasterAdminAccess } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { usePlatformStore } from '../stores/platformStore';

interface AuthState {
  user: User | null;
  isMasterAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export const useMasterAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isMasterAdmin: false,
    loading: true,
    error: null
  });
  
  const navigate = useNavigate();
  const { reset: resetPlatformStore } = usePlatformStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verify master admin role
        const isMasterAdmin = await verifyMasterAdminAccess();
        
        if (!isMasterAdmin) {
          // Not a master admin, sign out
          await firebaseSignOut(auth);
          setAuthState({
            user: null,
            isMasterAdmin: false,
            loading: false,
            error: 'Unauthorized: Master Admin access required'
          });
          navigate('/login');
        } else {
          setAuthState({
            user,
            isMasterAdmin: true,
            loading: false,
            error: null
          });
        }
      } else {
        setAuthState({
          user: null,
          isMasterAdmin: false,
          loading: false,
          error: null
        });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const isMasterAdmin = await verifyMasterAdminAccess();
      
      if (!isMasterAdmin) {
        await firebaseSignOut(auth);
        throw new Error('Unauthorized: Master Admin access required');
      }
      
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
      resetPlatformStore(); // Clear all platform data
      navigate('/login');
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

// Protected route component
export const MasterAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isMasterAdmin, loading } = useMasterAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isMasterAdmin)) {
      navigate('/login');
    }
  }, [user, isMasterAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isMasterAdmin) {
    return null;
  }

  return <>{children}</>;
};
