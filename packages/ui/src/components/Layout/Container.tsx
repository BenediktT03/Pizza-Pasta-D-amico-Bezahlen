import React, { forwardRef, HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const containerVariants = cva(
  'w-full mx-auto',
  {
    variants: {
      size: {
        sm: 'max-w-3xl',
        md: 'max-w-5xl',
        lg: 'max-w-7xl',
        xl: 'max-w-[1400px]',
        full: 'max-w-full',
      },
      padding: {
        none: '',
        sm: 'px-4 sm:px-6',
        md: 'px-4 sm:px-6 lg:px-8',
        lg: 'px-6 sm:px-8 lg:px-12',
      },
      center: {
        true: 'flex flex-col items-center justify-center min-h-screen',
      },
    },
    defaultVariants: {
      size: 'lg',
      padding: 'md',
      center: false,
    },
  }
);

export interface ContainerProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: keyof JSX.IntrinsicElements;
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, center, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(containerVariants({ size, padding, center, className }))}
        {...props}
      />
    );
  }
);

Container.displayName = 'Container';

// Section component for page sections
export interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'div';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const spacingClasses = {
  none: '',
  sm: 'py-8',
  md: 'py-12 md:py-16',
  lg: 'py-16 md:py-24',
  xl: 'py-24 md:py-32',
};

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ className, as: Component = 'section', spacing = 'md', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(spacingClasses[spacing], className)}
        {...props}
      />
    );
  }
);

Section.displayName = 'Section';

// Main content wrapper
export interface MainProps extends HTMLAttributes<HTMLElement> {
  sidebar?: boolean;
  centered?: boolean;
}

export const Main = forwardRef<HTMLElement, MainProps>(
  ({ className, sidebar, centered, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={cn(
          'flex-1 w-full',
          sidebar && 'lg:pl-64', // Assuming sidebar is 16rem (256px) wide
          centered && 'flex items-center justify-center',
          className
        )}
        {...props}
      />
    );
  }
);

Main.displayName = 'Main';

// Page wrapper for full page layouts
export interface PageProps extends HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export const Page = forwardRef<HTMLDivElement, PageProps>(
  ({ className, noPadding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'min-h-screen bg-background',
          !noPadding && 'pt-16', // Assuming header is 4rem (64px) tall
          className
        )}
        {...props}
      />
    );
  }
);

Page.displayName = 'Page';

export { Container, containerVariants };
