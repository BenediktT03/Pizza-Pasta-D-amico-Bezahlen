import { Theme } from './default.theme';

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    // Base colors
    background: 'hsl(224, 71.4%, 4.1%)',
    foreground: 'hsl(210, 20%, 98%)',
    
    // Card
    card: 'hsl(224, 71.4%, 4.1%)',
    'card-foreground': 'hsl(210, 20%, 98%)',
    
    // Popover
    popover: 'hsl(224, 71.4%, 4.1%)',
    'popover-foreground': 'hsl(210, 20%, 98%)',
    
    // Primary
    primary: 'hsl(263.4, 70%, 50.4%)',
    'primary-foreground': 'hsl(210, 20%, 98%)',
    
    // Secondary
    secondary: 'hsl(215, 27.9%, 16.9%)',
    'secondary-foreground': 'hsl(210, 20%, 98%)',
    
    // Muted
    muted: 'hsl(215, 27.9%, 16.9%)',
    'muted-foreground': 'hsl(217.9, 10.6%, 64.9%)',
    
    // Accent
    accent: 'hsl(215, 27.9%, 16.9%)',
    'accent-foreground': 'hsl(210, 20%, 98%)',
    
    // Destructive
    destructive: 'hsl(0, 62.8%, 30.6%)',
    'destructive-foreground': 'hsl(210, 20%, 98%)',
    
    // Border
    border: 'hsl(215, 27.9%, 16.9%)',
    input: 'hsl(215, 27.9%, 16.9%)',
    ring: 'hsl(263.4, 70%, 50.4%)',
    
    // Chart colors
    chart1: 'hsl(220, 70%, 50%)',
    chart2: 'hsl(160, 60%, 45%)',
    chart3: 'hsl(30, 80%, 55%)',
    chart4: 'hsl(280, 65%, 60%)',
    chart5: 'hsl(340, 75%, 55%)',
  },
  darkColors: {
    // Same as colors for dark theme
    background: 'hsl(224, 71.4%, 4.1%)',
    foreground: 'hsl(210, 20%, 98%)',
    
    card: 'hsl(224, 71.4%, 4.1%)',
    'card-foreground': 'hsl(210, 20%, 98%)',
    
    popover: 'hsl(224, 71.4%, 4.1%)',
    'popover-foreground': 'hsl(210, 20%, 98%)',
    
    primary: 'hsl(263.4, 70%, 50.4%)',
    'primary-foreground': 'hsl(210, 20%, 98%)',
    
    secondary: 'hsl(215, 27.9%, 16.9%)',
    'secondary-foreground': 'hsl(210, 20%, 98%)',
    
    muted: 'hsl(215, 27.9%, 16.9%)',
    'muted-foreground': 'hsl(217.9, 10.6%, 64.9%)',
    
    accent: 'hsl(215, 27.9%, 16.9%)',
    'accent-foreground': 'hsl(210, 20%, 98%)',
    
    destructive: 'hsl(0, 62.8%, 30.6%)',
    'destructive-foreground': 'hsl(210, 20%, 98%)',
    
    border: 'hsl(215, 27.9%, 16.9%)',
    input: 'hsl(215, 27.9%, 16.9%)',
    ring: 'hsl(263.4, 70%, 50.4%)',
    
    chart1: 'hsl(220, 70%, 50%)',
    chart2: 'hsl(160, 60%, 45%)',
    chart3: 'hsl(30, 80%, 55%)',
    chart4: 'hsl(280, 65%, 60%)',
    chart5: 'hsl(340, 75%, 55%)',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
    '3xl': '6rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    default: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  animation: {
    timing: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
  },
};

// Dark theme specific overrides
export const darkThemeOverrides = {
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    default: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.5)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.3)',
  },
};
