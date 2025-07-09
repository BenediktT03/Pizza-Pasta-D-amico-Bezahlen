import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-center justify-between overflow-hidden rounded-lg border p-4 pr-6 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        success: 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        error: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        warning: 'bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: VariantProps<typeof toastVariants>['variant'];
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const iconMap = {
  default: null,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

interface ToastItemProps extends Toast {
  onRemove: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({
  id,
  title,
  description,
  variant = 'default',
  duration = 5000,
  action,
  onRemove,
}) => {
  const Icon = iconMap[variant || 'default'];

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onRemove, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
      className={cn(toastVariants({ variant }))}
    >
      <div className="flex items-start gap-3">
        {Icon && <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />}
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          {description && (
            <p className="mt-1 text-sm opacity-90">{description}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-medium underline-offset-2 hover:underline"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

export interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  maxToasts?: number;
}

const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
};

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'bottom-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => {
        const newToasts = [...prev, { ...toast, id }];
        // Remove oldest toasts if we exceed maxToasts
        if (newToasts.length > maxToasts) {
          return newToasts.slice(-maxToasts);
        }
        return newToasts;
      });
    },
    [maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div
        className={cn(
          'fixed z-50 pointer-events-none',
          positionClasses[position]
        )}
      >
        <AnimatePresence mode="sync">
          <div className="flex flex-col gap-2">
            {toasts.map((toast) => (
              <ToastItem
                key={toast.id}
                {...toast}
                onRemove={() => removeToast(toast.id)}
              />
            ))}
          </div>
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// Convenience hook for common toast patterns
export const useToastActions = () => {
  const { addToast } = useToast();

  return {
    success: (title: string, description?: string) =>
      addToast({ title, description, variant: 'success' }),
    error: (title: string, description?: string) =>
      addToast({ title, description, variant: 'error' }),
    warning: (title: string, description?: string) =>
      addToast({ title, description, variant: 'warning' }),
    info: (title: string, description?: string) =>
      addToast({ title, description, variant: 'info' }),
    promise: async <T,>(
      promise: Promise<T>,
      {
        loading,
        success,
        error,
      }: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: Error) => string);
      }
    ) => {
      addToast({ title: loading, variant: 'default' });
      try {
        const data = await promise;
        addToast({
          title: typeof success === 'function' ? success(data) : success,
          variant: 'success',
        });
        return data;
      } catch (err) {
        addToast({
          title:
            typeof error === 'function'
              ? error(err as Error)
              : error,
          variant: 'error',
        });
        throw err;
      }
    },
  };
};

export { toastVariants };
