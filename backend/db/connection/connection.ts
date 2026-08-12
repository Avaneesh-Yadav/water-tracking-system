import { createPool, type Pool } from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const pool: Pool = createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
  connection.release();
});

export default pool;
