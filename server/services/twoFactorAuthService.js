const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { getMySQLPool } = require('../config/mysql');

class TwoFactorAuthService {
  constructor() {
    this.issuer = 'FSWD Bank';
    this.algorithm = 'sha1';
    this.digits = 6;
    this.period = 30;
    this.window = 2; // Allow 2 time steps for clock skew
  }

  // Generate secret for a user
  async generateSecret(userId, userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `${userEmail}@${this.issuer}`,
        issuer: this.issuer,
        length: 32
      });

      // Store secret in database
      const pool = getMySQLPool();
      await pool.execute(
        'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 0 WHERE id = ?',
        [secret.base32, userId]
      );

      return {
        secret: secret.base32,
        otpauth_url: secret.otpauth_url,
        qr_code: await this.generateQRCode(secret.otpauth_url)
      };
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  // Generate QR code for 2FA setup
  async generateQRCode(otpauthUrl) {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  // Verify TOTP token
  async verifyToken(userId, token) {
    try {
      const pool = getMySQLPool();
      const [users] = await pool.execute(
        'SELECT two_factor_secret FROM users WHERE id = ? AND two_factor_enabled = 1',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('2FA not enabled for this user');
      }

      const secret = users[0].two_factor_secret;
      
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: this.window,
        algorithm: this.algorithm,
        digits: this.digits,
        period: this.period
      });

      return verified;
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      return false;
    }
  }

  // Enable 2FA for a user
  async enable2FA(userId, token) {
    try {
      const pool = getMySQLPool();
      
      // Get user's secret
      const [users] = await pool.execute(
        'SELECT two_factor_secret FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const secret = users[0].two_factor_secret;
      
      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: this.window,
        algorithm: this.algorithm,
        digits: this.digits,
        period: this.period
      });

      if (!verified) {
        throw new Error('Invalid 2FA token');
      }

      // Enable 2FA
      await pool.execute(
        'UPDATE users SET two_factor_enabled = 1 WHERE id = ?',
        [userId]
      );

      return true;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  // Disable 2FA for a user
  async disable2FA(userId, token) {
    try {
      const pool = getMySQLPool();
      
      // Verify the token first
      const verified = await this.verifyToken(userId, token);
      
      if (!verified) {
        throw new Error('Invalid 2FA token');
      }

      // Disable 2FA
      await pool.execute(
        'UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?',
        [userId]
      );

      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  // Check if 2FA is enabled for a user
  async is2FAEnabled(userId) {
    try {
      const pool = getMySQLPool();
      const [users] = await pool.execute(
        'SELECT two_factor_enabled FROM users WHERE id = ?',
        [userId]
      );

      return users.length > 0 && users[0].two_factor_enabled === 1;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  }

  // Generate backup codes
  async generateBackupCodes(userId) {
    try {
      const codes = [];
      for (let i = 0; i < 10; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
      }

      const hashedCodes = codes.map(code => 
        crypto.createHash('sha256').update(code).digest('hex')
      );

      // Store hashed backup codes
      const pool = getMySQLPool();
      await pool.execute(
        'UPDATE users SET backup_codes = ? WHERE id = ?',
        [JSON.stringify(hashedCodes), userId]
      );

      return codes;
    } catch (error) {
      console.error('Error generating backup codes:', error);
      throw new Error('Failed to generate backup codes');
    }
  }

  // Verify backup code
  async verifyBackupCode(userId, code) {
    try {
      const pool = getMySQLPool();
      const [users] = await pool.execute(
        'SELECT backup_codes FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return false;
      }

      const backupCodes = JSON.parse(users[0].backup_codes || '[]');
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      
      const codeIndex = backupCodes.indexOf(hashedCode);
      
      if (codeIndex === -1) {
        return false;
      }

      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await pool.execute(
        'UPDATE users SET backup_codes = ? WHERE id = ?',
        [JSON.stringify(backupCodes), userId]
      );

      return true;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }

  // Get remaining backup codes count
  async getBackupCodesCount(userId) {
    try {
      const pool = getMySQLPool();
      const [users] = await pool.execute(
        'SELECT backup_codes FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return 0;
      }

      const backupCodes = JSON.parse(users[0].backup_codes || '[]');
      return backupCodes.length;
    } catch (error) {
      console.error('Error getting backup codes count:', error);
      return 0;
    }
  }
}

// Create singleton instance
const twoFactorAuthService = new TwoFactorAuthService();

module.exports = twoFactorAuthService; 