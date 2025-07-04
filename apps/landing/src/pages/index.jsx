/**
 * EATECH - Landing Page
 * Version: 13.0.0
 * Description: Moderne Verkaufs-Website für EATECH Foodtruck System
 * Author: EATECH Development Team
 * Created: 2025-01-04
 * File Path: /apps/landing/src/pages/index.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
    ChevronRight, 
    Check, 
    Star, 
    Zap, 
    Shield, 
    Brain, 
    TrendingUp,
    CreditCard,
    Users,
    Globe,
    Clock,
    ArrowRight,
    Play,
    Menu,
    X,
    Phone,
    Mail,
    MapPin,
    Sparkles,
    BarChart3,
    ShoppingCart,
    Truck,
    ChefHat,
    Smartphone,
    Wifi,
    Lock,
    Heart,
    Award,
    Building2,
    MessageCircle,
    Calendar,
    DollarSign,
    Euro,
    Percent,
    CheckCircle2,
    ArrowUpRight,
    Lightbulb,
    Rocket
} from 'lucide-react';
import './LandingPage.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const FEATURES = [
    {
        icon: Zap,
        title: 'Blitzschnelle Bestellungen',
        description: 'Reduziere Wartezeiten um 70% mit unserem optimierten Bestellsystem',
        color: '#FF6B6B'
    },
    {
        icon: Brain,
        title: 'KI-gestützte Empfehlungen',
        description: 'Steigere deinen Umsatz um 35% mit intelligenten Menü-Vorschlägen',
        color: '#4ECDC4'
    },
    {
        icon: Globe,
        title: 'Multi-Tenant System',
        description: 'Verwalte beliebig viele Standorte von einem Dashboard aus',
        color: '#FFE66D'
    },
    {
        icon: Shield,
        title: 'Schweizer Sicherheit',
        description: 'DSGVO-konform mit Hosting in der Schweiz',
        color: '#A8E6CF'
    },
    {
        icon: CreditCard,
        title: 'Alle Zahlungsmethoden',
        description: 'TWINT, Kreditkarten, Apple Pay - alles integriert',
        color: '#C7B8FF'
    },
    {
        icon: TrendingUp,
        title: 'Echtzeit-Analytics',
        description: 'Behalte deine Zahlen immer im Blick',
        color: '#FFB8B8'
    }
];

const PRICING_PLANS = [
    {
        name: 'Starter',
        price: 149,
        description: 'Perfekt für einzelne Foodtrucks',
        features: [
            'Bis zu 500 Bestellungen/Monat',
            'Basis-Bestellsystem',
            'TWINT & Kreditkarten',
            'Mobile App für Kunden',
            'E-Mail Support'
        ],
        highlighted: false
    },
    {
        name: 'Professional',
        price: 299,
        description: 'Für wachsende Unternehmen',
        features: [
            'Bis zu 2000 Bestellungen/Monat',
            'KI-Empfehlungen',
            'Alle Zahlungsmethoden',
            'Erweiterte Analytics',
            'Inventory Management',
            'Priority Support',
            'Multi-Location (bis 3)'
        ],
        highlighted: true,
        badge: 'BELIEBT'
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        description: 'Für Ketten und Franchises',
        features: [
            'Unbegrenzte Bestellungen',
            'Alle Pro Features',
            'White-Label Option',
            'API Zugang',
            'Dedizierter Account Manager',
            'Custom Integrationen',
            'Unbegrenzte Locations'
        ],
        highlighted: false
    }
];

const TESTIMONIALS = [
    {
        name: 'Marco Steiner',
        company: 'Burger Truck Zürich',
        image: '/testimonials/marco.jpg',
        text: 'Seit wir EATECH nutzen, haben sich unsere Wartezeiten halbiert und der Umsatz ist um 40% gestiegen!',
        rating: 5
    },
    {
        name: 'Sarah Müller',
        company: 'Veggie Delights',
        image: '/testimonials/sarah.jpg',
        text: 'Die KI-Empfehlungen sind genial! Unsere Kunden bestellen viel mehr Beilagen und Getränke.',
        rating: 5
    },
    {
        name: 'Tom Weber',
        company: 'Pizza Express Mobile',
        image: '/testimonials/tom.jpg',
        text: 'Endlich ein System, das wirklich für Foodtrucks gemacht ist. Die Integration war super einfach!',
        rating: 5
    }
];

const STATS = [
    { value: '500+', label: 'Aktive Foodtrucks' },
    { value: '2M+', label: 'Bestellungen verarbeitet' },
    { value: '98%', label: 'Kundenzufriedenheit' },
    { value: '35%', label: 'Durchschn. Umsatzsteigerung' }
];

// ============================================================================
// COMPONENTS
// ============================================================================

const Navigation = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`navigation ${isScrolled ? 'scrolled' : ''}`}>
            <div className="nav-container">
                <div className="nav-logo">
                    <Sparkles className="logo-icon" />
                    <span>EATECH</span>
                </div>
                
                <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                    <a href="#features">Features</a>
                    <a href="#pricing">Preise</a>
                    <a href="#testimonials">Referenzen</a>
                    <a href="#contact">Kontakt</a>
                    <button className="nav-cta">Demo buchen</button>
                </div>
                
                <button 
                    className="mobile-menu-toggle"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>
        </nav>
    );
};

const HeroSection = () => {
    const videoRef = useRef(null);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    return (
        <section className="hero-section">
            <div className="hero-background">
                <div className="hero-gradient" />
                <div className="hero-pattern" />
            </div>
            
            <div className="hero-content">
                <div className="hero-badge">
                    <Rocket size={16} />
                    <span>Neu: KI-Integration verfügbar!</span>
                </div>
                
                <h1 className="hero-title">
                    Die Zukunft der
                    <span className="hero-highlight"> Foodtruck-Verwaltung</span>
                    <br />beginnt hier
                </h1>
                
                <p className="hero-subtitle">
                    Revolutioniere dein Foodtruck-Business mit dem fortschrittlichsten 
                    Bestell- und Verwaltungssystem der Schweiz. Von Foodtruck-Betreibern 
                    für Foodtruck-Betreiber entwickelt.
                </p>
                
                <div className="hero-stats">
                    {STATS.map((stat, index) => (
                        <div key={index} className="stat-item">
                            <h3>{stat.value}</h3>
                            <p>{stat.label}</p>
                        </div>
                    ))}
                </div>
                
                <div className="hero-actions">
                    <button className="btn-primary btn-large">
                        <Calendar />
                        Kostenlose Demo buchen
                        <ArrowRight />
                    </button>
                    <button 
                        className="btn-secondary btn-large"
                        onClick={() => setIsVideoModalOpen(true)}
                    >
                        <Play />
                        Video ansehen
                    </button>
                </div>
                
                <div className="hero-trust">
                    <p>Vertraut von führenden Foodtruck-Betreibern in der Schweiz</p>
                    <div className="trust-logos">
                        {/* Placeholder für Kundenlogos */}
                        <div className="trust-logo">🍔</div>
                        <div className="trust-logo">🍕</div>
                        <div className="trust-logo">🌮</div>
                        <div className="trust-logo">🥗</div>
                        <div className="trust-logo">🍜</div>
                    </div>
                </div>
            </div>
            
            {isVideoModalOpen && (
                <div className="video-modal" onClick={() => setIsVideoModalOpen(false)}>
                    <div className="video-container" onClick={(e) => e.stopPropagation()}>
                        <button 
                            className="video-close"
                            onClick={() => setIsVideoModalOpen(false)}
                        >
                            <X />
                        </button>
                        <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                            title="EATECH Demo Video"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </section>
    );
};

const ProblemSolution = () => {
    const problems = [
        {
            icon: Clock,
            title: 'Lange Wartezeiten',
            description: 'Kunden warten durchschnittlich 15-20 Minuten'
        },
        {
            icon: X,
            title: 'Bestellfehler',
            description: 'Missverständnisse führen zu falschen Bestellungen'
        },
        {
            icon: BarChart3,
            title: 'Keine Übersicht',
            description: 'Umsätze und Bestände im Blindflug managen'
        },
        {
            icon: CreditCard,
            title: 'Zahlungschaos',
            description: 'Bargeld zählen, Wechselgeld, verpasste Umsätze'
        }
    ];

    return (
        <section className="problem-solution">
            <div className="container">
                <div className="section-header">
                    <h2>Kennst du diese Probleme?</h2>
                    <p>Die täglichen Herausforderungen im Foodtruck-Business</p>
                </div>
                
                <div className="problems-grid">
                    {problems.map((problem, index) => (
                        <div key={index} className="problem-card">
                            <div className="problem-icon">
                                <problem.icon size={24} />
                            </div>
                            <h3>{problem.title}</h3>
                            <p>{problem.description}</p>
                        </div>
                    ))}
                </div>
                
                <div className="solution-transition">
                    <div className="arrow-down">
                        <ChevronRight size={48} className="rotate-90" />
                    </div>
                </div>
                
                <div className="solution-section">
                    <h2>Die Lösung: EATECH</h2>
                    <p>Ein System, das alle deine Probleme löst</p>
                    
                    <div className="solution-showcase">
                        <div className="showcase-image">
                            <img 
                                src="/images/dashboard-mockup.png" 
                                alt="EATECH Dashboard"
                            />
                        </div>
                        <div className="showcase-features">
                            <div className="feature-item">
                                <CheckCircle2 className="check-icon" />
                                <div>
                                    <h4>Bestellungen in 30 Sekunden</h4>
                                    <p>Intuitive Oberfläche für blitzschnelle Bestellaufnahme</p>
                                </div>
                            </div>
                            <div className="feature-item">
                                <CheckCircle2 className="check-icon" />
                                <div>
                                    <h4>Fehlerfreie Übertragung</h4>
                                    <p>Direkt vom Kunden zur Küche - keine Missverständnisse</p>
                                </div>
                            </div>
                            <div className="feature-item">
                                <CheckCircle2 className="check-icon" />
                                <div>
                                    <h4>Echtzeit-Dashboard</h4>
                                    <p>Alle wichtigen Kennzahlen auf einen Blick</p>
                                </div>
                            </div>
                            <div className="feature-item">
                                <CheckCircle2 className="check-icon" />
                                <div>
                                    <h4>Kontaktlose Zahlung</h4>
                                    <p>Alle gängigen Zahlungsmethoden integriert</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FeaturesSection = () => {
    const [activeFeature, setActiveFeature] = useState(0);

    return (
        <section id="features" className="features-section">
            <div className="container">
                <div className="section-header">
                    <h2>Funktionen, die begeistern</h2>
                    <p>Alles was du brauchst, um dein Foodtruck-Business zu revolutionieren</p>
                </div>
                
                <div className="features-grid">
                    {FEATURES.map((feature, index) => (
                        <div 
                            key={index} 
                            className="feature-card"
                            onMouseEnter={() => setActiveFeature(index)}
                            style={{
                                '--feature-color': feature.color
                            }}
                        >
                            <div className="feature-icon">
                                <feature.icon size={32} />
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                            <div className="feature-hover-effect" />
                        </div>
                    ))}
                </div>
                
                <div className="feature-details">
                    <div className="detail-tabs">
                        <button className="detail-tab active">
                            <ShoppingCart />
                            Bestellsystem
                        </button>
                        <button className="detail-tab">
                            <ChefHat />
                            Küchen-Display
                        </button>
                        <button className="detail-tab">
                            <BarChart3 />
                            Analytics
                        </button>
                        <button className="detail-tab">
                            <Smartphone />
                            Mobile Apps
                        </button>
                    </div>
                    
                    <div className="detail-content">
                        <div className="detail-image">
                            <img src="/images/feature-ordering.png" alt="Bestellsystem" />
                        </div>
                        <div className="detail-info">
                            <h3>Intelligentes Bestellsystem</h3>
                            <p>
                                Unser KI-gestütztes Bestellsystem lernt von jedem Kunden und 
                                schlägt automatisch passende Ergänzungen vor. Die durchschnittliche 
                                Bestellgröße steigt um 35%!
                            </p>
                            <ul className="detail-list">
                                <li>
                                    <Check size={20} />
                                    <span>Personalisierte Empfehlungen</span>
                                </li>
                                <li>
                                    <Check size={20} />
                                    <span>Mehrsprachige Unterstützung</span>
                                </li>
                                <li>
                                    <Check size={20} />
                                    <span>Allergene & Nährwerte anzeigen</span>
                                </li>
                                <li>
                                    <Check size={20} />
                                    <span>Dynamische Preisanpassung</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const PricingSection = () => {
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [selectedAddons, setSelectedAddons] = useState([]);

    const addons = [
        { id: 'sms', name: 'SMS Benachrichtigungen', price: 29 },
        { id: 'delivery', name: 'Lieferungs-Modul', price: 49 },
        { id: 'loyalty', name: 'Treueprogramm', price: 39 },
        { id: 'marketing', name: 'Marketing Automation', price: 59 }
    ];

    const toggleAddon = (addonId) => {
        setSelectedAddons(prev => 
            prev.includes(addonId) 
                ? prev.filter(id => id !== addonId)
                : [...prev, addonId]
        );
    };

    const calculateTotal = (basePrice) => {
        if (typeof basePrice !== 'number') return basePrice;
        
        const addonTotal = selectedAddons.reduce((sum, addonId) => {
            const addon = addons.find(a => a.id === addonId);
            return sum + (addon ? addon.price : 0);
        }, 0);
        
        const monthlyTotal = basePrice + addonTotal;
        const yearlyTotal = monthlyTotal * 12 * 0.8; // 20% Rabatt
        
        return billingCycle === 'monthly' ? monthlyTotal : Math.round(yearlyTotal / 12);
    };

    return (
        <section id="pricing" className="pricing-section">
            <div className="container">
                <div className="section-header">
                    <h2>Transparente Preise</h2>
                    <p>Keine versteckten Kosten - nur faire Preise für großartige Leistung</p>
                </div>
                
                <div className="billing-toggle">
                    <button 
                        className={billingCycle === 'monthly' ? 'active' : ''}
                        onClick={() => setBillingCycle('monthly')}
                    >
                        Monatlich
                    </button>
                    <button 
                        className={billingCycle === 'yearly' ? 'active' : ''}
                        onClick={() => setBillingCycle('yearly')}
                    >
                        Jährlich
                        <span className="badge">-20%</span>
                    </button>
                </div>
                
                <div className="pricing-grid">
                    {PRICING_PLANS.map((plan, index) => (
                        <div 
                            key={index} 
                            className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}
                        >
                            {plan.badge && (
                                <div className="plan-badge">{plan.badge}</div>
                            )}
                            
                            <div className="plan-header">
                                <h3>{plan.name}</h3>
                                <p>{plan.description}</p>
                                <div className="plan-price">
                                    {typeof plan.price === 'number' ? (
                                        <>
                                            <span className="currency">CHF</span>
                                            <span className="amount">{calculateTotal(plan.price)}</span>
                                            <span className="period">
                                                /{billingCycle === 'monthly' ? 'Monat' : 'Monat'}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="custom-price">Individuell</span>
                                    )}
                                </div>
                            </div>
                            
                            <ul className="plan-features">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx}>
                                        <Check size={20} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            
                            <button className={`plan-cta ${plan.highlighted ? 'btn-primary' : 'btn-secondary'}`}>
                                {plan.name === 'Enterprise' ? 'Kontakt aufnehmen' : 'Jetzt starten'}
                            </button>
                        </div>
                    ))}
                </div>
                
                <div className="addons-section">
                    <h3>Zusatzmodule</h3>
                    <p>Erweitere EATECH mit zusätzlichen Funktionen</p>
                    
                    <div className="addons-grid">
                        {addons.map(addon => (
                            <div 
                                key={addon.id}
                                className={`addon-card ${selectedAddons.includes(addon.id) ? 'selected' : ''}`}
                                onClick={() => toggleAddon(addon.id)}
                            >
                                <div className="addon-checkbox">
                                    {selectedAddons.includes(addon.id) && <Check size={16} />}
                                </div>
                                <div className="addon-info">
                                    <h4>{addon.name}</h4>
                                    <p>+CHF {addon.price}/Monat</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

const TestimonialsSection = () => {
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    return (
        <section id="testimonials" className="testimonials-section">
            <div className="container">
                <div className="section-header">
                    <h2>Was unsere Kunden sagen</h2>
                    <p>Über 500 zufriedene Foodtruck-Betreiber vertrauen auf EATECH</p>
                </div>
                
                <div className="testimonials-carousel">
                    <div className="testimonial-main">
                        <div className="testimonial-content">
                            <div className="quote-icon">"</div>
                            <p>{TESTIMONIALS[activeTestimonial].text}</p>
                            <div className="testimonial-rating">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} className="star-filled" />
                                ))}
                            </div>
                        </div>
                        
                        <div className="testimonial-author">
                            <div className="author-image">
                                <div className="placeholder-avatar">
                                    {TESTIMONIALS[activeTestimonial].name[0]}
                                </div>
                            </div>
                            <div className="author-info">
                                <h4>{TESTIMONIALS[activeTestimonial].name}</h4>
                                <p>{TESTIMONIALS[activeTestimonial].company}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="testimonials-nav">
                        {TESTIMONIALS.map((_, index) => (
                            <button
                                key={index}
                                className={`nav-dot ${index === activeTestimonial ? 'active' : ''}`}
                                onClick={() => setActiveTestimonial(index)}
                            />
                        ))}
                    </div>
                </div>
                
                <div className="success-metrics">
                    <div className="metric-card">
                        <TrendingUp size={32} />
                        <h3>+35%</h3>
                        <p>Durchschn. Umsatzsteigerung</p>
                    </div>
                    <div className="metric-card">
                        <Clock size={32} />
                        <h3>-70%</h3>
                        <p>Reduzierte Wartezeiten</p>
                    </div>
                    <div className="metric-card">
                        <Heart size={32} />
                        <h3>98%</h3>
                        <p>Kundenzufriedenheit</p>
                    </div>
                    <div className="metric-card">
                        <Award size={32} />
                        <h3>5/5</h3>
                        <p>Durchschn. Bewertung</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

const CTASection = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: ''
    });

    const handleSubmit = () => {
        // Handle form submission
        console.log('Form submitted:', formData);
        alert('Vielen Dank für deine Anfrage! Wir melden uns innerhalb von 24 Stunden bei dir.');
        setFormData({
            name: '',
            email: '',
            phone: '',
            company: '',
            message: ''
        });
    };

    return (
        <section id="contact" className="cta-section">
            <div className="container">
                <div className="cta-content">
                    <div className="cta-info">
                        <h2>Bereit durchzustarten?</h2>
                        <p>
                            Vereinbare jetzt deine persönliche Demo und überzeuge dich selbst 
                            von der Power von EATECH. Unsere Experten zeigen dir, wie du dein 
                            Foodtruck-Business auf das nächste Level bringst.
                        </p>
                        
                        <div className="cta-benefits">
                            <div className="benefit">
                                <CheckCircle2 size={24} />
                                <span>30 Tage kostenlos testen</span>
                            </div>
                            <div className="benefit">
                                <CheckCircle2 size={24} />
                                <span>Keine Kreditkarte erforderlich</span>
                            </div>
                            <div className="benefit">
                                <CheckCircle2 size={24} />
                                <span>Kostenlose Einrichtung</span>
                            </div>
                            <div className="benefit">
                                <CheckCircle2 size={24} />
                                <span>Persönliche Betreuung</span>
                            </div>
                        </div>
                        
                        <div className="contact-info">
                            <div className="contact-item">
                                <Phone size={20} />
                                <span>+41 44 123 45 67</span>
                            </div>
                            <div className="contact-item">
                                <Mail size={20} />
                                <span>info@eatech.ch</span>
                            </div>
                            <div className="contact-item">
                                <MapPin size={20} />
                                <span>Zürich, Schweiz</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="cta-form-container">
                        <div className="cta-form">
                            <h3>Demo vereinbaren</h3>
                            
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder="Dein Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <input
                                    type="email"
                                    placeholder="E-Mail Adresse"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <input
                                    type="tel"
                                    placeholder="Telefonnummer"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                            
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder="Foodtruck/Firma"
                                    value={formData.company}
                                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                                />
                            </div>
                            
                            <div className="form-group">
                                <textarea
                                    placeholder="Erzähl uns von deinem Foodtruck..."
                                    rows="3"
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                />
                            </div>
                            
                            <button onClick={handleSubmit} className="btn-primary btn-large btn-full">
                                <Calendar />
                                Demo vereinbaren
                                <ArrowRight />
                            </button>
                            
                            <p className="form-note">
                                Wir melden uns innerhalb von 24 Stunden bei dir!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-section">
                        <div className="footer-logo">
                            <Sparkles size={32} />
                            <span>EATECH</span>
                        </div>
                        <p>
                            Die führende Foodtruck-Management-Plattform der Schweiz. 
                            Von Foodtruck-Betreibern für Foodtruck-Betreiber entwickelt.
                        </p>
                        <div className="social-links">
                            {/* Social Media Icons */}
                        </div>
                    </div>
                    
                    <div className="footer-section">
                        <h4>Produkt</h4>
                        <ul>
                            <li><a href="#features">Features</a></li>
                            <li><a href="#pricing">Preise</a></li>
                            <li><a href="#">API Docs</a></li>
                            <li><a href="#">Updates</a></li>
                        </ul>
                    </div>
                    
                    <div className="footer-section">
                        <h4>Unternehmen</h4>
                        <ul>
                            <li><a href="#">Über uns</a></li>
                            <li><a href="#">Karriere</a></li>
                            <li><a href="#">Partner</a></li>
                            <li><a href="#">Presse</a></li>
                        </ul>
                    </div>
                    
                    <div className="footer-section">
                        <h4>Support</h4>
                        <ul>
                            <li><a href="#">Hilfe Center</a></li>
                            <li><a href="#">Kontakt</a></li>
                            <li><a href="#">Status</a></li>
                            <li><a href="#">Schulungen</a></li>
                        </ul>
                    </div>
                    
                    <div className="footer-section">
                        <h4>Rechtliches</h4>
                        <ul>
                            <li><a href="#">Datenschutz</a></li>
                            <li><a href="#">AGB</a></li>
                            <li><a href="#">Impressum</a></li>
                            <li><a href="#">Cookies</a></li>
                        </ul>
                    </div>
                </div>
                
                <div className="footer-bottom">
                    <p>&copy; 2025 EATECH AG. Alle Rechte vorbehalten.</p>
                    <p>Mit ❤️ in Zürich entwickelt</p>
                </div>
            </div>
        </footer>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const LandingPage = () => {
    useEffect(() => {
        // Smooth scroll behavior
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }, []);

    return (
        <div className="landing-page">
            <Navigation />
            <HeroSection />
            <ProblemSolution />
            <FeaturesSection />
            <PricingSection />
            <TestimonialsSection />
            <CTASection />
            <Footer />
        </div>
    );
};

export default LandingPage;