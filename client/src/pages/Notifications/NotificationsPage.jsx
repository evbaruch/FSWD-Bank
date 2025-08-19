import React, { useEffect, useState } from 'react';
import { Card, Button, Input } from '../../components/common';
import { authService } from '../../services/authService';
import styles from './NotificationsPage.module.css';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [filters, setFilters] = useState({ search: '', type: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await authService.api.get('/notifications');
        const payload = res?.data || res;
        if (payload?.success) setNotifications(payload.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const headerView = (
    <div className={styles.header}>
      <h1>Notifications</h1>
      <p>Stay up to date with account and system activity</p>
    </div>
  );

  const filterBar = (
    <Card className={styles.filtersCard}>
      <div className={styles.filtersContent}>
        <div className={styles.searchSection}>
          <Input
            placeholder="Search notifications..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className={styles.filterSection}>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className={styles.filterSelect}
          >
            <option value="">All Types</option>
            <option value="transaction_completed">Transactions</option>
            <option value="transfer_completed">Transfers</option>
            <option value="loan_application_submitted">Loans</option>
            <option value="loan_approved">Loan Approved</option>
            <option value="loan_rejected">Loan Rejected</option>
            <option value="security_alert">Security</option>
          </select>
        </div>
      </div>
    </Card>
  );

  const filtered = notifications.filter((n) => {
    const matchesType = !filters.type || n.type === filters.type;
    const matchesSearch = !filters.search || (n.title + ' ' + n.message).toLowerCase().includes(filters.search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const listView = (
    <div className={styles.list}>
      {filtered.length === 0 ? (
        <Card className={styles.emptyCard}>
          <div className={styles.emptyState}>
            <h3>No notifications</h3>
            <p>You're all caught up</p>
          </div>
        </Card>
      ) : (
        filtered.map((n) => (
          <Card key={n.id} className={styles.notificationCard}>
            <div className={styles.notificationHeader}>
              <div className={styles.notificationTitle}>{n.title}</div>
              <div className={styles.notificationMeta}>{new Date(n.created_at || n.createdAt).toLocaleString()}</div>
            </div>
            <div className={styles.notificationBody}>{n.message}</div>
            <div className={styles.notificationFooter}>
              <span className={`${styles.badge} ${styles[n.type?.replace(/[^a-z]/g, '') || 'default']}`}>{n.type}</span>
              {!n.read && <Button size="small" variant="outline">Mark as read</Button>}
            </div>
          </Card>
        ))
      )}
    </div>
  );

  const loadingView = (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading notifications...</p>
    </div>
  );

  if (loading) {
    return <div className={styles.container}>{loadingView}</div>;
  }

  return (
    <div className={styles.container}>
      {headerView}
      {filterBar}
      {listView}
    </div>
  );
};

export default NotificationsPage;