const mysql = require('mysql2/promise');
require('dotenv').config();

const insertTestData = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE || 'fswd_bank',
      port: process.env.MYSQL_PORT || 3306
    });
    console.log('[DATABASE] Connected to MySQL database');

    // Insert a test account for admin
    const [accountResult] = await connection.execute(`
      INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status)
      VALUES (1, '1234567890', 'checking', 1000.00, 'USD', 'active')
      ON DUPLICATE KEY UPDATE balance=1000.00, status='active'
    `);
    const accountId = accountResult.insertId || 1;
    console.log('[DATA] Inserted test account for admin');

    // Insert a test transaction for admin's account
    await connection.execute(`
      INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, reference_number, status, created_at, updated_at)
      VALUES (?, 'deposit', 500.00, 1500.00, 'Test deposit', 'REF123456', 'completed', NOW(), NOW())
      ON DUPLICATE KEY UPDATE amount=500.00, status='completed'
    `, [accountId]);
    console.log('[DATA] Inserted test transaction');

    // Insert a test transfer (from admin to manager)
    await connection.execute(`
      INSERT INTO transfers (from_account_id, to_account_id, amount, description, reference_number, status, created_at, updated_at)
      VALUES (?, ?, 100.00, 'Test transfer', 'TRF123456', 'completed', NOW(), NOW())
      ON DUPLICATE KEY UPDATE amount=100.00, status='completed'
    `, [accountId, accountId]);
    console.log('[DATA] Inserted test transfer');

    // Insert a test notification for admin
    await connection.execute(`
      INSERT INTO notifications (user_id, type, title, message, isRead, created_at, updated_at)
      VALUES (1, 'info', 'Test Notification', 'This is a test notification for admin.', 0, NOW(), NOW())
    `);
    console.log('[DATA] Inserted test notification');

    // Insert a test document for admin
    await connection.execute(`
      INSERT INTO documents (user_id, file_name, originalName, file_path, file_size, fileType, document_type, status, uploaded_at, reviewedAt)
      VALUES (1, 'testfile.pdf', 'Test File.pdf', '/tmp/testfile.pdf', 12345, 'application/pdf', 'id_proof', 'pending', NOW(), NULL)
    `);
    console.log('[DATA] Inserted test document');

          console.log('[SUCCESS] Test data inserted successfully!');
  } catch (error) {
    console.error('[ERROR] Error inserting test data:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

if (require.main === module) {
  insertTestData();
}

module.exports = { insertTestData }; 