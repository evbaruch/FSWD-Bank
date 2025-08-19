import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import PublicRoute from "./components/Auth/PublicRoute";
import { ErrorBoundary } from "./components/common";
import styles from "./App.module.css";

// Public Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import OAuthCallbackPage from "./pages/Auth/OAuthCallbackPage";
import ForgotPasswordPage from "./pages/Auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/Auth/ResetPasswordPage";

// Protected Pages
import DashboardPage from "./pages/Dashboard/DashboardPage";
import AccountsPage from "./pages/Accounts/AccountsPage";
import TransactionsPage from "./pages/Transactions/TransactionsPage";
import TransfersPage from "./pages/Transfers/TransfersPage";
import LoansPage from "./pages/Loans/LoansPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import DocumentsPage from "./pages/Documents/DocumentsPage";
import NotificationsPage from "./pages/Notifications/NotificationsPage";

// Admin/Manager Pages
import AdminDashboardPage from "./pages/Admin/AdminDashboardPage";
import UserManagementPage from "./pages/Admin/UserManagementPage";
import LoanApplicationsPage from "./pages/Admin/LoanApplicationsPage";
import ReportsPage from "./pages/Admin/ReportsPage";
import SecurityPage from "./pages/Admin/SecurityPage";
import AdminNotificationsPage from "./pages/Admin/NotificationsPage";
import AdminDocumentsPage from "./pages/Admin/DocumentsPage";

// Error Pages
import NotFoundPage from "./pages/Errors/NotFoundPage";
import UnauthorizedPage from "./pages/Errors/UnauthorizedPage";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading FSWD Bank...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary context="Application root">
      <Helmet>
        <title>FSWD Bank - Secure Banking Solutions</title>
        <meta
          name="description"
          content="Your trusted financial partner with secure banking, loans, and investment services."
        />
      </Helmet>

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <Layout>
                <AccountsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Layout>
                <TransactionsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/transfers"
          element={
            <ProtectedRoute>
              <Layout>
                <TransfersPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/loans"
          element={
            <ProtectedRoute>
              <Layout>
                <LoansPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Layout>
                <DocumentsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <NotificationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin/Manager Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole={["admin", "manager"]}>
              <Layout>
                <AdminDashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole={["admin"]}>
              <Layout>
                <UserManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/loans"
          element={
            <ProtectedRoute requiredRole={["admin", "manager"]}>
              <Layout>
                <LoanApplicationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute requiredRole={["admin", "manager"]}>
              <Layout>
                <ReportsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/security"
          element={
            <ProtectedRoute requiredRole={["admin"]}>
              <Layout>
                <SecurityPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute requiredRole={["admin", "manager"]}>
              <Layout>
                <AdminNotificationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/documents"
          element={
            <ProtectedRoute requiredRole={["admin"]}>
              <Layout>
                <AdminDocumentsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Error Routes */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        {/* Redirects */}
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        <Route path="/account" element={<Navigate to="/accounts" replace />} />
        <Route
          path="/transaction"
          element={<Navigate to="/transactions" replace />}
        />
        <Route
          path="/transfer"
          element={<Navigate to="/transfers" replace />}
        />
        <Route path="/loan" element={<Navigate to="/loans" replace />} />

        {/* Catch all route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
