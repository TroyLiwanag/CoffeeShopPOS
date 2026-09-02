import { Router } from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import * as settingsController from "../controllers/settingsController.js";

const router = Router();

router.get("/", authenticate, settingsController.getSettings);
router.put("/", authenticate, requirePermission("canManageSettings"), settingsController.updateSettings);

export default router;
