import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { Button, Input } from '../../components/common';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, forceLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const result = await login(data);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError('root', {
          type: 'manual',
          message: result.error
        });
      }
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    
    try {
      const response = await authService.getGoogleAuthUrl();
      if (response.data.success) {
        // Redirect to Google OAuth
        window.location.href = response.data.data.url;
      } else {
        setError('root', {
          type: 'manual',
          message: 'Failed to initiate Google sign-in. Please try again.'
        });
      }
    } catch (error) {
      console.error('Google OAuth error:', error);
      setError('root', {
        type: 'manual',
        message: 'Failed to connect to Google. Please try again.'
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDebugClear = () => {
    console.log("[DEBUG] Clearing all authentication state");
    forceLogout();
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <Link to="/" className={styles.backLink}>
            <ArrowLeft className={styles.backIcon} />
            Back to Home
          </Link>
          
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <img src="/shield.png" alt="FSWD Bank Logo" className={styles.logoImg} />
            </div>
          </div>
          
          <h2 className={styles.title}>
            Welcome Back
          </h2>
          <p className={styles.subtitle}>
            Sign in to your FSWD Bank account
          </p>
        </div>

        {/* Login Form */}
        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            {/* Email Field */}
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Email Address
              </label>
              <div className={styles.inputWrapper}>
                <div className={styles.inputIcon}>
                  <Mail className={styles.icon} />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  placeholder="Enter your email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address'
                    }
                  })}
                />
              </div>
              {errors.email && (
                <p className={styles.errorText}>{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.inputWrapper}>
                <div className={styles.inputIcon}>
                  <Lock className={styles.icon} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  placeholder="Enter your password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  })}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className={styles.icon} />
                  ) : (
                    <Eye className={styles.icon} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className={styles.errorText}>{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className={styles.options}>
              <div className={styles.rememberMe}>
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className={styles.checkbox}
                />
                <label htmlFor="remember-me" className={styles.checkboxLabel}>
                  Remember me
                </label>
              </div>

              <div className={styles.forgotPassword}>
                <Link
                  to="/forgot-password"
                  className={styles.forgotLink}
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Root Error */}
            {errors.root && (
              <div className={styles.rootError}>
                <p className={styles.errorText}>{errors.root.message}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              className={styles.submitButton}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>Or continue with</span>
          </div>

          {/* Google OAuth Button */}
          <div className={styles.googleOAuth}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className={styles.googleButton}
            >
              {isGoogleLoading ? (
                <div className={styles.googleSpinner}></div>
              ) : (
                <svg className={styles.googleIcon} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className={styles.googleText}>
                {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </span>
            </button>
          </div>

          {/* Demo Accounts */}
          <div className={styles.demoAccounts}>
            <p className={styles.demoText}>Demo Accounts (for testing):</p>
            <Button
              onClick={() => onSubmit({ email: 'admin@fswdbank.com', password: 'admin123' })}
              variant="secondary"
              fullWidth
              disabled={isLoading || isGoogleLoading}
              className={styles.demoButton}
            >
              Demo Admin Account
            </Button>
            <Button
              onClick={() => onSubmit({ email: 'manager@fswdbank.com', password: 'admin123' })}
              variant="secondary"
              fullWidth
              disabled={isLoading || isGoogleLoading}
              className={styles.demoButton}
            >
              Demo Manager Account
            </Button>
          </div>

          {/* Debug Section - Remove in Production */}
          <div className={styles.debugSection}>
            <p className={styles.debugText}>Debug Tools:</p>
            <Button
              onClick={handleDebugClear}
              variant="outline"
              size="small"
              className={styles.debugButton}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              [DEBUG] Clear Auth State
            </Button>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className={styles.signUpContainer}>
          <p className={styles.signUpText}>
            Don't have an account?{' '}
            <Link
              to="/register"
              className={styles.signUpLink}
            >
              Sign up here
            </Link>
          </p>
        </div>

        {/* Security Notice */}
        <div className={styles.securityNotice}>
          <p className={styles.securityText}>
            Your security is our priority. All data is encrypted and protected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 