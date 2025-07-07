import React from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import styles from './MasterCard.module.css';

const MasterCard = ({
  title,
  subtitle,
  icon: Icon,
  children,
  onClick,
  href,
  variant = 'default',
  size = 'medium',
  padding = true,
  hoverable = true,
  badge,
  badgeType = 'default',
  actions,
  className = ''
}) => {
  const CardWrapper = href ? 'a' : onClick ? 'div' : 'div';
  const isClickable = href || onClick;

  const cardClasses = [
    styles.card,
    styles[variant],
    styles[size],
    padding ? styles.padded : '',
    hoverable && isClickable ? styles.hoverable : '',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <CardWrapper
      className={cardClasses}
      onClick={handleClick}
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {(title || subtitle || Icon || badge) && (
        <div className={styles.header}>
          <div className={styles.headerContent}>
            {Icon && (
              <div className={styles.iconWrapper}>
                <Icon size={24} />
              </div>
            )}
            <div className={styles.titleSection}>
              {title && <h3 className={styles.title}>{title}</h3>}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          </div>
          <div className={styles.headerRight}>
            {badge && (
              <span className={`${styles.badge} ${styles[`badge-${badgeType}`]}`}>
                {badge}
              </span>
            )}
            {actions && (
              <div className={styles.actions}>
                {actions}
              </div>
            )}
            {isClickable && (
              <div className={styles.arrow}>
                {href?.startsWith('http') ? (
                  <ExternalLink size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {children && (
        <div className={styles.content}>
          {children}
        </div>
      )}
    </CardWrapper>
  );
};

// Card Section Component for grouping content
export const MasterCardSection = ({ title, children, className = '' }) => {
  return (
    <div className={`${styles.section} ${className}`}>
      {title && <h4 className={styles.sectionTitle}>{title}</h4>}
      {children}
    </div>
  );
};

// Card Stat Component for displaying metrics
export const MasterCardStat = ({ label, value, trend, trendType = 'neutral' }) => {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statValue}>
        <span>{value}</span>
        {trend && (
          <span className={`${styles.statTrend} ${styles[`trend-${trendType}`]}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export default MasterCard;