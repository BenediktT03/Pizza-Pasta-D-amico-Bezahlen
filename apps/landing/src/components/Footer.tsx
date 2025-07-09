import React from 'react';
import { motion } from 'framer-motion';
import { 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  Mail,
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: {
      title: 'Produkt',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Sprachbestellung', href: '#voice' },
        { label: 'Multi-Tenant', href: '#multitenant' },
        { label: 'Analytics', href: '#analytics' },
        { label: 'Integrationen', href: '#integrations' },
        { label: 'Roadmap', href: '#roadmap' },
      ],
    },
    company: {
      title: 'Unternehmen',
      links: [
        { label: 'Über uns', href: '#about' },
        { label: 'Team', href: '#team' },
        { label: 'Karriere', href: '#careers' },
        { label: 'Blog', href: '#blog' },
        { label: 'Presse', href: '#press' },
        { label: 'Partner', href: '#partners' },
      ],
    },
    resources: {
      title: 'Ressourcen',
      links: [
        { label: 'Dokumentation', href: '#docs' },
        { label: 'API Reference', href: '#api' },
        { label: 'Support Center', href: '#support' },
        { label: 'Status', href: '#status' },
        { label: 'Changelog', href: '#changelog' },
        { label: 'Community', href: '#community' },
      ],
    },
    legal: {
      title: 'Rechtliches',
      links: [
        { label: 'Datenschutz', href: '#privacy' },
        { label: 'AGB', href: '#terms' },
        { label: 'Impressum', href: '#imprint' },
        { label: 'Cookie-Richtlinie', href: '#cookies' },
        { label: 'DSGVO/DSG', href: '#gdpr' },
        { label: 'Lizenzen', href: '#licenses' },
      ],
    },
  };

  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com/eatech', label: 'Facebook' },
    { icon: Twitter, href: 'https://twitter.com/eatech', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com/company/eatech', label: 'LinkedIn' },
    { icon: Instagram, href: 'https://instagram.com/eatech', label: 'Instagram' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <span className="text-2xl font-bold text-white">EATECH</span>
            </div>
            
            <p className="mb-6 text-gray-400">
              Die fortschrittlichste Voice Commerce Plattform für die Schweizer Gastronomie. 
              Multi-tenant, mehrsprachig, und bereit für die Zukunft.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <a 
                href="tel:+41445551234" 
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4" />
                +41 44 555 12 34
              </a>
              <a 
                href="mailto:hello@eatech.ch" 
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4" />
                hello@eatech.ch
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Zürich, Schweiz
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -2 }}
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="py-8 border-t border-gray-800">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Bleiben Sie auf dem Laufenden
              </h3>
              <p className="text-gray-400">
                Erhalten Sie Updates zu neuen Features und Best Practices.
              </p>
            </div>
            <form className="flex gap-4">
              <input
                type="email"
                placeholder="ihre@email.ch"
                className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transition-all"
              >
                Anmelden
              </motion.button>
            </form>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="py-6 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              © {currentYear} EATECH. Alle Rechte vorbehalten.
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <a 
                href="#privacy" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Datenschutz
              </a>
              <a 
                href="#terms" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                AGB
              </a>
              <a 
                href="#cookies" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Cookies
              </a>
              <a 
                href="#sitemap" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                Sitemap
              </a>
            </div>

            {/* Swiss Made Badge */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>🇨🇭</span>
              <span>Proudly made in Switzerland</span>
            </div>
          </div>
        </div>

        {/* Compliance Badges */}
        <div className="py-4 border-t border-gray-800">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>DSGVO/DSG konform</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>PCI DSS Level 1</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>ISO 27001 zertifiziert</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>99.9% Uptime SLA</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
