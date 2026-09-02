import { Router } from "express";
import * as userController from "../controllers/userController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.get("/", requirePermission("canManageUsers"), userController.list);
router.post("/", requirePermission("canManageUsers"), userController.create);
router.put("/:id", requirePermission("canManageUsers"), userController.update);
router.delete("/:id", requirePermission("canManageUsers"), userController.remove);

export default router;
