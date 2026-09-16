import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePos, StockCategory, type Ingredient, getExpirationStatus } from "@/lib/pos-store";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import {
  AlertTriangle,
  Package,
  Plus,
  Trash2,
  Pencil,
  X,
  Clock,
  Search,
  RotateCcw,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  History,
  FileText,
  Boxes,
  CheckCircle2,
  Calendar,
  ArrowUpDown,
} from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";
import { PageContainer } from "@/components/layout/PageContainer";
import { withActionFeedbackSafe, withActionFeedback } from "@/lib/action-feedback";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryScreen,
});

const MAIN_MODULE_TABS = [
  { id: "items", label: "Ingredients & Stock", icon: Boxes },
  { id: "movements", label: "Stock Movement Audit", icon: History },
  { id: "reports", label: "Consumption Reports", icon: FileText },
] as const;

const STOCK_CATEGORY_TABS: StockCategory[] = ["Ingredient", "Furniture", "Utensil"];

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

const emptyForm = { name: "", stock: "", min: "", unit: "g", batchNo: "", manufacturedDate: "", status: "active" };

function InventoryScreen() {
  const { ingredients, updateIngredient, addIngredient, removeIngredient, restockIngredient, adjustIngredient, refreshIngredients } = usePos();

  const [activeModule, setActiveModule] = useState<"items" | "movements" | "reports">("items");
  const [tab, setTab] = useState<StockCategory>("Ingredient");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "archived">("all");
  const [sortBy, setSortBy] = useState<"mfg_desc" | "mfg_asc" | "exp_asc" | "name_asc">("mfg_desc");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

  // Restock Modal State
  const [restockTarget, setRestockTarget] = useState<Ingredient | null>(null);
  const [restockAmount, setRestockAmount] = useState("");
  const [restockNotes, setRestockNotes] = useState("");

  // Adjustment & Waste Modal State
  const [adjustTarget, setAdjustTarget] = useState<Ingredient | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<"MANUAL_ADJUSTMENT" | "WASTE" | "CORRECTION">("MANUAL_ADJUSTMENT");
  const [adjustNotes, setAdjustNotes] = useState("");

  // Movements Audit State
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementTypeFilter, setMovementTypeFilter] = useState("");

  // Reports State
  const [reportData, setReportData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });

  const loadMovements = async () => {
    setLoadingMovements(true);
    try {
      const { data } = await api.get("/inventory/movements", {
        params: { movementType: movementTypeFilter || undefined },
      });
      setMovements(Array.isArray(data) ? data : []);
    } catch {
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadReport = async () => {
    setLoadingReport(true);
    try {
      const { data } = await api.get("/inventory/reports", {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      });
      setReportData(Array.isArray(data) ? data : []);
    } catch {
      setReportData([]);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeModule === "movements") {
      loadMovements();
    } else if (activeModule === "reports") {
      loadReport();
    }
  }, [activeModule, movementTypeFilter, dateRange.startDate, dateRange.endDate]);

  const items = useMemo(() => {
    const filtered = ingredients.filter((i) => {
      if (i.category !== tab) return false;

      // Status filter
      if (stockFilter === "archived") {
        if (i.status !== "archived") return false;
      } else {
        if (i.status === "archived") return false;
        if (stockFilter === "low" && (i.stock > (i.min || 1) * 0.3 || i.stock <= 0)) return false;
        if (stockFilter === "out" && i.stock > 0) return false;
      }

      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        i.name.toLowerCase().includes(q) ||
        (i.batchNo || "").toLowerCase().includes(q) ||
        (i.manufacturedDate || "").toLowerCase().includes(q) ||
        (i.unit || "").toLowerCase().includes(q)
      );
    });

    // Sorting by manufactured date / year or expiration date
    return filtered.sort((a, b) => {
      if (sortBy === "mfg_desc") {
        const dA = a.manufacturedDate || "";
        const dB = b.manufacturedDate || "";
        if (dA && dB) return dB.localeCompare(dA);
        if (dA) return -1;
        if (dB) return 1;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "mfg_asc") {
        const dA = a.manufacturedDate || "";
        const dB = b.manufacturedDate || "";
        if (dA && dB) return dA.localeCompare(dB);
        if (dA) return -1;
        if (dB) return 1;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "exp_asc") {
        const dA = a.batchNo || "";
        const dB = b.batchNo || "";
        if (dA && dB) return dA.localeCompare(dB);
        if (dA) return -1;
        if (dB) return 1;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [ingredients, tab, search, stockFilter, sortBy]);

  const lowStockCount = ingredients.filter((i) => i.status !== "archived" && i.stock > 0 && i.stock <= (i.min || 1)).length;
  const outOfStockCount = ingredients.filter((i) => i.status !== "archived" && i.stock <= 0).length;

  const closeModal = () => {
    setModalOpen(false);
    setSaveConfirmOpen(false);
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
      manufacturedDate: item.manufacturedDate || "",
      status: item.status || "active",
    });
    setModalOpen(true);
  };

  const performSaveItem = async () => {
    await withActionFeedbackSafe(
      async () => {
        if (editingItem) {
          updateIngredient(editingItem.id, {
            name: form.name.trim(),
            stock: Number(form.stock) || 0,
            min: Number(form.min) || 0,
            unit: form.unit.trim() || "pcs",
            batchNo: form.batchNo.trim() ? form.batchNo.trim() : null,
            manufacturedDate: form.manufacturedDate.trim() ? form.manufacturedDate.trim() : null,
            status: (form.status as any) || "active",
          });
        } else {
          addIngredient({
            name: form.name.trim(),
            stock: Number(form.stock) || 0,
            min: Number(form.min) || 0,
            unit: form.unit.trim() || "pcs",
            category: tab,
            batchNo: form.batchNo.trim() ? form.batchNo.trim() : null,
            manufacturedDate: form.manufacturedDate.trim() ? form.manufacturedDate.trim() : null,
            status: "active",
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

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget || !restockAmount || Number(restockAmount) <= 0) {
      toast.error("Please enter a valid positive restock quantity.");
      return;
    }

    await withActionFeedbackSafe(
      async () => {
        await restockIngredient(restockTarget.id, Number(restockAmount), restockNotes.trim() || "Restock inventory");
        setRestockTarget(null);
        setRestockAmount("");
        setRestockNotes("");
      },
      {
        loading: "Adding restock quantity…",
        success: `Restocked ${restockTarget.name}!`,
        error: "Restock operation failed.",
      },
    );
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget || !adjustQty || Number(adjustQty) === 0) {
      toast.error("Please enter a non-zero adjustment quantity.");
      return;
    }
    if (!adjustNotes.trim()) {
      toast.error("Reason notes are required for manual inventory adjustments and waste.");
      return;
    }

    await withActionFeedbackSafe(
      async () => {
        await adjustIngredient(adjustTarget.id, Number(adjustQty), adjustType, adjustNotes.trim());
        setAdjustTarget(null);
        setAdjustQty("");
        setAdjustNotes("");
      },
      {
        loading: "Recording inventory adjustment…",
        success: `Inventory adjustment saved for ${adjustTarget.name}!`,
        error: "Adjustment operation failed.",
      },
    );
  };

  return (
    <PermissionGate path="/inventory">
      <PageContainer wide>
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-responsive-3xl">Inventory & Ingredient Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Recipe ingredients, hardware supplies, manufactured date ordering & consumption analytics
            </p>
          </div>

          {/* Quick Summary Widgets */}
          <div className="flex items-center gap-3">
            {lowStockCount > 0 && (
              <span className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {lowStockCount} Low Stock
              </span>
            )}
            {outOfStockCount > 0 && (
              <span className="px-3 py-1.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-semibold inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {outOfStockCount} Out of Stock
              </span>
            )}
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex border-b border-border mb-6">
          {MAIN_MODULE_TABS.map((m) => {
            const Icon = m.icon;
            const active = activeModule === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveModule(m.id as any)}
                className={`px-4 sm:px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 border-b-2 transition-all ${
                  active
                    ? "border-accent text-accent bg-accent/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" /> {m.label}
              </button>
            );
          })}
        </div>

        {/* MODULE 1: INGREDIENTS LIST & MANAGEMENT */}
        {activeModule === "items" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category selector */}
              <div className="flex flex-wrap gap-2">
                {STOCK_CATEGORY_TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-semibold transition ${
                      tab === t ? "bg-primary text-primary-foreground shadow" : "bg-card border hover:bg-muted"
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>

              {/* Add item button */}
              <button
                type="button"
                onClick={openAddModal}
                className="btn-primary text-xs min-h-[40px] px-4 self-start sm:self-auto inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Add {tab.toLowerCase()}
              </button>
            </div>

            {/* Filter, Search & Date Sorting Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by ingredient name, batch number, manufactured year/date..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-sm"
                />
              </div>

              <div>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm font-medium"
                >
                  <option value="all">All Stock Statuses</option>
                  <option value="low">Low Stock Only</option>
                  <option value="out">Out of Stock Only</option>
                  <option value="archived">Archived Items</option>
                </select>
              </div>

              {/* Date & Year Sorting */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm font-semibold border-accent/40 text-accent"
                >
                  <option value="mfg_desc">Mfg Date: Newest Year First</option>
                  <option value="mfg_asc">Mfg Date: Oldest Year First</option>
                  <option value="exp_asc">Exp Date: Earliest Expiring</option>
                  <option value="name_asc">Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="glass-card rounded-2xl border overflow-hidden">
              <div className="table-scroll">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3">{tab}</th>
                      {tab === "Ingredient" && <th className="px-5 py-3">Manufactured Date</th>}
                      <th className="px-5 py-3">Current Stock</th>
                      <th className="px-5 py-3">Low Threshold</th>
                      <th className="px-5 py-3">Unit</th>
                      {tab === "Ingredient" && <th className="px-5 py-3">Expiration Date</th>}
                      <th className="px-5 py-3">Stock Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((i) => {
                      const isLow = i.stock > 0 && i.stock <= (i.min || 1);
                      const isOut = i.stock <= 0;
                      return (
                        <tr key={i.id} className="hover:bg-muted/40 transition">
                          <td className="px-5 py-3.5 font-medium">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">{i.name}</div>
                                {i.status === "archived" && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Archived</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {tab === "Ingredient" && (
                            <td className="px-5 py-3.5 text-xs font-mono">
                              {i.manufacturedDate ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-semibold border border-accent/20">
                                  <Calendar className="w-3 h-3" /> {i.manufacturedDate}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          )}

                          <td className="px-5 py-3.5 font-mono font-bold text-foreground">{i.stock}</td>
                          <td className="px-5 py-3.5 font-mono text-muted-foreground">{i.min || 0}</td>
                          <td className="px-5 py-3.5 font-medium text-muted-foreground">{i.unit}</td>
                          {tab === "Ingredient" && (
                            <td className="px-5 py-3.5 text-xs font-mono">
                              {(() => {
                                const exp = getExpirationStatus(i.batchNo);
                                if (!exp) return i.batchNo || "—";
                                if (exp.type === "expired") {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-destructive/15 text-destructive font-semibold">
                                      <AlertTriangle className="w-3 h-3" /> {i.batchNo}
                                    </span>
                                  );
                                }
                                return i.batchNo;
                              })()}
                            </td>
                          )}
                          <td className="px-5 py-3.5">
                            {isOut ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-destructive text-destructive-foreground">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                Available
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setRestockTarget(i);
                                  setRestockAmount("");
                                  setRestockNotes("");
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium inline-flex items-center gap-1"
                                title="Add Restock Stock"
                              >
                                <Plus className="w-3.5 h-3.5" /> Restock
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAdjustTarget(i);
                                  setAdjustQty("");
                                  setAdjustType("MANUAL_ADJUSTMENT");
                                  setAdjustNotes("");
                                }}
                                className="px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted inline-flex items-center gap-1"
                                title="Adjust / Waste"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Adjust
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(i)}
                                className="p-1.5 rounded-lg border text-muted-foreground hover:text-foreground"
                                title="Edit Item"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(i)}
                                className="p-1.5 rounded-lg border text-muted-foreground hover:text-destructive"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                          No ingredients found matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 2: STOCK MOVEMENT AUDIT TRAIL */}
        {activeModule === "movements" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-accent" />
                <span className="font-semibold text-sm">Inventory Movement History Audit</span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={movementTypeFilter}
                  onChange={(e) => setMovementTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border bg-background text-xs font-medium"
                >
                  <option value="">All Movement Types</option>
                  <option value="RESTOCK">RESTOCK (+)</option>
                  <option value="SALE_DEDUCTION">SALE DEDUCTION (-)</option>
                  <option value="MANUAL_ADJUSTMENT">MANUAL ADJUSTMENT</option>
                  <option value="WASTE">WASTE (-)</option>
                  <option value="RETURN">RETURN / REVERSAL (+)</option>
                </select>
                <button
                  type="button"
                  onClick={loadMovements}
                  className="px-3.5 py-2 rounded-xl border bg-muted hover:bg-card text-xs font-medium"
                >
                  Refresh Audit
                </button>
              </div>
            </div>

            {loadingMovements ? (
              <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">Loading movement audit log…</div>
            ) : (
              <div className="glass-card rounded-2xl border overflow-hidden">
                <div className="table-scroll">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3">Date & Time</th>
                        <th className="px-5 py-3">Ingredient</th>
                        <th className="px-5 py-3">Movement Type</th>
                        <th className="px-5 py-3">Quantity</th>
                        <th className="px-5 py-3">Prev <ArrowUpRight className="w-3 h-3 inline" /> New</th>
                        <th className="px-5 py-3">Performed By</th>
                        <th className="px-5 py-3">Notes / Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {movements.map((m) => {
                        const isPlus = Number(m.quantity) > 0;
                        return (
                          <tr key={m.id} className="hover:bg-muted/40 transition">
                            <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                              {new Date(m.createdAt).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 font-semibold text-foreground">{m.ingredientName}</td>
                            <td className="px-5 py-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  m.movementType === "RESTOCK"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : m.movementType === "SALE_DEDUCTION"
                                    ? "bg-accent/15 text-accent"
                                    : m.movementType === "WASTE"
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {m.movementType}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-mono font-bold">
                              <span className={isPlus ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                                {isPlus ? `+${m.quantity}` : m.quantity} {m.ingredientUnit}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                              {m.previousStock} <span className="text-foreground font-semibold">→ {m.newStock}</span>
                            </td>
                            <td className="px-5 py-3 text-xs font-medium">{m.userName}</td>
                            <td className="px-5 py-3 text-xs text-muted-foreground max-w-xs truncate">
                              {m.notes || (m.orderId ? `Order #${m.orderId}` : "—")}
                            </td>
                          </tr>
                        );
                      })}
                      {movements.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                            No stock movement records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODULE 3: CONSUMPTION REPORTS */}
        {activeModule === "reports" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <span className="font-semibold text-sm">Ingredient Consumption & Usage Report</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange((d) => ({ ...d, startDate: e.target.value }))}
                    className="px-2.5 py-1.5 rounded-lg border bg-background text-xs font-mono"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange((d) => ({ ...d, endDate: e.target.value }))}
                    className="px-2.5 py-1.5 rounded-lg border bg-background text-xs font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadReport}
                  className="px-3.5 py-1.5 rounded-xl border bg-accent/10 text-accent hover:bg-accent/20 text-xs font-medium"
                >
                  Generate
                </button>
              </div>
            </div>

            {loadingReport ? (
              <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">Calculating consumption metrics…</div>
            ) : (
              <div className="glass-card rounded-2xl border overflow-hidden">
                <div className="table-scroll">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3">Ingredient</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Beginning Stock</th>
                        <th className="px-5 py-3">Restocked (+)</th>
                        <th className="px-5 py-3">Used in Sales (-)</th>
                        <th className="px-5 py-3">Waste / Adjust (+/-)</th>
                        <th className="px-5 py-3">Ending Stock</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.map((r) => (
                        <tr key={r.ingredientId} className="hover:bg-muted/40 transition">
                          <td className="px-5 py-3.5 font-semibold text-foreground">{r.name}</td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">{r.category}</td>
                          <td className="px-5 py-3.5 font-mono text-muted-foreground">{r.beginningStock.toFixed(1)} {r.unit}</td>
                          <td className="px-5 py-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            +{r.restocked} {r.unit}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-accent font-bold">
                            -{r.salesUsed} {r.unit}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-amber-600 dark:text-amber-400">
                            {r.wasteAdjustments} {r.unit}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-foreground">{r.currentStock} {r.unit}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                r.status === "Out of Stock"
                                  ? "bg-destructive text-destructive-foreground"
                                  : r.status === "Low Stock"
                                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {reportData.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                            No report data available for selected date range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESTOCK MODAL DIALOG */}
        {typeof document !== "undefined" &&
          createPortal(
            restockTarget ? (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop animate-fade-in"
                onClick={() => setRestockTarget(null)}
                role="dialog"
                aria-modal="true"
              >
                <form
                  onSubmit={handleRestockSubmit}
                  className="modal-panel relative w-full max-w-md rounded-2xl border p-6 bg-card shadow-2xl space-y-4 animate-scale-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-display text-lg flex items-center gap-2">
                      <Plus className="w-5 h-5 text-accent" /> Restock {restockTarget.name}
                    </h3>
                    <button type="button" onClick={() => setRestockTarget(null)} className="p-1 rounded hover:bg-muted">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl border bg-muted/40 flex justify-between text-xs font-medium">
                      <span>Current Stock:</span>
                      <span className="font-bold text-foreground">{restockTarget.stock} {restockTarget.unit}</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Add Stock Quantity * ({restockTarget.unit})</label>
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        value={restockAmount}
                        onChange={(e) => setRestockAmount(e.target.value)}
                        placeholder="Enter restock amount"
                        className="mt-1 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm font-semibold"
                        required
                        autoFocus
                      />
                    </div>

                    {restockAmount && Number(restockAmount) > 0 && (
                      <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex justify-between">
                        <span>New Stock after Restock:</span>
                        <span className="font-bold">
                          {(Number(restockTarget.stock) + Number(restockAmount)).toFixed(2)} {restockTarget.unit}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Restock Notes / Supplier Reference</label>
                      <input
                        type="text"
                        value={restockNotes}
                        onChange={(e) => setRestockNotes(e.target.value)}
                        placeholder="e.g. Received from Supplier PO #104"
                        className="mt-1 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setRestockTarget(null)}
                      className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary px-5 py-2.5 text-sm">
                      Confirm Restock
                    </button>
                  </div>
                </form>
              </div>
            ) : null,
            document.body,
          )}

        {/* MANUAL ADJUSTMENT & WASTE MODAL DIALOG */}
        {typeof document !== "undefined" &&
          createPortal(
            adjustTarget ? (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop animate-fade-in"
                onClick={() => setAdjustTarget(null)}
                role="dialog"
                aria-modal="true"
              >
                <form
                  onSubmit={handleAdjustSubmit}
                  className="modal-panel relative w-full max-w-md rounded-2xl border p-6 bg-card shadow-2xl space-y-4 animate-scale-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-display text-lg flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-accent" /> Adjust Stock: {adjustTarget.name}
                    </h3>
                    <button type="button" onClick={() => setAdjustTarget(null)} className="p-1 rounded hover:bg-muted">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl border bg-muted/40 flex justify-between text-xs font-medium">
                      <span>Current Stock:</span>
                      <span className="font-bold text-foreground">{adjustTarget.stock} {adjustTarget.unit}</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Adjustment Type *</label>
                      <select
                        value={adjustType}
                        onChange={(e) => setAdjustType(e.target.value as any)}
                        className="mt-1 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm font-medium"
                      >
                        <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                        <option value="WASTE">Waste / Spoilage / Damage (-)</option>
                        <option value="CORRECTION">Inventory Count Correction</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Quantity Change ({adjustTarget.unit}) * (Negative for reduction e.g. -50)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={adjustQty}
                        onChange={(e) => setAdjustQty(e.target.value)}
                        placeholder="-50 or 50"
                        className="mt-1 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm font-semibold"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Reason / Audit Notes * (Required)</label>
                      <input
                        type="text"
                        value={adjustNotes}
                        onChange={(e) => setAdjustNotes(e.target.value)}
                        placeholder="Reason e.g. Spilled milk during rush"
                        className="mt-1 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setAdjustTarget(null)}
                      className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary px-5 py-2.5 text-sm">
                      Save Adjustment
                    </button>
                  </div>
                </form>
              </div>
            ) : null,
            document.body,
          )}

        {/* ADD / EDIT ITEM MODAL */}
        <ConfirmActionModal
          open={saveConfirmOpen}
          title={editingItem ? `Save ${tab}` : `Add ${tab}`}
          message={
            editingItem
              ? `Are you sure you want to save changes to "${form.name}"?`
              : `Are you sure you want to add "${form.name}" to inventory?`
          }
          detail={`Stock: ${form.stock} ${form.unit}${form.manufacturedDate ? ` · Mfg Date: ${form.manufacturedDate}` : ""}`}
          confirmLabel={editingItem ? "Save Item" : "Add Item"}
          variant="primary"
          onClose={() => setSaveConfirmOpen(false)}
          onConfirm={performSaveItem}
        />

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

        {typeof document !== "undefined" &&
          createPortal(
            modalOpen ? (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop animate-fade-in"
                onClick={closeModal}
              >
                <form
                  className="modal-panel relative w-full max-w-lg rounded-2xl border p-6 bg-card shadow-2xl space-y-4 animate-scale-in"
                  onClick={(e) => e.stopPropagation()}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!form.name.trim()) return;
                    setSaveConfirmOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <h2 className="font-display text-xl flex items-center gap-2">
                      {editingItem ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {editingItem ? `Edit ${tab.toLowerCase()}` : `Add ${tab.toLowerCase()}`}
                    </h2>
                    <button type="button" onClick={closeModal} className="p-2 rounded-lg hover:bg-muted">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Name *</label>
                      <input
                        placeholder="Item name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Initial Stock *</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="0"
                          value={form.stock}
                          onChange={(e) => setForm({ ...form, stock: e.target.value })}
                          className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm font-semibold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Low Stock Threshold (Min)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="0"
                          value={form.min}
                          onChange={(e) => setForm({ ...form, min: e.target.value })}
                          className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm font-semibold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Unit *</label>
                        <select
                          value={form.unit}
                          onChange={(e) => setForm({ ...form, unit: e.target.value })}
                          className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {editingItem && (
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Status</label>
                          <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm font-semibold"
                          >
                            <option value="active">Active</option>
                            <option value="archived">Archived / Deactivated</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {tab === "Ingredient" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Manufactured Date</label>
                          <input
                            type="date"
                            value={form.manufacturedDate}
                            onChange={(e) => setForm({ ...form, manufacturedDate: e.target.value })}
                            className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Expiration Date</label>
                          <input
                            type="date"
                            value={form.batchNo}
                            onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                            className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border bg-card text-sm font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 border-t pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted">
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary px-5 py-2.5 text-sm">
                      {editingItem ? "Save changes" : "Add item"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null,
            document.body,
          )}
      </PageContainer>
    </PermissionGate>
  );
}
