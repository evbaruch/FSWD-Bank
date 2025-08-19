const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const twoFactorAuthService = require('../services/twoFactorAuthService');
const sessionService = require('../services/sessionService');
const encryptionService = require('../services/encryptionService');
const { getMySQLPool } = require('../config/mysql');
const sessionService = require('../services/sessionService');

// Get 2FA setup QR code
router.get('/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    const [users] = await pool.execute(
      'SELECT email FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userEmail = users[0].email;
    const secretData = await twoFactorAuthService.generateSecret(req.user.id, userEmail);

    res.json({
      success: true,
      data: {
        qr_code: secretData.qr_code,
        secret: secretData.secret,
        otpauth_url: secretData.otpauth_url
      }
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup 2FA'
    });
  }
});

// Enable 2FA
router.post('/2fa/enable', authenticateToken, [
  body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    await twoFactorAuthService.enable2FA(req.user.id, req.body.token);
    
    // Generate backup codes
    const backupCodes = await twoFactorAuthService.generateBackupCodes(req.user.id);

    res.json({
      success: true,
      message: '2FA enabled successfully',
      data: {
        backup_codes: backupCodes
      }
    });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to enable 2FA'
    });
  }
});

// Disable 2FA
router.post('/2fa/disable', authenticateToken, [
  body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    await twoFactorAuthService.disable2FA(req.user.id, req.body.token);

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to disable 2FA'
    });
  }
});

// Verify 2FA token
router.post('/2fa/verify', authenticateToken, [
  body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const isValid = await twoFactorAuthService.verifyToken(req.user.id, req.body.token);

    res.json({
      success: true,
      data: {
        valid: isValid
      }
    });
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to verify 2FA token'
    });
  }
});

// Generate new backup codes
router.post('/2fa/backup-codes', authenticateToken, async (req, res) => {
  try {
    const backupCodes = await twoFactorAuthService.generateBackupCodes(req.user.id);

    res.json({
      success: true,
      data: {
        backup_codes: backupCodes
      }
    });
  } catch (error) {
    console.error('Error generating backup codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate backup codes'
    });
  }
});

// Admin security status
router.get('/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const status = {
      session: {
        timeout: sessionService.sessionTimeout,
        maxSessionsPerUser: sessionService.maxSessionsPerUser,
      },
      rateLimiting: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      },
      hsts: {
        enabled: process.env.NODE_ENV === 'production',
        maxAge: process.env.NODE_ENV === 'production' ? 31536000 : 0,
      },
    };
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error getting security status:', error);
    res.status(500).json({ success: false, message: 'Failed to get security status' });
  }
});

// Admin: update session settings
router.put('/settings/session', authenticateToken, authorizeRoles('admin'), [
  body('timeoutMinutes').optional().isInt({ min: 5, max: 1440 }).withMessage('timeoutMinutes must be between 5 and 1440'),
  body('maxSessionsPerUser').optional().isInt({ min: 1, max: 50 }).withMessage('maxSessionsPerUser must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { timeoutMinutes, maxSessionsPerUser } = req.body;
    if (typeof timeoutMinutes === 'number') {
      sessionService.sessionTimeout = timeoutMinutes * 60; // seconds
    }
    if (typeof maxSessionsPerUser === 'number') {
      sessionService.maxSessionsPerUser = maxSessionsPerUser;
    }

    return res.json({
      success: true,
      message: 'Session settings updated',
      data: {
        timeout: sessionService.sessionTimeout,
        maxSessionsPerUser: sessionService.maxSessionsPerUser
      }
    });
  } catch (error) {
    console.error('Error updating session settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update session settings' });
  }
});

// Get 2FA status
router.get('/2fa/status', authenticateToken, async (req, res) => {
  try {
    const isEnabled = await twoFactorAuthService.is2FAEnabled(req.user.id);
    const backupCodesCount = await twoFactorAuthService.getBackupCodesCount(req.user.id);

    res.json({
      success: true,
      data: {
        enabled: isEnabled,
        backup_codes_remaining: backupCodesCount
      }
    });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get 2FA status'
    });
  }
});

// Get user sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await sessionService.getUserSessions(req.user.id);

    res.json({
      success: true,
      data: sessions.map(session => ({
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        isActive: session.isActive
      }))
    });
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user sessions'
    });
  }
});

// Revoke specific session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const success = await sessionService.deleteSession(sessionId);

    if (success) {
      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke session'
    });
  }
});

// Revoke all sessions except current
router.delete('/sessions', authenticateToken, async (req, res) => {
  try {
    const success = await sessionService.revokeAllUserSessions(req.user.id);

    res.json({
      success: true,
      message: 'All sessions revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke sessions'
    });
  }
});

// Get security questions (admin only)
router.get('/questions', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    const [users] = await pool.execute(
      'SELECT security_questions FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const securityQuestions = JSON.parse(users[0].security_questions || '[]');

    res.json({
      success: true,
      data: {
        questions: securityQuestions
      }
    });
  } catch (error) {
    console.error('Error getting security questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get security questions'
    });
  }
});

// Set security questions
router.post('/questions', authenticateToken, [
  body('questions').isArray({ min: 3, max: 5 }).withMessage('Must provide 3-5 security questions')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { questions } = req.body;
    
    // Validate questions format
    for (const question of questions) {
      if (!question.question || !question.answer) {
        return res.status(400).json({
          success: false,
          message: 'Each question must have a question and answer'
        });
      }
    }

    // Hash answers
    const hashedQuestions = questions.map(q => ({
      question: q.question,
      answer: encryptionService.hash(q.answer)
    }));

    const pool = getMySQLPool();
    await pool.execute(
      'UPDATE users SET security_questions = ? WHERE id = ?',
      [JSON.stringify(hashedQuestions), req.user.id]
    );

    res.json({
      success: true,
      message: 'Security questions updated successfully'
    });
  } catch (error) {
    console.error('Error setting security questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set security questions'
    });
  }
});

// Verify security questions
router.post('/questions/verify', [
  body('questions').isArray({ min: 3, max: 5 }).withMessage('Must provide 3-5 security questions')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, questions } = req.body;

    const pool = getMySQLPool();
    const [users] = await pool.execute(
      'SELECT id, security_questions FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const storedQuestions = JSON.parse(users[0].security_questions || '[]');
    
    if (storedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No security questions set'
      });
    }

    // Verify answers
    let correctAnswers = 0;
    for (const submittedQuestion of questions) {
      const storedQuestion = storedQuestions.find(q => q.question === submittedQuestion.question);
      if (storedQuestion && encryptionService.verifyHash(submittedQuestion.answer, storedQuestion.answer)) {
        correctAnswers++;
      }
    }

    const isValid = correctAnswers >= Math.ceil(storedQuestions.length * 0.8); // 80% correct

    res.json({
      success: true,
      data: {
        valid: isValid,
        correct_answers: correctAnswers,
        total_questions: storedQuestions.length
      }
    });
  } catch (error) {
    console.error('Error verifying security questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify security questions'
    });
  }
});

// Get security events (admin only)
router.get('/events', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const pool = getMySQLPool();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [events] = await pool.execute(`
      SELECT 
        se.*,
        u.email as user_email,
        u.first_name,
        u.last_name
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      ORDER BY se.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM security_events');

    res.json({
      success: true,
      data: events,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting security events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get security events'
    });
  }
});

// Get session statistics (admin only)
router.get('/sessions/stats', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const stats = await sessionService.getSessionStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session statistics'
    });
  }
});

module.exports = router; 