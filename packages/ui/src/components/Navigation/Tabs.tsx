import React, { forwardRef, HTMLAttributes, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

const tabsVariants = cva(
  'inline-flex items-center justify-center',
  {
    variants: {
      variant: {
        default: 'bg-muted p-1 text-muted-foreground rounded-lg',
        underline: 'border-b border-border',
        pills: 'gap-2',
        enclosed: 'border-b border-border bg-background',
      },
      size: {
        sm: 'text-sm',
        default: 'text-base',
        lg: 'text-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  }
);

const tabVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'rounded-md px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        underline: 'border-b-2 border-transparent px-3 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:text-foreground',
        pills: 'rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
        enclosed: 'border-l border-r border-t px-4 py-2 -mb-px first:ml-0 data-[state=active]:bg-background data-[state=active]:border-b-background',
      },
      size: {
        sm: 'text-sm',
        default: 'text-base',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface TabsProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsVariants> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  variant?: VariantProps<typeof tabsVariants>['variant'];
  size?: VariantProps<typeof tabsVariants>['size'];
  orientation?: 'horizontal' | 'vertical';
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      defaultValue = '',
      value: controlledValue,
      onValueChange,
      orientation = 'horizontal',
      className,
      variant,
      size,
      fullWidth,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const value = controlledValue ?? uncontrolledValue;

    const handleValueChange = (newValue: string) => {
      setUncontrolledValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider
        value={{
          value,
          onValueChange: handleValueChange,
          variant,
          size,
          orientation,
        }}
      >
        <div
          ref={ref}
          className={cn(
            orientation === 'vertical' && 'flex',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = 'Tabs';

export interface TabsListProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsVariants> {}

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    if (!context) {
      throw new Error('TabsList must be used within Tabs');
    }

    const { variant, size, orientation } = context;

    return (
      <div
        ref={ref}
        className={cn(
          tabsVariants({ variant, size, className }),
          orientation === 'vertical' && 'flex-col h-fit',
          props.fullWidth && 'w-full'
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsList.displayName = 'TabsList';

export interface TabsTriggerProps
  extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, disabled, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    if (!context) {
      throw new Error('TabsTrigger must be used within Tabs');
    }

    const { value: selectedValue, onValueChange, variant, size } = context;
    const isActive = selectedValue === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        data-state={isActive ? 'active' : 'inactive'}
        disabled={disabled}
        className={cn(
          tabVariants({ variant, size, className }),
          'relative'
        )}
        onClick={() => onValueChange(value)}
        {...props}
      >
        {children}
        {isActive && variant === 'default' && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 bg-background shadow-sm rounded-md"
            style={{ zIndex: -1 }}
            transition={{ type: 'spring', duration: 0.3 }}
          />
        )}
      </button>
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, forceMount, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    if (!context) {
      throw new Error('TabsContent must be used within Tabs');
    }

    const { value: selectedValue, orientation } = context;
    const isActive = selectedValue === value;

    if (!forceMount && !isActive) {
      return null;
    }

    return (
      <motion.div
        ref={ref}
        role="tabpanel"
        hidden={!isActive}
        data-state={isActive ? 'active' : 'inactive'}
        className={cn(
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          orientation === 'horizontal' ? 'mt-2' : 'ml-2 flex-1',
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsVariants, tabVariants };
