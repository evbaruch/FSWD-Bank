import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import styles from './OAuthCallbackPage.module.css';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken');
        const userParam = searchParams.get('user');
        const errorParam = searchParams.get('error');

        if (errorParam) {
          setStatus('error');
          setError(getErrorMessage(errorParam));
          return;
        }

        if (!token || !refreshToken || !userParam) {
          setStatus('error');
          setError('Invalid OAuth response. Please try again.');
          return;
        }

        // Parse user data
        const user = JSON.parse(decodeURIComponent(userParam));

        // Handle the OAuth callback
        const result = authService.handleGoogleCallback(token, refreshToken, user);

        if (result.success) {
          // Update auth context
          login(result.data.user, result.data.token);
          
          setStatus('success');
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
          setError('Failed to complete authentication. Please try again.');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setError('An unexpected error occurred. Please try again.');
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, login]);

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'account_inactive':
        return 'Your account is not active. Please contact support.';
      case 'oauth_failed':
        return 'OAuth authentication failed. Please try again.';
      case 'access_denied':
        return 'Access was denied. Please try again.';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  const handleRetry = () => {
    navigate('/login');
  };

  if (status === 'processing') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <h2>Completing Authentication</h2>
            <p>Please wait while we complete your Google sign-in...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h2>Authentication Successful!</h2>
            <p>Welcome to FSWD Bank. Redirecting you to your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.error}>
          <div className={styles.errorIcon}>✗</div>
          <h2>Authentication Failed</h2>
          <p>{error}</p>
          <button onClick={handleRetry} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallbackPage; 