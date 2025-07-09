import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@eatech/core/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  UserIcon,
  AtSymbolIcon, 
  LockClosedIcon, 
  EyeIcon, 
  EyeOffIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  PhoneIcon,
  OfficeBuildingIcon
} from '@heroicons/react/outline';
import { Button } from '@eatech/ui/components/Button';
import { Input } from '@eatech/ui/components/Input';
import { Alert } from '@eatech/ui/components/Alert';
import { Logo } from '@eatech/ui/components/Logo';
import { Checkbox } from '@eatech/ui/components/Checkbox';
import toast from 'react-hot-toast';

// Swiss phone number regex
const swissPhoneRegex = /^(\+41|0041|0)[1-9]\d{8}$/;

// Validation schema
const registerSchema = z.object({
  businessName: z.string().min(2, 'Geschäftsname muss mindestens 2 Zeichen lang sein'),
  ownerName: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  phone: z.string().regex(swissPhoneRegex, 'Ungültige Schweizer Telefonnummer'),
  password: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Sie müssen die AGB akzeptieren',
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: 'Sie müssen die Datenschutzerklärung akzeptieren',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const { signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setFocus,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const watchPassword = watch('password');

  useEffect(() => {
    if (currentStep === 1) {
      setFocus('businessName');
    } else {
      setFocus('password');
    }
  }, [currentStep, setFocus]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await signUp({
        email: data.email,
        password: data.password,
        displayName: data.ownerName,
        businessName: data.businessName,
        phone: data.phone,
        role: 'owner',
      });
      
      toast.success(t('auth.registerSuccess'));
      navigate('/onboarding');
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return t('auth.errors.emailInUse');
      case 'auth/invalid-email':
        return t('auth.errors.invalidEmail');
      case 'auth/operation-not-allowed':
        return t('auth.errors.operationNotAllowed');
      case 'auth/weak-password':
        return t('auth.errors.weakPassword');
      default:
        return t('auth.errors.generic');
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = watchPassword ? getPasswordStrength(watchPassword) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <Logo className="mx-auto h-12 w-auto" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('auth.registerTitle')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('auth.registerSubtitle')}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
              currentStep >= 1 ? 'border-primary bg-primary text-white' : 'border-gray-300'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Geschäftsdaten</span>
          </div>
          <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
          <div className={`flex items-center ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
              currentStep >= 2 ? 'border-primary bg-primary text-white' : 'border-gray-300'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Sicherheit</span>
          </div>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {currentStep === 1 ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Business Name */}
              <div>
                <label htmlFor="businessName" className="form-label">
                  {t('auth.businessName')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <OfficeBuildingIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    {...register('businessName')}
                    type="text"
                    autoComplete="organization"
                    className="pl-10"
                    placeholder="Burger Truck Zürich"
                    error={!!errors.businessName}
                  />
                </div>
                {errors.businessName && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessName.message}</p>
                )}
              </div>

              {/* Owner Name */}
              <div>
                <label htmlFor="ownerName" className="form-label">
                  {t('auth.ownerName')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    {...register('ownerName')}
                    type="text"
                    autoComplete="name"
                    className="pl-10"
                    placeholder="Max Mustermann"
                    error={!!errors.ownerName}
                  />
                </div>
                {errors.ownerName && (
                  <p className="mt-1 text-sm text-red-600">{errors.ownerName.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="form-label">
                  {t('auth.email')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AtSymbolIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    className="pl-10"
                    placeholder="info@foodtruck.ch"
                    error={!!errors.email}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="form-label">
                  {t('auth.phone')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    {...register('phone')}
                    type="tel"
                    autoComplete="tel"
                    className="pl-10"
                    placeholder="+41 79 123 45 67"
                    error={!!errors.phone}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setCurrentStep(2)}
              >
                {t('common.next')}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Password */}
              <div>
                <label htmlFor="password" className="form-label">
                  {t('auth.password')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="pl-10 pr-10"
                    placeholder={t('auth.passwordPlaceholder')}
                    error={!!errors.password}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
                
                {/* Password Strength Indicator */}
                {watchPassword && (
                  <div className="mt-2">
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${
                            i < passwordStrength
                              ? passwordStrength <= 2
                                ? 'bg-red-500'
                                : passwordStrength <= 3
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {passwordStrength <= 2 && 'Schwaches Passwort'}
                      {passwordStrength === 3 && 'Mittleres Passwort'}
                      {passwordStrength >= 4 && 'Starkes Passwort'}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="form-label">
                  {t('auth.confirmPassword')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="pl-10 pr-10"
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    error={!!errors.confirmPassword}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Terms and Privacy */}
              <div className="space-y-3">
                <div className="flex items-start">
                  <Checkbox
                    {...register('acceptTerms')}
                    id="acceptTerms"
                    className="mt-1"
                  />
                  <label htmlFor="acceptTerms" className="ml-2 text-sm text-gray-700">
                    Ich akzeptiere die{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark"
                    >
                      Allgemeinen Geschäftsbedingungen
                    </a>
                  </label>
                </div>
                {errors.acceptTerms && (
                  <p className="ml-6 text-sm text-red-600">{errors.acceptTerms.message}</p>
                )}

                <div className="flex items-start">
                  <Checkbox
                    {...register('acceptPrivacy')}
                    id="acceptPrivacy"
                    className="mt-1"
                  />
                  <label htmlFor="acceptPrivacy" className="ml-2 text-sm text-gray-700">
                    Ich habe die{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark"
                    >
                      Datenschutzerklärung
                    </a>{' '}
                    gelesen und akzeptiert
                  </label>
                </div>
                {errors.acceptPrivacy && (
                  <p className="ml-6 text-sm text-red-600">{errors.acceptPrivacy.message}</p>
                )}
              </div>

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isSubmitting || authLoading}
                  disabled={isSubmitting || authLoading}
                  className="flex-1"
                >
                  {t('auth.createAccount')}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Sign in link */}
          <div className="text-center text-sm">
            <span className="text-gray-600">{t('auth.alreadyHaveAccount')}</span>{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary-dark"
            >
              {t('auth.signIn')}
            </Link>
          </div>
        </form>

        {/* Benefits */}
        <div className="mt-8 p-4 bg-green-50 rounded-lg">
          <h3 className="text-sm font-semibold text-green-900 mb-2">
            🎉 3 Monate kostenlos!
          </h3>
          <ul className="text-xs text-green-700 space-y-1">
            <li>✓ Alle Funktionen inklusive</li>
            <li>✓ Keine Kreditkarte erforderlich</li>
            <li>✓ Automatische Umstellung auf 3% Transaktionsgebühr</li>
            <li>✓ Jederzeit kündbar</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
