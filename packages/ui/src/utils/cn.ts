import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge class names with tailwind-merge
 * This prevents style conflicts when using Tailwind CSS utilities
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Conditionally join class names together
 */
export function cx(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Create a component variant utility
 */
export function createVariants<T extends Record<string, Record<string, string>>>(
  variants: T
) {
  return (props: {
    [K in keyof T]?: keyof T[K];
  } & { className?: string }) => {
    const { className, ...variantProps } = props;
    const classes: string[] = [];

    for (const [key, value] of Object.entries(variantProps)) {
      if (value && variants[key] && variants[key][value as string]) {
        classes.push(variants[key][value as string]);
      }
    }

    return cn(...classes, className);
  };
}

/**
 * Check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Create slot classes for compound components
 */
export function createSlots<T extends Record<string, string>>(
  slots: T,
  classNames?: Partial<T>
): T {
  const result = {} as T;

  for (const [key, defaultClass] of Object.entries(slots)) {
    result[key as keyof T] = cn(
      defaultClass,
      classNames?.[key as keyof T]
    ) as T[keyof T];
  }

  return result;
}

/**
 * Focus management utilities
 */
export const focusRing = cn(
  'focus:outline-none focus-visible:ring-2',
  'focus-visible:ring-ring focus-visible:ring-offset-2',
  'focus-visible:ring-offset-background'
);

/**
 * Common animation classes
 */
export const transitions = {
  all: 'transition-all duration-200 ease-in-out',
  colors: 'transition-colors duration-200 ease-in-out',
  opacity: 'transition-opacity duration-200 ease-in-out',
  transform: 'transition-transform duration-200 ease-in-out',
  none: 'transition-none',
} as const;

/**
 * Breakpoint utilities
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Check if we're in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Media query helper
 */
export function useMediaQuery(query: string): boolean {
  if (!isBrowser) return false;
  return window.matchMedia(query).matches;
}

/**
 * Responsive utility to apply different classes at different breakpoints
 */
export function responsive<T extends string>(
  base: T,
  config: Partial<Record<Breakpoint, T>>
): string {
  const classes = [base];

  for (const [breakpoint, value] of Object.entries(config)) {
    if (value) {
      classes.push(`${breakpoint}:${value}`);
    }
  }

  return classes.join(' ');
}

/**
 * Generate spacing classes
 */
export function spacing(
  property: 'p' | 'm' | 'px' | 'py' | 'mx' | 'my' | 'pt' | 'pb' | 'pl' | 'pr' | 'mt' | 'mb' | 'ml' | 'mr',
  size: number | string
): string {
  return `${property}-${size}`;
}

/**
 * Data attribute selector helper
 */
export function dataAttr(condition: boolean | undefined) {
  return condition ? '' : undefined;
}

/**
 * Aria attribute helper
 */
export function ariaAttr(condition: boolean | undefined) {
  return condition ? 'true' : undefined;
}

/**
 * Compose event handlers
 */
export function composeEventHandlers<E>(
  originalEventHandler?: (event: E) => void,
  ourEventHandler?: (event: E) => void,
  { checkForDefaultPrevented = true } = {}
) {
  return function handleEvent(event: E) {
    originalEventHandler?.(event);

    if (checkForDefaultPrevented === false || !(event as any).defaultPrevented) {
      return ourEventHandler?.(event);
    }
  };
}

/**
 * Format class names for debugging
 */
export function debugClasses(classes: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Classes:', classes.split(' ').filter(Boolean).join('\n'));
  }
}
