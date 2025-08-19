import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  Search, 
  Download, 
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { Button, Input, Card, ErrorDisplay } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { useApiOperation } from '../../hooks/useApiOperation';
import styles from './TransactionsPage.module.css';

const TransactionsPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    account: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const { execute: fetchTransactions, isLoading, error, retryCount, clearError } = useApiOperation('Transactions');
  const { execute: fetchAccounts } = useApiOperation('Accounts');

  useEffect(() => {
    loadAccounts();
    loadTransactions();
  }, [pagination.page, filters]);

  const loadAccounts = () => {
    fetchAccounts(async () => {
      const data = await apiService.accounts.getAll();
      setAccounts(data.data || []);
    }, {
      onError: (error, errorType) => {
        console.error('Accounts fetch error:', error);
      }
    });
  };

  const loadTransactions = () => {
    fetchTransactions(async () => {
      const params = {
        page: pagination.page,
        limit: 20,
        ...filters
      };

      const data = await apiService.transactions.getAll(params);
      setTransactions(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }));
    }, {
      onError: (error, errorType) => {
        console.error('Transactions fetch error:', error);
      }
    });
  };

  const { execute: createTransaction, isLoading: isCreating } = useApiOperation('Create Transaction');

  const onSubmit = async (data) => {
    createTransaction(async () => {
      const result = data.transactionType === 'deposit' 
        ? await apiService.transactions.deposit(data)
        : await apiService.transactions.withdrawal(data);
      
      setTransactions(prev => [result.data, ...prev]);
      setShowCreateForm(false);
      reset();
    }, {
      onError: (error, errorType) => {
        console.error('Transaction creation error:', error);
      }
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      account: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
      case 'transfer_in':
        return <ArrowDownLeft className={styles.transactionIcon} />;
      case 'withdrawal':
      case 'transfer_out':
        return <ArrowUpRight className={styles.transactionIcon} />;
      default:
        return <DollarSign className={styles.transactionIcon} />;
    }
  };

  const getTransactionColor = (amount) => {
    return amount > 0 ? styles.positive : styles.negative;
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(Math.abs(amount));
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.accountType} (****${account.accountNumber.slice(-4)})` : 'Unknown Account';
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.subtitle}>
            View and manage your transaction history
          </p>
        </div>
        
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={styles.filterButton}
          >
            <Filter className={styles.icon} />
            Filters
          </Button>
          
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(true)}
            className={styles.createButton}
          >
            <Plus className={styles.icon} />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Error Display */}
      <ErrorDisplay
        error={error}
        onRetry={loadTransactions}
        onDismiss={clearError}
        retryCount={retryCount}
        context="Transactions loading"
      />

      {/* Filters */}
      {showFilters && (
        <Card className={styles.filtersCard}>
          <div className={styles.filtersHeader}>
            <h3>Filter Transactions</h3>
            <Button
              variant="ghost"
              onClick={() => setShowFilters(false)}
            >
              ×
            </Button>
          </div>
          
          <div className={styles.filtersContent}>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label>Transaction Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className={styles.select}
                >
                  <option value="">All Types</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="transfer_in">Transfers In</option>
                  <option value="transfer_out">Transfers Out</option>
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label>Account</label>
                <select
                  value={filters.account}
                  onChange={(e) => handleFilterChange('account', e.target.value)}
                  className={styles.select}
                >
                  <option value="">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.accountType} (****{account.accountNumber.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label>Date From</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              
              <div className={styles.filterGroup}>
                <label>Date To</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
              
              <div className={styles.filterGroup}>
                <label>Search</label>
                <div className={styles.searchContainer}>
                  <Search className={styles.searchIcon} />
                  <Input
                    type="text"
                    placeholder="Search transactions..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className={styles.filterActions}>
              <Button
                variant="outline"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowFilters(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Create Transaction Form */}
      {showCreateForm && (
        <Card className={styles.createForm}>
          <div className={styles.formHeader}>
            <h3>New Transaction</h3>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateForm(false);
                reset();
              }}
            >
              ×
            </Button>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Transaction Type</label>
                <select
                  {...register('transactionType', { required: 'Transaction type is required' })}
                  className={styles.select}
                >
                  <option value="">Select type</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
                {errors.transactionType && (
                  <span className={styles.error}>{errors.transactionType.message}</span>
                )}
              </div>
              
              <div className={styles.formGroup}>
                <label>Account</label>
                <select
                  {...register('accountId', { required: 'Account is required' })}
                  className={styles.select}
                >
                  <option value="">Select account</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.accountType} (****{account.accountNumber.slice(-4)}) - {formatCurrency(account.balance, account.currency)}
                    </option>
                  ))}
                </select>
                {errors.accountId && (
                  <span className={styles.error}>{errors.accountId.message}</span>
                )}
              </div>
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Enter amount"
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  })}
                  error={errors.amount?.message}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Description</label>
                <Input
                  type="text"
                  placeholder="Transaction description"
                  {...register('description', {
                    maxLength: { value: 255, message: 'Description too long' }
                  })}
                  error={errors.description?.message}
                />
              </div>
            </div>
            
            <div className={styles.formActions}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create Transaction
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Transactions List */}
      <div className={styles.transactionsContainer}>
        {transactions.length === 0 ? (
          <div className={styles.emptyState}>
            <TrendingUp className={styles.emptyIcon} />
            <h3>No transactions found</h3>
            <p>Create your first transaction to get started</p>
            <Button
              variant="primary"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className={styles.icon} />
              New Transaction
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.transactionsList}>
              {transactions.map((transaction) => (
                <Card key={transaction.id} className={styles.transactionCard}>
                  <div className={styles.transactionHeader}>
                    <div className={styles.transactionInfo}>
                      {getTransactionIcon(transaction.transactionType)}
                      <div className={styles.transactionDetails}>
                        <h4 className={styles.transactionType}>
                          {transaction.transactionType.replace('_', ' ').toUpperCase()}
                        </h4>
                        <p className={styles.transactionDescription}>
                          {transaction.description}
                        </p>
                        <p className={styles.transactionAccount}>
                          {getAccountName(transaction.accountId)}
                        </p>
                      </div>
                    </div>
                    
                    <div className={styles.transactionAmount}>
                      <span className={`${styles.amount} ${getTransactionColor(transaction.amount)}`}>
                        {transaction.amount > 0 ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                      <span className={styles.reference}>
                        Ref: {transaction.referenceNumber}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.transactionFooter}>
                    <span className={styles.transactionDate}>
                      {formatDate(transaction.createdAt)}
                    </span>
                    <span className={`${styles.status} ${styles[transaction.status]}`}>
                      {transaction.status}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="outline"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                
                <span className={styles.pageInfo}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage; 