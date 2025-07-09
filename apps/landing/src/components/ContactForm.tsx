import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useForm } from 'react-hook-form';
import emailjs from '@emailjs/browser';
import { 
  Send, 
  CheckCircle, 
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Calendar,
  Building
} from 'lucide-react';

interface ContactFormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  locations: string;
  message: string;
  interests: string[];
}

const ContactForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      // Initialize EmailJS (you need to add your service ID, template ID, and public key)
      await emailjs.send(
        'YOUR_SERVICE_ID',
        'YOUR_TEMPLATE_ID',
        {
          from_name: data.name,
          from_email: data.email,
          company: data.company,
          phone: data.phone,
          locations: data.locations,
          message: data.message,
          interests: data.interests.join(', '),
        },
        'YOUR_PUBLIC_KEY'
      );
      
      setSubmitStatus('success');
      reset();
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitStatus('idle'), 5000);
    }
  };

  return (
    <section ref={ref} className="py-20 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Bereit für die Zukunft?
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Lassen Sie uns sprechen
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Erfahren Sie, wie EATECH Ihr Restaurant transformieren kann. 
            Kostenloses Beratungsgespräch und Demo.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Direkter Kontakt
              </h3>
              
              <div className="space-y-4">
                <motion.a
                  href="tel:+41445551234"
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Phone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Telefon</div>
                    <div className="text-gray-600">+41 44 555 12 34</div>
                  </div>
                </motion.a>

                <motion.a
                  href="mailto:hello@eatech.ch"
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Email</div>
                    <div className="text-gray-600">hello@eatech.ch</div>
                  </div>
                </motion.a>

                <motion.div
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm"
                >
                  <div className="p-3 bg-green-100 rounded-lg">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Hauptsitz</div>
                    <div className="text-gray-600">Zürich, Schweiz</div>
                  </div>
                </motion.div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Was Sie erwarten können
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">Persönliche Demo</div>
                    <div className="text-gray-600">Live-Demonstration aller Features</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">Massgeschneiderte Lösung</div>
                    <div className="text-gray-600">Angepasst an Ihre Bedürfnisse</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">ROI-Berechnung</div>
                    <div className="text-gray-600">Konkrete Zahlen für Ihr Restaurant</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">14 Tage kostenlos</div>
                    <div className="text-gray-600">Testen Sie unverbindlich</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-lg p-8">
              <div className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    {...register('name', { required: 'Name ist erforderlich' })}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200"
                    placeholder="Max Mustermann"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    {...register('email', { 
                      required: 'Email ist erforderlich',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Ungültige Email-Adresse'
                      }
                    })}
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200"
                    placeholder="max@restaurant.ch"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                {/* Company Field */}
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurant/Unternehmen *
                  </label>
                  <input
                    {...register('company', { required: 'Unternehmen ist erforderlich' })}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200"
                    placeholder="Restaurant Alpenhof"
                  />
                  {errors.company && (
                    <p className="mt-1 text-sm text-red-600">{errors.company.message}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200"
                    placeholder="+41 44 555 12 34"
                  />
                </div>

                {/* Locations Field */}
                <div>
                  <label htmlFor="locations" className="block text-sm font-medium text-gray-700 mb-2">
                    Anzahl Standorte
                  </label>
                  <select
                    {...register('locations')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200"
                  >
                    <option value="1">1 Standort</option>
                    <option value="2-5">2-5 Standorte</option>
                    <option value="6-10">6-10 Standorte</option>
                    <option value="10+">Mehr als 10 Standorte</option>
                  </select>
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interessiert an
                  </label>
                  <div className="space-y-2">
                    {['Sprachbestellung', 'Multi-Location', 'Analytics & KI', 'Kitchen Display'].map((interest) => (
                      <label key={interest} className="flex items-center gap-3 cursor-pointer">
                        <input
                          {...register('interests')}
                          type="checkbox"
                          value={interest}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-gray-700">{interest}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Nachricht
                  </label>
                  <textarea
                    {...register('message')}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200"
                    placeholder="Erzählen Sie uns von Ihrem Restaurant und Ihren Zielen..."
                  />
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      Demo anfordern
                      <Send className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>
            </form>

            {/* Status Messages */}
            <AnimatePresence>
              {submitStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-green-100 text-green-700 rounded-lg flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Vielen Dank! Wir melden uns innerhalb von 24 Stunden.
                </motion.div>
              )}
              
              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2"
                >
                  <AlertCircle className="w-5 h-5" />
                  Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
