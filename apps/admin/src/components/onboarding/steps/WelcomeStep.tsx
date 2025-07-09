import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@eatech/ui/components/Button';
import { 
  SparklesIcon,
  TruckIcon,
  CurrencyDollarIcon,
  GlobeIcon,
  LightningBoltIcon,
  ShieldCheckIcon
} from '@heroicons/react/outline';

interface WelcomeStepProps {
  onComplete: (data: any) => void;
  data: any;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onComplete }) => {
  const { t } = useTranslation();

  const features = [
    {
      icon: TruckIcon,
      title: 'Digitale Bestellungen',
      description: 'QR-Code scannen und bestellen - so einfach!',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: CurrencyDollarIcon,
      title: '3 Monate kostenlos',
      description: 'Alle Features inklusive, danach nur 3% Transaktionsgebühr',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: GlobeIcon,
      title: '4 Sprachen',
      description: 'Deutsch, Französisch, Italienisch und Englisch',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: LightningBoltIcon,
      title: 'Sofort startklar',
      description: 'In nur 10 Minuten komplett eingerichtet',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      icon: ShieldCheckIcon,
      title: 'HACCP-konform',
      description: 'Digitale Temperaturüberwachung und Checklisten',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      icon: SparklesIcon,
      title: 'KI-Features',
      description: 'Voice-Bestellung und intelligente Preisgestaltung',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ];

  return (
    <div className="text-center">
      {/* Welcome Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="inline-block mb-8"
      >
        <div className="text-6xl">🎉</div>
      </motion.div>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Willkommen bei Eatech! 🚚
      </h1>
      
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        Schön, dass Sie da sind! In den nächsten Minuten richten wir gemeinsam 
        Ihren Food Truck ein. Das wird grossartig!
      </p>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-3 rounded-full ${feature.bgColor} mb-4`}>
              <feature.icon className={`h-6 w-6 ${feature.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-gray-600">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <Button
          variant="primary"
          size="xl"
          onClick={() => onComplete({ welcomed: true })}
          className="min-w-[200px]"
        >
          Los geht's! 🚀
        </Button>
      </motion.div>

      {/* Trust Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="mt-8 flex items-center justify-center text-sm text-gray-500"
      >
        <ShieldCheckIcon className="h-4 w-4 mr-2" />
        <span>Keine Kreditkarte erforderlich • Jederzeit kündbar</span>
      </motion.div>
    </div>
  );
};
