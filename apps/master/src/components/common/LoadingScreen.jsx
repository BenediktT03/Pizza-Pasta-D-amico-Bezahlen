import React from 'react';
import { Loader } from 'lucide-react';
import styles from './LoadingScreen.module.css';

const LoadingScreen = ({ fullScreen = false, message = 'Laden...' }) => {
  const containerClass = fullScreen ? styles.fullScreen : styles.inline;

  return (
    <div className={`${styles.container} ${containerClass}`}>
      <div className={styles.content}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <span className={styles.logoText}>EATECH</span>
            <span className={styles.logoSub}>MASTER</span>
          </div>
          <div className={styles.spinner}>
            <Loader size={32} />
          </div>
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.progressBar}>
          <div className={styles.progressFill}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;