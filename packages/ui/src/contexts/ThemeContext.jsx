/**
 * EATECH - Theme Context Provider
 * Version: 5.0.0
 * Description: Theme-Management mit Dark/Light Mode, Custom Themes
 *              und Tenant-spezifischen Farben
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/contexts/ThemeContext.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTenant } from './TenantContext';
import { logInfo } from '../utils/monitoring';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================
const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = 'eatech_theme_preference';

// Vordefinierte Themes
const THEMES = {
    light: {
        name: 'Light',
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#FFE66D',
        background: '#FFFFFF',
        surface: '#F8F9FA',
        text: '#212529',
        textSecondary: '#6C757D',
        border: '#DEE2E6',
        error: '#DC3545',
        warning: '#FFC107',
        success: '#28A745',
        info: '#17A2B8'
    },
    dark: {
        name: 'Dark',
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#FFE66D',
        background: '#0A0A0A',
        surface: '#141414',
        text: '#FFFFFF',
        textSecondary: '#A0A0A0',
        border: '#2A2A2A',
        error: '#FF4444',
        warning: '#FFAA00',
        success: '#00C851',
        info: '#33B5E5'
    },
    noir: {
        name: 'Noir Excellence',
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#FFE66D',
        background: '#000000',
        surface: '#0A0A0A',
        text: '#FFFFFF',
        textSecondary: '#888888',
        border: '#1A1A1A',
        error: '#FF3838',
        warning: '#FFA000',
        success: '#00C853',
        info: '#2196F3',
        gradient: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)',
        shadow: '0 20px 60px rgba(255, 107, 107, 0.3)',
        glow: '0 0 80px rgba(255, 107, 107, 0.5)'
    },
    ocean: {
        name: 'Ocean Blue',
        primary: '#0077BE',
        secondary: '#00A8CC',
        accent: '#FDB44B',
        background: '#F0F9FF',
        surface: '#E1F5FE',
        text: '#01579B',
        textSecondary: '#0277BD',
        border: '#B3E5FC',
        error: '#D32F2F',
        warning: '#F57C00',
        success: '#388E3C',
        info: '#0288D1'
    },
    forest: {
        name: 'Forest Green',
        primary: '#2E7D32',
        secondary: '#66BB6A',
        accent: '#FDD835',
        background: '#F1F8E9',
        surface: '#DCEDC8',
        text: '#1B5E20',
        textSecondary: '#388E3C',
        border: '#AED581',
        error: '#C62828',
        warning: '#F9A825',
        success: '#2E7D32',
        info: '#00ACC1'
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wendet Theme-Variablen auf das DOM an
 */
const applyThemeToDOM = (theme) => {
    const root = document.documentElement;
    
    Object.entries(theme).forEach(([key, value]) => {
        if (key !== 'name' && typeof value === 'string') {
            root.style.setProperty(`--theme-${key}`, value);
        }
    });
    
    // Zusätzliche CSS-Variablen
    root.style.setProperty('--theme-radius', '12px');
    root.style.setProperty('--theme-transition', '0.3s ease');
    root.style.setProperty('--theme-shadow-sm', '0 2px 4px rgba(0, 0, 0, 0.1)');
    root.style.setProperty('--theme-shadow-md', '0 4px 8px rgba(0, 0, 0, 0.15)');
    root.style.setProperty('--theme-shadow-lg', '0 8px 16px rgba(0, 0, 0, 0.2)');
};

/**
 * Mischt zwei Farben
 */
const blendColors = (color1, color2, percentage) => {
    const hex = (color) => {
        const values = color.match(/\w\w/g);
        return values.map((value) => parseInt(value, 16));
    };
    
    const [r1, g1, b1] = hex(color1);
    const [r2, g2, b2] = hex(color2);
    
    const r = Math.round(r1 + (r2 - r1) * percentage);
    const g = Math.round(g1 + (g2 - g1) * percentage);
    const b = Math.round(b1 + (b2 - b1) * percentage);
    
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Generiert Theme-Variationen
 */
const generateThemeVariations = (baseTheme) => {
    return {
        ...baseTheme,
        primaryLight: blendColors(baseTheme.primary, '#FFFFFF', 0.2),
        primaryDark: blendColors(baseTheme.primary, '#000000', 0.2),
        secondaryLight: blendColors(baseTheme.secondary, '#FFFFFF', 0.2),
        secondaryDark: blendColors(baseTheme.secondary, '#000000', 0.2),
        surfaceHover: blendColors(baseTheme.surface, baseTheme.text, 0.05),
        surfaceActive: blendColors(baseTheme.surface, baseTheme.text, 0.1)
    };
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================
export const ThemeProvider = ({ children }) => {
    const { tenant } = useTenant();
    
    // State
    const [currentTheme, setCurrentTheme] = useState('dark');
    const [customTheme, setCustomTheme] = useState(null);
    const [isSystemTheme, setIsSystemTheme] = useState(false);
    
    /**
     * Holt die System-Theme-Präferenz
     */
    const getSystemTheme = useCallback(() => {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }, []);
    
    /**
     * Lädt gespeicherte Theme-Präferenz
     */
    const loadThemePreference = useCallback(() => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        
        if (saved) {
            const { theme, isSystem } = JSON.parse(saved);
            
            if (isSystem) {
                setIsSystemTheme(true);
                setCurrentTheme(getSystemTheme());
            } else {
                setCurrentTheme(theme);
            }
        } else {
            // Default: System-Theme
            setIsSystemTheme(true);
            setCurrentTheme(getSystemTheme());
        }
    }, [getSystemTheme]);
    
    /**
     * Speichert Theme-Präferenz
     */
    const saveThemePreference = useCallback((theme, isSystem = false) => {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
            theme,
            isSystem,
            timestamp: Date.now()
        }));
        
        logInfo('Theme preference saved', { theme, isSystem });
    }, []);
    
    /**
     * Wechselt das Theme
     */
    const setTheme = useCallback((themeName) => {
        if (THEMES[themeName] || themeName === 'custom') {
            setCurrentTheme(themeName);
            setIsSystemTheme(false);
            saveThemePreference(themeName, false);
        }
    }, [saveThemePreference]);
    
    /**
     * Togglet zwischen Light und Dark
     */
    const toggleTheme = useCallback(() => {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }, [currentTheme, setTheme]);
    
    /**
     * Aktiviert System-Theme
     */
    const useSystemTheme = useCallback(() => {
        setIsSystemTheme(true);
        const systemTheme = getSystemTheme();
        setCurrentTheme(systemTheme);
        saveThemePreference(systemTheme, true);
    }, [getSystemTheme, saveThemePreference]);
    
    /**
     * Setzt ein Custom Theme
     */
    const setCustomThemeColors = useCallback((colors) => {
        const custom = {
            name: 'Custom',
            ...THEMES.light, // Base
            ...colors
        };
        
        setCustomTheme(custom);
        setCurrentTheme('custom');
        setIsSystemTheme(false);
        saveThemePreference('custom', false);
        
        // Speichere Custom Theme
        if (tenant?.id) {
            localStorage.setItem(`${THEME_STORAGE_KEY}_custom_${tenant.id}`, JSON.stringify(custom));
        }
    }, [tenant, saveThemePreference]);
    
    /**
     * Holt das aktuelle Theme-Objekt
     */
    const getTheme = useCallback(() => {
        if (currentTheme === 'custom' && customTheme) {
            return generateThemeVariations(customTheme);
        }
        
        // Tenant-spezifisches Theme
        if (tenant?.theme && tenant.theme[currentTheme]) {
            return generateThemeVariations({
                ...THEMES[currentTheme],
                ...tenant.theme[currentTheme]
            });
        }
        
        return generateThemeVariations(THEMES[currentTheme] || THEMES.dark);
    }, [currentTheme, customTheme, tenant]);
    
    // ============================================================================
    // EFFECTS
    // ============================================================================
    
    // Initial load
    useEffect(() => {
        loadThemePreference();
    }, [loadThemePreference]);
    
    // System theme change listener
    useEffect(() => {
        if (!isSystemTheme) return;
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            setCurrentTheme(e.matches ? 'dark' : 'light');
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [isSystemTheme]);
    
    // Apply theme to DOM
    useEffect(() => {
        const theme = getTheme();
        applyThemeToDOM(theme);
        
        // Set data attribute for CSS
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme.primary;
        }
    }, [currentTheme, getTheme]);
    
    // Load custom theme for tenant
    useEffect(() => {
        if (!tenant?.id) return;
        
        const savedCustom = localStorage.getItem(`${THEME_STORAGE_KEY}_custom_${tenant.id}`);
        if (savedCustom) {
            try {
                setCustomTheme(JSON.parse(savedCustom));
            } catch (error) {
                console.error('Failed to load custom theme:', error);
            }
        }
    }, [tenant]);
    
    // ============================================================================
    // CONTEXT VALUE
    // ============================================================================
    const value = {
        // Current state
        theme: currentTheme,
        themeConfig: getTheme(),
        isSystemTheme,
        availableThemes: Object.keys(THEMES),
        
        // Actions
        setTheme,
        toggleTheme,
        useSystemTheme,
        setCustomThemeColors,
        
        // Utilities
        themes: THEMES,
        isDark: currentTheme === 'dark' || currentTheme === 'noir'
    };
    
    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================
export const useTheme = () => {
    const context = useContext(ThemeContext);
    
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    
    return context;
};

// ============================================================================
// EXPORT
// ============================================================================
export default ThemeContext;