import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  message: string;
  detail?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "destructive" | "accent" | "success";
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmActionModal({
  open,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onClose,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      /* caller handles errors/toasts */
    } finally {
      setBusy(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          iconBg: "bg-destructive/15 text-destructive",
          buttonBg: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        };
      case "accent":
        return {
          iconBg: "bg-accent/20 text-accent",
          buttonBg: "bg-accent text-accent-foreground hover:opacity-90",
        };
      case "success":
        return {
          iconBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
          buttonBg: "bg-emerald-600 text-white hover:bg-emerald-700",
        };
      default:
        return {
          iconBg: "bg-primary/10 text-primary",
          buttonBg: "bg-primary text-primary-foreground hover:opacity-90",
        };
    }
  };

  const styles = getVariantStyles();

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop animate-fade-in"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-panel relative w-full max-w-md bg-card border rounded-2xl flex flex-col animate-scale-in shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-start gap-3.5">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", styles.iconBg)}>
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="font-display text-lg font-bold leading-tight text-foreground">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{message}</p>
            {detail ? <div className="text-xs font-mono font-medium text-foreground mt-2.5 p-2.5 rounded-lg bg-muted/60 border">{detail}</div> : null}
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted shrink-0 touch-manipulation transition-colors"
            disabled={busy}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t bg-muted/20">
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl border bg-card hover:bg-muted text-sm font-medium touch-manipulation disabled:opacity-50 active:scale-95 transition-transform"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className={cn(
              "w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-bold shadow-sm touch-manipulation disabled:opacity-50 active:scale-95 transition-all inline-flex items-center justify-center gap-2",
              styles.buttonBg,
            )}
          >
            {busy ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
