import React from 'react';
import { AlertCircle, RefreshCw, X, AlertTriangle, Info } from 'lucide-react';
import { getErrorSeverity, getErrorType, ERROR_TYPES } from '../../../utils/errorHandler';
import styles from './ErrorDisplay.module.css';

const ErrorDisplay = ({ 
  error, 
  onRetry, 
  onDismiss, 
  retryCount = 0,
  showRetry = true,
  className = '',
  context = ''
}) => {
  if (!error) return null;

  const severity = getErrorSeverity(error);
  const errorType = getErrorType(error);
  
  const getIcon = () => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className={styles.icon} />;
      case 'warning':
        return <AlertTriangle className={styles.icon} />;
      case 'info':
        return <Info className={styles.icon} />;
      default:
        return <AlertCircle className={styles.icon} />;
    }
  };

  const getSeverityClass = () => {
    switch (severity) {
      case 'critical':
        return styles.critical;
      case 'warning':
        return styles.warning;
      case 'info':
        return styles.info;
      default:
        return styles.error;
    }
  };

  const getActionText = () => {
    if (errorType === ERROR_TYPES.AUTHENTICATION) {
      return 'Redirecting to login...';
    }
    
    if (errorType === ERROR_TYPES.AUTHORIZATION) {
      return 'Contact support if you believe this is an error.';
    }
    
    if (retryCount > 0) {
      return `Retry attempt ${retryCount} of 3`;
    }
    
    return 'Please try again.';
  };

  return (
    <div className={`${styles.container} ${getSeverityClass()} ${className}`}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          {getIcon()}
        </div>
        
        <div className={styles.messageContainer}>
          <p className={styles.message}>{error}</p>
          <p className={styles.actionText}>{getActionText()}</p>
          
          {context && (
            <p className={styles.context}>Context: {context}</p>
          )}
        </div>
        
        <div className={styles.actions}>
          {showRetry && onRetry && errorType !== ERROR_TYPES.AUTHENTICATION && errorType !== ERROR_TYPES.AUTHORIZATION && (
            <button
              onClick={onRetry}
              className={styles.retryButton}
              disabled={retryCount >= 3}
            >
              <RefreshCw className={styles.retryIcon} />
              Retry
            </button>
          )}
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={styles.dismissButton}
              aria-label="Dismiss error"
            >
              <X className={styles.dismissIcon} />
            </button>
          )}
        </div>
      </div>
      
      {retryCount > 0 && retryCount < 3 && (
        <div className={styles.retryInfo}>
          <RefreshCw className={styles.retrySpinner} />
          <span>Retrying... ({retryCount}/3)</span>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay; 