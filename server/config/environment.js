const crypto = require('crypto');

// Environment configuration with security checks
const config = {
  // Server configuration
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database configuration
  MYSQL_HOST: process.env.MYSQL_HOST || 'localhost',
  MYSQL_USER: process.env.MYSQL_USER || 'root',
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || '',
  MYSQL_DATABASE: process.env.MYSQL_DATABASE || 'fswd_bank',
  MYSQL_PORT: process.env.MYSQL_PORT || 3306,
  
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/fswd_bank',
  
  // JWT Configuration - CRITICAL SECURITY
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m', // Short-lived access tokens (15 minutes)
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '24h', // Refresh tokens expire in 24 hours
  JWT_REFRESH_ENABLED: process.env.JWT_REFRESH_ENABLED !== 'false', // Enable refresh tokens by default
  
  // Alternative: Long-lived tokens (less secure, no refresh needed)
  JWT_LONG_EXPIRES_IN: process.env.JWT_LONG_EXPIRES_IN || '24h',
  
  // Security configuration
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Client configuration
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Session management
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT) || 86400,
  MAX_SESSIONS_PER_USER: parseInt(process.env.MAX_SESSIONS_PER_USER) || 5,
  
  // Account security
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  ACCOUNT_LOCKOUT_DURATION: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION) || 900,
  PASSWORD_HISTORY_SIZE: parseInt(process.env.PASSWORD_HISTORY_SIZE) || 5
};

// Security validation and automatic secret generation
const validateSecurityConfig = () => {
  const warnings = [];
  const errors = [];
  
  // Always generate secure JWT secrets if not provided
  if (!config.JWT_SECRET) {
    if (config.NODE_ENV === 'production') {
      errors.push('JWT_SECRET is required in production environment');
    } else {
      // Generate a secure random secret automatically
      config.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    }
  }
  
  if (!config.JWT_REFRESH_SECRET) {
    if (config.NODE_ENV === 'production') {
      errors.push('JWT_REFRESH_SECRET is required in production environment');
    } else {
      // Generate a different secure random secret for refresh tokens
      config.JWT_REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
    }
  }
  
  // Check for weak secrets in production
  if (config.NODE_ENV === 'production') {
    if (config.JWT_SECRET && config.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long');
    }
    if (config.JWT_REFRESH_SECRET && config.JWT_REFRESH_SECRET.length < 32) {
      warnings.push('JWT_REFRESH_SECRET should be at least 32 characters long');
    }
  }
  
  // Display warnings and errors
  if (warnings.length > 0) {
    console.log('\n[WARNING] SECURITY WARNINGS:');
    warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  if (errors.length > 0) {
    console.log('\n[ERROR] SECURITY ERRORS:');
    errors.forEach(error => console.log(`   ${error}`));
    console.log('\n[SECURITY] Please set the required environment variables:');
    console.log('   JWT_SECRET=your_secure_jwt_secret_here');
    console.log('   JWT_REFRESH_SECRET=your_secure_refresh_secret_here');
    process.exit(1);
  }
  
  if (warnings.length === 0 && errors.length === 0) {
    console.log('[SECURITY] Configuration validated');
  }
};

// Display generated secrets info
const generateSecureSecrets = () => {
  if (config.NODE_ENV === 'development' && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
    console.log('\n[SECURITY] Auto-Generated Secure JWT Secrets:');
    console.log(`   JWT_SECRET: ${config.JWT_SECRET.substring(0, 16)}...`);
    console.log(`   JWT_REFRESH_SECRET: ${config.JWT_REFRESH_SECRET.substring(0, 16)}...`);
    console.log('   [SECURITY] Secure 256-bit secrets generated automatically\n');
  }
};

// Initialize configuration
const initializeConfig = () => {
  validateSecurityConfig();
  generateSecureSecrets();
  return config;
};

module.exports = {
  config,
  initializeConfig,
  validateSecurityConfig
}; 