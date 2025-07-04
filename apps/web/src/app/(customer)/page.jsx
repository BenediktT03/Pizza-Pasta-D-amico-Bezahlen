/**
 * EATECH - Customer Home Page
 * Version: 16.0.0
 * Description: Startseite für Kunden mit Hero, Kategorien und Features
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /apps/web/src/app/(customer)/page.jsx
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  Clock, 
  Star, 
  ChevronRight,
  Sparkles,
  Zap,
  Trophy,
  Heart,
  TrendingUp,
  MapPin,
  Phone,
  Timer,
  Flame
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Mock data - später aus Firebase
const CATEGORIES = [
  { id: 1, name: 'Burger', icon: '🍔', color: '#FF6B6B', itemCount: 12 },
  { id: 2, name: 'Pizza', icon: '🍕', color: '#4ECDC4', itemCount: 8 },
  { id: 3, name: 'Salate', icon: '🥗', color: '#51CF66', itemCount: 6 },
  { id: 4, name: 'Wraps', icon: '🌯', color: '#FFE66D', itemCount: 5 },
  { id: 5, name: 'Desserts', icon: '🍰', color: '#C7B8FF', itemCount: 4 },
  { id: 6, name: 'Getränke', icon: '🥤', color: '#54A0FF', itemCount: 10 }
];

const FEATURED_ITEMS = [
  {
    id: 1,
    name: 'Signature Burger',
    description: 'Unser Meisterwerk mit doppeltem Patty',
    price: 18.90,
    image: '/images/products/burger-1.jpg',
    rating: 4.9,
    orderCount: '500+',
    isNew: false,
    isBestseller: true
  },
  {
    id: 2,
    name: 'Truffle Pizza',
    description: 'Mit echten Trüffeln und Büffelmozzarella',
    price: 24.90,
    image: '/images/products/pizza-1.jpg',
    rating: 4.8,
    orderCount: '300+',
    isNew: true,
    isBestseller: false
  },
  {
    id: 3,
    name: 'Power Bowl',
    description: 'Gesund, lecker und sättigend',
    price: 16.50,
    image: '/images/products/salad-1.jpg',
    rating: 4.7,
    orderCount: '200+',
    isNew: false,
    isBestseller: false
  }
];

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Sarah M.',
    rating: 5,
    text: 'Beste Burger in Zürich! Die App macht bestellen super einfach.',
    avatar: '👩'
  },
  {
    id: 2,
    name: 'Marco K.',
    rating: 5,
    text: 'Endlich keine Wartezeiten mehr. Einfach vorbestellen und abholen!',
    avatar: '👨'
  },
  {
    id: 3,
    name: 'Lisa T.',
    rating: 5,
    text: 'Die Pizza ist ein Traum und die Lieferung super schnell!',
    avatar: '👩‍🦰'
  }
];

export default function CustomerHomePage() {
  const router = useRouter();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10" />
          <Image
            src="/images/hero-food.jpg"
            alt="Delicious Food"
            fill
            className="object-cover opacity-40"
            priority
          />
        </div>
        
        <div className="relative z-20 container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 px-4 py-2 rounded-full mb-6"
            >
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium">Jetzt 20% auf alle Burger!</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
                Hunger?
              </span>
              <br />
              <span className="text-white">Wir liefern Glück!</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Bestelle in 30 Sekunden, genieße in 15 Minuten. 
              Die schnellste Art, großartiges Essen zu bekommen.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/menu')}
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-red-500/25 transition-all duration-300"
              >
                Jetzt bestellen
                <ChevronRight className="inline-block ml-2 w-5 h-5" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <MapPin className="inline-block mr-2 w-5 h-5" />
                Standort ansehen
              </motion.button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-red-500">15 Min</div>
                <div className="text-sm text-gray-400">Ø Lieferzeit</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-orange-500">4.9★</div>
                <div className="text-sm text-gray-400">Bewertung</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-yellow-500">10k+</div>
                <div className="text-sm text-gray-400">Bestellungen</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Was darf's heute sein?</h2>
            <p className="text-gray-400">Wähle aus unseren leckeren Kategorien</p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/menu?category=${category.name.toLowerCase()}`)}
                className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl cursor-pointer border border-gray-700 hover:border-gray-600 transition-all duration-300"
              >
                <div className="text-4xl mb-3 text-center">{category.icon}</div>
                <h3 className="font-semibold text-center">{category.name}</h3>
                <p className="text-xs text-gray-400 text-center mt-1">
                  {category.itemCount} Artikel
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex justify-between items-center mb-12"
          >
            <div>
              <h2 className="text-3xl font-bold mb-2">Beliebte Gerichte</h2>
              <p className="text-gray-400">Die Favoriten unserer Kunden</p>
            </div>
            <Link 
              href="/menu"
              className="text-red-500 hover:text-red-400 transition-colors flex items-center gap-2"
            >
              Alle ansehen
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURED_ITEMS.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-300 group"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {item.isNew && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      NEU
                    </div>
                  )}
                  {item.isBestseller && (
                    <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      Bestseller
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{item.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{item.rating}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.orderCount} bestellt
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-red-500">
                      CHF {item.price.toFixed(2)}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-semibold transition-colors"
                    >
                      Bestellen
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Warum EATECH?</h2>
            <p className="text-gray-400">Wir machen Bestellen zum Erlebnis</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Blitzschnell</h3>
              <p className="text-gray-400">
                Von der Bestellung bis zur Lieferung in durchschnittlich 15 Minuten
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">KI-Empfehlungen</h3>
              <p className="text-gray-400">
                Personalisierte Vorschläge basierend auf deinen Vorlieben
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Mit Liebe gemacht</h3>
              <p className="text-gray-400">
                Frische Zutaten und Leidenschaft in jedem Gericht
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Das sagen unsere Kunden</h2>
            <div className="flex justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-500 fill-current" />
              ))}
            </div>
            <p className="text-gray-400">4.9 von 5 Sternen (2.543 Bewertungen)</p>
          </motion.div>
          
          <div className="relative h-40">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center"
              >
                <div className="text-4xl mb-4">{TESTIMONIALS[currentTestimonial].avatar}</div>
                <p className="text-xl mb-4 italic">"{TESTIMONIALS[currentTestimonial].text}"</p>
                <p className="text-gray-400">— {TESTIMONIALS[currentTestimonial].name}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="flex justify-center gap-2 mt-8">
            {TESTIMONIALS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentTestimonial ? 'bg-red-500 w-8' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="container mx-auto max-w-4xl"
        >
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-4">Bereit für dein Lieblingsgericht?</h2>
              <p className="text-xl mb-8 opacity-90">
                Bestelle jetzt und spare 20% auf deine erste Bestellung!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/menu')}
                className="bg-white text-red-500 px-8 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-white/25 transition-all duration-300"
              >
                Jetzt bestellen und sparen
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Restaurant Info Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 py-3 px-4 z-40">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isRestaurantOpen ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">
              {isRestaurantOpen ? 'Jetzt geöffnet' : 'Geschlossen'} • 11:00 - 22:00
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="tel:+41441234567" className="flex items-center gap-2 hover:text-red-500 transition-colors">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">044 123 45 67</span>
            </a>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              <span>Ø 15 Min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}