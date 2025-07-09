import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    {
      label: 'Produkt',
      href: '#features',
      dropdown: [
        { label: 'Sprachbestellung', href: '#voice' },
        { label: 'Multi-Tenant', href: '#multitenant' },
        { label: 'Analytics & KI', href: '#analytics' },
        { label: 'Integrationen', href: '#integrations' },
      ],
    },
    {
      label: 'Lösungen',
      href: '#solutions',
      dropdown: [
        { label: 'Restaurants', href: '#restaurants' },
        { label: 'Cafés', href: '#cafes' },
        { label: 'Food Trucks', href: '#foodtrucks' },
        { label: 'Ketten & Franchise', href: '#franchise' },
      ],
    },
    {
      label: 'Preise',
      href: '#pricing',
    },
    {
      label: 'Über uns',
      href: '#about',
      dropdown: [
        { label: 'Unternehmen', href: '#company' },
        { label: 'Team', href: '#team' },
        { label: 'Karriere', href: '#careers' },
        { label: 'Kontakt', href: '#contact' },
      ],
    },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center"
            >
              <a href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">E</span>
                </div>
                <span className={`text-2xl font-bold ${
                  isScrolled ? 'text-gray-900' : 'text-white'
                }`}>
                  EATECH
                </span>
              </a>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <a
                    href={link.href}
                    className={`flex items-center gap-1 font-medium transition-colors duration-200 ${
                      isScrolled ? 'text-gray-700 hover:text-purple-600' : 'text-white/90 hover:text-white'
                    }`}
                  >
                    {link.label}
                    {link.dropdown && (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </a>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {link.dropdown && activeDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl overflow-hidden"
                      >
                        {link.dropdown.map((item) => (
                          <a
                            key={item.label}
                            href={item.href}
                            className="block px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                          >
                            {item.label}
                          </a>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <a
                href="/login"
                className={`font-medium transition-colors duration-200 ${
                  isScrolled ? 'text-gray-700 hover:text-purple-600' : 'text-white/90 hover:text-white'
                }`}
              >
                Login
              </a>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Demo anfordern
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden p-2 rounded-lg ${
                isScrolled ? 'text-gray-700' : 'text-white'
              }`}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl">
              <div className="p-6 pt-24">
                <div className="space-y-4">
                  {navLinks.map((link) => (
                    <div key={link.label}>
                      <a
                        href={link.href}
                        className="block py-3 text-lg font-medium text-gray-700 hover:text-purple-600"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {link.label}
                      </a>
                      {link.dropdown && (
                        <div className="ml-4 space-y-2 mt-2">
                          {link.dropdown.map((item) => (
                            <a
                              key={item.label}
                              href={item.href}
                              className="block py-2 text-gray-600 hover:text-purple-600"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {item.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-4">
                  <a
                    href="/login"
                    className="block w-full py-3 text-center font-medium text-gray-700 border border-gray-300 rounded-lg hover:border-purple-600 hover:text-purple-600"
                  >
                    Login
                  </a>
                  <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg shadow-lg">
                    Demo anfordern
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
