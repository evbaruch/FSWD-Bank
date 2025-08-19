import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Send, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  DollarSign,
  ArrowRight,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { Button, Input, Card } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import styles from './TransfersPage.module.css';

const TransfersPage = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
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
    watch,
    formState: { errors }
  } = useForm();

  const fromAccountId = watch('fromAccountId');

  useEffect(() => {
    fetchAccounts();
    fetchTransfers();
  }, [pagination.page, filters]);

  const fetchAccounts = async () => {
    try {
      const data = await apiService.accounts.getAll();
      setAccounts(data.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...filters
      };

      const data = await apiService.transfers.getAll(params);
      setTransfers(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Error fetching transfers:', error);
      setError('Failed to load transfers');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
        console.log('Form data before encrypting/sending:', data);
      const result = await apiService.transfers.create(data);
      setTransfers(prev => [result.data, ...prev]);
      setShowCreateForm(false);
      reset();
    } catch (error) {
      console.error('Error creating transfer:', error);
      setError(error.response?.data?.error || error.message || 'Failed to create transfer');
    }
  };

  const cancelTransfer = async (transferId) => {
    try {
      await apiService.transfers.cancel(transferId);
      setTransfers(prev => 
        prev.map(transfer => 
          transfer.id === transferId 
            ? { ...transfer, status: 'cancelled' }
            : transfer
        )
      );
    } catch (error) {
      console.error('Error cancelling transfer:', error);
      setError(error.response?.data?.error || error.message || 'Failed to cancel transfer');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className={styles.statusIcon} />;
      case 'pending':
        return <Clock className={styles.statusIcon} />;
      case 'cancelled':
        return <XCircle className={styles.statusIcon} />;
      default:
        return <AlertCircle className={styles.statusIcon} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return styles.statusCompleted;
      case 'pending':
        return styles.statusPending;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
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

  const formatAccountNumber = (accountNumber) => {
    return `****${accountNumber.slice(-4)}`;
  };

  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.accountType} (${formatAccountNumber(account.accountNumber)})` : 'Unknown Account';
  };

  if (isLoading && transfers.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading transfers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Transfers</h1>
          <p className={styles.subtitle}>
            Send money between your accounts or to other users
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
            New Transfer
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorContainer}>
          <AlertCircle className={styles.errorIcon} />
          <span className={styles.errorText}>{error}</span>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className={styles.filtersCard}>
          <div className={styles.filtersHeader}>
            <h3>Filter Transfers</h3>
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
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className={styles.select}
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
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
            </div>
            
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label>Search</label>
                <div className={styles.searchContainer}>
                  <Search className={styles.searchIcon} />
                  <Input
                    type="text"
                    placeholder="Search transfers..."
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

      {/* Create Transfer Form */}
      {showCreateForm && (
        <Card className={styles.createForm}>
          <div className={styles.formHeader}>
            <h3>New Transfer</h3>
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
                <label>From Account</label>
                <select
                  {...register('fromAccountId', { required: 'From account is required' })}
                  className={styles.select}
                >
                  <option value="">Select account</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.accountType} ({formatAccountNumber(account.accountNumber)}) - {formatCurrency(account.balance, account.currency)}
                    </option>
                  ))}
                </select>
                {errors.fromAccountId && (
                  <span className={styles.error}>{errors.fromAccountId.message}</span>
                )}
              </div>
              
              <div className={styles.formGroup}>
                <label>To Account</label>
                <select
                  {...register('toAccountId', { required: 'To account is required' })}
                  className={styles.select}
                >
                  <option value="">Select account</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id} disabled={account.id === fromAccountId}>
                      {account.accountType} ({formatAccountNumber(account.accountNumber)})
                    </option>
                  ))}
                </select>
                {errors.toAccountId && (
                  <span className={styles.error}>{errors.toAccountId.message}</span>
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
                  placeholder="Transfer description"
                  {...register('description', {
                    maxLength: { value: 255, message: 'Description too long' }
                  })}
                  error={errors.description?.message}
                />
              </div>
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Schedule Transfer (Optional)</label>
                <Input
                  type="datetime-local"
                  {...register('scheduledDate')}
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
                Create Transfer
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Transfers List */}
      <div className={styles.transfersContainer}>
        {transfers.length === 0 ? (
          <div className={styles.emptyState}>
            <Send className={styles.emptyIcon} />
            <h3>No transfers found</h3>
            <p>Create your first transfer to get started</p>
            <Button
              variant="primary"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className={styles.icon} />
              New Transfer
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.transfersList}>
              {transfers.map((transfer) => (
                <Card key={transfer.id} className={styles.transferCard}>
                  <div className={styles.transferHeader}>
                    <div className={styles.transferInfo}>
                      <div className={styles.transferDirection}>
                        <span className={styles.fromAccount}>
                          {getAccountName(transfer.fromAccountId)}
                        </span>
                        <ArrowRight className={styles.arrowIcon} />
                        <span className={styles.toAccount}>
                          {getAccountName(transfer.toAccountId)}
                        </span>
                      </div>
                      
                      <div className={styles.transferDetails}>
                        <p className={styles.transferDescription}>
                          {transfer.description}
                        </p>
                        <p className={styles.transferReference}>
                          Ref: {transfer.referenceNumber}
                        </p>
                      </div>
                    </div>
                    
                    <div className={styles.transferAmount}>
                      <span className={styles.amount}>
                        {formatCurrency(transfer.amount)}
                      </span>
                      <span className={`${styles.status} ${getStatusColor(transfer.status)}`}>
                        {getStatusIcon(transfer.status)}
                        {transfer.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.transferFooter}>
                    <div className={styles.transferDates}>
                      <span className={styles.createdDate}>
                        Created: {formatDate(transfer.createdAt)}
                      </span>
                      {transfer.scheduledDate && (
                        <span className={styles.scheduledDate}>
                          Scheduled: {formatDate(transfer.scheduledDate)}
                        </span>
                      )}
                      {transfer.completedAt && (
                        <span className={styles.completedDate}>
                          Completed: {formatDate(transfer.completedAt)}
                        </span>
                      )}
                    </div>
                    
                    <div className={styles.transferActions}>
                      {transfer.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => cancelTransfer(transfer.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
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

export default TransfersPage; 