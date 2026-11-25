const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'college_placement_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

async function connectDatabase() {
  const connection = await pool.getConnection();

  try {
    await connection.ping();
    console.log('Connected to MySQL.');

    // Auto-initialize tables and seed data if users table doesn't exist
    const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      console.log('Database tables not found. Initializing schema and seed data...');
      
      const schemaSql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
      await connection.query(schemaSql);

      try {
        const optimizationSql = fs.readFileSync(path.join(__dirname, '../database/optimization.sql'), 'utf8');
        await connection.query(optimizationSql);
      } catch (optErr) {
        console.warn('Optimization indices skipped or already present:', optErr.message);
      }

      try {
        const seedSql = fs.readFileSync(path.join(__dirname, '../database/seed.sql'), 'utf8');
        await connection.query(seedSql);
      } catch (seedErr) {
        console.warn('Seed data skipped or already present:', seedErr.message);
      }

      console.log('Database initialized successfully with schema and seed data.');
    }
  } catch (err) {
    console.error('Error during database check/initialization:', err);
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { pool, connectDatabase };
