import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hero from './components/Hero';
import Features from './components/Features';
import Pricing from './components/Pricing';
import Testimonials from './components/Testimonials';
import ContactForm from './components/ContactForm';
import Navigation from './components/Navigation';
import Footer from './components/Footer';

function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <AnimatePresence>
      {isLoaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen bg-white"
        >
          <Navigation />
          
          <main>
            <Hero />
            <Features />
            <Pricing />
            <Testimonials />
            <ContactForm />
          </main>

          <Footer />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
