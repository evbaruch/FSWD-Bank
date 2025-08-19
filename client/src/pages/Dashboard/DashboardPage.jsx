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

      // Extract data from responses - both should have { success: true, data: [...] }
      const accounts = accountsResponse?.data?.data || [];
      const transactions = transactionsResponse?.data?.data || [];
      
      // Calculate quick stats
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
    } catch (err) {
      console.error('Error loading dashboard data:', err);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAccountNumber = (accountNumber) => {
    return `****${accountNumber.slice(-4)}`;
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownRight className={styles.successIcon} />;
      case 'withdrawal':
        return <ArrowUpRight className={styles.dangerIcon} />;
      case 'transfer':
        return <Send className={styles.primaryIcon} />;
      default:
        return <TrendingUp className={styles.grayIcon} />;
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Error Display */}
      <ErrorDisplay
        error={error}
        onRetry={loadDashboardData}
        onDismiss={() => setError(null)}
        retryCount={0} // No retry count for this new structure
        context="Dashboard data loading"
      />

      {/* Hero Section */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
              Welcome back, {user?.firstName}!
            </h1>
          <p className={styles.heroSubtitle}>
            Your financial overview for today. Everything looks great!
          </p>
          <div className={styles.heroActions}>
            <Link to="/transfers" className={styles.heroButton}>
              <Send className={styles.heroButtonIcon} />
              Send Money
            </Link>
            <Link to="/accounts" className={styles.heroButtonSecondary}>
              <Plus className={styles.heroButtonIcon} />
              Open Account
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={styles.statsGrid}>
        {dashboardData.quickStats.map((stat, index) => (
          <Card key={index} className={`${styles.statCard} ${styles[`statCard${stat.color}`]}`}>
            <div className={styles.statContent}>
              <div className={styles.statIconWrapper}>
                {React.createElement(stat.icon)}
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>{stat.label}</p>
                <p className={styles.statValue}>{stat.value}</p>
                <div className={`${styles.statChange} ${stat.changeType === 'positive' ? styles.positive : styles.negative}`}>
                  {stat.changeType === 'positive' ? (
                  <ArrowUpRight className={styles.changeIcon} />
                ) : (
                  <ArrowDownRight className={styles.changeIcon} />
                )}
                {stat.change}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Accounts Overview */}
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
            {dashboardData.accounts.map((account) => (
              <div key={account.id} className={styles.accountItem}>
                <div className={styles.accountInfo}>
                  <div className={styles.accountIcon}>
                    <CreditCard className={styles.accountIconInner} />
                  </div>
                  <div className={styles.accountDetails}>
                    <p className={styles.accountName}>{account.accountType} Account</p>
                    <p className={styles.accountNumber}>{formatAccountNumber(account.accountNumber)}</p>
                  </div>
                </div>
                <div className={styles.accountBalance}>
                  <p className={styles.balanceText}>
                    {formatCurrency(account.balance)}
                  </p>
                  <p className={styles.accountType}>{account.accountType}</p>
                </div>
              </div>
            ))}
            {dashboardData.accounts.length === 0 && (
              <div className={styles.emptyState}>
                <CreditCard className={styles.emptyStateIcon} />
                <p className={styles.emptyStateText}>No accounts found</p>
                <Link to="/accounts" className={styles.emptyStateLink}>
                  Open your first account
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className={styles.transactionsCard}>
            <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Activity className={styles.cardTitleIcon} />
              <h3 className={styles.cardTitle}>Recent Activity</h3>
            </div>
              <Link to="/transactions" className={styles.cardLink}>
                View All
              </Link>
            </div>
          <div className={styles.transactionsList}>
            {dashboardData.transactions.map((transaction) => (
              <div key={transaction.id} className={styles.transactionItem}>
                <div className={styles.transactionInfo}>
                  <div className={styles.transactionIcon}>
                    {getTransactionIcon(transaction.transactionType)}
                  </div>
                  <div className={styles.transactionDetails}>
                    <p className={styles.transactionDescription}>{transaction.description}</p>
                    <p className={styles.transactionMeta}>
                      {formatDate(transaction.createdAt)} • {transaction.accountType}
                    </p>
                  </div>
                </div>
                <div className={styles.transactionAmount}>
                  <p className={`${styles.amountText} ${transaction.amount > 0 ? styles.positive : styles.negative}`}>
                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                  </p>
                </div>
              </div>
            ))}
            {dashboardData.transactions.length === 0 && (
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
      </div>

      {/* Quick Actions */}
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

      {/* Notifications */}
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
    </div>
  );
};

export default DashboardPage; 