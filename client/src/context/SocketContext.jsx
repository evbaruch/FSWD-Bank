import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

// Socket.IO context for real-time features
const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated) {
      console.log('[SOCKET] User not authenticated, skipping socket connection');
      return;
    }

    console.log('[SOCKET] User authenticated, attempting to connect');

    // Initialize Socket.IO connection - cookies will be sent automatically
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', {
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected to server');
      setIsConnected(true);
      setConnectionError(null);
      });

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setIsConnected(false);
      });

    newSocket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
      });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[SOCKET] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
      });

    newSocket.on('reconnect_error', (error) => {
      console.error('[SOCKET] Reconnection error:', error);
      setConnectionError(error.message);
      });

    newSocket.on('reconnect_failed', () => {
      console.error('[SOCKET] Reconnection failed');
      setConnectionError('Failed to reconnect to server');
    });

    // Set up event listeners for real-time features
    newSocket.on('notification', (data) => {
      console.log('[SOCKET] Received notification:', data);
      // Handle real-time notifications
    });

    newSocket.on('transaction_update', (data) => {
      console.log('[SOCKET] Transaction update:', data);
      // Handle transaction updates
    });

    newSocket.on('account_update', (data) => {
      console.log('[SOCKET] Account update:', data);
      // Handle account updates
    });

    newSocket.on('security_alert', (data) => {
      console.log('[SOCKET] Security alert:', data);
      // Handle security alerts
    });

    setSocket(newSocket);

    // Cleanup on unmount or when user logs out
    return () => {
      if (newSocket) {
        console.log('[SOCKET] Disconnecting socket');
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated]); // Re-run when authentication status changes

  // Socket utility functions
  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('[SOCKET] Cannot emit - not connected');
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    isConnected,
    connectionError,
    emit,
    on,
    off
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 