import { Router } from "express";
import * as attendanceController from "../controllers/attendanceController.js";
import { authenticate, requireAnyPermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/my-status", attendanceController.myStatus);
router.post("/clock-in", attendanceController.clockIn);
router.post("/clock-out", attendanceController.clockOut);

router.get("/", requireAnyPermission("canManageAttendance", "canManageSales"), attendanceController.list);
router.delete("/:id", requireAnyPermission("canManageAttendance", "canManageSales"), attendanceController.remove);

export default router;
