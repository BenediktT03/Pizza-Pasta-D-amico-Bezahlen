import React, { forwardRef, HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  XCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        success: 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        warning: 'bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        error: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        destructive: 'bg-destructive/10 text-destructive border-destructive/20',
      },
      size: {
        sm: 'p-3 text-sm',
        default: 'p-4',
        lg: 'p-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const iconMap = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  destructive: AlertCircle,
};

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  closable?: boolean;
  onClose?: () => void;
  action?: React.ReactNode;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = 'default',
      size,
      title,
      description,
      icon,
      closable,
      onClose,
      action,
      children,
      ...props
    },
    ref
  ) => {
    const Icon = icon || iconMap[variant || 'default'];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant, size }), className)}
        {...props}
      >
        <div className="flex">
          {Icon && (
            <Icon className={cn(
              'flex-shrink-0',
              size === 'sm' && 'h-4 w-4',
              size === 'default' && 'h-5 w-5',
              size === 'lg' && 'h-6 w-6'
            )} />
          )}
          <div className={cn('flex-1', Icon && 'ml-3')}>
            {title && (
              <h5 className={cn(
                'font-medium',
                size === 'sm' && 'text-sm',
                size === 'default' && 'text-base',
                size === 'lg' && 'text-lg',
                description && 'mb-1'
              )}>
                {title}
              </h5>
            )}
            {description && (
              <div className={cn(
                'text-muted-foreground',
                size === 'sm' && 'text-xs',
                size === 'default' && 'text-sm',
                size === 'lg' && 'text-base'
              )}>
                {description}
              </div>
            )}
            {children}
          </div>
          {action && (
            <div className="ml-3 flex-shrink-0">
              {action}
            </div>
          )}
          {closable && (
            <button
              onClick={onClose}
              className={cn(
                'ml-3 flex-shrink-0 inline-flex rounded-md p-1.5',
                'hover:bg-black/5 dark:hover:bg-white/5',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                variant === 'info' && 'focus:ring-blue-500',
                variant === 'success' && 'focus:ring-green-500',
                variant === 'warning' && 'focus:ring-yellow-500',
                variant === 'error' && 'focus:ring-red-500',
                variant === 'destructive' && 'focus:ring-destructive'
              )}
            >
              <span className="sr-only">Dismiss</span>
              <X className={cn(
                size === 'sm' && 'h-3 w-3',
                size === 'default' && 'h-4 w-4',
                size === 'lg' && 'h-5 w-5'
              )} />
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// Alert Dialog Component (Modal Alert)
export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: VariantProps<typeof alertVariants>['variant'];
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading,
}) => {
  const Icon = iconMap[variant];

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm?.();
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && handleCancel()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-xl"
          >
            <div className="flex items-start">
              {Icon && (
                <div className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                  variant === 'info' && 'bg-blue-100 dark:bg-blue-900/30',
                  variant === 'success' && 'bg-green-100 dark:bg-green-900/30',
                  variant === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/30',
                  variant === 'error' && 'bg-red-100 dark:bg-red-900/30',
                  variant === 'destructive' && 'bg-destructive/10'
                )}>
                  <Icon className={cn(
                    'h-5 w-5',
                    variant === 'info' && 'text-blue-600 dark:text-blue-400',
                    variant === 'success' && 'text-green-600 dark:text-green-400',
                    variant === 'warning' && 'text-yellow-600 dark:text-yellow-400',
                    variant === 'error' && 'text-red-600 dark:text-red-400',
                    variant === 'destructive' && 'text-destructive'
                  )} />
                </div>
              )}
              <div className={cn('flex-1', Icon && 'ml-4')}>
                <h3 className="text-lg font-semibold">{title}</h3>
                {description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="rounded-md px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50',
                  variant === 'info' && 'bg-blue-600 hover:bg-blue-700',
                  variant === 'success' && 'bg-green-600 hover:bg-green-700',
                  variant === 'warning' && 'bg-yellow-600 hover:bg-yellow-700',
                  variant === 'error' && 'bg-red-600 hover:bg-red-700',
                  variant === 'destructive' && 'bg-destructive hover:bg-destructive/90',
                  variant === 'default' && 'bg-primary hover:bg-primary/90'
                )}
              >
                {loading ? 'Loading...' : confirmText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export { Alert, alertVariants };
