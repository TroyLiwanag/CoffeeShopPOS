import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

let columnsChecked = false;
async function ensureDiscountColumns() {
  if (columnsChecked) return;
  try {
    const [existing] = await pool.query("SHOW COLUMNS FROM orders");
    const existingNames = new Set(existing.map((c) => c.Field));

    if (!existingNames.has("discount_type")) {
      await pool.query("ALTER TABLE orders ADD COLUMN discount_type VARCHAR(50) DEFAULT 'None'");
    }
    if (!existingNames.has("discount_amount")) {
      await pool.query("ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00");
    }
    if (!existingNames.has("discount_rate")) {
      await pool.query("ALTER TABLE orders ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 0.00");
    }
    if (!existingNames.has("discount_id_number")) {
      await pool.query("ALTER TABLE orders ADD COLUMN discount_id_number VARCHAR(100) DEFAULT NULL");
    }
    if (!existingNames.has("beneficiary_name")) {
      await pool.query("ALTER TABLE orders ADD COLUMN beneficiary_name VARCHAR(255) DEFAULT NULL");
    }
    columnsChecked = true;
  } catch (err) {
    console.error("Error auto-migrating discount columns on orders table:", err);
  }
}

export async function list(req, res) {
  await ensureDiscountColumns();
  const [orders] = await pool.query(
    `SELECT o.*, u.fullname AS created_by_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.created_by
     ORDER BY o.created_at DESC`,
  );
  for (const order of orders) {
    const [items] = await pool.query(
      `SELECT oi.*, COALESCE(m.name, p.name) AS product_name
       FROM order_items oi
       LEFT JOIN menu_items m ON m.id = oi.menu_item_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [order.id],
    );
    order.items = items;
  }
  res.json(orders);
}

export async function create(req, res) {
  await ensureDiscountColumns();
  const {
    customerName,
    totalAmount,
    paymentMethod,
    orderStatus,
    items,
    promoId,
    promoName,
    promoDiscountAmount,
    discountType,
    discountAmount,
    discountRate,
    discountIdNumber,
    beneficiaryName,
  } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const status = orderStatus || "completed";
    const [result] = await conn.query(
      `INSERT INTO orders (
        customer_name, total_amount, payment_method, order_status,
        promo_id, promo_name, promo_discount_amount,
        discount_type, discount_amount, discount_rate, discount_id_number, beneficiary_name,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerName || null,
        totalAmount,
        paymentMethod || "Cash",
        status,
        promoId || null,
        promoName || null,
        promoDiscountAmount || 0,
        discountType || "None",
        discountAmount || 0,
        discountRate || 0,
        discountIdNumber || null,
        beneficiaryName || null,
        req.user.id,
      ],
    );
    const orderId = result.insertId;
    for (const item of items || []) {
      const refId = item.menuItemId ?? item.productId;
      const [menuRows] = await conn.query(`SELECT id FROM menu_items WHERE id = ?`, [refId]);
      if (menuRows.length) {
        await conn.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)`,
          [orderId, refId, item.quantity, item.price],
        );
        await conn.query(`UPDATE menu_items SET stock = GREATEST(0, stock - ?) WHERE id = ?`, [
          item.quantity,
          refId,
        ]);
      } else {
        const [productRows] = await conn.query(`SELECT id FROM products WHERE id = ?`, [refId]);
        if (!productRows.length) {
          throw new Error(`Invalid menu/product reference: ${refId}`);
        }
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
          [orderId, refId, item.quantity, item.price],
        );
        await conn.query(`UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?`, [
          item.quantity,
          refId,
        ]);
        await conn.query(
          `INSERT INTO inventory_logs (product_id, action_type, quantity, performed_by)
           VALUES (?, 'sale', ?, ?)`,
          [refId, -item.quantity, req.user.id],
        );
      }
    }

    if (promoName) {
      await conn.query(
        `INSERT INTO promo_history (promo_id, promo_name, action, performed_by, performed_by_name, order_id)
         VALUES (?, ?, 'Promo Used', ?, ?, ?)`,
        [promoId || null, promoName, req.user.id, req.user.fullname || "User", orderId],
      );
    }

    await conn.commit();
    const [rows] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    await logAuditFromReq(
      req,
      "Create Order",
      "Orders",
      `Order #${orderId} — ₱${totalAmount} (${paymentMethod || "Cash"})${promoName ? ` [Promo: ${promoName} (-₱${promoDiscountAmount || 0})]` : ""} — ${status}`,
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateStatus(req, res) {
  const orderStatus = req.body.orderStatus;
  const [before] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [req.params.id]);
  await pool.query(`UPDATE orders SET order_status = ? WHERE id = ?`, [orderStatus, req.params.id]);
  const [rows] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [req.params.id]);

  let actionType = "Update Order";
  if (orderStatus === "completed") actionType = "Complete Order";
  else if (orderStatus === "cancelled") actionType = "Cancel Order";

  await logAuditFromReq(
    req,
    actionType,
    "Orders",
    `Order #${req.params.id} status: ${before[0]?.order_status} → ${orderStatus}`,
  );
  res.json(rows[0] || null);
}
