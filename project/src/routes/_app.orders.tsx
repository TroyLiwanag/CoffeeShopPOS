import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createPortal } from "react-dom";
import { usePos, fmt, formatOrderNumber, type Order } from "@/lib/pos-store";
import { PageContainer } from "@/components/layout/PageContainer";
import { Receipt, RotateCcw, Search, Filter, AlertTriangle, X, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { withActionFeedback } from "@/lib/action-feedback";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/orders")({
  component: OrdersScreen,
});

const REFUND_REASONS = [
  "Customer Requested Refund",
  "Wrong Items Selected by Cashier",
  "Defective / Quality Issue",
  "Duplicate Payment Entry",
  "Payment Gateway Failed",
  "Item Out of Stock / Damaged",
  "Other / Manager Request",
];

function OrdersScreen() {
  const { orders, refundOrder, voidOrder, user } = usePos();
  const handleRefund = refundOrder || voidOrder;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "refunded">("all");
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  const [selectedReason, setSelectedReason] = useState(REFUND_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const canRefund = user?.role === "admin" || Boolean(user?.permissions?.canManageOrders);

  const filteredOrders = orders.filter((o) => {
    const isRefunded = o.orderStatus === "refunded" || o.orderStatus === "voided" || o.orderStatus === "cancelled";
    if (statusFilter === "completed" && isRefunded) return false;
    if (statusFilter === "refunded" && !isRefunded) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const orNo = formatOrderNumber(o.number, o.createdAt).toLowerCase();
      const customer = (o.customerName || "").toLowerCase();
      const cashier = (o.cashier || "").toLowerCase();
      const method = (o.method || "").toLowerCase();
      const itemsStr = o.items.map((i) => i.product.name.toLowerCase()).join(" ");
      return (
        orNo.includes(q) ||
        String(o.number).includes(q) ||
        customer.includes(q) ||
        cashier.includes(q) ||
        method.includes(q) ||
        itemsStr.includes(q)
      );
    }
    return true;
  });

  const handleConfirmRefund = async () => {
    if (!refundTarget) return;
    const finalReason = selectedReason === "Other / Manager Request"
      ? (customReason.trim() || "Other / Manager Request")
      : selectedReason;

    if (!finalReason) {
      toast.error("Please enter or select a valid reason for refunding this order.");
      return;
    }

    setRefunding(true);
    try {
      await withActionFeedback(
        () => handleRefund(refundTarget.id, finalReason),
        {
          loading: "Refunding order...",
          success: `Order #${formatOrderNumber(refundTarget.number, refundTarget.createdAt)} refunded!`,
          error: "Failed to refund order.",
        },
      );
      setRefundTarget(null);
      setCustomReason("");
    } catch {
      /* toast shown */
    } finally {
      setRefunding(false);
    }
  };

  return (
    <PageContainer wide className="pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="w-7 h-7 text-accent shrink-0" />
          <div>
            <h1 className="font-display text-responsive-3xl">Orders History</h1>
            <p className="text-sm text-muted-foreground">
              {orders.length} total orders recorded · Refunded orders are excluded from sales totals
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter controls */}
      <div className="bg-card rounded-2xl border p-4 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order #, Customer, Cashier, or Product..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 rounded-xl border bg-background text-sm font-medium"
            >
              <option value="all">All Orders ({orders.length})</option>
              <option value="completed">
                Completed ({orders.filter((o) => o.orderStatus !== "refunded" && o.orderStatus !== "voided" && o.orderStatus !== "cancelled").length})
              </option>
              <option value="refunded">
                Refunded / Cancelled ({orders.filter((o) => o.orderStatus === "refunded" || o.orderStatus === "voided" || o.orderStatus === "cancelled").length})
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-card rounded-2xl border p-12 text-center text-muted-foreground space-y-2">
          <Receipt className="w-10 h-10 mx-auto opacity-30" />
          <p className="font-medium text-base">No orders match your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((o) => {
            const isRefunded = o.orderStatus === "refunded" || o.orderStatus === "voided" || o.orderStatus === "cancelled";
            const orNo = formatOrderNumber(o.number, o.createdAt);

            return (
              <div
                key={o.id}
                className={cn(
                  "bg-card rounded-2xl border p-4 sm:p-5 transition-all shadow-xs space-y-3",
                  isRefunded ? "border-destructive/30 bg-destructive/5" : "hover:border-accent/40",
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Link
                        to="/receipt/$id"
                        params={{ id: o.id }}
                        className="font-display text-lg font-bold hover:text-accent underline decoration-accent/30"
                      >
                        Order #{orNo}
                      </Link>
                      {isRefunded ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive text-destructive-foreground flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" /> {o.orderStatus === "voided" ? "VOIDED" : "REFUNDED"}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> COMPLETED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(o.createdAt).toLocaleString()} · Cashier: <strong className="text-foreground">{o.cashier}</strong> · Method: <strong className="text-foreground">{o.method}</strong>
                      {o.customerName ? ` · Customer: ${o.customerName}` : ""}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                    <div className={cn("font-display text-xl font-bold", isRefunded ? "line-through text-muted-foreground" : "text-primary")}>
                      {fmt(o.total)}
                    </div>
                    {!isRefunded && canRefund && (
                      <button
                        type="button"
                        onClick={() => {
                          setRefundTarget(o);
                          setSelectedReason(REFUND_REASONS[0]);
                          setCustomReason("");
                        }}
                        className="px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-semibold hover:bg-destructive/10 transition-colors flex items-center gap-1.5 active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Refund Order
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Summary Breakdown */}
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  {o.items.map((i) => (
                    <span key={i.id} className="bg-muted/50 px-2 py-1 rounded-md border font-medium text-foreground">
                      {i.qty}× {i.product.name}
                      {i.addons && i.addons.length > 0 ? ` (+${i.addons.join(", ")})` : ""}
                    </span>
                  ))}
                </div>

                {/* Refund details footer if refunded/voided */}
                {isRefunded && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Refund Details:</strong> Refunded by <span className="font-semibold">{o.voidedByName || o.voidedBy || "Authorized User"}</span>
                      {o.voidedAt ? ` on ${new Date(o.voidedAt).toLocaleString()}` : ""}
                      {o.voidReason ? <p className="mt-0.5 text-destructive/90">Reason: &quot;{o.voidReason}&quot;</p> : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {refundTarget && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop animate-fade-in"
          onClick={() => !refunding && setRefundTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-panel relative w-full max-w-md bg-card rounded-2xl border p-6 shadow-2xl space-y-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5 text-destructive">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h2 className="font-display text-xl">Refund Transaction</h2>
              </div>
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive space-y-1">
                <p className="font-bold text-sm">
                  Are you sure you want to refund this transaction?
                </p>
                <p className="text-foreground font-mono font-medium">
                  Order #<strong>{formatOrderNumber(refundTarget.number, refundTarget.createdAt)}</strong> — ₱{refundTarget.total.toFixed(2)}
                </p>
                <p className="text-[11px] opacity-90">
                  This transaction will be marked as REFUNDED, excluded from sales reports, and logged in audit trails.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">
                  Reason for Refund *
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm font-medium focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  {REFUND_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                {selectedReason === "Other / Manager Request" && (
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={2}
                    placeholder="Enter specific reason for refunding this order..."
                    className="w-full p-3 rounded-xl border bg-background text-xs focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="flex-1 py-3 rounded-xl border bg-card hover:bg-muted text-sm font-medium touch-manipulation active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={refunding}
                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
              >
                {refunding ? "Refunding…" : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PageContainer>
  );
}

