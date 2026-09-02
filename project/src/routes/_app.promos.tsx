import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Tag,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  History,
  Calendar,
  AlertCircle,
  Filter,
  Users,
  Percent,
  Banknote,
  X,
  HelpCircle,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PermissionGate } from "@/components/PermissionGate";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { withActionFeedback, withActionFeedbackSafe } from "@/lib/action-feedback";
import { cn } from "@/lib/utils";
import { fmt, formatOrderNumber } from "@/lib/pos-store";
import {
  fetchPromos,
  fetchPromoHistory,
  fetchPromoStats,
  createPromo,
  updatePromo,
  deletePromo,
  getPromoExpirationStatus,
  type Promo,
  type PromoHistory as IPromoHistory,
  type PromoStats,
} from "@/lib/promo-api";

export const Route = createFileRoute("/_app/promos")({
  component: PromosScreen,
});

const ELIGIBLE_OPTIONS = [
  "Everyone",
  "Father/Mother",
  "Students",
];

function calculateCountdown(startDateStr: string): string {
  const start = new Date(startDateStr).getTime();
  const now = new Date().getTime();
  const diffMs = start - now;

  if (diffMs <= 0) return "Starting soon";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;

  if (days > 0) return `Starts in ${days}d ${hours}h`;
  return `Starts in ${hours}h`;
}

function PromosScreen() {
  const [activeTab, setActiveTab] = useState<"list" | "history">("list");
  const [promos, setPromos] = useState<Promo[]>([]);
  const [historyList, setHistoryList] = useState<IPromoHistory[]>([]);
  const [stats, setStats] = useState<PromoStats>({
    totalPromos: 0,
    activePromos: 0,
    expiredPromos: 0,
    usageToday: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters & Search for List
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"name" | "startDate" | "endDate">("startDate");

  // Filters for History
  const [historySearch, setHistorySearch] = useState("");
  const [historyActionFilter, setHistoryActionFilter] = useState<string>("All");

  // Modals
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewingPromo, setViewingPromo] = useState<Promo | null>(null);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<Promo | null>(null);

  // Form State
  const [form, setForm] = useState({
    promo_name: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "20",
    eligible_customer: "Everyone",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    start_time: "08:00",
    end_time: "22:00",
    status: "Active" as Promo["status"],
  });
  const [formError, setFormError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, hData, sData] = await Promise.all([
        fetchPromos(),
        fetchPromoHistory(),
        fetchPromoStats(),
      ]);
      setPromos(pData);
      setHistoryList(hData);
      setStats(sData);
    } catch {
      /* feedback shown */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingPromo(null);
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    setForm({
      promo_name: "",
      description: "",
      discount_type: "percentage",
      discount_value: "20",
      eligible_customer: "Everyone",
      start_date: today,
      end_date: nextWeek,
      start_time: "08:00",
      end_time: "22:00",
      status: "Active",
    });
    setFormError("");
    setEditorOpen(true);
  };

  const openEditModal = (p: Promo) => {
    setEditingPromo(p);
    setForm({
      promo_name: p.promo_name,
      description: p.description || "",
      discount_type: p.discount_type,
      discount_value: String(p.discount_value),
      eligible_customer: p.eligible_customer,
      start_date: p.start_date.split("T")[0],
      end_date: p.end_date.split("T")[0],
      start_time: p.start_time ? p.start_time.slice(0, 5) : "",
      end_time: p.end_time ? p.end_time.slice(0, 5) : "",
      status: p.status,
    });
    setFormError("");
    setEditorOpen(true);
  };

  const savePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.promo_name.trim()) {
      setFormError("Promo name is required.");
      return;
    }
    const val = Number(form.discount_value);
    if (!val || val <= 0) {
      setFormError("Discount value must be greater than zero.");
      return;
    }
    if (form.discount_type === "percentage" && val > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }
    if (!form.start_date || !form.end_date) {
      setFormError("Start date and End date are required.");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setFormError("End date cannot be before the start date.");
      return;
    }

    try {
      if (editingPromo) {
        await withActionFeedback(
          () =>
            updatePromo(editingPromo.id, {
              promo_name: form.promo_name.trim(),
              description: form.description,
              discount_type: form.discount_type,
              discount_value: val,
              eligible_customer: form.eligible_customer,
              start_date: form.start_date,
              end_date: form.end_date,
              start_time: form.start_time || null,
              end_time: form.end_time || null,
              status: form.status,
            }),
          {
            loading: "Updating promo…",
            success: "Promo updated successfully!",
            error: "Failed to update promo.",
          },
        );
      } else {
        await withActionFeedback(
          () =>
            createPromo({
              promo_name: form.promo_name.trim(),
              description: form.description,
              discount_type: form.discount_type,
              discount_value: val,
              eligible_customer: form.eligible_customer,
              start_date: form.start_date,
              end_date: form.end_date,
              start_time: form.start_time || null,
              end_time: form.end_time || null,
              status: form.status,
            }),
          {
            loading: "Creating promo…",
            success: "Promo created successfully!",
            error: "Failed to create promo.",
          },
        );
      }
      setEditorOpen(false);
      await loadData();
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message || err?.message || "Failed to save promo.";
      setFormError(serverMessage);
    }
  };

  const confirmDelete = async () => {
    if (!deletingPromo) return;
    await withActionFeedbackSafe(
      async () => {
        await deletePromo(deletingPromo.id);
        setDeletingPromo(null);
        await loadData();
      },
      {
        loading: "Deleting promo…",
        success: "Promo deleted.",
        error: "Could not delete promo.",
      },
    );
  };

  // Filtered List
  const filteredPromos = useMemo(() => {
    return promos
      .filter((p) => {
        const matchesSearch =
          p.promo_name.toLowerCase().includes(search.toLowerCase()) ||
          p.eligible_customer.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
          statusFilter === "All" ||
          p.status === statusFilter ||
          (statusFilter === "Disabled" && p.status === "Inactive");
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.promo_name.localeCompare(b.promo_name);
        if (sortBy === "startDate") return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
      });
  }, [promos, search, statusFilter, sortBy]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyList.filter((h) => {
      const matchesSearch =
        h.promo_name.toLowerCase().includes(historySearch.toLowerCase()) ||
        h.performed_by_name.toLowerCase().includes(historySearch.toLowerCase());
      const matchesAction =
        historyActionFilter === "All" || h.action.toLowerCase().includes(historyActionFilter.toLowerCase());
      return matchesSearch && matchesAction;
    });
  }, [historyList, historySearch, historyActionFilter]);

  return (
    <PermissionGate path="/promos">
      <PageContainer wide className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-responsive-3xl flex items-center gap-2">
              <Tag className="w-8 h-8 text-accent" /> Promo Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create, schedule, and manage promotional discounts and customer offers.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="btn-primary flex items-center justify-center gap-2 px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" /> Create Promo
          </button>
        </div>

        {/* Dashboard Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Tag className="w-6 h-6 text-caramel" />}
            label="Total Promos"
            value={stats.totalPromos}
            bgColor="bg-amber-500/10"
          />
          <StatCard
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
            label="Active Promos"
            value={stats.activePromos}
            bgColor="bg-emerald-500/10"
          />
          <StatCard
            icon={<AlertCircle className="w-6 h-6 text-rose-600" />}
            label="Expired Promos"
            value={stats.expiredPromos}
            bgColor="bg-rose-500/10"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6 text-espresso" />}
            label="Promo Usage Today"
            value={stats.usageToday}
            bgColor="bg-primary/10"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={cn(
              "px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
              activeTab === "list"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Tag className="w-4 h-4" /> Promos List ({promos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
              activeTab === "history"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <History className="w-4 h-4" /> Promo History ({historyList.length})
          </button>
        </div>

        {/* Tab 1: Promos List */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between border">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search promo name or customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Status:
                </span>
                {["All", "Active", "Scheduled", "Expired", "Disabled"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      statusFilter === st
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="glass-card rounded-2xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="p-4">Promo Name</th>
                      <th className="p-4">Discount</th>
                      <th className="p-4">Eligible Customer</th>
                      <th className="p-4">Validity Period</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Created By</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Loading promos…
                        </td>
                      </tr>
                    ) : filteredPromos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No promotions found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredPromos.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-foreground">{p.promo_name}</div>
                            {p.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {p.description}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-md">
                              {p.discount_type === "percentage"
                                ? `${p.discount_value}% OFF`
                                : `₱${Number(p.discount_value).toFixed(2)} OFF`}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary font-medium">
                              <Users className="w-3 h-3" /> {p.eligible_customer}
                            </span>
                          </td>
                          <td className="p-4 text-xs">
                            <div className="font-medium text-foreground">
                              {new Date(p.start_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              –{" "}
                              {new Date(p.end_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                            {p.status === "Scheduled" && (
                              <span className="text-amber-600 font-medium inline-block mt-0.5">
                                {calculateCountdown(p.start_date)}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col items-start gap-1">
                              <StatusBadge status={p.status} />
                              {(() => {
                                const exp = getPromoExpirationStatus(p.end_date);
                                if (exp?.type === "expiring" && p.status !== "Expired") {
                                  return (
                                    <span className="text-[11px] font-semibold text-warning bg-warning/15 border border-warning/30 px-2 py-0.5 rounded-md inline-block">
                                      ⏰ {exp.label}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground font-medium">
                            {p.created_by_name || "Admin"}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="View details"
                                onClick={() => setViewingPromo(p)}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title="Edit promo"
                                onClick={() => openEditModal(p)}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-accent"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title="Delete promo"
                                onClick={() => setDeletingPromo(p)}
                                className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Promo History */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between border">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search history by promo or user..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Action Filter:</span>
                <select
                  value={historyActionFilter}
                  onChange={(e) => setHistoryActionFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border bg-background text-sm"
                >
                  <option value="All">All Actions</option>
                  <option value="Created">Created</option>
                  <option value="Updated">Updated</option>
                  <option value="Deleted">Deleted</option>
                  <option value="Activated">Activated</option>
                  <option value="Deactivated">Deactivated</option>
                  <option value="Used">Used in POS</option>
                </select>
              </div>
            </div>

            <div className="glass-card rounded-2xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Promo Name</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Performed By</th>
                      <th className="p-4">Order Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No promo history recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4 text-xs font-medium text-muted-foreground">
                            {new Date(h.created_at).toLocaleString("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="p-4 font-medium text-foreground">{h.promo_name}</td>
                          <td className="p-4">
                            <ActionBadge action={h.action} />
                          </td>
                          <td className="p-4 text-xs font-medium">{h.performed_by_name || "System"}</td>
                          <td className="p-4 text-xs font-mono">
                            {h.order_number ? (
                              <span className="text-accent font-semibold">OR #{formatOrderNumber(h.order_number, h.created_at)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal 1: Create/Edit Promo */}
        {editorOpen && typeof document !== "undefined" && createPortal(
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
            <div className="modal-panel relative w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="font-display text-xl flex items-center gap-2">
                  <Tag className="w-5 h-5 text-accent" />
                  {editingPromo ? "Edit Promo" : "Create New Promo"}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-sm font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={savePromo} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Promo Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Happy Father's Day"
                    value={form.promo_name}
                    onChange={(e) => setForm({ ...form, promo_name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief details about the promo discount..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Discount Type
                    </label>
                    <div className="flex rounded-lg border overflow-hidden p-1 bg-muted/40">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, discount_type: "percentage" })}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 transition-all",
                          form.discount_type === "percentage"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground",
                        )}
                      >
                        <Percent className="w-3.5 h-3.5" /> Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, discount_type: "fixed" })}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 transition-all",
                          form.discount_type === "fixed"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground",
                        )}
                      >
                        <Banknote className="w-3.5 h-3.5" /> Fixed (₱)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      max={form.discount_type === "percentage" ? "100" : undefined}
                      required
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                      placeholder={form.discount_type === "percentage" ? "20" : "100"}
                      className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Eligible Customer
                  </label>
                  <select
                    value={form.eligible_customer}
                    onChange={(e) => setForm({ ...form, eligible_customer: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                  >
                    {ELIGIBLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Start Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      End Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Inactive">Inactive / Disabled</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="px-4 py-2.5 rounded-lg border text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary px-5 py-2.5 text-sm font-medium">
                    {editingPromo ? "Save Changes" : "Create Promo"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

        {/* Modal 2: View Promo Details */}
        {viewingPromo && typeof document !== "undefined" && createPortal(
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
            <div className="modal-panel relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-4 animate-scale-in">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-accent" />
                  <h2 className="font-display text-xl">{viewingPromo.promo_name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingPromo(null)}
                  className="p-1 rounded-lg hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Discount Value</span>
                  <span className="text-xl font-bold text-accent">
                    {viewingPromo.discount_type === "percentage"
                      ? `${viewingPromo.discount_value}% OFF`
                      : `₱${Number(viewingPromo.discount_value).toFixed(2)} OFF`}
                  </span>
                </div>

                {viewingPromo.description && (
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Description</span>
                    <p className="mt-0.5 text-foreground">{viewingPromo.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Eligible Customer</span>
                    <span className="font-medium text-foreground">{viewingPromo.eligible_customer}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Current Status</span>
                    <StatusBadge status={viewingPromo.status} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Start Date</span>
                    <span className="font-medium">{viewingPromo.start_date.split("T")[0]}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">End Date</span>
                    <span className="font-medium">{viewingPromo.end_date.split("T")[0]}</span>
                  </div>
                </div>

                <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground">
                  <span>Created By: {viewingPromo.created_by_name || "Admin"}</span>
                  <span>Times Used: {viewingPromo.usage_count ?? 0}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    const p = viewingPromo;
                    setViewingPromo(null);
                    openEditModal(p);
                  }}
                  className="btn-primary px-4 py-2 rounded-lg text-xs"
                >
                  Edit Promo
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPromo(null)}
                  className="px-4 py-2 rounded-lg border text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

        {/* Modal 3: Confirm Delete Modal */}
        <ConfirmDeleteModal
          open={!!deletingPromo}
          title="Delete Promo"
          message={`Are you sure you want to delete "${deletingPromo?.promo_name}"?`}
          detail="This action cannot be undone and will record a deletion entry in Promo History and Audit Logs."
          confirmLabel="Delete Promo"
          onClose={() => setDeletingPromo(null)}
          onConfirm={confirmDelete}
        />
      </PageContainer>
    </PermissionGate>
  );
}

function StatCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgColor: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 border flex items-center gap-3">
      <div className={cn("p-3 rounded-xl flex items-center justify-center shrink-0", bgColor)}>
        {icon}
      </div>
      <div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
        <div className="font-display text-2xl font-bold text-foreground mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Promo["status"] }) {
  let colorClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  let label = status;

  if (status === "Expired") {
    colorClass = "bg-rose-500/10 text-rose-600 border-rose-500/20";
  } else if (status === "Scheduled") {
    colorClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";
  } else if (status === "Inactive" || status === "Disabled") {
    colorClass = "bg-slate-500/10 text-slate-600 border-slate-500/20";
  }

  return (
    <span
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1",
        colorClass,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  let colorClass = "bg-blue-500/10 text-blue-600";
  if (action.includes("Created")) colorClass = "bg-emerald-500/10 text-emerald-600";
  if (action.includes("Updated")) colorClass = "bg-amber-500/10 text-amber-600";
  if (action.includes("Deleted")) colorClass = "bg-rose-500/10 text-rose-600";
  if (action.includes("Used")) colorClass = "bg-purple-500/10 text-purple-600 font-semibold";

  return (
    <span className={cn("px-2.5 py-0.5 rounded-md text-xs font-medium", colorClass)}>
      {action}
    </span>
  );
}
