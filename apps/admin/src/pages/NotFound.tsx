import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  HomeIcon, 
  ArrowLeftIcon,
  SearchIcon 
} from '@heroicons/react/outline';
import { Button } from '@eatech/ui/components/Button';
import { Logo } from '@eatech/ui/components/Logo';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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

        {/* 404 Illustration */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <div className="text-9xl font-bold text-gray-200">404</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl">🚚💨</div>
            </div>
          </div>
        </motion.div>

        {/* Text */}
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          {t('errors.pageNotFound')}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {t('errors.pageNotFoundDescription')}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="primary"
            size="lg"
            icon={<HomeIcon className="h-5 w-5" />}
            onClick={() => navigate('/')}
          >
            {t('common.goToDashboard')}
          </Button>
          
          <Button
            variant="secondary"
            size="lg"
            icon={<ArrowLeftIcon className="h-5 w-5" />}
            onClick={() => navigate(-1)}
          >
            {t('common.goBack')}
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            {t('errors.lostSomething')}
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <Link
              to="/orders"
              className="flex items-center justify-center text-blue-700 hover:text-blue-800"
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              {t('nav.orders')}
            </Link>
            <Link
              to="/products"
              className="flex items-center justify-center text-blue-700 hover:text-blue-800"
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              {t('nav.products')}
            </Link>
            <Link
              to="/analytics"
              className="flex items-center justify-center text-blue-700 hover:text-blue-800"
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              {t('nav.analytics')}
            </Link>
          </div>
        </div>

        {/* Fun Facts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 text-sm text-gray-500"
        >
          <p className="italic">
            {t('errors.funFact404')}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
