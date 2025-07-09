export { defaultTheme, generateCSSVariables, type Theme } from './default.theme';
export { darkTheme, darkThemeOverrides } from './dark.theme';
export { swissTheme, swissThemeCSS } from './swiss.theme';

// Theme utilities
export const themes = {
  default: defaultTheme,
  dark: darkTheme,
  swiss: swissTheme,
} as const;

export type ThemeName = keyof typeof themes;

// Theme manager utilities
export const applyTheme = (themeName: ThemeName, isDark = false) => {
  const theme = themes[themeName];
  const cssVariables = generateCSSVariables(theme, isDark);
  
  // Apply CSS variables to root
  const root = document.documentElement;
  Object.entries(cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // Add theme class
  root.className = root.className
    .replace(/theme-\w+/g, '')
    .trim() + ` theme-${themeName}`;
  
  // Add dark class if needed
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

// Get current theme from DOM
export const getCurrentTheme = (): ThemeName => {
  const root = document.documentElement;
  const themeClass = root.className.match(/theme-(\w+)/);
  return (themeClass?.[1] as ThemeName) || 'default';
};

// Check if dark mode is enabled
export const isDarkMode = (): boolean => {
  return document.documentElement.classList.contains('dark');
};

// Theme context for React
import { createContext, useContext } from 'react';

export interface ThemeContextValue {
  theme: ThemeName;
  isDark: boolean;
  setTheme: (theme: ThemeName) => void;
  toggleDark: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
