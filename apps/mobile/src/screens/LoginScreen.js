/**
 * EATECH Mobile App - Login Screen
 * Version: 25.0.0
 * Description: Login Screen mit Biometrischer Authentifizierung
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/screens/LoginScreen.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

// Contexts
import { useAuth } from '../contexts/AuthContext';

// Config
import { THEME } from '../config/constants';

// Icons
import { Mail, Lock, Fingerprint, FaceRecognition } from '../components/Icons';

// ============================================================================
// LOGIN SCREEN COMPONENT
// ============================================================================
const LoginScreen = ({ navigation }) => {
  const { login, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState(null);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  useEffect(() => {
    checkBiometricAvailability();
    loadSavedCredentials();
  }, []);

  // Check biometric availability
  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (compatible && enrolled) {
        setBiometricAvailable(true);
        
        // Get biometric type
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        }
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  // Load saved credentials
  const loadSavedCredentials = async () => {
    try {
      const saved = await AsyncStorage.getItem('savedCredentials');
      if (saved) {
        const credentials = JSON.parse(saved);
        setSavedCredentials(credentials);
        setEmail(credentials.email);
        setRememberMe(true);
        
        // Auto-trigger biometric if available
        if (biometricAvailable) {
          setTimeout(() => handleBiometricLogin(), 500);
        }
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const success = await login(email, password);
      
      if (success) {
        // Save credentials if remember me is checked
        if (rememberMe) {
          await AsyncStorage.setItem('savedCredentials', JSON.stringify({
            email,
            timestamp: Date.now(),
          }));
        } else {
          await AsyncStorage.removeItem('savedCredentials');
        }
        
        // Haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Navigate to main app
        navigation.replace('WebView');
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Login fehlgeschlagen', 'Bitte überprüfen Sie Ihre Zugangsdaten');
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Fehler', error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!savedCredentials || !biometricAvailable) return;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'EATECH Admin Login',
        cancelLabel: 'Abbrechen',
        fallbackLabel: 'Passwort verwenden',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Get saved password from secure store
        const savedPassword = await AsyncStorage.getItem(`password_${savedCredentials.email}`);
        
        if (savedPassword) {
          setPassword(savedPassword);
          await handleLogin();
        } else {
          Alert.alert(
            'Biometrische Anmeldung',
            'Bitte geben Sie Ihr Passwort einmalig ein, um die biometrische Anmeldung zu aktivieren.',
          );
        }
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderBiometricButton = () => {
    if (!biometricAvailable || !savedCredentials) return null;

    const Icon = biometricType === 'face' ? FaceRecognition : Fingerprint;
    const text = biometricType === 'face' ? 'Mit Face ID anmelden' : 'Mit Fingerabdruck anmelden';

    return (
      <TouchableOpacity
        style={styles.biometricButton}
        onPress={handleBiometricLogin}
        activeOpacity={0.8}
      >
        <Icon size={24} color={THEME.colors.primary} />
        <Text style={styles.biometricButtonText}>{text}</Text>
      </TouchableOpacity>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <LinearGradient
          colors={[THEME.colors.background, '#0F0F0F']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>🚀</Text>
              <Text style={styles.logoText}>EATECH</Text>
              <Text style={styles.logoSubtext}>Admin Dashboard</Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Mail size={20} color={THEME.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="E-Mail Adresse"
                  placeholderTextColor={THEME.colors.textDisabled}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !authLoading}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Lock size={20} color={THEME.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Passwort"
                  placeholderTextColor={THEME.colors.textDisabled}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !authLoading}
                />
              </View>

              {/* Remember Me */}
              <TouchableOpacity
                style={styles.rememberContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>Anmeldedaten merken</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, (loading || authLoading) && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading || authLoading}
                activeOpacity={0.8}
              >
                {loading || authLoading ? (
                  <ActivityIndicator color={THEME.colors.background} />
                ) : (
                  <Text style={styles.loginButtonText}>Anmelden</Text>
                )}
              </TouchableOpacity>

              {/* Biometric Login */}
              {renderBiometricButton()}

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotButton} activeOpacity={0.7}>
                <Text style={styles.forgotButtonText}>Passwort vergessen?</Text>
              </TouchableOpacity>
            </View>

            {/* Environment Indicator */}
            {__DEV__ && (
              <View style={styles.devIndicator}>
                <Text style={styles.devText}>Development Mode</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  
  keyboardView: {
    flex: 1,
  },
  
  gradient: {
    flex: 1,
  },
  
  content: {
    flex: 1,
    padding: THEME.spacing.xl,
    justifyContent: 'center',
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xxl,
  },
  
  logo: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
  },
  
  logoText: {
    fontSize: THEME.typography.h1.fontSize,
    fontWeight: THEME.typography.h1.fontWeight,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },
  
  logoSubtext: {
    fontSize: THEME.typography.body1.fontSize,
    color: THEME.colors.textSecondary,
  },
  
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  
  inputIcon: {
    marginLeft: THEME.spacing.md,
  },
  
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: THEME.spacing.md,
    fontSize: THEME.typography.body1.fontSize,
    color: THEME.colors.text,
  },
  
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    marginRight: THEME.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  checkboxActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  
  checkmark: {
    color: THEME.colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  rememberText: {
    fontSize: THEME.typography.body2.fontSize,
    color: THEME.colors.textSecondary,
  },
  
  loginButton: {
    height: 56,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
  },
  
  loginButtonDisabled: {
    opacity: 0.7,
  },
  
  loginButtonText: {
    fontSize: THEME.typography.body1.fontSize,
    fontWeight: '600',
    color: THEME.colors.background,
  },
  
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.lg,
  },
  
  biometricButtonText: {
    fontSize: THEME.typography.body1.fontSize,
    fontWeight: '600',
    color: THEME.colors.primary,
    marginLeft: THEME.spacing.sm,
  },
  
  forgotButton: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
  },
  
  forgotButtonText: {
    fontSize: THEME.typography.body2.fontSize,
    color: THEME.colors.primary,
  },
  
  devIndicator: {
    position: 'absolute',
    bottom: THEME.spacing.md,
    alignSelf: 'center',
    backgroundColor: THEME.colors.warning,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
  },
  
  devText: {
    fontSize: THEME.typography.caption.fontSize,
    color: THEME.colors.background,
    fontWeight: '600',
  },
});

// ============================================================================
// EXPORT
// ============================================================================
export default LoginScreen;