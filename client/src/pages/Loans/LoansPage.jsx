import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  FileText, 
  Plus, 
  Calculator, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  DollarSign,
  Calendar,
  TrendingUp,
  Filter,
  Search,
  Download,
  Eye
} from 'lucide-react';
import { Button, Input, Card } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import styles from './LoansPage.module.css';

const LoansPage = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: ''
  });
  const [calculatorData, setCalculatorData] = useState({
    amount: 10000,
    term: 12,
    interestRate: 5.0
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm();

  const loanType = watch('loanType');

  useEffect(() => {
    fetchLoans();
  }, [filters]);

  const fetchLoans = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.loans.getAll(filters);
      setLoans(data.data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
      setError('Failed to load loans');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const result = await apiService.loans.apply(data);
      setLoans(prev => [result.data, ...prev]);
      setShowApplicationForm(false);
      reset();
    } catch (error) {
      console.error('Error submitting loan application:', error);
      setError(error.response?.data?.error || error.message || 'Failed to submit loan application');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      type: '',
      search: ''
    });
  };

  const calculateLoan = () => {
    const { amount, term, interestRate } = calculatorData;
    const monthlyRate = interestRate / 100 / 12;
    const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                          (Math.pow(1 + monthlyRate, term) - 1);
    const totalPayment = monthlyPayment * term;
    const totalInterest = totalPayment - amount;

    return {
      monthlyPayment: monthlyPayment.toFixed(2),
      totalPayment: totalPayment.toFixed(2),
      totalInterest: totalInterest.toFixed(2)
    };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className={styles.statusIcon} />;
      case 'pending':
        return <Clock className={styles.statusIcon} />;
      case 'rejected':
        return <XCircle className={styles.statusIcon} />;
      default:
        return <AlertCircle className={styles.statusIcon} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return styles.statusApproved;
      case 'pending':
        return styles.statusPending;
      case 'rejected':
        return styles.statusRejected;
      default:
        return styles.statusPending;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLoanTypeIcon = (type) => {
    switch (type) {
      case 'personal':
        return <DollarSign className={styles.loanIcon} />;
      case 'business':
        return <TrendingUp className={styles.loanIcon} />;
      case 'mortgage':
        return <FileText className={styles.loanIcon} />;
      case 'auto':
        return <Calendar className={styles.loanIcon} />;
      default:
        return <FileText className={styles.loanIcon} />;
    }
  };

  const getInterestRate = (type) => {
    switch (type) {
      case 'personal':
        return 8.0;
      case 'business':
        return 6.0;
      case 'mortgage':
        return 4.0;
      case 'auto':
        return 7.0;
      default:
        return 5.0;
    }
  };

  if (isLoading && loans.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading loans...</p>
        </div>
      </div>
    );
  }

  const calculatedLoan = calculateLoan();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Loans</h1>
          <p className={styles.subtitle}>
            Apply for loans and manage your existing loans
          </p>
        </div>
        
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            onClick={() => setShowCalculator(!showCalculator)}
            className={styles.calculatorButton}
          >
            <Calculator className={styles.icon} />
            Loan Calculator
          </Button>
          
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
            onClick={() => setShowApplicationForm(true)}
            className={styles.applyButton}
          >
            <Plus className={styles.icon} />
            Apply for Loan
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

      {/* Loan Calculator */}
      {showCalculator && (
        <Card className={styles.calculatorCard}>
          <div className={styles.calculatorHeader}>
            <h3>Loan Calculator</h3>
            <Button
              variant="ghost"
              onClick={() => setShowCalculator(false)}
            >
              ×
            </Button>
          </div>
          
          <div className={styles.calculatorContent}>
            <div className={styles.calculatorInputs}>
              <div className={styles.calculatorGroup}>
                <label>Loan Amount ($)</label>
                <Input
                  type="number"
                  value={calculatorData.amount}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  min="1000"
                  step="1000"
                />
              </div>
              
              <div className={styles.calculatorGroup}>
                <label>Term (months)</label>
                <Input
                  type="number"
                  value={calculatorData.term}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, term: parseInt(e.target.value) || 12 }))}
                  min="12"
                  max="360"
                  step="12"
                />
              </div>
              
              <div className={styles.calculatorGroup}>
                <label>Interest Rate (%)</label>
                <Input
                  type="number"
                  value={calculatorData.interestRate}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                  min="1"
                  max="20"
                  step="0.1"
                />
              </div>
            </div>
            
            <div className={styles.calculatorResults}>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Monthly Payment:</span>
                <span className={styles.resultValue}>${calculatedLoan.monthlyPayment}</span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Total Payment:</span>
                <span className={styles.resultValue}>${calculatedLoan.totalPayment}</span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Total Interest:</span>
                <span className={styles.resultValue}>${calculatedLoan.totalInterest}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className={styles.filtersCard}>
          <div className={styles.filtersHeader}>
            <h3>Filter Loans</h3>
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
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label>Loan Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className={styles.select}
                >
                  <option value="">All Types</option>
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                  <option value="mortgage">Mortgage</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label>Search</label>
                <div className={styles.searchContainer}>
                  <Search className={styles.searchIcon} />
                  <Input
                    type="text"
                    placeholder="Search loans..."
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

      {/* Loan Application Form */}
      {showApplicationForm && (
        <Card className={styles.applicationForm}>
          <div className={styles.formHeader}>
            <h3>Loan Application</h3>
            <Button
              variant="ghost"
              onClick={() => {
                setShowApplicationForm(false);
                reset();
              }}
            >
              ×
            </Button>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Loan Type</label>
                <select
                  {...register('loanType', { required: 'Loan type is required' })}
                  className={styles.select}
                >
                  <option value="">Select loan type</option>
                  <option value="personal">Personal Loan</option>
                  <option value="business">Business Loan</option>
                  <option value="mortgage">Mortgage Loan</option>
                  <option value="auto">Auto Loan</option>
                </select>
                {errors.loanType && (
                  <span className={styles.error}>{errors.loanType.message}</span>
                )}
              </div>
              
              <div className={styles.formGroup}>
                <label>Amount ($)</label>
                <Input
                  type="number"
                  step="1000"
                  min="1000"
                  max="1000000"
                  placeholder="Enter loan amount"
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 1000, message: 'Minimum amount is $1,000' },
                    max: { value: 1000000, message: 'Maximum amount is $1,000,000' }
                  })}
                  error={errors.amount?.message}
                />
              </div>
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Term (months)</label>
                <Input
                  type="number"
                  min="12"
                  max="360"
                  step="12"
                  placeholder="Enter loan term"
                  {...register('term', {
                    required: 'Term is required',
                    min: { value: 12, message: 'Minimum term is 12 months' },
                    max: { value: 360, message: 'Maximum term is 360 months' }
                  })}
                  error={errors.term?.message}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Annual Income ($)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Enter annual income"
                  {...register('income', {
                    required: 'Income is required',
                    min: { value: 0, message: 'Income must be positive' }
                  })}
                  error={errors.income?.message}
                />
              </div>
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Employment Status</label>
                <select
                  {...register('employmentStatus', { required: 'Employment status is required' })}
                  className={styles.select}
                >
                  <option value="">Select employment status</option>
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                </select>
                {errors.employmentStatus && (
                  <span className={styles.error}>{errors.employmentStatus.message}</span>
                )}
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label>Purpose</label>
              <textarea
                {...register('purpose', {
                  required: 'Purpose is required',
                  minLength: { value: 10, message: 'Purpose must be at least 10 characters' },
                  maxLength: { value: 500, message: 'Purpose must be less than 500 characters' }
                })}
                placeholder="Describe the purpose of this loan..."
                className={styles.textarea}
                rows="4"
              />
              {errors.purpose && (
                <span className={styles.error}>{errors.purpose.message}</span>
              )}
            </div>
            
            {loanType && (
              <div className={styles.loanPreview}>
                <h4>Loan Preview</h4>
                <div className={styles.previewDetails}>
                  <div className={styles.previewItem}>
                    <span>Interest Rate:</span>
                    <span>{getInterestRate(loanType)}%</span>
                  </div>
                  <div className={styles.previewItem}>
                    <span>Estimated Monthly Payment:</span>
                    <span>${calculateLoan().monthlyPayment}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className={styles.formActions}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowApplicationForm(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Submit Application
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Loans List */}
      <div className={styles.loansContainer}>
        {loans.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText className={styles.emptyIcon} />
            <h3>No loans found</h3>
            <p>Apply for your first loan to get started</p>
            <Button
              variant="primary"
              onClick={() => setShowApplicationForm(true)}
            >
              <Plus className={styles.icon} />
              Apply for Loan
            </Button>
          </div>
        ) : (
          <div className={styles.loansList}>
            {loans.map((loan) => (
              <Card key={loan.id} className={styles.loanCard}>
                <div className={styles.loanHeader}>
                  <div className={styles.loanInfo}>
                    {getLoanTypeIcon(loan.loanType)}
                    <div className={styles.loanDetails}>
                      <h4 className={styles.loanType}>
                        {loan.loanType.charAt(0).toUpperCase() + loan.loanType.slice(1)} Loan
                      </h4>
                      <p className={styles.loanPurpose}>
                        {loan.purpose}
                      </p>
                    </div>
                  </div>
                  
                  <div className={styles.loanStatus}>
                    <span className={`${styles.status} ${getStatusColor(loan.status)}`}>
                      {getStatusIcon(loan.status)}
                      {loan.status}
                    </span>
                  </div>
                </div>
                
                <div className={styles.loanDetails}>
                  <div className={styles.loanAmount}>
                    <span className={styles.amountLabel}>Loan Amount</span>
                    <span className={styles.amount}>{formatCurrency(loan.amount)}</span>
                  </div>
                  
                  <div className={styles.loanTerms}>
                    <div className={styles.termItem}>
                      <span>Interest Rate:</span>
                      <span>{(loan.interestRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className={styles.termItem}>
                      <span>Term:</span>
                      <span>{loan.term} months</span>
                    </div>
                    <div className={styles.termItem}>
                      <span>Monthly Payment:</span>
                      <span>{formatCurrency(loan.monthlyPayment)}</span>
                    </div>
                  </div>
                </div>
                
                <div className={styles.loanFooter}>
                  <div className={styles.loanDates}>
                    <span className={styles.applicationDate}>
                      Applied: {formatDate(loan.applicationDate)}
                    </span>
                    {loan.approvedDate && (
                      <span className={styles.approvedDate}>
                        Approved: {formatDate(loan.approvedDate)}
                      </span>
                    )}
                  </div>
                  
                  <div className={styles.loanActions}>
                    <Button
                      variant="ghost"
                      size="small"
                    >
                      <Eye className={styles.icon} />
                      View Details
                    </Button>
                    {loan.status === 'approved' && (
                      <Button
                        variant="outline"
                        size="small"
                      >
                        <Download className={styles.icon} />
                        Download Documents
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoansPage; 