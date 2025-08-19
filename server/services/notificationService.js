const mongoose = require('mongoose');

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // null for admin notifications
  },
  type: {
    type: String,
    required: true,
    enum: [
      'new_user_registration',
      'account_approved',
      'account_rejected',
      'transaction_completed',
      'transfer_completed',
      'loan_application_submitted',
      'loan_approved',
      'loan_rejected',
      'payment_due',
      'security_alert',
      'system_maintenance',
      'general'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', notificationSchema);

// Create notification
const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    
    // Emit real-time notification if user is online
    if (notificationData.userId) {
      const io = require('../index').io;
      if (io) {
        io.to(`user_${notificationData.userId}`).emit('notification', {
          type: 'new_notification',
          data: notification
        });
      }
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get user notifications
const getUserNotifications = async (userId, page = 1, limit = 20, unreadOnly = false) => {
  try {
    const skip = (page - 1) * limit;
    
    let query = { userId };
    if (unreadOnly) {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Notification.countDocuments(query);
    
    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

// Get admin notifications
const getAdminNotifications = async (page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find({ userId: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Notification.countDocuments({ userId: null });
    
    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting admin notifications:', error);
    throw error;
  }
};

// Mark notification as read
const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
    
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Delete notification
const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Get unread count
const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      userId,
      isRead: false
    });
    
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

// Create system notification
const createSystemNotification = async (type, title, message, data = {}) => {
  try {
    const notification = new Notification({
      userId: null, // System notification
      type,
      title,
      message,
      data,
      priority: 'medium'
    });
    
    await notification.save();
    
    // Emit to all connected clients
    const io = require('../index').io;
    if (io) {
      io.emit('system_notification', {
        type: 'system_notification',
        data: notification
      });
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating system notification:', error);
    throw error;
  }
};

// Clean up expired notifications
const cleanupExpiredNotifications = async () => {
  try {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
    throw error;
  }
};

// Schedule cleanup job
setInterval(cleanupExpiredNotifications, 24 * 60 * 60 * 1000); // Run daily

module.exports = {
  Notification,
  createNotification,
  getUserNotifications,
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  createSystemNotification,
  cleanupExpiredNotifications
}; 