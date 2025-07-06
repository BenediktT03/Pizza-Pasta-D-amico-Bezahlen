/**
 * EATECH Master Login Page
 * Version: 1.0.0
 * 
 * Sicherer Login für Master-Administratoren mit:
 * - Email/Password Authentication
 * - Brute-Force Protection
 * - Activity Logging
 * - 2FA Ready (für zukünftige Implementation)
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/pages/Login.jsx
 * 
 * README Kapitel: 6.4 - Superadmin Features Details
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Shield, 
  AlertCircle,
  Loader,
  KeyRound,
  Fingerprint,
  CheckCircle
} from 'lucide-react';
import { useMasterAuth } from '../hooks/useMasterAuth';
import { validateEmail, validatePassword } from '../utils/validation';
import { logSecurityEvent } from '../services/SecurityLogger';
import styles from './Login.module.css';

const Login = () => {
  // State Management
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimer, setBlockTimer] = useState(0);
  const [securityCheck, setSecurityCheck] = useState('checking'); // checking, passed, failed

  // Hooks
  const navigate = useNavigate();
  const { login, checkMasterStatus } = useMasterAuth();

  // Security Check beim Laden
  useEffect(() => {
    performSecurityCheck();
  }, []);

  // Countdown für Blockierung
  useEffect(() => {
    if (blockTimer > 0) {
      const timer = setTimeout(() => setBlockTimer(blockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (blockTimer === 0) {
      setIsBlocked(false);
      setLoginAttempts(0);
    }
  }, [blockTimer]);

  // Security Check Funktion
  const performSecurityCheck = async () => {
    try {
      // Simuliere Security Checks
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check: HTTPS
      const isHttps = window.location.protocol === 'https:';
      
      // Check: Browser Support
      const hasWebCrypto = window.crypto && window.crypto.subtle;
      
      // Check: Local Storage
      const hasStorage = typeof(Storage) !== "undefined";
      
      if (isHttps && hasWebCrypto && hasStorage) {
        setSecurityCheck('passed');
      } else {
        setSecurityCheck('failed');
        logSecurityEvent('security_check_failed', {
          https: isHttps,
          crypto: hasWebCrypto,
          storage: hasStorage
        });
      }
    } catch (error) {
      setSecurityCheck('failed');
      console.error('Security check failed:', error);
    }
  };

  // Input Handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors = {};

    // Email Validation
    if (!formData.email) {
      newErrors.email = 'Email ist erforderlich';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Ungültige Email-Adresse';
    }

    // Password Validation
    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich';
    } else if (formData.password.length < 12) {
      newErrors.password = 'Master-Passwort muss mindestens 12 Zeichen haben';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();

    // Security Check
    if (securityCheck !== 'passed') {
      setErrors({ general: 'Sicherheitsprüfung fehlgeschlagen' });
      return;
    }

    // Check if blocked
    if (isBlocked) {
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Attempt login
      const result = await login({
        email: formData.email,
        password: formData.password,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      });

      if (result.success) {
        // Log successful login
        logSecurityEvent('master_login_success', {
          email: formData.email,
          ip: result.ip,
          session: result.sessionId
        });

        // Check if 2FA is required (for future)
        if (result.requires2FA) {
          navigate('/master/2fa', { 
            state: { sessionToken: result.sessionToken } 
          });
        } else {
          // Redirect to dashboard
          navigate('/master/dashboard');
        }
      } else {
        throw new Error(result.message || 'Login fehlgeschlagen');
      }
    } catch (error) {
      // Handle failed login
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);

      // Log failed attempt
      logSecurityEvent('master_login_failed', {
        email: formData.email,
        attempt: attempts,
        error: error.message
      });

      // Block after 3 attempts
      if (attempts >= 3) {
        setIsBlocked(true);
        setBlockTimer(300); // 5 minutes
        setErrors({ 
          general: 'Zu viele fehlgeschlagene Versuche. Bitte warten Sie 5 Minuten.' 
        });
      } else {
        setErrors({ 
          general: `Login fehlgeschlagen. ${3 - attempts} Versuche verbleibend.` 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render Security Check Screen
  if (securityCheck === 'checking') {
    return (
      <div className={styles.container}>
        <div className={styles.securityCheck}>
          <Shield className={styles.shieldIcon} />
          <h2>Sicherheitsprüfung</h2>
          <p>Überprüfe Systemsicherheit...</p>
          <Loader className={styles.spinner} />
        </div>
      </div>
    );
  }

  if (securityCheck === 'failed') {
    return (
      <div className={styles.container}>
        <div className={styles.securityFailed}>
          <AlertCircle className={styles.alertIcon} />
          <h2>Sicherheitsprüfung fehlgeschlagen</h2>
          <p>Bitte stellen Sie sicher, dass Sie HTTPS verwenden und einen modernen Browser haben.</p>
          <button onClick={performSecurityCheck} className={styles.retryButton}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Render Login Form
  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Shield className={styles.logo} />
            <KeyRound className={styles.keyIcon} />
          </div>
          <h1>EATECH Master Control</h1>
          <p className={styles.subtitle}>Authorisierter Zugang nur für Systemadministratoren</p>
        </div>

        {/* Security Indicators */}
        <div className={styles.securityIndicators}>
          <div className={styles.indicator}>
            <CheckCircle className={styles.checkIcon} />
            <span>Verschlüsselte Verbindung</span>
          </div>
          <div className={styles.indicator}>
            <Fingerprint className={styles.fingerprintIcon} />
            <span>Biometrische Authentifizierung bereit</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className={styles.form}>
          {/* Email Input */}
          <div className={styles.inputGroup}>
            <label htmlFor="email">Master Email</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} />
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="master@eatech.ch"
                disabled={isBlocked || isLoading}
                className={errors.email ? styles.errorInput : ''}
                autoComplete="username"
                autoFocus
              />
            </div>
            {errors.email && (
              <span className={styles.errorMessage}>{errors.email}</span>
            )}
          </div>

          {/* Password Input */}
          <div className={styles.inputGroup}>
            <label htmlFor="password">Master Passwort</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••••••••••"
                disabled={isBlocked || isLoading}
                className={errors.password ? styles.errorInput : ''}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.togglePassword}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && (
              <span className={styles.errorMessage}>{errors.password}</span>
            )}
          </div>

          {/* General Error */}
          {errors.general && (
            <div className={styles.generalError}>
              <AlertCircle />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Block Timer */}
          {isBlocked && (
            <div className={styles.blockTimer}>
              <Lock className={styles.lockIcon} />
              <span>Gesperrt für {Math.floor(blockTimer / 60)}:{(blockTimer % 60).toString().padStart(2, '0')}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isBlocked}
            className={styles.submitButton}
          >
            {isLoading ? (
              <>
                <Loader className={styles.buttonLoader} />
                <span>Authentifiziere...</span>
              </>
            ) : (
              <>
                <Lock />
                <span>Master Login</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.securityNote}>
            🔒 Alle Login-Versuche werden protokolliert und überwacht
          </p>
          <p className={styles.timestamp}>
            {new Date().toLocaleString('de-CH')}
          </p>
        </div>
      </div>

      {/* Background Animation */}
      <div className={styles.backgroundAnimation}>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
      </div>
    </div>
  );
};

export default Login;