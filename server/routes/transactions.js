const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { getMySQLPool } = require("../config/mysql");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const encryptionService = require("../services/encryptionService");

// Get user's transactions
router.get("/", authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get transactions for user's accounts
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
        a.account_type as accountType
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
      [req.user.id]
    );

    // Get total count
    const [countResult] = await pool.execute(
      `
      SELECT COUNT(*) as total
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = ?
    `,
      [req.user.id]
    );

    const response = {
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    };

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    const errorResponse = {
      success: false,
      error: "Failed to fetch transactions",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get transactions for specific account
router.get("/account/:account_id", authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();

    // Verify account belongs to user
    const [accountCheck] = await pool.execute(
      "SELECT id FROM accounts WHERE id = ? AND user_id = ?",
      [req.params.account_id, req.user.id]
    );

    if (accountCheck.length === 0) {
      const errorResponse = {
        success: false,
        error: "Account not found",
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(404).json(encryptedError);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [rows] = await pool.execute(
      `
      SELECT 
        id,
        transaction_type as transactionType,
        amount,
        description,
        reference_number as referenceNumber,
        status,
        created_at as createdAt
      FROM transactions
      WHERE account_id = ?
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
      [req.params.account_id]
    );

    // Get total count
    const [countResult] = await pool.execute(
      `
      SELECT COUNT(*) as total
      FROM transactions
      WHERE account_id = ?
    `,
      [req.params.account_id]
    );

    const response = {
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    };

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error("Error fetching account transactions:", error);
    const errorResponse = {
      success: false,
      error: "Failed to fetch account transactions",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get specific transaction
router.get("/:transaction_id", authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();

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
        a.account_type as accountType
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE t.id = ? AND a.user_id = ?
    `,
      [req.params.transaction_id, req.user.id]
    );

    if (rows.length === 0) {
      const errorResponse = {
        success: false,
        error: "Transaction not found",
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(404).json(encryptedError);
    }

    const response = {
      success: true,
      data: rows[0],
    };

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    res.json(encryptedResponse);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    const errorResponse = {
      success: false,
      error: "Failed to fetch transaction",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Create deposit transaction
router.post("/deposit", authenticateToken, async (req, res) => {
  try {
    // Decrypt the incoming request body
    const decryptedData = encryptionService.decrypt(req.body);
    console.log("Decrypted deposit data:", decryptedData);

    const { accountId, amount, description } = decryptedData;

    // Validate accountId
    if (!accountId || !Number.isInteger(parseInt(accountId))) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [{ msg: "Valid account ID is required", param: "accountId" }],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    // Validate amount
    if (!amount || amount < 0.01) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [{ msg: "Valid amount is required", param: "amount" }],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    // Validate description length
    if (description && description.length > 255) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [{ msg: "Description too long", param: "description" }],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    const pool = getMySQLPool();

    // Verify that account belongs to authenticated user and is active
    const [accountRows] = await pool.execute(
      "SELECT id, balance, status FROM accounts WHERE id = ? AND user_id = ?",
      [accountId, req.user.id]
    );

    if (accountRows.length === 0) {
      const errorResponse = {
        success: false,
        error: "Account not found",
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(404).json(encryptedError);
    }

    if (accountRows[0].status !== "active") {
      const errorResponse = {
        success: false,
        error: "Account is not active",
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    // Calculate the new balance after deposit
    const newBalance = parseFloat(accountRows[0].balance) + parseFloat(amount);

    // Generate a unique reference number
    const referenceNumber =
      "DEP" +
      Date.now() +
      Math.random().toString(36).substr(2, 5).toUpperCase();

    // Get a connection from the pool to use transaction methods
    const connection = await pool.getConnection();

    try {
      // Start the transaction
      await connection.beginTransaction();

      // Insert the deposit transaction with balance_after field
      const [transactionResult] = await connection.execute(
        `
        INSERT INTO transactions (account_id, transaction_type, amount, description, reference_number, status, balance_after)
        VALUES (?, 'deposit', ?, ?, ?, 'completed', ?)
      `,
        [
          accountId,
          amount,
          description || "Deposit",
          referenceNumber,
          newBalance,
        ]
      );

      // Update the account balance
      await connection.execute(
        "UPDATE accounts SET balance = ?, updated_at = NOW() WHERE id = ?",
        [newBalance, accountId]
      );

      // Commit the transaction
      await connection.commit();

      // Fetch the created transaction record
      const [rows] = await connection.execute(
        `
        SELECT
          id,
          transaction_type AS transactionType,
          amount,
          description,
          reference_number AS referenceNumber,
          status,
          balance_after AS balanceAfter,
          created_at AS createdAt
        FROM transactions
        WHERE id = ?
      `,
        [transactionResult.insertId]
      );

      const response = {
        success: true,
        data: rows[0],
        message: "Deposit completed successfully",
      };

      // Encrypt and send the response
      const encryptedResponse = encryptionService.encrypt(response);
      res.status(201).json(encryptedResponse);
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      // Release the connection back to pool
      connection.release();
    }
  } catch (error) {
    console.error("Error creating deposit:", error);
    const errorResponse = {
      success: false,
      error: "Failed to process deposit",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Create withdrawal transaction
router.post("/withdrawal", authenticateToken, async (req, res) => {
  try {
    // Decrypt request
    const decryptedData = encryptionService.decrypt(req.body);
    console.log("Decrypted withdrawal data:", decryptedData);

    // Manual validation
    const { accountId, amount, description } = decryptedData;

    if (!accountId || !Number.isInteger(parseInt(accountId))) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [{ msg: "Valid account ID is required", param: "accountId" }],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    if (!amount || amount < 0.01) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [{ msg: "Valid amount is required", param: "amount" }],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    if (description && description.length > 255) {
      const errorResponse = {
        success: false,
        error: "Validation failed",
        details: [{ msg: "Description too long", param: "description" }],
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    const pool = getMySQLPool();

    // Verify account belongs to user and get current balance and status
    const [accountRows] = await pool.execute(
      "SELECT id, balance, status FROM accounts WHERE id = ? AND user_id = ?",
      [accountId, req.user.id]
    );

    if (accountRows.length === 0) {
      const errorResponse = {
        success: false,
        error: "Account not found",
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(404).json(encryptedError);
    }

    const account = accountRows[0];

    if (account.status !== "active") {
      const errorResponse = {
        success: false,
        error: "Account is not active",
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    if (account.balance < amount) {
      const errorResponse = {
        success: false,
        error: "Insufficient balance",
      };
      const encryptedError = encryptionService.encrypt(errorResponse);
      return res.status(400).json(encryptedError);
    }

    // Calculate new balance after withdrawal
    const newBalance = parseFloat((account.balance - amount).toFixed(2));

    // Generate reference number
    const referenceNumber =
      "WTH" +
      Date.now() +
      Math.random().toString(36).substr(2, 5).toUpperCase();

    // Start transaction
    await pool.query("START TRANSACTION");

    try {
      // Insert transaction record with balance_after
      const [transactionResult] = await pool.execute(
        `INSERT INTO transactions 
          (account_id, transaction_type, amount, description, reference_number, status, balance_after)
         VALUES (?, 'withdrawal', ?, ?, ?, 'completed', ?)`,
        [
          accountId,
          -amount,
          description || "Withdrawal",
          referenceNumber,
          newBalance,
        ]
      );

      // Update account balance
      await pool.execute(
        "UPDATE accounts SET balance = ?, updated_at = NOW() WHERE id = ?",
        [newBalance, accountId]
      );

      // Commit transaction
      await pool.query("COMMIT");

      // Fetch the created transaction
      const [rows] = await pool.execute(
        `SELECT 
          id,
          transaction_type AS transactionType,
          amount,
          description,
          reference_number AS referenceNumber,
          status,
          created_at AS createdAt
         FROM transactions
         WHERE id = ?`,
        [transactionResult.insertId]
      );

      const response = {
        success: true,
        data: rows[0],
        message: "Withdrawal completed successfully",
      };

      // Encrypt response
      const encryptedResponse = encryptionService.encrypt(response);
      res.status(201).json(encryptedResponse);
    } catch (error) {
      // Rollback transaction on error
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    const errorResponse = {
      success: false,
      error: "Failed to process withdrawal",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

// Get all transactions (admin only)
router.get("/admin/all", authorizeRoles("admin"), async (req, res) => {
  try {
    console.log("[TRANSACTIONS] Admin all transactions request received");
    const pool = getMySQLPool();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    console.log("[TRANSACTIONS] Query params:", { page, limit, offset });

    const [rows] = await pool.execute(`
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
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    console.log("[TRANSACTIONS] Found transactions:", rows.length);

    // Get total count
    const [countResult] = await pool.execute(
      "SELECT COUNT(*) as total FROM transactions"
    );

    console.log(
      "[TRANSACTIONS] Total transactions in DB:",
      countResult[0].total
    );

    const response = {
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    };

    console.log("[TRANSACTIONS] Final response structure:", {
      success: response.success,
      dataLength: response.data.length,
      pagination: response.pagination,
    });

    // Encrypt response
    const encryptedResponse = encryptionService.encrypt(response);
    console.log("[TRANSACTIONS] Response encrypted, sending");
    res.json(encryptedResponse);
  } catch (error) {
    console.error("[TRANSACTIONS] Error fetching all transactions:", error);
    const errorResponse = {
      success: false,
      error: "Failed to fetch transactions",
    };
    const encryptedError = encryptionService.encrypt(errorResponse);
    res.status(500).json(encryptedError);
  }
});

module.exports = router;
