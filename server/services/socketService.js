const jwt = require('jsonwebtoken');
const { getMySQLPool } = require('../config/mysql');

const socketService = (io) => {
  // Store connected users
  const connectedUsers = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Try to get token from auth object first, then from cookies
      let token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      // If no token in auth, try to get from cookies
      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';');
        const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const pool = getMySQLPool();
      const [users] = await pool.execute(
        'SELECT id, email, role, status FROM users WHERE id = ? AND status = "active"',
        [decoded.userId]
      );

      if (users.length === 0) {
        return next(new Error('User not found'));
      }

      const user = users[0];
      socket.userId = user.id;
      socket.userEmail = user.email;
      socket.userRole = user.role;
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userEmail} connected with socket ID: ${socket.id}`);

    // Join user-specific room
    socket.join(`user_${socket.userId}`);
    
    // Join role-specific room
    socket.join(`role_${socket.userRole}`);
    
    // Join admin room if user is admin
    if (socket.userRole === 'admin' || socket.userRole === 'manager') {
      socket.join('admin_room');
    }

    // Store connected user
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      email: socket.userEmail,
      role: socket.userRole,
      connectedAt: new Date()
    });

    // Emit user online status
    socket.broadcast.to(`user_${socket.userId}`).emit('user_status', {
      userId: socket.userId,
      status: 'online'
    });

    // Handle join account room
    socket.on('join_account', (accountId) => {
      socket.join(`account_${accountId}`);
      console.log(`User ${socket.userEmail} joined account room: ${accountId}`);
    });

    // Handle leave account room
    socket.on('leave_account', (accountId) => {
      socket.leave(`account_${accountId}`);
      console.log(`User ${socket.userEmail} left account room: ${accountId}`);
    });

    // Handle private message
    socket.on('private_message', async (data) => {
      try {
        const { recipientId, message, type = 'general' } = data;
        
        // Verify recipient exists and user has permission to message them
        const pool = getMySQLPool();
        const [recipients] = await pool.execute(
          'SELECT id, email FROM users WHERE id = ? AND status = "active"',
          [recipientId]
        );

        if (recipients.length === 0) {
          socket.emit('error', { message: 'Recipient not found' });
          return;
        }

        // Check if recipient is online
        const recipientSocket = connectedUsers.get(recipientId);
        
        if (recipientSocket) {
          // Send to online recipient
          io.to(recipientSocket.socketId).emit('private_message', {
            senderId: socket.userId,
            senderEmail: socket.userEmail,
            message,
            type,
            timestamp: new Date()
          });
        }

        // Send confirmation to sender
        socket.emit('message_sent', {
          recipientId,
          message,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Private message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing_start', (data) => {
      const { recipientId } = data;
      const recipientSocket = connectedUsers.get(recipientId);
      
      if (recipientSocket) {
        io.to(recipientSocket.socketId).emit('typing_start', {
          userId: socket.userId,
          userEmail: socket.userEmail
        });
      }
    });

    socket.on('typing_stop', (data) => {
      const { recipientId } = data;
      const recipientSocket = connectedUsers.get(recipientId);
      
      if (recipientSocket) {
        io.to(recipientSocket.socketId).emit('typing_stop', {
          userId: socket.userId
        });
      }
    });

    // Handle transaction updates
    socket.on('transaction_update', (data) => {
      const { accountId, transactionData } = data;
      
      // Emit to all users connected to this account
      io.to(`account_${accountId}`).emit('transaction_updated', {
        accountId,
        transaction: transactionData,
        timestamp: new Date()
      });
    });

    // Handle balance updates
    socket.on('balance_update', (data) => {
      const { accountId, newBalance } = data;
      
      io.to(`account_${accountId}`).emit('balance_updated', {
        accountId,
        balance: newBalance,
        timestamp: new Date()
      });
    });

    // Handle loan status updates
    socket.on('loan_status_update', (data) => {
      const { loanId, status, userId } = data;
      
      // Emit to specific user
      io.to(`user_${userId}`).emit('loan_status_updated', {
        loanId,
        status,
        timestamp: new Date()
      });
    });

    // Handle admin notifications
    socket.on('admin_notification', (data) => {
      if (socket.userRole === 'admin' || socket.userRole === 'manager') {
        io.to('admin_room').emit('admin_notification', {
          ...data,
          senderId: socket.userId,
          senderEmail: socket.userEmail,
          timestamp: new Date()
        });
      }
    });

    // Handle user activity
    socket.on('user_activity', (data) => {
      const { activity, details } = data;
      
      // Log user activity
      console.log(`User ${socket.userEmail} activity: ${activity}`, details);
      
      // Emit to admin room for monitoring
      if (socket.userRole !== 'admin') {
        io.to('admin_room').emit('user_activity_log', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          activity,
          details,
          timestamp: new Date()
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userEmail} disconnected`);
      
      // Remove from connected users
      connectedUsers.delete(socket.userId);
      
      // Emit user offline status
      socket.broadcast.to(`user_${socket.userId}`).emit('user_status', {
        userId: socket.userId,
        status: 'offline'
      });
    });
  });

  // Utility functions for other services to use
  const emitToUser = (userId, event, data) => {
    const userSocket = connectedUsers.get(userId);
    if (userSocket) {
      io.to(userSocket.socketId).emit(event, data);
    }
  };

  const emitToRole = (role, event, data) => {
    io.to(`role_${role}`).emit(event, data);
  };

  const emitToAdmin = (event, data) => {
    io.to('admin_room').emit(event, data);
  };

  const emitToAccount = (accountId, event, data) => {
    io.to(`account_${accountId}`).emit(event, data);
  };

  const getConnectedUsers = () => {
    return Array.from(connectedUsers.entries()).map(([userId, data]) => ({
      userId,
      ...data
    }));
  };

  const isUserOnline = (userId) => {
    return connectedUsers.has(userId);
  };

  // Make io available globally for other services
  global.io = io;

  return {
    emitToUser,
    emitToRole,
    emitToAdmin,
    emitToAccount,
    getConnectedUsers,
    isUserOnline
  };
};

module.exports = socketService; 