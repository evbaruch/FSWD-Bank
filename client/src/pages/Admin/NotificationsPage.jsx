import React, { useState, useEffect } from "react";
import { useApiOperation } from "../../hooks/useApiOperation";
import { Card, Button } from "../../components/common";
import { toast } from "react-hot-toast";
import { authService } from "../../services/authService";
import styles from "./AdminDashboardPage.module.css";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [notificationStats, setNotificationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "all",
    readStatus: "all",
  });

  const { execute: fetchNotifications } = useApiOperation(
    "fetch notifications"
  );

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log("[NOTIFICATIONS-PAGE] Starting to load notifications");

      const response = await fetchNotifications(() =>
        authService.getNotificationStats()
      );

      console.log("[NOTIFICATIONS-PAGE] Raw response received:", response);

      // Process notifications data
      if (response?.data?.success && response?.data?.data) {
        console.log(
          "[NOTIFICATIONS-PAGE] Setting notification stats:",
          response.data.data
        );
        setNotificationStats(response.data.data);
        setNotifications(response.data.data.recent || []);
      } else if (response?.success && response?.data) {
        console.log(
          "[NOTIFICATIONS-PAGE] Setting notification stats (direct):",
          response.data
        );
        setNotificationStats(response.data);
        setNotifications(response.data.recent || []);
      } else {
        console.log(
          "[NOTIFICATIONS-PAGE] Notifications data not successful:",
          response
        );
        toast.error("Failed to load notifications");
      }
    } catch (error) {
      console.error("[NOTIFICATIONS-PAGE] Error loading notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
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

  const getTypeColor = (type) => {
    switch (type) {
      case "new_user_registration":
        return "success";
      case "loan_status":
        return "warning";
      case "status_change":
        return "info";
      case "security_alert":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "new_user_registration":
        return "New User";
      case "loan_status":
        return "Loan Update";
      case "status_change":
        return "Status Change";
      case "security_alert":
        return "Security Alert";
      default:
        return type;
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesType =
      filters.type === "all" || notification.type === filters.type;
    const matchesReadStatus =
      filters.readStatus === "all" ||
      (filters.readStatus === "read" && notification.isRead) ||
      (filters.readStatus === "unread" && !notification.isRead);

    return matchesType && matchesReadStatus;
  });

  const getUnreadCount = () => {
    return notifications.filter((notification) => !notification.isRead).length;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Notifications Management</h1>
        <p>Monitor and manage system notifications</p>
      </div>

      {/* Notification Stats */}
      {notificationStats && (
        <div className={styles.summaryGrid}>
          <Card className={styles.summaryCard}>
            <h3>Total Notifications</h3>
            <div className={styles.summaryValue}>
              {notificationStats.total || 0}
            </div>
          </Card>

          <Card className={styles.summaryCard}>
            <h3>Unread Notifications</h3>
            <div className={styles.summaryValue}>
              {notificationStats.unread || 0}
            </div>
          </Card>

          <Card className={styles.summaryCard}>
            <h3>Notification Types</h3>
            <div className={styles.summaryValue}>
              {notificationStats.byType?.length || 0}
            </div>
            <div className={styles.summaryBreakdown}>
              {notificationStats.byType?.map((type) => (
                <span key={type.type}>
                  {getTypeLabel(type.type)}: {type.count}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Notifications List */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recent Notifications</h2>
          <div className={styles.sectionActions}>
            {getUnreadCount() > 0 && (
              <span className={styles.pendingBadge}>
                {getUnreadCount()} Unread
              </span>
            )}
            <Button onClick={loadNotifications} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        <div
          style={{
            marginBottom: "1rem",
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <select
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, type: e.target.value }))
            }
            style={{
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            <option value="all">All Types</option>
            <option value="new_user_registration">New User</option>
            <option value="loan_status">Loan Update</option>
            <option value="status_change">Status Change</option>
            <option value="security_alert">Security Alert</option>
          </select>

          <select
            value={filters.readStatus}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, readStatus: e.target.value }))
            }
            style={{
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>

        {filteredNotifications.length > 0 ? (
          <div className={styles.userGrid}>
            {filteredNotifications.map((notification) => (
              <div key={notification.id} className={styles.userCard}>
                <div className={styles.userInfo}>
                  <h4>{notification.title}</h4>
                  <p>{notification.message}</p>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <span
                      className={`${styles.status} ${styles[getTypeColor(notification.type)]}`}
                    >
                      {getTypeLabel(notification.type)}
                    </span>
                    {!notification.isRead && (
                      <span
                        className={styles.status}
                        style={{ background: "#e74c3c", color: "white" }}
                      >
                        Unread
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.userMeta}>
                  <small>
                    User: {notification.firstName} {notification.lastName}
                  </small>
                  <small>Email: {notification.email}</small>
                  <small>Date: {formatDate(notification.createdAt)}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No notifications found matching the current filters.</p>
        )}
      </Card>

      {/* Notification Types Breakdown */}
      {notificationStats?.byType && notificationStats.byType.length > 0 && (
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Notification Types Breakdown</h2>
          </div>
          <div className={styles.notificationStats}>
            {notificationStats.byType.map((type) => (
              <div key={type.type} className={styles.statItem}>
                <span className={styles.statValue}>{type.count}</span>
                <span className={styles.statLabel}>
                  {getTypeLabel(type.type)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default NotificationsPage;
