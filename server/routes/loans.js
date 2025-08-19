const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { getMySQLPool } = require("../config/mysql");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const encryptionService = require("../services/encryptionService");

// Get user's loans (regular users)
router.get("/my-loans", authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();

    const [rows] = await pool.execute(
      `
      SELECT 
        id,
        loan_type as loanType,
        amount,
        interest_rate as interestRate,
        term_months as term,
        status,
        created_at as applicationDate,
        approved_at as approvedDate,
        start_date as disbursementDate,
        monthly_payment as monthlyPayment,
        remaining_balance as remainingBalance
      FROM loans
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
      [req.user.id]
    );

    const response = {
      success: true,
      data: rows,
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[MY-LOANS] Encrypting response");
      const encryptedResponse = encryptionService.encrypt(response);
      response.encrypted = true;
      response.data = encryptedResponse;
      console.log("[MY-LOANS] Response encrypted");
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching loans:", error);
    const errorResponse = {
      success: false,
      error: "Failed to fetch loans",
    };

    // Encrypt error response if requested
    if (req.headers["x-encrypted"] === "true") {
      const encryptedError = encryptionService.encrypt(errorResponse);
      errorResponse.encrypted = true;
      errorResponse.data = encryptedError;
    }

    res.status(500).json(errorResponse);
  }
});

// Apply for loan
router.post("/apply", authenticateToken, async (req, res) => {
  try {
    // Decrypt request
    const decryptedData = encryptionService.decrypt(req.body);

    // Manual validation
    const { loanType, amount, term, purpose, income, employmentStatus } =
      decryptedData;

    if (
      !loanType ||
      !["personal", "business", "mortgage", "auto"].includes(loanType)
    ) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [{ msg: "Valid loan type is required", param: "loanType" }],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    if (!amount || amount < 1000 || amount > 1000000) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [
          {
            msg: "Amount must be between 1,000 and 1,000,000",
            param: "amount",
          },
        ],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    if (!term || term < 12 || term > 360) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [
          { msg: "Term must be between 12 and 360 months", param: "term" },
        ],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    if (!purpose || purpose.length < 10 || purpose.length > 500) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [
          {
            msg: "Purpose must be between 10 and 500 characters",
            param: "purpose",
          },
        ],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    if (!income || income < 0) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [{ msg: "Valid income is required", param: "income" }],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    if (
      !employmentStatus ||
      !["employed", "self-employed", "unemployed"].includes(employmentStatus)
    ) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [
          {
            msg: "Valid employment status is required",
            param: "employmentStatus",
          },
        ],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    const pool = getMySQLPool();

    // Calculate interest rate based on loan type and amount
    let interestRate = 0.05; // 5% base rate
    if (loanType === "personal") interestRate = 0.08;
    else if (loanType === "business") interestRate = 0.06;
    else if (loanType === "mortgage") interestRate = 0.04;
    else if (loanType === "auto") interestRate = 0.07;

    // Calculate monthly payment
    const monthlyRate = interestRate / 12;
    const monthlyPayment =
      (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) /
      (Math.pow(1 + monthlyRate, term) - 1);

    const [result] = await pool.execute(
      `
      INSERT INTO loans (user_id, loan_type, amount, interest_rate, term_months, purpose, income, employment_status, status, monthly_payment, remaining_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `,
      [
        req.user.id,
        loanType,
        amount,
        interestRate,
        term,
        purpose,
        income,
        employmentStatus,
        monthlyPayment,
        amount,
      ]
    );

    // Fetch the created loan application
    const [rows] = await pool.execute(
      `
      SELECT 
        id,
        loan_type as loanType,
        amount,
        interest_rate as interestRate,
        term_months as term,
        status,
        created_at as applicationDate,
        monthly_payment as monthlyPayment
      FROM loans
      WHERE id = ?
    `,
      [result.insertId]
    );

    const response = {
      success: true,
      data: rows[0],
      message: "Loan application submitted successfully",
    };

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.status(201).json(encryptedResponse);
  } catch (error) {
    console.error("Error applying for loan:", error);
    const errorResponse = {
      success: false,
      error: "Failed to submit loan application",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get loan applications (admin/manager only)
router.get("/", authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const pool = getMySQLPool();

    const [rows] = await pool.execute(`
    SELECT 
      l.id,
      l.loan_type as loanType,
      l.amount,
      l.interest_rate as interestRate,
      l.term_months as term,
      l.status,
      l.purpose,
      l.income,
      l.employment_status as employmentStatus,
      l.created_at as createdAt,
      l.monthly_payment as monthlyPayment,
      u.first_name as firstName,
      u.last_name as lastName,
      u.email,
      CONCAT(u.first_name, ' ', u.last_name) as userName
    FROM loans l
    JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
    `);

    const response = {
      success: true,
      data: rows,
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[LOANS-ADMIN] Encrypting response");
      const encryptedResponse = encryptionService.encrypt(response);
      response.encrypted = true;
      response.data = encryptedResponse;
      console.log("[LOANS-ADMIN] Response encrypted");
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching loan applications:", error);
    const errorResponse = {
      success: false,
      error: "Failed to fetch loan applications",
    };

    // Encrypt error response if requested
    if (req.headers["x-encrypted"] === "true") {
      const encryptedError = encryptionService.encrypt(errorResponse);
      errorResponse.encrypted = true;
      errorResponse.data = encryptedError;
    }

    res.status(500).json(errorResponse);
  }
});

// Approve/reject loan application (admin/manager only)
router.put(
  "/:loanId/status",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      // Handle encrypted request if present
      let statusData = req.body;
      if (
        req.headers["x-encrypted"] === "true" &&
        req.body &&
        req.body.encrypted
      ) {
        console.log("[LOAN-STATUS] Decrypting encrypted request");
        statusData = encryptionService.decrypt(req.body);
        console.log("[LOAN-STATUS] Decrypted status data:", statusData);
      }

      // Manual validation
      if (
        !statusData.status ||
        !["approved", "rejected"].includes(statusData.status)
      ) {
        return res.status(400).json({
          success: false,
          error: "Valid status is required (approved or rejected)",
        });
      }

      const pool = getMySQLPool();

      // Check if loan exists
      const [existingLoan] = await pool.execute(
        `
      SELECT l.id, l.user_id, l.status, u.first_name, u.last_name, u.email
      FROM loans l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `,
        [req.params.loanId]
      );

      if (existingLoan.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Loan application not found",
        });
      }

      if (existingLoan[0].status !== "pending") {
        return res.status(400).json({
          success: false,
          error: "Can only update pending loan applications",
        });
      }

      const updateData = {
        status: statusData.status,
        notes: statusData.reason || null,
      };

      if (statusData.status === "approved") {
        updateData.approved_at = new Date();
      }

      await pool.execute(
        `
      UPDATE loans 
      SET status = ?, notes = ?, approved_at = ?, updated_at = NOW()
      WHERE id = ?
    `,
        [
          updateData.status,
          updateData.notes,
          updateData.approved_at,
          req.params.loanId,
        ]
      );

      // Create notification for the user
      const notificationMessage =
        statusData.status === "approved"
          ? "Your loan application has been approved! Check your account for details."
          : `Your loan application has been rejected. Reason: ${
              statusData.reason || "No reason provided"
            }`;

      await pool.execute(
        `
      INSERT INTO notifications (user_id, type, title, message, created_at)
      VALUES (?, 'loan_status', 'Loan Application ${
        statusData.status.charAt(0).toUpperCase() + statusData.status.slice(1)
      }', ?, NOW())
    `,
        [existingLoan[0].user_id, notificationMessage]
      );

      // Create response data
      const responseData = {
        success: true,
        message: `Loan application ${statusData.status} successfully`,
      };

      // Encrypt response if requested
      if (req.headers["x-encrypted"] === "true") {
        console.log("[LOAN-STATUS] Encrypting response");
        responseData.encrypted = true;
        console.log("[LOAN-STATUS] Response encrypted");
      }

      res.json(responseData);
    } catch (error) {
      console.error("Error updating loan status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update loan status",
      });
    }
  }
);

module.exports = router;
