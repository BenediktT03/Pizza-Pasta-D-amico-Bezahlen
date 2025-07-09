import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

const checkboxVariants = cva(
  'peer shrink-0 rounded border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary',
        destructive: 'border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive',
        success: 'border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500',
        swiss: 'border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600',
      },
      size: {
        sm: 'h-4 w-4',
        default: 'h-5 w-5',
        lg: 'h-6 w-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>,
    VariantProps<typeof checkboxVariants> {
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      variant,
      size,
      label,
      description,
      error,
      checked,
      indeterminate,
      disabled,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    React.useImperativeHandle(ref, () => inputRef.current!);
    
    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate || false;
      }
    }, [indeterminate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
    };

    const checkboxId = props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-start space-x-3">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            className={cn(
              checkboxVariants({ variant: error ? 'destructive' : variant, size }),
              'opacity-0 absolute',
              className
            )}
            ref={inputRef}
            id={checkboxId}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${checkboxId}-error` : undefined}
            data-state={checked ? 'checked' : 'unchecked'}
            {...props}
          />
          <div
            className={cn(
              checkboxVariants({ variant: error ? 'destructive' : variant, size }),
              'relative cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
            onClick={() => inputRef.current?.click()}
          >
            <motion.div
              initial={false}
              animate={{
                scale: checked || indeterminate ? 1 : 0,
                opacity: checked || indeterminate ? 1 : 0,
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute inset-0 flex items-center justify-center text-white"
            >
              {indeterminate ? (
                <div className="h-0.5 w-3 bg-current" />
              ) : (
                <Check className={cn(
                  size === 'sm' && 'h-3 w-3',
                  size === 'default' && 'h-3.5 w-3.5',
                  size === 'lg' && 'h-4 w-4'
                )} />
              )}
            </motion.div>
          </div>
        </div>
        
        {(label || description || error) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'text-sm font-medium leading-none cursor-pointer select-none',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
            {error && (
              <p id={`${checkboxId}-error`} className="text-xs text-destructive mt-1">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Checkbox Group Component
export interface CheckboxGroupProps {
  label?: string;
  options: Array<{
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;
  value: string[];
  onChange: (value: string[]) => void;
  orientation?: 'horizontal' | 'vertical';
  error?: string;
  variant?: VariantProps<typeof checkboxVariants>['variant'];
  size?: VariantProps<typeof checkboxVariants>['size'];
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  options,
  value,
  onChange,
  orientation = 'vertical',
  error,
  variant,
  size,
}) => {
  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  };

  return (
    <div role="group" aria-labelledby={label ? 'checkbox-group-label' : undefined}>
      {label && (
        <p id="checkbox-group-label" className="text-sm font-medium mb-3">
          {label}
        </p>
      )}
      <div
        className={cn(
          'flex gap-4',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        )}
      >
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            description={option.description}
            checked={value.includes(option.value)}
            onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
            disabled={option.disabled}
            variant={variant}
            size={size}
          />
        ))}
      </div>
      {error && (
        <p className="text-xs text-destructive mt-2">
          {error}
        </p>
      )}
    </div>
  );
};

export { Checkbox, checkboxVariants };
