import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User } from 'firebase/auth'
import { authService, UserProfile } from '@/services/auth'

interface AuthState {
  // State
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean

  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signInWithSocial: (provider: 'google' | 'facebook' | 'twitter') => Promise<void>
  signInAnonymously: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>
  refreshProfile: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        profile: null,
        loading: true,
        error: null,
        isAuthenticated: false,

        // Initialize auth state
        initialize: async () => {
          set({ loading: true })

          // Listen to auth state changes
          authService.onAuthStateChanged(async (user) => {
            if (user) {
              // User is signed in
              try {
                const profile = await authService.getCurrentUserProfile()
                set({
                  user,
                  profile,
                  isAuthenticated: true,
                  loading: false,
                  error: null,
                })
              } catch (error) {
                console.error('Error loading user profile:', error)
                set({
                  user,
                  profile: null,
                  isAuthenticated: true,
                  loading: false,
                  error: 'Failed to load user profile',
                })
              }
            } else {
              // User is signed out
              set({
                user: null,
                profile: null,
                isAuthenticated: false,
                loading: false,
                error: null,
              })
            }
          })
        },

        // Sign in with email
        signIn: async (email: string, password: string) => {
          set({ loading: true, error: null })
          try {
            const profile = await authService.signInWithEmail(email, password)
            set({
              profile,
              loading: false,
              error: null,
            })
          } catch (error) {
            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Sign in failed',
            })
            throw error
          }
        },

        // Sign up with email
        signUp: async (email: string, password: string, displayName?: string) => {
          set({ loading: true, error: null })
          try {
            const profile = await authService.signUpWithEmail(email, password, displayName)
            set({
              profile,
              loading: false,
              error: null,
            })
          } catch (error) {
            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Sign up failed',
            })
            throw error
          }
        },

        // Sign in with social provider
        signInWithSocial: async (provider: 'google' | 'facebook' | 'twitter') => {
          set({ loading: true, error: null })
          try {
            const profile = await authService.signInWithSocial(provider)
            set({
              profile,
              loading: false,
              error: null,
            })
          } catch (error) {
            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Social sign in failed',
            })
            throw error
          }
        },

        // Sign in anonymously
        signInAnonymously: async () => {
          set({ loading: true, error: null })
          try {
            const profile = await authService.signInAnonymously()
            set({
              profile,
              loading: false,
              error: null,
            })
          } catch (error) {
            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Anonymous sign in failed',
            })
            throw error
          }
        },

        // Sign out
        signOut: async () => {
          set({ loading: true, error: null })
          try {
            await authService.signOut()
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              loading: false,
              error: null,
            })
          } catch (error) {
            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Sign out failed',
            })
            throw error
          }
        },

        // Update profile
        updateProfile: async (updates: { displayName?: string; photoURL?: string }) => {
          set({ loading: true, error: null })
          try {
            await authService.updateProfile(updates)
            
            // Update local profile
            const currentProfile = get().profile
            if (currentProfile) {
              set({
                profile: {
                  ...currentProfile,
                  ...updates,
                  updatedAt: new Date(),
                },
                loading: false,
                error: null,
              })
            }
          } catch (error) {
            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Profile update failed',
            })
            throw error
          }
        },

        // Refresh profile from database
        refreshProfile: async () => {
          const user = get().user
          if (!user) return

          try {
            const profile = await authService.getCurrentUserProfile()
            set({ profile })
          } catch (error) {
            console.error('Error refreshing profile:', error)
          }
        },

        // Clear error
        clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          // Only persist non-sensitive data
          profile: state.profile ? {
            id: state.profile.id,
            displayName: state.profile.displayName,
            photoURL: state.profile.photoURL,
            preferences: state.profile.preferences,
          } : null,
        }),
      }
    ),
    {
      name: 'AuthStore',
    }
  )
)

// Selectors
export const selectUser = (state: AuthState) => state.user
export const selectProfile = (state: AuthState) => state.profile
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectAuthLoading = (state: AuthState) => state.loading
export const selectAuthError = (state: AuthState) => state.error

export default useAuthStore
