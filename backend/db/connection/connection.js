const { createPool } = require('mysql2');
require('dotenv').config();

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',      // Database host
  port: process.env.DB_PORT || 3306,             // Default MySQL port (check if it's 3306 or 8080)
  user: process.env.DB_USER,                     // Username from .env
  password: process.env.DB_PASS,                 // Password from .env
  database: process.env.DB_NAME,                 // Database name from .env
  connectionLimit: 10                            // Connection limit
});


pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
});

module.exports = pool;
