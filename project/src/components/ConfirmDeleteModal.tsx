import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

type Props = {
  open: boolean;
  /** Shown in the header (e.g. "Remove employee") */
  title?: string;
  /** Main body text */
  message?: string;
  /** Optional second line for context */
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDeleteModal({
  open,
  title = "Confirm",
  message = "Are you sure???",
  detail,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
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
      /* caller may toast; keep modal open */
    } finally {
      setBusy(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div
        className="modal-panel relative w-full max-w-md flex flex-col animate-scale-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-bar px-4 sm:px-5 py-4 border-b flex items-start gap-3 rounded-t-2xl">
          <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 id="confirm-delete-title" className="font-display text-lg leading-tight">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
            {detail ? <p className="text-sm font-medium text-foreground mt-2">{detail}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="p-2 rounded-lg hover:bg-muted shrink-0 touch-manipulation"
            aria-label="Close"
            disabled={busy}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t">
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="w-full sm:w-auto px-4 py-3 min-h-[48px] rounded-lg border bg-card hover:bg-muted text-sm font-medium touch-manipulation disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className="w-full sm:w-auto px-4 py-3 min-h-[48px] rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-95 touch-manipulation disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
