const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'college_placement_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function connectDatabase() {
  const connection = await pool.getConnection();

  try {
    await connection.ping();
    console.log('Connected to MySQL.');
  } finally {
    connection.release();
  }
}

module.exports = { pool, connectDatabase };
