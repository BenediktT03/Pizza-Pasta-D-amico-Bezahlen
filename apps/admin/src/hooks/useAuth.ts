import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useStore } from '../stores/useStore';
import { AdminUser, Permission } from '../types/auth';

interface UseAuthReturn {
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setAdminUser, clearAdminUser } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch admin user data from Firestore
          const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            const adminUser: AdminUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: adminData.name,
              role: adminData.role,
              permissions: adminData.permissions || [],
              tenantId: adminData.tenantId,
              lastLogin: new Date(),
              isActive: adminData.isActive !== false,
              createdAt: adminData.createdAt?.toDate() || new Date(),
              updatedAt: adminData.updatedAt?.toDate() || new Date()
            };

            setUser(adminUser);
            setAdminUser(adminUser);
          } else {
            // User exists in Firebase Auth but not in admins collection
            setError('Unauthorized: Admin access required');
            await firebaseSignOut(auth);
            navigate('/login');
          }
        } catch (err) {
          console.error('Error fetching admin data:', err);
          setError('Failed to load admin data');
        }
      } else {
        setUser(null);
        clearAdminUser();
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, setAdminUser, clearAdminUser]);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user has admin access
      const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
      
      if (!adminDoc.exists()) {
        throw new Error('Unauthorized: Admin access required');
      }

      const adminData = adminDoc.data();
      
      if (adminData.isActive === false) {
        throw new Error('Account deactivated. Please contact your administrator.');
      }

      // Update last login
      await updateDoc(doc(db, 'admins', firebaseUser.uid), {
        lastLogin: serverTimestamp()
      });

    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      throw err;
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super_admin') return true;
    
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super_admin') return true;
    
    return permissions.some(permission => user.permissions.includes(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super_admin') return true;
    
    return permissions.every(permission => user.permissions.includes(permission));
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    resetPassword,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions?: Permission[]
) {
  return function ProtectedComponent(props: P) {
    const { user, loading, hasAllPermissions } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !user) {
        navigate('/login');
      } else if (user && requiredPermissions && !hasAllPermissions(requiredPermissions)) {
        navigate('/unauthorized');
      }
    }, [user, loading, navigate]);

    if (loading) {
      return <div>Loading...</div>; // Replace with proper loading component
    }

    if (!user) {
      return null;
    }

    if (requiredPermissions && !hasAllPermissions(requiredPermissions)) {
      return null;
    }

    return <Component {...props} />;
  };
}

// Import fix
import { updateDoc, serverTimestamp } from 'firebase/firestore';
