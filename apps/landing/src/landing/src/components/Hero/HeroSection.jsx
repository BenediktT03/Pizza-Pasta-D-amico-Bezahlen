/**
 * EATECH - Hero Section
 * Version: 5.2.0
 * Description: Landing Page Hero mit animierten Elementen und Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/landing/src/components/Hero/HeroSection.jsx
 * 
 * Features: Interactive animations, video background, call-to-action
 */

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { 
  Play, ChevronRight, Star, Users,
  MapPin, Clock, Smartphone, CheckCircle,
  ArrowDown, Zap, TrendingUp, Award
} from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { useScrollPosition } from '../../hooks/useScrollPosition';
import styles from './HeroSection.module.css';

// Lazy loaded components
const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const AnimatedCounter = lazy(() => import('./components/AnimatedCounter'));
const InteractiveDemo = lazy(() => import('./components/InteractiveDemo'));
const ParticleBackground = lazy(() => import('./components/ParticleBackground'));
const TruckAnimation = lazy(() => import('./components/TruckAnimation'));

// Lazy loaded services
const AnalyticsService = lazy(() => import('../../services/AnalyticsService'));

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

const HERO_STATS = [
  { 
    id: 'foodtrucks', 
    value: 847, 
    label: 'Foodtrucks', 
    icon: Users,
    suffix: '+',
    color: '#10B981'
  },
  { 
    id: 'orders', 
    value: 125847, 
    label: 'Bestellungen', 
    icon: CheckCircle,
    suffix: '+',
    color: '#3B82F6'
  },
  { 
    id: 'cities', 
    value: 47, 
    label: 'Städte', 
    icon: MapPin,
    suffix: '',
    color: '#F59E0B'
  },
  { 
    id: 'satisfaction', 
    value: 4.9, 
    label: 'Zufriedenheit', 
    icon: Star,
    suffix: '/5',
    color: '#EF4444'
  }
];

const FEATURES_PREVIEW = [
  {
    id: 'pwa',
    title: '100% PWA',
    description: 'Keine App Downloads nötig',
    icon: Smartphone,
    color: '#10B981'
  },
  {
    id: 'offline',
    title: 'Offline-First',
    description: 'Funktioniert immer & überall',
    icon: Zap,
    color: '#3B82F6'
  },
  {
    id: 'ai',
    title: 'KI-Powered',
    description: 'Intelligente Automatisierung',
    icon: TrendingUp,
    color: '#8B5CF6'
  },
  {
    id: 'swiss',
    title: 'Swiss Made',
    description: 'DSGVO/DSG konform',
    icon: Award,
    color: '#F59E0B'
  }
];

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Marco Bernasconi',
    business: 'Bernasconi Food Truck',
    location: 'Zürich',
    rating: 5,
    comment: 'EATECH hat unser Business revolutioniert! 300% mehr Bestellungen seit dem Start.',
    avatar: '/api/placeholder/60/60?text=MB'
  },
  {
    id: 2,
    name: 'Sarah Weber',
    business: 'Weber\'s Mobile Kitchen',
    location: 'Basel',
    rating: 5,
    comment: 'Endlich eine Lösung, die wirklich funktioniert. Unsere Kunden lieben die einfache Bestellung.',
    avatar: '/api/placeholder/60/60?text=SW'
  },
  {
    id: 3,
    name: 'Thomas Müller',
    business: 'Müller Gourmet Truck',
    location: 'Bern',
    rating: 5,
    comment: 'Die Offline-Funktion ist genial! Auch ohne Internet können wir Bestellungen annehmen.',
    avatar: '/api/placeholder/60/60?text=TM'
  }
];

const HeroSection = ({ onCTAClick, onDemoClick }) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const heroRef = useRef(null);
  const scrollPosition = useScrollPosition();

  // Intersection Observer for animations
  const { isIntersecting } = useIntersectionObserver(heroRef, {
    threshold: 0.1,
    rootMargin: '0px'
  });

  useEffect(() => {
    if (isIntersecting) {
      setIsVisible(true);
      // Delay particle animation for performance
      setTimeout(() => setShowParticles(true), 500);
    }
  }, [isIntersecting]);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Parallax effect
  const parallaxOffset = scrollPosition * 0.5;

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCTAClick = useCallback(async () => {
    // Track analytics
    try {
      const AnalyticsServiceModule = await import('../../services/AnalyticsService');
      AnalyticsServiceModule.default.track('hero_cta_clicked', {
        section: 'hero',
        button: 'get_started'
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
    
    onCTAClick?.();
  }, [onCTAClick]);

  const handleDemoClick = useCallback(async () => {
    setShowDemo(true);
    
    // Track demo interaction
    try {
      const AnalyticsServiceModule = await import('../../services/AnalyticsService');
      AnalyticsServiceModule.default.track('demo_requested', {
        section: 'hero',
        type: 'interactive_demo'
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
    
    onDemoClick?.();
  }, [onDemoClick]);

  const handleVideoPlay = useCallback(() => {
    setIsVideoPlaying(true);
  }, []);

  const handleScrollToNext = useCallback(() => {
    const nextSection = document.getElementById('features');
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderStats = () => (
    <div className={styles.statsContainer}>
      {HERO_STATS.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div 
            key={stat.id} 
            className={`${styles.statItem} ${isVisible ? styles.animate : ''}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={styles.statIcon} style={{ color: stat.color }}>
              <IconComponent size={24} />
            </div>
            <div className={styles.statContent}>
              <Suspense fallback={<span>{stat.value}</span>}>
                <AnimatedCounter 
                  end={stat.value} 
                  duration={2000}
                  suffix={stat.suffix}
                  className={styles.statValue}
                />
              </Suspense>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderFeaturesPeek = () => (
    <div className={styles.featuresPreview}>
      {FEATURES_PREVIEW.map((feature, index) => {
        const IconComponent = feature.icon;
        return (
          <div 
            key={feature.id} 
            className={`${styles.featureCard} ${isVisible ? styles.slideUp : ''}`}
            style={{ animationDelay: `${0.5 + index * 0.1}s` }}
          >
            <div className={styles.featureIcon} style={{ backgroundColor: feature.color + '20' }}>
              <IconComponent size={20} color={feature.color} />
            </div>
            <div className={styles.featureContent}>
              <h4>{feature.title}</h4>
              <p>{feature.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTestimonial = () => {
    const testimonial = TESTIMONIALS[activeTestimonial];
    
    return (
      <div className={styles.testimonialContainer}>
        <div className={styles.testimonial}>
          <div className={styles.testimonialContent}>
            <div className={styles.testimonialRating}>
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} size={16} className={styles.star} />
              ))}
            </div>
            <blockquote>"{testimonial.comment}"</blockquote>
            <div className={styles.testimonialAuthor}>
              <img src={testimonial.avatar} alt={testimonial.name} />
              <div>
                <strong>{testimonial.name}</strong>
                <span>{testimonial.business}</span>
                <span className={styles.location}>
                  <MapPin size={12} />
                  {testimonial.location}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.testimonialDots}>
          {TESTIMONIALS.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === activeTestimonial ? styles.active : ''}`}
              onClick={() => setActiveTestimonial(index)}
            />
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <section 
      ref={heroRef}
      className={styles.heroSection}
      style={{ transform: `translateY(${parallaxOffset}px)` }}
    >
      {/* Particle Background */}
      {showParticles && (
        <Suspense fallback={null}>
          <ParticleBackground className={styles.particles} />
        </Suspense>
      )}

      {/* Background Video */}
      <div className={styles.videoBackground}>
        <video
          autoPlay
          muted
          loop
          playsInline
          className={styles.backgroundVideo}
        >
          <source src="/videos/foodtruck-hero.mp4" type="video/mp4" />
        </video>
        <div className={styles.videoOverlay} />
      </div>

      <div className={styles.heroContainer}>
        {/* Main Content */}
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={`${styles.badge} ${isVisible ? styles.fadeIn : ''}`}>
              <Zap size={16} />
              <span>Schweizer Marktführer für Foodtruck-Lösungen</span>
            </div>
            
            <h1 className={`${styles.heroTitle} ${isVisible ? styles.slideUp : ''}`}>
              <span className={styles.highlight}>Revolutionäre</span>{' '}
              <span className={styles.gradient}>PWA-Lösung</span>{' '}
              für Foodtrucks
            </h1>
            
            <p className={`${styles.heroDescription} ${isVisible ? styles.slideUp : ''}`}>
              Steigern Sie Ihren Umsatz um bis zu 300% mit unserem intelligenten 
              Bestellsystem. Keine Apps, keine Downloads - nur pure Effizienz für 
              Ihr Foodtruck-Business.
            </p>

            <div className={`${styles.heroActions} ${isVisible ? styles.slideUp : ''}`}>
              <button 
                onClick={handleCTAClick}
                className={styles.primaryCTA}
              >
                <span>Jetzt kostenlos starten</span>
                <ChevronRight size={20} />
              </button>
              
              <button 
                onClick={handleDemoClick}
                className={styles.secondaryCTA}
              >
                <Play size={18} />
                <span>Live Demo ansehen</span>
              </button>
            </div>

            <div className={styles.trustSignals}>
              <div className={styles.trustBadge}>
                <CheckCircle size={16} />
                <span>30 Tage kostenlos testen</span>
              </div>
              <div className={styles.trustBadge}>
                <CheckCircle size={16} />
                <span>Keine Einrichtungskosten</span>
              </div>
              <div className={styles.trustBadge}>
                <CheckCircle size={16} />
                <span>Schweizer Support</span>
              </div>
            </div>
          </div>

          {/* Interactive Elements */}
          <div className={styles.heroVisual}>
            <div className={`${styles.demoContainer} ${isVisible ? styles.slideLeft : ''}`}>
              <Suspense fallback={<LoadingSpinner />}>
                <TruckAnimation 
                  isPlaying={isVisible}
                  onAnimationComplete={() => console.log('Animation complete')}
                />
              </Suspense>
              
              <div className={styles.phonePreview}>
                <div className={styles.phoneFrame}>
                  <div className={styles.phoneScreen}>
                    <img 
                      src="/images/app-preview.png" 
                      alt="EATECH App Preview"
                      className={styles.appScreenshot}
                    />
                  </div>
                </div>
                
                <div className={styles.floatingElements}>
                  <div className={styles.floatingCard} style={{ animationDelay: '0.5s' }}>
                    <Clock size={16} />
                    <span>3 Min. Wartezeit</span>
                  </div>
                  <div className={styles.floatingCard} style={{ animationDelay: '1s' }}>
                    <Users size={16} />
                    <span>15 Bestellungen</span>
                  </div>
                  <div className={styles.floatingCard} style={{ animationDelay: '1.5s' }}>
                    <Star size={16} />
                    <span>4.9★ Bewertung</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        {renderStats()}

        {/* Features Preview */}
        {renderFeaturesPeek()}

        {/* Testimonial */}
        {renderTestimonial()}

        {/* Scroll Indicator */}
        <div className={styles.scrollIndicator}>
          <button onClick={handleScrollToNext} className={styles.scrollButton}>
            <ArrowDown size={24} />
            <span>Mehr erfahren</span>
          </button>
        </div>
      </div>

      {/* Lazy Loaded Modals */}
      {showDemo && (
        <Suspense fallback={<LoadingSpinner />}>
          <InteractiveDemo
            onClose={() => setShowDemo(false)}
            onContactRequest={() => {
              setShowDemo(false);
              handleCTAClick();
            }}
          />
        </Suspense>
      )}

      {isVideoPlaying && (
        <Suspense fallback={<LoadingSpinner />}>
          <VideoPlayer
            src="/videos/eatech-demo.mp4"
            title="EATECH Demo Video"
            onClose={() => setIsVideoPlaying(false)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default HeroSection;