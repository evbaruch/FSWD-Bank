import React, { useState, useEffect } from "react";
import { useApiOperation } from "../../hooks/useApiOperation";
import { Card, Button } from "../../components/common";
import { toast } from "react-hot-toast";
import { authService } from "../../services/authService";
import styles from "./LoanApplicationsPage.module.css";

const LoanApplicationsPage = () => {
  const [loanApplications, setLoanApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
  });
  const [selectedLoan, setSelectedLoan] = useState(null);

  const { execute: fetchLoanApplications } = useApiOperation("fetch loan applications");
  const { execute: updateLoanStatus } = useApiOperation("update loan status");

  useEffect(() => {
    loadLoanApplications();
  }, []);

  const loadLoanApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("[LOAN-APPLICATIONS] Starting to load loan applications");

      const directResponse = await authService.getLoanApplications();
      console.log("[LOAN-APPLICATIONS] Direct API raw response:", directResponse);
      console.log("[LOAN-APPLICATIONS] Direct API response data:", directResponse.data);
      console.log("[LOAN-APPLICATIONS] Direct API response headers:", directResponse.headers);

      const authServiceResponse = directResponse;
      console.log("[LOAN-APPLICATIONS] AuthService raw response:", authServiceResponse);
      console.log("[LOAN-APPLICATIONS] AuthService response data:", authServiceResponse.data);

      let loanData = [];
      let extractionMethod = "none";

      if (
        authServiceResponse?.success &&
        authServiceResponse?.data?.success &&
        authServiceResponse?.data?.data
      ) {
        console.log("[LOAN-APPLICATIONS] Method 1: AuthService nested success structure");
        if (Array.isArray(authServiceResponse.data.data)) {
          loanData = authServiceResponse.data.data;
          extractionMethod = "auth_service_nested_success";
        }
      } else if (
        authServiceResponse?.data?.data &&
        Array.isArray(authServiceResponse.data.data)
      ) {
        console.log("[LOAN-APPLICATIONS] Method 2: AuthService nested data");
        loanData = authServiceResponse.data.data;
        extractionMethod = "auth_service_nested_data";
      } else if (authServiceResponse && Array.isArray(authServiceResponse)) {
        console.log("[LOAN-APPLICATIONS] Method 3: AuthService direct array");
        loanData = authServiceResponse;
        extractionMethod = "auth_service_direct_array";
      } else if (
        authServiceResponse?.data &&
        Array.isArray(authServiceResponse.data)
      ) {
        console.log("[LOAN-APPLICATIONS] Method 4: AuthService response.data is array");
        loanData = authServiceResponse.data;
        extractionMethod = "auth_service_response_data_array";
      } else if (
        authServiceResponse?.data?.success &&
        authServiceResponse?.data?.data &&
        Array.isArray(authServiceResponse.data.data)
      ) {
        console.log("[LOAN-APPLICATIONS] Method 5: AuthService data.success.data array");
        loanData = authServiceResponse.data.data;
        extractionMethod = "auth_service_data_success_data_array";
      } else if (
        authServiceResponse?.success &&
        authServiceResponse?.data &&
        Array.isArray(authServiceResponse.data)
      ) {
        console.log("[LOAN-APPLICATIONS] Method 6: AuthService success.data array");
        loanData = authServiceResponse.data;
        extractionMethod = "auth_service_success_data_array";
      } else {
        console.log("[LOAN-APPLICATIONS] Method 7: Fallback - try direct response");
        if (directResponse?.data?.data && Array.isArray(directResponse.data.data)) {
          loanData = directResponse.data.data;
          extractionMethod = "direct_response_data_data_array";
        } else if (directResponse?.data && Array.isArray(directResponse.data)) {
          loanData = directResponse.data;
          extractionMethod = "direct_response_data_array";
        } else if (directResponse && Array.isArray(directResponse)) {
          loanData = directResponse;
          extractionMethod = "direct_response_array";
        }
      }

      console.log("[LOAN-APPLICATIONS] Final extraction method:", extractionMethod);
      console.log("[LOAN-APPLICATIONS] Final loan data:", loanData);

      if (loanData.length > 0) {
        const mappedLoans = loanData.map((loan) => ({
          id: loan.id,
          userName: `${loan.first_name || loan.firstName || ""} ${loan.last_name || loan.lastName || ""}`.trim(),
          email: loan.email,
          amount: loan.amount,
          term: loan.term_months || loan.term,
          purpose: loan.purpose,
          income: loan.income,
          employment_status: loan.employment_status || loan.employmentStatus,
          interest_rate: loan.interest_rate || loan.interestRate,
          status: loan.status,
          createdAt: loan.created_at || loan.createdAt || loan.applicationDate,
          approvedAt: loan.approved_at || loan.approvedAt || loan.approvedDate,
        }));

        console.log("[LOAN-APPLICATIONS] All mapped loans:", mappedLoans);
        setLoanApplications(mappedLoans);
      } else {
        console.log("[LOAN-APPLICATIONS] No loan applications found");
        setLoanApplications([]);
        toast.info("No loan applications found");
      }
    } catch (error) {
      console.error("[LOAN-APPLICATIONS] Error loading loan applications:", error);
      setError("Failed to load loan applications: " + error.message);
      toast.error("Failed to load loan applications");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (loanId, newStatus, reason = "") => {
    try {
      console.log("[LOAN-STATUS] Starting status update:", {
        loanId,
        newStatus,
        reason,
      });

      const response = await updateLoanStatus(() =>
        authService.updateLoanStatus(loanId, newStatus, reason)
      );

      console.log("[LOAN-STATUS] Status update response:", response);

      const isSuccess = response?.success || response?.data?.success;
      const message =
        response?.message ||
        response?.data?.message ||
        "Loan status updated successfully";

      if (isSuccess) {
        toast.success(message);
        setLoanApplications((prev) =>
          prev.map((loan) =>
            loan.id === loanId ? { ...loan, status: newStatus } : loan
          )
        );
      } else {
        toast.error(message || "Failed to update loan status");
      }
    } catch (error) {
      console.error("[LOAN-STATUS] Error updating loan status:", error);
      toast.error(
        "Failed to update loan status: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "success";
      case "pending":
        return "warning";
      case "rejected":
        return "danger";
      default:
        return "secondary";
    }
  };

  const filteredApplications = loanApplications.filter((loan) => {
    const matchesStatus =
      filters.status === "all" || loan.status === filters.status;
    const matchesSearch =
      filters.search === "" ||
      loan.firstName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      loan.lastName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      loan.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      loan.purpose?.toLowerCase().includes(filters.search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getPendingCount = () => {
    return loanApplications.filter((loan) => loan.status === "pending").length;
  };

  // Extracted JSX components
  const loadingView = (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading loan applications...</p>
    </div>
  );

  const headerView = (
    <div className={styles.header}>
      <h1>Loan Applications</h1>
      <p>Review and manage loan applications from users</p>
    </div>
  );

  const errorView = error ? (
    <Card
      style={{
        marginBottom: "1rem",
        padding: "1rem",
        backgroundColor: "#fee2e2",
        borderColor: "#fecaca",
      }}
    >
      <h4 style={{ color: "#991b1b", margin: "0 0 0.5rem 0" }}>❌ Error</h4>
      <p style={{ color: "#991b1b", margin: 0 }}>{error}</p>
    </Card>
  ) : null;

  const filtersSection = (
    <Card className={styles.filtersCard}>
      <div className={styles.filtersContent}>
        <div className={styles.searchSection}>
          <input
            type="text"
            placeholder="Search by name, email, or purpose..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterSection}>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className={styles.filterSelect}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          {getPendingCount() > 0 && (
            <span className={`${styles.statusBadge} ${styles.warning}`}>
              {getPendingCount()} Pending
            </span>
          )}
          <Button onClick={loadLoanApplications} variant="outline">
            Refresh
          </Button>
        </div>
      </div>
    </Card>
  );

  const loanCard = (loan) => (
    <div key={loan.id} className={styles.loanCard}>
      <div className={styles.loanHeader}>
        <div className={styles.loanInfo}>
          <h3>{loan.userName}</h3>
          <p>{loan.email}</p>
          <div className={styles.loanBadges}>
            <span
              className={`${styles.statusBadge} ${styles[getStatusColor(loan.status)]}`}
            >
              {loan.status}
            </span>
          </div>
        </div>
        <div className={styles.loanAmount}>
          <h2>{formatCurrency(loan.amount)}</h2>
          <small>{loan.term} months</small>
        </div>
      </div>
      <div className={styles.loanDetails}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Purpose:</span>
          <span>{loan.purpose}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Income:</span>
          <span>{formatCurrency(loan.income)}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Employment:</span>
          <span>{loan.employment_status}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Interest Rate:</span>
          <span>{loan.interest_rate}%</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Applied:</span>
          <span>{formatDate(loan.createdAt)}</span>
        </div>
      </div>
      {loan.status === "pending" && (
        <div className={styles.loanActions}>
          <Button
            onClick={() => handleStatusUpdate(loan.id, 'approved')}
            variant="success"
            size="small"
          >
            Approve
          </Button>
          <Button
            onClick={() => handleStatusUpdate(loan.id, 'rejected')}
            variant="danger"
            size="small"
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );

  const loansGridSection = (
    <div className={styles.loansGrid}>
      {filteredApplications.map(loanCard)}
    </div>
  );

  const emptyStateSection = (
    <Card className={styles.emptyCard}>
      <div className={styles.emptyState}>
        <h3>No Loan Applications Found</h3>
        <p>
          {filters.status !== "all" || filters.search
            ? "No applications match your current filters."
            : "There are currently no loan applications to review."}
        </p>
      </div>
    </Card>
  );

  const contentSection = filteredApplications.length > 0 ? loansGridSection : emptyStateSection;

  if (loading) {
    return <div className={styles.container}>{loadingView}</div>;
  }

  return (
    <div className={styles.container}>
      {headerView}
      {errorView}
      {filtersSection}
      {contentSection}
    </div>
  );
};

export default LoanApplicationsPage;
