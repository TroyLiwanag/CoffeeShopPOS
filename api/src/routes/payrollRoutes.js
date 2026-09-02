import { Router } from "express";
import * as payrollController from "../controllers/payrollController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requirePermission("canManageSales"));
router.get("/overview", payrollController.overview);
router.put("/rates", payrollController.saveRates);

export default router;
