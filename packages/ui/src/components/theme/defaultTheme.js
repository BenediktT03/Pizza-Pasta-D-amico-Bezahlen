/**
 * EATECH Default Theme
 * Design system tokens and theme configuration
 * File Path: /packages/ui/src/theme/defaultTheme.js
 */

const defaultTheme = {
  // Color Palette
  colors: {
    // Primary Colors (EATECH Red)
    primary: '#ff6b6b',
    primaryLight: '#fef2f2',
    primaryMedium: '#fecaca',
    primaryDark: '#ff5252',
    primaryContrast: '#ffffff',
    
    // Secondary Colors
    secondary: '#f3f4f6',
    secondaryLight: '#f9fafb',
    secondaryDark: '#e5e7eb',
    secondaryContrast: '#1f2937',
    
    // Neutral Colors
    text: '#1f2937',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    textInverse: '#ffffff',
    
    // Background Colors
    background: '#ffffff',
    backgroundSecondary: '#f9fafb',
    backgroundTertiary: '#f3f4f6',
    backgroundHover: 'rgba(0, 0, 0, 0.05)',
    backgroundActive: 'rgba(0, 0, 0, 0.1)',
    
    // Semantic Colors
    success: '#10b981',
    successLight: '#d1fae5',
    successDark: '#059669',
    
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    warningDark: '#d97706',
    
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    dangerDark: '#dc2626',
    
    info: '#3b82f6',
    infoLight: '#dbeafe',
    infoDark: '#2563eb',
    
    // UI Colors
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    borderDark: '#d1d5db',
    
    focus: 'rgba(255, 107, 107, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Special Colors
    gold: '#fbbf24',
    silver: '#9ca3af',
    bronze: '#d97706'
  },
  
  // Typography
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
  },
  
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
    '6xl': '60px'
  },
  
  fontWeights: {
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900
  },
  
  lineHeights: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2
  },
  
  // Spacing
  space: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
    32: '128px'
  },
  
  // Sizing
  sizes: {
    xs: '320px',
    sm: '384px',
    md: '448px',
    lg: '512px',
    xl: '576px',
    '2xl': '672px',
    '3xl': '768px',
    '4xl': '896px',
    '5xl': '1024px',
    '6xl': '1152px',
    '7xl': '1280px',
    full: '100%',
    min: 'min-content',
    max: 'max-content',
    fit: 'fit-content'
  },
  
  // Border Radius
  radii: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px'
  },
  
  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    outline: '0 0 0 3px rgba(255, 107, 107, 0.2)'
  },
  
  // Breakpoints
  breakpoints: {
    xs: '480px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  // Z-Index
  zIndices: {
    hide: -1,
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800
  },
  
  // Transitions
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
    
    property: {
      common: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
      colors: 'background-color, border-color, color, fill, stroke',
      dimensions: 'width, height',
      position: 'left, right, top, bottom',
      background: 'background-color, background-image, background-position'
    },
    
    timing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      linear: 'linear'
    }
  },
  
  // Borders
  borders: {
    none: 'none',
    thin: '1px solid',
    thick: '2px solid'
  },
  
  // Special EATECH tokens
  eatech: {
    // Restaurant specific colors
    kitchen: '#22c55e',
    waiter: '#3b82f6',
    delivery: '#f59e0b',
    takeaway: '#8b5cf6',
    
    // Status colors
    statusNew: '#3b82f6',
    statusPreparing: '#f59e0b',
    statusReady: '#22c55e',
    statusDelivered: '#6b7280',
    statusCancelled: '#ef4444',
    
    // Table status
    tableFree: '#22c55e',
    tableOccupied: '#f59e0b',
    tableReserved: '#3b82f6',
    tableCleaning: '#9ca3af'
  }
};

export default defaultTheme;