import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@eatech/core/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  AtSymbolIcon, 
  ArrowLeftIcon,
  CheckCircleIcon 
} from '@heroicons/react/outline';
import { Button } from '@eatech/ui/components/Button';
import { Input } from '@eatech/ui/components/Input';
import { Alert } from '@eatech/ui/components/Alert';
import { Logo } from '@eatech/ui/components/Logo';
import toast from 'react-hot-toast';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    try {
      await resetPassword(data.email);
      setIsSuccess(true);
      toast.success(t('auth.resetPasswordEmailSent'));
    } catch (error: any) {
      const errorMessage = getErrorMessage(error.code);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return t('auth.errors.userNotFound');
      case 'auth/invalid-email':
        return t('auth.errors.invalidEmail');
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
            {t('auth.forgotPasswordTitle')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('auth.forgotPasswordSubtitle')}
          </p>
        </div>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-green-50 rounded-lg p-6"
          >
            <div className="flex">
              <CheckCircleIcon className="h-12 w-12 text-green-400" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-green-900">
                  {t('auth.resetPasswordEmailSentTitle')}
                </h3>
                <p className="mt-2 text-sm text-green-700">
                  {t('auth.resetPasswordEmailSentDescription')}
                </p>
                <div className="mt-4">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-green-700 hover:text-green-600"
                  >
                    {t('auth.backToLogin')} →
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
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

            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {t('auth.sendResetEmail')}
              </Button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-dark"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                {t('auth.backToLogin')}
              </Link>
            </div>
          </form>
        )}

        {/* Additional help */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            {t('auth.needHelp')}
          </h3>
          <p className="text-xs text-blue-700 mb-2">
            {t('auth.contactSupport')}
          </p>
          <a
            href="mailto:support@eatech.ch"
            className="text-xs font-medium text-blue-700 hover:text-blue-600"
          >
            support@eatech.ch
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
