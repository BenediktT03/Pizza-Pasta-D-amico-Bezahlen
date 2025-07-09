import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Check, X, Sparkles, Zap, Crown } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    icon: Sparkles,
    price: '199',
    description: 'Perfekt für kleine Restaurants',
    features: [
      'Bis zu 500 Bestellungen/Monat',
      'Sprachbestellung (DE)',
      'Basic Analytics',
      'Email Support',
      'PWA Web App',
      'Basis-Integrationen',
    ],
    notIncluded: [
      'Multi-Location',
      'Erweiterte KI-Features',
      'API Zugang',
    ],
    color: 'purple',
    popular: false,
  },
  {
    name: 'Professional',
    icon: Zap,
    price: '399',
    description: 'Für wachsende Gastronomie',
    features: [
      'Bis zu 2000 Bestellungen/Monat',
      'Alle 4 Sprachen',
      'Advanced Analytics & KI',
      'Priority Support 24/7',
      'Kitchen Display App',
      'Alle Integrationen',
      'Multi-Location (bis 3)',
      'Inventory Management',
      'Staff Management',
    ],
    notIncluded: [
      'White Label Option',
    ],
    color: 'blue',
    popular: true,
  },
  {
    name: 'Enterprise',
    icon: Crown,
    price: 'Custom',
    description: 'Für Ketten & Franchise',
    features: [
      'Unbegrenzte Bestellungen',
      'Unbegrenzte Locations',
      'White Label verfügbar',
      'Dedicated Account Manager',
      'Custom Entwicklung',
      'SLA Garantie',
      'Vor-Ort Schulungen',
      'API & Webhooks',
      'Custom Reporting',
      'Eigene Server möglich',
    ],
    notIncluded: [],
    color: 'gold',
    popular: false,
  },
];

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Transparente Preise,
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              keine versteckten Kosten
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Wählen Sie den Plan, der zu Ihrem Restaurant passt. 
            Jederzeit upgraden oder downgraden möglich.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-lg ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monatlich
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-16 h-8 bg-gray-200 rounded-full p-1"
            >
              <motion.div
                animate={{ x: billingCycle === 'monthly' ? 0 : 32 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="w-6 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
              />
            </motion.button>
            <span className={`text-lg ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Jährlich
              <span className="ml-2 text-sm text-green-600 font-medium">-20%</span>
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`relative ${plan.popular ? 'md:-mt-8' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-0 right-0 flex justify-center">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Beliebteste Wahl
                  </span>
                </div>
              )}
              
              <div className={`
                relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300
                ${plan.popular ? 'ring-2 ring-purple-600' : 'ring-1 ring-gray-200'}
                overflow-hidden
              `}>
                {/* Plan Header */}
                <div className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`
                        p-2 rounded-lg
                        ${plan.color === 'purple' ? 'bg-purple-100' : ''}
                        ${plan.color === 'blue' ? 'bg-blue-100' : ''}
                        ${plan.color === 'gold' ? 'bg-yellow-100' : ''}
                      `}>
                        <plan.icon className={`
                          w-6 h-6
                          ${plan.color === 'purple' ? 'text-purple-600' : ''}
                          ${plan.color === 'blue' ? 'text-blue-600' : ''}
                          ${plan.color === 'gold' ? 'text-yellow-600' : ''}
                        `} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    {plan.price === 'Custom' ? (
                      <div className="text-4xl font-bold text-gray-900">Custom</div>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-lg text-gray-600">CHF</span>
                        <span className="text-4xl font-bold text-gray-900 mx-1">
                          {billingCycle === 'monthly' ? plan.price : Math.floor(parseInt(plan.price) * 0.8)}
                        </span>
                        <span className="text-lg text-gray-600">/Monat</span>
                      </div>
                    )}
                    <p className="text-gray-600 mt-2">{plan.description}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3 opacity-50">
                        <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-500">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full mt-8 px-6 py-3 rounded-xl font-semibold transition-all duration-300
                      ${plan.popular 
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg' 
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }
                    `}
                  >
                    {plan.price === 'Custom' ? 'Kontakt aufnehmen' : 'Jetzt starten'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-600 mb-8">
            Alle Preise exkl. MwSt. • Keine Einrichtungsgebühr • Keine Transaktionsgebühren
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">14 Tage</div>
              <div className="text-sm text-gray-600">Kostenlos testen</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">Jederzeit</div>
              <div className="text-sm text-gray-600">Kündbar</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">100%</div>
              <div className="text-sm text-gray-600">Schweizer Hosting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">24/7</div>
              <div className="text-sm text-gray-600">Support verfügbar</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
