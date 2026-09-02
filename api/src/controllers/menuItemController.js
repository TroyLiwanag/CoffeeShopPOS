import fs from "fs";
import path from "path";
import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";
import { MENU_UPLOAD_DIR } from "../middleware/uploadMenu.js";

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    price: Number(row.price),
    image: row.image,
    icon: row.icon || "coffee",
    stock: row.stock ?? 0,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function deleteImageFile(imagePath) {
  if (!imagePath || !imagePath.startsWith("/uploads/menu/")) return;
  const filename = path.basename(imagePath);
  const full = path.join(MENU_UPLOAD_DIR, filename);
  if (fs.existsSync(full)) fs.unlinkSync(full);
}

export async function list(req, res) {
  const { search, category } = req.query;
  let sql = `SELECT * FROM menu_items WHERE 1=1`;
  const params = [];

  if (category && category !== "all") {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    sql += ` AND (name LIKE ? OR category LIKE ? OR description LIKE ?)`;
    params.push(term, term, term);
  }
  sql += ` ORDER BY category, name`;

  const [rows] = await pool.query(sql, params);
  res.json(rows.map(mapRow));
}

export async function categories(req, res) {
  const [rows] = await pool.query(
    `SELECT DISTINCT category FROM menu_items ORDER BY category`,
  );
  res.json(rows.map((r) => r.category));
}

export async function getOne(req, res) {
  const [rows] = await pool.query(`SELECT * FROM menu_items WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: "Menu item not found" });
  res.json(mapRow(rows[0]));
}

export async function create(req, res) {
  const { name, category, description, icon, status } = req.body;
  const price = req.body.price != null ? Number(req.body.price) : null;
  const stock = req.body.stock != null ? Number(req.body.stock) : 0;
  if (!name || !category || price == null || Number.isNaN(price)) {
    return res.status(400).json({ message: "Name, category, and price are required" });
  }

  let imagePath = null;
  if (req.file) {
    imagePath = `/uploads/menu/${req.file.filename}`;
  }

  const [result] = await pool.query(
    `INSERT INTO menu_items (name, category, description, price, image, icon, stock, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      category,
      description || null,
      price,
      imagePath,
      icon || "coffee",
      stock ?? 0,
      status || "available",
    ],
  );

  const [rows] = await pool.query(`SELECT * FROM menu_items WHERE id = ?`, [result.insertId]);
  await logAuditFromReq(req, "Add Menu", "Menu", `Added menu item "${name}" (₱${price})`);
  res.status(201).json(mapRow(rows[0]));
}

export async function update(req, res) {
  const id = req.params.id;
  const [existing] = await pool.query(`SELECT * FROM menu_items WHERE id = ?`, [id]);
  if (!existing.length) return res.status(404).json({ message: "Menu item not found" });

  const { name, category, description, icon, status, removeImage } = req.body;
  const price = req.body.price != null && req.body.price !== "" ? Number(req.body.price) : null;
  const stock = req.body.stock != null && req.body.stock !== "" ? Number(req.body.stock) : null;
  let imagePath = existing[0].image;

  if (req.file) {
    deleteImageFile(imagePath);
    imagePath = `/uploads/menu/${req.file.filename}`;
  } else if (removeImage === "true" || removeImage === true) {
    deleteImageFile(imagePath);
    imagePath = null;
  }

  await pool.query(
    `UPDATE menu_items SET
      name = COALESCE(?, name),
      category = COALESCE(?, category),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      image = ?,
      icon = COALESCE(?, icon),
      stock = COALESCE(?, stock),
      status = COALESCE(?, status)
     WHERE id = ?`,
    [
      name ?? null,
      category ?? null,
      description ?? null,
      price != null && !Number.isNaN(price) ? price : null,
      imagePath,
      icon ?? null,
      stock != null && !Number.isNaN(stock) ? stock : null,
      status ?? null,
      id,
    ],
  );

  const [rows] = await pool.query(`SELECT * FROM menu_items WHERE id = ?`, [id]);
  await logAuditFromReq(
    req,
    "Update Menu",
    "Menu",
    `Updated menu item #${id}${name ? ` "${name}"` : ""}`,
  );
  res.json(mapRow(rows[0]));
}

export async function remove(req, res) {
  const [rows] = await pool.query(`SELECT name, image FROM menu_items WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: "Menu item not found" });

  deleteImageFile(rows[0].image);
  await pool.query(`DELETE FROM menu_items WHERE id = ?`, [req.params.id]);
  await logAuditFromReq(
    req,
    "Delete Menu",
    "Menu",
    `Deleted menu item "${rows[0].name}"`,
  );
  res.json({ success: true });
}

export async function uploadImage(req, res) {
  const id = req.params.id;
  if (!req.file) return res.status(400).json({ message: "No image file provided" });

  const [existing] = await pool.query(`SELECT image FROM menu_items WHERE id = ?`, [id]);
  if (!existing.length) return res.status(404).json({ message: "Menu item not found" });

  deleteImageFile(existing[0].image);
  const imagePath = `/uploads/menu/${req.file.filename}`;
  await pool.query(`UPDATE menu_items SET image = ? WHERE id = ?`, [imagePath, id]);

  const [rows] = await pool.query(`SELECT * FROM menu_items WHERE id = ?`, [id]);
  await logAuditFromReq(req, "Update Menu Image", "Menu", `Updated image for menu item #${id}`);
  res.json(mapRow(rows[0]));
}
