import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Send,
  FileText,
  Bell,
  Download,
  Shield,
  Activity,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card, ErrorDisplay } from '../../components/common';
import { apiService } from '../../services/apiService';
import { useApiOperation } from '../../hooks/useApiOperation';
import styles from './DashboardPage.module.css';

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState({
    accounts: [],
    transactions: [],
    quickStats: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [accountsResponse, transactionsResponse] = await Promise.all([
        apiService.get('/accounts'),
        apiService.get('/transactions?limit=5')
      ]);

      const accounts = accountsResponse?.data?.data || [];
      const transactions = transactionsResponse?.data?.data || [];
      
      const totalBalance = accounts.reduce((sum, account) => {
        const balance = parseFloat(account.balance) || 0;
        return sum + balance;
      }, 0);
      
      const activeAccounts = accounts.filter(account => account.status === 'active').length;
      const monthlyActivity = transactions.filter(t => {
        const transactionDate = new Date(t.createdAt);
        const now = new Date();
        return transactionDate.getMonth() === now.getMonth() && 
               transactionDate.getFullYear() === now.getFullYear();
      }).length;

      const quickStats = [
        {
          label: 'Total Balance',
          value: `$${totalBalance.toLocaleString()}`,
          change: '+2.5%',
          changeType: 'positive',
          icon: DollarSign,
          color: 'primary'
        },
        {
          label: 'Active Accounts',
          value: activeAccounts.toString(),
          change: '+1',
          changeType: 'positive',
          icon: CreditCard,
          color: 'success'
        },
        {
          label: 'Monthly Activity',
          value: monthlyActivity.toString(),
          change: '+12%',
          changeType: 'positive',
          icon: Activity,
          color: 'info'
        },
        {
          label: 'Security Score',
          value: '95%',
          change: '+3%',
          changeType: 'positive',
          icon: Shield,
          color: 'warning'
        }
      ];

      setDashboardData({
        accounts,
        transactions,
        quickStats
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
        return <ArrowUpRight className={styles.transactionIcon} />;
      case 'withdrawal':
        return <ArrowDownRight className={styles.transactionIcon} />;
      case 'transfer':
        return <Send className={styles.transactionIcon} />;
      default:
        return <Activity className={styles.transactionIcon} />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'deposit':
        return styles.positive;
      case 'withdrawal':
        return styles.negative;
      case 'transfer':
        return styles.neutral;
      default:
        return styles.neutral;
    }
  };

  // Extracted JSX components
  const loadingView = (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading dashboard...</p>
    </div>
  );

  const headerSection = (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>Welcome back, {user?.firstName || 'User'}!</h1>
        <p className={styles.subtitle}>Here's what's happening with your accounts today.</p>
      </div>
      <div className={styles.headerActions}>
        <button onClick={loadDashboardData} className={styles.refreshButton}>
          <TrendingUp className={styles.refreshIcon} />
          Refresh
        </button>
      </div>
    </div>
  );

  const quickStatsSection = (
    <div className={styles.statsGrid}>
      {dashboardData.quickStats.map((stat, index) => (
        <Card key={index} className={styles.statCard}>
          <div className={styles.statContent}>
            <div className={styles.statIcon}>
              <stat.icon className={styles[stat.color]} />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>{stat.label}</p>
              <h3 className={styles.statValue}>{stat.value}</h3>
              <div className={styles.statChange}>
                <span className={styles[stat.changeType]}>
                  {stat.change}
                </span>
                <span className={styles.changeLabel}>from last month</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const accountsSection = (
    <Card className={styles.accountsCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleWrapper}>
          <CreditCard className={styles.cardTitleIcon} />
          <h3 className={styles.cardTitle}>Your Accounts</h3>
        </div>
        <Link to="/accounts" className={styles.cardLink}>
          View All
        </Link>
      </div>
      <div className={styles.accountsList}>
        {dashboardData.accounts.length > 0 ? (
          dashboardData.accounts.slice(0, 3).map((account) => (
            <div key={account.id} className={styles.accountItem}>
              <div className={styles.accountInfo}>
                <h4 className={styles.accountName}>{account.name}</h4>
                <p className={styles.accountNumber}>****{account.accountNumber.slice(-4)}</p>
              </div>
              <div className={styles.accountBalance}>
                <span className={styles.balanceAmount}>
                  {formatCurrency(account.balance)}
                </span>
                <span className={styles.accountType}>{account.type}</span>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <CreditCard className={styles.emptyStateIcon} />
            <p className={styles.emptyStateText}>No accounts found</p>
            <Link to="/accounts" className={styles.emptyStateLink}>
              Open an account
            </Link>
          </div>
        )}
      </div>
    </Card>
  );

  const transactionsSection = (
    <Card className={styles.transactionsCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleWrapper}>
          <Activity className={styles.cardTitleIcon} />
          <h3 className={styles.cardTitle}>Recent Transactions</h3>
        </div>
        <Link to="/transactions" className={styles.cardLink}>
          View All
        </Link>
      </div>
      <div className={styles.transactionsList}>
        {dashboardData.transactions.length > 0 ? (
          dashboardData.transactions.map((transaction) => (
            <div key={transaction.id} className={styles.transactionItem}>
              <div className={styles.transactionIcon}>
                {getTransactionIcon(transaction.type)}
              </div>
              <div className={styles.transactionInfo}>
                <h4 className={styles.transactionTitle}>{transaction.description}</h4>
                <p className={styles.transactionDate}>{formatDate(transaction.createdAt)}</p>
              </div>
              <div className={styles.transactionAmount}>
                <span className={getTransactionColor(transaction.type)}>
                  {transaction.type === 'withdrawal' ? '-' : '+'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <Activity className={styles.emptyStateIcon} />
            <p className={styles.emptyStateText}>No recent transactions</p>
            <Link to="/transactions" className={styles.emptyStateLink}>
              View all transactions
            </Link>
          </div>
        )}
      </div>
    </Card>
  );

  const quickActionsSection = (
    <Card className={styles.actionsCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleWrapper}>
          <Zap className={styles.cardTitleIcon} />
          <h3 className={styles.cardTitle}>Quick Actions</h3>
        </div>
      </div>
      <div className={styles.actionsGrid}>
        <Link to="/transfers" className={styles.actionItem}>
          <div className={styles.actionIcon}>
            <Send className={styles.actionIconInner} />
          </div>
          <span className={styles.actionText}>Transfer Money</span>
        </Link>
        
        <Link to="/loans" className={styles.actionItem}>
          <div className={styles.actionIcon}>
            <FileText className={styles.actionIconInner} />
          </div>
          <span className={styles.actionText}>Apply for Loan</span>
        </Link>
        
        <Link to="/accounts" className={styles.actionItem}>
          <div className={styles.actionIcon}>
            <Plus className={styles.actionIconInner} />
          </div>
          <span className={styles.actionText}>Open Account</span>
        </Link>
        
        <Link to="/transactions" className={styles.actionItem}>
          <div className={styles.actionIcon}>
            <Download className={styles.actionIconInner} />
          </div>
          <span className={styles.actionText}>Download Statement</span>
        </Link>
      </div>
    </Card>
  );

  const notificationsSection = (
    <Card className={styles.notificationsCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleWrapper}>
          <Bell className={styles.cardTitleIcon} />
          <h3 className={styles.cardTitle}>Recent Notifications</h3>
        </div>
        <Link to="/notifications" className={styles.cardLink}>
          View All
        </Link>
      </div>
      <div className={styles.notificationsList}>
        <div className={styles.notificationItem}>
          <div className={styles.notificationIcon}>
            <Bell className={styles.notificationIconInner} />
          </div>
          <div className={styles.notificationContent}>
            <p className={styles.notificationTitle}>Account Statement Ready</p>
            <p className={styles.notificationText}>Your monthly statement is now available for download.</p>
            <p className={styles.notificationTime}>2 hours ago</p>
          </div>
        </div>
        
        <div className={styles.notificationItem}>
          <div className={styles.notificationIcon}>
            <Bell className={styles.notificationIconInner} />
          </div>
          <div className={styles.notificationContent}>
            <p className={styles.notificationTitle}>Transfer Completed</p>
            <p className={styles.notificationText}>Your transfer of $500 to Savings Account has been completed.</p>
            <p className={styles.notificationTime}>1 day ago</p>
          </div>
        </div>
        
        <div className={styles.notificationItem}>
          <div className={styles.notificationIcon}>
            <Bell className={styles.notificationIconInner} />
          </div>
          <div className={styles.notificationContent}>
            <p className={styles.notificationTitle}>Security Alert</p>
            <p className={styles.notificationText}>New login detected from a new device. Please verify if this was you.</p>
            <p className={styles.notificationTime}>3 days ago</p>
          </div>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return <div className={styles.container}>{loadingView}</div>;
  }

  if (error) {
    return (
      <div className={styles.container}>
        <ErrorDisplay error={error} onRetry={loadDashboardData} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {headerSection}
      {quickStatsSection}
      <div className={styles.contentGrid}>
        {accountsSection}
        {transactionsSection}
      </div>
      <div className={styles.bottomGrid}>
        {quickActionsSection}
        {notificationsSection}
      </div>
    </div>
  );
};

export default DashboardPage; 