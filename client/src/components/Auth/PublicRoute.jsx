import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./PublicRoute.module.css";

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to appropriate dashboard
  if (isAuthenticated) {
    const from = location.state?.from?.pathname;
    if (from) {
      return <Navigate to={from} replace />;
    }

    // Redirect based on user role
    if (user?.role === "admin" || user?.role === "manager") {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Render children if not authenticated
  return children;
};

export default PublicRoute;
