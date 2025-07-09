import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  AuthError
} from 'firebase/auth';
import { auth } from '../services/auth/auth.service';
import { AuthState, UserProfile, SignInCredentials, SignUpData } from '../services/auth/auth.types';
import { tenantService } from '../services/tenant/tenant.service';
import { useDocument } from './useFirestore';

// Auth Context
interface AuthContextValue extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<User>;
  signUp: (data: SignUpData) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateUserEmail: (newEmail: string, password: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth Provider Component
 */
export function AuthProvider({ 
  children,
  tenantId 
}: { 
  children: React.ReactNode;
  tenantId?: string;
}) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    tenant: null,
    loading: true,
    initialized: false,
    error: null,
  });

  // Get user profile from Firestore
  const { data: profile, refresh: refreshProfile } = useDocument<UserProfile>(
    authState.user ? `users/${authState.user.uid}` : null,
    { subscribe: true }
  );

  // Load tenant data
  const loadTenant = useCallback(async (tenantId: string) => {
    try {
      const tenant = await tenantService.getTenantById(tenantId);
      return tenant;
    } catch (error) {
      console.error('Error loading tenant:', error);
      return null;
    }
  }, []);

  // Sign in
  const signIn = useCallback(async (credentials: SignInCredentials): Promise<User> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // If tenant ID is provided, verify user has access
      if (tenantId && profile?.tenantId !== tenantId) {
        await firebaseSignOut(auth);
        throw new Error('Access denied to this tenant');
      }

      return userCredential.user;
    } catch (error) {
      const authError = error as AuthError;
      setAuthState(prev => ({ ...prev, error: authError, loading: false }));
      throw error;
    }
  }, [tenantId, profile]);

  // Sign up
  const signUp = useCallback(async (data: SignUpData): Promise<User> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: `${data.firstName} ${data.lastName}`,
      });

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: `${data.firstName} ${data.lastName}`,
        tenantId: data.tenantId || tenantId || '',
        role: data.role || 'staff',
        permissions: [],
        preferences: {
          language: data.language || 'de',
          theme: 'light',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
        },
        metadata: {
          lastLogin: new Date(),
          loginCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        active: true,
      };

      // Save to Firestore
      await fetch(`/api/users/${userCredential.user.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userProfile),
      });

      return userCredential.user;
    } catch (error) {
      const authError = error as AuthError;
      setAuthState(prev => ({ ...prev, error: authError, loading: false }));
      throw error;
    }
  }, [tenantId]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setAuthState({
        user: null,
        profile: null,
        tenant: null,
        loading: false,
        initialized: true,
        error: null,
      });
    } catch (error) {
      const authError = error as AuthError;
      setAuthState(prev => ({ ...prev, error: authError }));
      throw error;
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      const authError = error as AuthError;
      throw authError;
    }
  }, []);

  // Update user profile
  const updateUserProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!authState.user) throw new Error('No user logged in');

    try {
      // Update Firebase Auth profile if display name changed
      if (data.displayName || data.firstName || data.lastName) {
        const displayName = data.displayName || 
          `${data.firstName || profile?.firstName} ${data.lastName || profile?.lastName}`;
        
        await updateProfile(authState.user, { displayName });
      }

      // Update Firestore profile
      await fetch(`/api/users/${authState.user.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          updatedAt: new Date(),
        }),
      });

      await refreshProfile();
    } catch (error) {
      throw error;
    }
  }, [authState.user, profile, refreshProfile]);

  // Update email
  const updateUserEmail = useCallback(async (newEmail: string, password: string) => {
    if (!authState.user || !authState.user.email) throw new Error('No user logged in');

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(authState.user.email, password);
      await reauthenticateWithCredential(authState.user, credential);

      // Update email
      await updateEmail(authState.user, newEmail);

      // Update profile
      await updateUserProfile({ email: newEmail });
    } catch (error) {
      const authError = error as AuthError;
      throw authError;
    }
  }, [authState.user, updateUserProfile]);

  // Update password
  const updateUserPassword = useCallback(async (
    currentPassword: string, 
    newPassword: string
  ) => {
    if (!authState.user || !authState.user.email) throw new Error('No user logged in');

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(authState.user.email, currentPassword);
      await reauthenticateWithCredential(authState.user, credential);

      // Update password
      await updatePassword(authState.user, newPassword);
    } catch (error) {
      const authError = error as AuthError;
      throw authError;
    }
  }, [authState.user]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (authState.user) {
      await authState.user.reload();
      await refreshProfile();
    }
  }, [authState.user, refreshProfile]);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        let tenant = null;
        
        if (profile?.tenantId) {
          tenant = await loadTenant(profile.tenantId);
        } else if (tenantId) {
          tenant = await loadTenant(tenantId);
        }

        setAuthState({
          user,
          profile,
          tenant,
          loading: false,
          initialized: true,
          error: null,
        });
      } else {
        // User is signed out
        setAuthState({
          user: null,
          profile: null,
          tenant: null,
          loading: false,
          initialized: true,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, [profile, tenantId, loadTenant]);

  const contextValue: AuthContextValue = {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to check if user has permission
 */
export function usePermission(permission: string): boolean {
  const { profile } = useAuth();
  
  if (!profile) return false;
  
  // Super admin has all permissions
  if (profile.role === 'super_admin') return true;
  
  // Check specific permission
  return profile.permissions?.includes(permission) || false;
}

/**
 * Hook to check if user has role
 */
export function useRole(role: string | string[]): boolean {
  const { profile } = useAuth();
  
  if (!profile) return false;
  
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(profile.role);
}

/**
 * Hook to require authentication
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const { user, loading, initialized } = useAuth();
  
  useEffect(() => {
    if (!loading && initialized && !user) {
      // Redirect to login
      window.location.href = redirectTo;
    }
  }, [user, loading, initialized, redirectTo]);
  
  return { isAuthenticated: !!user, loading };
}

/**
 * Hook for auth state persistence
 */
export function useAuthPersistence() {
  const { user, profile } = useAuth();
  
  useEffect(() => {
    if (user && profile) {
      // Store minimal auth data in session storage
      sessionStorage.setItem('auth_user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        tenantId: profile.tenantId,
      }));
    } else {
      sessionStorage.removeItem('auth_user');
    }
  }, [user, profile]);
  
  // Get persisted auth data
  const getPersistedAuth = useCallback(() => {
    const stored = sessionStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  }, []);
  
  return { getPersistedAuth };
}

/**
 * Hook for social authentication
 */
export function useSocialAuth() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Implement Google sign-in
      throw new Error('Google sign-in not implemented');
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      throw authError;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const signInWithFacebook = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Implement Facebook sign-in
      throw new Error('Facebook sign-in not implemented');
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      throw authError;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    signInWithGoogle,
    signInWithFacebook,
    loading,
    error,
  };
}

/**
 * Hook for multi-factor authentication
 */
export function useMFA() {
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (user) {
      // Check if MFA is enabled for user
      setMfaEnabled(user.multiFactor?.enrolledFactors.length > 0);
    }
  }, [user]);
  
  const enableMFA = useCallback(async () => {
    if (!user) throw new Error('No user logged in');
    
    setLoading(true);
    try {
      // Implement MFA enrollment
      throw new Error('MFA enrollment not implemented');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  const disableMFA = useCallback(async () => {
    if (!user) throw new Error('No user logged in');
    
    setLoading(true);
    try {
      // Implement MFA unenrollment
      throw new Error('MFA unenrollment not implemented');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  return {
    mfaEnabled,
    enableMFA,
    disableMFA,
    loading,
  };
}
