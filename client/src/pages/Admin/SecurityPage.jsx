import React, { useState, useEffect } from 'react';
import { useApiOperation } from '../../hooks/useApiOperation';
import { Card, Button } from '../../components/common';
import { toast } from 'react-hot-toast';
import styles from './AdminDashboardPage.module.css';

const SecurityPage = () => {
  const [securityStats, setSecurityStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const { execute: fetchSecurityStats } = useApiOperation('fetch security stats');

  useEffect(() => {
    const loadSecurityData = async () => {
      try {
        setLoading(true);
        const response = await fetchSecurityStats(() => fetch('/api/security/status'));
        if (response.success) {
          setSecurityStats(response.data);
        }
      } catch (error) {
        console.error('Error loading security data:', error);
        toast.error('Failed to load security data');
      } finally {
        setLoading(false);
      }
    };

    loadSecurityData();
  }, [fetchSecurityStats]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading security information...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Security Management</h1>
        <p>Monitor and manage system security</p>
      </div>

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
              <small>{Math.round((securityStats?.session?.timeout || 900000) / 60000)} minutes</small>
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

      <div className={styles.quickActions}>
        <h2>Security Actions</h2>
        <div className={styles.actionGrid}>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin/users'}
            className={styles.actionButton}
          >
            <i className="fas fa-users"></i>
            Manage Users
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin/notifications'}
            className={styles.actionButton}
          >
            <i className="fas fa-bell"></i>
            Security Alerts
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin/reports'}
            className={styles.actionButton}
          >
            <i className="fas fa-chart-bar"></i>
            Security Reports
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin/documents'}
            className={styles.actionButton}
          >
            <i className="fas fa-file-alt"></i>
            Document Review
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;
