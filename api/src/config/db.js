import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME || "corazondb",
  waitForConnections: true,
  connectionLimit: process.env.VERCEL ? 3 : 10,
  ssl:
    process.env.DB_SSL === "true" || process.env.DB_SSL === "1"
      ? { rejectUnauthorized: false }
      : undefined,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 15000,
});

export default pool;
