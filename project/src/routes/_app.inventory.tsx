import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePos, StockCategory, type Ingredient, getExpirationStatus } from "@/lib/pos-store";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { AlertTriangle, Package, Plus, Trash2, Pencil, X, Clock } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";
import { PageContainer } from "@/components/layout/PageContainer";
import { withActionFeedbackSafe, withActionFeedback } from "@/lib/action-feedback";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryScreen,
});

const TABS: StockCategory[] = ["Ingredient", "Furniture", "Utensil"];

const UNIT_OPTIONS = [
  { value: "g", label: "Grams (g)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "ml", label: "Milliliters (ml)" },
  { value: "L", label: "Liters (L)" },
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "pack", label: "Pack" },
  { value: "box", label: "Box" },
  { value: "bottle", label: "Bottle" },
  { value: "can", label: "Can" },
];

const emptyForm = { name: "", stock: "", min: "", unit: "g", batchNo: "" };

function InventoryScreen() {
  const { ingredients, updateIngredient, addIngredient, removeIngredient } = usePos();
  const [tab, setTab] = useState<StockCategory>("Ingredient");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

  const items = ingredients.filter((i) => i.category === tab);
  const lowCount = ingredients.filter((i) => (i.stock / (i.min || 1)) * 100 <= 30).length;

  const expiredItems = ingredients.filter((i) => {
    const st = getExpirationStatus(i.batchNo);
    return st?.type === "expired";
  });

  const expiringItems = ingredients.filter((i) => {
    const st = getExpirationStatus(i.batchNo);
    return st?.type === "expiring";
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm({ ...emptyForm, unit: tab === "Ingredient" ? "g" : "pcs" });
    setModalOpen(true);
  };

  const openEditModal = (item: Ingredient) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      stock: String(item.stock),
      min: String(item.min),
      unit: item.unit,
      batchNo: item.batchNo || "",
    });
    setModalOpen(true);
  };

  useEffect(() => {
    closeModal();
    setDeleteTarget(null);
  }, [tab]);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await withActionFeedbackSafe(
      async () => {
        if (editingItem) {
          updateIngredient(editingItem.id, {
            name: form.name.trim(),
            stock: Number(form.stock) || 0,
            min: Number(form.min) || 0,
            unit: form.unit.trim() || "pcs",
            batchNo: form.batchNo.trim() ? form.batchNo.trim() : null,
          });
        } else {
          addIngredient({
            name: form.name.trim(),
            stock: Number(form.stock) || 0,
            min: Number(form.min) || 0,
            unit: form.unit.trim() || "pcs",
            category: tab,
            batchNo: form.batchNo.trim() ? form.batchNo.trim() : null,
          });
        }
        closeModal();
        await new Promise((r) => setTimeout(r, 300));
      },
      {
        loading: editingItem ? "Saving changes…" : "Adding item…",
        success: editingItem ? "Item updated!" : "Item added!",
        error: "Operation failed.",
      },
    );
  };

  const formModal =
    modalOpen ? (
      <div
        className="fixed inset-0 z-70 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
        onClick={closeModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-modal-title"
      >
        <form
          className="modal-panel relative w-full max-w-lg max-h-[90dvh] flex flex-col animate-scale-in"
          onClick={(e) => e.stopPropagation()}
          onSubmit={saveItem}
        >
          <div className="sticky top-0 glass-bar px-4 sm:px-6 py-4 border-b flex items-center justify-between rounded-t-2xl shrink-0">
            <h2 id="inventory-modal-title" className="font-display text-xl flex items-center gap-2">
              {editingItem ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingItem ? `Edit ${tab.toLowerCase()}` : `Add ${tab.toLowerCase()}`}
            </h2>
            <button
              type="button"
              onClick={closeModal}
              className="p-2 rounded-lg hover:bg-muted touch-manipulation"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain min-h-0">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <input
                placeholder="Item name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background text-sm"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Stock *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Min (reorder level)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.min}
                  onChange={(e) => setForm({ ...form, min: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Unit *</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="mt-1.5 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background text-sm"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            {tab === "Ingredient" && (
              <div>
                <label className="text-sm font-medium">Expiration (optional)</label>
                <input
                  type="date"
                  value={form.batchNo}
                  onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background text-sm font-mono"
                />
              </div>
            )}
          </div>

          <div className="sticky bottom-0 glass-bar border-t p-4 sm:p-5 flex gap-3 rounded-b-2xl shrink-0">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-3 min-h-[48px] rounded-lg border bg-card hover:bg-muted touch-manipulation"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 py-3 min-h-[48px]">
              {editingItem ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </div>
    ) : null;

  return (
    <PermissionGate path="/inventory">
      <PageContainer wide>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="font-display text-responsive-3xl">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">Ingredients, furniture, utensils</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 sm:px-5 py-2.5 min-h-[44px] rounded-full text-sm font-medium touch-manipulation active:scale-95 transition-transform ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"
              }`}
            >
              {t}s
            </button>
          ))}
          <button
            type="button"
            onClick={openAddModal}
            className="sm:ml-auto px-6 py-2.5 min-h-[44px] rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm touch-manipulation"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add {tab.toLowerCase()}
          </button>
        </div>

        <div className="glass-card rounded-2xl border overflow-hidden">
          <div className="table-scroll">
            <table className="w-full">
              <thead className="bg-muted">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">{tab}</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3">Unit</th>
                  {tab === "Ingredient" && <th className="px-6 py-3">Expiration</th>}
                  <th className="px-6 py-3 w-1/4">Level</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const targetMin = i.min > 0 ? i.min : 1;
                  const pct = Math.min(100, Math.max(0, (i.stock / targetMin) * 100));
                  const isRed = pct <= 30;
                  const isOrange = pct > 30 && pct < 50;

                  const barColor = isRed
                    ? "var(--destructive)"
                    : isOrange
                    ? "var(--warning)"
                    : "var(--success)";
                  return (
                    <tr key={i.id} className="border-t">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                            <Package className="w-4 h-4 text-secondary-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{i.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Min: {i.min} {i.unit}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">{i.stock}</td>
                      <td className="px-6 py-4 text-sm">{i.unit}</td>
                      {tab === "Ingredient" && (
                        <td className="px-6 py-4 text-xs font-mono">
                          {(() => {
                            const exp = getExpirationStatus(i.batchNo);
                            if (!exp) return i.batchNo || "—";
                            if (exp.type === "expired") {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-destructive/15 text-destructive font-semibold text-xs border border-destructive/30">
                                  <AlertTriangle className="w-3 h-3" /> {i.batchNo} ({exp.label})
                                </span>
                              );
                            }
                            if (exp.type === "expiring") {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-warning/15 text-warning font-semibold text-xs border border-warning/30">
                                  <Clock className="w-3 h-3" /> {i.batchNo} ({exp.label})
                                </span>
                              );
                            }
                            return i.batchNo;
                          })()}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: barColor,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {i.stock <= 0 ? (
                          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground whitespace-nowrap">
                            No stock
                          </span>
                        ) : isRed ? (
                          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-destructive/15 text-destructive whitespace-nowrap">
                            Low stock
                          </span>
                        ) : isOrange ? (
                          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-warning/15 text-warning whitespace-nowrap">
                            Reorder Soon
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-success/15 text-success whitespace-nowrap">
                            In stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => openEditModal(i)}
                            className="px-3 py-1.5 rounded-lg border text-sm hover:bg-muted flex items-center gap-1.5 touch-manipulation font-medium text-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(i)}
                            className="p-2 rounded-lg border text-muted-foreground hover:text-destructive hover:border-destructive/30 touch-manipulation"
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No items yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ConfirmDeleteModal
          open={deleteTarget !== null}
          title="Remove inventory item"
          detail={deleteTarget?.name}
          confirmLabel="Remove"
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            await withActionFeedback(
              async () => {
                removeIngredient(deleteTarget.id);
                await new Promise((r) => setTimeout(r, 300));
              },
              {
                loading: "Removing item…",
                success: "Item removed.",
                error: "Could not remove item.",
              },
            );
          }}
        />

        {typeof document !== "undefined" && createPortal(formModal, document.body)}
      </PageContainer>
    </PermissionGate>
  );
}
