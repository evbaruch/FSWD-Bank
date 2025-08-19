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
  // Simplify UX: inline actions without modals

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

      // Use service call (interceptors handle encryption/decryption)
      const directResponse = await authService.getLoanApplications();
      console.log(
        "[LOAN-APPLICATIONS] Direct API raw response:",
        directResponse
      );
      console.log(
        "[LOAN-APPLICATIONS] Direct API response data:",
        directResponse.data
      );
      console.log(
        "[LOAN-APPLICATIONS] Direct API response headers:",
        directResponse.headers
      );

      const authServiceResponse = directResponse;
      console.log(
        "[LOAN-APPLICATIONS] AuthService raw response:",
        authServiceResponse
      );
      console.log(
        "[LOAN-APPLICATIONS] AuthService response data:",
        authServiceResponse.data
      );

      // Replace the data extraction section in your loadLoanApplications function
      // (around line 85-140) with this improved logic:

      // Step 3: Try to extract loan data with detailed logging
      let loanData = [];
      let extractionMethod = "none";

      // First check if we have a nested success structure like: {success: true, data: {success: true, data: [...]}}
      if (
        authServiceResponse?.success &&
        authServiceResponse?.data?.success &&
        authServiceResponse?.data?.data
      ) {
        console.log(
          "[LOAN-APPLICATIONS] Method 1: AuthService nested success structure"
        );
        if (Array.isArray(authServiceResponse.data.data)) {
          loanData = authServiceResponse.data.data;
          extractionMethod = "auth_service_nested_success";
        }
      }
      // Check if authService response has direct nested data
      else if (
        authServiceResponse?.data?.data &&
        Array.isArray(authServiceResponse.data.data)
      ) {
        console.log("[LOAN-APPLICATIONS] Method 2: AuthService nested data");
        loanData = authServiceResponse.data.data;
        extractionMethod = "auth_service_nested_data";
      }
      // Check if authService response is direct array
      else if (authServiceResponse && Array.isArray(authServiceResponse)) {
        console.log("[LOAN-APPLICATIONS] Method 3: AuthService direct array");
        loanData = authServiceResponse;
        extractionMethod = "auth_service_direct_array";
      }
      // Check if authService response.data is array
      else if (
        authServiceResponse?.data &&
        Array.isArray(authServiceResponse.data)
      ) {
        console.log(
          "[LOAN-APPLICATIONS] Method 4: AuthService response.data is array"
        );
        loanData = authServiceResponse.data;
        extractionMethod = "auth_service_data_array";
      }
      // Check for success structure with direct data array
      else if (authServiceResponse?.success && authServiceResponse?.data) {
        console.log(
          "[LOAN-APPLICATIONS] Method 5: AuthService success structure"
        );
        if (Array.isArray(authServiceResponse.data)) {
          loanData = authServiceResponse.data;
          extractionMethod = "auth_service_success_data";
        }
      }
      // Fallback to direct API response with nested structure
      else if (directResponse?.data?.success && Array.isArray(directResponse?.data?.data)) {
        console.log("[LOAN-APPLICATIONS] Method 6: Direct API success+data array");
        loanData = directResponse.data.data;
        extractionMethod = "direct_api_success_data";
      }
      // Fallback to direct API response with single nested data
      else if (
        directResponse?.data?.data &&
        Array.isArray(directResponse.data.data)
      ) {
        console.log("[LOAN-APPLICATIONS] Method 7: Direct API nested data");
        loanData = directResponse.data.data;
        extractionMethod = "direct_api_nested_data";
      }
      // Fallback to direct API response array
      else if (directResponse?.data && Array.isArray(directResponse.data)) {
        console.log("[LOAN-APPLICATIONS] Method 8: Direct API data array");
        loanData = directResponse.data;
        extractionMethod = "direct_api_array";
      }
      // Check if direct response has success structure
      else if (directResponse?.data?.success && directResponse?.data?.data) {
        console.log(
          "[LOAN-APPLICATIONS] Method 9: Direct API success structure"
        );
        if (Array.isArray(directResponse.data.data)) {
          loanData = directResponse.data.data;
          extractionMethod = "direct_api_success_data";
        }
      }
      // Handle encrypted response that should have been decrypted
      else if (directResponse?.data?.encrypted) {
        console.log(
          "[LOAN-APPLICATIONS] Method 10: Encrypted response detected"
        );
        // The response is marked as encrypted but may not have been decrypted properly
        // Let's check if there's still encrypted data we can access
        if (directResponse.data.success && directResponse.data.data) {
          if (
            directResponse.data.data.success &&
            Array.isArray(directResponse.data.data.data)
          ) {
            loanData = directResponse.data.data.data;
            extractionMethod = "encrypted_nested_success";
          } else if (Array.isArray(directResponse.data.data)) {
            loanData = directResponse.data.data;
            extractionMethod = "encrypted_direct_data";
          }
        }
      }

      console.log(
        `[LOAN-APPLICATIONS] Data extracted using method: ${extractionMethod}`
      );
      console.log("[LOAN-APPLICATIONS] Extracted loan data:", loanData);
      console.log(
        "[LOAN-APPLICATIONS] Loan data length:",
        loanData?.length || 0
      );
      console.log("[LOAN-APPLICATIONS] First loan item:", loanData?.[0]);

      // Validate the data
      if (!Array.isArray(loanData)) {
        const errorMsg = `Data extraction failed - expected array, got ${typeof loanData}. Method used: ${extractionMethod}`;
        console.error("[LOAN-APPLICATIONS]", errorMsg);

        //debugging info
        console.log("[LOAN-APPLICATIONS] AuthService response structure:", {
          type: typeof authServiceResponse,
          isArray: Array.isArray(authServiceResponse),
          hasData: authServiceResponse?.hasOwnProperty("data"),
          hasSuccess: authServiceResponse?.hasOwnProperty("success"),
          success: authServiceResponse?.success,
          dataType: typeof authServiceResponse?.data,
          dataIsArray: Array.isArray(authServiceResponse?.data),
        });

        console.log("[LOAN-APPLICATIONS] Direct response structure:", {
          type: typeof directResponse?.data,
          isArray: Array.isArray(directResponse?.data),
          hasSuccess: directResponse?.data?.hasOwnProperty("success"),
          success: directResponse?.data?.success,
          hasEncrypted: directResponse?.data?.hasOwnProperty("encrypted"),
          encrypted: directResponse?.data?.encrypted,
        });

        setError(errorMsg);
        return;
      }

      // Map the data to ensure consistent field names
      console.log("[LOAN-APPLICATIONS] Mapping loan data...");
      const mappedLoans = loanData.map((loan, index) => {
        console.log(`[LOAN-APPLICATIONS] Mapping loan ${index}:`, loan);

        const mapped = {
          id: loan.id,
          firstName: loan.firstName || loan.first_name || "Unknown",
          lastName: loan.lastName || loan.last_name || "User",
          email: loan.email || "No email",
          purpose: loan.purpose || "No purpose specified",
          amount: parseFloat(loan.amount) || 0,
          income: parseFloat(loan.income) || 0,
          employment_status:
            loan.employment_status || loan.employmentStatus || "Unknown",
          interest_rate:
            parseFloat(loan.interest_rate || loan.interestRate) || 0,
          term: parseInt(loan.term_months || loan.term) || 0,
          status: loan.status || "unknown",
          createdAt: loan.createdAt || loan.created_at || new Date(),
          userName:
            loan.userName ||
            `${loan.firstName || loan.first_name || ""} ${loan.lastName || loan.last_name || ""}`.trim() ||
            "Unknown User",
        };

        console.log(`[LOAN-APPLICATIONS] Mapped loan ${index}:`, mapped);
        return mapped;
      });

      console.log("[LOAN-APPLICATIONS] All mapped loans:", mappedLoans);

      setLoanApplications(mappedLoans);

      if (mappedLoans.length === 0) {
        console.log("[LOAN-APPLICATIONS] No loan applications found");
        toast.info("No loan applications found");
      } else {
        console.log(
          `[LOAN-APPLICATIONS] Successfully loaded ${mappedLoans.length} loan applications`
        );
        toast.success(`Loaded ${mappedLoans.length} loan applications`);
      }
    } catch (error) {
      console.error(
        "[LOAN-APPLICATIONS] Error loading loan applications:",
        error
      );
      console.error("[LOAN-APPLICATIONS] Error stack:", error.stack);
      console.error("[LOAN-APPLICATIONS] Error details:", {
        name: error.name,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: error.config,
      });

      setError(
        `${error.message} (Status: ${error.response?.status || "Unknown"})`
      );
      toast.error("Failed to load loan applications: " + error.message);
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
        // Inline updates; no modals to close
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

  // Helper functions
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

  const loadingView = (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Loading loan applications...</p>
    </div>
  );

  if (loading) {
    return <div className={styles.container}>{loadingView}</div>;
  }

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

  // Removed inline return block; content rebuilt in final return below

  return (
    <div className={styles.container}>
      {headerView}
      {/* Filters and list are already pre-structured above; we are returning the same tree */}
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

      {filteredApplications.length > 0 ? (
        <div className={styles.loansGrid}>
          {filteredApplications.map((loan) => (
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
          ))}
        </div>
      ) : (
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
      )}

      {/* Modals remain the same as previous version */}
    </div>
  );
};

export default LoanApplicationsPage;
