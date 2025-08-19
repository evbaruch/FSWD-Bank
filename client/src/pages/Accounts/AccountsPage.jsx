import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  CreditCard, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  EyeOff,
  Download,
  Copy,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { Button, Input, Card } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { toast } from 'react-hot-toast';
import styles from './AccountsPage.module.css';

const AccountsPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [hiddenBalances, setHiddenBalances] = useState({});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.accounts.getAll();
      const accountsList = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setAccounts(accountsList);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to load accounts');
      toast.error('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsCreating(true);
      const result = await apiService.accounts.create(data);
      setAccounts(prev => [result.data, ...prev]);
      setShowCreateForm(false);
      reset();
      toast.success('Account created successfully');
    } catch (error) {
      console.error('Error creating account:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create account';
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleBalanceVisibility = (accountId) => {
    setHiddenBalances(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const copyAccountNumber = (accountNumber) => {
    navigator.clipboard.writeText(accountNumber);
    toast.success('Account number copied to clipboard');
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case 'checking':
        return <CreditCard className={styles.accountIcon} />;
      case 'savings':
        return <DollarSign className={styles.accountIcon} />;
      case 'business':
        return <TrendingUp className={styles.accountIcon} />;
      default:
        return <CreditCard className={styles.accountIcon} />;
    }
  };

  const getAccountTypeColor = (type) => {
    switch (type) {
      case 'checking':
        return styles.checking;
      case 'savings':
        return styles.savings;
      case 'business':
        return styles.business;
      default:
        return styles.checking;
    }
  };

  // Extracted JSX components
  const loadingView = (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading accounts...</p>
    </div>
  );

  const headerSection = (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>Accounts</h1>
        <p className={styles.subtitle}>
          Manage your bank accounts and view balances
        </p>
      </div>
      
      <div className={styles.headerActions}>
        <Button
          variant="primary"
          onClick={() => setShowCreateForm(true)}
          className={styles.createButton}
        >
          <Plus className={styles.icon} />
          Open New Account
        </Button>
      </div>
    </div>
  );

  const errorSection = error && (
    <div className={styles.errorContainer}>
      <AlertCircle className={styles.errorIcon} />
      <span className={styles.errorText}>{error}</span>
    </div>
  );

  const accountCard = (account) => (
    <Card key={account.id} className={styles.accountCard}>
      <div className={styles.accountHeader}>
        <div className={styles.accountInfo}>
          {getAccountIcon(account.type)}
          <div className={styles.accountDetails}>
            <h3 className={styles.accountName}>
              {account.name || `${account.type.charAt(0).toUpperCase() + account.type.slice(1)} Account`}
            </h3>
            <p className={styles.accountNumber}>
              ****{account.accountNumber.slice(-4)}
            </p>
          </div>
        </div>
        
        <div className={styles.accountActions}>
          <Button
            variant="ghost"
            size="small"
            onClick={() => toggleBalanceVisibility(account.id)}
            className={styles.balanceToggle}
          >
            {hiddenBalances[account.id] ? <EyeOff className={styles.icon} /> : <Eye className={styles.icon} />}
          </Button>
          
          <Button
            variant="ghost"
            size="small"
            onClick={() => copyAccountNumber(account.accountNumber)}
            className={styles.copyButton}
          >
            <Copy className={styles.icon} />
          </Button>
          
          <Button
            variant="ghost"
            size="small"
            className={styles.moreButton}
          >
            <MoreVertical className={styles.icon} />
          </Button>
        </div>
      </div>
      
      <div className={styles.accountBalance}>
        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>Available Balance</span>
          <span className={styles.balanceAmount}>
            {hiddenBalances[account.id] 
              ? '••••••' 
              : formatCurrency(account.balance, account.currency)
            }
          </span>
        </div>
        
        <div className={styles.accountType}>
          <span className={`${styles.typeBadge} ${getAccountTypeColor(account.type)}`}>
            {account.type}
          </span>
        </div>
      </div>
      
      <div className={styles.accountFooter}>
        <div className={styles.accountStats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Status</span>
            <span className={styles.statValue}>{account.status}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Currency</span>
            <span className={styles.statValue}>{account.currency}</span>
          </div>
        </div>
        
        <div className={styles.accountActions}>
          <Button
            variant="outline"
            size="small"
            className={styles.actionButton}
          >
            <Download className={styles.icon} />
            Statement
          </Button>
        </div>
      </div>
    </Card>
  );

  const accountsGridSection = (
    <div className={styles.accountsGrid}>
      {accounts.map(accountCard)}
    </div>
  );

  const emptyStateSection = (
    <div className={styles.emptyState}>
      <CreditCard className={styles.emptyIcon} />
      <h3>No accounts found</h3>
      <p>Open your first account to get started</p>
      <Button
        variant="primary"
        onClick={() => setShowCreateForm(true)}
      >
        <Plus className={styles.icon} />
        Open Account
      </Button>
    </div>
  );

  const accountsSection = (
    <div className={styles.accountsContainer}>
      {accounts.length === 0 ? emptyStateSection : accountsGridSection}
    </div>
  );

  const createAccountForm = showCreateForm && (
    <div className={styles.modalOverlay}>
      <Card className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Open New Account</h2>
          <Button
            onClick={() => setShowCreateForm(false)}
            className={styles.closeButton}
          >
            ×
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Account Type</label>
            <select
              {...register("accountType", {
                required: "Account type is required",
              })}
              className={styles.formSelect}
            >
              <option value="">Select account type</option>
              <option value="checking">Checking Account</option>
              <option value="savings">Savings Account</option>
              <option value="business">Business Account</option>
            </select>
            {errors.accountType && (
              <p className={styles.errorText}>
                {errors.accountType.message}
              </p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Currency</label>
            <select
              {...register("currency", {
                required: "Currency is required",
              })}
              className={styles.formSelect}
            >
              <option value="">Select currency</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
            {errors.currency && (
              <p className={styles.errorText}>{errors.currency.message}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Initial Deposit</label>
            <Input
              type="number"
              placeholder="Enter amount"
              {...register("initialDeposit", {
                required: "Initial deposit is required",
                min: {
                  value: 0,
                  message: "Amount must be positive or zero",
                },
                valueAsNumber: true,
              })}
            />
            {errors.initialDeposit && (
              <p className={styles.errorText}>
                {errors.initialDeposit.message}
              </p>
            )}
          </div>

          <div className={styles.formActions}>
            <Button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className={styles.submitButton}
            >
              {isCreating ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );

  if (isLoading) {
    return <div className={styles.container}>{loadingView}</div>;
  }

  return (
    <div className={styles.container}>
      {headerSection}
      {errorSection}
      {accountsSection}
      {createAccountForm}
    </div>
  );
};

export default AccountsPage;
