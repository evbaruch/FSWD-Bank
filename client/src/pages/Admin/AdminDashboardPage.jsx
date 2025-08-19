import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApiOperation } from "../../hooks/useApiOperation";
import { Card, Button } from "../../components/common";
import { toast } from "react-hot-toast";
import { authService } from "../../services/authService";
import styles from "./AdminDashboardPage.module.css";

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [financialSummary, setFinancialSummary] = useState(null);
  const [notificationStats, setNotificationStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const { execute: fetchFinancialSummary } = useApiOperation(
    "fetch financial summary"
  );
  const { execute: fetchNotificationStats } = useApiOperation(
    "fetch notification stats"
  );
  const { execute: fetchUsers } = useApiOperation("fetch users");
  const { execute: fetchTransactions } = useApiOperation("fetch transactions");

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        console.log("[ADMIN-DASHBOARD] Starting to load dashboard data");

        // Fetch all dashboard data in parallel
        const [financialData, notificationData, usersData, transactionsData] =
          await Promise.all([
            fetchFinancialSummary(() => authService.getAdminDashboardData()),
            fetchNotificationStats(() => authService.getNotificationStats()),
            fetchUsers(() => authService.getUsers()),
            fetchTransactions(() =>
              authService.getAdminTransactions({ limit: 5 })
            ),
          ]);

        console.log("[ADMIN-DASHBOARD] Raw responses received:");
        console.log("[ADMIN-DASHBOARD] Financial data:", financialData);
        console.log("[ADMIN-DASHBOARD] Notification data:", notificationData);
        console.log("[ADMIN-DASHBOARD] Users data:", usersData);
        console.log("[ADMIN-DASHBOARD] Transactions data:", transactionsData);

        // Process financial data
        if (financialData?.data?.success && financialData?.data?.data) {
          console.log(
            "[ADMIN-DASHBOARD] Setting financial summary:",
            financialData.data.data
          );
          setFinancialSummary(financialData.data.data);
        } else if (financialData?.success && financialData?.data) {
          console.log(
            "[ADMIN-DASHBOARD] Setting financial summary (direct):",
            financialData.data
          );
          setFinancialSummary(financialData.data);
        } else {
          console.log(
            "[ADMIN-DASHBOARD] Financial data not successful:",
            financialData
          );
        }

        // Process notification data
        if (notificationData?.data?.success && notificationData?.data?.data) {
          console.log(
            "[ADMIN-DASHBOARD] Setting notification stats:",
            notificationData.data.data
          );
          setNotificationStats(notificationData.data.data);
        } else if (notificationData?.success && notificationData?.data) {
          console.log(
            "[ADMIN-DASHBOARD] Setting notification stats (direct):",
            notificationData.data
          );
          setNotificationStats(notificationData.data);
        } else {
          console.log(
            "[ADMIN-DASHBOARD] Notification data not successful:",
            notificationData
          );
        }

        // Process users data
        if (usersData?.data?.success && Array.isArray(usersData?.data?.data)) {
          console.log(
            "[ADMIN-DASHBOARD] Setting recent users:",
            usersData.data.data.slice(0, 5)
          );
          setRecentUsers(usersData.data.data.slice(0, 5));
        } else if (usersData?.success && Array.isArray(usersData?.data)) {
          console.log(
            "[ADMIN-DASHBOARD] Setting recent users (direct):",
            usersData.data.slice(0, 5)
          );
          setRecentUsers(usersData.data.slice(0, 5));
        } else {
          console.log(
            "[ADMIN-DASHBOARD] Users data not successful:",
            usersData
          );
        }

        // Process transactions data
        if (
          transactionsData?.data?.success &&
          Array.isArray(transactionsData?.data?.data)
        ) {
          console.log(
            "[ADMIN-DASHBOARD] Setting recent transactions:",
            transactionsData.data.data.slice(0, 5)
          );
          setRecentTransactions(transactionsData.data.data.slice(0, 5));
        } else if (
          transactionsData?.success &&
          Array.isArray(transactionsData?.data)
        ) {
          console.log(
            "[ADMIN-DASHBOARD] Setting recent transactions (direct):",
            transactionsData.data.slice(0, 5)
          );
          setRecentTransactions(transactionsData.data.slice(0, 5));
        } else {
          console.log(
            "[ADMIN-DASHBOARD] Transactions data not successful:",
            transactionsData
          );
        }
      } catch (error) {
        console.error("[ADMIN-DASHBOARD] Error loading dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [
    fetchFinancialSummary,
    fetchNotificationStats,
    fetchUsers,
    fetchTransactions,
  ]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "suspended":
        return "danger";
      case "inactive":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getPendingUsersCount = () => {
    return recentUsers.filter((user) => user.status === "pending").length;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {user?.firstName}!</p>
      </div>

      {/* Financial Summary */}
      {financialSummary && (
        <div className={styles.summaryGrid}>
          <Card className={styles.summaryCard}>
            <h3>Total Users</h3>
            <div className={styles.summaryValue}>
              {financialSummary.users?.totalUsers || 0}
            </div>
            <div className={styles.summaryBreakdown}>
              <span>Active: {financialSummary.users?.activeUsers || 0}</span>
              <span className={styles.pendingCount}>
                Pending:{" "}
                {financialSummary.users?.totalUsers -
                  financialSummary.users?.activeUsers || 0}
              </span>
            </div>
          </Card>

          <Card className={styles.summaryCard}>
            <h3>Total Accounts</h3>
            <div className={styles.summaryValue}>
              {financialSummary.accounts?.totalAccounts || 0}
            </div>
            <div className={styles.summaryBreakdown}>
              <span>
                Active: {financialSummary.accounts?.activeAccounts || 0}
              </span>
            </div>
          </Card>

          <Card className={styles.summaryCard}>
            <h3>Total Balance</h3>
            <div className={styles.summaryValue}>
              {formatCurrency(financialSummary.accounts?.totalBalance || 0)}
            </div>
          </Card>

          <Card className={styles.summaryCard}>
            <h3>Total Transactions</h3>
            <div className={styles.summaryValue}>
              {financialSummary.transactions?.totalTransactions || 0}
            </div>
            <div className={styles.summaryBreakdown}>
              <span>
                Deposits:{" "}
                {formatCurrency(
                  financialSummary.transactions?.totalDeposits || 0
                )}
              </span>
              <span>
                Withdrawals:{" "}
                {formatCurrency(
                  financialSummary.transactions?.totalWithdrawals || 0
                )}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Users */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recent Users</h2>
          <div className={styles.sectionActions}>
            {getPendingUsersCount() > 0 && (
              <span className={styles.pendingBadge}>
                {getPendingUsersCount()} Pending
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/admin/users")}
            >
              View All Users
            </Button>
          </div>
        </div>
        {recentUsers.length > 0 ? (
          <div className={styles.userGrid}>
            {recentUsers.map((user) => (
              <div key={user.id} className={styles.userCard}>
                <div className={styles.userInfo}>
                  <h4>
                    {user.firstName} {user.lastName}
                  </h4>
                  <p>{user.email}</p>
                  <span
                    className={`${styles.status} ${styles[getStatusColor(user.status)]}`}
                  >
                    {user.status}
                  </span>
                </div>
                <div className={styles.userMeta}>
                  <small>Role: {user.role}</small>
                  <small>Joined: {formatDate(user.createdAt)}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No recent users found.</p>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recent Transactions</h2>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/admin/reports")}
          >
            View All Transactions
          </Button>
        </div>
        {recentTransactions.length > 0 ? (
          <div className={styles.transactionGrid}>
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className={styles.transactionCard}>
                <div className={styles.transactionInfo}>
                  <h4>{transaction.transactionType}</h4>
                  <p>{transaction.description}</p>
                  <span className={styles.amount}>
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
                <div className={styles.transactionMeta}>
                  <small>Account: {transaction.accountNumber}</small>
                  <small>Date: {formatDate(transaction.createdAt)}</small>
                  <small>Status: {transaction.status}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No recent transactions found.</p>
        )}
      </Card>

      {/* Notification Stats */}
      {notificationStats && (
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Notifications</h2>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/admin/notifications")}
            >
              View All Notifications
            </Button>
          </div>
          <div className={styles.notificationStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {notificationStats.total || 0}
              </span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {notificationStats.unread || 0}
              </span>
              <span className={styles.statLabel}>Unread</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboardPage;
