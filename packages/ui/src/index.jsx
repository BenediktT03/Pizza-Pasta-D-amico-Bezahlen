/**
 * EATECH - UI Package
 * Version: 1.0.0
 * Description: Shared UI components
 * File Path: /packages/ui/src/index.js
 */

import React from 'react';

// Card component
export const Card = ({ children, className = '' }) => {
    return (
        <div className={`card ${className}`} style={{
            backgroundColor: '#141414',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '1.5rem'
        }}>
            {children}
        </div>
    );
};

// Button component
export const Button = ({ children, onClick, variant = 'primary', ...props }) => {
    const styles = {
        primary: {
            backgroundColor: '#FF6B6B',
            color: 'white'
        },
        secondary: {
            backgroundColor: '#4ECDC4',
            color: 'white'
        }
    };

    return (
        <button
            onClick={onClick}
            style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                ...styles[variant]
            }}
            {...props}
        >
            {children}
        </button>
    );
};

// Export all components
export default { Card, Button };