import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

export async function list(req, res) {
  const [rows] = await pool.query(`SELECT * FROM products ORDER BY name`);
  res.json(rows);
}

export async function create(req, res) {
  const { name, description, category, price, stock, image, status } = req.body;
  const [result] = await pool.query(
    `INSERT INTO products (name, description, category, price, stock, image, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description || null, category || null, price, stock ?? 0, image || null, status || "available"],
  );
  const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [result.insertId]);
  await logAuditFromReq(
    req,
    "Add Product",
    "Products",
    `Added product "${name}" (₱${price})`,
  );
  res.status(201).json(rows[0]);
}

export async function update(req, res) {
  const { name, description, category, price, stock, image, status } = req.body;
  await pool.query(
    `UPDATE products SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      category = COALESCE(?, category),
      price = COALESCE(?, price),
      stock = COALESCE(?, stock),
      image = COALESCE(?, image),
      status = COALESCE(?, status)
     WHERE id = ?`,
    [name ?? null, description ?? null, category ?? null, price ?? null, stock ?? null, image ?? null, status ?? null, req.params.id],
  );
  const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [req.params.id]);
  await logAuditFromReq(
    req,
    "Update Product",
    "Products",
    `Updated product #${req.params.id}${name ? ` "${name}"` : ""}`,
  );
  res.json(rows[0] || null);
}

export async function remove(req, res) {
  const [rows] = await pool.query(`SELECT name FROM products WHERE id = ?`, [req.params.id]);
  await pool.query(`DELETE FROM products WHERE id = ?`, [req.params.id]);
  await logAuditFromReq(
    req,
    "Delete Product",
    "Products",
    `Deleted product "${rows[0]?.name || req.params.id}"`,
  );
  res.json({ success: true });
}
