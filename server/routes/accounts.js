const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getMySQLPool } = require('../config/mysql');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const encryptionService = require('../services/encryptionService');

// Get user's accounts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.account_number as accountNumber,
        a.account_type as accountType,
        a.balance,
        a.currency,
        a.status,
        a.created_at as createdAt,
        a.updated_at as updatedAt
      FROM accounts a
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `, [req.user.id]);
    
    const response = {
      success: true,
      data: rows
    };
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to fetch accounts'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get specific account
router.get('/:accountId', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.account_number as accountNumber,
        a.account_type as accountType,
        a.balance,
        a.currency,
        a.status,
        a.created_at as createdAt,
        a.updated_at as updatedAt
      FROM accounts a
      WHERE a.id = ? AND a.user_id = ?
    `, [req.params.accountId, req.user.id]);
    
    if (rows.length === 0) {
      const errorResponse = {
        success: false,
        error: 'Account not found'
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(404).json(encryptedError);
    }
    
    const response = {
      success: true,
      data: rows[0]
    };
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error('Error fetching account:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to fetch account'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Create new account
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Decrypt request body
    const decryptedData = encryptionService.decrypt(req.body);

    const { accountType, currency, initialDeposit } = decryptedData;

    // Validate accountType
    if (!accountType || !['checking', 'savings', 'business'].includes(accountType)) {
      const errorResponse = {
        success: false,
        error: 'Validation failed',
        details: [{ msg: 'Invalid account type', param: 'accountType' }]
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    // Validate currency
    if (!currency || !['USD', 'EUR', 'GBP'].includes(currency)) {
      const errorResponse = {
        success: false,
        error: 'Validation failed',
        details: [{ msg: 'Invalid currency', param: 'currency' }]
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    // Validate initialDeposit
    // Must be a number, not NaN, and >= 0
    if (
      initialDeposit === undefined || 
      typeof initialDeposit !== 'number' || 
      isNaN(initialDeposit) || 
      initialDeposit < 0
    ) {
      const errorResponse = {
        success: false,
        error: 'Validation failed',
        details: [{ msg: 'Initial deposit must be a positive number or zero', param: 'initialDeposit' }]
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    const pool = getMySQLPool();

    // Generate unique account number
    const accountNumber = 'ACC' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

    // Insert account with initialDeposit as balance
    const [result] = await pool.execute(`
      INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, accountNumber, accountType, initialDeposit, currency, 'active']);

    // Fetch new account info
    const [newAccount] = await pool.execute(`
      SELECT 
        id,
        account_number as accountNumber,
        account_type as accountType,
        balance,
        currency,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      FROM accounts
      WHERE id = ?
    `, [result.insertId]);

    const response = {
      success: true,
      data: newAccount[0],
      message: 'Account created successfully'
    };

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.status(201).json(encryptedResponse);
  } catch (error) {
    console.error('Error creating account:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to create account'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Update account status
router.put('/:accountId/status', authenticateToken, async (req, res) => {
  try {
    // Decrypt request
    const decryptedData = encryptionService.decrypt(req.body);
    
    // Manual validation
    const { status } = decryptedData;
    
    if (!status || !['active', 'inactive', 'frozen'].includes(status)) {
      const errorResponse = {
        success: false,
        error: 'Validation failed',
        details: [{ msg: 'Invalid status', param: 'status' }]
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }
    
    const pool = getMySQLPool();
    
    // Check if account belongs to user
    const [accountCheck] = await pool.execute(
      'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
      [req.params.accountId, req.user.id]
    );
    
    if (accountCheck.length === 0) {
      const errorResponse = {
        success: false,
        error: 'Account not found'
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(404).json(encryptedError);
    }
    
    await pool.execute(
      'UPDATE accounts SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, req.params.accountId]
    );
    
    const response = {
      success: true,
      message: 'Account status updated successfully'
    };
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error('Error updating account status:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to update account status'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get account balance
router.get('/:accountId/balance', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    const [rows] = await pool.execute(`
      SELECT 
        balance,
        currency,
        updated_at as updatedAt
      FROM accounts
      WHERE id = ? AND user_id = ?
    `, [req.params.accountId, req.user.id]);
    
    if (rows.length === 0) {
      const errorResponse = {
        success: false,
        error: 'Account not found'
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(404).json(encryptedError);
    }
    
    const response = {
      success: true,
      data: rows[0]
    };
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error('Error fetching account balance:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to fetch account balance'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get all accounts (admin only)
router.get('/admin/all', authorizeRoles('admin'), async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.account_number as accountNumber,
        a.account_type as accountType,
        a.balance,
        a.currency,
        a.status,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email
      FROM accounts a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `);
    
        const response = {
      success: true,
      data: rows
    };
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error('Error fetching all accounts:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to fetch accounts'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

module.exports = router; 