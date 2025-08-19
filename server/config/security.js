const crypto = require('crypto');

// Advanced security configuration for development
const securityConfig = {
  // Request validation
  maxRequestAge: 5 * 60 * 1000, // 5 minutes
  allowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowedHosts: ['localhost:3000', '127.0.0.1:3000', 'localhost:5001', '127.0.0.1:5001'],
  
  // Rate limiting
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // requests per window
  authRateLimitMax: 5, // auth requests per window
  
  // Session security
  sessionTimeout: 15 * 60 * 1000, // 15 minutes
  refreshTokenTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Encryption
  encryptionAlgorithm: 'aes-256-cbc',
  keyLength: 256,
  
  // Headers
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  
  // Validation functions
  isValidOrigin: (origin) => {
    if (!origin) return true; // Allow requests without origin
    return securityConfig.allowedOrigins.includes(origin);
  },
  
  isValidHost: (host) => {
    if (!host) return true; // Allow requests without host
    return securityConfig.allowedHosts.includes(host);
  },
  
  isValidIP: (ip) => {
    const localhostPatterns = ['127.0.0.1', '::1', 'localhost'];
    return localhostPatterns.some(pattern => ip.includes(pattern));
  },
  
  // Request signature validation
  validateRequestSignature: (req) => {
    const timestamp = req.headers['x-request-timestamp'];
    if (!timestamp) return true; // Optional in development
    
    const age = Date.now() - parseInt(timestamp);
    return age <= securityConfig.maxRequestAge;
  },
  
  // Generate secure request ID
  generateRequestId: () => {
    return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
};

module.exports = securityConfig; 