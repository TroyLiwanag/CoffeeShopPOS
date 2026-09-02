import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, LogIn, LogOut, RotateCcw, Trash2, X } from "lucide-react";
import type { EmployeeUser } from "@/lib/pos-store";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { withActionFeedback } from "@/lib/action-feedback";
import {
  clockIn,
  clockOut,
  deleteAttendance,
  fetchAttendanceList,
  type AttendanceRecord,
} from "@/lib/attendance-api";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

type Props = {
  employee: EmployeeUser | null;
  onClose: () => void;
};

type PendingAction = "clock_in" | "clock_out" | null;

export function EmployeeAttendanceModal({ employee, onClose }: Props) {
  const [days, setDays] = useState(14);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [resubmitConfirmOpen, setResubmitConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayRecord = useMemo(
    () => records.find((r) => r.workDate === today) ?? null,
    [records, today],
  );

  const todayStatus = useMemo(() => {
    if (!todayRecord?.clockIn) return "not_clocked_in" as const;
    if (!todayRecord.clockOut) return "clocked_in" as const;
    return "completed" as const;
  }, [todayRecord]);

  const load = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    try {
      const list = await fetchAttendanceList(days, employee.id);
      setRecords(list);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [days, employee]);

  useEffect(() => {
    if (!employee) return;
    void load();
  }, [employee, load]);

  const runClockIn = async () => {
    if (!employee) return;
    await withActionFeedback(
      () => clockIn(employee.id),
      {
        loading: "Clocking in…",
        success: `${employee.fullname} clocked in.`,
        error: "Could not clock in.",
      },
    );
    await load();
  };

  const runClockOut = async () => {
    if (!employee) return;
    await withActionFeedback(
      () => clockOut(employee.id),
      {
        loading: "Clocking out…",
        success: `${employee.fullname} clocked out.`,
        error: "Could not clock out.",
      },
    );
    await load();
  };

  const allowResubmit = async () => {
    if (!employee) return;
    await withActionFeedback(
      () => clockIn(employee.id, true),
      {
        loading: "Resetting attendance…",
        success: "Employee can re-submit clock in.",
        error: "Could not reset attendance.",
      },
    );
    await load();
  };

  if (!employee) return null;

  const panel = (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-modal-title"
    >
      <div
        className="modal-panel relative w-full max-w-2xl max-h-[90dvh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 glass-bar px-4 sm:px-6 py-4 border-b flex items-center justify-between rounded-t-2xl shrink-0">
          <div id="attendance-modal-title" className="flex items-center gap-2 font-display text-xl">
            <Clock className="w-5 h-5" />
            Attendance — {employee.fullname}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain min-h-0">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-2">Today ({today})</p>
            <div className="flex flex-wrap items-center gap-2">
              {todayStatus === "not_clocked_in" && (
                <button type="button" onClick={() => setPendingAction("clock_in")} className="btn-primary text-sm">
                  <LogIn className="w-4 h-4" /> Clock in
                </button>
              )}
              {todayStatus === "clocked_in" && todayRecord && (
                <>
                  <span className="text-sm text-muted-foreground">
                    In at {formatTime(todayRecord.clockIn)}
                  </span>
                  <button type="button" onClick={() => setPendingAction("clock_out")} className="btn-primary text-sm">
                    <LogOut className="w-4 h-4" /> Clock out
                  </button>
                </>
              )}
              {todayStatus === "completed" && todayRecord && (
                <>
                  <span className="text-sm">
                    {formatTime(todayRecord.clockIn)} – {formatTime(todayRecord.clockOut)}
                    <span className="ml-2 font-medium">
                      {todayRecord.hoursWorked}h
                      {todayRecord.overtimeHours > 0 ? ` + ${todayRecord.overtimeHours}h OT` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setResubmitConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted touch-manipulation"
                    title="Allow re-submit clock in"
                  >
                    <RotateCcw className="w-4 h-4" /> Allow re-submit
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  days === d ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"
                }`}
              >
                Last {d} days
              </button>
            ))}
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="table-scroll max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">In</th>
                    <th className="px-3 py-2">Out</th>
                    <th className="px-3 py-2 text-right">Hrs</th>
                    <th className="px-3 py-2 text-right">OT</th>
                    <th className="px-3 py-2 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                        No records in this period.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">{r.workDate}</td>
                        <td className="px-3 py-2">{formatTime(r.clockIn)}</td>
                        <td className="px-3 py-2">{formatTime(r.clockOut)}</td>
                        <td className="px-3 py-2 text-right">{r.hoursWorked.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{r.overtimeHours.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                            className="p-1.5 text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 glass-bar border-t p-4 rounded-b-2xl shrink-0">
          <button type="button" onClick={onClose} className="w-full py-3 min-h-[48px] rounded-lg border hover:bg-muted">
            Close
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        open={resubmitConfirmOpen}
        title="Reset today's attendance"
        message="Are you sure???"
        detail={`${employee.fullname} can clock in again for today.`}
        confirmLabel="Reset"
        onClose={() => setResubmitConfirmOpen(false)}
        onConfirm={async () => {
          await allowResubmit();
        }}
      />

      <ConfirmDeleteModal
        open={pendingAction !== null}
        title={pendingAction === "clock_out" ? "Confirm clock out" : "Confirm clock in"}
        message="Are you sure???"
        detail={
          pendingAction === "clock_out"
            ? `Clock out ${employee.fullname} for today?`
            : `Clock in ${employee.fullname} for today?`
        }
        confirmLabel={pendingAction === "clock_out" ? "Clock out" : "Clock in"}
        onClose={() => setPendingAction(null)}
        onConfirm={async () => {
          if (pendingAction === "clock_out") await runClockOut();
          else if (pendingAction === "clock_in") await runClockIn();
          setPendingAction(null);
        }}
      />

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Delete attendance"
        detail={deleteTarget ? `${deleteTarget.workDate}` : undefined}
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await withActionFeedback(
            () => deleteAttendance(deleteTarget.id),
            {
              loading: "Deleting…",
              success: "Record deleted.",
              error: "Could not delete.",
            },
          );
          await load();
        }}
      />
    </div>
  );

  return typeof document !== "undefined" ? createPortal(panel, document.body) : null;
}
