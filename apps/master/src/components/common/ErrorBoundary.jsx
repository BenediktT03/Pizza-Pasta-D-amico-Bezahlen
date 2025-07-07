import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, FileText } from 'lucide-react';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Send error to logging service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // Here you would send the error to your error tracking service
    // e.g., Sentry, LogRocket, etc.
    const errorData = {
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // For now, just log to console
    console.log('Error logged:', errorData);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/master';
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.iconContainer}>
              <AlertTriangle size={64} className={styles.icon} />
            </div>
            
            <h1 className={styles.title}>Oops! Etwas ist schiefgelaufen</h1>
            
            <p className={styles.message}>
              Es ist ein unerwarteter Fehler aufgetreten. Unser Team wurde benachrichtigt 
              und arbeitet an einer Lösung.
            </p>

            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={this.handleReload}>
                <RefreshCw size={20} />
                <span>Seite neu laden</span>
              </button>
              
              <button className={styles.secondaryButton} onClick={this.handleGoHome}>
                <Home size={20} />
                <span>Zur Startseite</span>
              </button>
            </div>

            <button className={styles.detailsButton} onClick={this.toggleDetails}>
              <FileText size={16} />
              <span>{this.state.showDetails ? 'Details ausblenden' : 'Details anzeigen'}</span>
            </button>

            {this.state.showDetails && (
              <div className={styles.errorDetails}>
                <h3>Fehlerdetails</h3>
                
                <div className={styles.errorSection}>
                  <h4>Fehlermeldung:</h4>
                  <pre>{this.state.error && this.state.error.toString()}</pre>
                </div>
                
                <div className={styles.errorSection}>
                  <h4>Stack Trace:</h4>
                  <pre>{this.state.error && this.state.error.stack}</pre>
                </div>
                
                <div className={styles.errorSection}>
                  <h4>Component Stack:</h4>
                  <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                </div>

                <div className={styles.errorMeta}>
                  <p><strong>Zeitstempel:</strong> {new Date().toLocaleString('de-CH')}</p>
                  <p><strong>URL:</strong> {window.location.href}</p>
                  <p><strong>User Agent:</strong> {navigator.userAgent}</p>
                </div>
              </div>
            )}

            <div className={styles.helpText}>
              <p>
                Wenn das Problem weiterhin besteht, kontaktieren Sie bitte unseren Support unter{' '}
                <a href="mailto:support@eatech.ch">support@eatech.ch</a>
              </p>
              <p className={styles.errorId}>
                Fehler-ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;