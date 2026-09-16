import { Router } from "express";
import { authenticate, requireAnyPermission } from "../middleware/auth.js";
import * as recipeController from "../controllers/recipeController.js";

const router = Router();

router.get("/available-servings", authenticate, recipeController.getAllAvailableServings);
router.get("/:itemType/:itemId", authenticate, recipeController.getRecipe);
router.put(
  "/:itemType/:itemId",
  authenticate,
  requireAnyPermission("canManageMenu", "canManageProducts", "canManageInventory"),
  recipeController.updateRecipe,
);

export default router;
