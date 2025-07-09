import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@eatech/core/hooks/useAuth';
import { useTenant } from '@eatech/core/hooks/useTenant';
import { useTranslation } from 'react-i18next';
import { 
  CheckIcon,
  XIcon
} from '@heroicons/react/outline';
import { Button } from '@eatech/ui/components/Button';
import confetti from 'canvas-confetti';

// Import Onboarding Steps
import { WelcomeStep } from './steps/WelcomeStep';
import { LogoUploadStep } from './steps/LogoUploadStep';
import { ProductCreationStep } from './steps/ProductCreationStep';
import { LocationSetupStep } from './steps/LocationSetupStep';
import { TestOrderStep } from './steps/TestOrderStep';
import { PaymentSetupStep } from './steps/PaymentSetupStep';
import { CompletionStep } from './steps/CompletionStep';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  validation?: (data: any) => boolean;
  required: boolean;
}

export const OnboardingFlow: React.FC = () => {
  const { user } = useAuth();
  const { tenant, updateTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [truckPosition, setTruckPosition] = useState(0);
  
  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: t('onboarding.welcome.title'),
      description: t('onboarding.welcome.description'),
      component: WelcomeStep,
      required: true,
    },
    {
      id: 'logo',
      title: t('onboarding.logo.title'),
      description: t('onboarding.logo.description'),
      component: LogoUploadStep,
      validation: (data) => !!data.logo,
      required: true,
    },
    {
      id: 'product',
      title: t('onboarding.product.title'),
      description: t('onboarding.product.description'),
      component: ProductCreationStep,
      validation: (data) => data.products && data.products.length > 0,
      required: true,
    },
    {
      id: 'location',
      title: t('onboarding.location.title'),
      description: t('onboarding.location.description'),
      component: LocationSetupStep,
      validation: (data) => data.locations && data.locations.length > 0,
      required: true,
    },
    {
      id: 'test-order',
      title: t('onboarding.testOrder.title'),
      description: t('onboarding.testOrder.description'),
      component: TestOrderStep,
      validation: (data) => data.testOrderComplete === true,
      required: true,
    },
    {
      id: 'payment',
      title: t('onboarding.payment.title'),
      description: t('onboarding.payment.description'),
      component: PaymentSetupStep,
      validation: (data) => data.stripeConnected === true,
      required: true,
    },
    {
      id: 'completion',
      title: t('onboarding.completion.title'),
      description: t('onboarding.completion.description'),
      component: CompletionStep,
      required: false,
    },
  ];
  
  const currentStep = steps[currentStepIndex];
  
  // Calculate progress
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  
  // Update truck position with smooth animation
  useEffect(() => {
    setTruckPosition(progress);
  }, [progress]);
  
  const handleStepComplete = async (stepData: any) => {
    // Update onboarding data
    const updatedData = {
      ...onboardingData,
      [currentStep.id]: stepData,
    };
    setOnboardingData(updatedData);
    
    // Mark step as completed
    setCompletedSteps([...completedSteps, currentStep.id]);
    
    // Move to next step
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Onboarding complete!
      await completeOnboarding(updatedData);
    }
  };
  
  const completeOnboarding = async (data: any) => {
    try {
      // Update tenant with onboarding data
      await updateTenant({
        ...tenant,
        logo: data.logo.url,
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date(),
        stripeAccountId: data.payment.stripeAccountId,
      });
      
      // Trigger confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Wait a bit for the celebration
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  const skipStep = () => {
    if (!currentStep.required) {
      handleStepComplete({ skipped: true });
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Progress */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Progress Bar with Truck Animation */}
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>
            
            {/* Animated Truck */}
            <motion.div
              className="absolute top-1/2 transform -translate-y-1/2 -mt-2"
              animate={{ left: `${truckPosition}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              style={{ marginLeft: '-20px' }}
            >
              <div className="text-3xl transform scale-x-[-1]">🚚</div>
            </motion.div>
          </div>
          
          {/* Step Counter */}
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentStep.title}
            </h2>
            <span className="text-sm text-gray-500">
              {t('onboarding.stepCounter', {
                current: currentStepIndex + 1,
                total: steps.length,
              })}
            </span>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step Description */}
              <p className="text-gray-600 mb-8 text-center">
                {currentStep.description}
              </p>
              
              {/* Step Component */}
              <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
                <currentStep.component
                  onComplete={handleStepComplete}
                  data={onboardingData[currentStep.id] || {}}
                />
              </div>
              
              {/* Navigation Buttons */}
              <div className="mt-8 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={goToPreviousStep}
                  disabled={currentStepIndex === 0}
                >
                  {t('common.back')}
                </Button>
                
                {!currentStep.required && currentStepIndex < steps.length - 1 && (
                  <Button
                    variant="ghost"
                    onClick={skipStep}
                  >
                    {t('common.skip')}
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      {/* Step Indicators */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${index === currentStepIndex
                    ? 'w-8 bg-primary'
                    : index < currentStepIndex
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                  }
                `}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Exit Button */}
      <button
        onClick={() => {
          if (window.confirm(t('onboarding.exitConfirm'))) {
            navigate('/');
          }
        }}
        className="fixed top-4 right-4 p-2 text-gray-400 hover:text-gray-600 z-50"
      >
        <XIcon className="h-6 w-6" />
      </button>
    </div>
  );
};
