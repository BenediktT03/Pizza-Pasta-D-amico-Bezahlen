export const defaultTheme = {
  name: 'default',
  colors: {
    // Base colors
    background: 'hsl(0, 0%, 100%)',
    foreground: 'hsl(222.2, 84%, 4.9%)',
    
    // Card
    card: 'hsl(0, 0%, 100%)',
    'card-foreground': 'hsl(222.2, 84%, 4.9%)',
    
    // Popover
    popover: 'hsl(0, 0%, 100%)',
    'popover-foreground': 'hsl(222.2, 84%, 4.9%)',
    
    // Primary
    primary: 'hsl(221.2, 83.2%, 53.3%)',
    'primary-foreground': 'hsl(210, 40%, 98%)',
    
    // Secondary
    secondary: 'hsl(210, 40%, 96.1%)',
    'secondary-foreground': 'hsl(222.2, 47.4%, 11.2%)',
    
    // Muted
    muted: 'hsl(210, 40%, 96.1%)',
    'muted-foreground': 'hsl(215.4, 16.3%, 46.9%)',
    
    // Accent
    accent: 'hsl(210, 40%, 96.1%)',
    'accent-foreground': 'hsl(222.2, 47.4%, 11.2%)',
    
    // Destructive
    destructive: 'hsl(0, 84.2%, 60.2%)',
    'destructive-foreground': 'hsl(210, 40%, 98%)',
    
    // Border
    border: 'hsl(214.3, 31.8%, 91.4%)',
    input: 'hsl(214.3, 31.8%, 91.4%)',
    ring: 'hsl(221.2, 83.2%, 53.3%)',
    
    // Chart colors
    chart1: 'hsl(12, 76%, 61%)',
    chart2: 'hsl(173, 58%, 39%)',
    chart3: 'hsl(197, 37%, 24%)',
    chart4: 'hsl(43, 74%, 66%)',
    chart5: 'hsl(27, 87%, 67%)',
  },
  darkColors: {
    // Base colors
    background: 'hsl(222.2, 84%, 4.9%)',
    foreground: 'hsl(210, 40%, 98%)',
    
    // Card
    card: 'hsl(222.2, 84%, 4.9%)',
    'card-foreground': 'hsl(210, 40%, 98%)',
    
    // Popover
    popover: 'hsl(222.2, 84%, 4.9%)',
    'popover-foreground': 'hsl(210, 40%, 98%)',
    
    // Primary
    primary: 'hsl(217.2, 91.2%, 59.8%)',
    'primary-foreground': 'hsl(222.2, 47.4%, 11.2%)',
    
    // Secondary
    secondary: 'hsl(217.2, 32.6%, 17.5%)',
    'secondary-foreground': 'hsl(210, 40%, 98%)',
    
    // Muted
    muted: 'hsl(217.2, 32.6%, 17.5%)',
    'muted-foreground': 'hsl(215, 20.2%, 65.1%)',
    
    // Accent
    accent: 'hsl(217.2, 32.6%, 17.5%)',
    'accent-foreground': 'hsl(210, 40%, 98%)',
    
    // Destructive
    destructive: 'hsl(0, 62.8%, 30.6%)',
    'destructive-foreground': 'hsl(210, 40%, 98%)',
    
    // Border
    border: 'hsl(217.2, 32.6%, 17.5%)',
    input: 'hsl(217.2, 32.6%, 17.5%)',
    ring: 'hsl(224.3, 76.3%, 48%)',
    
    // Chart colors
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

// Helper function to generate CSS variables from theme
export const generateCSSVariables = (theme: typeof defaultTheme, isDark = false) => {
  const colors = isDark ? theme.darkColors : theme.colors;
  
  return Object.entries(colors).reduce((acc, [key, value]) => {
    // Convert HSL string to CSS variable format
    const hslValue = value.replace('hsl(', '').replace(')', '');
    acc[`--${key}`] = hslValue;
    return acc;
  }, {} as Record<string, string>);
};

// Export theme type
export type Theme = typeof defaultTheme;
