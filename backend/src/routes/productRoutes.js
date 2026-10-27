import { Router } from "express";
import * as productController from "../controllers/productController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, productController.list);
router.post("/", authenticate, requirePermission("canManageProducts"), productController.create);
router.put("/:id", authenticate, requirePermission("canManageProducts"), productController.update);
router.delete("/:id", authenticate, requirePermission("canManageProducts"), productController.remove);

export default router;
