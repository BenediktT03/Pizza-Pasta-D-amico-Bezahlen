import { Theme } from './default.theme';

export const swissTheme: Theme = {
  name: 'swiss',
  colors: {
    // Base colors
    background: 'hsl(0, 0%, 100%)',
    foreground: 'hsl(0, 0%, 0%)',
    
    // Card
    card: 'hsl(0, 0%, 100%)',
    'card-foreground': 'hsl(0, 0%, 0%)',
    
    // Popover
    popover: 'hsl(0, 0%, 100%)',
    'popover-foreground': 'hsl(0, 0%, 0%)',
    
    // Primary - Swiss Red
    primary: 'hsl(0, 100%, 40%)',
    'primary-foreground': 'hsl(0, 0%, 100%)',
    
    // Secondary - Swiss Gray
    secondary: 'hsl(0, 0%, 92%)',
    'secondary-foreground': 'hsl(0, 0%, 20%)',
    
    // Muted
    muted: 'hsl(0, 0%, 96%)',
    'muted-foreground': 'hsl(0, 0%, 40%)',
    
    // Accent - Swiss Gold
    accent: 'hsl(45, 100%, 50%)',
    'accent-foreground': 'hsl(0, 0%, 0%)',
    
    // Destructive
    destructive: 'hsl(0, 84%, 45%)',
    'destructive-foreground': 'hsl(0, 0%, 100%)',
    
    // Border
    border: 'hsl(0, 0%, 90%)',
    input: 'hsl(0, 0%, 90%)',
    ring: 'hsl(0, 100%, 40%)',
    
    // Chart colors - Swiss inspired
    chart1: 'hsl(0, 100%, 40%)', // Red
    chart2: 'hsl(0, 0%, 20%)', // Dark Gray
    chart3: 'hsl(45, 100%, 50%)', // Gold
    chart4: 'hsl(0, 0%, 60%)', // Medium Gray
    chart5: 'hsl(0, 50%, 30%)', // Dark Red
  },
  darkColors: {
    // Base colors
    background: 'hsl(0, 0%, 10%)',
    foreground: 'hsl(0, 0%, 95%)',
    
    // Card
    card: 'hsl(0, 0%, 12%)',
    'card-foreground': 'hsl(0, 0%, 95%)',
    
    // Popover
    popover: 'hsl(0, 0%, 12%)',
    'popover-foreground': 'hsl(0, 0%, 95%)',
    
    // Primary - Swiss Red (slightly lighter for dark mode)
    primary: 'hsl(0, 100%, 50%)',
    'primary-foreground': 'hsl(0, 0%, 100%)',
    
    // Secondary
    secondary: 'hsl(0, 0%, 20%)',
    'secondary-foreground': 'hsl(0, 0%, 95%)',
    
    // Muted
    muted: 'hsl(0, 0%, 20%)',
    'muted-foreground': 'hsl(0, 0%, 65%)',
    
    // Accent - Swiss Gold
    accent: 'hsl(45, 100%, 55%)',
    'accent-foreground': 'hsl(0, 0%, 0%)',
    
    // Destructive
    destructive: 'hsl(0, 84%, 35%)',
    'destructive-foreground': 'hsl(0, 0%, 100%)',
    
    // Border
    border: 'hsl(0, 0%, 20%)',
    input: 'hsl(0, 0%, 20%)',
    ring: 'hsl(0, 100%, 50%)',
    
    // Chart colors - Swiss inspired for dark mode
    chart1: 'hsl(0, 100%, 50%)', // Red
    chart2: 'hsl(0, 0%, 80%)', // Light Gray
    chart3: 'hsl(45, 100%, 55%)', // Gold
    chart4: 'hsl(0, 0%, 40%)', // Medium Gray
    chart5: 'hsl(0, 50%, 40%)', // Dark Red
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

// Swiss theme specific CSS
export const swissThemeCSS = `
  /* Swiss theme specific styles */
  .swiss-theme {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  
  .swiss-theme h1,
  .swiss-theme h2,
  .swiss-theme h3,
  .swiss-theme h4,
  .swiss-theme h5,
  .swiss-theme h6 {
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  
  /* Swiss flag pattern for backgrounds */
  .swiss-pattern {
    background-image: 
      linear-gradient(90deg, transparent 48%, var(--primary) 48%, var(--primary) 52%, transparent 52%),
      linear-gradient(0deg, transparent 48%, var(--primary) 48%, var(--primary) 52%, transparent 52%);
    background-size: 40px 40px;
    background-position: center;
  }
`;
