const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { authenticateToken } = require("../middleware/auth");
const { getMySQLPool } = require("../config/mysql"); // Add this import

// Only initialize OpenAI if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.log(
    "[CHAT] OpenAI API key not configured - chat functionality disabled"
  );
}

// Update the helper function to use the MySQL pool
async function getUserFinancialContext(userId) {
  try {
    const pool = getMySQLPool();

    // Get accounts
    const [accounts] = await pool.execute(
      `SELECT id, account_type, balance, currency, 
       DATE_FORMAT(created_at, '%Y-%m-%d') as opened_date
       FROM accounts 
       WHERE user_id = ?`,
      [userId]
    );

    // Get transactions with proper column specification
    const [transactions] = await pool.execute(
      `SELECT 
        t.amount,
        t.transaction_type as type,
        t.description as category,
        DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i') as transaction_date,
        a.account_type,
        a.currency
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = ? 
       ORDER BY t.created_at DESC 
       LIMIT 5`,
      [userId]
    );

    // Get loans with formatted dates
    const [loans] = await pool.execute(
      `SELECT 
        amount,
        interest_rate,
        status,
        DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') as end_date
       FROM loans 
       WHERE user_id = ?`,
      [userId]
    );

    return { accounts, transactions, loans };
  } catch (error) {
    console.error("Error fetching financial context:", error);
    return { accounts: [], transactions: [], loans: [] }; // Return empty arrays instead of null
  }
}

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { message, history } = req.body;
    const userId = req.user.id;

    const financialContext = await getUserFinancialContext(userId);

    // log financial context
    console.log("[CHAT] User financial context:", financialContext);

    // Build messages array with context
    const messages = [
      {
        role: "system",
        content: `You are a helpful financial advisor assistant for FSWD Bank. 
          Current financial context:
          Accounts: ${JSON.stringify(financialContext.accounts)}
          Recent Transactions: ${JSON.stringify(financialContext.transactions)}
          Active Loans: ${JSON.stringify(financialContext.loans)}
          
          Remember previous interactions in this conversation and maintain context.
          Keep responses focused on the user's financial situation.`,
      },
      // Add previous messages for context
      ...(history || []),
      // Add new message
      { role: "user", content: message },
    ];

    if (!openai) {
      return res.status(503).json({
        success: false,
        message: "OpenAI API is not configured.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    res.json({ message: completion.choices[0].message.content });
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing chat request",
      error: error.message,
    });
  }
});

module.exports = router;
