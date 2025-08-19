import React, { useState, useEffect } from 'react';
import { useApiOperation } from '../../hooks/useApiOperation';
import { Card, Button, Input } from '../../components/common';
import { toast } from 'react-hot-toast';
import { authService } from '../../services/authService';
import styles from './AdminDashboardPage.module.css';

const SecurityPage = () => {
  const [securityStats, setSecurityStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const { execute: fetchSecurityStats } = useApiOperation('fetch security stats');
  const { execute: updateSessionSettings } = useApiOperation('update session settings');

  useEffect(() => {
    const loadSecurityData = async () => {
      try {
        setLoading(true);
        const response = await fetchSecurityStats(() => authService.api.get('/security/status'));
        const payload = response?.data || response;
        if (payload?.success) setSecurityStats(payload.data);
      } catch (error) {
        console.error('Error loading security data:', error);
        toast.error('Failed to load security data');
      } finally {
        setLoading(false);
      }
    };

    loadSecurityData();
  }, [fetchSecurityStats]);

  const loadingView = (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading security information...</p>
    </div>
  );

  if (loading) {
    return <div className={styles.container}>{loadingView}</div>;
  }

  const headerView = (
    <div className={styles.header}>
      <h1>Security Management</h1>
      <p>Monitor and manage system security</p>
    </div>
  );

  const summaryView = (
    <div className={styles.summaryGrid}>
      <Card className={styles.summaryCard}>
        <div className={styles.summaryContent}>
          <div className={styles.summaryIcon}>
            <i className="fas fa-shield-alt"></i>
          </div>
          <div className={styles.summaryInfo}>
            <h3>Active Sessions</h3>
            <p>Current active user sessions</p>
            <small>{securityStats?.session?.activeSessions || 0} Active</small>
          </div>
        </div>
      </Card>
      <Card className={styles.summaryCard}>
        <div className={styles.summaryContent}>
          <div className={styles.summaryIcon}>
            <i className="fas fa-lock"></i>
          </div>
          <div className={styles.summaryInfo}>
            <h3>Rate Limiting</h3>
            <p>API request limits</p>
            <small>{securityStats?.rateLimiting?.maxRequests || 100} requests per {Math.round((securityStats?.rateLimiting?.windowMs || 900000) / 60000)} minutes</small>
          </div>
        </div>
      </Card>
      <Card className={styles.summaryCard}>
        <div className={styles.summaryContent}>
          <div className={styles.summaryIcon}>
            <i className="fas fa-key"></i>
          </div>
          <div className={styles.summaryInfo}>
            <h3>Session Timeout</h3>
            <p>Automatic session expiration</p>
            <small>{Math.round((securityStats?.session?.timeout || 900000) / 60)} minutes</small>
          </div>
        </div>
      </Card>
      <Card className={styles.summaryCard}>
        <div className={styles.summaryContent}>
          <div className={styles.summaryIcon}>
            <i className="fas fa-globe"></i>
          </div>
          <div className={styles.summaryInfo}>
            <h3>HSTS</h3>
            <p>HTTP Strict Transport Security</p>
            <small>{securityStats?.hsts?.enabled ? 'Enabled' : 'Disabled'}</small>
          </div>
        </div>
      </Card>
    </div>
  );

  const controlsView = (
    <Card className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Controls</h2>
      </div>
      <div className={styles.userDetails}>
        <div className={styles.detailItem}>
          <span>Session Timeout (minutes)</span>
          <Input
            type="number"
            min={5}
            max={1440}
            defaultValue={Math.round((securityStats?.session?.timeout || 900) / 60)}
            onBlur={async (e) => {
              const timeoutMinutes = parseInt(e.target.value, 10);
              if (Number.isNaN(timeoutMinutes)) return;
              try {
                const res = await updateSessionSettings(() => authService.api.put('/security/settings/session', { timeoutMinutes }));
                const payload = res?.data || res;
                if (payload?.success) {
                  toast.success('Session timeout updated');
                  setSecurityStats((prev) => ({ ...prev, session: { ...prev.session, timeout: payload.data.timeout } }));
                } else {
                  toast.error(payload?.message || 'Failed to update');
                }
              } catch (err) {
                toast.error('Failed to update');
              }
            }}
          />
        </div>
        <div className={styles.detailItem}>
          <span>Max Sessions Per User</span>
          <Input
            type="number"
            min={1}
            max={50}
            defaultValue={securityStats?.session?.maxSessionsPerUser || 5}
            onBlur={async (e) => {
              const maxSessionsPerUser = parseInt(e.target.value, 10);
              if (Number.isNaN(maxSessionsPerUser)) return;
              try {
                const res = await updateSessionSettings(() => authService.api.put('/security/settings/session', { maxSessionsPerUser }));
                const payload = res?.data || res;
                if (payload?.success) {
                  toast.success('Max sessions updated');
                  setSecurityStats((prev) => ({ ...prev, session: { ...prev.session, maxSessionsPerUser: payload.data.maxSessionsPerUser } }));
                } else {
                  toast.error(payload?.message || 'Failed to update');
                }
              } catch (err) {
                toast.error('Failed to update');
              }
            }}
          />
        </div>
      </div>
    </Card>
  );

  return (
    <div className={styles.container}>
      {headerView}
      {summaryView}
      {controlsView}
      <div className={styles.quickActions}>
        <h2>Security Actions</h2>
        <div className={styles.actionGrid}>
          <Button variant="outline" onClick={() => window.location.href = '/admin/users'} className={styles.actionButton}>
            <i className="fas fa-users"></i>
            Manage Users
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/admin/notifications'} className={styles.actionButton}>
            <i className="fas fa-bell"></i>
            Security Alerts
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/admin/reports'} className={styles.actionButton}>
            <i className="fas fa-chart-bar"></i>
            Security Reports
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/admin/documents'} className={styles.actionButton}>
            <i className="fas fa-file-alt"></i>
            Document Review
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;
