import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";
import { convertQuantity } from "../utils/unitConverter.js";

/**
 * GET /api/recipes/:itemType/:itemId
 * Fetch recipe ingredients for a menu_item or product
 */
export async function getRecipe(req, res) {
  try {
    const { itemType, itemId } = req.params;
    const isMenu = itemType === "menu";
    const column = isMenu ? "menu_item_id" : "product_id";

    const [rows] = await pool.query(
      `SELECT pi.id, pi.ingredient_id, pi.quantity_used, pi.unit,
              ii.name AS ingredient_name, ii.unit AS ingredient_unit, ii.stock AS current_stock, ii.min AS min_stock
       FROM product_ingredients pi
       JOIN inventory_items ii ON ii.id = pi.ingredient_id
       WHERE pi.${column} = ?
       ORDER BY ii.name`,
      [itemId],
    );

    const recipe = rows.map((r) => ({
      id: String(r.id),
      ingredientId: String(r.ingredient_id),
      ingredientName: r.ingredient_name,
      quantityUsed: Number(r.quantity_used),
      unit: r.unit || r.ingredient_unit,
      ingredientUnit: r.ingredient_unit,
      currentStock: Number(r.current_stock),
      minStock: Number(r.min_stock),
    }));

    res.json(recipe);
  } catch (err) {
    console.error("getRecipe error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch recipe." });
  }
}

/**
 * PUT /api/recipes/:itemType/:itemId
 * Save / Update recipe for a menu_item or product
 */
export async function updateRecipe(req, res) {
  const conn = await pool.getConnection();
  try {
    const { itemType, itemId } = req.params;
    const { ingredients } = req.body; // Array of { ingredientId, quantityUsed, unit }

    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ message: "Ingredients array is required." });
    }

    const isMenu = itemType === "menu";
    const column = isMenu ? "menu_item_id" : "product_id";

    // Validate itemName for audit log
    let itemName = `Item #${itemId}`;
    if (isMenu) {
      const [m] = await conn.query("SELECT name FROM menu_items WHERE id = ?", [itemId]);
      if (m.length) itemName = m[0].name;
    } else {
      const [p] = await conn.query("SELECT name FROM products WHERE id = ?", [itemId]);
      if (p.length) itemName = p[0].name;
    }

    // Check duplicate ingredient IDs
    const seen = new Set();
    for (const item of ingredients) {
      if (!item.ingredientId) {
        return res.status(400).json({ message: "All recipe items must select an ingredient." });
      }
      if (seen.has(item.ingredientId)) {
        return res.status(400).json({ message: "Duplicate ingredients are not allowed in the same recipe." });
      }
      seen.add(item.ingredientId);

      const qty = Number(item.quantityUsed);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: "Recipe ingredient quantity per serving must be greater than zero." });
      }
    }

    await conn.beginTransaction();

    // Delete existing recipe mapping
    await conn.query(`DELETE FROM product_ingredients WHERE ${column} = ?`, [itemId]);

    // Insert new recipe mappings
    for (const item of ingredients) {
      const qty = Number(item.quantityUsed);
      await conn.query(
        `INSERT INTO product_ingredients (${column}, ingredient_id, quantity_used, unit)
         VALUES (?, ?, ?, ?)`,
        [itemId, item.ingredientId, qty, item.unit || null],
      );
    }

    await conn.commit();

    await logAuditFromReq(
      req,
      "Update Recipe",
      "Menu Management",
      `Updated recipe for '${itemName}' (${ingredients.length} ingredients)`,
    );

    res.json({ success: true, message: `Recipe saved for ${itemName}` });
  } catch (err) {
    await conn.rollback();
    console.error("updateRecipe error:", err);
    res.status(500).json({ message: err.message || "Failed to save recipe." });
  } finally {
    conn.release();
  }
}

/**
 * GET /api/recipes/available-servings
 * Returns calculated available servings for all menu_items & products based on current ingredient stocks
 */
export async function getAllAvailableServings(req, res) {
  try {
    const [recipes] = await pool.query(
      `SELECT pi.menu_item_id, pi.product_id, pi.ingredient_id, pi.quantity_used, pi.unit AS recipe_unit,
              ii.stock, ii.unit AS stock_unit, ii.name AS ingredient_name
       FROM product_ingredients pi
       JOIN inventory_items ii ON ii.id = pi.ingredient_id`,
    );

    // Map by item: { 'menu_1': number, 'product_2': number }
    const availabilityMap = {};
    const itemIngredients = {};

    for (const row of recipes) {
      const key = row.menu_item_id ? `menu_${row.menu_item_id}` : `product_${row.product_id}`;
      if (!itemIngredients[key]) itemIngredients[key] = [];

      const qtyUsedInStockUnit = convertQuantity(row.quantity_used, row.recipe_unit || row.stock_unit, row.stock_unit);
      const stock = Number(row.stock);
      const possibleServings = qtyUsedInStockUnit > 0 ? Math.floor(stock / qtyUsedInStockUnit) : 0;

      itemIngredients[key].push({
        ingredientId: row.ingredient_id,
        ingredientName: row.ingredient_name,
        stock,
        qtyUsed: qtyUsedInStockUnit,
        possibleServings: Math.max(0, possibleServings),
      });
    }

    for (const [key, list] of Object.entries(itemIngredients)) {
      if (!list || list.length === 0) {
        availabilityMap[key] = null; // No recipe defined
      } else {
        const minServings = Math.min(...list.map((i) => i.possibleServings));
        const bottleneck = list.find((i) => i.possibleServings === minServings);
        availabilityMap[key] = {
          servings: minServings,
          bottleneck: bottleneck ? bottleneck.ingredientName : null,
          ingredientsCount: list.length,
        };
      }
    }

    res.json(availabilityMap);
  } catch (err) {
    console.error("getAllAvailableServings error:", err);
    res.status(500).json({ message: err.message || "Failed to calculate servings." });
  }
}
