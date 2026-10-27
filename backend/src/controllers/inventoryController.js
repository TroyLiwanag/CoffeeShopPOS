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
  try {
    const [rows] = await pool.query(
      `SELECT *, COALESCE(status, 'active') AS status FROM inventory_items ORDER BY category, manufactured_date DESC, created_at DESC, name ASC`,
    );
    const items = rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      stock: Number(r.stock),
      min: Number(r.min),
      unit: r.unit,
      category: r.category,
      batchNo: r.batch_no || undefined,
      manufacturedDate: r.manufactured_date ? String(r.manufactured_date).slice(0, 10) : undefined,
      status: r.status || "active",
    }));
    res.json(items);
  } catch (err) {
    console.error("listItems error:", err);
    res.status(500).json({ message: err.message || "Failed to list inventory items." });
  }
}

export async function createItem(req, res) {
  try {
    const { id, name, stock, min, unit, category, batchNo, manufacturedDate, status } = req.body;
    const itemId = id || String(Date.now());
    const itemStatus = status || "active";
    const mfgDate = manufacturedDate && String(manufacturedDate).trim() ? String(manufacturedDate).trim() : null;

    await pool.query(
      `INSERT INTO inventory_items (id, name, stock, min, unit, category, batch_no, manufactured_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, name, stock || 0, min || 0, unit || "pcs", category || "Ingredient", batchNo || null, mfgDate, itemStatus],
    );

    const [rows] = await pool.query(`SELECT * FROM inventory_items WHERE id = ?`, [itemId]);
    const r = rows[0];

    // Log initial stock movement
    if (Number(stock) > 0) {
      await pool.query(
        `INSERT INTO inventory_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, user_id, notes)
         VALUES (?, 'RESTOCK', ?, 0, ?, ?, 'Initial inventory creation')`,
        [itemId, stock, stock, req.user?.id || null],
      );
    }

    await logAuditFromReq(req, "Add Inventory Item", "Inventory", `${name} (${category}) - ${stock} ${unit}`);
    res.status(201).json({
      id: String(r.id),
      name: r.name,
      stock: Number(r.stock),
      min: Number(r.min),
      unit: r.unit,
      category: r.category,
      batchNo: r.batch_no || undefined,
      manufacturedDate: r.manufactured_date ? String(r.manufactured_date).slice(0, 10) : undefined,
      status: r.status || "active",
    });
  } catch (err) {
    console.error("createItem error:", err);
    res.status(500).json({ message: err.message || "Failed to create inventory item." });
  }
}

export async function updateItem(req, res) {
  try {
    const { id } = req.params;
    const { name, stock, min, unit, category, batchNo, manufacturedDate, status } = req.body;
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
    const nextStatus = status !== undefined ? status : (curr.status || "active");
    let nextBatchNo = curr.batch_no;
    if ("batchNo" in req.body) {
      nextBatchNo = req.body.batchNo && String(req.body.batchNo).trim() ? String(req.body.batchNo).trim() : null;
    }
    let nextMfgDate = curr.manufactured_date;
    if ("manufacturedDate" in req.body) {
      nextMfgDate = req.body.manufacturedDate && String(req.body.manufacturedDate).trim() ? String(req.body.manufacturedDate).trim() : null;
    }

    // If stock changed directly via edit, create a MANUAL_ADJUSTMENT movement
    if (stock !== undefined && Number(stock) !== Number(curr.stock)) {
      const diff = Number(stock) - Number(curr.stock);
      await pool.query(
        `INSERT INTO inventory_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, user_id, notes)
         VALUES (?, 'MANUAL_ADJUSTMENT', ?, ?, ?, ?, 'Direct edit in inventory management')`,
        [id, diff, curr.stock, stock, req.user?.id || null],
      );
    }

    await pool.query(
      `UPDATE inventory_items
       SET name = ?, stock = ?, min = ?, unit = ?, category = ?, batch_no = ?, manufactured_date = ?, status = ?
       WHERE id = ?`,
      [nextName, nextStock, nextMin, nextUnit, nextCategory, nextBatchNo, nextMfgDate, nextStatus, id],
    );

    const [rows] = await pool.query(`SELECT * FROM inventory_items WHERE id = ?`, [id]);
    const r = rows[0];
    await logAuditFromReq(req, "Update Inventory Item", "Inventory", `${nextName} (Status: ${nextStatus})`);
    res.json({
      id: String(r.id),
      name: r.name,
      stock: Number(r.stock),
      min: Number(r.min),
      unit: r.unit,
      category: r.category,
      batchNo: r.batch_no || undefined,
      manufacturedDate: r.manufactured_date ? String(r.manufactured_date).slice(0, 10) : undefined,
      status: r.status || "active",
    });
  } catch (err) {
    console.error("updateItem error:", err);
    res.status(500).json({ message: err.message || "Failed to update inventory item." });
  }
}

export async function deleteItem(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await pool.query(`SELECT name FROM inventory_items WHERE id = ?`, [id]);
    await pool.query(`DELETE FROM inventory_items WHERE id = ?`, [id]);
    if (existing.length) {
      await logAuditFromReq(req, "Remove Inventory Item", "Inventory", existing[0].name);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("deleteItem error:", err);
    res.status(500).json({ message: err.message || "Failed to delete item." });
  }
}

/**
 * POST /api/inventory/items/:id/restock
 * Restock ingredient inventory
 */
export async function restockIngredient(req, res) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;
    const addQty = Number(amount);

    if (isNaN(addQty) || addQty <= 0) {
      return res.status(400).json({ message: "Restock amount must be greater than zero." });
    }

    await conn.beginTransaction();

    const [items] = await conn.query(`SELECT * FROM inventory_items WHERE id = ? FOR UPDATE`, [id]);
    if (!items.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Ingredient not found." });
    }

    const item = items[0];
    const prevStock = Number(item.stock);
    const newStock = prevStock + addQty;

    await conn.query(`UPDATE inventory_items SET stock = ? WHERE id = ?`, [newStock, id]);

    await conn.query(
      `INSERT INTO inventory_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, user_id, notes)
       VALUES (?, 'RESTOCK', ?, ?, ?, ?, ?)`,
      [id, addQty, prevStock, newStock, req.user?.id || null, notes || "Restock inventory"],
    );

    await conn.commit();

    await logAuditFromReq(
      req,
      "Restock Ingredient",
      "Inventory",
      `Restocked ${item.name}: +${addQty} ${item.unit} (New stock: ${newStock} ${item.unit})`,
    );

    res.json({
      success: true,
      id: String(item.id),
      name: item.name,
      previousStock: prevStock,
      newStock,
      added: addQty,
      unit: item.unit,
    });
  } catch (err) {
    await conn.rollback();
    console.error("restockIngredient error:", err);
    res.status(500).json({ message: err.message || "Failed to restock ingredient." });
  } finally {
    conn.release();
  }
}

/**
 * POST /api/inventory/items/:id/adjust
 * Manual stock adjustment / Waste recording
 */
export async function adjustIngredient(req, res) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { quantity, movementType, notes } = req.body;
    const changeQty = Number(quantity);

    if (isNaN(changeQty) || changeQty === 0) {
      return res.status(400).json({ message: "Adjustment quantity must not be zero." });
    }

    const validTypes = ["RESTOCK", "SALE_DEDUCTION", "MANUAL_ADJUSTMENT", "WASTE", "RETURN", "CORRECTION"];
    const type = validTypes.includes(movementType) ? movementType : "MANUAL_ADJUSTMENT";

    if (!notes || !String(notes).trim()) {
      return res.status(400).json({ message: "Reason notes are required for manual inventory adjustments and waste." });
    }

    await conn.beginTransaction();

    const [items] = await conn.query(`SELECT * FROM inventory_items WHERE id = ? FOR UPDATE`, [id]);
    if (!items.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Ingredient not found." });
    }

    const item = items[0];
    const prevStock = Number(item.stock);
    const newStock = Math.max(0, prevStock + changeQty);

    await conn.query(`UPDATE inventory_items SET stock = ? WHERE id = ?`, [newStock, id]);

    await conn.query(
      `INSERT INTO inventory_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, type, changeQty, prevStock, newStock, req.user?.id || null, String(notes).trim()],
    );

    await conn.commit();

    await logAuditFromReq(
      req,
      `Inventory ${type}`,
      "Inventory",
      `${item.name} adjusted by ${changeQty > 0 ? "+" : ""}${changeQty} ${item.unit}. Notes: ${notes}`,
    );

    res.json({
      success: true,
      id: String(item.id),
      name: item.name,
      previousStock: prevStock,
      newStock,
      change: changeQty,
      movementType: type,
      unit: item.unit,
    });
  } catch (err) {
    await conn.rollback();
    console.error("adjustIngredient error:", err);
    res.status(500).json({ message: err.message || "Failed to adjust ingredient stock." });
  } finally {
    conn.release();
  }
}

/**
 * GET /api/inventory/movements
 * List inventory movement history with filters
 */
export async function listMovements(req, res) {
  try {
    const { ingredientId, movementType, startDate, endDate, limit = 200 } = req.query;

    let sql = `
      SELECT im.*, ii.name AS ingredient_name, ii.unit AS ingredient_unit, u.fullname AS user_name, o.customer_name
      FROM inventory_movements im
      JOIN inventory_items ii ON ii.id = im.ingredient_id
      LEFT JOIN users u ON u.id = im.user_id
      LEFT JOIN orders o ON o.id = im.order_id
      WHERE 1=1
    `;
    const params = [];

    if (ingredientId) {
      sql += ` AND im.ingredient_id = ?`;
      params.push(ingredientId);
    }
    if (movementType) {
      sql += ` AND im.movement_type = ?`;
      params.push(movementType);
    }
    if (startDate) {
      sql += ` AND im.created_at >= ?`;
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      sql += ` AND im.created_at <= ?`;
      params.push(`${endDate} 23:59:59`);
    }

    sql += ` ORDER BY im.created_at DESC LIMIT ?`;
    params.push(Number(limit) || 200);

    const [rows] = await pool.query(sql, params);

    const movements = rows.map((r) => ({
      id: String(r.id),
      ingredientId: String(r.ingredient_id),
      ingredientName: r.ingredient_name,
      ingredientUnit: r.ingredient_unit,
      movementType: r.movement_type,
      quantity: Number(r.quantity),
      previousStock: Number(r.previous_stock),
      newStock: Number(r.new_stock),
      orderId: r.order_id ? String(r.order_id) : null,
      userName: r.user_name || "System",
      customerName: r.customer_name || null,
      notes: r.notes || "",
      createdAt: r.created_at,
    }));

    res.json(movements);
  } catch (err) {
    console.error("listMovements error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch inventory movements." });
  }
}

/**
 * GET /api/inventory/reports
 * Consumption Summary Report by Date Range
 */
export async function getConsumptionReport(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? `${startDate} 00:00:00` : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate ? `${endDate} 23:59:59` : new Date().toISOString();

    const [items] = await pool.query("SELECT * FROM inventory_items ORDER BY name");

    const report = [];

    for (const item of items) {
      const [movements] = await pool.query(
        `SELECT movement_type, SUM(quantity) AS total_qty
         FROM inventory_movements
         WHERE ingredient_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY movement_type`,
        [item.id, start, end],
      );

      let restocked = 0;
      let salesUsed = 0;
      let wasteAdjustments = 0;

      for (const m of movements) {
        const qty = Number(m.total_qty) || 0;
        if (m.movement_type === "RESTOCK") {
          restocked += qty;
        } else if (m.movement_type === "SALE_DEDUCTION") {
          salesUsed += Math.abs(qty);
        } else if (["WASTE", "MANUAL_ADJUSTMENT", "CORRECTION", "RETURN"].includes(m.movement_type)) {
          wasteAdjustments += qty;
        }
      }

      const currentStock = Number(item.stock);
      const beginningStock = Math.max(0, currentStock - restocked + salesUsed - wasteAdjustments);

      report.push({
        ingredientId: String(item.id),
        name: item.name,
        category: item.category,
        unit: item.unit,
        beginningStock,
        restocked,
        salesUsed,
        wasteAdjustments,
        currentStock,
        minThreshold: Number(item.min),
        status: currentStock <= 0 ? "Out of Stock" : currentStock <= Number(item.min) ? "Low Stock" : "Sufficient",
      });
    }

    res.json(report);
  } catch (err) {
    console.error("getConsumptionReport error:", err);
    res.status(500).json({ message: err.message || "Failed to generate consumption report." });
  }
}
