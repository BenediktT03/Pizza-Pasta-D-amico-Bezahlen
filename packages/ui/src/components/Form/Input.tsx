import React, { forwardRef, InputHTMLAttributes, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

const inputVariants = cva(
  'flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'border-input focus-visible:ring-ring',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-green-500 focus-visible:ring-green-500',
        swiss: 'border-red-600 focus-visible:ring-red-600',
      },
      inputSize: {
        sm: 'h-8 text-xs',
        default: 'h-10',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      variant,
      inputSize,
      label,
      error,
      success,
      hint,
      leftIcon,
      rightIcon,
      onRightIconClick,
      showPasswordToggle,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    
    // Determine the actual input type
    const inputType = type === 'password' && showPassword ? 'text' : type;
    
    // Determine the variant based on error/success state
    const actualVariant = error ? 'error' : success ? 'success' : variant;
    
    // Determine right icon
    const actualRightIcon = showPasswordToggle && type === 'password' 
      ? (showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />)
      : rightIcon;
      
    const handleRightIconClick = showPasswordToggle && type === 'password'
      ? () => setShowPassword(!showPassword)
      : onRightIconClick;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <input
            type={inputType}
            className={cn(
              inputVariants({ variant: actualVariant, inputSize, className }),
              leftIcon && 'pl-10',
              actualRightIcon && 'pr-10'
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
          />
          
          {actualRightIcon && (
            <button
              type="button"
              onClick={handleRightIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {actualRightIcon}
            </button>
          )}
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

Input.displayName = 'Input';

export { Input, inputVariants };
