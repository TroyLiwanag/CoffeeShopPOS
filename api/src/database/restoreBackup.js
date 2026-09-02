import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function restoreBackupIfNeeded() {
  try {
    const sqlPath = path.join(__dirname, "corazondb.sql");
    if (!fs.existsSync(sqlPath)) {
      console.log("No corazondb.sql backup file found.");
      return;
    }

    // Check if backup has already been restored (e.g. if we have more than 1 user or existing audit logs)
    const [existingUsers] = await pool.query("SELECT COUNT(*) as cnt FROM users");
    if (existingUsers[0].cnt > 1) {
      console.log(`Database already has ${existingUsers[0].cnt} users. Skipping backup restore.`);
      return;
    }

    console.log("Restoring database backup from corazondb.sql...");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    await pool.query("SET FOREIGN_KEY_CHECKS = 0;");

    const lines = sqlContent.split("\n");
    let currentQuery = "";
    let successCount = 0;
    let errorCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("--") || trimmed.startsWith("/*") || trimmed.startsWith("SET ") || trimmed.startsWith("START TRANSACTION") || trimmed.startsWith("COMMIT")) {
        continue;
      }

      currentQuery += line + "\n";
      if (trimmed.endsWith(";")) {
        try {
          await pool.query(currentQuery);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error("Statement execution note:", err.message);
        }
        currentQuery = "";
      }
    }

    await pool.query("SET FOREIGN_KEY_CHECKS = 1;");
    console.log(`✅ Backup restored successfully (${successCount} queries executed).`);
  } catch (err) {
    console.error("Backup restoration error:", err.message);
  }
}
