import { Router } from "express";
import * as reportController from "../controllers/reportController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.get("/summary", requirePermission("canManageReports"), reportController.summary);
router.get("/", requirePermission("canManageReports"), reportController.listReports);
router.post("/generate", requirePermission("canManageReports"), reportController.generate);
router.post("/export-log", requirePermission("canManageReports"), reportController.logExport);

export default router;
