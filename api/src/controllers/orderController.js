import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";
import { convertQuantity } from "../utils/unitConverter.js";

let columnsChecked = false;
async function ensureDiscountColumns() {
  if (columnsChecked) return;
  try {
    const [existingOrders] = await pool.query("SHOW COLUMNS FROM orders");
    const existingOrderNames = new Set(existingOrders.map((c) => c.Field));

    if (!existingOrderNames.has("discount_type")) {
      await pool.query("ALTER TABLE orders ADD COLUMN discount_type VARCHAR(50) DEFAULT 'None'");
    }
    if (!existingOrderNames.has("discount_amount")) {
      await pool.query("ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00");
    }
    if (!existingOrderNames.has("discount_rate")) {
      await pool.query("ALTER TABLE orders ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 0.00");
    }
    if (!existingOrderNames.has("discount_id_number")) {
      await pool.query("ALTER TABLE orders ADD COLUMN discount_id_number VARCHAR(100) DEFAULT NULL");
    }
    if (!existingOrderNames.has("beneficiary_name")) {
      await pool.query("ALTER TABLE orders ADD COLUMN beneficiary_name VARCHAR(255) DEFAULT NULL");
    }
    if (!existingOrderNames.has("order_status")) {
      await pool.query("ALTER TABLE orders ADD COLUMN order_status VARCHAR(50) DEFAULT 'completed'");
    } else {
      await pool.query("ALTER TABLE orders MODIFY COLUMN order_status VARCHAR(50) DEFAULT 'completed'");
    }
    if (!existingOrderNames.has("payment_status")) {
      await pool.query("ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'paid'");
    } else {
      await pool.query("ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'paid'");
    }
    if (!existingOrderNames.has("voided_by")) {
      await pool.query("ALTER TABLE orders ADD COLUMN voided_by BIGINT DEFAULT NULL");
    }
    if (!existingOrderNames.has("voided_by_name")) {
      await pool.query("ALTER TABLE orders ADD COLUMN voided_by_name VARCHAR(255) DEFAULT NULL");
    }
    if (!existingOrderNames.has("voided_at")) {
      await pool.query("ALTER TABLE orders ADD COLUMN voided_at DATETIME DEFAULT NULL");
    }
    if (!existingOrderNames.has("void_reason")) {
      await pool.query("ALTER TABLE orders ADD COLUMN void_reason TEXT DEFAULT NULL");
    }

    await pool.query("UPDATE orders SET order_status = 'completed' WHERE order_status IS NULL OR order_status = ''");
    await pool.query("UPDATE orders SET payment_status = 'paid' WHERE payment_status IS NULL OR payment_status = ''");

    const [existingItems] = await pool.query("SHOW COLUMNS FROM order_items");
    const existingItemNames = new Set(existingItems.map((c) => c.Field));
    if (!existingItemNames.has("options_json")) {
      await pool.query("ALTER TABLE order_items ADD COLUMN options_json TEXT DEFAULT NULL");
    }
    if (!existingItemNames.has("base_price")) {
      await pool.query("ALTER TABLE order_items ADD COLUMN base_price DECIMAL(10,2) DEFAULT NULL");
    }
    if (!existingItemNames.has("item_total")) {
      await pool.query("ALTER TABLE order_items ADD COLUMN item_total DECIMAL(10,2) DEFAULT NULL");
    }

    columnsChecked = true;
  } catch (err) {
    console.error("Error auto-migrating columns on orders/order_items table:", err);
  }
}

export async function list(req, res) {
  await ensureDiscountColumns();
  const [orders] = await pool.query(
    `SELECT o.*, COALESCE(o.order_status, 'completed') AS order_status, COALESCE(o.payment_status, 'paid') AS payment_status, u.fullname AS created_by_name
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
    paymentStatus,
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
    const payStatus = paymentStatus || (status === "completed" ? "paid" : "pending");

    const [result] = await conn.query(
      `INSERT INTO orders (
        customer_name, total_amount, payment_method, payment_status, order_status,
        promo_id, promo_name, promo_discount_amount,
        discount_type, discount_amount, discount_rate, discount_id_number, beneficiary_name,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerName || null,
        totalAmount,
        paymentMethod || "Cash",
        payStatus,
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
      const optionsJson = JSON.stringify({
        size: item.size || "",
        milk: item.milk || "",
        sugar: item.sugar || "",
        notes: item.notes || "",
        addons: item.addonsDetails || item.addons || [],
      });
      const basePrice = item.basePrice !== undefined ? item.basePrice : item.price;
      const itemTotal = item.itemTotal !== undefined ? item.itemTotal : item.price * item.quantity;
      const qty = Number(item.quantity) || 1;

      const [menuRows] = await conn.query(`SELECT id, category FROM menu_items WHERE id = ?`, [refId]);
      if (menuRows.length) {
        await conn.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, price, base_price, item_total, options_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [orderId, refId, qty, item.price, basePrice, itemTotal, optionsJson],
        );
        await conn.query(`UPDATE menu_items SET stock = GREATEST(0, stock - ?) WHERE id = ?`, [qty, refId]);
      } else {
        const [productRows] = await conn.query(`SELECT id, category FROM products WHERE id = ?`, [refId]);
        if (!productRows.length) {
          throw new Error(`Invalid menu/product reference: ${refId}`);
        }
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price, base_price, item_total, options_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [orderId, refId, qty, item.price, basePrice, itemTotal, optionsJson],
        );
        await conn.query(`UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?`, [qty, refId]);
        await conn.query(
          `INSERT INTO inventory_logs (product_id, action_type, quantity, performed_by)
           VALUES (?, 'sale', ?, ?)`,
          [refId, -qty, req.user.id],
        );
      }
    }

    // AUTOMATIC RECIPE INGREDIENT DEDUCTION & VALIDATION
    if (status === "completed" && payStatus === "paid") {
      const requiredIngredientsMap = {}; // ingredientId -> { requiredQty, name, currentStock, unit }

      for (const item of items || []) {
        const refId = item.menuItemId ?? item.productId;
        const itemQty = Number(item.quantity) || 1;
        const isMenu = item.menuItemId !== undefined && item.menuItemId !== null;
        const column = isMenu ? "pi.menu_item_id" : "pi.product_id";

        const [recipes] = await conn.query(
          `SELECT pi.ingredient_id, pi.quantity_used, pi.unit AS recipe_unit,
                  ii.name AS ingredient_name, ii.stock AS current_stock, ii.unit AS stock_unit
           FROM product_ingredients pi
           JOIN inventory_items ii ON ii.id = pi.ingredient_id
           WHERE ${column} = ?`,
          [refId],
        );

        let hasCupInRecipe = false;
        let hasStrawInRecipe = false;
        let hasHotCupInRecipe = false;

        for (const r of recipes) {
          const ingId = String(r.ingredient_id);
          const nameLower = (r.ingredient_name || "").toLowerCase();
          if (nameLower.includes("plastic cup")) hasCupInRecipe = true;
          if (nameLower.includes("straw")) hasStrawInRecipe = true;
          if (nameLower.includes("hot paper") || nameLower.includes("paper cup")) hasHotCupInRecipe = true;

          const qtyInStockUnit = convertQuantity(r.quantity_used, r.recipe_unit || r.stock_unit, r.stock_unit);
          const totalNeeded = qtyInStockUnit * itemQty;

          if (!requiredIngredientsMap[ingId]) {
            requiredIngredientsMap[ingId] = {
              ingredientId: ingId,
              name: r.ingredient_name,
              currentStock: Number(r.current_stock),
              unit: r.stock_unit,
              requiredQty: 0,
            };
          }
          requiredIngredientsMap[ingId].requiredQty += totalNeeded;
        }

        // Fallback packaging check based on item category & name
        const table = isMenu ? "menu_items" : "products";
        const [itemRows] = await conn.query(`SELECT name, category FROM ${table} WHERE id = ?`, [refId]);
        if (itemRows.length > 0) {
          const itemName = (itemRows[0].name || "").toLowerCase();
          const itemCat = (itemRows[0].category || "").toLowerCase();

          const isColdOrBlended =
            itemCat.includes("iced") ||
            itemCat.includes("blended") ||
            itemCat.includes("cold") ||
            itemName.includes("iced") ||
            itemName.includes("frappe") ||
            itemName.includes("blended") ||
            itemName.includes("oreo") ||
            itemName.includes("strawberry");
          const isHot = itemName.includes("hot") || itemName.includes("v60");

          if (isColdOrBlended) {
            if (!hasCupInRecipe) {
              const [cupRows] = await conn.query(
                `SELECT id, name, stock, unit FROM inventory_items WHERE name = 'Plastic Cups' LIMIT 1`,
              );
              if (cupRows.length > 0) {
                const ingId = String(cupRows[0].id);
                if (!requiredIngredientsMap[ingId]) {
                  requiredIngredientsMap[ingId] = {
                    ingredientId: ingId,
                    name: cupRows[0].name,
                    currentStock: Number(cupRows[0].stock),
                    unit: cupRows[0].unit,
                    requiredQty: 0,
                  };
                }
                requiredIngredientsMap[ingId].requiredQty += itemQty;
              }
            }
            if (!hasStrawInRecipe) {
              const [strawRows] = await conn.query(
                `SELECT id, name, stock, unit FROM inventory_items WHERE name = 'Plastic Straws' LIMIT 1`,
              );
              if (strawRows.length > 0) {
                const ingId = String(strawRows[0].id);
                if (!requiredIngredientsMap[ingId]) {
                  requiredIngredientsMap[ingId] = {
                    ingredientId: ingId,
                    name: strawRows[0].name,
                    currentStock: Number(strawRows[0].stock),
                    unit: strawRows[0].unit,
                    requiredQty: 0,
                  };
                }
                requiredIngredientsMap[ingId].requiredQty += itemQty;
              }
            }
          } else if (isHot) {
            if (!hasHotCupInRecipe) {
              const [hotRows] = await conn.query(
                `SELECT id, name, stock, unit FROM inventory_items WHERE name = 'Hot Paper Coffee Cups' LIMIT 1`,
              );
              if (hotRows.length > 0) {
                const ingId = String(hotRows[0].id);
                if (!requiredIngredientsMap[ingId]) {
                  requiredIngredientsMap[ingId] = {
                    ingredientId: ingId,
                    name: hotRows[0].name,
                    currentStock: Number(hotRows[0].stock),
                    unit: hotRows[0].unit,
                    requiredQty: 0,
                  };
                }
                requiredIngredientsMap[ingId].requiredQty += itemQty;
              }
            }
          }
        }
      }

      // Check for insufficient stock across all aggregated ingredients
      const insufficientList = [];
      for (const reqItem of Object.values(requiredIngredientsMap)) {
        if (reqItem.currentStock < reqItem.requiredQty) {
          insufficientList.push(
            `${reqItem.name} requires ${reqItem.requiredQty} ${reqItem.unit} but only ${reqItem.currentStock} ${reqItem.unit} is currently available.`,
          );
        }
      }

      if (insufficientList.length > 0) {
        await conn.rollback();
        return res.status(400).json({
          message: `Insufficient Ingredient Stock: Cannot complete this order because ${insufficientList.join(" ")}`,
          insufficientIngredients: insufficientList,
        });
      }

      // Deduct stock and record SALE_DEDUCTION movements
      for (const reqItem of Object.values(requiredIngredientsMap)) {
        const deductQty = reqItem.requiredQty;

        const [updateRes] = await conn.query(
          `UPDATE inventory_items SET stock = stock - ? WHERE id = ? AND stock >= ?`,
          [deductQty, reqItem.ingredientId, deductQty],
        );

        if (updateRes.affectedRows === 0) {
          await conn.rollback();
          return res.status(400).json({
            message: `Insufficient Ingredient Stock: Concurrent transaction changed stock for ${reqItem.name}. Please try again.`,
          });
        }

        const newStock = reqItem.currentStock - deductQty;

        await conn.query(
          `INSERT INTO inventory_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, order_id, user_id, notes)
           VALUES (?, 'SALE_DEDUCTION', ?, ?, ?, ?, ?, ?)`,
          [
            reqItem.ingredientId,
            -deductQty,
            reqItem.currentStock,
            newStock,
            orderId,
            req.user.id,
            `Automatic deduction for Order #${orderId}`,
          ],
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
    console.error("Order creation error:", err);
    res.status(500).json({ message: err.message || "Failed to create order." });
  } finally {
    conn.release();
  }
}

export async function updateStatus(req, res) {
  await ensureDiscountColumns();
  const orderStatus = req.body.orderStatus;
  const paymentStatus = req.body.paymentStatus;
  const [before] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [req.params.id]);

  if (paymentStatus) {
    await pool.query(`UPDATE orders SET order_status = ?, payment_status = ? WHERE id = ?`, [
      orderStatus,
      paymentStatus,
      req.params.id,
    ]);
  } else {
    await pool.query(`UPDATE orders SET order_status = ? WHERE id = ?`, [orderStatus, req.params.id]);
  }

  const [rows] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [req.params.id]);

  let actionType = "Update Order";
  if (orderStatus === "completed") actionType = "Complete Order";
  else if (orderStatus === "cancelled") actionType = "Cancel Order";
  else if (orderStatus === "voided") actionType = "Void Order";

  await logAuditFromReq(
    req,
    actionType,
    "Orders",
    `Order #${req.params.id} status: ${before[0]?.order_status} → ${orderStatus}`,
  );
  res.json(rows[0] || null);
}

export async function voidOrder(req, res) {
  await ensureDiscountColumns();
  const { id } = req.params;
  const { voidReason } = req.body;

  if (!voidReason || !String(voidReason).trim()) {
    return res.status(400).json({ message: "A reason is required to void an order." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orders] = await conn.query(`SELECT * FROM orders WHERE id = ?`, [id]);
    if (!orders.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Order not found." });
    }

    const order = orders[0];
    if (order.order_status === "voided") {
      await conn.rollback();
      return res.status(400).json({ message: "Order is already voided." });
    }

    // Update order status to voided
    await conn.query(
      `UPDATE orders
       SET order_status = 'voided', payment_status = 'voided',
           voided_by = ?, voided_by_name = ?, voided_at = NOW(), void_reason = ?
       WHERE id = ?`,
      [req.user.id, req.user.fullname || "User", voidReason.trim(), id],
    );

    // Restore stock for order items
    const [items] = await conn.query(`SELECT * FROM order_items WHERE order_id = ?`, [id]);
    for (const item of items) {
      if (item.menu_item_id) {
        await conn.query(`UPDATE menu_items SET stock = stock + ? WHERE id = ?`, [item.quantity, item.menu_item_id]);
      } else if (item.product_id) {
        await conn.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [item.quantity, item.product_id]);
        await conn.query(
          `INSERT INTO inventory_logs (product_id, action_type, quantity, performed_by)
           VALUES (?, 'void_restock', ?, ?)`,
          [item.product_id, item.quantity, req.user.id],
        );
      }
    }

    // Reverse recipe ingredient deductions from inventory_movements
    const [movements] = await conn.query(
      `SELECT * FROM inventory_movements WHERE order_id = ? AND movement_type = 'SALE_DEDUCTION'`,
      [id],
    );

    for (const m of movements) {
      const restoreQty = Math.abs(Number(m.quantity));
      const [curr] = await conn.query(`SELECT stock FROM inventory_items WHERE id = ?`, [m.ingredient_id]);
      if (curr.length) {
        const prevStock = Number(curr[0].stock);
        const newStock = prevStock + restoreQty;

        await conn.query(`UPDATE inventory_items SET stock = stock + ? WHERE id = ?`, [restoreQty, m.ingredient_id]);

        await conn.query(
          `INSERT INTO inventory_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, order_id, user_id, notes)
           VALUES (?, 'RETURN', ?, ?, ?, ?, ?, ?)`,
          [
            m.ingredient_id,
            restoreQty,
            prevStock,
            newStock,
            id,
            req.user.id,
            `Stock restored due to Order #${id} void. Reason: ${voidReason.trim()}`,
          ],
        );
      }
    }

    await conn.commit();
    const [rows] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [id]);

    await logAuditFromReq(
      req,
      "Void Order",
      "Orders",
      `Voided Order #${id} — ₱${order.total_amount}. Reason: ${voidReason.trim()}`,
    );

    res.json(rows[0] || order);
  } catch (err) {
    await conn.rollback();
    console.error("voidOrder error:", err);
    res.status(500).json({ message: err.message || "Failed to void order." });
  } finally {
    conn.release();
  }
}
