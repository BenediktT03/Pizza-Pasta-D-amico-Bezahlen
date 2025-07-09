import React, { forwardRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';
import { Button } from '../Button/Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      size = 'md',
      closeOnOverlayClick = true,
      closeOnEsc = true,
      showCloseButton = true,
      className,
      overlayClassName,
      contentClassName,
      footer,
    },
    ref
  ) => {
    // Handle ESC key press
    const handleEscKey = useCallback(
      (event: KeyboardEvent) => {
        if (closeOnEsc && event.key === 'Escape') {
          onClose();
        }
      },
      [closeOnEsc, onClose]
    );

    useEffect(() => {
      if (isOpen) {
        document.addEventListener('keydown', handleEscKey);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscKey);
        document.body.style.overflow = 'unset';
      };
    }, [isOpen, handleEscKey]);

    // Handle overlay click
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    };

    // Don't render anything if modal is not open
    if (!isOpen) return null;

    return createPortal(
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            className={cn(
              'fixed inset-0 z-50 flex items-center justify-center p-4',
              className
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Overlay */}
            <motion.div
              className={cn(
                'absolute inset-0 bg-black/60 backdrop-blur-sm',
                overlayClassName
              )}
              onClick={handleOverlayClick}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal Content */}
            <motion.div
              ref={ref}
              className={cn(
                'relative w-full bg-background rounded-lg shadow-xl',
                sizeClasses[size],
                contentClassName
              )}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-start justify-between p-6 border-b">
                  <div>
                    {title && (
                      <h2 className="text-xl font-semibold text-foreground">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                  {showCloseButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-4 -mr-2 -mt-2"
                      onClick={onClose}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="p-6">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="flex items-center justify-end gap-2 p-6 border-t">
                  {footer}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }
);

Modal.displayName = 'Modal';

// Compound components for better composition
export const ModalHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={cn('mb-4', className)}>{children}</div>;

export const ModalBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={cn('', className)}>{children}</div>;

export const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('flex items-center justify-end gap-2 mt-6', className)}>
    {children}
  </div>
);

export { Modal };
