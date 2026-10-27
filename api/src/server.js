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
import paymentRoutes from "./routes/paymentRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";

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
        origin.endsWith(".cafecorazon.shop") ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json());
// Ensure uploads directory exists (safely catch error in read-only serverless environments)
const uploadsDir = path.join(__dirname, "..", "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("📁 Created uploads/ directory.");
  }
} catch (_err) {
  // Read-only serverless environment
}
app.use("/uploads", express.static(uploadsDir));

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

const apiRouter = express.Router();

apiRouter.get(["/", "/health"], (_req, res) => {
  res.json({
    status: "ok",
    message: "Cafe Corazon Coffee Shop API is running!",
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get("/ping", async (_req, res) => {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", latencyMs: Date.now() - start });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", message: err.message });
  }
});

apiRouter.all("/init-db", async (_req, res) => {
  try {
    await seedDatabase();
    res.json({ status: "ok", message: "Database schema and seed completed successfully!" });
  } catch (err) {
    console.error("DB Init Error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/products", productRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/inventory", inventoryRoutes);
apiRouter.use("/reports", reportRoutes);
apiRouter.use("/payroll", payrollRoutes);
apiRouter.use("/attendance", attendanceRoutes);
apiRouter.use("/audit", auditRoutes);
apiRouter.use("/settings", settingsRoutes);
apiRouter.use("/menu", menuRoutes);
apiRouter.use("/promos", promoRoutes);
apiRouter.use("/verification-codes", verificationCodeRoutes);
apiRouter.use("/payments", paymentRoutes);
apiRouter.use("/recipes", recipeRoutes);

app.use("/api", apiRouter);
app.use("/", apiRouter);

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

// In serverless environments (like Vercel), app is exported without calling app.listen()
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running at http://localhost:${PORT}/api`);
    console.log(
      "Routes: /api/auth, /api/users, /api/products, /api/menu, /api/orders, /api/inventory, /api/reports, /api/payroll, /api/attendance, /api/audit, /api/settings, /api/verification-codes"
    );

    // Seed database asynchronously without crashing the server if DB connection fails initially
    seedDatabase()
      .then(() => console.log("Database seeded / checked successfully."))
      .catch((err) => {
        console.error("Database connection warning during seed:", err.message);
      });
  });
}

export default app;
