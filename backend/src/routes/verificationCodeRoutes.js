import { Router } from "express";
import * as controller from "../controllers/verificationCodeController.js";
import { authenticate, requireAnyPermission } from "../middleware/auth.js";

const router = Router();

const checkPermission = requireAnyPermission(
  "canManageVerificationCodes",
  "manage_verification_codes"
);

router.use(authenticate, checkPermission);

router.get("/", controller.list);
router.post("/generate", controller.generate);
router.put("/:id/used", controller.markUsed);
router.delete("/bulk", controller.removeBulk);
router.delete("/all", controller.removeAll);
router.delete("/:id", controller.remove);

export default router;
