import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  CogIcon,
  ClockIcon,
  MailIcon,
  RefreshIcon
} from '@heroicons/react/outline';
import { Logo } from '@eatech/ui/components/Logo';

const Maintenance: React.FC = () => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  // Estimated maintenance end time (example: 2 hours from now)
  const maintenanceEndTime = new Date();
  maintenanceEndTime.setHours(maintenanceEndTime.getHours() + 2);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = maintenanceEndTime.getTime() - now.getTime();
      
      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft('Bald fertig...');
        // Auto refresh after maintenance
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [maintenanceEndTime]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full text-center"
      >
        {/* Logo */}
        <Logo className="mx-auto h-12 w-auto mb-8" />

        {/* Animated Gears */}
        <motion.div
          className="relative inline-block mb-8"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -left-4 -top-4"
          >
            <CogIcon className="h-16 w-16 text-gray-300" />
          </motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="relative"
          >
            <CogIcon className="h-24 w-24 text-primary" />
          </motion.div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute -right-4 -bottom-4"
          >
            <CogIcon className="h-12 w-12 text-gray-400" />
          </motion.div>
        </motion.div>

        {/* Text */}
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          {t('maintenance.title')}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {t('maintenance.description')}
        </p>

        {/* Countdown */}
        {timeLeft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-center text-gray-500 mb-2">
              <ClockIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">
                {t('maintenance.estimatedTime')}
              </span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {timeLeft}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <RefreshIcon className="h-5 w-5 mr-2" />
            {t('maintenance.checkAgain')}
          </button>

          <div className="text-sm text-gray-500">
            {t('maintenance.notificationHint')}
          </div>
        </div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 p-6 bg-blue-50 rounded-lg"
        >
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            {t('maintenance.needHelp')}
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            {t('maintenance.contactSupport')}
          </p>
          <a
            href="mailto:support@eatech.ch"
            className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            <MailIcon className="h-4 w-4 mr-2" />
            support@eatech.ch
          </a>
        </motion.div>

        {/* Status Updates */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 text-sm text-gray-500"
        >
          <p>
            {t('maintenance.statusUpdates')}{' '}
            <a
              href="https://status.eatech.ch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-dark"
            >
              status.eatech.ch
            </a>
          </p>
        </motion.div>

        {/* Improvements List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 p-6 bg-green-50 rounded-lg"
        >
          <h3 className="text-sm font-semibold text-green-900 mb-3">
            🚀 {t('maintenance.improvements')}
          </h3>
          <ul className="text-sm text-green-700 space-y-2 text-left">
            <li>✨ {t('maintenance.improvement1')}</li>
            <li>⚡ {t('maintenance.improvement2')}</li>
            <li>🛡️ {t('maintenance.improvement3')}</li>
            <li>🎨 {t('maintenance.improvement4')}</li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Maintenance;
