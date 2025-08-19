// alterTransfersEnum.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterTransfersEnum() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      port: process.env.MYSQL_PORT || 3306,
      database: process.env.MYSQL_DATABASE || 'fswd_bank'
    });

    console.log('[ALTER] Connected to MySQL database');

    const alterQuery = `
      ALTER TABLE transfers
      MODIFY status ENUM('pending', 'completed', 'failed', 'cancelled', 'scheduled') DEFAULT 'pending'
    `;

    await connection.execute(alterQuery);

    console.log('[ALTER] transfers.status ENUM updated successfully');

  } catch (error) {
    console.error('[ALTER] Error updating transfers.status ENUM:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('[ALTER] Connection closed');
    }
  }
}

alterTransfersEnum();
