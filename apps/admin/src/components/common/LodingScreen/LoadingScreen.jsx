/**
 * EATECH - Loading Screen Component
 * File Path: /apps/admin/src/components/common/LoadingScreen/LoadingScreen.jsx
 */

import React from 'react';
import styles from './LoadingScreen.module.css';

const LoadingScreen = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
        </div>
        <h2 className={styles.title}>EATECH</h2>
        <p className={styles.text}>Wird geladen...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;

/* CSS Module Content
 * File Path: /apps/admin/src/components/common/LoadingScreen/LoadingScreen.module.css
 */
const cssContent = `
.container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  z-index: 9999;
}

.content {
  text-align: center;
}

.loader {
  width: 60px;
  height: 60px;
  margin: 0 auto 2rem;
  position: relative;
}

.spinner {
  width: 100%;
  height: 100%;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.text {
  color: var(--text-secondary);
  font-size: 1rem;
}
`;