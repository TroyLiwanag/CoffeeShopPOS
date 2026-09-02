import express from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import {
  list,
  getById,
  create,
  update,
  remove,
  history,
  stats,
} from "../controllers/promoController.js";

const router = express.Router();

router.use(authenticate);

router.get("/history", requirePermission("canManagePromos"), history);
router.get("/stats", stats);
router.get("/", list);
router.get("/:id", getById);
router.post("/", requirePermission("canManagePromos"), create);
router.put("/:id", requirePermission("canManagePromos"), update);
router.delete("/:id", requirePermission("canManagePromos"), remove);

export default router;
