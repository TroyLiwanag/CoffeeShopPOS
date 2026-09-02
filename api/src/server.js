import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pool from "./config/db.js";
import { seedDatabase } from "./database/seed.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import promoRoutes from "./routes/promoRoutes.js";
import verificationCodeRoutes from "./routes/verificationCodeRoutes.js";

import fs from "fs";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL || "https://cafecorazon.shop",
  "https://blueviolet-fly-843858.hostingersite.com",
  "https://cafecorazon.shop",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.endsWith(".hostingersite.com") ||
        origin.endsWith(".cafecorazon.shop")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Discover static frontend directory
const possibleFrontendPaths = [
  path.join(__dirname, "..", "public"),
  path.join(__dirname, "..", "public", "dist"),
  path.join(__dirname, "..", "dist"),
  path.join(__dirname, "..", "..", "project", "dist"),
];

for (const staticPath of possibleFrontendPaths) {
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
  }
}

app.get(["/api", "/api/"], (_req, res) => {
  res.json({
    status: "ok",
    message: "Cafe Corazon Coffee Shop API is running!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Cafe Corazon API Healthy" });
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", message: "Cafe Corazon Coffee Shop API is running!" }));

app.get("/api/ping", async (_req, res) => {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", latencyMs: Date.now() - start });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", message: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/promos", promoRoutes);
app.use("/api/verification-codes", verificationCodeRoutes);

// Fallback for React SPA routing on non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
    return next();
  }
  for (const staticPath of possibleFrontendPaths) {
    const indexPath = path.join(staticPath, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  res.json({
    status: "ok",
    message: "Cafe Corazon Coffee Shop API is running!",
    timestamp: new Date().toISOString(),
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Server error" });
});

// Start Express server immediately
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running at http://localhost:${PORT}/api`);
  console.log("Routes: /api/auth, /api/users, /api/products, /api/menu, /api/orders, /api/inventory, /api/reports, /api/payroll, /api/attendance, /api/audit, /api/settings, /api/verification-codes");
  
  // Seed database asynchronously without crashing the server if DB connection fails initially
  seedDatabase()
    .then(() => console.log("Database seeded / checked successfully."))
    .catch((err) => {
      console.error("Database connection warning during seed:", err.message);
      console.error("Verify Hostinger DB credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).");
    });
});
