/**
 * EATECH - Component Template mit Theme Support
 * Dies ist ein Beispiel, wie neue Components erstellt werden sollten
 * File Path: /apps/admin/src/components/[ComponentName]/[ComponentName].jsx
 */

import React from 'react';
import styles from './[ComponentName].module.css';

const ComponentTemplate = () => {
  return (
    <div className={styles.container}>
      {/* Standard Card mit Theme-Variablen */}
      <div className={styles.card}>
        <h2 className={styles.title}>Theme-Ready Component</h2>
        <p className={styles.description}>
          Diese Component nutzt automatisch die Theme-Variablen
        </p>
      </div>
      
      {/* Glass-Effect Card */}
      <div className={`${styles.card} ${styles.glass}`}>
        <h3>Glass Morphism</h3>
        <p>Mit Backdrop-Filter und Theme-Farben</p>
      </div>
      
      {/* Buttons mit Theme-Farben */}
      <div className={styles.buttonGroup}>
        <button className={styles.btnPrimary}>Primary Button</button>
        <button className={styles.btnSecondary}>Secondary Button</button>
      </div>
      
      {/* Status-Farben */}
      <div className={styles.statusGroup}>
        <span className={styles.success}>Success</span>
        <span className={styles.warning}>Warning</span>
        <span className={styles.error}>Error</span>
        <span className={styles.info}>Info</span>
      </div>
    </div>
  );
};

export default ComponentTemplate;

/* ============================================================================
   CSS MODULE TEMPLATE
   ============================================================================ */
/**
 * File Path: /apps/admin/src/components/[ComponentName]/[ComponentName].module.css
 */

/*
.container {
  padding: var(--space-lg);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  margin-bottom: var(--space-lg);
  transition: all var(--transition-base);
}

.card:hover {
  background: var(--bg-tertiary);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.title {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.description {
  color: var(--text-secondary);
  line-height: 1.6;
}

.buttonGroup {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.btnPrimary,
.btnSecondary {
  padding: var(--space-sm) var(--space-lg);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btnPrimary {
  background: var(--primary);
  color: white;
}

.btnPrimary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btnSecondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btnSecondary:hover {
  background: var(--bg-elevated);
  border-color: var(--primary);
}

.statusGroup {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.success { color: var(--success); }
.warning { color: var(--warning); }
.error { color: var(--error); }
.info { color: var(--info); }
*/