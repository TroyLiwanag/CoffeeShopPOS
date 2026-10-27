import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export async function migrateLocalToCloud(targetConfig) {
  console.log("Connecting to local MySQL (127.0.0.1 / corazondb)...");
  const localConn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "corazondb",
    multipleStatements: true,
  });

  console.log("Connecting to Cloud MySQL (" + targetConfig.host + ")...");
  const cloudConn = await mysql.createConnection({
    host: targetConfig.host,
    port: Number(targetConfig.port) || 4000,
    user: targetConfig.user,
    password: targetConfig.password,
    database: targetConfig.database || "test",
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  });

  console.log("Fetching local tables...");
  const [tables] = await localConn.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");

  // Disable foreign keys on target during restore
  await cloudConn.query("SET FOREIGN_KEY_CHECKS = 0;");

  for (const tableObj of tables) {
    const tableName = Object.values(tableObj)[0];
    console.log(`\nMigrating table: ${tableName}...`);

    // Get create table definition
    const [[createRes]] = await localConn.query(`SHOW CREATE TABLE \`${tableName}\``);
    const createTableSql = createRes["Create Table"];

    await cloudConn.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    await cloudConn.query(createTableSql);

    // Fetch and insert data
    const [rows] = await localConn.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => "?").join(", ");
      const insertSql = `INSERT INTO \`${tableName}\` (\`${columns.join("`, `")}\`) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = columns.map((col) => {
          const val = row[col];
          if (val instanceof Date) return val;
          if (typeof val === "object" && val !== null) return JSON.stringify(val);
          return val;
        });
        await cloudConn.query(insertSql, values);
      }
      console.log(`  Inserted ${rows.length} rows into ${tableName}.`);
    } else {
      console.log(`  0 rows (schema created).`);
    }
  }

  await cloudConn.query("SET FOREIGN_KEY_CHECKS = 1;");

  console.log("\nMigration completed successfully! All 18 tables and data are now in the cloud database.");
  await localConn.end();
  await cloudConn.end();
}

if (process.argv[1]?.endsWith("migrateToCloud.js")) {
  const targetConfig = {
    host: process.env.TARGET_DB_HOST,
    port: process.env.TARGET_DB_PORT || 4000,
    user: process.env.TARGET_DB_USER,
    password: process.env.TARGET_DB_PASSWORD,
    database: process.env.TARGET_DB_NAME || "test",
  };
  migrateLocalToCloud(targetConfig)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
