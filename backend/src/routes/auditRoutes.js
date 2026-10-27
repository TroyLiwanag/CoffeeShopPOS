import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import * as auditController from "../controllers/auditController.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", auditController.list);
router.get("/modules", auditController.getModules);
router.get("/users", auditController.getUsers);
router.get("/export/csv", auditController.exportCsv);
router.get("/export/pdf", auditController.exportPdf);
router.delete("/bulk", auditController.removeBulk);
router.delete("/:id", auditController.remove);

export default router;
