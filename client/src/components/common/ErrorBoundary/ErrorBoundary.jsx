import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import ErrorDisplay from '../ErrorDisplay/ErrorDisplay';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and any error reporting service
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Something went wrong';
      const errorContext = this.props.context || 'Application error';

      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.iconContainer}>
              <AlertTriangle className={styles.icon} />
            </div>
            
            <div className={styles.messageContainer}>
              <h1 className={styles.title}>Oops! Something went wrong</h1>
              <p className={styles.message}>
                We encountered an unexpected error. This has been logged and our team will investigate.
              </p>
              
              <ErrorDisplay
                error={errorMessage}
                onRetry={this.handleRetry}
                context={errorContext}
                showRetry={true}
              />
              
              <div className={styles.actions}>
                <button
                  onClick={this.handleGoHome}
                  className={styles.homeButton}
                >
                  <Home className={styles.buttonIcon} />
                  Go to Home
                </button>
                
                <button
                  onClick={this.handleRetry}
                  className={styles.retryButton}
                >
                  <RefreshCw className={styles.buttonIcon} />
                  Try Again
                </button>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className={styles.errorDetails}>
                  <summary>Error Details (Development)</summary>
                  <pre className={styles.errorStack}>
                    {this.state.error && this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 