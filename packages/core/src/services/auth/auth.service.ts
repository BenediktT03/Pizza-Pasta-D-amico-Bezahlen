import {
  Auth,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { User, UserRole, AuthState, SignUpData, UserProfile } from './auth.types';
import { validateEmail, validatePassword } from './auth.utils';

export class AuthService {
  private auth: Auth;
  private googleProvider: GoogleAuthProvider;

  constructor() {
    this.auth = auth;
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.setCustomParameters({
      prompt: 'select_account',
    });
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.getUserProfile(firebaseUser.uid);
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Sign up with email and password
   */
  async signUp(data: SignUpData): Promise<User> {
    // Validate input
    if (!validateEmail(data.email)) {
      throw new Error('Invalid email address');
    }
    if (!validatePassword(data.password)) {
      throw new Error('Password must be at least 8 characters');
    }

    try {
      // Create user account
      const credential = await createUserWithEmailAndPassword(
        this.auth,
        data.email,
        data.password
      );

      // Update display name
      if (data.name) {
        await updateProfile(credential.user, {
          displayName: data.name,
        });
      }

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: credential.user.uid,
        email: data.email,
        name: data.name || '',
        role: data.role || 'user',
        tenantId: data.tenantId,
        phoneNumber: data.phoneNumber,
        language: data.language || 'de',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        emailVerified: false,
      };

      await setDoc(doc(db, 'users', credential.user.uid), userProfile);

      return {
        uid: credential.user.uid,
        email: data.email,
        name: data.name || '',
        role: data.role || 'user',
        tenantId: data.tenantId,
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<User> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = await this.getUserProfile(credential.user.uid);
      
      if (!user) {
        throw new Error('User profile not found');
      }

      if (!user.isActive) {
        throw new Error('Account is disabled');
      }

      // Update last login
      await updateDoc(doc(db, 'users', credential.user.uid), {
        lastLoginAt: serverTimestamp(),
      });

      return user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<User> {
    try {
      const result = await signInWithPopup(this.auth, this.googleProvider);
      const { user: firebaseUser } = result;

      // Check if user profile exists
      let user = await this.getUserProfile(firebaseUser.uid);

      if (!user) {
        // Create new user profile
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || '',
          role: 'user',
          photoURL: firebaseUser.photoURL || undefined,
          language: 'de',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isActive: true,
          emailVerified: firebaseUser.emailVerified,
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
        user = await this.getUserProfile(firebaseUser.uid);
      } else {
        // Update last login
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          lastLoginAt: serverTimestamp(),
        });
      }

      return user!;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with custom token (for advanced authentication)
   */
  async signInWithCustomToken(token: string): Promise<User> {
    try {
      const credential = await signInWithCustomToken(this.auth, token);
      const user = await this.getUserProfile(credential.user.uid);
      
      if (!user) {
        throw new Error('User profile not found');
      }

      return user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No authenticated user');
    }

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Update Firebase Auth profile if name or photo changed
      const currentUser = this.auth.currentUser;
      if (currentUser && currentUser.uid === uid) {
        const profileUpdates: any = {};
        if (updates.name) profileUpdates.displayName = updates.name;
        if (updates.photoURL) profileUpdates.photoURL = updates.photoURL;
        
        if (Object.keys(profileUpdates).length > 0) {
          await updateProfile(currentUser, profileUpdates);
        }
      }
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(uid: string): Promise<User | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data() as UserProfile;
      return {
        uid: data.uid,
        email: data.email,
        name: data.name,
        role: data.role,
        tenantId: data.tenantId,
        photoURL: data.photoURL,
        phoneNumber: data.phoneNumber,
        language: data.language,
        isActive: data.isActive,
        emailVerified: data.emailVerified,
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Check if user has specific role
   */
  async hasRole(uid: string, role: UserRole): Promise<boolean> {
    const user = await this.getUserProfile(uid);
    if (!user) return false;

    // Admin has access to everything
    if (user.role === 'admin') return true;

    // Check specific role
    return user.role === role;
  }

  /**
   * Check if user has access to tenant
   */
  async hasTenantAccess(uid: string, tenantId: string): Promise<boolean> {
    const user = await this.getUserProfile(uid);
    if (!user) return false;

    // Admin has access to all tenants
    if (user.role === 'admin') return true;

    // Check if user belongs to tenant
    return user.tenantId === tenantId;
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): Error {
    const errorCode = error.code || 'unknown';
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'Diese E-Mail-Adresse wird bereits verwendet',
      'auth/invalid-email': 'Ungültige E-Mail-Adresse',
      'auth/operation-not-allowed': 'Operation nicht erlaubt',
      'auth/weak-password': 'Das Passwort ist zu schwach',
      'auth/user-disabled': 'Dieses Konto wurde deaktiviert',
      'auth/user-not-found': 'Kein Benutzer mit dieser E-Mail-Adresse gefunden',
      'auth/wrong-password': 'Falsches Passwort',
      'auth/invalid-credential': 'Ungültige Anmeldedaten',
      'auth/popup-closed-by-user': 'Anmeldevorgang wurde abgebrochen',
      'auth/network-request-failed': 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung',
      'auth/too-many-requests': 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuchen Sie es später erneut',
    };

    const message = errorMessages[errorCode] || error.message || 'Ein unbekannter Fehler ist aufgetreten';
    return new Error(message);
  }
}

// Export singleton instance
export const authService = new AuthService();
