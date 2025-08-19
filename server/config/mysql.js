const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'fswd_bank',
      port: process.env.MYSQL_PORT || 3306,
      connectionLimit: 10,
      queueLimit: 0,
  connectTimeout: 60000,
      charset: 'utf8mb4'
    });

const connectMySQL = async () => {
  try {
    // Test the connection
    const connection = await pool.getConnection();
    console.log('[DATABASE] MySQL connected successfully');
    connection.release();

    return pool;
  } catch (error) {
    console.error('[ERROR] MySQL connection failed:', error.message);
    throw error;
  }
};

const getMySQLPool = () => {
  if (!pool) {
    throw new Error('MySQL pool not initialized. Call connectMySQL() first.');
  }
  return pool;
};

const closeMySQLConnection = async () => {
  if (pool) {
    await pool.end();
    console.log('[DATABASE] MySQL connection closed');
  }
};

module.exports = {
  connectMySQL,
  getMySQLPool,
  closeMySQLConnection
}; 