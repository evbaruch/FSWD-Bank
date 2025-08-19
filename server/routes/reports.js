const express = require("express");
const router = express.Router();
const { getMySQLPool } = require("../config/mysql");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const encryptionService = require("../services/encryptionService");

// Get financial summary (admin only)
router.get("/financial-summary", authorizeRoles("admin"), async (req, res) => {
  try {
    console.log("[REPORTS] Financial summary request received");
    const pool = getMySQLPool();

    // Get total accounts and balances
    const [accountsResult] = await pool.execute(`
      SELECT 
        COUNT(*) as totalAccounts,
        SUM(balance) as totalBalance,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeAccounts
      FROM accounts
    `);
    console.log("[REPORTS] Accounts result:", accountsResult[0]);

    // Get total users
    const [usersResult] = await pool.execute(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeUsers,
        COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
        COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
      FROM users
    `);
    console.log("[REPORTS] Users result:", usersResult[0]);

    // Get transaction statistics
    const [transactionsResult] = await pool.execute(`
      SELECT 
        COUNT(*) as totalTransactions,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as totalDeposits,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as totalWithdrawals,
        COUNT(CASE WHEN transaction_type = 'transfer_in' OR transaction_type = 'transfer_out' THEN 1 END) as totalTransfers
      FROM transactions
      WHERE status = 'completed'
    `);
    console.log("[REPORTS] Transactions result:", transactionsResult[0]);

    // Get loan statistics
    const [loansResult] = await pool.execute(`
      SELECT 
        COUNT(*) as totalLoans,
        SUM(amount) as totalLoanAmount,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedLoans,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingLoans,
        AVG(interest_rate) as avgInterestRate
      FROM loans
    `);
    console.log("[REPORTS] Loans result:", loansResult[0]);

    const response = {
      success: true,
      data: {
        accounts: accountsResult[0],
        users: usersResult[0],
        transactions: transactionsResult[0],
        loans: loansResult[0],
      },
    };

    console.log("[REPORTS] Final response structure:", {
      success: response.success,
      dataKeys: Object.keys(response.data),
      accountsKeys: Object.keys(response.data.accounts),
      usersKeys: Object.keys(response.data.users),
      transactionsKeys: Object.keys(response.data.transactions),
      loansKeys: Object.keys(response.data.loans),
    });

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    console.log("[REPORTS] Response encrypted, sending");
    res.json(encryptedResponse);
  } catch (error) {
    console.error("[REPORTS] Error generating financial summary:", error);
    const errorResponse = {
      success: false,
      error: "Failed to generate financial summary",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get transaction report (admin only)
router.get("/transactions", authorizeRoles("admin"), async (req, res) => {
  try {
    console.log("[REPORTS] Transaction report request received");
    const pool = getMySQLPool();

    const startDate =
      req.query.startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const endDate = req.query.endDate || new Date().toISOString().split("T")[0];

    console.log("[REPORTS] Date range:", { startDate, endDate });

    const [rows] = await pool.execute(
      `
      SELECT 
        t.id,
        t.transaction_type as transactionType,
        t.amount,
        t.description,
        t.reference_number as referenceNumber,
        t.status,
        t.created_at as createdAt,
        a.account_number as accountNumber,
        a.account_type as accountType,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE DATE(t.created_at) BETWEEN ? AND ?
      ORDER BY t.created_at DESC
    `,
      [startDate, endDate]
    );

    console.log("[REPORTS] Found transactions:", rows.length);

    const response = {
      success: true,
      data: rows,
    };

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    console.log("[REPORTS] Transaction report encrypted, sending");
    res.json(encryptedResponse);
  } catch (error) {
    console.error("[REPORTS] Error generating transaction report:", error);
    const errorResponse = {
      success: false,
      error: "Failed to generate transaction report",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get user activity report (admin only)
router.get("/user-activity", authorizeRoles("admin"), async (req, res) => {
  try {
    const pool = getMySQLPool();

    const [rows] = await pool.execute(`
      SELECT 
        u.id,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        u.role,
        u.status,
        u.created_at as createdAt,
        u.last_login as lastLoginAt,
        COUNT(DISTINCT a.id) as accountCount,
        COUNT(DISTINCT t.id) as transactionCount,
        COUNT(DISTINCT l.id) as loanCount
      FROM users u
      LEFT JOIN accounts a ON u.id = a.user_id
      LEFT JOIN transactions t ON a.id = t.account_id
      LEFT JOIN loans l ON u.id = l.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    const response = {
      success: true,
      data: rows,
    };

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error("Error generating user activity report:", error);
    const errorResponse = {
      success: false,
      error: "Failed to generate user activity report",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get loan report (admin only)
router.get("/loans", authorizeRoles("admin"), async (req, res) => {
  try {
    const pool = getMySQLPool();

    const [rows] = await pool.execute(`
      SELECT 
        l.id,
        l.loan_type as loanType,
        l.amount,
        l.interest_rate as interestRate,
        l.term_months as term,
        l.purpose,
        l.income,
        l.employmentStatus,
        l.status,
        l.created_at as applicationDate,
        l.approvedDate,
        l.monthly_payment as monthlyPayment,
        l.remainingBalance,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email
      FROM loans l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
    `);

    // Get loan statistics
    const [statsResult] = await pool.execute(`
      SELECT 
        loan_type as loanType,
        COUNT(*) as count,
        SUM(amount) as totalAmount,
        AVG(interest_rate) as avgInterestRate,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedCount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejectedCount
      FROM loans
      GROUP BY loan_type
    `);

    const response = {
      success: true,
      data: {
        loans: rows,
        statistics: statsResult,
      },
    };

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error("Error generating loan report:", error);
    const errorResponse = {
      success: false,
      error: "Failed to generate loan report",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get account report (admin only)
router.get("/accounts", authorizeRoles("admin"), async (req, res) => {
  try {
    const pool = getMySQLPool();

    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.account_number as accountNumber,
        a.account_type as accountType,
        a.balance,
        a.currency,
        a.status,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        COUNT(t.id) as transactionCount
      FROM accounts a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN transactions t ON a.id = t.account_id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);

    // Get account statistics
    const [statsResult] = await pool.execute(`
      SELECT 
        account_type as accountType,
        currency,
        COUNT(*) as count,
        SUM(balance) as totalBalance,
        AVG(balance) as avgBalance,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeCount
      FROM accounts
      GROUP BY account_type, currency
    `);

    const response = {
      success: true,
      data: {
        accounts: rows,
        statistics: statsResult,
      },
    };

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error("Error generating account report:", error);
    const errorResponse = {
      success: false,
      error: "Failed to generate account report",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

module.exports = router;
