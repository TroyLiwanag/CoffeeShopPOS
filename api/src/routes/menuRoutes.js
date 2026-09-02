import { Router } from "express";
import * as menuController from "../controllers/menuItemController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { uploadMenuImage } from "../middleware/uploadMenu.js";

const router = Router();
const manage = [authenticate, requirePermission("canManageMenu")];

router.get("/", authenticate, menuController.list);
router.get("/categories", authenticate, menuController.categories);
router.get("/:id", authenticate, menuController.getOne);

router.post("/", ...manage, uploadMenuImage.single("image"), menuController.create);
router.put("/:id", ...manage, uploadMenuImage.single("image"), menuController.update);
router.post("/:id/image", ...manage, uploadMenuImage.single("image"), menuController.uploadImage);
router.delete("/:id", ...manage, menuController.remove);

export default router;
