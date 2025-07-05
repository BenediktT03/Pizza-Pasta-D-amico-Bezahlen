/**
 * EATECH Button Component
 * Reusable button with multiple variants and states
 * File Path: /packages/ui/src/components/Button/Button.jsx
 */

import React, { forwardRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Loader2 } from 'lucide-react';

// Animations
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Base Button Styles
const buttonBase = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: ${props => props.theme?.fonts?.body || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
  font-weight: 500;
  border: none;
  border-radius: ${props => props.theme?.radii?.[props.rounded] || '8px'};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  text-decoration: none;
  outline: none;
  user-select: none;
  
  &:focus-visible {
    box-shadow: 0 0 0 3px ${props => props.theme?.colors?.focus || 'rgba(255, 107, 107, 0.2)'};
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

// Size Variants
const sizeVariants = {
  xs: css`
    height: 32px;
    padding: 0 12px;
    font-size: 12px;
  `,
  sm: css`
    height: 36px;
    padding: 0 16px;
    font-size: 13px;
  `,
  md: css`
    height: 40px;
    padding: 0 20px;
    font-size: 14px;
  `,
  lg: css`
    height: 48px;
    padding: 0 24px;
    font-size: 16px;
  `,
  xl: css`
    height: 56px;
    padding: 0 32px;
    font-size: 18px;
  `
};

// Style Variants
const variants = {
  primary: css`
    background: ${props => props.theme?.colors?.primary || '#ff6b6b'};
    color: white;
    
    &:hover:not(:disabled) {
      background: ${props => props.theme?.colors?.primaryDark || '#ff5252'};
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
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

// Styled Button
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
      const sizes = { xs: '32px', sm: '36px', md: '40px', lg: '48px', xl: '56px' };
      return sizes[props.size];
    }};
  `}
`;

// Loading Spinner
const LoadingSpinner = styled(Loader2)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ${spin} 0.8s linear infinite;
  color: currentColor;
`;

// Icon Wrapper
const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  
  ${props => props.position === 'left' && css`
    margin-right: ${props => props.iconOnly ? 0 : '4px'};
  `}
  
  ${props => props.position === 'right' && css`
    margin-left: ${props => props.iconOnly ? 0 : '4px'};
  `}
`;

// Button Component
const Button = forwardRef((
  {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    fullWidth = false,
    leftIcon = null,
    rightIcon = null,
    iconOnly = false,
    rounded = 'md',
    className,
    onClick,
    ...props
  },
  ref
) => {
  const handleClick = (e) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  // Icon size based on button size
  const iconSize = {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 24
  }[size];

  return (
    <StyledButton
      ref={ref}
      type={type}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      loading={loading}
      fullWidth={fullWidth}
      iconOnly={iconOnly}
      rounded={rounded}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {loading && <LoadingSpinner size={iconSize} />}
      
      {leftIcon && !loading && (
        <IconWrapper position="left" iconOnly={iconOnly}>
          {React.cloneElement(leftIcon, { size: iconSize })}
        </IconWrapper>
      )}
      
      {!iconOnly && children}
      
      {rightIcon && !loading && (
        <IconWrapper position="right" iconOnly={iconOnly}>
          {React.cloneElement(rightIcon, { size: iconSize })}
        </IconWrapper>
      )}
    </StyledButton>
  );
});

Button.displayName = 'Button';

// Button Group Component
export const ButtonGroup = styled.div`
  display: inline-flex;
  gap: ${props => props.gap || '8px'};
  
  ${props => props.vertical && css`
    flex-direction: column;
  `}
  
  ${props => props.attached && css`
    gap: 0;
    
    ${StyledButton} {
      border-radius: 0;
      
      &:first-child {
        border-top-left-radius: ${props => props.theme?.radii?.md || '8px'};
        border-bottom-left-radius: ${props => props.theme?.radii?.md || '8px'};
      }
      
      &:last-child {
        border-top-right-radius: ${props => props.theme?.radii?.md || '8px'};
        border-bottom-right-radius: ${props => props.theme?.radii?.md || '8px'};
      }
      
      &:not(:last-child) {
        border-right: 1px solid rgba(0, 0, 0, 0.1);
      }
    }
  `}
`;

export default Button;