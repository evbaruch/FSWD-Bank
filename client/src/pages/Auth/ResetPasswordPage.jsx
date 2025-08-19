import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '../../components/common';
import { authService } from '../../services/authService';
import styles from './ResetPasswordPage.module.css';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm();

  const password = watch('password');

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setError('Invalid or missing reset token');
      return;
    }
    setToken(tokenFromUrl);
  }, [searchParams]);

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authService.resetPassword(token, data.password);
      
      if (response.data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
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
              Password Reset Successfully
            </h2>
            
            <p className={styles.successMessage}>
              Your password has been reset successfully. You will be redirected to the login page shortly.
            </p>
            
            <div className={styles.successActions}>
              <Link to="/login" className={styles.backToLogin}>
                <ArrowLeft className={styles.backIcon} />
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.errorContainer}>
            <AlertCircle className={styles.errorIcon} />
            <h2 className={styles.errorTitle}>Invalid Reset Link</h2>
            <p className={styles.errorMessage}>
              The password reset link is invalid or has expired. Please request a new password reset.
            </p>
            <Link to="/forgot-password" className={styles.errorLink}>
              Request New Reset Link
            </Link>
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
              <Lock className={styles.logoIcon} />
            </div>
          </div>
          
          <h2 className={styles.title}>
            Reset Password
          </h2>
          <p className={styles.subtitle}>
            Enter your new password below
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorContainer}>
            <AlertCircle className={styles.errorIcon} />
            <span className={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <div className={styles.passwordContainer}>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                  }
                })}
                error={errors.password?.message}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className={styles.toggleIcon} /> : <Eye className={styles.toggleIcon} />}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.passwordContainer}>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match'
                })}
                error={errors.confirmPassword?.message}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className={styles.toggleIcon} /> : <Eye className={styles.toggleIcon} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="large"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPasswordPage; 