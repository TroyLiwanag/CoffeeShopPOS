import { Router } from "express";
import * as inventoryController from "../controllers/inventoryController.js";
import { authenticate, requireAnyPermission, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// Legacy product stock endpoints
router.get("/logs", requirePermission("canManageInventory"), inventoryController.listLogs);
router.post("/adjust", requirePermission("canManageInventory"), inventoryController.adjustStock);

// Recipe Ingredient Inventory Endpoints
router.get("/items", requireAnyPermission("canViewDashboard", "canManageOrders", "canManageInventory"), inventoryController.listItems);
router.post("/items", requirePermission("canManageInventory"), inventoryController.createItem);
router.put("/items/:id", requirePermission("canManageInventory"), inventoryController.updateItem);
router.delete("/items/:id", requirePermission("canManageInventory"), inventoryController.deleteItem);

// Restock & Manual Adjustments with Waste/Notes
router.post("/items/:id/restock", requirePermission("canManageInventory"), inventoryController.restockIngredient);
router.post("/items/:id/adjust", requirePermission("canManageInventory"), inventoryController.adjustIngredient);

// Audit Movements & Consumption Reports
router.get("/movements", requirePermission("canManageInventory"), inventoryController.listMovements);
router.get("/reports", requirePermission("canManageInventory"), inventoryController.getConsumptionReport);

export default router;
