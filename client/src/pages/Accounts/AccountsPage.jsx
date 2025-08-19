import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import {
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  DollarSign,
  TrendingUp,
  Download,
  Settings,
  Search,
  RefreshCw,
  Shield,
  Activity,
} from "lucide-react";
import { Button, Input, Card, ErrorDisplay } from "../../components/common";
import { apiService } from "../../services/apiService";
import { useApiOperation } from "../../hooks/useApiOperation";
import styles from "./AccountsPage.module.css";

const AccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get("/accounts");
      setAccounts(response.data?.data || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const { execute: createAccount, isLoading: isCreating } =
    useApiOperation("Create Account");

  const onSubmit = async (data) => {
    createAccount(
      async () => {
        console.log("Form data before encrypting/sending:", data);
        const result = await apiService.accounts.create(data);
        setAccounts((prev) => [result.data, ...prev]);
        setShowCreateForm(false);
        reset();
      },
      {
        onError: (error, errorType) => {
          console.error("Account creation error:", error);
        },
      }
    );
  };

  const getAccountIcon = (accountType) => {
    switch (accountType) {
      case "checking":
        return <CreditCard className={styles.accountIcon} />;
      case "savings":
        return <TrendingUp className={styles.accountIcon} />;
      case "business":
        return <DollarSign className={styles.accountIcon} />;
      default:
        return <CreditCard className={styles.accountIcon} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return styles.statusActive;
      case "inactive":
        return styles.statusInactive;
      case "frozen":
        return styles.statusFrozen;
      default:
        return styles.statusInactive;
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatAccountNumber = (accountNumber) => {
    return `****${accountNumber.slice(-4)}`;
  };

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.accountType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountNumber.includes(searchTerm);
    const matchesFilter =
      filterType === "all" || account.accountType === filterType;
    return matchesSearch && matchesFilter;
  });

  const totalBalance = accounts.reduce(
    (sum, account) => sum + parseFloat(account.balance || 0),
    0
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading your accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Error Display */}
      <ErrorDisplay
        error={error}
        onRetry={loadAccounts}
        onDismiss={() => setError(null)}
        retryCount={0} // retryCount is not defined in the new_code, so it's set to 0
        context="Accounts data loading"
      />

      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Your Accounts</h1>
            <p className={styles.pageSubtitle}>
              Manage your accounts and view balances
            </p>
          </div>
          <div className={styles.headerRight}>
            <Button
              onClick={() => setShowCreateForm(true)}
              className={styles.createButton}
            >
              <Plus className={styles.buttonIcon} />
              Open New Account
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryIcon}>
              <DollarSign className={styles.summaryIconInner} />
            </div>
            <div className={styles.summaryInfo}>
              <p className={styles.summaryLabel}>Total Balance</p>
              <p className={styles.summaryValue}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
          </div>
        </Card>

        <Card className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryIcon}>
              <CreditCard className={styles.summaryIconInner} />
            </div>
            <div className={styles.summaryInfo}>
              <p className={styles.summaryLabel}>Active Accounts</p>
              <p className={styles.summaryValue}>{accounts.length}</p>
            </div>
          </div>
        </Card>

        <Card className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryIcon}>
              <Activity className={styles.summaryIconInner} />
            </div>
            <div className={styles.summaryInfo}>
              <p className={styles.summaryLabel}>This Month</p>
              <p className={styles.summaryValue}>
                {formatCurrency(totalBalance * 0.15)}
              </p>
            </div>
          </div>
        </Card>

        <Card className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryIcon}>
              <Shield className={styles.summaryIconInner} />
            </div>
            <div className={styles.summaryInfo}>
              <p className={styles.summaryLabel}>Security Score</p>
              <p className={styles.summaryValue}>98%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className={styles.filtersCard}>
        <div className={styles.filtersContent}>
          <div className={styles.searchSection}>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.filterSection}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Accounts</option>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="business">Business</option>
            </select>

            <Button onClick={loadAccounts} className={styles.refreshButton}>
              <RefreshCw className={styles.buttonIcon} />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Accounts Grid */}
      <div className={styles.accountsGrid}>
        {filteredAccounts.map((account) => (
          <Card key={account.id} className={styles.accountCard}>
            <div className={styles.accountHeader}>
              <div className={styles.accountInfo}>
                <div className={styles.accountIconWrapper}>
                  {getAccountIcon(account.accountType)}
                </div>
                <div className={styles.accountDetails}>
                  <h3 className={styles.accountName}>
                    {account.accountType} Account
                  </h3>
                  <p className={styles.accountNumber}>
                    {formatAccountNumber(account.accountNumber)}
                  </p>
                </div>
              </div>
              <div className={styles.accountStatus}>
                <span
                  className={`${styles.statusBadge} ${getStatusColor(account.status)}`}
                >
                  {account.status}
                </span>
              </div>
            </div>

            <div className={styles.accountBalance}>
              <div className={styles.balanceInfo}>
                <p className={styles.balanceLabel}>Available Balance</p>
                <p className={styles.balanceAmount}>
                  {showBalances ? formatCurrency(account.balance) : "••••••"}
                </p>
              </div>
              <Button
                onClick={() => setShowBalances(!showBalances)}
                className={styles.toggleButton}
              >
                {showBalances ? (
                  <EyeOff className={styles.buttonIcon} />
                ) : (
                  <Eye className={styles.buttonIcon} />
                )}
              </Button>
            </div>

            <div className={styles.accountActions}>
              <Button className={styles.actionButton}>
                <Activity className={styles.buttonIcon} />
                View Activity
              </Button>
              <Button className={styles.actionButton}>
                <Download className={styles.buttonIcon} />
                Statement
              </Button>
              <Button className={styles.actionButton}>
                <Settings className={styles.buttonIcon} />
                Settings
              </Button>
            </div>
          </Card>
        ))}

        {filteredAccounts.length === 0 && (
          <Card className={styles.emptyCard}>
            <div className={styles.emptyState}>
              <CreditCard className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>No accounts found</h3>
              <p className={styles.emptyDescription}>
                {searchTerm || filterType !== "all"
                  ? "Try adjusting your search or filters"
                  : "You don't have any accounts yet. Open your first account to get started."}
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className={styles.emptyButton}
              >
                <Plus className={styles.buttonIcon} />
                Open Your First Account
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateForm && (
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
              {/* Account Type */}
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

              {/* Currency */}
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

              {/* Initial Deposit */}
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
                    valueAsNumber: true, // ensures it's a number, not string
                  })}
                />
                {errors.initialDeposit && (
                  <p className={styles.errorText}>
                    {errors.initialDeposit.message}
                  </p>
                )}
              </div>

              {/* Form Actions */}
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
      )}
    </div>
  );
};

export default AccountsPage;
