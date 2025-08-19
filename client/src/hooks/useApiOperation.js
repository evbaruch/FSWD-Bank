import { useState, useCallback } from 'react';
import { getErrorMessage, isRetryableError, getRetryDelay, getErrorType, ERROR_TYPES } from '../utils/errorHandler';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const useApiOperation = (operationName = 'API operation') => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const execute = useCallback(async (apiCall, options = {}) => {
    const {
      maxRetries = 3,
      onSuccess,
      onError,
      onRetry,
      showError = true,
      autoLogout = true
    } = options;

    setIsLoading(true);
    setError(null);
    setRetryCount(0);

    const attemptOperation = async (attempt = 0) => {
      try {
        const result = await apiCall();
        
        // Success
        setIsLoading(false);
        setError(null);
        setRetryCount(0);
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
        
      } catch (error) {
        const errorType = getErrorType(error);
        const errorMessage = getErrorMessage(error);
        
        // Handle authentication errors
        if (errorType === ERROR_TYPES.AUTHENTICATION && autoLogout) {
          setIsLoading(false);
          setError('Your session has expired. Redirecting to login...');
          
          // Logout and redirect after a short delay
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 2000);
          
          return;
        }
        
        // Handle authorization errors
        if (errorType === ERROR_TYPES.AUTHORIZATION) {
          setIsLoading(false);
          setError(errorMessage);
          
          if (onError) {
            onError(error, errorType);
          }
          
          return;
        }
        
        // Check if we should retry
        if (attempt < maxRetries && isRetryableError(error)) {
          const delay = getRetryDelay(error, attempt + 1);
          
          setRetryCount(attempt + 1);
          
          if (onRetry) {
            onRetry(error, attempt + 1, delay);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return attemptOperation(attempt + 1);
        }
        
        // Final error - no more retries
        setIsLoading(false);
        setError(showError ? errorMessage : null);
        setRetryCount(0);
        
        if (onError) {
          onError(error, errorType);
        }
        
        throw error;
        
      }
    };

    return attemptOperation();
  }, [logout, navigate]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    execute,
    isLoading,
    error,
    retryCount,
    clearError
  };
};

// Specialized hooks for common operations
export const useApiGet = (operationName) => {
  return useApiOperation(operationName);
};

export const useApiPost = (operationName) => {
  return useApiOperation(operationName);
};

export const useApiPut = (operationName) => {
  return useApiOperation(operationName);
};

export const useApiDelete = (operationName) => {
  return useApiOperation(operationName);
}; 