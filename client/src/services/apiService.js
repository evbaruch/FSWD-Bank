import { authService } from './authService';
import { formatErrorForLogging } from '../utils/errorHandler';

// Re-export the configured axios instance from authService
const api = authService.api || authService;

// Enhanced error logging
const logError = (error, context) => {
  const errorInfo = formatErrorForLogging(error, context);
  console.error('API Error:', errorInfo);
  
  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, etc.
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }
};

export const apiService = {
  // Direct HTTP methods for general use
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response;
    } catch (error) {
      logError(error, `apiService.get(${url})`);
      throw error;
    }
  },

  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response;
    } catch (error) {
      logError(error, `apiService.post(${url})`);
      throw error;
    }
  },

  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response;
    } catch (error) {
      logError(error, `apiService.put(${url})`);
      throw error;
    }
  },

  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response;
    } catch (error) {
      logError(error, `apiService.delete(${url})`);
      throw error;
    }
  },

  // Account-related API calls
  accounts: {
    getAll: async (params = {}) => {
      try {
        const response = await api.get('/accounts', { params });
        return response.data;
      } catch (error) {
        logError(error, 'accounts.getAll');
        throw error;
      }
    },

    create: async (accountData) => {
      const response = await api.post('/accounts', accountData);
      return response.data;
    },

    getById: async (accountId) => {
      const response = await api.get(`/accounts/${accountId}`);
      return response.data;
    },

    update: async (accountId, accountData) => {
      const response = await api.put(`/accounts/${accountId}`, accountData);
      return response.data;
    },

    delete: async (accountId) => {
      const response = await api.delete(`/accounts/${accountId}`);
      return response.data;
    }
  },

  // Transaction-related API calls
  transactions: {
    getAll: async (params = {}) => {
      const response = await api.get('/transactions', { params });
      return response.data;
    },

    create: async (transactionData) => {
      const response = await api.post('/transactions', transactionData);
      return response.data;
    },

    deposit: async (depositData) => {
      const response = await api.post('/transactions/deposit', depositData);
      return response.data;
    },

    withdrawal: async (withdrawalData) => {
      const response = await api.post('/transactions/withdrawal', withdrawalData);
      return response.data;
    },

    getById: async (transactionId) => {
      const response = await api.get(`/transactions/${transactionId}`);
      return response.data;
    }
  },

  // Transfer-related API calls
  transfers: {
    getAll: async (params = {}) => {
      const response = await api.get('/transfers', { params });
      return response.data;
    },

    create: async (transferData) => {
      const response = await api.post('/transfers', transferData);
      return response.data;
    },

    getById: async (transferId) => {
      const response = await api.get(`/transfers/${transferId}`);
      return response.data;
    },

    cancel: async (transferId) => {
      const response = await api.post(`/transfers/${transferId}/cancel`);
      return response.data;
    }
  },

  // Loan-related API calls
  loans: {
    getAll: async (params = {}) => {
      const response = await api.get('/loans', { params });
      return response.data;
    },

    apply: async (loanData) => {
      const response = await api.post('/loans/apply', loanData);
      return response.data;
    },

    getById: async (loanId) => {
      const response = await api.get(`/loans/${loanId}`);
      return response.data;
    },

    calculate: async (loanData) => {
      const response = await api.post('/loans/calculate', loanData);
      return response.data;
    }
  },

  // Document-related API calls
  documents: {
    getAll: async (params = {}) => {
      const response = await api.get('/uploads/documents', { params });
      return response.data;
    },

    upload: async (formData) => {
      const response = await api.post('/uploads/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },

    getById: async (documentId) => {
      const response = await api.get(`/uploads/documents/${documentId}`);
      return response.data;
    },

    delete: async (documentId) => {
      const response = await api.delete(`/uploads/documents/${documentId}`);
      return response.data;
    },

    download: async (documentId) => {
      const response = await api.get(`/uploads/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    }
  },

  // Notification-related API calls
  notifications: {
    getAll: async (params = {}) => {
      const response = await api.get('/notifications', { params });
      return response.data;
    },

    markAsRead: async (notificationId) => {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    },

    markAllAsRead: async () => {
      const response = await api.put('/notifications/read-all');
      return response.data;
    },

    delete: async (notificationId) => {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    }
  },

  // User-related API calls
  users: {
    getProfile: async () => {
      const response = await api.get('/users/profile');
      return response.data;
    },

    updateProfile: async (userData) => {
      const response = await api.put('/users/profile', userData);
      return response.data;
    },

    changePassword: async (passwords) => {
      const response = await api.put('/users/change-password', passwords);
      return response.data;
    },

    getAll: async (params = {}) => {
      const response = await api.get('/users', { params });
      return response.data;
    },

    getById: async (userId) => {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    },

    update: async (userId, userData) => {
      const response = await api.put(`/users/${userId}`, userData);
      return response.data;
    },

    delete: async (userId) => {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    }
  },

  // Report-related API calls
  reports: {
    getFinancialSummary: async (params = {}) => {
      const response = await api.get('/reports/financial-summary', { params });
      return response.data;
    },

    getTransactionReport: async (params = {}) => {
      const response = await api.get('/reports/transactions', { params });
      return response.data;
    },

    getUserActivity: async (params = {}) => {
      const response = await api.get('/reports/user-activity', { params });
      return response.data;
    }
  },

  // Dashboard-related API calls
  dashboard: {
    getSummary: async () => {
      const response = await api.get('/dashboard/summary');
      return response.data;
    },

    getRecentTransactions: async (limit = 5) => {
      const response = await api.get('/transactions', { params: { limit } });
      return response.data;
    },

    getQuickStats: async () => {
      const response = await api.get('/dashboard/quick-stats');
      return response.data;
    }
  }
}; 