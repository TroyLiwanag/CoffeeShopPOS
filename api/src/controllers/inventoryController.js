import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

export async function listLogs(req, res) {
  const [rows] = await pool.query(
    `SELECT il.*, p.name AS product_name, u.fullname AS performed_by_name
     FROM inventory_logs il
     JOIN products p ON p.id = il.product_id
     LEFT JOIN users u ON u.id = il.performed_by
     ORDER BY il.created_at DESC
     LIMIT 200`,
  );
  res.json(rows);
}

export async function adjustStock(req, res) {
  const { productId, quantity, actionType } = req.body;
  const type = actionType || "adjustment";
  const [productRows] = await pool.query(`SELECT name, stock FROM products WHERE id = ?`, [productId]);

  await pool.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [quantity, productId]);
  await pool.query(
    `INSERT INTO inventory_logs (product_id, action_type, quantity, performed_by)
     VALUES (?, ?, ?, ?)`,
    [productId, type, quantity, req.user.id],
  );
  const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [productId]);

  let auditAction = "Inventory Adjustment";
  if (type === "stock_in" || quantity > 0) auditAction = "Stock In";
  else if (type === "stock_out" || quantity < 0) auditAction = "Stock Out";

  await logAuditFromReq(
    req,
    auditAction,
    "Inventory",
    `${productRows[0]?.name || productId}: ${quantity > 0 ? "+" : ""}${quantity} (${type})`,
  );
  res.json(rows[0]);
}

export async function listItems(req, res) {
  const [rows] = await pool.query(`SELECT * FROM inventory_items ORDER BY category, name`);
  const items = rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    stock: Number(r.stock),
    min: Number(r.min),
    unit: r.unit,
    category: r.category,
    batchNo: r.batch_no || undefined,
  }));
  res.json(items);
}

export async function createItem(req, res) {
  const { id, name, stock, min, unit, category, batchNo } = req.body;
  const itemId = id || String(Date.now());
  await pool.query(
    `INSERT INTO inventory_items (id, name, stock, min, unit, category, batch_no)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [itemId, name, stock || 0, min || 0, unit || "pcs", category || "Ingredient", batchNo || null],
  );
  const [rows] = await pool.query(`SELECT * FROM inventory_items WHERE id = ?`, [itemId]);
  const r = rows[0];
  await logAuditFromReq(req, "Add Inventory Item", "Inventory", `${name} (${category})`);
  res.status(201).json({
    id: String(r.id),
    name: r.name,
    stock: Number(r.stock),
    min: Number(r.min),
    unit: r.unit,
    category: r.category,
    batchNo: r.batch_no || undefined,
  });
}

export async function updateItem(req, res) {
  const { id } = req.params;
  const { name, stock, min, unit, category, batchNo } = req.body;
  const [existing] = await pool.query(`SELECT * FROM inventory_items WHERE id = ?`, [id]);
  if (!existing.length) {
    return res.status(404).json({ message: "Inventory item not found" });
  }
  const curr = existing[0];
  const nextName = name !== undefined ? name : curr.name;
  const nextStock = stock !== undefined ? stock : curr.stock;
  const nextMin = min !== undefined ? min : curr.min;
  const nextUnit = unit !== undefined ? unit : curr.unit;
  const nextCategory = category !== undefined ? category : curr.category;
  let nextBatchNo = curr.batch_no;
  if ("batchNo" in req.body) {
    nextBatchNo = req.body.batchNo && String(req.body.batchNo).trim() ? String(req.body.batchNo).trim() : null;
  }

  await pool.query(
    `UPDATE inventory_items
     SET name = ?, stock = ?, min = ?, unit = ?, category = ?, batch_no = ?
     WHERE id = ?`,
    [nextName, nextStock, nextMin, nextUnit, nextCategory, nextBatchNo, id],
  );

  const [rows] = await pool.query(`SELECT * FROM inventory_items WHERE id = ?`, [id]);
  const r = rows[0];
  await logAuditFromReq(req, "Update Inventory Item", "Inventory", `${nextName} (Batch/Exp: ${nextBatchNo || "none"})`);
  res.json({
    id: String(r.id),
    name: r.name,
    stock: Number(r.stock),
    min: Number(r.min),
    unit: r.unit,
    category: r.category,
    batchNo: r.batch_no || undefined,
  });
}

export async function deleteItem(req, res) {
  const { id } = req.params;
  const [existing] = await pool.query(`SELECT name FROM inventory_items WHERE id = ?`, [id]);
  await pool.query(`DELETE FROM inventory_items WHERE id = ?`, [id]);
  if (existing.length) {
    await logAuditFromReq(req, "Remove Inventory Item", "Inventory", existing[0].name);
  }
  res.json({ success: true });
}

