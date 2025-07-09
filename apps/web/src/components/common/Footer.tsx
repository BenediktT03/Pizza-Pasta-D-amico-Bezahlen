/**
 * EATECH Footer Component
 * 
 * Footer mit allen wichtigen Links und Informationen.
 * Features:
 * - Responsive Grid Layout
 * - Multi-Language Support
 * - Social Media Links
 * - Newsletter Signup
 * - Compliance Links (DSG/DSGVO)
 * - Truck-spezifische Infos
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAltIcon,
  HeartIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  BuildingOfficeIcon,
  TruckIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

// Core imports
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { Truck } from '@eatech/types';

// UI imports
import {
  Container,
  Logo,
  Input,
  Button,
  IconButton,
  Alert,
  Badge
} from '@eatech/ui';

// Services
import { newsletterService } from '../../services/newsletter.service';
import { analyticsService } from '../../services/analytics.service';

// Styles
import styles from './Footer.module.css';

interface FooterProps {
  truck?: Truck | null;
}

export const Footer: React.FC<FooterProps> = ({ truck }) => {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  
  // Feature Flags
  const { enabled: newsletterEnabled } = useFeatureFlag('newsletter');
  const { enabled: socialLinksEnabled } = useFeatureFlag('social_links');
  const { enabled: multiLocationEnabled } = useFeatureFlag('multi_location');
  const { enabled: legalComplianceEnabled } = useFeatureFlag('legal_compliance');
  
  // State
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  
  // Handle newsletter subscription
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setIsSubscribing(true);
    setSubscribeMessage(null);
    
    try {
      await newsletterService.subscribe({
        email,
        language: i18n.language,
        source: 'footer',
        truckId: truck?.id
      });
      
      setSubscribeMessage({
        type: 'success',
        text: t('footer.newsletterSuccess')
      });
      setEmail('');
      
      analyticsService.trackEvent('newsletter_subscribed', {
        source: 'footer',
        language: i18n.language
      });
    } catch (error) {
      setSubscribeMessage({
        type: 'error',
        text: t('footer.newsletterError')
      });
    } finally {
      setIsSubscribing(false);
    }
  };
  
  // Social media links
  const socialLinks = [
    {
      name: 'Facebook',
      url: 'https://facebook.com/eatech',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/eatech',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
        </svg>
      )
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/eatech',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      )
    },
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com/company/eatech',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )
    }
  ];
  
  // Footer sections
  const footerSections = [
    {
      title: t('footer.product'),
      links: [
        { label: t('footer.features'), path: '/features' },
        { label: t('footer.pricing'), path: '/pricing' },
        { label: t('footer.forFoodTrucks'), path: '/for-food-trucks' },
        { label: t('footer.forManagers'), path: '/for-managers' }
      ]
    },
    {
      title: t('footer.company'),
      links: [
        { label: t('footer.about'), path: '/about' },
        { label: t('footer.blog'), path: '/blog' },
        { label: t('footer.careers'), path: '/careers' },
        { label: t('footer.press'), path: '/press' }
      ]
    },
    {
      title: t('footer.support'),
      links: [
        { label: t('footer.help'), path: '/help' },
        { label: t('footer.contact'), path: '/contact' },
        { label: t('footer.faq'), path: '/faq' },
        { label: t('footer.status'), path: 'https://status.eatech.ch', external: true }
      ]
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.privacy'), path: '/privacy' },
        { label: t('footer.terms'), path: '/terms' },
        { label: t('footer.cookies'), path: '/cookies' },
        { label: t('footer.compliance'), path: '/compliance' }
      ]
    }
  ];
  
  return (
    <footer className={styles.footer}>
      {/* Main Footer */}
      <div className={styles.mainFooter}>
        <Container>
          <div className={styles.footerGrid}>
            {/* Company Info */}
            <div className={styles.companyInfo}>
              <div className={styles.logoSection}>
                <Logo className={styles.footerLogo} />
                <p className={styles.tagline}>
                  {t('footer.tagline')}
                </p>
              </div>
              
              {/* Newsletter */}
              {newsletterEnabled && (
                <div className={styles.newsletter}>
                  <h3>{t('footer.newsletterTitle')}</h3>
                  <p>{t('footer.newsletterDescription')}</p>
                  
                  <form onSubmit={handleNewsletterSubmit} className={styles.newsletterForm}>
                    <Input
                      type="email"
                      placeholder={t('footer.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubscribing}
                      icon={<EnvelopeIcon className="w-5 h-5" />}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSubscribing}
                      disabled={!email || isSubscribing}
                    >
                      {t('footer.subscribe')}
                    </Button>
                  </form>
                  
                  {subscribeMessage && (
                    <Alert
                      variant={subscribeMessage.type}
                      size="sm"
                      className={styles.subscribeMessage}
                    >
                      {subscribeMessage.text}
                    </Alert>
                  )}
                </div>
              )}
              
              {/* Social Links */}
              {socialLinksEnabled && (
                <div className={styles.socialLinks}>
                  <h4>{t('footer.followUs')}</h4>
                  <div className={styles.socialIcons}>
                    {socialLinks.map((social) => (
                      <a
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.name}
                        className={styles.socialIcon}
                      >
                        {social.icon}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer Links */}
            {footerSections.map((section) => (
              <div key={section.title} className={styles.footerSection}>
                <h3>{section.title}</h3>
                <ul>
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.footerLink}
                        >
                          {link.label}
                          <GlobeAltIcon className="w-3 h-3 inline ml-1" />
                        </a>
                      ) : (
                        <Link to={link.path} className={styles.footerLink}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          {/* Contact Info */}
          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <BuildingOfficeIcon className="w-5 h-5" />
              <div>
                <p className={styles.contactLabel}>{t('footer.headquarters')}</p>
                <p>EATECH AG</p>
                <p>Bahnhofstrasse 10</p>
                <p>8001 Zürich, Switzerland</p>
              </div>
            </div>
            
            <div className={styles.contactItem}>
              <EnvelopeIcon className="w-5 h-5" />
              <div>
                <p className={styles.contactLabel}>{t('footer.email')}</p>
                <a href="mailto:hello@eatech.ch">hello@eatech.ch</a>
                <a href="mailto:support@eatech.ch">support@eatech.ch</a>
              </div>
            </div>
            
            <div className={styles.contactItem}>
              <PhoneIcon className="w-5 h-5" />
              <div>
                <p className={styles.contactLabel}>{t('footer.phone')}</p>
                <a href="tel:+41442001234">+41 44 200 12 34</a>
                <p className={styles.contactHours}>{t('footer.businessHours')}</p>
              </div>
            </div>
          </div>
        </Container>
      </div>
      
      {/* Truck-specific Footer */}
      {truck && (
        <div className={styles.truckFooter}>
          <Container>
            <div className={styles.truckFooterContent}>
              <div className={styles.truckInfo}>
                <TruckIcon className="w-5 h-5" />
                <span>{truck.name}</span>
                {truck.verified && (
                  <Badge variant="success" size="sm">
                    <ShieldCheckIcon className="w-3 h-3" />
                    {t('footer.verified')}
                  </Badge>
                )}
              </div>
              
              {multiLocationEnabled && truck.locations && (
                <div className={styles.truckLocations}>
                  <MapPinIcon className="w-4 h-4" />
                  <span>
                    {truck.locations.length} {t('footer.locations')}
                  </span>
                </div>
              )}
              
              <div className={styles.truckContact}>
                {truck.phone && (
                  <a href={`tel:${truck.phone}`} className={styles.truckPhone}>
                    <PhoneIcon className="w-4 h-4" />
                    <span>{truck.phone}</span>
                  </a>
                )}
                {truck.email && (
                  <a href={`mailto:${truck.email}`} className={styles.truckEmail}>
                    <EnvelopeIcon className="w-4 h-4" />
                    <span>{truck.email}</span>
                  </a>
                )}
              </div>
            </div>
          </Container>
        </div>
      )}
      
      {/* Bottom Footer */}
      <div className={styles.bottomFooter}>
        <Container>
          <div className={styles.bottomContent}>
            <div className={styles.copyright}>
              <p>
                © {currentYear} EATECH AG. {t('footer.allRightsReserved')}
              </p>
              <p className={styles.madeWith}>
                {t('footer.madeWith')} <HeartIcon className="w-4 h-4 inline text-red-500" /> {t('footer.inSwitzerland')} 🇨🇭
              </p>
            </div>
            
            <div className={styles.badges}>
              {/* Payment Methods */}
              <div className={styles.paymentMethods}>
                <CreditCardIcon className="w-5 h-5" />
                <DevicePhoneMobileIcon className="w-5 h-5" />
                <img src="/images/twint-logo.svg" alt="TWINT" className="h-5" />
                <Badge variant="secondary" size="sm">
                  {t('footer.securePayments')}
                </Badge>
              </div>
              
              {/* Compliance Badges */}
              {legalComplianceEnabled && (
                <div className={styles.complianceBadges}>
                  <Badge variant="secondary" size="sm">
                    DSG/DSGVO
                  </Badge>
                  <Badge variant="secondary" size="sm">
                    PCI DSS
                  </Badge>
                  <Badge variant="secondary" size="sm">
                    ISO 27001
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
};

// Export
export default Footer;