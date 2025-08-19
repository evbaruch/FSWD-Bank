const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getMySQLPool } = require('../config/mysql');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const encryptionService = require('../services/encryptionService');

// Get user's transfers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const [rows] = await pool.execute(`
      SELECT 
        t.id,
        t.from_account_id,
        t.to_account_id,
        t.amount,
        t.description,
        t.reference_number as referenceNumber,
        t.status,
        t.scheduled_date as scheduledDate,
        t.completed_at as completedAt,
        t.created_at as createdAt,
        fa.account_number as fromAccountNumber,
        ta.account_number as toAccountNumber
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      JOIN accounts ta ON t.to_account_id = ta.id
      WHERE fa.user_id = ? OR ta.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [req.user.id, req.user.id]);
    
    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      JOIN accounts ta ON t.to_account_id = ta.id
      WHERE fa.user_id = ? OR ta.user_id = ?
    `, [req.user.id, req.user.id]);
    
    
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfers'
    });
  }
});

// Create transfer
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Handle encrypted request if present
    let transferData = req.body;
    if (req.headers['x-encrypted'] === 'true' && req.body && req.body.encrypted) {
      console.log('[TRANSFER] Decrypting encrypted request');
      transferData = encryptionService.decrypt(req.body);
      console.log('[TRANSFER] Decrypted transfer data:', transferData);
    }

    // Manually validate transfer data
    const validationErrors = [];
    console.log('Validating transfer data:', transferData);
    if (!transferData.fromAccountId || !Number.isInteger(parseInt(transferData.fromAccountId))) {
      validationErrors.push({
        field: 'fromAccountId',
        message: 'Valid from account ID is required'
      });
    }
    
    if (!transferData.toAccountId || !Number.isInteger(parseInt(transferData.toAccountId))) {
      validationErrors.push({
        field: 'toAccountId',
        message: 'Valid to account ID is required'
      });
    }
    
    if (!transferData.amount || parseFloat(transferData.amount) < 0.01) {
      validationErrors.push({
        field: 'amount',
        message: 'Valid amount is required'
      });
    }
    
    if (transferData.description && transferData.description.length > 255) {
      validationErrors.push({
        field: 'description',
        message: 'Description must be 255 characters or less'
      });
    }
    
    if (transferData.scheduledDate && !Date.parse(transferData.scheduledDate)) {
      validationErrors.push({
        field: 'scheduledDate',
        message: 'Valid scheduled date is required'
      });
    }
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    const pool = getMySQLPool();
    
    // Verify from account belongs to user
    const [fromAccount] = await pool.execute(
      'SELECT id, balance, status, currency, account_number FROM accounts WHERE id = ? AND user_id = ?',
      [transferData.fromAccountId, req.user.id]
    );
    
    if (fromAccount.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'From account not found'
      });
    }
    
    if (fromAccount[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'From account is not active'
      });
    }
    
    if (fromAccount[0].balance < transferData.amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }
    
    // Verify to account exists
    const [toAccount] = await pool.execute(
      'SELECT id, status, currency, account_number FROM accounts WHERE id = ?',
      [transferData.toAccountId]
    );
    
    if (toAccount.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'To account not found'
      });
    }
    
    if (toAccount[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'To account is not active'
      });
    }
    
    // Check if currencies match
    if (fromAccount[0].currency !== toAccount[0].currency) {
      return res.status(400).json({
        success: false,
        error: 'Currency mismatch between accounts'
      });
    }
    
    // Generate reference number
    const referenceNumber = `TRF${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Create transfer
    const [result] = await pool.execute(
      `INSERT INTO transfers (
        from_account_id, to_account_id, amount, description, 
        reference_number, status, scheduled_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        transferData.fromAccountId,
        transferData.toAccountId,
        transferData.amount,
        transferData.description || '',
        referenceNumber,
        transferData.scheduledDate ? 'scheduled' : 'pending',
        transferData.scheduledDate || null
      ]
    );
    
    const transferId = result.insertId;
    
    // If immediate transfer, process it
    if (!transferData.scheduledDate) {
      // Deduct from source account
      await pool.execute(
        'UPDATE accounts SET balance = balance - ? WHERE id = ?',
        [transferData.amount, transferData.fromAccountId]
      );
      
      // Add to destination account
        await pool.execute(
        'UPDATE accounts SET balance = balance + ? WHERE id = ?',
        [transferData.amount, transferData.toAccountId]
        );
        
      // Update transfer status
        await pool.execute(
        'UPDATE transfers SET status = "completed", completed_at = NOW() WHERE id = ?',
        [transferId]
        );
    }
    
    // Create response data
    const responseData = {
      success: true,
      message: 'Transfer created successfully',
      data: {
        id: transferId,
        referenceNumber,
        status: transferData.scheduledDate ? 'scheduled' : 'completed',
        amount: transferData.amount,
        fromAccount: fromAccount[0].account_number,
        toAccount: toAccount[0].account_number
      }
    };

    // Encrypt response if requested
    if (req.headers['x-encrypted'] === 'true') {
      console.log('[TRANSFER] Encrypting response');
      const encryptedData = encryptionService.encrypt(responseData.data);
      responseData.encrypted = true;
      responseData.data = encryptedData;
      console.log('[TRANSFER] Response encrypted');
    }
      
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transfer'
    });
  }
});

// Get specific transfer
router.get('/:transferId', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    const [rows] = await pool.execute(`
      SELECT 
        t.id,
        t.from_account_id,
        t.to_account_id,
        t.amount,
        t.description,
        t.reference_number as referenceNumber,
        t.status,
        t.scheduled_date as scheduledDate,
        t.completed_at as completedAt,
        t.created_at as createdAt,
        fa.account_number as fromAccountNumber,
        ta.account_number as toAccountNumber
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      JOIN accounts ta ON t.to_account_id = ta.id
      WHERE t.id = ? AND (fa.user_id = ? OR ta.user_id = ?)
    `, [req.params.transferId, req.user.id, req.user.id]);
    
    
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfer'
    });
  }
});

// Cancel scheduled transfer
router.put('/:transferId/cancel', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    // Verify transfer belongs to user and is pending
    const [transfer] = await pool.execute(`
      SELECT t.id, t.status, t.from_account_id, fa.user_id
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      WHERE t.id = ? AND fa.user_id = ?
    `, [req.params.transferId, req.user.id]);
    
    if (transfer.length === 0) {
      
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }
    
    if (transfer[0].status !== 'pending') {
      
      return res.status(400).json({
        success: false,
        error: 'Only pending transfers can be cancelled'
      });
    }
    
    await pool.execute(
      'UPDATE transfers SET status = "cancelled", updated_at = NOW() WHERE id = ?',
      [req.params.transferId]
    );
    
    
    
    res.json({
      success: true,
      message: 'Transfer cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel transfer'
    });
  }
});

// Get all transfers (admin only)
router.get('/admin/all', authorizeRoles('admin'), async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const [rows] = await pool.execute(`
      SELECT 
        t.id,
        t.from_account_id,
        t.to_account_id,
        t.amount,
        t.description,
        t.reference_number as referenceNumber,
        t.status,
        t.scheduled_date as scheduledDate,
        t.completed_at as completedAt,
        t.created_at as createdAt,
        fa.account_number as fromAccountNumber,
        ta.account_number as toAccountNumber,
        uf.first_name as fromFirstName,
        uf.last_name as fromLastName,
        ut.first_name as toFirstName,
        ut.last_name as toLastName
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      JOIN accounts ta ON t.to_account_id = ta.id
      JOIN users uf ON fa.user_id = uf.id
      JOIN users ut ON ta.user_id = ut.id
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    // Get total count
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM transfers');
    
    
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all transfers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfers'
    });
  }
});

module.exports = router; 