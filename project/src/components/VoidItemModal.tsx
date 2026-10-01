import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, X, Minus, Plus, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/pos-store";
import type { CartItem } from "@/lib/pos-store";
import api from "@/lib/api";
import { toast } from "sonner";

// ───────────────────────────────────────────
// Constants
// ───────────────────────────────────────────
const VOID_REASONS = [
  "Customer changed order",
  "Wrong item selected",
  "Wrong quantity",
  "Duplicate order",
  "Item unavailable",
  "Cashier input error",
  "Other",
];

// ───────────────────────────────────────────
// Types
// ───────────────────────────────────────────
interface VoidItemModalProps {
  item: CartItem;
  onClose: () => void;
  onVoidSuccess: (cartItemId: string, qtyToVoid: number) => void;
}

// ───────────────────────────────────────────
// Component
// ───────────────────────────────────────────
export function VoidItemModal({ item, onClose, onVoidSuccess }: VoidItemModalProps) {
  const [qtyToVoid, setQtyToVoid] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pinRef = useRef<HTMLInputElement>(null);

  // Focus PIN field when reason is filled
  useEffect(() => {
    if (reason && reason !== "Other") {
      setTimeout(() => pinRef.current?.focus(), 80);
    }
  }, [reason]);

  const maxQty = item.qty;
  const unitPrice = item.unitPrice || item.product.price;
  const totalToVoid = unitPrice * qtyToVoid;

  const handleQtyChange = (delta: number) => {
    setQtyToVoid((q) => Math.min(maxQty, Math.max(1, q + delta)));
  };

  const validate = () => {
    if (!reason) {
      setError("Please select a void reason.");
      return false;
    }
    if (reason === "Other" && !notes.trim()) {
      setError("Please provide notes for 'Other' reason.");
      return false;
    }
    if (!pin.trim()) {
      setError("Admin Void PIN is required.");
      return false;
    }
    if (qtyToVoid < 1 || qtyToVoid > maxQty) {
      setError(`Quantity to void must be between 1 and ${maxQty}.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError("");
    if (!validate()) return;
    if (submitting) return;

    setSubmitting(true);
    try {
      const { data } = await api.post("/orders/void-item", {
        voidPin: pin,
        cartItemId: item.id,
        productId: item.product.id,
        productName: item.product.name,
        qtyToVoid: qtyToVoid,
        unitPrice: unitPrice,
        voidReason: reason,
        voidNotes: notes.trim(),
      });

      if (data.success) {
        toast.success(data.message || `${item.product.name} voided.`);
        onVoidSuccess(item.id, qtyToVoid);
        onClose();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Void authorization failed. Please try again.";
      setError(msg);
      // Clear PIN on failure so staff must re-enter
      setPin("");
      setTimeout(() => pinRef.current?.focus(), 80);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") {
      // Do NOT close on Escape — must use Cancel button
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      // Do NOT dismiss on outside click — security requirement
      aria-modal="true"
      role="dialog"
      aria-labelledby="void-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-card rounded-2xl border border-destructive/30 shadow-2xl animate-scale-in"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-destructive/20 bg-destructive/5 rounded-t-2xl">
          <div className="flex items-center gap-2.5 text-destructive">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <h2 id="void-modal-title" className="font-display text-xl">Void Item</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Cancel void"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Item Summary */}
          <div className="p-3.5 rounded-xl bg-muted/50 border space-y-1.5">
            <div className="font-semibold text-sm text-foreground">{item.product.name}</div>
            <div className="text-xs text-muted-foreground">
              Cart Qty: {item.qty} · Unit Price: {fmt(unitPrice)} · Item Total: {fmt(unitPrice * item.qty)}
            </div>
          </div>

          {/* Qty selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Quantity to Void</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQtyChange(-1)}
                disabled={qtyToVoid <= 1}
                className="w-9 h-9 rounded-full bg-muted hover:bg-border flex items-center justify-center disabled:opacity-40 touch-manipulation active:scale-95 transition-transform"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold text-lg tabular-nums">{qtyToVoid}</span>
              <button
                type="button"
                onClick={() => handleQtyChange(1)}
                disabled={qtyToVoid >= maxQty}
                className="w-9 h-9 rounded-full bg-muted hover:bg-border flex items-center justify-center disabled:opacity-40 touch-manipulation active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground ml-1">of {maxQty}</span>
              {qtyToVoid === maxQty && (
                <span className="text-xs font-semibold text-destructive ml-auto">Entire item</span>
              )}
            </div>
            <div className="text-xs text-destructive font-semibold">
              Amount to void: {fmt(totalToVoid)}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Reason for Void *</label>
            <select
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(""); }}
              className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm font-medium focus:ring-2 focus:ring-ring focus:outline-none"
            >
              <option value="">— Select a reason —</option>
              {VOID_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {reason === "Other" && (
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setError(""); }}
                rows={2}
                placeholder="Describe the specific reason…"
                className="w-full p-3 rounded-xl border bg-background text-xs focus:ring-2 focus:ring-ring focus:outline-none resize-none"
              />
            )}
          </div>

          {/* Admin PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Admin Void PIN *</label>
            <div className="relative">
              <input
                ref={pinRef}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setError(""); }}
                placeholder="Enter 4–8 digit PIN"
                maxLength={8}
                className={cn(
                  "w-full px-3 py-2.5 pr-10 rounded-xl border bg-background text-sm font-mono tracking-widest focus:ring-2 focus:ring-ring focus:outline-none",
                  error && error.toLowerCase().includes("pin") ? "border-destructive ring-1 ring-destructive" : ""
                )}
              />
              <button
                type="button"
                onClick={() => setShowPin((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              PIN is verified securely on the server. It will never be stored or logged in plain text.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive animate-fade-up">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl border bg-card hover:bg-muted text-sm font-medium touch-manipulation active:scale-95 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !reason || !pin || (reason === "Other" && !notes.trim())}
            className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Authorizing…
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                Authorize &amp; Void
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
