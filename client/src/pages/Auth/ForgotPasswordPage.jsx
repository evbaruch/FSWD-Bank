import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Input } from '../../components/common';
import { authService } from '../../services/authService';
import styles from './ForgotPasswordPage.module.css';

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authService.forgotPassword(data.email);
      
      if (response.data.success) {
        setIsSuccess(true);
      } else {
        setError(response.data.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error.response?.data?.error || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.successContainer}>
            <div className={styles.successIcon}>
              <CheckCircle className={styles.icon} />
            </div>
            
            <h2 className={styles.successTitle}>
              Check Your Email
            </h2>
            
            <p className={styles.successMessage}>
              We've sent a password reset link to your email address. 
              Please check your inbox and follow the instructions to reset your password.
            </p>
            
            <div className={styles.successActions}>
              <Link to="/login" className={styles.backToLogin}>
                <ArrowLeft className={styles.backIcon} />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <Link to="/login" className={styles.backLink}>
            <ArrowLeft className={styles.backIcon} />
            Back to Login
          </Link>
          
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <Mail className={styles.logoIcon} />
            </div>
          </div>
          
          <h2 className={styles.title}>
            Forgot Password
          </h2>
          <p className={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorContainer}>
            <AlertCircle className={styles.errorIcon} />
            <span className={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Forgot Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <Input
              type="email"
              placeholder="Enter your email address"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Please enter a valid email address'
                }
              })}
              error={errors.email?.message}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="large"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Remember your password?{' '}
            <Link to="/login" className={styles.footerLink}>
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage; 