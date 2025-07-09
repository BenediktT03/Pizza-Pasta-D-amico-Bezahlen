import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Marco Müller',
    role: 'Inhaber, Restaurant Alpenhof',
    location: 'Zürich',
    image: '/testimonials/marco.jpg',
    rating: 5,
    text: 'EATECH hat unseren Bestellprozess revolutioniert. Die Spracherkennung funktioniert sogar mit Schweizerdeutsch perfekt. Unsere Kunden lieben es!',
    stats: '+45% mehr Bestellungen',
  },
  {
    name: 'Sophie Dubois',
    role: 'CEO, Brasserie Lausanne',
    location: 'Lausanne',
    image: '/testimonials/sophie.jpg',
    rating: 5,
    text: 'La reconnaissance vocale en français est impressionnante. Nos clients commandent plus facilement et nous avons réduit les erreurs de 90%.',
    stats: '-90% weniger Fehler',
  },
  {
    name: 'Giovanni Rossi',
    role: 'Manager, Pizzeria Ticino',
    location: 'Lugano',
    image: '/testimonials/giovanni.jpg',
    rating: 5,
    text: 'Il sistema multi-tenant è perfetto per le nostre 5 filiali. Ogni location ha la sua configurazione, ma gestiamo tutto centralmente.',
    stats: '5 Filialen, 1 System',
  },
  {
    name: 'Anna Weber',
    role: 'Betriebsleiterin, Café Central',
    location: 'Bern',
    image: '/testimonials/anna.jpg',
    rating: 5,
    text: 'Die KI-gestützten Analysen haben uns geholfen, unsere Preise zu optimieren. Wir haben 30% mehr Umsatz bei gleichen Kosten.',
    stats: '+30% Umsatzsteigerung',
  },
  {
    name: 'Thomas Keller',
    role: 'Franchise Owner, FastGood Chain',
    location: 'Basel',
    image: '/testimonials/thomas.jpg',
    rating: 5,
    text: 'Als Franchise mit 20+ Standorten ist EATECH unverzichtbar. Die zentrale Verwaltung und lokale Anpassungen funktionieren nahtlos.',
    stats: '20+ Standorte verwaltet',
  },
  {
    name: 'Laura Schneider',
    role: 'Digital Manager, Hotel Restaurant',
    location: 'St. Gallen',
    image: '/testimonials/laura.jpg',
    rating: 5,
    text: 'Die Integration mit unseren bestehenden Systemen war problemlos. Der Support ist erstklassig und immer erreichbar.',
    stats: '100% Systemintegration',
  },
];

const Testimonials = () => {
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
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
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
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Erfolgsgeschichten aus der
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Schweizer Gastronomie
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Über 500 Restaurants vertrauen bereits auf EATECH. 
            Lesen Sie, was unsere Kunden sagen.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="relative"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                {/* Quote Icon */}
                <Quote className="absolute top-6 right-6 w-8 h-8 text-purple-100" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-gray-700 mb-6 relative z-10">
                  "{testimonial.text}"
                </p>

                {/* Stats Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
                  {testimonial.stats}
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-sm text-gray-500">{testimonial.location}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 bg-white rounded-3xl p-8 shadow-lg"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">500+</div>
              <div className="text-sm text-gray-600">Restaurants</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">4.9/5</div>
              <div className="text-sm text-gray-600">Bewertung</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">2M+</div>
              <div className="text-sm text-gray-600">Bestellungen</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">99.9%</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-lg text-gray-600 mb-6">
            Werden Sie Teil der EATECH Erfolgsgeschichte
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Jetzt kostenlos testen
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
