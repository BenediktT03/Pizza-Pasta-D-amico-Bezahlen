import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@eatech/core/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  LockClosedIcon, 
  EyeIcon, 
  EyeOffIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/outline';
import { Button } from '@eatech/ui/components/Button';
import { Input } from '@eatech/ui/components/Input';
import { Alert } from '@eatech/ui/components/Alert';
import { Logo } from '@eatech/ui/components/Logo';
import toast from 'react-hot-toast';

// Validation schema
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword: React.FC = () => {
  const { confirmPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInvalidLink, setIsInvalidLink] = useState(false);

  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!oobCode) {
      setIsInvalidLink(true);
    }
  }, [oobCode]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const watchPassword = watch('password');

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!oobCode) {
      toast.error(t('auth.errors.invalidResetLink'));
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(oobCode, data.password);
      toast.success(t('auth.passwordResetSuccess'));
      navigate('/login');
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/expired-action-code':
        return t('auth.errors.expiredResetLink');
      case 'auth/invalid-action-code':
        return t('auth.errors.invalidResetLink');
      case 'auth/user-disabled':
        return t('auth.errors.userDisabled');
      case 'auth/user-not-found':
        return t('auth.errors.userNotFound');
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

  if (isInvalidLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Alert variant="error" icon={<ExclamationCircleIcon className="h-5 w-5" />}>
            <h3 className="text-sm font-medium text-red-800">
              {t('auth.errors.invalidResetLink')}
            </h3>
            <p className="mt-2 text-sm text-red-700">
              {t('auth.errors.invalidResetLinkDescription')}
            </p>
            <div className="mt-4">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-red-700 hover:text-red-600"
              >
                {t('auth.requestNewResetLink')} →
              </Link>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

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
            {t('auth.resetPasswordTitle')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('auth.resetPasswordSubtitle')}
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="form-label">
                {t('auth.newPassword')}
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
                  placeholder={t('auth.newPasswordPlaceholder')}
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
                {t('auth.confirmNewPassword')}
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
                  placeholder={t('auth.confirmNewPasswordPlaceholder')}
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
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {t('auth.resetPassword')}
            </Button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">{t('auth.rememberPassword')}</span>{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary-dark"
            >
              {t('auth.signIn')}
            </Link>
          </div>
        </form>

        {/* Security tips */}
        <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">
            🔒 {t('auth.securityTips')}
          </h3>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• {t('auth.securityTip1')}</li>
            <li>• {t('auth.securityTip2')}</li>
            <li>• {t('auth.securityTip3')}</li>
            <li>• {t('auth.securityTip4')}</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
