import React, { createContext, useContext, useReducer, useEffect } from "react";
import { useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import toast from "react-hot-toast";

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  loading: true,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        loading: true,
        error: null,
      };

    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
      };

    case "AUTH_FAILURE":
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        loading: false,
        error: action.payload,
      };

    case "LOGOUT":
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        loading: false,
        error: null,
      };

    case "UPDATE_USER":
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        // No remembered session; show login immediately
        console.log("[AUTH] No stored user found, showing login");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      try {
        console.log("[AUTH] Found stored user, verifying session");
        dispatch({ type: "AUTH_START" });
        
        // Verify cookie-based session only if we previously remembered a user
        const response = await authService.verifyToken();
        const serverUser = response.data?.data?.user || response.data?.user;
        
        if (serverUser && serverUser.status === "active") {
          // Update stored user with fresh data from server
          localStorage.setItem("user", JSON.stringify(serverUser));
          dispatch({
            type: "AUTH_SUCCESS",
            payload: {
              user: serverUser,
              token: "cookie",
              refreshToken: "cookie",
            },
          });
          console.log("[AUTH] Session verified successfully");
        } else {
          // Server verification failed or user is not active, clear stored data
          console.log("[AUTH] Session verification failed or user not active, clearing data");
          localStorage.removeItem("user");
          queryClient.clear();
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } catch (error) {
        console.warn("[AUTH] Session verification failed:", error);
        // Clear stored data on any error
        localStorage.removeItem("user");
        queryClient.clear();
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };
    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      // Clear any existing state before attempting login
      dispatch({ type: "AUTH_START" });
      localStorage.removeItem("user");
      queryClient.clear();

      console.log("[AUTH] Attempting login with credentials:", credentials);
      const response = await authService.login(credentials);
      console.log("[AUTH] Login response:", response.data);

      // Handle the encrypted response structure
      let userData;

      // Check if the response is encrypted and has been decrypted by the service layer
      if (response.data?.data?.user) {
        // Standard response structure after decryption
        userData = response.data.data.user;
        console.log("[AUTH] Using standard response structure");
      } else if (response.data?.user) {
        // Direct user data in response
        userData = response.data.user;
        console.log("[AUTH] Using direct user data");
      } else if (response.data?.success && response.data?.data) {
        // Try to extract from data object
        userData = response.data.data;
        console.log("[AUTH] Using data object as user data");
      } else {
        // Fallback - use the entire response
        userData = response.data;
        console.log("[AUTH] Using entire response as user data");
      }

      console.log("[AUTH] Extracted user data:", userData);

      // Check if user data exists and has required fields
      if (!userData || !userData.id || !userData.email) {
        const message = "Invalid response format. Please try again.";
        console.error("[AUTH] Invalid user data:", userData);
        dispatch({
          type: "AUTH_FAILURE",
          payload: message,
        });
        toast.error(message);
        return { success: false, error: message };
      }

      // Check if user account is active
      if (userData.status !== "active") {
        const message = `Account is ${userData.status}. Please contact support.`;
        console.log("[AUTH] Login rejected - account status:", userData.status);
        dispatch({
          type: "AUTH_FAILURE",
          payload: message,
        });
        toast.error(message);
        return { success: false, error: message };
      }

      // Store user data in localStorage for session persistence
      localStorage.setItem("user", JSON.stringify(userData));

      // With httpOnly cookies, tokens are automatically handled by the browser
      // We only need to store user data and set a flag for authentication
      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user: userData, token: "cookie", refreshToken: "cookie" },
      });

      console.log("[AUTH] State updated with user data");
      toast.success("Login successful!");

      // Redirect based on user role
      if (userData.role === "admin" || userData.role === "manager") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }

      return { success: true };
    } catch (error) {
      console.error("[ERROR] Login error:", error);
      console.error("[ERROR] Error response:", error.response?.data);

      // Ensure state is cleared on any login error
      localStorage.removeItem("user");
      queryClient.clear();

      const message = error.response?.data?.message || "Login failed";
      dispatch({
        type: "AUTH_FAILURE",
        payload: message,
      });

      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      console.log("[AUTH] Starting registration with data:", userData);
      dispatch({ type: "AUTH_START" });

      const response = await authService.register(userData);
      console.log("[AUTH] Registration response:", response.data);

      dispatch({ type: "SET_LOADING", payload: false });

      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      console.error("[AUTH] Registration error:", error);
      console.error("[AUTH] Error response:", error.response?.data);
      const message = error.response?.data?.message || "Registration failed";
      dispatch({
        type: "AUTH_FAILURE",
        payload: message,
      });

      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log("[AUTH] Starting logout process");

      // Clear state immediately to prevent showing dashboard
      dispatch({ type: "LOGOUT" });
      localStorage.removeItem("user");
      queryClient.clear();

      // With httpOnly cookies, the server handles token invalidation
      await authService.logout();

      toast.success("Logged out successfully");
      console.log("[AUTH] Logout completed successfully");

      // Navigate to home page
      navigate("/");
    } catch (error) {
      console.error("[AUTH] Logout error:", error);
      // Even if server logout fails, clear local state
      localStorage.removeItem("user");
      queryClient.clear();
      dispatch({ type: "LOGOUT" });
      toast.success("Logged out successfully");

      // Navigate to home page even on error
      navigate("/");
    }
  };

  // Refresh token function
  const refreshAuthToken = async () => {
    try {
      // With httpOnly cookies, refresh is handled automatically by axios interceptor
      await authService.refreshToken();

      // Update state (tokens are handled by cookies)
      dispatch({
        type: "AUTH_SUCCESS",
        payload: {
          user: state.user,
          token: "cookie",
          refreshToken: "cookie",
        },
      });

      return "cookie";
    } catch (error) {
      console.error("Token refresh failed:", error);

      // Clear user data and logout
      localStorage.removeItem("user");
      queryClient.clear();
      dispatch({ type: "LOGOUT" });

      throw error;
    }
  };

  // Update user function
  const updateUser = (userData) => {
    dispatch({
      type: "UPDATE_USER",
      payload: userData,
    });
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  // Role checking functions
  const hasRole = (requiredRoles) => {
    if (!state.user || !state.user.role) return false;

    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(state.user.role);
    }

    return state.user.role === requiredRoles;
  };

  const isAdmin = () => hasRole("admin");
  const isManager = () => hasRole(["admin", "manager"]);
  const isCustomer = () => hasRole("customer");

  // Force logout function (for debugging and clearing corrupted sessions)
  const forceLogout = () => {
    console.log("[AUTH] Force logout called - clearing all state");
    localStorage.removeItem("user");
    queryClient.clear();
    dispatch({ type: "LOGOUT" });
    navigate("/");
  };

  // Context value
  const value = {
    user: state.user,
    token: state.token,
    refreshToken: state.refreshToken,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    login,
    register,
    logout,
    forceLogout,
    refreshAuthToken,
    updateUser,
    clearError,
    hasRole,
    isAdmin,
    isManager,
    isCustomer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
