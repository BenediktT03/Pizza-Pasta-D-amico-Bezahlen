/**
 * EATECH - Authentication Context Provider
 * Version: 5.0.0
 * Description: Authentifizierungs-Context mit Firebase Auth Integration,
 *              Multi-Tenant Support und Rollen-Management
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/contexts/AuthContext.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
    auth, 
    database,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    onAuthStateChanged
} from '../config/firebase';
import { useTenant } from './TenantContext';
import { logError } from '../utils/monitoring';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
const AuthContext = createContext(null);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================
export const AuthProvider = ({ children }) => {
    const { tenant } = useTenant();
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState([]);
    
    /**
     * Lädt das erweiterte Benutzerprofil aus der Datenbank
     */
    const loadUserProfile = useCallback(async (uid) => {
        try {
            // Tenant-spezifisches Profil laden
            let profilePath = tenant?.id 
                ? `tenants/${tenant.id}/users/${uid}`
                : `users/${uid}`;
                
            const snapshot = await database.ref(profilePath).once('value');
            const profile = snapshot.val();
            
            if (profile) {
                setUserProfile(profile);
                setPermissions(profile.permissions || []);
                
                // Set custom claims for role
                if (profile.role) {
                    await auth.currentUser.getIdTokenResult(true);
                }
            } else {
                // Create default profile if not exists
                const defaultProfile = {
                    uid,
                    email: auth.currentUser.email,
                    displayName: auth.currentUser.displayName || '',
                    role: 'customer',
                    permissions: ['view_menu', 'place_order'],
                    createdAt: Date.now(),
                    lastLogin: Date.now(),
                    tenantId: tenant?.id
                };
                
                await database.ref(profilePath).set(defaultProfile);
                setUserProfile(defaultProfile);
                setPermissions(defaultProfile.permissions);
            }
        } catch (error) {
            logError('AuthContext.loadUserProfile', error);
            toast.error('Fehler beim Laden des Benutzerprofils');
        }
    }, [tenant]);
    
    /**
     * Registriert einen neuen Benutzer
     */
    const register = useCallback(async (email, password, additionalData = {}) => {
        try {
            setLoading(true);
            
            // Create auth user
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            
            // Update display name if provided
            if (additionalData.displayName) {
                await updateProfile(user, {
                    displayName: additionalData.displayName
                });
            }
            
            // Create user profile in database
            const profileData = {
                uid: user.uid,
                email: user.email,
                displayName: additionalData.displayName || '',
                phoneNumber: additionalData.phoneNumber || '',
                role: additionalData.role || 'customer',
                permissions: getDefaultPermissions(additionalData.role || 'customer'),
                tenantId: tenant?.id,
                createdAt: Date.now(),
                lastLogin: Date.now(),
                preferences: {
                    language: 'de-CH',
                    notifications: true,
                    newsletter: false
                }
            };
            
            const profilePath = tenant?.id 
                ? `tenants/${tenant.id}/users/${user.uid}`
                : `users/${user.uid}`;
                
            await database.ref(profilePath).set(profileData);
            
            // Welcome email
            if (tenant?.emailSettings?.sendWelcomeEmail) {
                // Trigger cloud function for welcome email
                await database.ref('email_queue').push({
                    to: user.email,
                    template: 'welcome',
                    data: {
                        name: additionalData.displayName || user.email,
                        tenantName: tenant.name
                    }
                });
            }
            
            toast.success('Registrierung erfolgreich!');
            return user;
            
        } catch (error) {
            logError('AuthContext.register', error);
            
            // User-friendly error messages
            if (error.code === 'auth/email-already-in-use') {
                toast.error('Diese E-Mail-Adresse wird bereits verwendet');
            } else if (error.code === 'auth/weak-password') {
                toast.error('Das Passwort muss mindestens 6 Zeichen lang sein');
            } else {
                toast.error('Registrierung fehlgeschlagen');
            }
            
            throw error;
        } finally {
            setLoading(false);
        }
    }, [tenant]);
    
    /**
     * Meldet einen Benutzer an
     */
    const login = useCallback(async (email, password) => {
        try {
            setLoading(true);
            
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            
            // Update last login
            const profilePath = tenant?.id 
                ? `tenants/${tenant.id}/users/${user.uid}`
                : `users/${user.uid}`;
                
            await database.ref(profilePath).update({
                lastLogin: Date.now()
            });
            
            // Log analytics event
            await database.ref('analytics/logins').push({
                userId: user.uid,
                tenantId: tenant?.id,
                timestamp: Date.now(),
                userAgent: navigator.userAgent
            });
            
            toast.success('Erfolgreich angemeldet!');
            return user;
            
        } catch (error) {
            logError('AuthContext.login', error);
            
            // User-friendly error messages
            if (error.code === 'auth/user-not-found') {
                toast.error('Benutzer nicht gefunden');
            } else if (error.code === 'auth/wrong-password') {
                toast.error('Falsches Passwort');
            } else if (error.code === 'auth/too-many-requests') {
                toast.error('Zu viele fehlgeschlagene Versuche. Bitte später erneut versuchen');
            } else {
                toast.error('Anmeldung fehlgeschlagen');
            }
            
            throw error;
        } finally {
            setLoading(false);
        }
    }, [tenant]);
    
    /**
     * Meldet den Benutzer ab
     */
    const logout = useCallback(async () => {
        try {
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
            setPermissions([]);
            toast.success('Erfolgreich abgemeldet');
        } catch (error) {
            logError('AuthContext.logout', error);
            toast.error('Abmeldung fehlgeschlagen');
            throw error;
        }
    }, []);
    
    /**
     * Sendet eine Passwort-Reset-E-Mail
     */
    const resetPassword = useCallback(async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
            toast.success('Passwort-Reset-E-Mail wurde gesendet');
        } catch (error) {
            logError('AuthContext.resetPassword', error);
            
            if (error.code === 'auth/user-not-found') {
                toast.error('Benutzer nicht gefunden');
            } else {
                toast.error('Fehler beim Senden der Reset-E-Mail');
            }
            
            throw error;
        }
    }, []);
    
    /**
     * Aktualisiert das Benutzerprofil
     */
    const updateUserProfile = useCallback(async (updates) => {
        if (!user) throw new Error('No user logged in');
        
        try {
            // Update auth profile if display name changed
            if (updates.displayName && updates.displayName !== user.displayName) {
                await updateProfile(user, {
                    displayName: updates.displayName
                });
            }
            
            // Update database profile
            const profilePath = tenant?.id 
                ? `tenants/${tenant.id}/users/${user.uid}`
                : `users/${user.uid}`;
                
            await database.ref(profilePath).update({
                ...updates,
                updatedAt: Date.now()
            });
            
            // Update local state
            setUserProfile(prev => ({
                ...prev,
                ...updates
            }));
            
            toast.success('Profil erfolgreich aktualisiert');
        } catch (error) {
            logError('AuthContext.updateUserProfile', error);
            toast.error('Fehler beim Aktualisieren des Profils');
            throw error;
        }
    }, [user, tenant]);
    
    /**
     * Ändert das Passwort
     */
    const changePassword = useCallback(async (currentPassword, newPassword) => {
        if (!user) throw new Error('No user logged in');
        
        try {
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await reauthenticateWithCredential(user, credential);
            
            // Update password
            await updatePassword(user, newPassword);
            
            toast.success('Passwort erfolgreich geändert');
        } catch (error) {
            logError('AuthContext.changePassword', error);
            
            if (error.code === 'auth/wrong-password') {
                toast.error('Aktuelles Passwort ist falsch');
            } else {
                toast.error('Fehler beim Ändern des Passworts');
            }
            
            throw error;
        }
    }, [user]);
    
    /**
     * Überprüft, ob der Benutzer eine bestimmte Berechtigung hat
     */
    const hasPermission = useCallback((permission) => {
        if (!userProfile) return false;
        
        // Master admin has all permissions
        if (userProfile.role === 'master') return true;
        
        // Admin has all tenant permissions
        if (userProfile.role === 'admin' && !permission.startsWith('master:')) {
            return true;
        }
        
        return permissions.includes(permission);
    }, [userProfile, permissions]);
    
    /**
     * Überprüft, ob der Benutzer eine bestimmte Rolle hat
     */
    const hasRole = useCallback((role) => {
        if (!userProfile) return false;
        
        // Master can act as any role
        if (userProfile.role === 'master') return true;
        
        return userProfile.role === role;
    }, [userProfile]);
    
    /**
     * Gibt Standard-Berechtigungen basierend auf der Rolle zurück
     */
    const getDefaultPermissions = (role) => {
        const rolePermissions = {
            customer: [
                'view_menu',
                'place_order',
                'view_own_orders',
                'update_own_profile'
            ],
            staff: [
                'view_menu',
                'view_orders',
                'update_order_status',
                'view_basic_analytics'
            ],
            admin: [
                'all_tenant_permissions'
            ],
            master: [
                'all_permissions'
            ]
        };
        
        return rolePermissions[role] || rolePermissions.customer;
    };
    
    // ============================================================================
    // EFFECTS
    // ============================================================================
    
    // Auth state observer
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            
            if (user) {
                await loadUserProfile(user.uid);
            } else {
                setUserProfile(null);
                setPermissions([]);
            }
            
            setLoading(false);
        });
        
        return unsubscribe;
    }, [loadUserProfile]);
    
    // ============================================================================
    // CONTEXT VALUE
    // ============================================================================
    const value = {
        user,
        userProfile,
        loading,
        permissions,
        isAuthenticated: !!user,
        isAdmin: userProfile?.role === 'admin' || userProfile?.role === 'master',
        isMaster: userProfile?.role === 'master',
        
        // Auth methods
        register,
        login,
        logout,
        resetPassword,
        updateUserProfile,
        changePassword,
        
        // Permission methods
        hasPermission,
        hasRole
    };
    
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================
export const useAuth = () => {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    
    return context;
};

// ============================================================================
// EXPORT
// ============================================================================
export default AuthContext;