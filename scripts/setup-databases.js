const mysql = require("mysql2/promise");
const mongoose = require("mongoose");
require("dotenv").config();

// MySQL Database Setup
const setupMySQL = async () => {
  let connection;

  try {
    // Connect to MySQL server (without database)
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD,
      port: process.env.MYSQL_PORT || 3306,
    });

    console.log("[DATABASE] Connected to MySQL server");

    // Create database if it doesn't exist
    const databaseName = process.env.MYSQL_DATABASE || "fswd_bank";
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${databaseName}`);
    await connection.query(`USE ${databaseName}`);

    console.log(`[DATABASE] Database '${databaseName}' ready`);

    // Create users table with enhanced security fields
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        date_of_birth DATE,
        ssn VARCHAR(255), -- Encrypted SSN
        address TEXT,
        city VARCHAR(50),
        state CHAR(2),
        zip_code VARCHAR(10),
        google_id VARCHAR(100) UNIQUE,
        profile_picture VARCHAR(500),
        role ENUM('customer', 'manager', 'admin') DEFAULT 'customer',
        status ENUM('pending', 'active', 'suspended', 'closed') DEFAULT 'pending',
        refresh_token TEXT,
        reset_token VARCHAR(255),
        reset_token_expires DATETIME,
        last_login DATETIME,
        login_attempts INT DEFAULT 0,
        locked_until DATETIME,
        two_factor_secret VARCHAR(255),
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        backup_codes JSON,
        session_token VARCHAR(255),
        session_expires DATETIME,
        security_questions JSON,
        last_password_change DATETIME,
        password_history JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_ssn (ssn),
        INDEX idx_google_id (google_id),
        INDEX idx_role (role),
        INDEX idx_status (status),
        INDEX idx_two_factor_enabled (two_factor_enabled),
        INDEX idx_locked_until (locked_until)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create accounts table with encrypted account numbers
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        account_number VARCHAR(255) UNIQUE NOT NULL, -- Encrypted account number
        account_type ENUM('checking', 'savings', 'business', 'credit') NOT NULL,
        balance DECIMAL(15,2) DEFAULT 0.00,
        currency VARCHAR(3) DEFAULT 'USD',
        status ENUM('active', 'frozen', 'closed') DEFAULT 'active',
        interest_rate DECIMAL(5,4) DEFAULT 0.0000,
        monthly_fee DECIMAL(10,2) DEFAULT 0.00,
        overdraft_limit DECIMAL(15,2) DEFAULT 0.00,
        last_activity DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_account_number (account_number),
        INDEX idx_account_type (account_type),
        INDEX idx_status (status),
        INDEX idx_last_activity (last_activity)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create transactions table with enhanced security
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        account_id INT NOT NULL,
        transaction_type ENUM('deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'interest') NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        balance_after DECIMAL(15,2) NOT NULL,
        description TEXT,
        reference_number VARCHAR(255) UNIQUE NOT NULL, -- Encrypted reference
        status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        related_transaction_id INT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        location_data JSON,
        fraud_score DECIMAL(3,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (related_transaction_id) REFERENCES transactions(id),
        INDEX idx_account_id (account_id),
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_reference_number (reference_number),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_fraud_score (fraud_score)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create transfers table with enhanced security
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS transfers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        from_account_id INT NOT NULL,
        to_account_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        description TEXT,
        reference_number VARCHAR(255) UNIQUE NOT NULL, -- Encrypted reference
        status ENUM('pending', 'completed', 'failed', 'cancelled' , 'scheduled') DEFAULT 'pending',
        scheduled_date DATETIME,
        completed_at DATETIME,
        ip_address VARCHAR(45),
        user_agent TEXT,
        location_data JSON,
        fraud_score DECIMAL(3,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (from_account_id) REFERENCES accounts(id),
        FOREIGN KEY (to_account_id) REFERENCES accounts(id),
        INDEX idx_from_account (from_account_id),
        INDEX idx_to_account (to_account_id),
        INDEX idx_reference_number (reference_number),
        INDEX idx_status (status),
        INDEX idx_scheduled_date (scheduled_date),
        INDEX idx_fraud_score (fraud_score)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create loans table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS loans (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        loan_type ENUM('personal', 'mortgage', 'business', 'auto', 'student') NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        interest_rate DECIMAL(5,4) NOT NULL,
        term_months INT NOT NULL,
        monthly_payment DECIMAL(15,2) NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'active', 'paid_off', 'defaulted') DEFAULT 'pending',
        purpose VARCHAR(255),
        income DECIMAL(15,2),
        employment_status VARCHAR(100),
        approved_by INT,
        approved_at DATETIME,
        start_date DATE,
        end_date DATE,
        remaining_balance DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id),
        INDEX idx_user_id (user_id),
        INDEX idx_loan_type (loan_type),
        INDEX idx_status (status),
        INDEX idx_approved_by (approved_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create loan_payments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS loan_payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        loan_id INT NOT NULL,
        payment_amount DECIMAL(15,2) NOT NULL,
        principal_amount DECIMAL(15,2) NOT NULL,
        interest_amount DECIMAL(15,2) NOT NULL,
        payment_date DATE NOT NULL,
        status ENUM('scheduled', 'paid', 'overdue', 'defaulted') DEFAULT 'scheduled',
        paid_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
        INDEX idx_loan_id (loan_id),
        INDEX idx_payment_date (payment_date),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create scheduled_payments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS scheduled_payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        from_account_id INT NOT NULL,
        to_account_id INT,
        recipient_name VARCHAR(100),
        recipient_account VARCHAR(255), -- Encrypted recipient account
        amount DECIMAL(15,2) NOT NULL,
        frequency ENUM('once', 'daily', 'weekly', 'monthly', 'yearly') NOT NULL,
        next_payment_date DATE NOT NULL,
        end_date DATE,
        description TEXT,
        status ENUM('active', 'paused', 'cancelled', 'completed') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (from_account_id) REFERENCES accounts(id),
        FOREIGN KEY (to_account_id) REFERENCES accounts(id),
        INDEX idx_user_id (user_id),
        INDEX idx_from_account (from_account_id),
        INDEX idx_next_payment_date (next_payment_date),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create documents table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        document_type ENUM('id_proof', 'address_proof', 'income_proof', 'loan_document', 'other') NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_hash VARCHAR(64), -- SHA-256 hash for integrity
        encrypted BOOLEAN DEFAULT FALSE,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INT,
        reviewed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id),
        INDEX idx_user_id (user_id),
        INDEX idx_document_type (document_type),
        INDEX idx_status (status),
        INDEX idx_file_hash (file_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create audit_logs table with enhanced security logging
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(50),
        record_id INT,
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        location_data JSON,
        session_id VARCHAR(255),
        risk_score DECIMAL(3,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_table_name (table_name),
        INDEX idx_created_at (created_at),
        INDEX idx_risk_score (risk_score),
        INDEX idx_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create security_events table for security monitoring
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        event_type ENUM('login_attempt', 'failed_login', 'suspicious_activity', 'password_change', '2fa_enabled', '2fa_disabled', 'session_created', 'session_revoked', 'account_locked', 'account_unlocked', 'fraud_detected') NOT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        description TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        location_data JSON,
        session_id VARCHAR(255),
        risk_score DECIMAL(3,2) DEFAULT 0.00,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_by INT,
        resolved_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (resolved_by) REFERENCES users(id),
        INDEX idx_user_id (user_id),
        INDEX idx_event_type (event_type),
        INDEX idx_severity (severity),
        INDEX idx_created_at (created_at),
        INDEX idx_risk_score (risk_score),
        INDEX idx_resolved (resolved)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create notifications table for user notifications
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        isRead BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_isRead (isRead),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create admin users with enhanced security
    const adminPassword = await require("bcryptjs").hash("admin123", 12);
    await connection.execute(
      `
      INSERT IGNORE INTO users (
        first_name, last_name, email, password, phone, date_of_birth, 
        ssn, address, city, state, zip_code, role, status, two_factor_enabled
      ) VALUES 
      ('Admin', 'User', 'admin@fswdbank.com', ?, '+1234567890', '1990-01-01', 
       '123456789', '123 Admin St', 'Admin City', 'CA', '12345', 'admin', 'active', FALSE),
      ('Manager', 'User', 'manager@fswdbank.com', ?, '+1234567891', '1990-01-01', 
       '123456788', '123 Manager St', 'Manager City', 'CA', '12345', 'manager', 'active', FALSE)
    `,
      [adminPassword, adminPassword]
    );

    console.log("[DATABASE] MySQL database setup completed");
    console.log(
      "[CREDENTIALS] Admin email: admin@fswdbank.com, password: admin123"
    );
    console.log(
      "[CREDENTIALS] Manager email: manager@fswdbank.com, password: admin123"
    );
  } catch (error) {
    console.error("[ERROR] MySQL setup error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// MongoDB Setup
const setupMongoDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/fswd_bank";

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("[DATABASE] Connected to MongoDB");

    // Create indexes for better performance
    const db = mongoose.connection.db;

    // Create collections with indexes
    await db.createCollection("notifications");
    await db
      .collection("notifications")
      .createIndex({ userId: 1, createdAt: -1 });
    await db.collection("notifications").createIndex({ userId: 1, isRead: 1 });
    await db.collection("notifications").createIndex({ type: 1 });
    await db
      .collection("notifications")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    await db.createCollection("activity_logs");
    await db
      .collection("activity_logs")
      .createIndex({ userId: 1, createdAt: -1 });
    await db.collection("activity_logs").createIndex({ action: 1 });
    await db
      .collection("activity_logs")
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

    await db.createCollection("system_settings");
    await db
      .collection("system_settings")
      .createIndex({ key: 1 }, { unique: true });

    await db.createCollection("chat_messages");
    await db
      .collection("chat_messages")
      .createIndex({ roomId: 1, createdAt: -1 });
    await db
      .collection("chat_messages")
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

    // New security-related collections
    await db.createCollection("security_sessions");
    await db
      .collection("security_sessions")
      .createIndex({ userId: 1, createdAt: -1 });
    await db
      .collection("security_sessions")
      .createIndex({ sessionId: 1 }, { unique: true });
    await db
      .collection("security_sessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    await db.createCollection("fraud_detection");
    await db
      .collection("fraud_detection")
      .createIndex({ userId: 1, createdAt: -1 });
    await db.collection("fraud_detection").createIndex({ riskScore: -1 });
    await db.collection("fraud_detection").createIndex({ ipAddress: 1 });
    await db
      .collection("fraud_detection")
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

    await db.createCollection("encryption_keys");
    await db
      .collection("encryption_keys")
      .createIndex({ keyId: 1 }, { unique: true });
    await db.collection("encryption_keys").createIndex({ createdAt: 1 });

    console.log("[DATABASE] MongoDB setup completed");
  } catch (error) {
    console.error("[ERROR] MongoDB setup error:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

// Main setup function
const setupDatabases = async () => {
  console.log("[SETUP] Starting database setup...\n");

  try {
    await setupMySQL();
    console.log("");
    await setupMongoDB();

    console.log("\n[SETUP] All databases setup completed successfully!");
    console.log("\n[SECURITY] Security Features Added:");
    console.log("   • Field-level encryption for sensitive data");
    console.log("   • Two-factor authentication support");
    console.log("   • Enhanced session management");
    console.log("   • Security event logging");
    console.log("   • Fraud detection capabilities");
    console.log("   • Account lockout protection");
    console.log("   • Password history tracking");
    console.log("\n[NEXT STEPS]:");
    console.log("1. Copy env.example to .env and configure your settings");
    console.log(
      "2. Install additional dependencies: npm install speakeasy qrcode ioredis"
    );
    console.log("3. Run: npm run dev");
    console.log("4. Visit: http://localhost:3000");
  } catch (error) {
    console.error("\n[ERROR] Database setup failed:", error);
    process.exit(1);
  }
};

// Run setup if called directly
if (require.main === module) {
  setupDatabases();
}

module.exports = { setupDatabases, setupMySQL, setupMongoDB };
