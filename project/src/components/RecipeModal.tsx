import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Save, ChefHat, AlertTriangle, CheckCircle2, PackageCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { usePos, type Ingredient } from "@/lib/pos-store";

interface RecipeItemInput {
  id?: string;
  ingredientId: string;
  quantityUsed: number | string;
  unit: string;
}

interface RecipeModalProps {
  open: boolean;
  itemType: "menu" | "product";
  itemId: string;
  itemName: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function RecipeModal({ open, itemType, itemId, itemName, onClose, onSaved }: RecipeModalProps) {
  const { ingredients, refreshIngredients } = usePos();
  const [recipeItems, setRecipeItems] = useState<RecipeItemInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && itemId) {
      loadRecipe();
    }
  }, [open, itemId, itemType]);

  const loadRecipe = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/recipes/${itemType}/${itemId}`);
      if (Array.isArray(data)) {
        setRecipeItems(
          data.map((r: any) => ({
            id: r.id,
            ingredientId: r.ingredientId,
            quantityUsed: r.quantityUsed,
            unit: r.unit || r.ingredientUnit || "g",
          })),
        );
      }
    } catch {
      toast.error("Could not load product recipe.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const handleAddIngredient = () => {
    // Pick first unselected ingredient if available
    const selectedIds = new Set(recipeItems.map((i) => i.ingredientId));
    const firstAvailable = ingredients.find((i) => !selectedIds.has(i.id));

    if (!firstAvailable && ingredients.length > 0) {
      toast.error("All available inventory ingredients are already added to this recipe.");
      return;
    }

    const defaultIng = firstAvailable || ingredients[0];
    setRecipeItems((prev) => [
      ...prev,
      {
        ingredientId: defaultIng ? defaultIng.id : "",
        quantityUsed: 1,
        unit: defaultIng ? defaultIng.unit : "g",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setRecipeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof RecipeItemInput, value: any) => {
    setRecipeItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };

        // If changing ingredientId, update default unit from selected ingredient
        if (field === "ingredientId") {
          const ing = ingredients.find((x) => x.id === value);
          if (ing) updated.unit = ing.unit;
        }
        return updated;
      }),
    );
  };

  // Calculate estimated available servings for this product based on current stock
  const calculateEstimatedServings = () => {
    if (recipeItems.length === 0) return null;

    let minServings = Infinity;
    let bottleneck = "";

    for (const item of recipeItems) {
      if (!item.ingredientId || !item.quantityUsed || Number(item.quantityUsed) <= 0) continue;
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      if (!ing) continue;

      const qty = Number(item.quantityUsed);
      const stock = Number(ing.stock) || 0;

      // Simple unit match check
      let servings = Math.floor(stock / qty);
      if (servings < minServings) {
        minServings = servings;
        bottleneck = ing.name;
      }
    }

    if (minServings === Infinity) return null;
    return {
      servings: Math.max(0, minServings),
      bottleneck,
    };
  };

  const est = calculateEstimatedServings();

  const handleSave = async () => {
    // Validate recipe items
    if (recipeItems.length === 0) {
      toast.error("Please add at least one ingredient to the recipe or close.");
      return;
    }

    const seen = new Set();
    for (const item of recipeItems) {
      if (!item.ingredientId) {
        toast.error("Please select an ingredient for all recipe rows.");
        return;
      }
      if (seen.has(item.ingredientId)) {
        const ing = ingredients.find((x) => x.id === item.ingredientId);
        toast.error(`Duplicate ingredient '${ing?.name || item.ingredientId}' in recipe.`);
        return;
      }
      seen.add(item.ingredientId);

      const qty = Number(item.quantityUsed);
      if (isNaN(qty) || qty <= 0) {
        toast.error("Ingredient quantity per serving must be greater than 0.");
        return;
      }
    }

    setSaving(true);
    try {
      await api.put(`/recipes/${itemType}/${itemId}`, {
        ingredients: recipeItems.map((i) => ({
          ingredientId: i.ingredientId,
          quantityUsed: Number(i.quantityUsed),
          unit: i.unit,
        })),
      });
      toast.success(`Recipe saved for ${itemName}!`);
      await refreshIngredients();
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save recipe.");
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-panel relative w-full max-w-2xl max-h-[90vh] flex flex-col p-6 bg-card border rounded-2xl shadow-2xl space-y-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl">{itemName}</h2>
              <p className="text-xs text-muted-foreground">Product Recipe & Ingredient Deductions per Serving</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Available Servings Forecast Card */}
        {est && (
          <div className="p-3.5 rounded-xl border border-accent/30 bg-accent/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-accent shrink-0" />
              <div>
                <span className="font-semibold text-foreground">Estimated Available Servings:</span>{" "}
                <span className="font-bold text-accent text-sm ml-1">{est.servings} servings</span>
                {est.bottleneck && (
                  <span className="text-muted-foreground ml-2">(Limited by {est.bottleneck})</span>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Loading product recipe…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recipe Ingredients ({recipeItems.length})
              </h3>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="px-3 py-1.5 rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium inline-flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Ingredient
              </button>
            </div>

            {recipeItems.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl space-y-2">
                <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">No recipe ingredients assigned</p>
                <p className="text-xs text-muted-foreground">
                  Click "Add Ingredient" to specify raw materials used per serving.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {recipeItems.map((item, idx) => {
                  const selectedIng = ingredients.find((i) => i.id === item.ingredientId);
                  return (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl border bg-card hover:border-accent/30 transition"
                    >
                      {/* Ingredient Selector */}
                      <div className="flex-1 min-w-[180px]">
                        <label className="text-[10px] font-medium text-muted-foreground">Ingredient</label>
                        <select
                          value={item.ingredientId}
                          onChange={(e) => handleItemChange(idx, "ingredientId", e.target.value)}
                          className="mt-0.5 w-full px-3 py-2 rounded-lg border bg-background text-sm font-medium focus:ring-1 focus:ring-accent"
                        >
                          <option value="">Select Ingredient</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.stock} {ing.unit} in stock)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity Per Serving */}
                      <div className="w-full sm:w-32">
                        <label className="text-[10px] font-medium text-muted-foreground">Qty per Serving</label>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={item.quantityUsed}
                          onChange={(e) => handleItemChange(idx, "quantityUsed", e.target.value)}
                          className="mt-0.5 w-full px-3 py-2 rounded-lg border bg-background text-sm font-medium"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Unit Selector */}
                      <div className="w-full sm:w-28">
                        <label className="text-[10px] font-medium text-muted-foreground">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                          className="mt-0.5 w-full px-3 py-2 rounded-lg border bg-background text-sm font-medium"
                        >
                          <option value="g">g (grams)</option>
                          <option value="kg">kg (kilograms)</option>
                          <option value="ml">ml (milliliters)</option>
                          <option value="L">L (liters)</option>
                          <option value="pcs">pcs (pieces)</option>
                        </select>
                      </div>

                      {/* Delete Action */}
                      <div className="flex items-end justify-end pt-2 sm:pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition"
                          title="Remove from recipe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="btn-primary text-sm min-h-[42px] px-5 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Recipe"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
