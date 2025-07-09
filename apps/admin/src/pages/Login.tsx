import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@eatech/core/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  AtSymbolIcon, 
  LockClosedIcon, 
  EyeIcon, 
  EyeOffIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/outline';
import { Button } from '@eatech/ui/components/Button';
import { Input } from '@eatech/ui/components/Input';
import { Alert } from '@eatech/ui/components/Alert';
import { Logo } from '@eatech/ui/components/Logo';
import toast from 'react-hot-toast';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { signIn, signInWithGoogle, loading: authLoading, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      remember: true,
    },
  });

  useEffect(() => {
    setFocus('email');
  }, [setFocus]);

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await signIn(data.email, data.password, data.remember);
      toast.success(t('auth.loginSuccess'));
      navigate(from, { replace: true });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success(t('auth.loginSuccess'));
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error(t('auth.googleSignInError'));
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return t('auth.errors.userNotFound');
      case 'auth/wrong-password':
        return t('auth.errors.wrongPassword');
      case 'auth/invalid-email':
        return t('auth.errors.invalidEmail');
      case 'auth/user-disabled':
        return t('auth.errors.userDisabled');
      case 'auth/too-many-requests':
        return t('auth.errors.tooManyRequests');
      default:
        return t('auth.errors.generic');
    }
  };

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
            {t('auth.loginTitle')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {authError && (
            <Alert variant="error" icon={<ExclamationCircleIcon className="h-5 w-5" />}>
              {getErrorMessage(authError.code)}
            </Alert>
          )}

          <div className="space-y-4">
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
                  placeholder={t('auth.emailPlaceholder')}
                  error={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

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
                  autoComplete="current-password"
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
            </div>
          </div>

          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                {...register('remember')}
                id="remember"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-900">
                {t('auth.rememberMe')}
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary hover:text-primary-dark"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </div>

          {/* Submit button */}
          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting || authLoading}
              disabled={isSubmitting || authLoading}
            >
              {t('auth.signIn')}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                {t('auth.orContinueWith')}
              </span>
            </div>
          </div>

          {/* Social login */}
          <div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              fullWidth
              onClick={handleGoogleSignIn}
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
              }
            >
              {t('auth.signInWithGoogle')}
            </Button>
          </div>

          {/* Sign up link */}
          <div className="text-center text-sm">
            <span className="text-gray-600">{t('auth.noAccount')}</span>{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary-dark"
            >
              {t('auth.signUp')}
            </Link>
          </div>
        </form>

        {/* Demo credentials */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-800 font-medium mb-2">Demo Credentials:</p>
            <p className="text-xs text-yellow-700">Email: demo@eatech.ch</p>
            <p className="text-xs text-yellow-700">Password: demo123</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
