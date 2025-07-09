import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { ChevronDown, AlertCircle, Check } from 'lucide-react';

const selectVariants = cva(
  'flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 appearance-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'border-input focus:ring-ring',
        error: 'border-destructive focus:ring-destructive',
        success: 'border-green-500 focus:ring-green-500',
        swiss: 'border-red-600 focus:ring-red-600',
      },
      selectSize: {
        sm: 'h-8 text-xs',
        default: 'h-10',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      selectSize: 'default',
    },
  }
);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  leftIcon?: React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      variant,
      selectSize,
      label,
      error,
      success,
      hint,
      options,
      placeholder = 'Select an option',
      leftIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    // Determine the variant based on error/success state
    const actualVariant = error ? 'error' : success ? 'success' : variant;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
              {leftIcon}
            </div>
          )}
          
          <select
            className={cn(
              selectVariants({ variant: actualVariant, selectSize, className }),
              leftIcon && 'pl-10',
              'pr-10'
            )}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${props.id}-error` : 
              success ? `${props.id}-success` : 
              hint ? `${props.id}-hint` : 
              undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        
        {error && (
          <p id={`${props.id}-error`} className="mt-1.5 text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        
        {success && !error && (
          <p id={`${props.id}-success`} className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" />
            {success}
          </p>
        )}
        
        {hint && !error && !success && (
          <p id={`${props.id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Advanced Select component with search and multi-select capabilities
export interface AdvancedSelectProps extends Omit<SelectProps, 'options'> {
  options: SelectOption[];
  multiple?: boolean;
  searchable?: boolean;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
}

export const AdvancedSelect = forwardRef<HTMLDivElement, AdvancedSelectProps>(
  ({ options, multiple, searchable, value, onChange, ...props }, ref) => {
    // This is a placeholder for a more advanced select component
    // In a real implementation, this would use a library like react-select
    // or implement a custom dropdown with search and multi-select
    return (
      <div ref={ref}>
        <Select options={options} value={value as string} onChange={(e) => onChange?.(e.target.value)} {...props} />
      </div>
    );
  }
);

AdvancedSelect.displayName = 'AdvancedSelect';

export { Select, selectVariants };
