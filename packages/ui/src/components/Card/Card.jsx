/**
 * EATECH Card Component
 * Flexible container component for content
 * File Path: /packages/ui/src/components/Card/Card.jsx
 */

import React from 'react';
import styled, { css } from 'styled-components';

// Card Container
const CardContainer = styled.div`
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border-radius: ${props => props.theme?.radii?.[props.rounded] || '12px'};
  transition: all 0.2s ease;
  position: relative;
  overflow: ${props => props.overflow || 'hidden'};
  
  ${props => props.variant === 'outlined' && css`
    border: 1px solid ${props.theme?.colors?.border || '#e5e7eb'};
  `}
  
  ${props => props.variant === 'elevated' && css`
    box-shadow: ${props.theme?.shadows?.sm || '0 1px 3px rgba(0, 0, 0, 0.1)'};
  `}
  
  ${props => props.variant === 'shadow' && css`
    box-shadow: ${props.theme?.shadows?.md || '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'};
  `}
  
  ${props => props.hoverable && css`
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${props.theme?.shadows?.lg || '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'};
    }
  `}
  
  ${props => props.interactive && css`
    cursor: pointer;
    user-select: none;
    
    &:active {
      transform: scale(0.98);
    }
  `}
  
  ${props => props.selected && css`
    border: 2px solid ${props.theme?.colors?.primary || '#ff6b6b'};
    box-shadow: 0 0 0 3px ${props.theme?.colors?.primaryLight || 'rgba(255, 107, 107, 0.1)'};
  `}
  
  ${props => props.disabled && css`
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  `}
  
  ${props => props.fullHeight && css`
    height: 100%;
  `}
`;

// Card Header
const CardHeader = styled.div`
  padding: ${props => props.compact ? '16px' : '24px'};
  border-bottom: ${props => props.divided ? `1px solid ${props.theme?.colors?.border || '#e5e7eb'}` : 'none'};
  
  ${props => props.sticky && css`
    position: sticky;
    top: 0;
    background: ${props.theme?.colors?.background || '#ffffff'};
    z-index: 10;
  `}
`;

// Card Body
const CardBody = styled.div`
  padding: ${props => props.noPadding ? '0' : props.compact ? '16px' : '24px'};
  flex: 1;
  
  ${props => props.scrollable && css`
    overflow-y: auto;
    max-height: ${props.maxHeight || '400px'};
  `}
`;

// Card Footer
const CardFooter = styled.div`
  padding: ${props => props.compact ? '16px' : '24px'};
  border-top: ${props => props.divided ? `1px solid ${props.theme?.colors?.border || '#e5e7eb'}` : 'none'};
  
  ${props => props.sticky && css`
    position: sticky;
    bottom: 0;
    background: ${props.theme?.colors?.background || '#ffffff'};
    z-index: 10;
  `}
`;

// Card Title
const CardTitle = styled.h3`
  margin: 0;
  font-size: ${props => props.size === 'sm' ? '16px' : props.size === 'lg' ? '24px' : '20px'};
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  line-height: 1.3;
`;

// Card Subtitle
const CardSubtitle = styled.p`
  margin: 4px 0 0 0;
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  line-height: 1.5;
`;

// Card Actions
const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.gap || '12px'};
  margin-top: ${props => props.noMargin ? '0' : '16px'};
  
  ${props => props.align === 'right' && css`
    justify-content: flex-end;
  `}
  
  ${props => props.align === 'center' && css`
    justify-content: center;
  `}
  
  ${props => props.align === 'between' && css`
    justify-content: space-between;
  `}
`;

// Card Media
const CardMedia = styled.div`
  position: relative;
  width: 100%;
  padding-top: ${props => props.ratio || '56.25%'}; // 16:9 default
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f3f4f6'};
  overflow: hidden;
  
  ${props => props.src && css`
    background-image: url(${props.src});
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  `}
  
  & > * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

// Card Badge
const CardBadge = styled.div`
  position: absolute;
  top: ${props => props.top || '16px'};
  right: ${props => props.right || props.left ? 'auto' : '16px'};
  left: ${props => props.left || 'auto'};
  bottom: ${props => props.bottom || 'auto'};
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: ${props => props.color || props.theme?.colors?.primary || '#ff6b6b'};
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  z-index: 1;
`;

// Card Overlay
const CardOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => props.gradient 
    ? `linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.7) 100%)`
    : props.color || 'rgba(0, 0, 0, 0.4)'
  };
  display: flex;
  align-items: ${props => props.align || 'flex-end'};
  justify-content: ${props => props.justify || 'flex-start'};
  padding: 24px;
  color: white;
`;

// Main Card Component
const Card = ({ 
  children, 
  variant = 'elevated',
  rounded = 'md',
  hoverable = false,
  interactive = false,
  selected = false,
  disabled = false,
  fullHeight = false,
  overflow = 'hidden',
  className,
  onClick,
  ...props 
}) => {
  return (
    <CardContainer
      variant={variant}
      rounded={rounded}
      hoverable={hoverable}
      interactive={interactive}
      selected={selected}
      disabled={disabled}
      fullHeight={fullHeight}
      overflow={overflow}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </CardContainer>
  );
};

// Export components
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Title = CardTitle;
Card.Subtitle = CardSubtitle;
Card.Actions = CardActions;
Card.Media = CardMedia;
Card.Badge = CardBadge;
Card.Overlay = CardOverlay;

export default Card;