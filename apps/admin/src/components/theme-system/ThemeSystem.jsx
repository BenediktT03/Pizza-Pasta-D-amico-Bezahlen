/**
 * EATECH - Theme System V5.0
 * Complete theme management for Admin and Customer areas
 * File Path: /apps/admin/src/components/theme-system/ThemeSystem.jsx
 */

import React, { useState, useEffect, useContext, createContext } from 'react';
import { Palette, Moon, Sun, Monitor, Check, Settings2 } from 'lucide-react';
import styles from './ThemeSystem.module.css';

// ============================================================================
// THEME DEFINITIONS
// ============================================================================
const THEMES = {
  'noir-excellence': {
    id: 'noir-excellence',
    name: 'Noir Excellence',
    description: 'Elegantes dunkles Theme mit goldenen Akzenten',
    preview: {
      primary: '#FFD700',
      secondary: '#B8860B',
      background: '#0A0A0A',
      surface: '#141414',
      accent: '#FFA500'
    },
    variables: {
      // Primary Colors
      '--primary': '#FFD700',
      '--primary-light': '#FFED4E',
      '--primary-dark': '#B8860B',
      '--secondary': '#B8860B',
      '--accent': '#FFA500',
      
      // Backgrounds
      '--bg-primary': '#0A0A0A',
      '--bg-secondary': '#141414',
      '--bg-tertiary': '#1A1A1A',
      '--bg-elevated': '#1F1F1F',
      
      // Text Colors
      '--text-primary': '#FFFFFF',
      '--text-secondary': '#B3B3B3',
      '--text-tertiary': '#808080',
      '--text-inverse': '#0A0A0A',
      
      // UI Elements
      '--border-color': 'rgba(255, 215, 0, 0.2)',
      '--shadow-color': 'rgba(255, 215, 0, 0.1)',
      '--overlay': 'rgba(10, 10, 10, 0.85)',
      
      // Status Colors
      '--success': '#4ADE80',
      '--warning': '#FFA500',
      '--error': '#EF4444',
      '--info': '#3B82F6',
      
      // Special Effects
      '--glow': '0 0 30px rgba(255, 215, 0, 0.3)',
      '--gradient': 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)'
    }
  },
  
  'alpine-white': {
    id: 'alpine-white',
    name: 'Alpine White',
    description: 'Klares, minimalistisches Schweizer Design',
    preview: {
      primary: '#DC2626',
      secondary: '#0EA5E9',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      accent: '#DC2626'
    },
    variables: {
      '--primary': '#DC2626',
      '--primary-light': '#EF4444',
      '--primary-dark': '#B91C1C',
      '--secondary': '#0EA5E9',
      '--accent': '#DC2626',
      
      '--bg-primary': '#FFFFFF',
      '--bg-secondary': '#F8FAFC',
      '--bg-tertiary': '#F1F5F9',
      '--bg-elevated': '#FFFFFF',
      
      '--text-primary': '#0F172A',
      '--text-secondary': '#475569',
      '--text-tertiary': '#64748B',
      '--text-inverse': '#FFFFFF',
      
      '--border-color': '#E2E8F0',
      '--shadow-color': 'rgba(0, 0, 0, 0.05)',
      '--overlay': 'rgba(255, 255, 255, 0.85)',
      
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--error': '#EF4444',
      '--info': '#3B82F6',
      
      '--glow': '0 0 30px rgba(220, 38, 38, 0.1)',
      '--gradient': 'linear-gradient(135deg, #DC2626 0%, #0EA5E9 100%)'
    }
  },
  
  'sunset-grill': {
    id: 'sunset-grill',
    name: 'Sunset Grill',
    description: 'Warme Farben für BBQ und Grill-Konzepte',
    preview: {
      primary: '#EA580C',
      secondary: '#F97316',
      background: '#1C1917',
      surface: '#292524',
      accent: '#FED7AA'
    },
    variables: {
      '--primary': '#EA580C',
      '--primary-light': '#F97316',
      '--primary-dark': '#C2410C',
      '--secondary': '#F97316',
      '--accent': '#FED7AA',
      
      '--bg-primary': '#1C1917',
      '--bg-secondary': '#292524',
      '--bg-tertiary': '#3F3835',
      '--bg-elevated': '#44403C',
      
      '--text-primary': '#FEF3C7',
      '--text-secondary': '#FED7AA',
      '--text-tertiary': '#FDBA74',
      '--text-inverse': '#1C1917',
      
      '--border-color': 'rgba(251, 146, 60, 0.3)',
      '--shadow-color': 'rgba(234, 88, 12, 0.2)',
      '--overlay': 'rgba(28, 25, 23, 0.85)',
      
      '--success': '#84CC16',
      '--warning': '#FCD34D',
      '--error': '#DC2626',
      '--info': '#60A5FA',
      
      '--glow': '0 0 40px rgba(234, 88, 12, 0.4)',
      '--gradient': 'linear-gradient(135deg, #EA580C 0%, #FED7AA 100%)'
    }
  },
  
  'ocean-breeze': {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Frisches maritimes Theme für Seafood',
    preview: {
      primary: '#0891B2',
      secondary: '#06B6D4',
      background: '#F0F9FF',
      surface: '#E0F2FE',
      accent: '#7DD3FC'
    },
    variables: {
      '--primary': '#0891B2',
      '--primary-light': '#06B6D4',
      '--primary-dark': '#0E7490',
      '--secondary': '#06B6D4',
      '--accent': '#7DD3FC',
      
      '--bg-primary': '#F0F9FF',
      '--bg-secondary': '#E0F2FE',
      '--bg-tertiary': '#BAE6FD',
      '--bg-elevated': '#FFFFFF',
      
      '--text-primary': '#0C4A6E',
      '--text-secondary': '#075985',
      '--text-tertiary': '#0369A1',
      '--text-inverse': '#FFFFFF',
      
      '--border-color': '#7DD3FC',
      '--shadow-color': 'rgba(8, 145, 178, 0.1)',
      '--overlay': 'rgba(240, 249, 255, 0.85)',
      
      '--success': '#10B981',
      '--warning': '#FBBF24',
      '--error': '#F87171',
      '--info': '#0891B2',
      
      '--glow': '0 0 30px rgba(8, 145, 178, 0.2)',
      '--gradient': 'linear-gradient(135deg, #0891B2 0%, #7DD3FC 100%)'
    }
  },
  
  'urban-street': {
    id: 'urban-street',
    name: 'Urban Street',
    description: 'Modernes Streetfood-Theme mit Neon-Akzenten',
    preview: {
      primary: '#A855F7',
      secondary: '#EC4899',
      background: '#09090B',
      surface: '#18181B',
      accent: '#14B8A6'
    },
    variables: {
      '--primary': '#A855F7',
      '--primary-light': '#C084FC',
      '--primary-dark': '#9333EA',
      '--secondary': '#EC4899',
      '--accent': '#14B8A6',
      
      '--bg-primary': '#09090B',
      '--bg-secondary': '#18181B',
      '--bg-tertiary': '#27272A',
      '--bg-elevated': '#3F3F46',
      
      '--text-primary': '#FAFAFA',
      '--text-secondary': '#E4E4E7',
      '--text-tertiary': '#A1A1AA',
      '--text-inverse': '#09090B',
      
      '--border-color': 'rgba(168, 85, 247, 0.3)',
      '--shadow-color': 'rgba(168, 85, 247, 0.2)',
      '--overlay': 'rgba(9, 9, 11, 0.85)',
      
      '--success': '#4ADE80',
      '--warning': '#FACC15',
      '--error': '#F87171',
      '--info': '#60A5FA',
      
      '--glow': '0 0 40px rgba(168, 85, 247, 0.5)',
      '--gradient': 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)'
    }
  }
};

// ============================================================================
// THEME CONTEXT
// ============================================================================
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [adminTheme, setAdminTheme] = useState(() => 
    localStorage.getItem('eatech-admin-theme') || 'noir-excellence'
  );
  const [customerTheme, setCustomerTheme] = useState(() => 
    localStorage.getItem('eatech-customer-theme') || 'sunset-grill'
  );
  
  const updateAdminTheme = (themeId) => {
    setAdminTheme(themeId);
    localStorage.setItem('eatech-admin-theme', themeId);
    applyTheme(themeId, 'admin');
  };
  
  const updateCustomerTheme = (themeId) => {
    setCustomerTheme(themeId);
    localStorage.setItem('eatech-customer-theme', themeId);
    // In real app, this would save to Firebase for customer area
    if (window.firebase?.database) {
      const db = window.firebase.database();
      const tenantId = 'demo-restaurant'; // From context
      db.ref(`tenants/${tenantId}/settings/theme`).set(themeId);
    }
  };
  
  const applyTheme = (themeId, target = 'admin') => {
    const theme = THEMES[themeId];
    if (!theme) return;
    
    const root = document.documentElement;
    Object.entries(theme.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = theme.variables['--bg-primary'];
    }
  };
  
  useEffect(() => {
    applyTheme(adminTheme, 'admin');
  }, [adminTheme]);
  
  return (
    <ThemeContext.Provider value={{
      adminTheme,
      customerTheme,
      updateAdminTheme,
      updateCustomerTheme,
      themes: THEMES
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// ============================================================================
// THEME SWITCHER COMPONENT
// ============================================================================
export const ThemeSwitcher = () => {
  const { adminTheme, customerTheme, updateAdminTheme, updateCustomerTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('admin');
  
  const currentTheme = activeTab === 'admin' ? adminTheme : customerTheme;
  const updateTheme = activeTab === 'admin' ? updateAdminTheme : updateCustomerTheme;
  
  return (
    <div className={styles.themeSwitcher}>
      <button 
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Theme-Auswahl öffnen"
      >
        <Palette size={20} />
      </button>
      
      {isOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsOpen(false)} />
          <div className={styles.panel}>
            <div className={styles.header}>
              <h3>Theme-Auswahl</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.tabs}>
              <button 
                className={`${styles.tab} ${activeTab === 'admin' ? styles.active : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                <Settings2 size={16} />
                Admin-Bereich
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'customer' ? styles.active : ''}`}
                onClick={() => setActiveTab('customer')}
              >
                <Monitor size={16} />
                Kunden-Bereich
              </button>
            </div>
            
            <div className={styles.themeGrid}>
              {Object.values(themes).map(theme => (
                <button
                  key={theme.id}
                  className={`${styles.themeCard} ${currentTheme === theme.id ? styles.active : ''}`}
                  onClick={() => updateTheme(theme.id)}
                >
                  <div className={styles.preview}>
                    <div 
                      className={styles.previewColors}
                      style={{
                        background: theme.preview.background,
                        borderColor: theme.preview.primary
                      }}
                    >
                      <div 
                        className={styles.previewAccent}
                        style={{ background: theme.preview.primary }}
                      />
                      <div 
                        className={styles.previewSurface}
                        style={{ background: theme.preview.surface }}
                      />
                    </div>
                  </div>
                  
                  <div className={styles.themeInfo}>
                    <h4>{theme.name}</h4>
                    <p>{theme.description}</p>
                  </div>
                  
                  {currentTheme === theme.id && (
                    <div className={styles.activeIndicator}>
                      <Check size={16} />
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <div className={styles.footer}>
              <p>
                {activeTab === 'admin' 
                  ? 'Theme wird sofort angewendet' 
                  : 'Theme wird für alle Kunden aktiviert'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// THEME PREVIEW COMPONENT
// ============================================================================
export const ThemePreview = ({ themeId, showName = true, size = 'medium' }) => {
  const theme = THEMES[themeId];
  if (!theme) return null;
  
  const sizeClasses = {
    small: styles.previewSmall,
    medium: styles.previewMedium,
    large: styles.previewLarge
  };
  
  return (
    <div className={`${styles.themePreview} ${sizeClasses[size]}`}>
      <div 
        className={styles.previewBox}
        style={{
          background: theme.preview.background,
          borderColor: theme.preview.primary
        }}
      >
        <div 
          className={styles.previewHeader}
          style={{ background: theme.preview.primary }}
        />
        <div 
          className={styles.previewContent}
          style={{ background: theme.preview.surface }}
        >
          <div 
            className={styles.previewAccentBar}
            style={{ background: theme.preview.accent }}
          />
        </div>
      </div>
      
      {showName && (
        <h5 className={styles.previewName}>{theme.name}</h5>
      )}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default ThemeSwitcher;