import React, { useState, useEffect } from 'react';
import { useApiOperation } from '../../hooks/useApiOperation';
import { Card, Button } from '../../components/common';
import { toast } from 'react-hot-toast';
import { authService } from '../../services/authService';
import styles from './AdminDashboardPage.module.css';

const ReportsPage = () => {
  const [financialSummary, setFinancialSummary] = useState(null);
  const [transactionReport, setTransactionReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { execute: fetchFinancialSummary } = useApiOperation('fetch financial summary');
  const { execute: fetchTransactionReport } = useApiOperation('fetch transaction report');

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    try {
      setLoading(true);
      console.log("[REPORTS-PAGE] Starting to load reports");
      
      const [financialData, transactionData] = await Promise.all([
        fetchFinancialSummary(() => authService.getAdminDashboardData()),
        fetchTransactionReport(() => 
          authService.getAdminReports({ 
            startDate: dateRange.startDate, 
            endDate: dateRange.endDate 
          })
        )
      ]);

      console.log("[REPORTS-PAGE] Raw responses received:");
      console.log("[REPORTS-PAGE] Financial data:", financialData);
      console.log("[REPORTS-PAGE] Transaction data:", transactionData);

      // Process financial data
      if (financialData?.data?.success && financialData?.data?.data) {
        console.log("[REPORTS-PAGE] Setting financial summary:", financialData.data.data);
        setFinancialSummary(financialData.data.data);
      } else if (financialData?.success && financialData?.data) {
        console.log("[REPORTS-PAGE] Setting financial summary (direct):", financialData.data);
        setFinancialSummary(financialData.data);
      } else {
        console.log("[REPORTS-PAGE] Financial data not successful:", financialData);
      }

      // Process transaction data
      if (transactionData?.data?.success && Array.isArray(transactionData?.data?.data)) {
        console.log("[REPORTS-PAGE] Setting transaction report:", transactionData.data.data);
        setTransactionReport(transactionData.data.data);
      } else if (transactionData?.success && Array.isArray(transactionData?.data)) {
        console.log("[REPORTS-PAGE] Setting transaction report (direct):", transactionData.data);
        setTransactionReport(transactionData.data);
      } else {
        console.log("[REPORTS-PAGE] Transaction data not successful:", transactionData);
      }
      
    } catch (error) {
      console.error('[REPORTS-PAGE] Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    if (transactionReport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Type', 'Amount', 'Description', 'Account', 'Status', 'User'];
    const csvData = transactionReport.map(transaction => [
      formatDate(transaction.createdAt),
      transaction.transactionType,
      formatCurrency(transaction.amount),
      transaction.description,
      transaction.accountNumber,
      transaction.status,
      `${transaction.firstName} ${transaction.lastName}`
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading reports...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Financial Reports</h1>
        <p>Comprehensive financial analysis and transaction reports</p>
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
                Pending: {financialSummary.users?.totalUsers - financialSummary.users?.activeUsers || 0}
              </span>
            </div>
          </Card>

          <Card className={styles.summaryCard}>
            <h3>Total Accounts</h3>
            <div className={styles.summaryValue}>
              {financialSummary.accounts?.totalAccounts || 0}
            </div>
            <div className={styles.summaryBreakdown}>
              <span>Active: {financialSummary.accounts?.activeAccounts || 0}</span>
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
              <span>Deposits: {formatCurrency(financialSummary.transactions?.totalDeposits || 0)}</span>
              <span>Withdrawals: {formatCurrency(financialSummary.transactions?.totalWithdrawals || 0)}</span>
            </div>
          </Card>
        </div>
      )}

      {/* Date Range Filter */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Transaction Report</h2>
          <div className={styles.sectionActions}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <Button onClick={exportToCSV} variant="primary">
              Export CSV
            </Button>
          </div>
        </div>

        {transactionReport.length > 0 ? (
          <div className={styles.transactionGrid}>
            {transactionReport.map((transaction) => (
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
                  <small>User: {transaction.firstName} {transaction.lastName}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No transactions found for the selected date range.</p>
        )}
      </Card>
    </div>
  );
};

export default ReportsPage; 