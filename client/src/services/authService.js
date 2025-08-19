import axios from "axios";
import frontendEncryptionService from "./encryptionService";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true, // Important: This allows cookies to be sent with requests
  headers: {
    "Content-Type": "application/json",
  },
  // Ensure cookies are sent with cross-origin requests
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// Request interceptor for encryption
api.interceptors.request.use(
  (config) => {
    console.log("[REQUEST] Processing request to:", config.url);

    // Enable encryption for ALL endpoints
    const sensitiveEndpoints = [
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/auth/verify",
      "/auth/logout",
      "/users/profile",
      "/users/change-password",
      "/users",
      "/accounts",
      "/transactions",
      "/transfers",
      "/loans",
      //"/uploads",
      "/notifications",
      "/reports",
      "/security",
    ];

    const isSensitiveEndpoint = sensitiveEndpoints.some(
      (endpoint) => config.url && config.url.includes(endpoint)
    );

    if (isSensitiveEndpoint) {
      // For GET requests, just set the header to request encrypted response
      if (config.method === "get" || !config.data) {
        console.log(
          "[ENCRYPT] Setting encryption header for GET request to:",
          config.url
        );
        config.headers["x-encrypted"] = "true";
      } else if (config.data) {
        // For POST/PUT requests with data, encrypt the data
        console.log("[ENCRYPT] Encrypting request to:", config.url);
        config.data = frontendEncryptionService.encrypt(config.data);
        config.headers["x-encrypted"] = "true";
        console.log("[ENCRYPT] Request encrypted successfully");
      }
    } else {
      console.log("[REQUEST] Not encrypting - not sensitive endpoint");
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for decryption
api.interceptors.response.use(
  (response) => {
    console.log("[RESPONSE] Raw response data:", response.data);

    // Enable decryption for ALL endpoints
    const sensitiveEndpoints = [
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/auth/verify",
      "/auth/logout",
      "/users/profile",
      "/users/change-password",
      "/users",
      "/accounts",
      "/transactions",
      "/transfers",
      "/loans",
      "/uploads",
      "/notifications",
      "/reports",
      "/security",
    ];

    const isSensitiveEndpoint = sensitiveEndpoints.some(
      (endpoint) =>
        response.config.url && response.config.url.includes(endpoint)
    );

    if (isSensitiveEndpoint && response.data && response.data.encrypted) {
      console.log(
        "[RESPONSE] Detected encrypted response, attempting decryption"
      );
      response.data =
        frontendEncryptionService.handleEncryptedResponse(response);
      console.log("[RESPONSE] Response decrypted successfully:", response.data);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token - cookies are automatically sent
        await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
        );

        // If refresh successful, retry original request
        // New access token is automatically set as cookie by the server
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  // Export the configured axios instance
  api,

  // Login user
  login: async (credentials) => {
    console.log("[AUTH] Starting login request");
    const response = await api.post("/auth/login", credentials);
    console.log("[AUTH] Login response received:", response.data);

    // Store user data in localStorage (tokens are in httpOnly cookies)
    if (response.data.success && response.data.data?.user) {
      localStorage.setItem("user", JSON.stringify(response.data.data.user));
      console.log("[AUTH] User data stored in localStorage");
    }

    return response;
  },

  // Register new user
  register: async (userData) => {
    console.log("[AUTH] authService.register called with:", userData);
    const response = await api.post("/auth/register", userData);
    console.log("[AUTH] authService.register response:", response.data);
    return response;
  },

  // Logout user
  logout: async (data = {}) => {
    const response = await api.post("/auth/logout", data);

    // Clear local storage (cookies are cleared by the server)
    localStorage.removeItem("user");

    return response;
  },

  // Refresh token
  refreshToken: async (data) => {
    const response = await api.post("/auth/refresh", data);
    return response;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response;
  },

  // Reset password
  resetPassword: async (token, password) => {
    const response = await api.post("/auth/reset-password", {
      token,
      password,
    });
    return response;
  },

  // Verify token (get current user)
  verifyToken: async () => {
    const response = await api.get("/auth/verify");
    return response;
  },

  // Get Google OAuth URL
  getGoogleAuthUrl: async () => {
    const response = await api.get("/auth/google/url");
    return response;
  },

  // Handle Google OAuth callback
  handleGoogleCallback: (user) => {
    // Store user data (tokens are handled by the server via cookies)
    localStorage.setItem("user", JSON.stringify(user));

    return {
      success: true,
      data: {
        user,
      },
    };
  },

  // Update user profile
  updateProfile: async (userData) => {
    const response = await api.put("/users/profile", userData);
    return response;
  },

  // Change password
  changePassword: async (passwords) => {
    const response = await api.put("/users/change-password", passwords);
    return response;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get("/users/profile");
    return response;
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/users/profile-picture", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  },

  // Delete account
  deleteAccount: async (password) => {
    const response = await api.delete("/users/account", {
      data: { password },
    });
    return response;
  },

  // Get user activity
  getActivity: async (params = {}) => {
    const response = await api.get("/users/activity", { params });
    return response;
  },

  // Enable/disable 2FA
  toggle2FA: async (enabled) => {
    const response = await api.post("/users/2fa", { enabled });
    return response;
  },

  // Verify 2FA code
  verify2FA: async (code) => {
    const response = await api.post("/users/2fa/verify", { code });
    return response;
  },

  // Get 2FA QR code
  get2FAQrCode: async () => {
    const response = await api.get("/users/2fa/qr");
    return response;
  },

  // Get login history
  getLoginHistory: async (params = {}) => {
    const response = await api.get("/users/login-history", { params });
    return response;
  },

  // Get security settings
  getSecuritySettings: async () => {
    const response = await api.get("/users/security-settings");
    return response;
  },

  // Update security settings
  updateSecuritySettings: async (settings) => {
    const response = await api.put("/users/security-settings", settings);
    return response;
  },

  // Admin methods
  getUsers: async () => {
    console.log("[AUTH-SERVICE] getUsers called");
    const response = await api.get("/users");
    console.log("[AUTH-SERVICE] getUsers response:", response);
    return response;
  },

  updateUserStatus: async (userId, status) => {
    const response = await api.put(`/users/${userId}/status`, { status });
    return response;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response;
  },

  // Admin Dashboard Data
  getAdminDashboardData: async () => {
    console.log("[AUTH-SERVICE] getAdminDashboardData called");
    try {
      const response = await api.get("/reports/financial-summary");
      console.log("[AUTH-SERVICE] getAdminDashboardData response:", response);
      return response;
    } catch (error) {
      console.error("[AUTH-SERVICE] getAdminDashboardData error:", error);
      throw error;
    }
  },

  // Admin Reports
  getAdminReports: async (params = {}) => {
    console.log("[AUTH-SERVICE] getAdminReports called with params:", params);
    try {
      const response = await api.get("/reports/transactions", { params });
      console.log("[AUTH-SERVICE] getAdminReports response:", response);
      return response;
    } catch (error) {
      console.error("[AUTH-SERVICE] getAdminReports error:", error);
      throw error;
    }
  },

  // Loan Applications
  getLoanApplications: async () => {
    console.log("[AUTH-SERVICE] getLoanApplications called");
    try {
      const response = await api.get("/loans");
      console.log("[AUTH-SERVICE] getLoanApplications response:", response);
      return response;
    } catch (error) {
      console.error("[AUTH-SERVICE] getLoanApplications error:", error);
      throw error;
    }
  },

  // Update Loan Status
  updateLoanStatus: async (loanId, status, reason = "") => {
    console.log("[AUTH-SERVICE] updateLoanStatus called:", {
      loanId,
      status,
      reason,
    });
    try {
      const response = await api.put(`/loans/${loanId}/status`, {
        status,
        reason,
      });
      console.log("[AUTH-SERVICE] updateLoanStatus response:", response);
      return response;
    } catch (error) {
      console.error("[AUTH-SERVICE] updateLoanStatus error:", error);
      throw error;
    }
  },

  // Notification Stats
  getNotificationStats: async () => {
    console.log("[AUTH-SERVICE] getNotificationStats called");
    try {
      const response = await api.get("/notifications/admin/stats");
      console.log("[AUTH-SERVICE] getNotificationStats response:", response);
      return response;
    } catch (error) {
      console.error("[AUTH-SERVICE] getNotificationStats error:", error);
      throw error;
    }
  },

  // Admin Transactions
  getAdminTransactions: async (params = {}) => {
    console.log(
      "[AUTH-SERVICE] getAdminTransactions called with params:",
      params
    );
    try {
      const response = await api.get("/transactions/admin/all", { params });
      console.log("[AUTH-SERVICE] getAdminTransactions response:", response);
      return response;
    } catch (error) {
      console.error("[AUTH-SERVICE] getAdminTransactions error:", error);
      throw error;
    }
  },

  // Get notification preferences
  getNotificationPreferences: async () => {
    const response = await api.get("/users/notification-preferences");
    return response;
  },

  // Update notification preferences
  updateNotificationPreferences: async (preferences) => {
    const response = await api.put(
      "/users/notification-preferences",
      preferences
    );
    return response;
  },

  // Get account summary
  getAccountSummary: async () => {
    const response = await api.get("/users/account-summary");
    return response;
  },

  // Get recent activity
  getRecentActivity: async (limit = 10) => {
    const response = await api.get("/users/recent-activity", {
      params: { limit },
    });
    return response;
  },

  // Export user data
  exportUserData: async () => {
    const response = await api.get("/users/export-data", {
      responseType: "blob",
    });
    return response;
  },

  // Request data deletion
  requestDataDeletion: async (reason) => {
    const response = await api.post("/users/request-deletion", { reason });
    return response;
  },

  // Cancel data deletion request
  cancelDataDeletion: async () => {
    const response = await api.delete("/users/request-deletion");
    return response;
  },

  // Get data deletion status
  getDataDeletionStatus: async () => {
    const response = await api.get("/users/deletion-status");
    return response;
  },
};

export default authService;
