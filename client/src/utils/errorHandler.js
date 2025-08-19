// Error handling utility for frontend
export const getErrorMessage = (error, defaultMessage = 'An error occurred') => {
  // Handle axios error responses
  if (error.response) {
    const { status, data } = error.response;
    
    // Server error responses
    switch (status) {
      case 400:
        return data?.error || data?.message || 'Invalid request. Please check your input and try again.';
      
      case 401:
        return 'Your session has expired. Please log in again.';
      
      case 403:
        return 'You do not have permission to perform this action.';
      
      case 404:
        return 'The requested resource was not found.';
      
      case 409:
        return data?.error || 'This resource already exists.';
      
      case 422:
        return data?.error || 'Validation failed. Please check your input.';
      
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      
      case 500:
        return 'Server error. Please try again later.';
      
      case 502:
        return 'Service temporarily unavailable. Please try again later.';
      
      case 503:
        return 'Service is currently down for maintenance. Please try again later.';
      
      default:
        return data?.error || data?.message || `Server error (${status}). Please try again.`;
    }
  }
  
  // Network errors
  if (error.request) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please check your connection and try again.';
    }
    return 'Network error. Please check your internet connection and try again.';
  }
  
  // Other errors
  if (error.message) {
    return error.message;
  }
  
  return defaultMessage;
};

// Get error severity for UI styling
export const getErrorSeverity = (error) => {
  if (error.response) {
    const { status } = error.response;
    
    // Critical errors (user action required)
    if (status === 401 || status === 403) {
      return 'critical';
    }
    
    // Warning errors (user can retry)
    if (status === 404 || status === 409 || status === 422) {
      return 'warning';
    }
    
    // Info errors (system issues)
    if (status >= 500) {
      return 'info';
    }
  }
  
  // Network errors
  if (error.request) {
    return 'warning';
  }
  
  return 'error';
};

// Check if error is retryable
export const isRetryableError = (error) => {
  if (error.response) {
    const { status } = error.response;
    
    // Retryable status codes
    return [408, 429, 500, 502, 503, 504].includes(status);
  }
  
  // Network errors are retryable
  if (error.request) {
    return true;
  }
  
  return false;
};

// Get retry delay based on error type
export const getRetryDelay = (error, attempt = 1) => {
  if (error.response?.status === 429) {
    // Rate limiting - exponential backoff
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }
  
  if (error.response?.status >= 500) {
    // Server errors - shorter delay
    return Math.min(1000 * attempt, 5000);
  }
  
  // Network errors - standard delay
  return 1000 * attempt;
};

// Format error for logging
export const formatErrorForLogging = (error, context = '') => {
  const errorInfo = {
    message: error.message,
    context,
    timestamp: new Date().toISOString()
  };
  
  if (error.response) {
    errorInfo.status = error.response.status;
    errorInfo.statusText = error.response.statusText;
    errorInfo.data = error.response.data;
  }
  
  if (error.request) {
    errorInfo.request = 'Network error';
    errorInfo.code = error.code;
  }
  
  return errorInfo;
};

// Error types for consistent handling
export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  UNKNOWN: 'unknown'
};

// Get error type
export const getErrorType = (error) => {
  if (error.response) {
    const { status } = error.response;
    
    if (status === 401) return ERROR_TYPES.AUTHENTICATION;
    if (status === 403) return ERROR_TYPES.AUTHORIZATION;
    if (status === 404) return ERROR_TYPES.NOT_FOUND;
    if (status === 400 || status === 422) return ERROR_TYPES.VALIDATION;
    if (status >= 500) return ERROR_TYPES.SERVER;
  }
  
  if (error.request) return ERROR_TYPES.NETWORK;
  
  return ERROR_TYPES.UNKNOWN;
}; 