/**
 * EATECH - Button Component
 * Version: 2.0.0
 * Description: Wiederverwendbare Button-Komponente mit Lazy Loading für Icons
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /packages/ui/src/components/Button/Button.jsx
 */

import React, { forwardRef, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import styled, { css, keyframes } from 'styled-components';

// Lazy load icon components
const Loader2 = lazy(() => import('lucide-react').then(mod => ({ default: mod.Loader2 })));

// Animations
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const ripple = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

// Base button styles
const buttonBase = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  outline: none;
  overflow: hidden;
  
  &:focus-visible {
    outline: 2px solid ${props => props.theme?.colors?.focus || '#3b82f6'};
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  /* Ripple effect */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    background: rgba(255, 255, 255, 0.5);
    opacity: 0;
    border-radius: 100%;
    transform: scale(1, 1) translate(-50%);
    transform-origin: 50% 50%;
  }
  
  &:active::after {
    animation: ${ripple} 0.6s ease-out;
  }
`;

// Size variants
const sizeVariants = {
  xs: css`
    height: 28px;
    padding: 0 8px;
    font-size: 12px;
    border-radius: 4px;
  `,
  sm: css`
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
    border-radius: 5px;
  `,
  md: css`
    height: 36px;
    padding: 0 16px;
    font-size: 14px;
    border-radius: 6px;
  `,
  lg: css`
    height: 40px;
    padding: 0 20px;
    font-size: 16px;
    border-radius: 8px;
  `,
  xl: css`
    height: 48px;
    padding: 0 24px;
    font-size: 18px;
    border-radius: 10px;
  `
};

// Style variants
const variants = {
  primary: css`
    background: ${props => props.theme?.colors?.primary || '#ff6b6b'};
    color: white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    
    &:hover:not(:disabled) {
      background: ${props => props.theme?.colors?.primaryDark || '#ff5252'};
      box-shadow: 0 4px 8px rgba(255, 107, 107, 0.25);
      transform: translateY(-1px);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 4px rgba(255, 107, 107, 0.3);
    }
  `,
  
  secondary: css`
    background: ${props => props.theme?.colors?.secondary || '#f3f4f6'};
    color: ${props => props.theme?.colors?.text || '#1f2937'};
    
    &:hover:not(:disabled) {
      background: ${props => props.theme?.colors?.secondaryDark || '#e5e7eb'};
    }
  `,
  
  outline: css`
    background: transparent;
    color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
    border: 2px solid ${props => props.theme?.colors?.primary || '#ff6b6b'};
    
    &:hover:not(:disabled) {
      background: ${props => props.theme?.colors?.primaryLight || 'rgba(255, 107, 107, 0.1)'};
    }
  `,
  
  ghost: css`
    background: transparent;
    color: ${props => props.theme?.colors?.text || '#1f2937'};
    
    &:hover:not(:disabled) {
      background: ${props => props.theme?.colors?.backgroundHover || 'rgba(0, 0, 0, 0.05)'};
    }
  `,
  
  danger: css`
    background: ${props => props.theme?.colors?.danger || '#ef4444'};
    color: white;
    
    &:hover:not(:disabled) {
      background: ${props => props.theme?.colors?.dangerDark || '#dc2626'};
    }
  `,
  
  success: css`
    background: ${props => props.theme?.colors?.success || '#10b981'};
    color: white;
    
    &:hover:not(:disabled) {
      background: ${props => props.theme?.colors?.successDark || '#059669'};
    }
  `
};

// Styled components
const StyledButton = styled.button`
  ${buttonBase}
  ${props => sizeVariants[props.size]}
  ${props => variants[props.variant]}
  
  ${props => props.fullWidth && css`
    width: 100%;
  `}
  
  ${props => props.loading && css`
    color: transparent;
    pointer-events: none;
  `}
  
  ${props => props.iconOnly && css`
    padding: 0;
    width: ${props => {
      const sizes = { xs: '28px', sm: '32px', md: '36px', lg: '40px', xl: '48px' };
      return sizes[props.size];
    }};
  `}
`;

const LoadingSpinner = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
  
  svg {
    animation: ${spin} 0.8s linear infinite;
  }
`;

const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  line-height: 0;
  
  ${props => props.position === 'left' && css`
    margin-right: ${props => props.iconOnly ? 0 : '6px'};
  `}
  
  ${props => props.position === 'right' && css`
    margin-left: ${props => props.iconOnly ? 0 : '6px'};
  `}
`;

// Loading fallback for icons
const IconLoading = () => (
  <span style={{ display: 'inline-block', width: '1em', height: '1em' }} />
);

// Button component
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  iconOnly = false,
  type = 'button',
  as,
  href,
  target,
  rel,
  onClick,
  className,
  style,
  ...props
}, ref) => {
  // Determine component type
  const Component = as || (href ? 'a' : StyledButton);
  
  // Handle click
  const handleClick = (e) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    
    // Add ripple effect coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--ripple-x', `${x}px`);
    e.currentTarget.style.setProperty('--ripple-y', `${y}px`);
    
    if (onClick) {
      onClick(e);
    }
  };
  
  // Prepare props
  const buttonProps = {
    ref,
    variant,
    size,
    fullWidth,
    loading: loading ? 'true' : undefined,
    disabled: disabled || loading,
    iconOnly,
    type: Component === StyledButton ? type : undefined,
    href,
    target,
    rel: target === '_blank' ? 'noopener noreferrer' : rel,
    onClick: handleClick,
    className,
    style,
    ...props
  };
  
  return (
    <Component {...buttonProps}>
      {/* Left Icon */}
      {leftIcon && !loading && (
        <IconWrapper position="left" iconOnly={iconOnly}>
          <Suspense fallback={<IconLoading />}>
            {typeof leftIcon === 'function' ? leftIcon() : leftIcon}
          </Suspense>
        </IconWrapper>
      )}
      
      {/* Content */}
      {!iconOnly && children}
      
      {/* Right Icon */}
      {rightIcon && !loading && (
        <IconWrapper position="right" iconOnly={iconOnly}>
          <Suspense fallback={<IconLoading />}>
            {typeof rightIcon === 'function' ? rightIcon() : rightIcon}
          </Suspense>
        </IconWrapper>
      )}
      
      {/* Loading Spinner */}
      {loading && (
        <LoadingSpinner>
          <Suspense fallback={<span>...</span>}>
            <Loader2 size={size === 'xs' ? 14 : size === 'sm' ? 16 : 18} />
          </Suspense>
        </LoadingSpinner>
      )}
    </Component>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'danger', 'success']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  fullWidth: PropTypes.bool,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  leftIcon: PropTypes.oneOfType([PropTypes.element, PropTypes.func]),
  rightIcon: PropTypes.oneOfType([PropTypes.element, PropTypes.func]),
  iconOnly: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  as: PropTypes.elementType,
  href: PropTypes.string,
  target: PropTypes.string,
  rel: PropTypes.string,
  onClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object
};

// Export variants for external use
export const ButtonVariants = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  OUTLINE: 'outline',
  GHOST: 'ghost',
  DANGER: 'danger',
  SUCCESS: 'success'
};

export const ButtonSizes = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl'
};

export default Button;