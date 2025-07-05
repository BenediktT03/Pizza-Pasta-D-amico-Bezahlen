import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#FF6B6B', marginBottom: '1rem' }}>
            Oops! Etwas ist schief gelaufen
          </h1>
          <p style={{ color: '#888', marginBottom: '2rem' }}>
            Es ist ein unerwarteter Fehler aufgetreten.
          </p>
          <button 
            className="btn"
            onClick={() => window.location.href = '/'}
          >
            Zurück zum Dashboard
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '2rem', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#FF6B6B' }}>
                Fehlerdetails (nur in Entwicklung)
              </summary>
              <pre style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#1A1A1A',
                borderRadius: '8px',
                overflow: 'auto'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
