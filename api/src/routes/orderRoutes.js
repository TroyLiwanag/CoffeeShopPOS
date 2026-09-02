import { Router } from "express";
import * as orderController from "../controllers/orderController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.get("/", requirePermission("canViewDashboard"), orderController.list);
/** POS checkout: staff with dashboard access can place orders */
router.post("/", requirePermission("canViewDashboard"), orderController.create);
router.patch("/:id/status", requirePermission("canManageOrders"), orderController.updateStatus);

export default router;
