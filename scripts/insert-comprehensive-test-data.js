const mysql = require('mysql2/promise');
require('dotenv').config();

const insertComprehensiveTestData = async () => {
  let connection;
  
  try {
    // Connect to MySQL database
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'fswd_bank',
      port: process.env.MYSQL_PORT || 3306
    });

    console.log('[DATABASE] Connected to MySQL database');

    // Get admin user ID
    const [adminUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@fswdbank.com']
    );

    if (adminUser.length === 0) {
      console.log('[ERROR] Admin user not found. Please run setup-databases.js first.');
      return;
    }

    const adminUserId = adminUser[0].id;
    console.log(`[DATA] Found admin user with ID: ${adminUserId}`);

    // Insert test accounts for admin (checking and savings)
    await connection.execute(`
      INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status, interest_rate, monthly_fee)
      VALUES (?, '1234567890', 'checking', 15420.75, 'USD', 'active', 0.0000, 0.00)
      ON DUPLICATE KEY UPDATE balance=15420.75, status='active'
    `, [adminUserId]);

    await connection.execute(`
      INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status, interest_rate, monthly_fee)
      VALUES (?, '0987654321', 'savings', 10059.75, 'USD', 'active', 0.0250, 0.00)
      ON DUPLICATE KEY UPDATE balance=10059.75, status='active'
    `, [adminUserId]);

    // Fetch the actual account IDs for the admin user
    const [accounts] = await connection.execute(
      'SELECT id, account_type FROM accounts WHERE user_id = ? ORDER BY id ASC',
      [adminUserId]
    );
    if (accounts.length < 2) {
      throw new Error('Not enough accounts found for admin user.');
    }
    const account1Id = accounts.find(acc => acc.account_type === 'checking')?.id || accounts[0].id;
    const account2Id = accounts.find(acc => acc.account_type === 'savings')?.id || accounts[1].id;
    console.log(`[DATA] Using account IDs: checking=${account1Id}, savings=${account2Id}`);

    // Insert test transactions
    const transactions = [
      {
        account_id: account1Id,
        transaction_type: 'deposit',
        amount: 2500.00,
        balance_after: 17920.75,
        description: 'Salary Deposit',
        reference_number: 'REF001'
      },
      {
        account_id: account1Id,
        transaction_type: 'withdrawal',
        amount: 150.00,
        balance_after: 17770.75,
        description: 'ATM Withdrawal',
        reference_number: 'REF002'
      },
      {
        account_id: account1Id,
        transaction_type: 'transfer_out',
        amount: 500.00,
        balance_after: 17270.75,
        description: 'Transfer to Savings',
        reference_number: 'REF003'
      },
      {
        account_id: account2Id,
        transaction_type: 'transfer_in',
        amount: 500.00,
        balance_after: 10559.75,
        description: 'Transfer from Checking',
        reference_number: 'REF004'
      },
      {
        account_id: account1Id,
        transaction_type: 'deposit',
        amount: 1000.00,
        balance_after: 18270.75,
        description: 'Refund',
        reference_number: 'REF005'
      }
    ];

    for (const transaction of transactions) {
      await connection.execute(`
        INSERT INTO transactions (account_id, transaction_type, amount, balance_after, description, reference_number, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'completed', NOW(), NOW())
        ON DUPLICATE KEY UPDATE amount=?, status='completed'
      `, [
        transaction.account_id,
        transaction.transaction_type,
        transaction.amount,
        transaction.balance_after,
        transaction.description,
        transaction.reference_number,
        transaction.amount
      ]);
    }
    console.log('[DATA] Inserted test transactions');

    // Insert test transfers
    const transfers = [
      {
        from_account_id: account1Id,
        to_account_id: account2Id,
        amount: 500.00,
        description: 'Transfer to Savings Account',
        reference_number: 'TRF001'
      },
      {
        from_account_id: account1Id,
        to_account_id: account2Id,
        amount: 200.00,
        description: 'Monthly Savings Transfer',
        reference_number: 'TRF002'
      }
    ];

    for (const transfer of transfers) {
      await connection.execute(`
        INSERT INTO transfers (from_account_id, to_account_id, amount, description, reference_number, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'completed', NOW(), NOW())
        ON DUPLICATE KEY UPDATE amount=?, status='completed'
      `, [
        transfer.from_account_id,
        transfer.to_account_id,
        transfer.amount,
        transfer.description,
        transfer.reference_number,
        transfer.amount
      ]);
    }
    console.log('[DATA] Inserted test transfers');

    // Insert test notifications
    const notifications = [
      {
        user_id: adminUserId,
        type: 'info',
        title: 'Welcome to FSWD Bank',
        message: 'Welcome to your new banking account! We\'re here to help you manage your finances.'
      },
      {
        user_id: adminUserId,
        type: 'success',
        title: 'Transfer Completed',
        message: 'Your transfer of $500.00 to Savings Account has been completed successfully.'
      },
      {
        user_id: adminUserId,
        type: 'warning',
        title: 'Account Activity',
        message: 'Unusual activity detected on your account. Please review recent transactions.'
      },
      {
        user_id: adminUserId,
        type: 'info',
        title: 'New Feature Available',
        message: 'Mobile check deposit is now available in your banking app!'
      }
    ];

    for (const notification of notifications) {
      await connection.execute(`
        INSERT INTO notifications (user_id, type, title, message, isRead, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, NOW(), NOW())
        ON DUPLICATE KEY UPDATE message=?, updated_at=NOW()
      `, [
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        notification.message
      ]);
    }
    console.log('[DATA] Inserted test notifications');

    // Insert test documents
    const documents = [
      {
        user_id: adminUserId,
        document_type: 'id_proof',
        file_name: 'passport.pdf',
        originalName: 'Passport.pdf',
        file_path: '/uploads/documents/passport.pdf',
        file_size: 1024000,
        fileType: 'application/pdf',
        status: 'approved'
      },
      {
        user_id: adminUserId,
        document_type: 'address_proof',
        file_name: 'utility_bill.pdf',
        originalName: 'Utility Bill.pdf',
        file_path: '/uploads/documents/utility_bill.pdf',
        file_size: 512000,
        fileType: 'application/pdf',
        status: 'pending'
      },
      {
        user_id: adminUserId,
        document_type: 'income_proof',
        file_name: 'paystub.pdf',
        originalName: 'Pay Stub.pdf',
        file_path: '/uploads/documents/paystub.pdf',
        file_size: 256000,
        fileType: 'application/pdf',
        status: 'approved'
      }
    ];

    for (const document of documents) {
      await connection.execute(`
        INSERT INTO documents (user_id, document_type, file_name, originalName, file_path, file_size, fileType, status, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE status=?, uploaded_at=NOW()
      `, [
        document.user_id,
        document.document_type,
        document.file_name,
        document.originalName,
        document.file_path,
        document.file_size,
        document.fileType,
        document.status,
        document.status
      ]);
    }
    console.log('[DATA] Inserted test documents');

    // Insert test loans
    const loans = [
      {
        user_id: adminUserId,
        loan_type: 'personal',
        amount: 10000.00,
        interest_rate: 0.0800,
        term_months: 24,
        monthly_payment: 452.27,
        status: 'approved',
        remaining_balance: 8500.00,
        purpose: 'Home improvement',
        income: 75000.00,
        employmentStatus: 'employed'
      },
      {
        user_id: adminUserId,
        loan_type: 'auto',
        amount: 25000.00,
        interest_rate: 0.0600,
        term_months: 60,
        monthly_payment: 483.32,
        status: 'pending',
        remaining_balance: 25000.00,
        purpose: 'Vehicle purchase',
        income: 75000.00,
        employmentStatus: 'employed'
      }
    ];

    for (const loan of loans) {
      await connection.execute(`
        INSERT INTO loans (user_id, loan_type, amount, interest_rate, term_months, monthly_payment, status, remaining_balance, purpose, income, employmentStatus, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE status=?, remaining_balance=?, updated_at=NOW()
      `, [
        loan.user_id,
        loan.loan_type,
        loan.amount,
        loan.interest_rate,
        loan.term_months,
        loan.monthly_payment,
        loan.status,
        loan.remaining_balance,
        loan.purpose,
        loan.income,
        loan.employmentStatus,
        loan.status,
        loan.remaining_balance
      ]);
    }
    console.log('[DATA] Inserted test loans');

          console.log('\n[SUCCESS] Comprehensive test data inserted successfully!');
    console.log('\n[SUMMARY] Test Data Summary:');
    console.log('   • 2 accounts (checking & savings)');
    console.log('   • 5 transactions');
    console.log('   • 2 transfers');
    console.log('   • 4 notifications');
    console.log('   • 3 documents');
    console.log('   • 2 loans');
    console.log('\nTotal Balance: $25,480.50');
    console.log('   • Checking: $15,420.75');
    console.log('   • Savings: $10,059.75');

  } catch (error) {
    console.error('[ERROR] Error inserting comprehensive test data:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run insertion if called directly
if (require.main === module) {
  insertComprehensiveTestData();
}

module.exports = { insertComprehensiveTestData }; 