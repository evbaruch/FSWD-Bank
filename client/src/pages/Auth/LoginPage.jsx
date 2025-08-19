import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, AlertCircle, Shield, Lock } from 'lucide-react';
import { Button, Input } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    // Clear any existing errors when component mounts
    setError('');
  }, []);

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setError('');
      
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError('');
      
      await googleLogin();
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Google login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Google login failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDebugClear = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast.success('Auth state cleared');
  };

  // Extracted JSX components
  const headerSection = (
    <div className={styles.header}>
      <div className={styles.logoContainer}>
        <img src="/shield.png" alt="FSWD Bank Logo" className={styles.logo} />
        <h1 className={styles.brandName}>FSWD Bank</h1>
      </div>
      <h2 className={styles.title}>Welcome Back</h2>
      <p className={styles.subtitle}>Sign in to your account to continue</p>
    </div>
  );

  const errorSection = error && (
    <div className={styles.errorContainer}>
      <AlertCircle className={styles.errorIcon} />
      <span className={styles.errorText}>{error}</span>
    </div>
  );

  const formSection = (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          error={errors.email?.message}
          disabled={isLoading}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="password" className={styles.label}>
          Password
        </label>
        <div className={styles.passwordContainer}>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters'
              }
            })}
            error={errors.password?.message}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles.passwordToggle}
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
          </button>
        </div>
      </div>

      <div className={styles.formActions}>
        <Link to="/forgot-password" className={styles.forgotLink}>
          Forgot your password?
        </Link>
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={isLoading}
        className={styles.submitButton}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );

  const dividerSection = (
    <div className={styles.divider}>
      <div className={styles.dividerLine} />
      <span className={styles.dividerText}>Or continue with</span>
    </div>
  );

  const googleOAuthSection = (
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
  );

  const demoAccountsSection = (
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
  );

  const debugSection = (
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
  );

  const signUpSection = (
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
  );

  const securityNoticeSection = (
    <div className={styles.securityNotice}>
      <p className={styles.securityText}>
        Your security is our priority. All data is encrypted and protected.
      </p>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        {headerSection}
        {errorSection}
        {formSection}
        {dividerSection}
        {googleOAuthSection}
        {demoAccountsSection}
        {debugSection}
        {signUpSection}
        {securityNoticeSection}
      </div>
    </div>
  );
};

export default LoginPage; 