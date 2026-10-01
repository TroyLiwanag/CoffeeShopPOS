import { Router } from "express";
import * as orderController from "../controllers/orderController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.get("/", requirePermission("canViewDashboard"), orderController.list);
/** POS checkout: staff with dashboard access can place orders */
router.post("/", requirePermission("canViewDashboard"), orderController.create);
router.patch("/:id/status", requirePermission("canManageOrders"), orderController.updateStatus);
router.post("/:id/refund", requirePermission("canManageOrders"), orderController.refundOrder);
router.post("/:id/void", requirePermission("canManageOrders"), orderController.voidOrder);
/** Pre-payment cart item void with Admin PIN authorization */
router.post("/void-item", orderController.voidCartItem);

export default router;
