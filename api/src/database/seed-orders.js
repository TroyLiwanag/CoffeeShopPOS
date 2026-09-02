import pool from "../config/db.js";
import { ensureOrderItemsMenuColumn } from "./seed.js";

const TARGET_COUNT = 50;

const CUSTOMER_NAMES = [
  null,
  null,
  "Maria Santos",
  "Juan Dela Cruz",
  "Ana Reyes",
  "Carlos Mendoza",
  "Walk-in",
  "Jenny Lim",
  "Mark Tan",
  "Patricia Go",
  "Rico Villanueva",
  "Sofia Cruz",
  "Miguel Torres",
  "Ella Ramos",
  "Guest",
];

const PAYMENT_METHODS = ["Cash", "QR"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Date within the last `daysBack` days, biased toward recent */
function randomCreatedAt(daysBack = 60) {
  const now = Date.now();
  const offsetDays = Math.pow(Math.random(), 1.4) * daysBack;
  const d = new Date(now - offsetDays * 24 * 60 * 60 * 1000);
  d.setHours(randomInt(7, 21), randomInt(0, 59), randomInt(0, 59), 0);
  return d;
}

function formatMysqlDatetime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Insert ~50 completed sample orders (skips if DB already has >= TARGET_COUNT unless force=true).
 */
export async function seedSampleOrders({ force = false, count = TARGET_COUNT } = {}) {
  await ensureOrderItemsMenuColumn();

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS c FROM orders WHERE order_status = 'completed'`,
  );
  const existing = Number(countRows[0].c);
  if (!force && existing >= count) {
    console.log(`Orders seed skipped: ${existing} completed order(s) already in database.`);
    return { inserted: 0, skipped: true, existing };
  }

  const toInsert = force ? count : Math.max(0, count - existing);

  const [menuRows] = await pool.query(
    `SELECT id, name, price FROM menu_items WHERE status = 'available' ORDER BY id`,
  );
  if (menuRows.length === 0) {
    throw new Error("No menu_items found. Run the API once to seed menu, or add menu items first.");
  }

  const [users] = await pool.query(`SELECT id FROM users WHERE status = 'active' ORDER BY id LIMIT 1`);
  const createdBy = users[0]?.id ?? null;

  const conn = await pool.getConnection();
  let inserted = 0;

  try {
    await conn.beginTransaction();

    for (let i = 0; i < toInsert; i++) {
      const lineCount = randomInt(1, 4);
      const used = new Set();
      const lines = [];
      let total = 0;

      for (let j = 0; j < lineCount; j++) {
        let item = pick(menuRows);
        let tries = 0;
        while (used.has(item.id) && tries < 8) {
          item = pick(menuRows);
          tries++;
        }
        used.add(item.id);
        const qty = randomInt(1, 2);
        const price = Number(item.price);
        total += price * qty;
        lines.push({ menuItemId: item.id, qty, price });
      }

      total = Math.round(total * 100) / 100;
      const createdAt = formatMysqlDatetime(randomCreatedAt(60));

      const [orderResult] = await conn.query(
        `INSERT INTO orders (customer_name, total_amount, payment_method, order_status, created_by, created_at)
         VALUES (?, ?, ?, 'completed', ?, ?)`,
        [pick(CUSTOMER_NAMES), total, pick(PAYMENT_METHODS), createdBy, createdAt],
      );
      const orderId = orderResult.insertId;

      for (const line of lines) {
        await conn.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)`,
          [orderId, line.menuItemId, line.qty, line.price],
        );
      }
      inserted++;
    }

    await conn.commit();
    console.log(`Seeded ${inserted} sample order(s) (${existing + inserted} completed total).`);
    return { inserted, skipped: false, existing: existing + inserted };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
