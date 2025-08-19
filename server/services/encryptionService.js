const crypto = require('crypto');

class EncryptionService {
  constructor() {
    // Use exactly 32 bytes for AES-256
    this.secretKey = Buffer.from('12345678901234567890123456789012', 'utf8');
    this.algorithm = 'aes-256-cbc'; 
    
    console.log('[ENCRYPTION] Service initialized');
    console.log(`[ENCRYPTION] Algorithm: ${this.algorithm}`);
    console.log(`[ENCRYPTION] Key length: ${this.secretKey.length * 8} bits`);
  }

  // Encrypt data
  encrypt(data) {
    try {
      // Use AES-256-CBC encryption to match frontend
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
      
      const jsonString = JSON.stringify(data);
      let encrypted = cipher.update(jsonString, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Return encrypted data with all components
      return {
        encrypted,
        iv: iv.toString('base64'),
        authTag: 'cbc-mode', // CBC doesn't have authTag, but keep for compatibility
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data
  decrypt(encryptedData) {
    try {
      // Use full AES-256-CBC encryption format
      const encryptedString = encryptedData.encrypted;
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const timestamp = encryptedData.timestamp;
      
      // Validate timestamp (prevent replay attacks)
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      if (timestamp && (now - timestamp > maxAge)) {
        throw new Error('Encrypted data expired');
      }
      
      if (!encryptedString) {
        throw new Error('No encrypted data found');
      }
      
      // Full AES-256-CBC decryption
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      
      let decrypted = decipher.update(encryptedString, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  // Encrypt sensitive fields in an object
  encryptSensitiveFields(obj, sensitiveFields = ['password', 'ssn', 'cardNumber', 'cvv']) {
    const encrypted = { ...obj };
    
    sensitiveFields.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    });
    
    return encrypted;
  }

  // Decrypt sensitive fields in an object
  decryptSensitiveFields(obj, sensitiveFields = ['password', 'ssn', 'cardNumber', 'cvv']) {
    const decrypted = { ...obj };
    
    sensitiveFields.forEach(field => {
      if (decrypted[field] && typeof decrypted[field] === 'object' && decrypted[field].encrypted) {
        decrypted[field] = this.decrypt(decrypted[field]);
      }
    });
    
    return decrypted;
  }

  // Generate a secure random token
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash data (one-way encryption)
  hash(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
    return {
      hash: hash.toString('hex'),
      salt
    };
  }

  // Verify hash
  verifyHash(data, hash, salt) {
    const { hash: computedHash } = this.hash(data, salt);
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

module.exports = encryptionService; 