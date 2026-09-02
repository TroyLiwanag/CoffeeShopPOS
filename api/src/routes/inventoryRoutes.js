import { Router } from "express";
import * as inventoryController from "../controllers/inventoryController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.get("/logs", requirePermission("canManageInventory"), inventoryController.listLogs);
router.post("/adjust", requirePermission("canManageInventory"), inventoryController.adjustStock);

router.get("/items", requirePermission("canViewDashboard"), inventoryController.listItems);
router.post("/items", requirePermission("canManageInventory"), inventoryController.createItem);
router.put("/items/:id", requirePermission("canManageInventory"), inventoryController.updateItem);
router.delete("/items/:id", requirePermission("canManageInventory"), inventoryController.deleteItem);

export default router;

