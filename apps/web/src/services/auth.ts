import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  onAuthStateChanged,
  User,
  UserCredential,
  AuthError,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, getTenantPath } from '@/config/firebase'
import { api } from './api'

// Types
export interface UserProfile {
  id: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  phoneNumber: string | null
  createdAt: Date
  updatedAt: Date
  tenantId: string
  role: 'customer' | 'admin' | 'staff'
  preferences: {
    language: string
    notifications: boolean
    theme: 'light' | 'dark' | 'system'
  }
  metadata: {
    lastLogin: Date
    loginCount: number
    totalOrders: number
    favoriteItems: string[]
  }
}

// Auth providers
const googleProvider = new GoogleAuthProvider()
const facebookProvider = new FacebookAuthProvider()
const twitterProvider = new TwitterAuthProvider()

// Configure providers
googleProvider.setCustomParameters({
  prompt: 'select_account',
})

// Auth service class
class AuthService {
  private confirmationResult: ConfirmationResult | null = null
  private recaptchaVerifier: RecaptchaVerifier | null = null

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      return await this.handleAuthSuccess(credential)
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Sign up with email and password
  async signUpWithEmail(
    email: string,
    password: string,
    displayName?: string
  ): Promise<UserProfile> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update display name if provided
      if (displayName && credential.user) {
        await updateProfile(credential.user, { displayName })
      }

      // Send verification email
      if (credential.user) {
        await sendEmailVerification(credential.user)
      }

      return await this.handleAuthSuccess(credential)
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Sign in with social providers
  async signInWithSocial(provider: 'google' | 'facebook' | 'twitter'): Promise<UserProfile> {
    try {
      let authProvider
      switch (provider) {
        case 'google':
          authProvider = googleProvider
          break
        case 'facebook':
          authProvider = facebookProvider
          break
        case 'twitter':
          authProvider = twitterProvider
          break
        default:
          throw new Error('Invalid provider')
      }

      const credential = await signInWithPopup(auth, authProvider)
      return await this.handleAuthSuccess(credential)
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Sign in anonymously
  async signInAnonymously(): Promise<UserProfile> {
    try {
      const credential = await signInAnonymously(auth)
      return await this.handleAuthSuccess(credential)
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Sign in with phone number
  async signInWithPhone(phoneNumber: string, recaptchaContainerId: string): Promise<void> {
    try {
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = new RecaptchaVerifier(recaptchaContainerId, {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
        }, auth)
      }

      this.confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        this.recaptchaVerifier
      )
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Confirm phone verification code
  async confirmPhoneCode(code: string): Promise<UserProfile> {
    if (!this.confirmationResult) {
      throw new Error('No confirmation result available')
    }

    try {
      const credential = await this.confirmationResult.confirm(code)
      return await this.handleAuthSuccess(credential)
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth)
      // Clear local data
      localStorage.removeItem('tenantId')
      sessionStorage.clear()
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Send password reset email
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Update user profile
  async updateProfile(updates: {
    displayName?: string
    photoURL?: string
  }): Promise<void> {
    const user = auth.currentUser
    if (!user) throw new Error('No authenticated user')

    try {
      await updateProfile(user, updates)
      
      // Update Firestore profile
      const profileRef = doc(db, getTenantPath(`users/${user.uid}`))
      await updateDoc(profileRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Update email
  async updateEmail(newEmail: string): Promise<void> {
    const user = auth.currentUser
    if (!user) throw new Error('No authenticated user')

    try {
      await updateEmail(user, newEmail)
      
      // Send verification email
      await sendEmailVerification(user)
      
      // Update Firestore profile
      const profileRef = doc(db, getTenantPath(`users/${user.uid}`))
      await updateDoc(profileRef, {
        email: newEmail,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Update password
  async updatePassword(newPassword: string): Promise<void> {
    const user = auth.currentUser
    if (!user) throw new Error('No authenticated user')

    try {
      await updatePassword(user, newPassword)
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    }
  }

  // Get current user profile
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = auth.currentUser
    if (!user) return null

    const profileRef = doc(db, getTenantPath(`users/${user.uid}`))
    const profileSnap = await getDoc(profileRef)

    if (!profileSnap.exists()) {
      return null
    }

    return {
      id: user.uid,
      ...profileSnap.data(),
    } as UserProfile
  }

  // Auth state observer
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback)
  }

  // Private methods
  private async handleAuthSuccess(credential: UserCredential): Promise<UserProfile> {
    const { user } = credential

    // Create or update user profile in Firestore
    const profileRef = doc(db, getTenantPath(`users/${user.uid}`))
    const profileSnap = await getDoc(profileRef)

    let profile: UserProfile

    if (!profileSnap.exists()) {
      // New user - create profile
      profile = {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: localStorage.getItem('tenantId') || 'default',
        role: 'customer',
        preferences: {
          language: 'de',
          notifications: true,
          theme: 'system',
        },
        metadata: {
          lastLogin: new Date(),
          loginCount: 1,
          totalOrders: 0,
          favoriteItems: [],
        },
      }

      await setDoc(profileRef, profile)

      // Call backend to complete user setup
      await api.post('/users/setup', { userId: user.uid })
    } else {
      // Existing user - update last login
      await updateDoc(profileRef, {
        'metadata.lastLogin': serverTimestamp(),
        'metadata.loginCount': profileSnap.data().metadata.loginCount + 1,
        updatedAt: serverTimestamp(),
      })

      profile = {
        id: user.uid,
        ...profileSnap.data(),
      } as UserProfile
    }

    return profile
  }

  private handleAuthError(error: AuthError): Error {
    // Map Firebase auth errors to user-friendly messages
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'An account already exists with this email',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/invalid-email': 'Invalid email address',
      'auth/operation-not-allowed': 'This sign-in method is not enabled',
      'auth/account-exists-with-different-credential': 'Account exists with different sign-in method',
      'auth/requires-recent-login': 'Please sign in again to perform this action',
      'auth/network-request-failed': 'Network error - please check your connection',
      'auth/too-many-requests': 'Too many attempts - please try again later',
      'auth/popup-closed-by-user': 'Sign-in popup was closed',
    }

    const message = errorMessages[error.code] || error.message
    return new Error(message)
  }
}

// Export singleton instance
export const authService = new AuthService()

// Export auth state helper
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null
}

// Export user helper
export const getCurrentUser = (): User | null => {
  return auth.currentUser
}

export default authService
