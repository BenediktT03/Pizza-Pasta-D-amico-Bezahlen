import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Mic, 
  Globe, 
  Zap, 
  Shield, 
  BarChart3, 
  Smartphone,
  Users,
  CreditCard,
  Clock,
  Brain,
  Layers,
  Sparkles
} from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Sprachbestellung',
    description: 'Natürliche Spracherkennung in Schweizerdeutsch, Deutsch, Französisch und Italienisch.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Globe,
    title: 'Multi-Tenant System',
    description: 'Ein System, unbegrenzte Restaurants. Jeder Tenant mit eigener Domain und Branding.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Zap,
    title: 'Blitzschnell',
    description: 'Optimiert für Geschwindigkeit. PWA-Technologie für native App-Performance.',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Shield,
    title: 'Schweizer Datenschutz',
    description: 'DSGVO/DSG konform. Ihre Daten bleiben in der Schweiz.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics & KI',
    description: 'Intelligente Preisvorschläge und Verkaufsprognosen durch Machine Learning.',
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Perfekt optimiert für alle Geräte. Offline-fähig dank Service Worker.',
    gradient: 'from-red-500 to-pink-500',
  },
];

const Features = () => {
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
    <section ref={ref} className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full mb-4"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Innovative Features</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Alles was Sie brauchen,
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              in einem System
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Von Sprachbestellung bis Analytics - EATECH bietet die komplette Lösung 
            für moderne Gastronomie in der Schweiz.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"
                style={{
                  backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
                  '--tw-gradient-from': feature.gradient.split(' ')[1],
                  '--tw-gradient-to': feature.gradient.split(' ')[3],
                } as React.CSSProperties}
              />
              
              <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-8 md:p-12"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-white">
              <h3 className="text-3xl font-bold mb-4">
                Bereit für die Zukunft
              </h3>
              <p className="text-lg mb-6 text-purple-100">
                Mit kontinuierlichen Updates und neuen Features bleiben Sie 
                immer einen Schritt voraus. Keine versteckten Kosten, keine Überraschungen.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>Multi-Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Alle Zahlungsarten</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>24/7 Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  <span>KI-gestützt</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full blur-3xl opacity-20"
              />
              <img
                src="/feature-preview.png"
                alt="EATECH Features"
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
