const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getMySQLPool } = require('../config/mysql');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const encryptionService = require('../services/encryptionService');

// Get user's notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const [rows] = await pool.execute(`
      SELECT 
        id,
        type,
        title,
        message,
        isRead,
        created_at as createdAt
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [req.user.id]);
    
    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [req.user.id]
    );
    
    // Get unread count
    const [unreadResult] = await pool.execute(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND isRead = 0',
      [req.user.id]
    );
    
    const response = {
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      },
      unreadCount: unreadResult[0].unread
    };
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to fetch notifications'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    await pool.execute(
      'UPDATE notifications SET isRead = 1, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.notificationId, req.user.id]
    );
    
    const response = {
      success: true,
      message: 'Notification marked as read'
    };
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to mark notification as read'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    await pool.execute(
      'UPDATE notifications SET isRead = 1, updated_at = NOW() WHERE user_id = ? AND isRead = 0',
      [req.user.id]
    );
    
    const response = {
      success: true,
      message: 'All notifications marked as read'
    };
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to mark all notifications as read'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    
    await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.notificationId, req.user.id]
    );
    
    const response = {
      success: true,
      message: 'Notification deleted successfully'
    };
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error('Error deleting notification:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to delete notification'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Create notification (admin only)
router.post('/create', authorizeRoles('admin'), [
  body('user_id').isInt().withMessage('Valid user ID is required'),
  body('type').isIn(['info', 'warning', 'error', 'success']).withMessage('Valid notification type is required'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required and must be less than 100 characters'),
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message is required and must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse = {
        success: false,
        error: 'Validation failed',
        details: errors.array()
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }
    
    const pool = getMySQLPool();
    
    const [result] = await pool.execute(`
      INSERT INTO notifications (user_id, type, title, message, isRead)
      VALUES (?, ?, ?, ?, 0)
    `, [req.body.user_id, req.body.type, req.body.title, req.body.message]);
    
    const response = {
      success: true,
      data: {
        id: result.insertId,
        user_id: req.body.user_id,
        type: req.body.type,
        title: req.body.title,
        message: req.body.message
      },
      message: 'Notification created successfully'
    };
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.status(201).json(encryptedResponse);
  } catch (error) {
    console.error('Error creating notification:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to create notification'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get notification statistics (admin only)
router.get('/admin/stats', authorizeRoles('admin'), async (req, res) => {
  try {
    console.log("[NOTIFICATIONS] Admin stats request received");
    const pool = getMySQLPool();
    
    // Get total notifications
    const [totalResult] = await pool.execute('SELECT COUNT(*) as total FROM notifications');
    console.log("[NOTIFICATIONS] Total notifications:", totalResult[0].total);
    
    // Get unread notifications
    const [unreadResult] = await pool.execute('SELECT COUNT(*) as unread FROM notifications WHERE isRead = 0');
    console.log("[NOTIFICATIONS] Unread notifications:", unreadResult[0].unread);
    
    // Get notifications by type
    const [typeResult] = await pool.execute(`
      SELECT type, COUNT(*) as count
      FROM notifications
      GROUP BY type
    `);
    console.log("[NOTIFICATIONS] Notifications by type:", typeResult);
    
    // Get recent notifications
    const [recentResult] = await pool.execute(`
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.isRead,
        n.created_at as createdAt,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at DESC
      LIMIT 10
    `);
    console.log("[NOTIFICATIONS] Recent notifications count:", recentResult.length);
    
    const response = {
      success: true,
      data: {
        total: totalResult[0].total,
        unread: unreadResult[0].unread,
        byType: typeResult,
        recent: recentResult
      }
    };
    
    console.log("[NOTIFICATIONS] Final response structure:", {
      success: response.success,
      dataKeys: Object.keys(response.data),
      total: response.data.total,
      unread: response.data.unread,
      byTypeCount: response.data.byType.length,
      recentCount: response.data.recent.length
    });
    
    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    console.log("[NOTIFICATIONS] Response encrypted, sending");
    res.json(encryptedResponse);
  } catch (error) {
    console.error('[NOTIFICATIONS] Error fetching notification stats:', error);
    const errorResponse = {
      success: false,
      error: 'Failed to fetch notification statistics'
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

module.exports = router; 